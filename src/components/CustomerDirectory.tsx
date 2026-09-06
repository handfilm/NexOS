import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentSnapshot,
  where
} from 'firebase/firestore';
import { normalizeBangladeshPhone } from '../utils/phoneNormalizer';

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  country?: string;
  totalOrders?: number;
  totalSpent?: number;
  updatedAt?: any;
}

interface CustomerDirectoryProps {
  onOpenWhatsApp?: (customerId: string) => void;
  onSelectCustomer?: (customer: Customer) => void;
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  onOpenWhatsApp,
  onSelectCustomer
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cursorStack, setCursorStack] = useState<DocumentSnapshot[]>([]);
  const [currentCursor, setCurrentCursor] = useState<DocumentSnapshot | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>('all');

  const PAGE_LIMIT = 50; // Strict limit to prevent mobile/browser memory exhaustion

  const fetchPage = async (cursor: DocumentSnapshot | null = null, direction: 'next' | 'prev' | 'reset' = 'reset') => {
    setLoading(true);
    try {
      const db = getFirestore();
      let q = query(
        collection(db, 'customers'),
        orderBy('updatedAt', 'desc'),
        limit(PAGE_LIMIT)
      );

      if (countryFilter !== 'all') {
        q = query(
          collection(db, 'customers'),
          where('country', '==', countryFilter),
          orderBy('updatedAt', 'desc'),
          limit(PAGE_LIMIT)
        );
      }

      if (cursor) {
        q = query(q, startAfter(cursor));
      }

      const snap = await getDocs(q);
      const docs = snap.docs;

      const loadedCustomers: Customer[] = docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || data.companyName || 'Buyer',
          companyName: data.companyName || data.name || '',
          phone: normalizeBangladeshPhone(data.phone || data.mobile || data.tel),
          email: data.email || '',
          country: data.country || 'BD',
          totalOrders: Number(data.totalOrders) || 0,
          totalSpent: Number(data.totalSpent) || 0,
          updatedAt: data.updatedAt
        };
      });

      setCustomers(loadedCustomers);
      setHasMore(docs.length === PAGE_LIMIT);

      if (direction === 'next' && currentCursor) {
        setCursorStack((prev) => [...prev, currentCursor]);
        setPage((p) => p + 1);
      } else if (direction === 'prev') {
        setPage((p) => Math.max(1, p - 1));
      } else if (direction === 'reset') {
        setCursorStack([]);
        setPage(1);
      }

      setCurrentCursor(docs[docs.length - 1] || null);
    } catch (err: any) {
      console.error('Firestore cursor query failed, falling back to local cache/api:', err);
      // Resilient fallback to API with limit 50
      try {
        const res = await fetch(`/api/customers?limit=${PAGE_LIMIT}&page=${page}&country=${countryFilter}`);
        const data = await res.json();
        if (data && data.items) {
          setCustomers(
            data.items.map((c: any) => ({
              ...c,
              phone: normalizeBangladeshPhone(c.phone)
            }))
          );
          setHasMore(data.items.length === PAGE_LIMIT);
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(null, 'reset');
  }, [countryFilter]);

  const handleNext = () => {
    if (!hasMore || !currentCursor || loading) return;
    fetchPage(currentCursor, 'next');
  };

  const handlePrev = () => {
    if (cursorStack.length === 0 || loading) return;
    const prevStack = [...cursorStack];
    const prevCursor = prevStack.pop() || null;
    setCursorStack(prevStack);
    fetchPage(prevCursor, 'prev');
  };

  return (
    <div className="w-full bg-[#0d0d0c] border border-zinc-800 rounded-xl p-4 font-mono text-zinc-300">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold text-sm">CUSTOMER DIRECTORY</span>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
              16K+ Live Ledger
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Memory-safe cursor pagination (50/page) · Canonical +880 BD Normalizer
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[clamp(10px,1.2vw,13px)] text-zinc-200 focus:outline-none truncate"
          >
            <option value="all">All Markets</option>
            <option value="BD">🇧🇩 Bangladesh</option>
            <option value="NL">🇳🇱 Netherlands</option>
            <option value="DE">🇩🇪 Germany</option>
            <option value="GB">🇬🇧 United Kingdom</option>
          </select>

          <button
            onClick={() => fetchPage(null, 'reset')}
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[clamp(10px,1.2vw,13px)] text-zinc-300 hover:bg-zinc-800 truncate"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-zinc-800/80 rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase tracking-wider">
              <th className="p-2.5">Buyer / Company</th>
              <th className="p-2.5">Canonical Phone</th>
              <th className="p-2.5">Market</th>
              <th className="p-2.5 text-right">Orders</th>
              <th className="p-2.5 text-right">Spend</th>
              <th className="p-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-zinc-500">
                  Streaming 50 documents from Firestore cursor…
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-zinc-500">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="p-2.5 font-medium text-white truncate max-w-[180px]">
                    {c.companyName || c.name}
                  </td>
                  <td className="p-2.5 text-amber-400/90 font-mono text-[11px] truncate">
                    {c.phone || '—'}
                  </td>
                  <td className="p-2.5 text-zinc-400">{c.country}</td>
                  <td className="p-2.5 text-right text-zinc-300 font-mono">{c.totalOrders}</td>
                  <td className="p-2.5 text-right font-mono text-zinc-200">
                    ৳{c.totalSpent?.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => onOpenWhatsApp && onOpenWhatsApp(c.id)}
                      className="rounded bg-emerald-700/80 hover:bg-emerald-600 px-2.5 py-1 text-[clamp(10px,1.2vw,13px)] font-semibold text-white transition-all truncate"
                    >
                      📲 WhatsApp
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800 text-[11px]">
        <span className="text-zinc-500">
          Page <strong className="text-zinc-300">{page}</strong> · Showing {customers.length} records
        </span>

        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={page === 1 || loading}
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[clamp(10px,1.2vw,13px)] text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none truncate"
          >
            ← Previous 50
          </button>
          <button
            onClick={handleNext}
            disabled={!hasMore || loading}
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[clamp(10px,1.2vw,13px)] text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none truncate"
          >
            Next 50 →
          </button>
        </div>
      </div>
    </div>
  );
};
