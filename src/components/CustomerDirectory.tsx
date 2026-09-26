import { db } from '../lib/firebase';
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const PAGE_LIMIT = 50; // Strict limit to prevent mobile/browser memory exhaustion

  const fetchPage = async (
    cursor: DocumentSnapshot | null = null,
    direction: 'next' | 'prev' | 'reset' = 'reset',
    activeCriteria: AudienceFilterCriteria = filterCriteria
  ) => {
    setLoading(true);
    try {
      // db imported from lib/firebase
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
        const data: any = d.data();
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
    const prevOpenTechPack = (window as any).openTechPackPOEngine;
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
      if (typeof prevOpenTechPack === 'function') {
        (window as any).openTechPackPOEngine = prevOpenTechPack;
      } else if ((window as any).NexusApp?.openTechPack) {
        (window as any).openTechPackPOEngine = (window as any).NexusApp.openTechPack;
      }
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
    <div className="w-full bg-white/85 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-[4px_4px_24px_rgba(166,180,200,0.3),-4px_-4px_24px_#ffffff] p-4 lg:p-6 font-mono text-[#1e293b]">
      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-[#1e293b] font-bold text-sm tracking-wide">CUSTOMER DIRECTORY &amp; 360 INTELLIGENCE</span>
            <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-md">
              16K+ Live Ledger
            </span>
          </div>
          <p className="text-[11px] text-[#64748b] mt-0.5 font-sans">
            Click any buyer for Customer 360 Slide-over · Memory-safe limit(50) cursors · Canonical +880 BD Normalizer
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${viewMode === 'grid' ? 'bg-[#c81d11] text-white shadow-xs' : 'text-[#64748b] hover:text-[#1e293b]'}`}
              title="5-Column Grid Card View"
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${viewMode === 'table' ? 'bg-[#c81d11] text-white shadow-xs' : 'text-[#64748b] hover:text-[#1e293b]'}`}
              title="Data Table View"
            >
              ☰ Table
            </button>
          </div>

          {/* Quick Sale POS Button */}
          <button
            onClick={() => handleOpenQuickSale()}
            className="rounded-xl bg-[#c81d11] hover:bg-[#a3160c] px-3 py-1.5 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-xs"
          >
            <span>⚡</span>
            <span>QUICK SALE 2.0</span>
          </button>

          {/* Smart Audience Builder Button */}
          <button
            onClick={() => setShowAudienceBuilder(!showAudienceBuilder)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              showAudienceBuilder
                ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-[#b45309] hover:border-amber-500 shadow-xs'
            }`}
          >
            🎯 {showAudienceBuilder ? 'Hide Builder' : 'Audience Builder'}
          </button>

          <button
            onClick={() => fetchPage(null, 'reset', filterCriteria)}
            className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs text-[#475569] hover:text-[#1e293b] truncate shadow-xs font-semibold"
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

      {/* Customer Display View: 5-Column Responsive Grid or Table */}
      {viewMode === 'grid' ? (
        <div>
          {loading ? (
            <div className="py-16 text-center text-[#64748b] bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl">
              Streaming 50 documents from Firestore cursor…
            </div>
          ) : customers.length === 0 ? (
            <div className="py-16 text-center text-[#64748b] bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl">
              No customers found matching criteria.
            </div>
          ) : (
            <div id="crm-customer-cards-list" className="crm-customer-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleCustomerClick(c)}
                  className="company-card crm-customer-card group relative flex flex-col justify-between h-full min-h-[220px] p-3.5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/90 shadow-xs hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#1e293b] hover:border-[#1e293b] transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xl leading-none select-none">🏢</span>
                        <div className="min-w-0 flex-1">
                          <div className="company-name text-xs font-bold text-[#1e293b] truncate group-hover:text-[#d4af37] transition-colors" title={c.companyName || c.name}>
                            {c.companyName || c.name}
                          </div>
                          <div className="text-[10px] text-[#64748b] font-mono truncate">
                            {c.country || 'BD'} · BDT
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md font-mono shrink-0">
                        {c.totalOrders || 0} ord
                      </span>
                    </div>

                    {/* Brutalist Lifetime Spend Box */}
                    <div className="flex items-baseline justify-between p-2 my-2 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                      <span className="text-[9px] text-[#64748b] font-mono uppercase font-semibold">Lifetime</span>
                      <span className="text-xs font-extrabold text-[#b45309] font-mono">
                        ৳{(c.totalSpent || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="company-meta space-y-1 text-[10px] font-mono min-h-[38px] mb-2 text-[#475569]">
                      {c.phone && (
                        <div className="truncate flex items-center gap-1.5">
                          <span className="text-[8.5px] font-bold text-[#94a3b8]">TEL</span>
                          <span className="truncate">{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="truncate flex items-center gap-1.5 text-[#64748b]">
                          <span className="text-[8.5px] font-bold text-[#94a3b8]">MAIL</span>
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {!c.phone && !c.email && (
                        <div className="text-[#94a3b8] italic text-[9px]">Verified Ledger Record</div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Strip */}
                  <div className="flex gap-1.5 pt-2 border-t border-slate-200/80 mt-auto" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleCustomerClick(c)}
                      className="flex-1 min-h-[26px] py-1 px-2 text-[10px] font-semibold text-[#475569] hover:text-[#1e293b] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
                      title="Open Customer 360 Slide-over"
                    >
                      👁️ 360
                    </button>
                    <button
                      onClick={() => handleOpenQuickSale(c)}
                      className="py-1 px-2 text-[10px] font-bold text-white bg-[#c81d11] hover:bg-[#a3160c] rounded-lg transition-colors shadow-xs"
                      title="Instant Quick Sale POS"
                    >
                      ⚡ POS
                    </button>
                    {c.phone && onOpenWhatsApp && (
                      <button
                        onClick={() => onOpenWhatsApp(c.id)}
                        className="py-1 px-2 text-[10px] font-bold text-white bg-[#10b981] hover:bg-[#059669] rounded-lg transition-colors shadow-xs"
                        title="Open WhatsApp Broadcast"
                      >
                        📲 WA
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Table Container */
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[#64748b] text-[10px] uppercase tracking-wider">
                <th className="p-2.5">Buyer / Company</th>
                <th className="p-2.5">Canonical Phone</th>
                <th className="p-2.5">Market</th>
                <th className="p-2.5 text-right">Orders</th>
                <th className="p-2.5 text-right">LTV Spend</th>
                <th className="p-2.5 text-center">360 Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#64748b]">
                    Streaming 50 documents from Firestore cursor…
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#64748b]">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleCustomerClick(c)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="p-2.5 font-medium text-[#1e293b] truncate max-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#94a3b8] group-hover:text-amber-600 transition-colors">▶</span>
                        <span className="font-semibold">{c.companyName || c.name}</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-emerald-700 font-mono text-[11px] truncate font-medium">
                      {c.phone || '—'}
                    </td>
                    <td className="p-2.5 text-[#64748b]">{c.country}</td>
                    <td className="p-2.5 text-right text-[#475569] font-mono">{c.totalOrders}</td>
                    <td className="p-2.5 text-right font-mono text-[#b45309] font-bold">
                      ৳{c.totalSpent?.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleCustomerClick(c)}
                          className="rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 text-[11px] text-[#475569] hover:text-[#1e293b] transition-all font-semibold"
                          title="Open Customer 360 Slide-over"
                        >
                          👁️ 360
                        </button>
                        <button
                          onClick={() => handleOpenQuickSale(c)}
                          className="rounded-lg bg-[#c81d11] hover:bg-[#a3160c] px-2 py-1 text-[11px] font-bold text-white transition-all shadow-xs"
                          title="Instant Quick Sale POS"
                        >
                          ⚡ POS
                        </button>
                        {c.phone && (
                          <button
                            onClick={() => onOpenWhatsApp && onOpenWhatsApp(c.id)}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white transition-all shadow-xs"
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
      )}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/80 text-[11px]">
        <span className="text-[#64748b]">
          Page <strong className="text-[#1e293b]">{page}</strong> · Showing {customers.length} records (limit 50 cursor)
        </span>

        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={page === 1 || loading}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs text-[#475569] hover:text-[#1e293b] disabled:opacity-30 disabled:pointer-events-none truncate shadow-xs font-semibold"
          >
            ← Previous 50
          </button>
          <button
            onClick={handleNext}
            disabled={!hasMore || loading}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs text-[#475569] hover:text-[#1e293b] disabled:opacity-30 disabled:pointer-events-none truncate shadow-xs font-semibold"
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

