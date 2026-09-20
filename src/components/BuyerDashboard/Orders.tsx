import React, { useState, useEffect, useCallback } from 'react';
import { fetchBuyerOrders, Order } from '../../services/nexusApi';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  DollarSign,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  PackageCheck,
  Search
} from 'lucide-react';

export interface OrdersProps {
  buyerId?: string;
  onSelectOrder?: (order: Order) => void;
  className?: string;
}

export const Orders: React.FC<OrdersProps> = ({
  buyerId,
  onSelectOrder,
  className = '',
}) => {
  // CRITICAL: Initialize strictly to empty array [] so it never maps over undefined
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setSyncNotice(null);
    try {
      const liveOrders = await fetchBuyerOrders(buyerId);
      // Ensure array type safety
      setOrders(Array.isArray(liveOrders) ? liveOrders : []);
    } catch (err) {
      console.error('[Orders] Exception while querying Firestore orders collection:', err);
      setSyncNotice('Unable to reach Firestore live sync. Displaying zero-state ledger.');
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [buyerId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
  };

  // Safe client-side filtering over guaranteed array
  const filteredOrders = orders.filter((order) => {
    if (!order) return false;
    const matchesStatus =
      selectedStatusFilter === 'ALL' ||
      order.status?.toLowerCase() === selectedStatusFilter.toLowerCase() ||
      order.paymentStatus?.toLowerCase() === selectedStatusFilter.toLowerCase();

    const q = filterQuery.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesQuery =
      (order.orderNumber || '').toLowerCase().includes(q) ||
      (order.customerName || '').toLowerCase().includes(q) ||
      (order.items || []).some((item) => (item.title || '').toLowerCase().includes(q));

    return matchesStatus && matchesQuery;
  });

  return (
    <div className={`orders-root font-mono text-zinc-100 ${className}`}>
      {/* ── Header & Action Controls ── */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0e0e0e]/90 p-4 border border-zinc-800 rounded-xl backdrop-blur-md shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>NexOS Settlement Ledger · Firestore Verifiable</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
            Buyer Purchase Orders &amp; Escrow
          </h2>
          <p className="text-xs text-zinc-400">
            Cryptographic escrow, 50% advance production unlocks, and live logistics settlement ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search order #, client, SKU..."
              className="w-full bg-zinc-900/90 text-xs text-zinc-200 pl-8 pr-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-amber-400/60"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700/80 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            title="Re-query orders collection from Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* ── Status Filter Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        {['ALL', 'OPEN', 'CUTTING_AUTHORIZED', 'COMPLETED'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatusFilter(status)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
              selectedStatusFilter === status
                ? 'bg-zinc-200 text-black border-zinc-200 font-bold'
                : 'bg-[#121212] text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {syncNotice && (
        <div className="mb-4 p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300">
          {syncNotice}
        </div>
      )}

      {/* ── LOADING SKELETON: Obsidian Glassmorphic ── */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`order-skeleton-${idx}`}
              className="bg-[#121212]/50 animate-pulse border border-zinc-800/80 rounded-xl p-5 backdrop-blur-md shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-44"></div>
                  <div className="h-3 bg-zinc-900 rounded w-28"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-zinc-900 rounded w-24"></div>
                  <div className="h-6 bg-zinc-800 rounded w-20"></div>
                </div>
              </div>
              <div className="h-16 bg-zinc-900/60 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        /* ── BRUTALIST EMPTY STATE UI (Strict user specification) ── */
        <div className="p-12 text-center bg-[#0d0d0d] border border-zinc-800/90 rounded-2xl max-w-xl mx-auto my-8 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/60 mx-auto flex items-center justify-center mb-4 text-zinc-400">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2">
            No active orders found in the NexOS ledger.
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6 leading-relaxed">
            All transaction locks, tech pack procurement orders, and buyer settlements will synchronize here directly from Firestore.
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            Poll Firestore Node
          </button>
        </div>
      ) : (
        /* ── LIVE ORDERS LIST ── */
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isAdvanceSecured =
              order.paymentStatus === 'paid' ||
              order.paymentStatus === 'advance_50_pct' ||
              order.amountPaid > 0;

            const isCuttingAuthorized =
              order.status === 'cutting_authorized' ||
              order.fulfillmentStatus === 'cutting' ||
              Boolean(order.productionUnlockedAt);

            return (
              <div
                key={order.id}
                className="bg-[#0f0f0f] hover:bg-[#141414] border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all shadow-md group"
              >
                {/* ── Order Header Row ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-zinc-850">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white font-mono">
                        {order.orderNumber}
                      </span>
                      {/* JIT Cash-Lock Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isAdvanceSecured
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
                            : 'bg-amber-950/80 text-amber-400 border border-amber-700/50'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        {isAdvanceSecured ? '50% Escrow Locked' : 'Pending Escrow Deposit'}
                      </span>

                      {/* Production Status */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isCuttingAuthorized
                            ? 'bg-blue-950/80 text-blue-400 border border-blue-700/50'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        <PackageCheck className="w-3 h-3" />
                        {isCuttingAuthorized ? 'Cutting Authorized' : 'Awaiting Floor Authorization'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1.5">
                      <span>Buyer: <strong className="text-zinc-200">{order.customerName || 'Direct Account'}</strong></span>
                      <span>·</span>
                      <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Financial Settlement Snapshot */}
                  <div className="text-right flex md:flex-col justify-between md:justify-end items-end">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                      Contract Value
                    </div>
                    <div className="text-base font-bold text-white font-mono">
                      ${Number(order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-xs text-zinc-500 ml-1">{order.currency || 'USD'}</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono">
                      Paid: ${Number(order.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* ── Order Items Table / Summary ── */}
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="py-3">
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold">
                      Line Items ({order.items.length})
                    </div>
                    <div className="space-y-1.5">
                      {order.items.map((item, itemIdx) => (
                        <div
                          key={item.id || itemIdx}
                          className="flex items-center justify-between text-xs bg-zinc-950/60 p-2 rounded border border-zinc-900"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-300 font-medium">{item.title}</span>
                            {item.sku && (
                              <span className="text-[10px] text-zinc-500 font-mono">({item.sku})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 font-mono text-zinc-400">
                            <span>Qty: <strong className="text-zinc-200">{item.quantity}</strong></span>
                            <span>Unit: ${item.price}</span>
                            <span className="text-zinc-200 font-semibold">
                              ${(item.quantity * item.price).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Card Footer Actions ── */}
                <div className="pt-3 border-t border-zinc-850 flex items-center justify-between">
                  <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>H&amp;H BayXBengal Factory Settlement Escrow Protected</span>
                  </div>

                  <button
                    onClick={() => onSelectOrder && onSelectOrder(order)}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded border border-zinc-700 flex items-center gap-1 transition-colors"
                  >
                    <span>Inspect Ledger</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
