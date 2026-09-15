import * as cheerio from 'cheerio';

async function testScrape() {
  try {
    const res = await fetch('https://www.bayxbengal.com/exporters?category=garments&page=1');
    const html = await res.text();
    const $ = cheerio.load(html);

    const exporters = [];
    $('a[href^="/exporters/"]').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const text = $el.text().trim();
      
      // Filter to only the main title link
      if (!$el.hasClass('feat-card-profile-cta') && text.length > 2 && !$el.find('svg').length) {
        // Go up to the parent that contains both location and category/hs links
        let card = $el;
        for (let step = 0; step < 8; step++) {
          if (card.parent().length) {
            card = card.parent();
            if (card.find('a[href^="/hs/"]').length > 0 || card.find('a[href^="/category/"]').length > 0) {
              break;
            }
          }
        }

        const district = card.find('a[href^="/district/"]').first().text().trim() || 'Dhaka';
        const productType = card.find('a[href^="/category/"]').first().text().trim() || 'Knit & Woven';
        
        const hsCodes = [];
        card.find('a[href^="/hs/"]').each((_, hsEl) => {
          const code = $(hsEl).text().trim();
          if (code && !hsCodes.includes(code)) hsCodes.push(code);
        });

        const badges = [];
        card.find('.top-exp-badge-pill, .badge-bob-verified, span[class*="badge"]').each((_, bEl) => {
          const bText = $(bEl).text().trim();
          if (bText && !badges.includes(bText)) badges.push(bText);
        });

        const slug = href.replace('/exporters/', '').trim();

        exporters.push({
          companyName: text,
          slug,
          category: 'Garments & RMG',
          productTypes: productType ? productType.split('&').map(s => s.trim()) : ['Knit', 'Woven'],
          bondStatus: 'BONDED',
          district: district || 'Dhaka',
          hsCodes: hsCodes.length > 0 ? hsCodes : ['6109', '6110', '6203'],
          verificationSource: badges.join(', ') || 'EPB',
          isVerified: true
        });
      }
    });

    // Remove duplicates by slug
    const uniqueExporters = [];
    const seenSlugs = new Set();
    for (const exp of exporters) {
      if (!seenSlugs.has(exp.slug)) {
        seenSlugs.add(exp.slug);
        uniqueExporters.push(exp);
      }
    }

    console.log('Total unique exporters parsed from page 1:', uniqueExporters.length);
    console.log('First 3 exporters:');
    console.log(JSON.stringify(uniqueExporters.slice(0, 3), null, 2));
  } catch (err) {
    console.error('Error testing parser:', err);
  }
}

testScrape();
