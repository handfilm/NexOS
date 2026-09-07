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
import { Customer360Drawer } from './Customer360Drawer';
import { QuickSaleModal, QuickSaleCustomer } from './QuickSaleModal';
import { SmartAudienceBuilder } from './SmartAudienceBuilder';
import { SmartAudienceFilter, AudienceFilterCriteria } from './SmartAudienceFilter';
import { TechPackPOEngine } from './TechPackPOEngine';

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

  // Audience Filter State with Server-Side Pagination
  const [filterCriteria, setFilterCriteria] = useState<AudienceFilterCriteria>({
    minSpend: 0,
    cohortTag: 'all',
    country: 'all',
    search: '',
    orderCountFilter: 'all'
  });
  const [matchingCount, setMatchingCount] = useState<number>(0);
  const [totalDatabaseCount, setTotalDatabaseCount] = useState<number>(16420);

  // Intelligence Modules Modals State
  const [active360CustomerId, setActive360CustomerId] = useState<string | null>(null);
  const [is360Open, setIs360Open] = useState<boolean>(false);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState<boolean>(false);
  const [quickSaleTargetCustomer, setQuickSaleTargetCustomer] = useState<QuickSaleCustomer | null>(null);
  const [showAudienceBuilder, setShowAudienceBuilder] = useState<boolean>(false);
  const [isTechPackOpen, setIsTechPackOpen] = useState<boolean>(false);
  const [techPackTargetCustomer, setTechPackTargetCustomer] = useState<any | null>(null);

  const PAGE_LIMIT = 50; // Strict limit to prevent mobile/browser memory exhaustion

  const fetchPage = async (
    cursor: DocumentSnapshot | null = null,
    direction: 'next' | 'prev' | 'reset' = 'reset',
    activeCriteria: AudienceFilterCriteria = filterCriteria
  ) => {
    setLoading(true);
    try {
      const db = getFirestore();
      let q: any = collection(db, 'customers');

      // Server-side filtering in Firestore
      if (activeCriteria.country !== 'all') {
        q = query(q, where('country', '==', activeCriteria.country));
      }
      if (activeCriteria.minSpend > 0) {
        q = query(q, where('totalSpent', '>=', activeCriteria.minSpend));
      }
      if (activeCriteria.cohortTag !== 'all') {
        q = query(q, where('tags', 'array-contains', activeCriteria.cohortTag));
      }

      // Order By & Pagination Limit
      if (activeCriteria.minSpend > 0) {
        q = query(q, orderBy('totalSpent', 'desc'), limit(PAGE_LIMIT));
      } else {
        q = query(q, orderBy('updatedAt', 'desc'), limit(PAGE_LIMIT));
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
          totalOrders: Number(data.ordersCount ?? data.totalOrders ?? 0),
          totalSpent: Number(data.totalSpent || 0),
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
      // Resilient fallback to API with server-side criteria & limit 50
      try {
        const targetPage = direction === 'next' ? page + 1 : direction === 'prev' ? Math.max(1, page - 1) : 1;
        const queryParams = new URLSearchParams({
          limit: String(PAGE_LIMIT),
          page: String(targetPage),
          country: activeCriteria.country,
          minSpend: String(activeCriteria.minSpend),
          cohortTag: activeCriteria.cohortTag,
          orderCountFilter: activeCriteria.orderCountFilter,
          search: activeCriteria.search
        });

        const res = await fetch(`/api/customers?${queryParams.toString()}`);
        const data = await res.json();
        if (data && data.items) {
          setCustomers(
            data.items.map((c: any) => ({
              ...c,
              phone: normalizeBangladeshPhone(c.phone)
            }))
          );
          setHasMore(data.items.length === PAGE_LIMIT);
          if (data.totalCount !== undefined) {
            setMatchingCount(data.totalCount);
          }
          if (data.databaseTotal !== undefined) {
            setTotalDatabaseCount(data.databaseTotal);
          }
          if (direction === 'next') setPage((p) => p + 1);
          else if (direction === 'prev') setPage((p) => Math.max(1, p - 1));
          else if (direction === 'reset') setPage(1);
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(null, 'reset', filterCriteria);
  }, []);

  const handleFilterCriteriaChange = (newCriteria: AudienceFilterCriteria) => {
    setFilterCriteria(newCriteria);
    setCurrentCursor(null);
    setCursorStack([]);
    fetchPage(null, 'reset', newCriteria);
  };

  const handleResetFilterCriteria = () => {
    const defaultCrit: AudienceFilterCriteria = {
      minSpend: 0,
      cohortTag: 'all',
      country: 'all',
      search: '',
      orderCountFilter: 'all'
    };
    setFilterCriteria(defaultCrit);
    setCurrentCursor(null);
    setCursorStack([]);
    fetchPage(null, 'reset', defaultCrit);
  };

  // Global Bridge for Seller OS integration
  useEffect(() => {
    (window as any).openCustomer360Drawer = (customerId: string) => {
      setActive360CustomerId(customerId);
      setIs360Open(true);
    };
    (window as any).openQuickSaleModal = (cust?: QuickSaleCustomer) => {
      setQuickSaleTargetCustomer(cust || null);
      setIsQuickSaleOpen(true);
    };
    (window as any).openTechPackPOEngine = (cust?: any) => {
      setTechPackTargetCustomer(cust || null);
      setIsTechPackOpen(true);
    };
    (window as any).openSmartAudienceBuilder = () => {
      setShowAudienceBuilder(true);
    };
    return () => {
      delete (window as any).openCustomer360Drawer;
      delete (window as any).openQuickSaleModal;
      delete (window as any).openTechPackPOEngine;
      delete (window as any).openSmartAudienceBuilder;
    };
  }, []);

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

  const handleCustomerClick = (c: Customer) => {
    setActive360CustomerId(c.id);
    setIs360Open(true);
    if (onSelectCustomer) onSelectCustomer(c);
  };

  const handleOpenQuickSale = (target?: any) => {
    if (target) {
      setQuickSaleTargetCustomer({
        id: target.id,
        name: target.name,
        companyName: target.companyName,
        phone: target.phone,
        email: target.email,
        totalSpent: target.totalSpent,
        ordersCount: target.ordersCount ?? target.totalOrders
      });
    } else {
      setQuickSaleTargetCustomer(null);
    }
    setIsQuickSaleOpen(true);
  };

  return (
    <div className="w-full bg-[#0d0d0c] border border-zinc-800 rounded-xl p-4 font-mono text-zinc-300">
      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-amber-500 font-bold text-sm">CUSTOMER DIRECTORY & 360 INTELLIGENCE</span>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
              16K+ Live Ledger
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Click any buyer for Customer 360 Slide-over · Memory-safe limit(50) cursors · Canonical +880 BD Normalizer
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Sale POS Button */}
          <button
            onClick={() => handleOpenQuickSale()}
            className="rounded bg-[#c81d11] hover:bg-red-700 px-3 py-1.5 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow"
          >
            <span>⚡</span>
            <span>QUICK SALE 2.0</span>
          </button>

          {/* Smart Audience Builder Button */}
          <button
            onClick={() => setShowAudienceBuilder(!showAudienceBuilder)}
            className={`rounded px-3 py-1.5 text-xs font-bold transition-all border ${
              showAudienceBuilder
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-amber-400 hover:text-white'
            }`}
          >
            🎯 {showAudienceBuilder ? 'Hide Builder' : 'Audience Builder'}
          </button>

          <button
            onClick={() => fetchPage(null, 'reset', filterCriteria)}
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 truncate"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Embedded Audience Builder Section if toggled */}
      {showAudienceBuilder && (
        <div className="mb-4">
          <SmartAudienceBuilder onClose={() => setShowAudienceBuilder(false)} />
        </div>
      )}

      {/* Smart Audience Filter Component with Live Dynamic Badge */}
      <div className="mb-4">
        <SmartAudienceFilter
          criteria={filterCriteria}
          onChange={handleFilterCriteriaChange}
          onReset={handleResetFilterCriteria}
          matchingCount={matchingCount}
          totalDatabaseCount={totalDatabaseCount}
          loadingCount={loading}
          onBroadcastToAudience={(crit, count) => {
            if (typeof window !== 'undefined' && (window as any).openWhatsAppCampaignStudio) {
              (window as any).openWhatsAppCampaignStudio({
                cohort: crit.cohortTag !== 'all' ? crit.cohortTag : 'all',
                minSpend: crit.minSpend,
                country: crit.country !== 'all' ? crit.country : undefined,
                audienceCount: count
              });
            }
          }}
        />
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
              <th className="p-2.5 text-right">LTV Spend</th>
              <th className="p-2.5 text-center">360 Actions</th>
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
                <tr
                  key={c.id}
                  onClick={() => handleCustomerClick(c)}
                  className="hover:bg-zinc-900/60 cursor-pointer transition-colors group"
                >
                  <td className="p-2.5 font-medium text-white truncate max-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 group-hover:text-amber-500 transition-colors">▶</span>
                      <span>{c.companyName || c.name}</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-emerald-400 font-mono text-[11px] truncate">
                    {c.phone || '—'}
                  </td>
                  <td className="p-2.5 text-zinc-400">{c.country}</td>
                  <td className="p-2.5 text-right text-zinc-300 font-mono">{c.totalOrders}</td>
                  <td className="p-2.5 text-right font-mono text-[#d4af37] font-bold">
                    ৳{c.totalSpent?.toLocaleString()}
                  </td>
                  <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleCustomerClick(c)}
                        className="rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 text-[11px] text-amber-400 transition-all font-semibold"
                        title="Open Customer 360 Slide-over"
                      >
                        👁️ 360
                      </button>
                      <button
                        onClick={() => handleOpenQuickSale(c)}
                        className="rounded bg-[#c81d11]/80 hover:bg-[#c81d11] px-2 py-1 text-[11px] font-bold text-white transition-all"
                        title="Instant Quick Sale POS"
                      >
                        ⚡ POS
                      </button>
                      {c.phone && (
                        <button
                          onClick={() => onOpenWhatsApp && onOpenWhatsApp(c.id)}
                          className="rounded bg-emerald-800/70 hover:bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white transition-all"
                          title="Open WhatsApp Broadcast"
                        >
                          📲 WA
                        </button>
                      )}
                    </div>
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
          Page <strong className="text-zinc-300">{page}</strong> · Showing {customers.length} records (limit 50 cursor)
        </span>

        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={page === 1 || loading}
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none truncate"
          >
            ← Previous 50
          </button>
          <button
            onClick={handleNext}
            disabled={!hasMore || loading}
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none truncate"
          >
            Next 50 →
          </button>
        </div>
      </div>

      {/* Slide-over Customer 360 Memory Drawer */}
      <Customer360Drawer
        customerId={active360CustomerId}
        isOpen={is360Open}
        onClose={() => {
          setIs360Open(false);
          setActive360CustomerId(null);
        }}
        onOpenQuickSale={(c) => {
          setIs360Open(false);
          handleOpenQuickSale(c);
        }}
        onOpenTechPackPO={(c) => {
          setIs360Open(false);
          setTechPackTargetCustomer(c);
          setIsTechPackOpen(true);
        }}
        onOpenWhatsApp={(cId) => {
          if (onOpenWhatsApp) onOpenWhatsApp(cId);
        }}
      />

      {/* Quick Sale 2.0 POS Modal */}
      <QuickSaleModal
        isOpen={isQuickSaleOpen}
        onClose={() => {
          setIsQuickSaleOpen(false);
          setQuickSaleTargetCustomer(null);
        }}
        preSelectedCustomer={quickSaleTargetCustomer}
        onSuccess={(orderRecord) => {
          // Refresh list to show updated spend & order count
          fetchPage(null, 'reset');
        }}
      />

      {/* Tech Pack & Factory PO Engine Modal */}
      {isTechPackOpen && (
        <TechPackPOEngine
          isOpen={isTechPackOpen}
          mode="modal"
          onClose={() => {
            setIsTechPackOpen(false);
            setTechPackTargetCustomer(null);
          }}
          preSelectedCustomer={techPackTargetCustomer}
          onSuccess={(specRecord) => {
            fetchPage(null, 'reset');
          }}
        />
      )}
    </div>
  );
};

