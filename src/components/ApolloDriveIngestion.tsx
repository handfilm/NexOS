import React, { useState } from 'react';
import { getFirestore, writeBatch, doc, collection, getDocs, query, where } from 'firebase/firestore';
import { normalizeBangladeshPhone } from '../utils/phoneNormalizer';

export interface ParsedMediaToken {
  raw: string;
  sku: string;
  colorVariant: string;
  sequence: number;
  extension: string;
  url?: string;
}

export interface StagedApolloLead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  industry: string;
  title: string;
}

export const parseTokenizedFilename = (filename: string): ParsedMediaToken | null => {
  if (!filename) return null;
  const clean = filename.trim().split(/[\\/]/).pop() || '';
  // Pattern: SKU__COLOR__SEQUENCE.ext e.g. RAWX-JKT-001__BLACK__01.webp
  const regex = /^([a-zA-Z0-9_-]+)__([a-zA-Z0-9_-]+)__([0-9]{1,3})\.([a-zA-Z0-9]+)$/i;
  const match = clean.match(regex);
  if (match) {
    return {
      raw: clean,
      sku: match[1].toUpperCase(),
      colorVariant: match[2].toUpperCase().replace(/_/g, ' '),
      sequence: parseInt(match[3], 10),
      extension: match[4].toLowerCase()
    };
  }
  // Fallback pattern: SKU__SEQUENCE.ext
  const fallback = clean.match(/^([a-zA-Z0-9_-]+)__([0-9]{1,3})\.([a-zA-Z0-9]+)$/i);
  if (fallback) {
    return {
      raw: clean,
      sku: fallback[1].toUpperCase(),
      colorVariant: 'DEFAULT',
      sequence: parseInt(fallback[2], 10),
      extension: fallback[3].toLowerCase()
    };
  }
  return null;
};

export const ApolloDriveIngestion: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'apollo' | 'drive'>('apollo');
  const [apolloText, setApolloText] = useState('');
  const [driveFilesText, setDriveFilesText] = useState('');
  const [stagedLeads, setStagedLeads] = useState<StagedApolloLead[]>([]);
  const [stagedMedia, setStagedMedia] = useState<ParsedMediaToken[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-map Apollo CSV headers to Customer Lead Schema
  const parseApolloCSV = (csvText: string) => {
    setStatus(null);
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setStatus('⚠️ CSV requires at least a header row and 1 data row');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const findCol = (keys: string[]) => {
      return headers.findIndex((h) => keys.some((k) => h === k || h.includes(k)));
    };

    const idxCompany = findCol(['company', 'company name for emails', 'account name']);
    const idxFirst = findCol(['first name', 'firstname']);
    const idxLast = findCol(['last name', 'lastname']);
    const idxEmail = findCol(['email', 'email address', 'work email']);
    const idxPhone = findCol(['work direct phone', 'mobile phone', 'corporate phone', 'phone', 'company phone']);
    const idxCity = findCol(['city', 'company city']);
    const idxCountry = findCol(['country', 'company country']);
    const idxIndustry = findCol(['industry']);
    const idxTitle = findCol(['title', 'seniority']);

    const leads: StagedApolloLead[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Split preserving quotes
      const match = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      const row = match ? match.map((m) => m.replace(/^"|"$/g, '').trim()) : lines[i].split(',');
      if (!row || row.length === 0) continue;

      const rawPhone = idxPhone !== -1 ? row[idxPhone] : '';
      const canonicalPhone = normalizeBangladeshPhone(rawPhone);

      const first = idxFirst !== -1 ? row[idxFirst] : '';
      const last = idxLast !== -1 ? row[idxLast] : '';
      const contact = [first, last].filter(Boolean).join(' ') || 'Procurement Lead';

      leads.push({
        id: `apollo-${Date.now()}-${i}`,
        companyName: idxCompany !== -1 ? row[idxCompany] : 'Apollo Prospect',
        contactName: contact,
        email: idxEmail !== -1 ? row[idxEmail] : '',
        phone: canonicalPhone,
        city: idxCity !== -1 ? row[idxCity] : 'Dhaka',
        country: idxCountry !== -1 ? row[idxCountry] : 'BD',
        industry: idxIndustry !== -1 ? row[idxIndustry] : 'Apparel & Leather Goods',
        title: idxTitle !== -1 ? row[idxTitle] : 'Buyer'
      });
    }

    setStagedLeads(leads);
    setStatus(`✓ Successfully auto-mapped ${leads.length} Apollo prospect rows.`);
  };

  // Parse list of Google Drive filenames (e.g. RAWX-JKT-001__BLACK__01.webp)
  const parseDriveList = (text: string) => {
    setStatus(null);
    const filenames = text.split(/\r?\n/).map((f) => f.trim()).filter(Boolean);
    const parsed: ParsedMediaToken[] = [];

    for (const f of filenames) {
      const token = parseTokenizedFilename(f);
      if (token) {
        parsed.push(token);
      }
    }

    // Sort by sequence
    parsed.sort((a, b) => a.sku.localeCompare(b.sku) || a.sequence - b.sequence);
    setStagedMedia(parsed);
    setStatus(`✓ Parsed ${parsed.length} tokenized filenames (${filenames.length - parsed.length} skipped non-matching).`);
  };

  // Stage Apollo Leads to Firestore using writeBatch (limit 500 per batch)
  const stageLeadsToFirestore = async () => {
    if (stagedLeads.length === 0) return;
    setLoading(true);
    setStatus('Staging Apollo leads to Firestore…');

    try {
      const db = getFirestore();
      let batch = writeBatch(db);
      let count = 0;

      for (let i = 0; i < stagedLeads.length; i++) {
        const lead = stagedLeads[i];
        const docRef = doc(collection(db, 'customers'), lead.id);

        batch.set(docRef, {
          companyName: lead.companyName,
          name: lead.contactName,
          email: lead.email,
          phone: lead.phone,
          city: lead.city,
          country: lead.country,
          tags: ['apollo-ingest', lead.industry.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
          source: 'apollo.io',
          totalOrders: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }

      await batch.commit();
      setStatus(`🎉 Successfully committed ${stagedLeads.length} leads to Firestore!`);
      setStagedLeads([]);
    } catch (err: any) {
      setStatus(`⚠️ Firestore commit error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Stage Drive Media tokens to Firestore Products collection
  const stageMediaToFirestore = async () => {
    if (stagedMedia.length === 0) return;
    setLoading(true);
    setStatus('Linking media tokens to products in Firestore…');

    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // Group by SKU
      const bySku: Record<string, ParsedMediaToken[]> = {};
      stagedMedia.forEach((m) => {
        if (!bySku[m.sku]) bySku[m.sku] = [];
        bySku[m.sku].push(m);
      });

      for (const [sku, tokens] of Object.entries(bySku)) {
        // Find matching product by SKU
        const q = query(collection(db, 'products'), where('variants.sku', '==', sku));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const pDoc = snap.docs[0];
          const currentImages = pDoc.data().images || [];
          const newImages = tokens.map((t, idx) => ({
            id: `img-${t.sku}-${t.sequence}`,
            url: `https://drive.google.com/thumbnail?id=${t.raw}`,
            alt: `${t.sku} ${t.colorVariant} ${t.sequence}`,
            sequence: t.sequence,
            variant: t.colorVariant
          }));

          batch.update(pDoc.ref, {
            images: [...currentImages, ...newImages],
            updatedAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      setStatus(`🎉 Successfully linked ${stagedMedia.length} assets across ${Object.keys(bySku).length} SKUs in Firestore!`);
      setStagedMedia([]);
    } catch (err: any) {
      setStatus(`⚠️ Media staging error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#0d0d0c] border border-zinc-800 rounded-xl p-5 font-mono text-zinc-300">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-bold text-amber-500">APOLLO CSV &amp; DRIVE INGESTION SUITE</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Auto-column mapping · Tokenized filename parser (<code className="text-zinc-400">RAWX-JKT-001__BLACK__01.webp</code>) · Firestore Batch
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('apollo')}
            className={`rounded px-3 py-1.5 text-[clamp(10px,1.2vw,13px)] font-medium transition-all truncate ${
              activeTab === 'apollo' ? 'bg-amber-500 text-black font-bold' : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
            }`}
          >
            1. Apollo CSV Ingest
          </button>
          <button
            onClick={() => setActiveTab('drive')}
            className={`rounded px-3 py-1.5 text-[clamp(10px,1.2vw,13px)] font-medium transition-all truncate ${
              activeTab === 'drive' ? 'bg-amber-500 text-black font-bold' : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
            }`}
          >
            2. Drive Media Parser
          </button>
        </div>
      </div>

      {status && (
        <div className="mb-4 rounded border border-zinc-700 bg-zinc-900/90 p-2.5 text-[11px] text-amber-300">
          {status}
        </div>
      )}

      {/* Tab 1: Apollo CSV */}
      {activeTab === 'apollo' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase text-zinc-500 mb-1.5">
              Paste Raw Apollo.io Export CSV Text
            </label>
            <textarea
              rows={5}
              value={apolloText}
              onChange={(e) => setApolloText(e.target.value)}
              placeholder="First Name,Last Name,Company,Email,Work Direct Phone,Mobile Phone,City,Country,Industry..."
              className="w-full rounded border border-zinc-800 bg-zinc-950 p-2.5 text-xs font-mono text-zinc-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => parseApolloCSV(apolloText)}
              className="rounded border border-zinc-700 bg-zinc-850 px-4 py-2 text-[clamp(10px,1.2vw,13px)] font-semibold text-zinc-100 hover:bg-zinc-800 truncate"
            >
              Parse &amp; Auto-Map Columns
            </button>
            {stagedLeads.length > 0 && (
              <button
                disabled={loading}
                onClick={stageLeadsToFirestore}
                className="rounded bg-amber-500 px-4 py-2 text-[clamp(10px,1.2vw,13px)] font-bold text-black hover:bg-amber-400 disabled:opacity-50 truncate"
              >
                {loading ? 'Staging…' : `✓ Commit ${stagedLeads.length} Leads to Firestore`}
              </button>
            )}
          </div>

          {stagedLeads.length > 0 && (
            <div className="overflow-x-auto border border-zinc-800 rounded-lg max-h-56">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-950 text-zinc-400 text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2">Company</th>
                    <th className="p-2">Contact</th>
                    <th className="p-2">Canonical BD Phone</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Market</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {stagedLeads.slice(0, 15).map((l) => (
                    <tr key={l.id}>
                      <td className="p-2 text-zinc-200 font-medium">{l.companyName}</td>
                      <td className="p-2 text-zinc-400">{l.contactName}</td>
                      <td className="p-2 text-amber-400 font-mono">{l.phone || '—'}</td>
                      <td className="p-2 text-zinc-400">{l.email}</td>
                      <td className="p-2 text-zinc-400">{l.country}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Drive Media Parser */}
      {activeTab === 'drive' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase text-zinc-500 mb-1.5">
              Paste List of Google Drive Filenames (One per line)
            </label>
            <textarea
              rows={5}
              value={driveFilesText}
              onChange={(e) => setDriveFilesText(e.target.value)}
              placeholder="RAWX-JKT-001__BLACK__01.webp&#10;RAWX-JKT-001__BLACK__02.webp&#10;RAWX-JKT-001__TAN__01.webp"
              className="w-full rounded border border-zinc-800 bg-zinc-950 p-2.5 text-xs font-mono text-zinc-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => parseDriveList(driveFilesText)}
              className="rounded border border-zinc-700 bg-zinc-850 px-4 py-2 text-[clamp(10px,1.2vw,13px)] font-semibold text-zinc-100 hover:bg-zinc-800 truncate"
            >
              Parse Tokenized Names
            </button>
            {stagedMedia.length > 0 && (
              <button
                disabled={loading}
                onClick={stageMediaToFirestore}
                className="rounded bg-amber-500 px-4 py-2 text-[clamp(10px,1.2vw,13px)] font-bold text-black hover:bg-amber-400 disabled:opacity-50 truncate"
              >
                {loading ? 'Linking…' : `✓ Stage ${stagedMedia.length} Media to Firestore`}
              </button>
            )}
          </div>

          {stagedMedia.length > 0 && (
            <div className="overflow-x-auto border border-zinc-800 rounded-lg max-h-56">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-950 text-zinc-400 text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2">Target SKU</th>
                    <th className="p-2">Color / Variant</th>
                    <th className="p-2">Sequence</th>
                    <th className="p-2">Ext</th>
                    <th className="p-2">Original Filename</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {stagedMedia.map((m, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-amber-400 font-bold">{m.sku}</td>
                      <td className="p-2 text-zinc-300">{m.colorVariant}</td>
                      <td className="p-2 text-zinc-400">#{m.sequence}</td>
                      <td className="p-2 text-zinc-500 uppercase">{m.extension}</td>
                      <td className="p-2 text-zinc-400 font-mono text-[10px]">{m.raw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
