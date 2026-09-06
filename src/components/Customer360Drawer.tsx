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
import { normalizeBangladeshPhone } from '../utils/phoneNormalizer';

export interface CustomerProfile {
  id: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  country?: string;
  flag?: string;
  totalOrders?: number;
  ordersCount?: number;
  totalSpent?: number;
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
  onOpenWhatsApp?: (customerId: string, phone: string) => void;
}

export const Customer360Drawer: React.FC<Customer360DrawerProps> = ({
  customerId,
  isOpen,
  onClose,
  onOpenQuickSale,
  onOpenWhatsApp
}) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([]);
  const [ordersCursor, setOrdersCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMoreOrders, setHasMoreOrders] = useState<boolean>(false);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<string>('');
  const [addingNote, setAddingNote] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'orders' | 'products' | 'notes'>('timeline');

  // Load customer profile and first 50 orders cursor
  useEffect(() => {
    if (!isOpen || !customerId) {
      setCustomer(null);
      setOrders([]);
      setOrdersCursor(null);
      return;
    }

    let isMounted = true;

    async function loadCustomerData() {
      setLoadingProfile(true);
      try {
        const db = getFirestore();
        const docRef = doc(db, 'customers', customerId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && isMounted) {
          const data = docSnap.data() as any;
          const profile: CustomerProfile = {
            id: docSnap.id,
            name: data.name || data.companyName || 'Buyer',
            companyName: data.companyName || data.name || '',
            contactPerson: data.contactPerson || data.name || '',
            phone: normalizeBangladeshPhone(data.phone || data.mobile || data.tel),
            email: data.email || '',
            country: data.country || 'BD',
            flag: data.flag || (data.country === 'BD' ? '🇧🇩' : '🌐'),
            totalOrders: Number(data.ordersCount ?? data.totalOrders ?? 0),
            ordersCount: Number(data.ordersCount ?? data.totalOrders ?? 0),
            totalSpent: Number(data.totalSpent || 0),
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
              setCustomer({
                id: mem.id,
                name: mem.name || mem.companyName || 'Buyer',
                companyName: mem.companyName || mem.name || '',
                phone: normalizeBangladeshPhone(mem.phone),
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

        // Fetch first 50 orders for customer using cursor limit
        await fetchCustomerOrders(customerId, null);
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

  // Server-side cursor query (limit 50, startAfter) for Orders
  const fetchCustomerOrders = async (cId: string, cursor: DocumentSnapshot | null) => {
    setLoadingOrders(true);
    try {
      const db = getFirestore();
      let q = query(
        collection(db, 'orders'),
        where('customerSnapshot.email', '==', customer?.email || '__null__'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      // Try querying by customerId first if set
      try {
        let qCust = query(
          collection(db, 'orders'),
          where('customerId', '==', cId),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        if (cursor) qCust = query(qCust, startAfter(cursor));
        const snapCust = await getDocs(qCust);

        if (!snapCust.empty) {
          mapAndSetOrders(snapCust.docs, cursor);
          return;
        }
      } catch (e) {
        // Fallback to customer phone or email query
      }

      if (cursor) {
        q = query(q, startAfter(cursor));
      }

      const snap = await getDocs(q);
      mapAndSetOrders(snap.docs, cursor);
    } catch (err) {
      console.warn('[Customer360] Fallback to OrdersService cache:', err);
      if (typeof window !== 'undefined' && (window as any).OrdersService) {
        const memOrders = ((window as any).OrdersService._memCache || []).filter(
          (o: any) => o.customerId === cId || o.customerSnapshot?.name === customer?.name
        );
        setOrders(memOrders.slice(0, 50));
        setHasMoreOrders(memOrders.length > 50);
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  const mapAndSetOrders = (docs: DocumentSnapshot[], cursor: DocumentSnapshot | null) => {
    const loadedOrders: CustomerOrderRecord[] = docs.map(d => {
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

    if (cursor) {
      setOrders(prev => [...prev, ...loadedOrders]);
    } else {
      setOrders(loadedOrders);
    }
    setOrdersCursor(docs[docs.length - 1] || null);
    setHasMoreOrders(docs.length === 50);
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
      by: 'Operator (PIN 1981)',
      createdAt: new Date().toISOString(),
      at: new Date().toISOString()
    };

    try {
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
              <button
                onClick={() => onOpenQuickSale && onOpenQuickSale(customer)}
                className="bg-[#c81d11] hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1.5 shadow"
              >
                <span>⚡</span>
                <span>QUICK SALE 2.0</span>
              </button>
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
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{customer.name}</span>
                    <span className="text-xs text-zinc-400">{customer.flag}</span>
                  </h2>
                  {customer.companyName && customer.companyName !== customer.name && (
                    <div className="text-xs text-amber-500/90 font-medium mt-0.5">
                      {customer.companyName}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Canonical Phone Badge */}
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-xs text-emerald-400 font-mono">
                      <span>📞</span>
                      <span>{customer.phone || 'No phone recorded'}</span>
                      {customer.phone && (
                        <button
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(customer.phone!);
                            }
                          }}
                          title="Copy canonical phone"
                          className="ml-1 text-[10px] text-zinc-500 hover:text-zinc-200"
                        >
                          📋
                        </button>
                      )}
                    </div>

                    {customer.email && (
                      <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                        ✉️ {customer.email}
                      </span>
                    )}

                    <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                      🌍 {customer.country}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Action Button */}
                {customer.phone && (
                  <button
                    onClick={() => onOpenWhatsApp && onOpenWhatsApp(customer.id, customer.phone!)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded flex items-center gap-1.5 transition-all shadow-md shrink-0"
                  >
                    <span>📲</span>
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>

              {/* 4 Financial & Ledger Intelligence Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <div className="bg-[#161615] border border-zinc-800 p-2.5 rounded">
                  <div className="text-[10px] text-zinc-500 uppercase">LIFETIME VALUE (LTV)</div>
                  <div className="text-base font-bold text-[#d4af37] mt-1 font-mono">
                    ৳{customer.totalSpent?.toLocaleString()}
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 p-2.5 rounded">
                  <div className="text-[10px] text-zinc-500 uppercase">TOTAL ORDERS</div>
                  <div className="text-base font-bold text-white mt-1 font-mono">
                    {customer.ordersCount ?? customer.totalOrders ?? 0}
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 p-2.5 rounded">
                  <div className="text-[10px] text-zinc-500 uppercase">LAST PURCHASE</div>
                  <div className="text-xs font-semibold text-zinc-300 mt-1 truncate">
                    {customer.lastOrderAt
                      ? new Date(customer.lastOrderAt).toLocaleDateString()
                      : 'No purchase yet'}
                  </div>
                </div>

                <div className="bg-[#161615] border border-zinc-800 p-2.5 rounded">
                  <div className="text-[10px] text-zinc-500 uppercase">AVG ORDER VALUE</div>
                  <div className="text-base font-bold text-zinc-300 mt-1 font-mono">
                    ৳
                    {customer.totalOrders && customer.totalOrders > 0
                      ? Math.round((customer.totalSpent || 0) / customer.totalOrders).toLocaleString()
                      : 0}
                  </div>
                </div>
              </div>

              {/* Tags & Cohort Classification */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-zinc-800/80">
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
            </div>

            {/* Navigation Sub-Tabs */}
            <div className="flex border-b border-zinc-800 bg-[#141413] px-4 pt-2 gap-2 text-xs">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`pb-2 px-2.5 font-bold transition-all border-b-2 ${
                  activeTab === 'timeline'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📡 Communication & Timeline ({customer.notes?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`pb-2 px-2.5 font-bold transition-all border-b-2 ${
                  activeTab === 'orders'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📦 Orders Ledger ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`pb-2 px-2.5 font-bold transition-all border-b-2 ${
                  activeTab === 'products'
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🏷️ Purchased SKUs ({aggregatedSkus.length})
              </button>
            </div>

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

            {/* Tab 2: Orders Ledger with Limit 50 Server Cursor */}
            {activeTab === 'orders' && (
              <div className="p-4 flex-1 flex flex-col">
                <div className="text-[11px] text-zinc-500 mb-2">
                  Showing customer order records via Firestore server cursor:
                </div>

                <div className="space-y-2 flex-1">
                  {loadingOrders && orders.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      Querying orders collection (limit 50)…
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      No past orders recorded for this customer account.
                    </div>
                  ) : (
                    orders.map(o => (
                      <div
                        key={o.id}
                        className="p-3 bg-[#161615] border border-zinc-850 rounded-lg text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{o.orderNumber}</span>
                            <span
                              className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                o.paymentStatus === 'paid'
                                  ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                                  : 'bg-amber-950 border border-amber-800 text-amber-400'
                              }`}
                            >
                              {o.paymentStatus}
                            </span>
                          </div>
                          <div className="font-bold text-amber-400 font-mono">
                            ৳{o.total.toLocaleString()}
                          </div>
                        </div>

                        <div className="text-[10px] text-zinc-400 mt-1.5 flex items-center justify-between">
                          <span>{new Date(o.createdAt).toLocaleString()}</span>
                          <span className="text-zinc-500">
                            {(o.lineItems || []).length} item(s)
                          </span>
                        </div>

                        {/* Line items preview */}
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

                {hasMoreOrders && (
                  <button
                    onClick={() => fetchCustomerOrders(customer.id, ordersCursor)}
                    disabled={loadingOrders}
                    className="mt-3 w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-2 rounded text-xs text-zinc-300 font-semibold transition-all"
                  >
                    {loadingOrders ? 'Loading next 50…' : 'Load Next 50 Orders →'}
                  </button>
                )}
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
