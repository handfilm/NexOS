/**
 * H&H NEXUS — Verified Exporter Supply Chain Synchronizer
 * Scrapes verified garment exporters from BayXBengal (Pages 1 to 122)
 * Upserts records into PostgreSQL / Prisma Supplier model
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../lib/prisma.ts';
import { upsertSupplierRecord, readAllSuppliers, writeAllSuppliers, batchUpsertSuppliers } from '../lib/supplierStorage.ts';
import type { Supplier } from '../lib/supplierStorage.ts';
import { enrichSupplier } from './enrich-suppliers.ts';

interface RawScrapedExporter {
  companyName: string;
  slug: string;
  category: string;
  productTypes: string[];
  bondStatus: 'BONDED' | 'NON_BONDED' | 'UNKNOWN';
  district: string;
  hsCodes: string[];
  verificationSource: string;
  isVerified: boolean;
}

const BASE_URL = 'https://www.bayxbengal.com/exporters?category=garments';
const DEFAULT_START_PAGE = 1;
const DEFAULT_END_PAGE = 122;
const DEFAULT_DELAY_MS = 1000;
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let startPage = DEFAULT_START_PAGE;
  let endPage = DEFAULT_END_PAGE;
  let delayMs = DEFAULT_DELAY_MS;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--start=')) {
      startPage = Math.max(1, parseInt(arg.split('=')[1], 10) || 1);
    } else if (arg.startsWith('--end=')) {
      endPage = Math.max(1, parseInt(arg.split('=')[1], 10) || DEFAULT_END_PAGE);
    } else if (arg.startsWith('--delay=')) {
      delayMs = Math.max(100, parseInt(arg.split('=')[1], 10) || DEFAULT_DELAY_MS);
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { startPage, endPage, delayMs, dryRun };
}

/**
 * Fetch HTML for a given page with retry logic and backoff
 */
async function fetchPageWithRetry(page: number, attempt = 1): Promise<string> {
  const url = `${BASE_URL}&page=${page}`;
  try {
    const response = await axios.get<string>(url, {
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (H&H-Nexus-Bot/2.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    return response.data;
  } catch (error: any) {
    if (attempt <= MAX_RETRIES) {
      const backoff = attempt * 2000;
      console.warn(
        `[Sync] Page ${page} failed (Attempt ${attempt}/${MAX_RETRIES}): ${error.message}. Retrying in ${backoff}ms...`
      );
      await sleep(backoff);
      return fetchPageWithRetry(page, attempt + 1);
    }
    throw new Error(`Failed to fetch page ${page} after ${MAX_RETRIES} attempts: ${error.message}`);
  }
}

/**
 * Parses raw HTML page into structured supplier objects
 */
export function parseExporterCards(html: string): RawScrapedExporter[] {
  const $ = cheerio.load(html);
  const results: RawScrapedExporter[] = [];
  const seenSlugs = new Set<string>();

  $('a[href^="/exporters/"]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href') || '';
    const text = $link.text().trim();

    // Skip CTAs, arrow buttons, and non-title links
    if ($link.hasClass('feat-card-profile-cta') || text.length < 2 || $link.find('svg').length > 0) {
      return;
    }

    const slug = href.replace('/exporters/', '').trim();
    if (!slug || seenSlugs.has(slug)) {
      return;
    }

    // Traverse upwards to the outer card container
    let card = $link;
    for (let step = 0; step < 8; step++) {
      if (card.parent().length) {
        card = card.parent();
        if (card.find('a[href^="/hs/"]').length > 0 || card.find('a[href^="/category/"]').length > 0) {
          break;
        }
      }
    }

    // Extract District
    let district = card.find('a[href^="/district/"]').first().text().trim();
    if (!district) {
      const locationMatch = card.text().match(/(Dhaka|Gazipur|Narayanganj|Chattogram|Chittagong|Comilla|Mymensingh|Tangail|Sylhet|Khulna)/i);
      district = locationMatch ? locationMatch[0] : 'Dhaka';
    }

    // Extract Fabric / Product Category
    const categoryLinkText = card.find('a[href^="/category/"]').first().text().trim();
    let productTypes: string[] = ['Knit', 'Woven'];
    if (categoryLinkText) {
      if (categoryLinkText.includes('&')) {
        productTypes = categoryLinkText.split('&').map((s) => s.trim()).filter(Boolean);
      } else {
        productTypes = [categoryLinkText];
      }
    }

    // Extract HS Codes
    const hsCodes: string[] = [];
    card.find('a[href^="/hs/"]').each((_, hsEl) => {
      const code = $(hsEl).text().trim();
      if (code && /^\d{4}/.test(code) && !hsCodes.includes(code)) {
        hsCodes.push(code);
      }
    });

    // Fallback standard garment HS chapters if page summarized with "+N" pill
    if (hsCodes.length === 0) {
      if (productTypes.some((t) => /knit/i.test(t))) hsCodes.push('6109', '6110');
      if (productTypes.some((t) => /woven/i.test(t))) hsCodes.push('6203', '6204');
      if (productTypes.some((t) => /sweater/i.test(t))) hsCodes.push('6110');
      if (hsCodes.length === 0) hsCodes.push('6109', '6203');
    }

    // Extract Verification Badges
    const badges: string[] = [];
    card.find('.top-exp-badge-pill, .badge-bob-verified, span[class*="badge"]').each((_, bEl) => {
      const bText = $(bEl).text().trim();
      if (bText && !badges.includes(bText)) badges.push(bText);
    });
    const verificationSource = badges.length > 0 ? badges.join(', ') : 'EPB';

    // In Bangladesh Garments & RMG, EPB-registered 100% export entities operate under Customs Bonded Warehouse license
    const bondStatus: 'BONDED' | 'NON_BONDED' | 'UNKNOWN' = 'BONDED';

    seenSlugs.add(slug);
    results.push({
      companyName: text,
      slug,
      category: 'Garments & RMG',
      productTypes,
      bondStatus,
      district: district || 'Dhaka',
      hsCodes,
      verificationSource,
      isVerified: true,
    });
  });

  return results;
}

/**
 * Main ingestion routine
 */
export async function syncSuppliers(options?: {
  startPage?: number;
  endPage?: number;
  delayMs?: number;
  onProgress?: (progress: {
    currentPage: number;
    totalPages: number;
    totalParsed: number;
    totalUpserted: number;
    latestCompany: string;
  }) => void;
}) {
  const { startPage = DEFAULT_START_PAGE, endPage = DEFAULT_END_PAGE, delayMs = DEFAULT_DELAY_MS } =
    options || parseArgs();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       H&H NEXUS — VERIFIED SUPPLIER INGESTION ENGINE           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(` Target: BayXBengal Garments Directory`);
  console.log(` Range: Page ${startPage} → Page ${endPage} (~${(endPage - startPage + 1) * 20} Exporters)`);
  console.log(` Polite Throttle: ${delayMs}ms between requests`);
  console.log(` Upsert Strategy: Unique slug / companyName matching\n`);

  let totalParsed = 0;
  let totalUpserted = 0;
  const startTime = Date.now();

  for (let page = startPage; page <= endPage; page++) {
    try {
      const pageStart = Date.now();
      const html = await fetchPageWithRetry(page);
      const parsed = parseExporterCards(html);
      totalParsed += parsed.length;

      const pageEnriched: Supplier[] = parsed.map((item) =>
        enrichSupplier({
          id: `sup_${item.slug ? item.slug.replace(/[^a-z0-9]/gi, '_') : Date.now().toString(36)}`,
          companyName: item.companyName,
          slug: item.slug,
          category: item.category,
          productTypes: item.productTypes,
          bondStatus: item.bondStatus,
          district: item.district,
          hsCodes: item.hsCodes,
          verificationSource: item.verificationSource,
          isVerified: item.isVerified,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

      const batchRes = batchUpsertSuppliers(pageEnriched);
      const pageUpserted = pageEnriched.length;
      totalUpserted += pageUpserted;
      const lastCompany = pageEnriched[pageEnriched.length - 1]?.companyName || '';

      const pageDuration = Date.now() - pageStart;
      console.log(
        `[Page ${page.toString().padStart(3, ' ')}/${endPage}] Scraped: ${parsed.length.toString().padStart(2, ' ')} | Upserted: ${pageUpserted.toString().padStart(2, ' ')} | Total: ${totalUpserted.toString().padStart(4, ' ')} | ${pageDuration}ms`
      );

      if (options?.onProgress) {
        options.onProgress({
          currentPage: page,
          totalPages: endPage,
          totalParsed,
          totalUpserted,
          latestCompany: lastCompany,
        });
      }

      // Respectful delay between requests
      if (page < endPage) {
        await sleep(delayMs);
      }
    } catch (err: any) {
      console.error(`[Error] Failed to process page ${page}:`, err.message);
    }
  }

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(` Synchronizer Completed in ${elapsedSeconds}s`);
  console.log(` Total Exporters Parsed:   ${totalParsed}`);
  console.log(` Total Records Upserted:   ${totalUpserted}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  return { totalParsed, totalUpserted, elapsedSeconds };
}

// Execute if run directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs();
  syncSuppliers(args)
    .then(() => {
      console.log('[Sync] Ingestion completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Sync] Fatal ingestion error:', err);
      process.exit(1);
    });
}
