import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchBuyerOrders, Order } from '../../services/nexusApi';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
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
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  PackageCheck,
  Search,
  TrendingUp,
  Activity,
  BarChart3,
  Calendar,
  Users,
  X,
  Tag,
  Hash,
  User
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

  // Trendline controls
  const [trendMetric, setTrendMetric] = useState<'VOLUME' | 'REVENUE' | 'CUMULATIVE'>('VOLUME');
  const [isTrendExpanded, setIsTrendExpanded] = useState<boolean>(true);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setSyncNotice(null);
    try {
      let liveOrders = await fetchBuyerOrders(buyerId);
      if ((!liveOrders || liveOrders.length === 0) && typeof window !== 'undefined' && Array.isArray((window as any).orders) && (window as any).orders.length > 0) {
        liveOrders = (window as any).orders.filter((o: any) => !o.isMock && !o.archived);
      }
      // Ensure array type safety
      setOrders(Array.isArray(liveOrders) ? liveOrders : []);
    } catch (err) {
      console.error('[Orders] Exception while querying Firestore orders collection:', err);
      if (typeof window !== 'undefined' && Array.isArray((window as any).orders) && (window as any).orders.length > 0) {
        setOrders((window as any).orders.filter((o: any) => !o.isMock && !o.archived));
      } else {
        setSyncNotice('Unable to reach Firestore live sync. Displaying zero-state ledger.');
        setOrders([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [buyerId]);

  useEffect(() => {
    loadOrders();

    const handleSync = (e: any) => {
      const list = e.detail?.orders || e.detail;
      if (Array.isArray(list) && list.length > 0) {
        const clean = list.filter((o: any) => o && !o.isMock && !o.archived);
        if (clean.length > 0) {
          setOrders(clean);
        }
      }
    };

    window.addEventListener('ORDERS_CHANGED', handleSync);
    window.addEventListener('nexus:order-saved', handleSync);

    return () => {
      window.removeEventListener('ORDERS_CHANGED', handleSync);
      window.removeEventListener('nexus:order-saved', handleSync);
    };
  }, [loadOrders]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
  };

  // Safe client-side filtering over guaranteed array with comprehensive customer name, order ID, and SKU support
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!order) return false;
      const matchesStatus =
        selectedStatusFilter === 'ALL' ||
        order.status?.toLowerCase() === selectedStatusFilter.toLowerCase() ||
        order.paymentStatus?.toLowerCase() === selectedStatusFilter.toLowerCase();

      const q = filterQuery.toLowerCase().trim();
      if (!q) return matchesStatus;

      // 1. Customer Name filtering
      const customerName = String(order.customerName || '').toLowerCase();
      const contactName = String((order as any).contactName || '').toLowerCase();
      const snapshotName = String((order as any).customerSnapshot?.name || '').toLowerCase();
      const shippingName = String((order as any).shippingAddress?.name || '').toLowerCase();
      const email = String((order as any).customerEmail || (order as any).customerSnapshot?.email || '').toLowerCase();
      const phone = String((order as any).customerPhone || (order as any).phone || (order as any).customerSnapshot?.phone || '').toLowerCase();
      const matchesCustomerName =
        customerName.includes(q) ||
        contactName.includes(q) ||
        snapshotName.includes(q) ||
        shippingName.includes(q) ||
        email.includes(q) ||
        phone.includes(q);

      // 2. Order ID filtering (id, orderNumber, rawId, orderId)
      const orderId = String(order.id || '').toLowerCase();
      const orderNumber = String(order.orderNumber || '').toLowerCase();
      const rawId = String((order as any).rawId || '').toLowerCase();
      const orderIdField = String((order as any).orderId || '').toLowerCase();
      const matchesOrderId =
        orderId.includes(q) ||
        orderNumber.includes(q) ||
        rawId.includes(q) ||
        orderIdField.includes(q);

      // 3. SKU Number filtering (items and lineItems sku, productId, variantId, title)
      const itemsList = Array.isArray(order.items)
        ? order.items
        : Array.isArray((order as any).lineItems)
        ? (order as any).lineItems
        : [];

      const matchesSku = itemsList.some((item: any) => {
        if (!item) return false;
        const sku = String(item.sku || '').toLowerCase();
        const prodId = String(item.productId || '').toLowerCase();
        const variantId = String(item.variantId || '').toLowerCase();
        const title = String(item.title || '').toLowerCase();
        return (
          sku.includes(q) ||
          prodId.includes(q) ||
          variantId.includes(q) ||
          title.includes(q)
        );
      });

      return matchesStatus && (matchesCustomerName || matchesOrderId || matchesSku);
    });
  }, [orders, selectedStatusFilter, filterQuery]);

  // Compute 30-day Bangladesh D2C order volume trendline data
  const trendData = useMemo(() => {
    const now = new Date();
    const dayMap = new Map<string, {
      date: string;
      label: string;
      fullDate: string;
      volume: number;
      revenue: number;
      cumulativeVolume: number;
      cumulativeRevenue: number;
      orders: Order[];
    }>();

    // Construct 30 consecutive calendar day slots
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      dayMap.set(dateKey, {
        date: dateKey,
        label,
        fullDate,
        volume: 0,
        revenue: 0,
        cumulativeVolume: 0,
        cumulativeRevenue: 0,
        orders: []
      });
    }

    // Populate using authentic Bangladesh D2C orders
    const bdOrders = orders.filter(o => o && !o.isMock && !o.archived);
    bdOrders.forEach(order => {
      if (!order.createdAt) return;
      const orderDateKey = new Date(order.createdAt).toISOString().slice(0, 10);
      const entry = dayMap.get(orderDateKey);
      if (entry) {
        entry.volume += 1;
        entry.revenue += Number(order.total || 0);
        entry.orders.push(order);
      }
    });

    const list = Array.from(dayMap.values());
    let runVol = 0;
    let runRev = 0;
    list.forEach(item => {
      runVol += item.volume;
      runRev += item.revenue;
      item.cumulativeVolume = runVol;
      item.cumulativeRevenue = runRev;
    });

    return list;
  }, [orders]);

  // Summary Metrics over the 30-day window
  const trendSummary = useMemo(() => {
    const totalVolume = trendData.reduce((acc, curr) => acc + curr.volume, 0);
    const totalRevenue = trendData.reduce((acc, curr) => acc + curr.revenue, 0);
    const peakVolume = Math.max(0, ...trendData.map(d => d.volume));
    const peakDay = trendData.find(d => d.volume === peakVolume && peakVolume > 0);
    const aov = totalVolume > 0 ? Math.round(totalRevenue / totalVolume) : 0;
    const bdOrders = orders.filter(o => o && !o.isMock && !o.archived);
    const uniqueBuyers = new Set(
      bdOrders.map(o => o.customerPhone || o.customerEmail || o.customerName)
    ).size;

    return {
      totalVolume,
      totalRevenue,
      peakVolume,
      peakDayLabel: peakDay ? peakDay.label : 'Active',
      aov,
      uniqueBuyers
    };
  }, [trendData, orders]);

  // Custom Glassmorphic Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0b0b0b]/95 border border-zinc-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-xl text-xs font-mono space-y-1.5 z-50 min-w-[210px]">
          <div className="text-[11px] font-bold text-zinc-400 border-b border-zinc-800 pb-1.5 flex items-center justify-between">
            <span>{data.fullDate}</span>
            <span className="text-emerald-400 font-bold bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-700/40">
              {data.volume} {data.volume === 1 ? 'Order' : 'Orders'}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-300 pt-0.5">
            <span className="text-zinc-500">Order Volume:</span>
            <span className="font-bold text-emerald-400">{data.volume} orders</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500">Daily Gross Value:</span>
            <span className="font-bold text-amber-400 font-mono">৳{Number(data.revenue).toLocaleString()} BDT</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500">30D Cumulative:</span>
            <span className="font-semibold text-sky-400">{data.cumulativeVolume} orders</span>
          </div>
          {data.orders && data.orders.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-zinc-800 text-[10.5px]">
              <div className="text-zinc-500 text-[9.5px] uppercase font-bold tracking-wider mb-1">
                Active Buyers ({data.orders.length}):
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {data.orders.map((o: any, idx: number) => (
                  <div key={o.id || idx} className="text-zinc-300 truncate flex items-center justify-between gap-2">
                    <span className="truncate text-zinc-200">{o.customerName || 'Direct Buyer'}</span>
                    <span className="text-amber-400/90 font-mono shrink-0">৳{Number(o.total || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`orders-root font-mono text-zinc-100 ${className}`}>
      {/* ── 1. Top Search Bar: Filter by Customer Name, Order ID, or SKU Number ── */}
      <div className="mb-6 bg-[#0e0e0e]/95 border border-zinc-800 rounded-xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by customer name, order ID, or SKU number (e.g. Nafis, NX-1049, HH-TEE-02-L)..."
              className="w-full bg-zinc-950/80 text-xs sm:text-sm text-zinc-100 pl-10 pr-9 py-2.5 rounded-lg border border-zinc-700/80 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-zinc-500 font-mono transition-all"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-zinc-400 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
              Showing <strong className="text-emerald-400">{filteredOrders.length}</strong> of {orders.length}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700/80 rounded-lg transition-all active:scale-95 disabled:opacity-50"
              title="Sync latest live orders from Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Ledger</span>
            </button>
          </div>
        </div>

        {/* Search Helper Pills & Indicators */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="text-zinc-500 mr-1 flex items-center gap-1">
            <span>Filter by:</span>
          </span>
          <button
            type="button"
            onClick={() => setFilterQuery('Nafis')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-all ${
              filterQuery && 'nafis'.includes(filterQuery.toLowerCase())
                ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300 font-bold'
                : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Search by Customer Name"
          >
            <User className="w-3 h-3 text-emerald-400" />
            <span>Customer Name</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterQuery('NX-BD-LIVE-901')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-all ${
              filterQuery && 'nx-bd-live-901'.includes(filterQuery.toLowerCase())
                ? 'bg-sky-950/70 border-sky-600/60 text-sky-300 font-bold'
                : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Search by Order ID"
          >
            <Hash className="w-3 h-3 text-sky-400" />
            <span>Order ID</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterQuery('HH-TEE')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-all ${
              filterQuery && 'hh-tee'.includes(filterQuery.toLowerCase())
                ? 'bg-amber-950/70 border-amber-600/60 text-amber-300 font-bold'
                : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Search by SKU Number"
          >
            <Tag className="w-3 h-3 text-amber-400" />
            <span>SKU Number</span>
          </button>

          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="ml-auto text-zinc-400 hover:text-amber-400 underline underline-offset-2 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset filter</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Ledger Title Header ── */}
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
      </div>

      {/* ── 30-Day Bangladesh D2C Order Volume Trend Line Chart ── */}
      <div className="mb-6 bg-[#0c0c0c] border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all">
        {/* Chart Header & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Bangladesh D2C 30-Day Order Volume &amp; Velocity
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-950/90 border border-emerald-600/50 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE RECHARTS</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Daily order volume distribution and gross transaction velocity for authentic Bangladesh D2C customers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric Switcher */}
            <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setTrendMetric('VOLUME')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  trendMetric === 'VOLUME'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Daily Order Count"
              >
                Volume (Orders)
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric('REVENUE')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  trendMetric === 'REVENUE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Daily Gross BDT Revenue"
              >
                Gross (৳ BDT)
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric('CUMULATIVE')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  trendMetric === 'CUMULATIVE'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Cumulative 30-Day Velocity"
              >
                Cumulative
              </button>
            </div>

            {/* Toggle Collapse */}
            <button
              type="button"
              onClick={() => setIsTrendExpanded(!isTrendExpanded)}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title={isTrendExpanded ? 'Collapse Chart' : 'Expand Chart'}
            >
              {isTrendExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-3">
          <div className="bg-zinc-950/70 border border-zinc-850 p-2.5 sm:p-3 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center justify-between">
              <span>30D Order Volume</span>
              <Activity className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono mt-1">
              {trendSummary.totalVolume} <span className="text-xs text-zinc-400 font-normal">Orders</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              100% Bangladesh D2C
            </div>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-850 p-2.5 sm:p-3 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center justify-between">
              <span>30D Gross Value</span>
              <DollarSign className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono mt-1">
              ৳{trendSummary.totalRevenue.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">BDT</span>
            </div>
            <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
              bKash / COD / Direct
            </div>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-850 p-2.5 sm:p-3 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center justify-between">
              <span>Avg Order Value (AOV)</span>
              <BarChart3 className="w-3 h-3 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono mt-1">
              ৳{trendSummary.aov.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">BDT</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
              Per Transaction
            </div>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-850 p-2.5 sm:p-3 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center justify-between">
              <span>Peak Day Velocity</span>
              <Users className="w-3 h-3 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono mt-1">
              {trendSummary.peakVolume} <span className="text-xs text-zinc-400 font-normal">Orders / Day</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
              {trendSummary.uniqueBuyers} Verified Buyers
            </div>
          </div>
        </div>

        {/* Recharts Area Chart View */}
        {isTrendExpanded && (
          <div className="pt-1">
            <div className="h-[210px] sm:h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orderVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="orderRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="orderCumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#222225" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#71717a"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickFormatter={(val) => trendMetric === 'REVENUE' ? `৳${(val / 1000).toFixed(0)}k` : `${val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {trendMetric === 'VOLUME' && (
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#orderVolumeGrad)"
                      activeDot={{ r: 6, fill: '#10b981', stroke: '#09090b', strokeWidth: 2 }}
                      dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                    />
                  )}
                  {trendMetric === 'REVENUE' && (
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#orderRevenueGrad)"
                      activeDot={{ r: 6, fill: '#f59e0b', stroke: '#09090b', strokeWidth: 2 }}
                      dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                    />
                  )}
                  {trendMetric === 'CUMULATIVE' && (
                    <Area
                      type="monotone"
                      dataKey="cumulativeVolume"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#orderCumulativeGrad)"
                      activeDot={{ r: 6, fill: '#38bdf8', stroke: '#09090b', strokeWidth: 2 }}
                      dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-900 mt-2 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-emerald-500 rounded-full inline-block" />
                <span>30-Day Daily Order Frequency (Real-Time Synchronized)</span>
              </span>
              <span>Showing last 30 calendar days</span>
            </div>
          </div>
        )}
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
        /* ── SEARCH OR LEDGER EMPTY STATE UI ── */
        <div className="p-12 text-center bg-[#0d0d0d] border border-zinc-800/90 rounded-2xl max-w-xl mx-auto my-8 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/60 mx-auto flex items-center justify-center mb-4 text-zinc-400">
            {filterQuery ? <Search className="w-7 h-7 text-amber-400" /> : <FileText className="w-7 h-7" />}
          </div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2">
            {filterQuery ? `No orders matching "${filterQuery}"` : 'No active orders found in the NexOS ledger.'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6 leading-relaxed">
            {filterQuery
              ? 'Try adjusting your search query. You can filter by customer name (e.g. Nafis, Minoura), order ID (e.g. NX-BD-LIVE-901, ord-muit...), or SKU (e.g. HH-TEE-02-L).'
              : 'All transaction locks, tech pack procurement orders, and buyer settlements will synchronize here directly from Firestore.'}
          </p>
          {filterQuery ? (
            <button
              onClick={() => setFilterQuery('')}
              className="px-4 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
            >
              <X className="w-4 h-4" />
              <span>Clear Search Filter</span>
            </button>
          ) : (
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              Poll Firestore Node
            </button>
          )}
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

            const q = filterQuery.toLowerCase().trim();
            const isOrderIdMatched = Boolean(
              q && (
                String(order.id || '').toLowerCase().includes(q) ||
                String(order.orderNumber || '').toLowerCase().includes(q) ||
                String((order as any).rawId || '').toLowerCase().includes(q)
              )
            );
            const isCustomerMatched = Boolean(
              q && (
                String(order.customerName || '').toLowerCase().includes(q) ||
                String((order as any).customerSnapshot?.name || '').toLowerCase() ||
                String((order as any).contactName || '').toLowerCase()
              )
            );

            return (
              <div
                key={order.id}
                className="bg-[#0f0f0f] hover:bg-[#141414] border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all shadow-md group"
              >
                {/* ── Order Header Row ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-zinc-850">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`text-sm font-bold font-mono ${isOrderIdMatched ? 'text-amber-300' : 'text-white'}`}>
                        {order.orderNumber}
                      </span>

                      {/* Explicit Order ID badge */}
                      {order.id && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
                          isOrderIdMatched
                            ? 'bg-amber-950/60 text-amber-300 border-amber-600/70 font-bold'
                            : 'bg-zinc-900/90 text-zinc-400 border-zinc-800'
                        }`}>
                          <Hash className="w-2.5 h-2.5 text-zinc-500" />
                          <span>ID: {order.id}</span>
                        </span>
                      )}

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

                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-2">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Customer / Buyer:</span>
                        <strong className={`font-semibold ${isCustomerMatched ? 'text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-700/50' : 'text-zinc-200'}`}>
                          {order.customerName || (order as any).customerSnapshot?.name || 'Direct Account'}
                        </strong>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Financial Settlement Snapshot */}
                  <div className="text-right flex md:flex-col justify-between md:justify-end items-end">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                      Contract Value
                    </div>
                    <div className="text-base font-bold text-white font-mono">
                      {order.currency === 'BDT' ? '৳' : '$'}{Number(order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-xs text-zinc-500 ml-1">{order.currency || 'BDT'}</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono">
                      Paid: {order.currency === 'BDT' ? '৳' : '$'}{Number(order.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* ── Order Items Table / Summary with SKU Badges ── */}
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="py-3">
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold flex items-center justify-between">
                      <span>Line Items ({order.items.length})</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Indexed by SKU</span>
                    </div>
                    <div className="space-y-1.5">
                      {order.items.map((item, itemIdx) => {
                        const isSkuMatched = Boolean(
                          q && item.sku && String(item.sku).toLowerCase().includes(q)
                        );
                        return (
                          <div
                            key={item.id || itemIdx}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs p-2.5 rounded-lg border transition-colors ${
                              isSkuMatched
                                ? 'bg-amber-950/30 border-amber-600/70'
                                : 'bg-zinc-950/60 border-zinc-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-zinc-200 font-medium">{item.title}</span>
                              {item.sku && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${
                                  isSkuMatched
                                    ? 'bg-amber-900/60 text-amber-200 border-amber-500 font-bold shadow-xs'
                                    : 'bg-zinc-900 text-amber-400/90 border-zinc-800'
                                }`}>
                                  <Tag className="w-2.5 h-2.5 text-amber-400" />
                                  <span>SKU: {item.sku}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 font-mono text-zinc-400">
                              <span>Qty: <strong className="text-zinc-200">{item.quantity}</strong></span>
                              <span>Unit: {order.currency === 'BDT' ? '৳' : '$'}{item.price}</span>
                              <span className="text-zinc-200 font-semibold">
                                {order.currency === 'BDT' ? '৳' : '$'}{(item.quantity * item.price).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
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
