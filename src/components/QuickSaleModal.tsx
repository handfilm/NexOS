import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  writeBatch,
  doc,
  collection,
  query,
  limit,
  orderBy,
  getDocs,
  increment,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { normalizeBangladeshPhone } from '../utils/phoneNormalizer';

export interface QuickSaleProduct {
  id: string;
  title: string;
  price: number;
  sku: string;
  variants: Array<{
    id: string;
    title: string;
    sku: string;
    price: number;
    inventoryQty?: number;
  }>;
}

export interface QuickSaleCustomer {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  country?: string;
  totalSpent?: number;
  ordersCount?: number;
}

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCustomer?: QuickSaleCustomer | null;
  onSuccess?: (orderRecord: any) => void;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  onClose,
  preSelectedCustomer,
  onSuccess
}) => {
  // Customer Selection State
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customerList, setCustomerList] = useState<QuickSaleCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<QuickSaleCustomer | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // Product Selection State
  const [productList, setProductList] = useState<QuickSaleProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<QuickSaleProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  // Payment Mode & Order Details
  const [paymentMode, setPaymentMode] = useState<'Paid' | 'COD' | 'bKash' | 'Net30'>('Paid');
  const [orderNotes, setOrderNotes] = useState<string>('Quick Sale POS attribution');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Initialize selected customer if passed in props
  useEffect(() => {
    if (preSelectedCustomer) {
      setSelectedCustomer(preSelectedCustomer);
      setCustomerSearch(preSelectedCustomer.name || preSelectedCustomer.companyName || '');
    }
  }, [preSelectedCustomer]);

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setCompletedOrder(null);
      setStatusMessage(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Load initial customer & product lists with server-side limit 50
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadData() {
      setLoadingCustomers(true);
      setLoadingProducts(true);

      try {
        const db = getFirestore();

        // 1. Fetch Customers (Limit 50)
        const custSnap = await getDocs(
          query(collection(db, 'customers'), orderBy('updatedAt', 'desc'), limit(50))
        );
        if (isMounted) {
          const custs: QuickSaleCustomer[] = custSnap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || data.companyName || 'Buyer',
              companyName: data.companyName || data.name || '',
              phone: normalizeBangladeshPhone(data.phone || data.mobile),
              email: data.email || '',
              country: data.country || 'BD',
              totalSpent: Number(data.totalSpent || 0),
              ordersCount: Number(data.ordersCount ?? data.totalOrders ?? 0)
            };
          });
          setCustomerList(custs);
          if (!selectedCustomer && custs.length > 0 && !preSelectedCustomer) {
            setSelectedCustomer(custs[0]);
          }
        }

        // 2. Fetch Products (Limit 50)
        const prodSnap = await getDocs(
          query(collection(db, 'products'), orderBy('updatedAt', 'desc'), limit(50))
        );
        if (isMounted) {
          const prods: QuickSaleProduct[] = prodSnap.docs.map(d => {
            const data = d.data();
            const variants = Array.isArray(data.variants) && data.variants.length > 0
              ? data.variants
              : [{ id: 'v-default', title: 'Default', sku: data.sku || 'SKU-001', price: data.pricing?.price || data.price || 0 }];

            return {
              id: d.id,
              title: data.title || 'Leather Goods Item',
              price: Number(data.pricing?.price || data.price || 0),
              sku: data.sku || variants[0]?.sku || 'HH-SKU',
              variants: variants
            };
          });
          setProductList(prods);
          if (prods.length > 0) {
            setSelectedProduct(prods[0]);
            setSelectedVariantId(prods[0].variants[0]?.id || '');
            setCustomPrice(prods[0].variants[0]?.price || prods[0].price);
          }
        }
      } catch (err) {
        console.warn('[QuickSale] Fallback to in-memory Services cache:', err);
        // Fallback to window.ProductsService & CustomersService
        if (typeof window !== 'undefined') {
          const prodsMem = (window as any).ProductsService?._memCache || [];
          const custsMem = (window as any).CustomersService?._memCache || [];
          if (custsMem.length) {
            setCustomerList(
              custsMem.slice(0, 50).map((c: any) => ({
                id: c.id,
                name: c.name || c.companyName || 'Buyer',
                phone: normalizeBangladeshPhone(c.phone),
                totalSpent: Number(c.totalSpent || 0),
                ordersCount: Number(c.ordersCount ?? c.totalOrders ?? 0)
              }))
            );
          }
          if (prodsMem.length) {
            const pMap = prodsMem.slice(0, 50).map((p: any) => ({
              id: p.id,
              title: p.title,
              price: p.pricing?.price || 0,
              sku: p.variants?.[0]?.sku || 'SKU',
              variants: p.variants || [{ id: 'v1', title: 'Standard', price: p.pricing?.price || 0, sku: 'SKU' }]
            }));
            setProductList(pMap);
            if (pMap.length) {
              setSelectedProduct(pMap[0]);
              setSelectedVariantId(pMap[0].variants[0]?.id || '');
              setCustomPrice(pMap[0].variants[0]?.price || pMap[0].price);
            }
          }
        }
      } finally {
        if (isMounted) {
          setLoadingCustomers(false);
          setLoadingProducts(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, preSelectedCustomer]);

  // When product or variant changes, update unit price
  const handleProductChange = (prodId: string) => {
    const p = productList.find(item => item.id === prodId);
    if (!p) return;
    setSelectedProduct(p);
    const vId = p.variants[0]?.id || '';
    setSelectedVariantId(vId);
    const v = p.variants.find(item => item.id === vId);
    setCustomPrice(v?.price || p.price);
  };

  const handleVariantChange = (vId: string) => {
    setSelectedVariantId(vId);
    if (selectedProduct) {
      const v = selectedProduct.variants.find(item => item.id === vId);
      if (v) setCustomPrice(v.price);
    }
  };

  // Grand Total Calculation
  const orderTotal = Math.max(0, customPrice * quantity);

  // Filtered customer search
  const filteredCustomers = customerList.filter(c => {
    if (!customerSearch) return true;
    const s = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      (c.companyName && c.companyName.toLowerCase().includes(s)) ||
      c.phone.includes(s)
    );
  });

  // Atomic POS write to Firestore via writeBatch
  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedProduct || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage('Executing atomic POS transaction…');

    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      const timestamp = new Date().toISOString();
      const orderRef = doc(collection(db, 'orders'));
      const customerRef = doc(db, 'customers', selectedCustomer.id);

      const currentVariant =
        selectedProduct.variants.find(v => v.id === selectedVariantId) ||
        selectedProduct.variants[0];

      const orderNumber = `HH-QS-${Math.floor(100000 + Math.random() * 900000)}`;

      const orderRecord = {
        id: orderRef.id,
        orderNumber: orderNumber,
        customerId: selectedCustomer.id,
        customerSnapshot: {
          id: selectedCustomer.id,
          name: selectedCustomer.name,
          companyName: selectedCustomer.companyName || selectedCustomer.name,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email || '',
          country: selectedCustomer.country || 'BD'
        },
        lineItems: [
          {
            productId: selectedProduct.id,
            title: selectedProduct.title,
            sku: currentVariant?.sku || selectedProduct.sku,
            variantId: selectedVariantId,
            variantTitle: currentVariant?.title || 'Standard',
            price: customPrice,
            quantity: quantity,
            lineTotal: orderTotal
          }
        ],
        subtotal: orderTotal,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: 0,
        total: orderTotal,
        paymentMode: paymentMode,
        paymentStatus: paymentMode === 'Paid' ? 'paid' : 'pending',
        fulfillmentStatus: 'fulfilled',
        status: 'completed',
        source: 'Quick Sale 2.0 POS',
        createdAt: timestamp,
        updatedAt: timestamp,
        timeline: [
          {
            event: 'Instant Quick Sale 2.0 POS Created',
            at: timestamp,
            by: 'Nexus Operator',
            notes: orderNotes
          }
        ]
      };

      // 1. Create order document in batch
      batch.set(orderRef, orderRecord);

      // 2. Decrement inventory from product catalog atomically
      if (selectedProduct.id) {
        try {
          const productRef = doc(db, 'products', selectedProduct.id);
          batch.update(productRef, {
            totalInventory: increment(-quantity),
            updatedAt: timestamp
          });
        } catch (invErr) {
          console.warn('[QuickSale] Non-fatal product inventory update note:', invErr);
        }
      }

      // 3. Increment Customer's ordersCount, totalOrders, and totalSpent atomically
      // 4. Add purchase record to Customer 360 timeline
      const timelineMemo = {
        id: `qs-${Date.now()}`,
        text: `⚡ Quick Sale 2.0: ${selectedProduct.title} (${quantity}x) — ৳${orderTotal.toLocaleString()} [${paymentMode}]`,
        type: 'quicksale' as const,
        by: 'Operator POS',
        createdAt: timestamp,
        at: timestamp,
        orderId: orderRef.id,
        orderNumber: orderNumber,
        total: orderTotal
      };

      batch.update(customerRef, {
        ordersCount: increment(1),
        totalOrders: increment(1),
        totalSpent: increment(orderTotal),
        lastOrderAt: timestamp,
        updatedAt: timestamp,
        notes: arrayUnion(timelineMemo)
      });

      // 5. Commit atomic batch
      await batch.commit();

      // 6. Non-blocking server cache synchronization
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderRecord)
      }).catch(err => console.warn('[QuickSale] Server sync notice:', err));

      setStatusMessage('Order attributed! Attributed to Customer 360 ledger.');
      setCompletedOrder(orderRecord);

      if (onSuccess) {
        onSuccess(orderRecord);
      }
      setIsProcessing(false);
    } catch (err: any) {
      console.error('[QuickSale] Atomic transaction failure:', err);
      setStatusMessage(`Transaction error: ${err?.message || 'Check Firestore permissions'}`);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-mono text-[#1e293b]">
      {/* Container Card */}
      <div className="relative w-full max-w-xl bg-white/95 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-[4px_4px_30px_rgba(166,180,200,0.4),-4px_-4px_30px_#ffffff] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-4 bg-white/90 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c81d11] animate-pulse" />
            <span className="text-[#1e293b] font-bold text-xs uppercase tracking-wider">
              QUICK SALE 2.0 · INSTANT POS ATTRIBUTION
            </span>
            <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-md">
              ATOMIC FIRESTORE
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#1e293b] bg-slate-100 hover:bg-slate-200 border border-slate-200 p-1 px-2.5 rounded-xl text-xs font-semibold"
          >
            ✕
          </button>
        </div>

        {statusMessage && !completedOrder && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 flex items-center gap-2 font-medium">
            <span className="animate-spin">●</span>
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Post-Sale Receipt & Attribution Confirmation */}
        {completedOrder ? (
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-2xl text-emerald-700">
              ✓
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-700 font-bold">
                TRANSACTION ATOMICALLY COMMITTED
              </div>
              <h3 className="text-xl font-bold text-[#1e293b] font-mono mt-1">
                {completedOrder.orderNumber}
              </h3>
              <p className="text-xs text-[#64748b] mt-1">
                Attributed to <span className="text-[#1e293b] font-bold">{completedOrder.customerSnapshot?.name}</span> · ৳{completedOrder.total?.toLocaleString()}
              </p>
            </div>

            {/* Receipt Details Box */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-left font-mono text-xs space-y-1.5 text-[#334155]">
              <div className="flex justify-between text-[#64748b] text-[10px]">
                <span>ITEM</span>
                <span>QTY · PRICE</span>
              </div>
              <div className="flex justify-between font-bold text-[#1e293b]">
                <span>{completedOrder.lineItems?.[0]?.title}</span>
                <span>{completedOrder.lineItems?.[0]?.quantity}x · ৳{completedOrder.total?.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] flex justify-between text-[#64748b]">
                <span>Payment Mode:</span>
                <span className="text-emerald-700 font-bold">{completedOrder.paymentMode}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#64748b]">
                <span>Customer Phone:</span>
                <span className="text-[#1e293b] font-semibold">{completedOrder.customerSnapshot?.phone}</span>
              </div>
            </div>

            {/* Actions: Dispatch WhatsApp Receipt & Close */}
            <div className="w-full space-y-2 pt-2">
              {completedOrder.customerSnapshot?.phone && (
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = (completedOrder.customerSnapshot?.phone || '').replace(/[^0-9]/g, '');
                    const itemTitle = completedOrder.lineItems?.[0]?.title || 'Bespoke Item';
                    const qty = completedOrder.lineItems?.[0]?.quantity || 1;
                    const price = completedOrder.total || 0;
                    const receiptMsg =
                      `*HANDS & HEAD NEXUS · ORDER RECEIPT*\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `Invoice / Order: ${completedOrder.orderNumber}\n` +
                      `Customer: ${completedOrder.customerSnapshot?.name || 'Valued Client'}\n` +
                      `Item: ${itemTitle} (${qty}x)\n` +
                      `Amount: ৳${price.toLocaleString()} [${completedOrder.paymentMode || 'Paid'}]\n` +
                      `Status: ${completedOrder.fulfillmentStatus || 'Fulfilled'}\n` +
                      `Date: ${new Date(completedOrder.createdAt).toLocaleDateString()}\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `Thank you for your patronage with Hands & Head Atelier.`;
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(receiptMsg)}`, '_blank');
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>📲</span>
                  <span>Dispatch WhatsApp Receipt to Customer</span>
                </button>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null);
                    setStatusMessage(null);
                  }}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-2 rounded text-xs font-semibold transition-all"
                >
                  + New Quick Sale
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded text-xs font-semibold transition-all"
                >
                  Done & Return to Nexus
                </button>
              </div>
            </div>
          </div>
        ) : (
        /* Form Body */
        <form onSubmit={handleProcessSale} className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* 1. Customer Selection */}
          <div className="bg-[#161615] border border-zinc-800 p-3.5 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                1. Select Attributed Customer
              </label>
              <span className="text-[10px] text-zinc-500">limit(50) Server Cursor</span>
            </div>

            <input
              type="text"
              placeholder="Search by name, company, or canonical phone (+88017…)…"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />

            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {filteredCustomers.slice(0, 15).map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`p-2 rounded border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    selectedCustomer?.id === c.id
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <div className="truncate max-w-[240px]">
                    <span className="font-bold text-zinc-200">{c.name}</span>
                    {c.companyName && (
                      <span className="text-zinc-500 text-[10px] ml-1">({c.companyName})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-emerald-400">{c.phone}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-amber-400 font-bold">
                      ৳{c.totalSpent?.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Product & Variant Selection */}
          <div className="bg-[#161615] border border-zinc-800 p-3.5 rounded-lg space-y-3">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              2. Select Product & Variant
            </label>

            <div>
              <label className="text-[10px] uppercase text-zinc-400 block mb-1">
                Catalog Item
              </label>
              <select
                value={selectedProduct?.id || ''}
                onChange={e => handleProductChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {productList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} (৳{p.price.toLocaleString()}) · {p.sku}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && selectedProduct.variants.length > 0 && (
              <div>
                <label className="text-[10px] uppercase text-zinc-400 block mb-1">
                  Style / Color Variant
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedProduct.variants.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleVariantChange(v.id)}
                      className={`p-2 rounded border text-xs text-left transition-all ${
                        selectedVariantId === v.id
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="truncate">{v.title}</div>
                      <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                        ৳{v.price.toLocaleString()} · {v.sku}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Custom Price */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] uppercase text-zinc-400 block mb-1">
                  Quantity
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 bg-zinc-900 border border-zinc-800 text-white rounded text-sm hover:bg-zinc-800"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded h-8 text-center text-xs text-white font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 bg-zinc-900 border border-zinc-800 text-white rounded text-sm hover:bg-zinc-800"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-zinc-400 block mb-1">
                  Unit Price (৳ BDT)
                </label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={e => setCustomPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded h-8 px-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Payment Mode & Notes */}
          <div className="bg-[#161615] border border-zinc-800 p-3.5 rounded-lg space-y-3">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              3. Payment Terms & Attribution Mode
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'Paid', label: '💳 Paid', desc: 'Direct' },
                { id: 'COD', label: '🚚 COD', desc: 'On Delivery' },
                { id: 'bKash', label: '📱 bKash', desc: 'Mobile' },
                { id: 'Net30', label: '📄 Net 30', desc: 'B2B Terms' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMode(m.id as any)}
                  className={`p-2 rounded border text-center transition-all ${
                    paymentMode === m.id
                      ? 'bg-[#c81d11] border-red-700 text-white font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs">{m.label}</div>
                  <div className="text-[9px] opacity-75">{m.desc}</div>
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] uppercase text-zinc-400 block mb-1">
                POS Note / Tracking Memo
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder="e.g. In-store atelier sample order, expedited courier"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200"
              />
            </div>
          </div>

          {/* Total & Attribution Summary Banner */}
          <div className="bg-[#111110] border border-zinc-800 p-3.5 rounded-lg flex items-center justify-between font-mono">
            <div>
              <div className="text-[10px] uppercase text-zinc-500">Atomic Attribution Total</div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Increments customer LTV & records to memory
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#d4af37]">
                ৳{orderTotal.toLocaleString()}
              </div>
              <div className="text-[10px] text-zinc-500">
                {quantity} item(s) · {paymentMode}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isProcessing || !selectedCustomer || !selectedProduct}
            className="w-full bg-[#c81d11] hover:bg-red-700 disabled:opacity-40 text-white font-bold py-3 rounded text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <span>⚡</span>
            <span>
              {isProcessing
                ? 'Processing Atomic Firestore Write…'
                : `SUBMIT QUICK SALE (৳${orderTotal.toLocaleString()}) →`}
            </span>
          </button>
        </form>
        )}
      </div>
    </div>
  );
};
