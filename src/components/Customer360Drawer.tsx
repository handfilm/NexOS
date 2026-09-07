import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentSnapshot,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { normalizeBangladeshPhone, parseBangladeshPhone } from '../utils/phoneNormalizer';

export interface SegmentThresholds {
  vipSpendThreshold: number; // default 25000
  vipOrdersThreshold: number; // default 3
  activeRepeatOrdersThreshold: number; // default 2
  activeRepeatDaysThreshold: number; // default 90
  dormantDaysThreshold: number; // default 120
}

export const DEFAULT_SEGMENT_THRESHOLDS: SegmentThresholds = {
  vipSpendThreshold: 25000,
  vipOrdersThreshold: 3,
  activeRepeatOrdersThreshold: 2,
  activeRepeatDaysThreshold: 90,
  dormantDaysThreshold: 120
};

export interface CalculatedSegmentBadge {
  label: 'VIP Whale' | 'Active Repeat' | 'Dormant' | 'Warm Lead';
  tone: 'amber' | 'emerald' | 'coral' | 'zinc';
  description: string;
}

export function calculateCustomerSegmentBadges(
  customer: Partial<CustomerProfile>,
  thresholds: SegmentThresholds = DEFAULT_SEGMENT_THRESHOLDS
): CalculatedSegmentBadge[] {
  const totalSpent = Number(customer.totalSpent || 0);
  const ordersCount = Number(customer.ordersCount ?? customer.totalOrders ?? 0);
  const daysSinceLastOrder =
    customer.daysSinceLastOrder !== null && customer.daysSinceLastOrder !== undefined
      ? Number(customer.daysSinceLastOrder)
      : customer.lastOrderAt
      ? Math.max(0, Math.floor((Date.now() - new Date(customer.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24)))
      : null;

  const badges: CalculatedSegmentBadge[] = [];

  // 1. VIP Whale: LTV > ৳25,000 or Orders >= 3
  if (totalSpent > thresholds.vipSpendThreshold || ordersCount >= thresholds.vipOrdersThreshold) {
    badges.push({
      label: 'VIP Whale',
      tone: 'amber',
      description: `LTV > ৳${thresholds.vipSpendThreshold.toLocaleString()} or ${ordersCount} completed orders`
    });
  }

  // 2. Active Repeat: Orders >= 2 within last 90 days
  if (
    ordersCount >= thresholds.activeRepeatOrdersThreshold &&
    daysSinceLastOrder !== null &&
    daysSinceLastOrder <= thresholds.activeRepeatDaysThreshold
  ) {
    badges.push({
      label: 'Active Repeat',
      tone: 'emerald',
      description: `${ordersCount} orders with recency < ${thresholds.activeRepeatDaysThreshold}d`
    });
  }

  // 3. Dormant: No orders in 120+ days
  if (ordersCount > 0 && daysSinceLastOrder !== null && daysSinceLastOrder >= thresholds.dormantDaysThreshold) {
    badges.push({
      label: 'Dormant',
      tone: 'coral',
      description: `Inactive for ${daysSinceLastOrder} days (${thresholds.dormantDaysThreshold}d+ threshold)`
    });
  }

  // 4. Warm Lead: Zero orders recorded
  if (ordersCount === 0) {
    badges.push({
      label: 'Warm Lead',
      tone: 'zinc',
      description: 'Account created, zero orders recorded'
    });
  }

  return badges;
}

export interface CustomerProfile {
  id: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  normalizedPhone?: string;
  rawPhone?: string;
  firstOrderAt?: string;
  completedOrdersCount?: number;
  email?: string;
  country?: string;
  flag?: string;
  totalOrders?: number;
  ordersCount?: number;
  totalSpent?: number;
  aov?: number;
  lifecycleStage?: 'VIP' | 'Repeat' | 'New' | 'Dormant' | 'Active';
  segmentBadges?: string[];
  daysSinceLastOrder?: number | null;
  purchaseFrequencyMonthly?: number;
  returnRatePct?: number;
  preferredCategories?: string[];
  priceSensitivity?: string;
  addresses?: Array<{ line1?: string; city?: string; postalCode?: string; country?: string }>;
  lastOrderAt?: string;
  tags?: string[];
  categoryPreferences?: string[];
  notes?: Array<{
    id?: string;
    text: string;
    type?: 'note' | 'whatsapp' | 'quicksale' | 'system';
    by?: string;
    createdAt?: string;
    at?: string;
  }>;
  communicationTimeline?: Array<{
    id?: string;
    channel: 'whatsapp' | 'email' | 'call';
    title: string;
    summary: string;
    timestamp: string;
    status?: string;
  }>;
  orders?: CustomerOrderRecord[];
}

export interface CustomerOrderRecord {
  id: string;
  orderNumber: string;
  total: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  lineItems: Array<{
    title: string;
    sku?: string;
    quantity: number;
    price: number;
    lineTotal?: number;
  }>;
}

interface Customer360DrawerProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickSale?: (customer: CustomerProfile) => void;
  onOpenTechPackPO?: (customer: CustomerProfile) => void;
  onOpenWhatsApp?: (customerId: string, phone: string) => void;
}

export const Customer360Drawer: React.FC<Customer360DrawerProps> = ({
  customerId,
  isOpen,
  onClose,
  onOpenQuickSale,
  onOpenTechPackPO,
  onOpenWhatsApp
}) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([]);
  const [ordersCursor, setOrdersCursor] = useState<DocumentSnapshot | null>(null);
  const [ordersCursorStack, setOrdersCursorStack] = useState<DocumentSnapshot[]>([]);
  const [ordersPage, setOrdersPage] = useState<number>(1);
  const [hasMoreOrders, setHasMoreOrders] = useState<boolean>(false);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<string>('');
  const [addingNote, setAddingNote] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'timeline' | 'behavioral' | 'products'>('profile');

  const ORDERS_PER_PAGE = 10;

  // Load customer profile and first 10 orders cursor
  useEffect(() => {
    if (!isOpen || !customerId) {
      setCustomer(null);
      setOrders([]);
      setOrdersCursor(null);
      setOrdersCursorStack([]);
      setOrdersPage(1);
      return;
    }

    let isMounted = true;

    async function loadCustomerData() {
      setLoadingProfile(true);
      try {
        // 1. Primary: Unified Commerce Spine REST API (/api/customers/:id)
        const res = await fetch(`/api/customers/${encodeURIComponent(customerId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.item && isMounted) {
            const item = json.item;
            const phoneInfo = parseBangladeshPhone(item.phone || item.mobile || item.tel);
            const profile: CustomerProfile = {
              id: item.id,
              name: item.name || item.companyName || 'Valued Buyer',
              companyName: item.companyName || item.name || '',
              contactPerson: item.contactPerson || item.name || '',
              phone: phoneInfo.normalizedPhone || normalizeBangladeshPhone(item.phone || item.mobile || item.tel),
              normalizedPhone: phoneInfo.normalizedPhone || normalizeBangladeshPhone(item.phone || item.mobile || item.tel),
              rawPhone: phoneInfo.rawPhone || item.phone || '',
              firstOrderAt: item.firstOrderAt || (item.orders && item.orders[item.orders.length - 1]?.createdAt) || '',
              completedOrdersCount: Number(item.completedOrdersCount ?? item.ordersCount ?? item.totalOrders ?? (item.orders?.length || 0)),
              email: item.email || '',
              country: item.country || 'BD',
              flag: item.flag || (item.country === 'BD' ? '🇧🇩' : '🌐'),
              totalOrders: Number(item.ordersCount ?? item.totalOrders ?? (item.orders?.length || 0)),
              ordersCount: Number(item.ordersCount ?? item.totalOrders ?? (item.orders?.length || 0)),
              totalSpent: Number(item.totalSpent || 0),
              aov: Number(item.aov || (item.ordersCount ? Math.round(item.totalSpent / item.ordersCount) : 0)),
              lifecycleStage: item.lifecycleStage || 'Active',
              segmentBadges: Array.isArray(item.segmentBadges) ? item.segmentBadges : ['Active Patron'],
              daysSinceLastOrder: item.daysSinceLastOrder !== undefined ? item.daysSinceLastOrder : null,
              purchaseFrequencyMonthly: item.purchaseFrequencyMonthly || 0,
              returnRatePct: item.returnRatePct || 0,
              preferredCategories: Array.isArray(item.preferredCategories) ? item.preferredCategories : ['Leather Goods'],
              priceSensitivity: item.priceSensitivity || (item.totalSpent > 50000 ? 'Ultra-Luxury / Inelastic' : item.totalSpent > 15000 ? 'Premium Tier' : 'Standard Value'),
              addresses: Array.isArray(item.addresses) ? item.addresses : item.addressLine1 ? [{ line1: item.addressLine1, city: item.city || 'Dhaka', country: item.country || 'BD' }] : [],
              lastOrderAt: item.lastOrderAt || item.updatedAt || '',
              tags: Array.isArray(item.tags) ? item.tags : ['B2B', 'Retail'],
              categoryPreferences: Array.isArray(item.categoryPreferences) ? item.categoryPreferences : item.preferredCategories || ['Full-Grain Leather', 'Accessories'],
              notes: Array.isArray(item.notes) ? item.notes : [],
              communicationTimeline: Array.isArray(item.communicationTimeline) ? item.communicationTimeline : []
            };

            setCustomer(profile);

            if (Array.isArray(item.orders) && item.orders.length > 0) {
              setOrders(item.orders.slice(0, ORDERS_PER_PAGE).map((o: any) => ({
                id: o.id,
                orderNumber: o.orderNumber || `HH-${String(o.id).slice(-6).toUpperCase()}`,
                total: Number(o.total || 0),
                paymentStatus: o.paymentStatus || 'paid',
                fulfillmentStatus: o.fulfillmentStatus || 'fulfilled',
                createdAt: o.createdAt || new Date().toISOString(),
                lineItems: Array.isArray(o.lineItems) ? o.lineItems : []
              })));
              setHasMoreOrders(item.orders.length > ORDERS_PER_PAGE);
            }

            setLoadingProfile(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[Customer360] Server REST fetch fallback to Firestore:', err);
      }

      // 2. Secondary fallback: Direct Firestore query
      try {
        const db = getFirestore();
        const docRef = doc(db, 'customers', customerId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && isMounted) {
          const data = docSnap.data() as any;
          const phoneInfo = parseBangladeshPhone(data.phone || data.mobile || data.tel);
          const profile: CustomerProfile = {
            id: docSnap.id,
            name: data.name || data.companyName || 'Buyer',
            companyName: data.companyName || data.name || '',
            contactPerson: data.contactPerson || data.name || '',
            phone: phoneInfo.normalizedPhone || normalizeBangladeshPhone(data.phone || data.mobile || data.tel),
            normalizedPhone: phoneInfo.normalizedPhone || normalizeBangladeshPhone(data.phone || data.mobile || data.tel),
            rawPhone: phoneInfo.rawPhone || data.phone || '',
            firstOrderAt: data.firstOrderAt || '',
            completedOrdersCount: Number(data.completedOrdersCount ?? data.ordersCount ?? data.totalOrders ?? 0),
            email: data.email || '',
            country: data.country || 'BD',
            flag: data.flag || (data.country === 'BD' ? '🇧🇩' : '🌐'),
            totalOrders: Number(data.ordersCount ?? data.totalOrders ?? 0),
            ordersCount: Number(data.ordersCount ?? data.totalOrders ?? 0),
            totalSpent: Number(data.totalSpent || 0),
            aov: Math.round(Number(data.totalSpent || 0) / Math.max(1, Number(data.ordersCount ?? data.totalOrders ?? 1))),
            lifecycleStage: Number(data.totalSpent || 0) >= 50000 ? 'VIP' : Number(data.ordersCount || 0) >= 2 ? 'Repeat' : 'Active',
            segmentBadges: Number(data.totalSpent || 0) >= 50000 ? ['VIP Patron', 'Atelier Direct'] : ['Verified Buyer'],
            daysSinceLastOrder: null,
            purchaseFrequencyMonthly: 0.5,
            returnRatePct: 0,
            preferredCategories: ['Leather Goods', 'Accessories'],
            lastOrderAt: data.lastOrderAt || data.updatedAt || '',
            tags: Array.isArray(data.tags) ? data.tags : ['B2B', 'Retail'],
            categoryPreferences: Array.isArray(data.categoryPreferences)
              ? data.categoryPreferences
              : ['Full-Grain Leather', 'Accessories'],
            notes: Array.isArray(data.notes) ? data.notes : [],
            communicationTimeline: Array.isArray(data.communicationTimeline)
              ? data.communicationTimeline
              : []
          };
          setCustomer(profile);
        } else if (isMounted) {
          // Fallback to in-memory CustomersService or seed if Firestore offline
          if (typeof window !== 'undefined' && (window as any).CustomersService) {
            const mem = ((window as any).CustomersService._memCache || []).find((c: any) => c.id === customerId);
            if (mem) {
              const phoneInfo = parseBangladeshPhone(mem.phone);
              setCustomer({
                id: mem.id,
                name: mem.name || mem.companyName || 'Buyer',
                companyName: mem.companyName || mem.name || '',
                phone: phoneInfo.normalizedPhone || normalizeBangladeshPhone(mem.phone),
                normalizedPhone: phoneInfo.normalizedPhone || normalizeBangladeshPhone(mem.phone),
                rawPhone: phoneInfo.rawPhone || mem.phone || '',
                email: mem.email || '',
                country: mem.country || 'BD',
                totalOrders: Number(mem.ordersCount ?? mem.totalOrders ?? 0),
                totalSpent: Number(mem.totalSpent || 0),
                lastOrderAt: mem.lastOrderAt || '',
                tags: mem.tags || ['B2B'],
                categoryPreferences: ['Leather Goods'],
                notes: mem.notes || []
              });
            }
          }
        }

        // Fetch first 10 orders for customer using cursor limit
        await fetchCustomerOrders(customerId, null, 'first');
      } catch (err) {
        console.error('[Customer360] Failed to fetch customer profile:', err);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }

    loadCustomerData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, customerId]);

  // Server-side cursor query (limit 10, startAfter) for Orders timeline
  const fetchCustomerOrders = async (
    cId: string,
    cursor: DocumentSnapshot | null,
    direction: 'first' | 'next' | 'prev' = 'first'
  ) => {
    setLoadingOrders(true);
    try {
      const db = getFirestore();
      let q = query(
        collection(db, 'orders'),
        where('customerId', '==', cId),
        orderBy('createdAt', 'desc'),
        limit(ORDERS_PER_PAGE + 1)
      );

      if (cursor) {
        q = query(q, startAfter(cursor));
      }

      let snap = await getDocs(q);

      // Fallback query if customerId had no records but customer has email
      if (snap.empty && customer?.email) {
        let qEmail = query(
          collection(db, 'orders'),
          where('customerSnapshot.email', '==', customer.email),
          orderBy('createdAt', 'desc'),
          limit(ORDERS_PER_PAGE + 1)
        );
        if (cursor) qEmail = query(qEmail, startAfter(cursor));
        snap = await getDocs(qEmail);
      }

      const docs = snap.docs;
      const hasMore = docs.length > ORDERS_PER_PAGE;
      const pageDocs = hasMore ? docs.slice(0, ORDERS_PER_PAGE) : docs;

      const loadedOrders: CustomerOrderRecord[] = pageDocs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          orderNumber: data.orderNumber || `HH-${d.id.slice(-6).toUpperCase()}`,
          total: Number(data.total || 0),
          paymentStatus: data.paymentStatus || 'unpaid',
          fulfillmentStatus: data.fulfillmentStatus || 'unfulfilled',
          createdAt: data.createdAt || new Date().toISOString(),
          lineItems: Array.isArray(data.lineItems) ? data.lineItems : []
        };
      });

      setOrders(loadedOrders);
      setHasMoreOrders(hasMore);

      if (direction === 'next' && ordersCursor) {
        setOrdersCursorStack(prev => [...prev, ordersCursor]);
        setOrdersPage(p => p + 1);
      } else if (direction === 'prev') {
        setOrdersPage(p => Math.max(1, p - 1));
      } else if (direction === 'first') {
        setOrdersCursorStack([]);
        setOrdersPage(1);
      }

      setOrdersCursor(pageDocs[pageDocs.length - 1] || null);
    } catch (err) {
      console.warn('[Customer360] Fallback to OrdersService cache:', err);
      if (typeof window !== 'undefined' && (window as any).OrdersService) {
        const memOrders = ((window as any).OrdersService._memCache || []).filter(
          (o: any) => o.customerId === cId || o.customerSnapshot?.name === customer?.name
        );
        const startIndex = (ordersPage - 1) * ORDERS_PER_PAGE;
        const pageSlice = memOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
        setOrders(pageSlice);
        setHasMoreOrders(memOrders.length > startIndex + ORDERS_PER_PAGE);
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleNextOrdersPage = () => {
    if (!hasMoreOrders || loadingOrders || !ordersCursor || !customerId) return;
    fetchCustomerOrders(customerId, ordersCursor, 'next');
  };

  const handlePrevOrdersPage = () => {
    if (ordersPage <= 1 || loadingOrders || !customerId) return;
    const prevCursor = ordersCursorStack[ordersPage - 3] || null;
    fetchCustomerOrders(customerId, prevCursor, 'prev');
  };

  // Add instant memo / timeline note to customer document
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !customerId || addingNote) return;

    setAddingNote(true);
    const noteEntry = {
      id: `note-${Date.now()}`,
      text: newNote.trim(),
      type: 'note' as const,
      by: 'Nexus Operator',
      createdAt: new Date().toISOString(),
      at: new Date().toISOString()
    };

    try {
      // 1. Primary: REST API update
      fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: [noteEntry, ...(customer?.notes || [])]
        })
      }).catch(err => console.warn('[Customer360] Note REST update warning:', err));

      // 2. Secondary: Firestore update
      const db = getFirestore();
      const docRef = doc(db, 'customers', customerId);
      await updateDoc(docRef, {
        notes: arrayUnion(noteEntry),
        updatedAt: new Date().toISOString()
      });

      setCustomer(prev =>
        prev
          ? {
              ...prev,
              notes: [noteEntry, ...(prev.notes || [])]
            }
          : null
      );
      setNewNote('');
    } catch (err) {
      console.error('[Customer360] Failed to append note:', err);
      // Local optimistic update
      setCustomer(prev =>
        prev
          ? {
              ...prev,
              notes: [noteEntry, ...(prev.notes || [])]
            }
          : null
      );
      setNewNote('');
    } finally {
      setAddingNote(false);
    }
  };

  // Aggregate purchased SKUs across all loaded orders
  const aggregatedSkus = Array.from(
    new Set(
      orders.flatMap(o => (o.lineItems || []).map(li => li.sku || li.title).filter(Boolean))
    )
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm transition-opacity duration-300 font-mono">
      {/* Overlay Backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Slide-over Container */}
      <div className="relative w-full max-w-2xl bg-[#0d0d0c] border-l border-zinc-800 h-full flex flex-col shadow-2xl text-zinc-200 overflow-hidden">
        {/* Techno-Brutalist Drawer Header */}
        <div className="p-4 border-b border-zinc-800 bg-[#161615] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-amber-500 font-bold text-xs uppercase tracking-wider">
              CUSTOMER 360 & MEMORY LEDGER
            </span>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
              ID: {customerId?.slice(0, 10)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {customer && (
              <>
                <button
                  onClick={() => {
                    if (onOpenTechPackPO) {
                      onOpenTechPackPO(customer);
                    } else if ((window as any).openTechPackPOEngine) {
                      (window as any).openTechPackPOEngine(customer);
                    }
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 text-[11px] font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1.5 shadow"
                  title="Generate Parametric Tech Pack & PO for this customer"
                >
                  <span>📐</span>
                  <span>TECH PACK PO</span>
                </button>
                <button
                  onClick={() => onOpenQuickSale && onOpenQuickSale(customer)}
                  className="bg-[#c81d11] hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1.5 shadow"
                >
                  <span>⚡</span>
                  <span>QUICK SALE 2.0</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-1.5 rounded text-xs px-2.5 transition-all"
            >
              ✕ CLOSE
            </button>
          </div>
        </div>

        {loadingProfile && !customer ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-500 text-xs">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span>Resolving customer ledger from Firestore cursor…</span>
          </div>
        ) : customer ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Top Identity Hero Card */}
            <div className="p-4 bg-[#111110] border-b border-zinc-850">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <span>{customer.name}</span>
                      <span className="text-xs text-zinc-400">{customer.flag}</span>
                    </h2>
                  </div>

                  {customer.companyName && customer.companyName !== customer.name && (
                    <div className="text-xs text-amber-500/90 font-medium mt-0.5">
                      {customer.companyName}
                    </div>
                  )}

                  {/* Segment Badges: VIP Whale, Active Repeat, Dormant, Warm Lead */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {calculateCustomerSegmentBadges(customer).map(badge => {
                      const badgeStyles = {
                        amber: 'bg-amber-950/80 border-amber-800/80 text-amber-300',
                        emerald: 'bg-emerald-950/80 border-emerald-800/80 text-emerald-300',
                        coral: 'bg-rose-950/80 border-rose-800/80 text-rose-300',
                        zinc: 'bg-zinc-900 border-zinc-700 text-zinc-300'
                      }[badge.tone];

                      return (
                        <span
                          key={badge.label}
                          title={badge.description}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeStyles}`}
                        >
                          {badge.label === 'VIP Whale' && '👑 '}
                          {badge.label === 'Active Repeat' && '🔄 '}
                          {badge.label === 'Dormant' && '⏳ '}
                          {badge.label === 'Warm Lead' && '🌱 '}
                          {badge.label}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs">
                    {/* Canonical Phone Badge */}
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-emerald-400 font-mono">
                      <span>📞 Canonical:</span>
                      <span>{customer.normalizedPhone || customer.phone || 'None'}</span>
                      {(customer.normalizedPhone || customer.phone) && (
                        <button
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(customer.normalizedPhone || customer.phone!);
                            }
                          }}
                          title="Copy canonical phone"
                          className="ml-1 text-[10px] text-zinc-500 hover:text-zinc-200"
                        >
                          📋
                        </button>
                      )}
                    </div>

                    {/* Raw Phone Display */}
                    {customer.rawPhone && (
                      <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded font-mono text-[11px]">
                        Raw: {customer.rawPhone}
                      </span>
                    )}

                    {/* Location Badge */}
                    <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                      📍 {customer.addresses?.[0]?.city || (customer.country === 'BD' ? 'Dhaka, Bangladesh' : customer.country || 'Bangladesh')}
                    </span>

                    {customer.email && (
                      <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                        ✉️ {customer.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct WhatsApp Action Button */}
                {(customer.normalizedPhone || customer.phone) && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      onClick={() => {
                        const cleanDigits = (customer.normalizedPhone || customer.phone || '').replace(/[^0-9]/g, '');
                        if (onOpenWhatsApp) {
                          onOpenWhatsApp(customer.id, customer.normalizedPhone || customer.phone!);
                        } else if (cleanDigits) {
                          const greeting = `Hello ${customer.contactPerson || customer.name}, Hands & Head Nexus regarding your orders and bespoke leather catalog. How can we assist you today?`;
                          window.open(`https://wa.me/${cleanDigits}?text=${encodeURIComponent(greeting)}`, '_blank');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <span>📲</span>
                      <span>WhatsApp Direct</span>
                    </button>
                    <a
                      href={`https://wa.me/${(customer.normalizedPhone || customer.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${customer.contactPerson || customer.name}, Hands & Head Nexus desk here.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-zinc-500 hover:text-emerald-400 underline"
                    >
                      Open wa.me link ↗
                    </a>
                  </div>
                )}
              </div>

              {/* 5 Financial & Commerce Aggregates */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                <div className="bg-[#161615] border border-zinc-800 p-2.5 rounded">
                  <div className="text-[10px] text-zinc-500 uppercase">LIFETIME VALUE (LTV)</div>
                  <div className="text-base font-bold text-[#d4af37] mt-1 font-mono">
                    ৳{customer.totalSpent?.toLocaleString()}
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 p-2.5 rounded">
                  <div className="text-[10px] text-zinc-500 uppercase">COMPLETED ORDERS</div>
                  <div className="text-base font-bold text-white mt-1 font-mono">
                    {customer.completedOrdersCount ?? customer.ordersCount ?? customer.totalOrders ?? 0}
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 p-2.5 rounded">
                  <div className="text-[10px] text-zinc-500 uppercase">AVG ORDER VALUE (AOV)</div>
                  <div className="text-base font-bold text-zinc-300 mt-1 font-mono">
                    ৳
                    {customer.totalOrders && customer.totalOrders > 0
                      ? Math.round((customer.totalSpent || 0) / customer.totalOrders).toLocaleString()
                      : customer.aov || 0}
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 p-2.5 rounded">
                  <div className="text-[10px] text-zinc-500 uppercase">FIRST PURCHASE</div>
                  <div className="text-xs font-semibold text-zinc-300 mt-1 truncate">
                    {customer.firstOrderAt
                      ? new Date(customer.firstOrderAt).toLocaleDateString()
                      : (customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : 'None recorded')}
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 p-2.5 rounded col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-zinc-500 uppercase">LAST PURCHASE</div>
                  <div className="text-xs font-semibold text-zinc-300 mt-1 truncate">
                    {customer.lastOrderAt
                      ? new Date(customer.lastOrderAt).toLocaleDateString()
                      : 'No purchase yet'}
                  </div>
                </div>
              </div>

              {/* Tags, Cohorts & Operator Notes Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-zinc-800/80 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide mr-1">COHORTS:</span>
                  {(customer.tags || []).map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="text-zinc-500 text-[11px] flex items-center gap-1">
                  <span>📝</span>
                  <span>{customer.notes?.length || 0} Operator Memo(s)</span>
                </div>
              </div>
            </div>

            {/* Navigation Sub-Tabs */}
            <div className="flex border-b border-zinc-800 bg-[#141413] px-4 pt-2 gap-2 text-xs overflow-x-auto">
              <button
                onClick={() => setActiveTab('profile')}
                className={`pb-2 px-2.5 font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                👤 Profile & Preferences
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`pb-2 px-2.5 font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📦 Orders Ledger ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`pb-2 px-2.5 font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'timeline'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📡 Communication & Timeline ({customer.notes?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('behavioral')}
                className={`pb-2 px-2.5 font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'behavioral'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📊 Behavioral Metrics
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`pb-2 px-2.5 font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'products'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🏷️ SKUs ({aggregatedSkus.length})
              </button>
            </div>

            {/* Tab: Profile & Preferences */}
            {activeTab === 'profile' && (
              <div className="p-4 flex-1 flex flex-col space-y-4 text-xs">
                <div className="bg-[#161615] border border-zinc-800 rounded-lg p-3 space-y-2.5">
                  <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                    CONTACT & REACHABILITY
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500">CANONICAL BANGLADESH PHONE</div>
                      <div className="font-mono text-emerald-400 font-bold mt-0.5 flex items-center justify-between">
                        <span>{customer.phone || 'No phone recorded'}</span>
                        {customer.phone && (
                          <a
                            href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded hover:bg-emerald-900"
                          >
                            WhatsApp ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500">OFFICIAL EMAIL</div>
                      <div className="text-zinc-200 font-mono mt-0.5 truncate">{customer.email || 'None on file'}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 rounded-lg p-3 space-y-2.5">
                  <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                    COMMERCIAL & PRICE PROFILE
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500">PRICE SENSITIVITY TIER</div>
                      <div className="font-bold text-amber-400 mt-0.5">{customer.priceSensitivity || 'Standard Value'}</div>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500">LIFECYCLE STAGE</div>
                      <div className="font-bold text-emerald-400 mt-0.5">{customer.lifecycleStage || 'Active'}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                    PREFERRED PRODUCT CATEGORIES
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(customer.preferredCategories || customer.categoryPreferences || ['Leather Goods']).map((cat, idx) => (
                      <span
                        key={idx}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-2.5 py-1 rounded text-xs"
                      >
                        ✓ {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {customer.addresses && customer.addresses.length > 0 && (
                  <div className="bg-[#161615] border border-zinc-800 rounded-lg p-3 space-y-2">
                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                      DELIVERY ADDRESSES
                    </div>
                    <div className="space-y-1.5">
                      {customer.addresses.map((addr, idx) => (
                        <div key={idx} className="bg-zinc-900/80 p-2 rounded border border-zinc-800 text-zinc-300">
                          <div>{addr.line1}</div>
                          <div className="text-zinc-500 text-[11px]">{[addr.city, addr.postalCode, addr.country].filter(Boolean).join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Behavioral Metrics */}
            {activeTab === 'behavioral' && (
              <div className="p-4 flex-1 flex flex-col space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#161615] border border-zinc-800 p-3 rounded-lg">
                    <div className="text-[10px] text-zinc-500 uppercase">DAYS SINCE LAST ORDER</div>
                    <div className="text-2xl font-bold text-white font-mono mt-1">
                      {customer.daysSinceLastOrder !== null && customer.daysSinceLastOrder !== undefined
                        ? `${customer.daysSinceLastOrder} days`
                        : '—'}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">Recency velocity signal</div>
                  </div>

                  <div className="bg-[#161615] border border-zinc-800 p-3 rounded-lg">
                    <div className="text-[10px] text-zinc-500 uppercase">PURCHASE FREQUENCY</div>
                    <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                      {customer.purchaseFrequencyMonthly || 0} / mo
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">Historical ordering rhythm</div>
                  </div>

                  <div className="bg-[#161615] border border-zinc-800 p-3 rounded-lg">
                    <div className="text-[10px] text-zinc-500 uppercase">RETURN RATE</div>
                    <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                      {customer.returnRatePct || 0}%
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">Dispute / refund ratio</div>
                  </div>

                  <div className="bg-[#161615] border border-zinc-800 p-3 rounded-lg">
                    <div className="text-[10px] text-zinc-500 uppercase">AVERAGE BASKET (AOV)</div>
                    <div className="text-2xl font-bold text-[#d4af37] font-mono mt-1">
                      ৳{customer.aov?.toLocaleString() || '0'}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">Average cart ticket size</div>
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 p-3 rounded-lg space-y-2">
                  <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                    ATTRIBUTED SEGMENTS & BADGES
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(customer.segmentBadges || ['Active Patron']).map((b, idx) => (
                      <span
                        key={idx}
                        className="bg-amber-950/40 text-amber-400 border border-amber-800/80 px-2.5 py-1 rounded font-bold text-[11px]"
                      >
                        ★ {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 1: Timeline & Notes */}
            {activeTab === 'timeline' && (
              <div className="p-4 flex-1 flex flex-col space-y-4">
                {/* Note composer */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Add operator memory log, call note, or preference…"
                    className="flex-1 bg-[#161615] border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={addingNote || !newNote.trim()}
                    className="bg-[#c81d11] hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded transition-all"
                  >
                    {addingNote ? 'Saving…' : '+ Log Memo'}
                  </button>
                </form>

                {/* Notes & Events Timeline */}
                <div className="space-y-2">
                  {(!customer.notes || customer.notes.length === 0) && (
                    <div className="text-center py-6 text-zinc-500 text-xs">
                      No communication timeline entries yet. Add the first operator memo above.
                    </div>
                  )}

                  {(customer.notes || []).map((n, idx) => (
                    <div
                      key={n.id || idx}
                      className="p-3 bg-[#161615] border border-zinc-850 rounded-lg flex items-start gap-3 text-xs"
                    >
                      <span className="text-base">
                        {n.type === 'quicksale'
                          ? '⚡'
                          : n.type === 'techpack_po'
                          ? '📐'
                          : n.type === 'whatsapp'
                          ? '📲'
                          : '📝'}
                      </span>
                      <div className="flex-1">
                        <div className="text-zinc-200">{n.text}</div>
                        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2 font-mono">
                          <span>{n.by || 'Operator'}</span>
                          <span>•</span>
                          <span>
                            {n.createdAt || n.at
                              ? new Date(n.createdAt || n.at || '').toLocaleString()
                              : 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Orders Ledger with Limit 10 Server Cursor & Reorder Action */}
            {activeTab === 'orders' && (
              <div className="p-4 flex-1 flex flex-col">
                <div className="text-[11px] text-zinc-500 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Order timeline & items ledger</span>
                    <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      Limit 10 per page
                    </span>
                  </div>
                  <span className="text-amber-500 font-mono font-bold">
                    Page {ordersPage} {hasMoreOrders ? '(more available)' : ''}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {loadingOrders && orders.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span>Querying customer order collection…</span>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      No past orders recorded for this customer account.
                    </div>
                  ) : (
                    orders.map(o => (
                      <div
                        key={o.id}
                        className="p-3 bg-[#161615] border border-zinc-850 rounded-lg text-xs hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white font-mono">{o.orderNumber || o.id}</span>
                            <span
                              className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                o.paymentStatus === 'paid'
                                  ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                                  : 'bg-amber-950 border border-amber-800 text-amber-400'
                              }`}
                            >
                              {o.paymentStatus}
                            </span>
                            <span
                              className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                o.fulfillmentStatus === 'fulfilled'
                                  ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                                  : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
                              }`}
                            >
                              {o.fulfillmentStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-amber-400 font-mono text-sm">
                              ৳{o.total.toLocaleString()}
                            </div>
                            {/* Reorder Action */}
                            {onOpenQuickSale && customer && (
                              <button
                                onClick={() => {
                                  onOpenQuickSale({
                                    ...customer,
                                    tags: [...(customer.tags || []), 'REORDER']
                                  });
                                }}
                                title="Reorder items into Quick Sale 2.0 POS"
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded transition-all"
                              >
                                ⚡ REORDER
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] text-zinc-400 mt-1.5 flex items-center justify-between">
                          <span>📅 {new Date(o.createdAt).toLocaleString()}</span>
                          <span className="text-zinc-500">
                            {(o.lineItems || []).length} item(s)
                          </span>
                        </div>

                        {/* Item Summary preview */}
                        <div className="mt-2 pt-2 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                          {(o.lineItems || []).map((item, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300"
                            >
                              {item.title} ({item.quantity}x) {item.sku ? `· ${item.sku}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 10-Item Cursor Pagination Controls */}
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
                  <button
                    onClick={handlePrevOrdersPage}
                    disabled={ordersPage <= 1 || loadingOrders}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-800 py-2 rounded text-zinc-300 font-semibold transition-all text-center"
                  >
                    ← Previous 10
                  </button>

                  <div className="text-zinc-500 font-mono text-[11px] shrink-0">
                    Page {ordersPage}
                  </div>

                  <button
                    onClick={handleNextOrdersPage}
                    disabled={!hasMoreOrders || loadingOrders}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-800 py-2 rounded text-zinc-300 font-semibold transition-all text-center"
                  >
                    Next 10 →
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Purchased Product Codes (SKUs) */}
            {activeTab === 'products' && (
              <div className="p-4 flex-1">
                <div className="text-[11px] text-zinc-500 mb-3">
                  Aggregated SKUs and product codes purchased across all lifetime transactions:
                </div>

                {aggregatedSkus.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    No individual product codes tracked yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aggregatedSkus.map((sku, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#161615] border border-zinc-800 rounded flex items-center justify-between text-xs"
                      >
                        <div className="font-mono text-zinc-200 truncate">{sku}</div>
                        <span className="text-[10px] text-amber-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          VERIFIED
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
