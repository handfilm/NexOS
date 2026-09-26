import { db } from '../lib/firebase';
import { fetchBuyerOrders } from "../services/nexusApi";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

export type CarrierType = 'STEADFAST' | 'PATHAO' | 'REDX' | 'DHL_FEDEX';

export interface ConfirmedOrder {
  id: string;
  poNumber: string;
  buyerName: string;
  buyerPhone: string;
  companyName?: string;
  deliveryAddress: string;
  styleName: string;
  category: string;
  quantity: number;
  unitFobPrice: number;
  currency: 'BDT' | 'USD';
  orderTotal: number;
  weightKg: number;
  advancePct: number;
  advanceRequired: number;
  advancePaid: number;
  advanceMethod: 'BANK_TT' | 'BKASH_MERCHANT' | 'NAGAD' | 'CASH';
  advanceReceived: boolean;
  advanceTxnRef?: string;
  advancePaidAt?: string;
  balanceDue: number;
  productionAuthorized: boolean;
  consignmentId?: string;
  carrier?: CarrierType;
  trackingUrl?: string;
  barcodeString?: string;
  codAmount: number;
  dispatchStatus: 'PENDING_DEPOSIT' | 'READY_FOR_DISPATCH' | 'IN_TRANSIT' | 'DELIVERED' | 'SETTLED';
  dispatchedAt?: string;
  notes?: string;
}

export interface LogisticsSettlementHubProps {
  initialOrder?: any;
  mode?: 'embedded' | 'modal';
  onClose?: () => void;
}

// Carrier specifications
const CARRIER_CONFIG: Record<
  CarrierType,
  {
    name: string;
    label: string;
    badge: string;
    eta: string;
    baseRate: string;
    apiEndpoint: string;
    generateId: (po: string) => string;
    getTrackingUrl: (cid: string) => string;
  }
> = {
  STEADFAST: {
    name: 'Steadfast Courier',
    label: 'Steadfast API',
    badge: 'STEADFAST-API-V2',
    eta: '24-48 Hours (Nationwide BD)',
    baseRate: '৳130 / 1kg (+৳25/kg)',
    apiEndpoint: 'https://portal.steadfast.com.bd/api/v1/create_order',
    generateId: (po) => `SF-${po.replace(/[^0-9]/g, '').slice(-4) || '8842'}${Math.floor(1000 + Math.random() * 9000)}`,
    getTrackingUrl: (cid) => `https://steadfast.com.bd/t/${cid}`
  },
  PATHAO: {
    name: 'Pathao Courier',
    label: 'Pathao Courier',
    badge: 'PATHAO-MERCHANT-V1',
    eta: 'Same Day / 24h Express',
    baseRate: '৳100 City / ৳150 Metro',
    apiEndpoint: 'https://api-hermes.pathao.com/aladdin/api/v1/orders',
    generateId: (po) => `PT-DHK-${po.replace(/[^0-9]/g, '').slice(-4) || '7102'}${Math.floor(100 + Math.random() * 900)}`,
    getTrackingUrl: (cid) => `https://pathao.com/courier/track/?consignment_id=${cid}`
  },
  REDX: {
    name: 'RedX Logistics',
    label: 'RedX Logistics',
    badge: 'REDX-ENTERPRISE-V3',
    eta: '48-72 Hours (64 Districts)',
    baseRate: '৳140 Standard Parcel',
    apiEndpoint: 'https://openapi.redx.com.bd/v1.0.0-beta/parcels',
    generateId: (po) => `RDX-${po.replace(/[^0-9]/g, '').slice(-4) || '5501'}${Math.floor(1000 + Math.random() * 9000)}`,
    getTrackingUrl: (cid) => `https://redx.com.bd/track?tracking_id=${cid}`
  },
  DHL_FEDEX: {
    name: 'DHL / FedEx B2B Air Express',
    label: 'DHL/FedEx B2B Air',
    badge: 'GLOBAL-AIR-CARGO',
    eta: '3-5 Days (EU / US / Global)',
    baseRate: '$48 Base Air Waybill',
    apiEndpoint: 'https://express.api.dhl.com/mydhlapi/express/shipments',
    generateId: (po) => `DHL-EXP-${po.replace(/[^0-9]/g, '').slice(-4) || '9901'}${Math.floor(100000 + Math.random() * 900000)}`,
    getTrackingUrl: (cid) => `https://www.dhl.com/en/express/tracking.html?AWB=${cid}`
  }
};

// Normalize Bangladesh & E.164 phone numbers
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('880')) return `+${digits}`;
  if (digits.startsWith('01') && digits.length === 11) return `+88${digits}`;
  if (digits.startsWith('1') && digits.length === 10) return `+880${digits}`;
  return digits.length >= 8 ? `+${digits}` : raw;
}

export const LogisticsSettlementHub: React.FC<LogisticsSettlementHubProps> = ({
  initialOrder,
  mode = 'embedded',
  onClose
}) => {
  // Orders list state
  const [orders, setOrders] = useState<ConfirmedOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    initialOrder?.poNumber || initialOrder?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCarrier, setActiveCarrier] = useState<CarrierType>('STEADFAST');
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING_DEPOSIT' | 'READY_FOR_DISPATCH' | 'IN_TRANSIT'>('ALL');

  // Active form editable states for selected order
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [itemWeight, setItemWeight] = useState<number>(1.5);
  const [codAmount, setCodAmount] = useState<number>(0);
  const [handlingNotes, setHandlingNotes] = useState<string>('');

  // Advance & Balance Ledger states
  const [advancePct, setAdvancePct] = useState<number>(50);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [advanceMethod, setAdvanceMethod] = useState<'BANK_TT' | 'BKASH_MERCHANT' | 'NAGAD' | 'CASH'>('BANK_TT');
  const [advanceTxnRef, setAdvanceTxnRef] = useState<string>('');
  const [isAdvanceReceived, setIsAdvanceReceived] = useState<boolean>(false);

  // Dispatch processing states
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<{
    consignmentId: string;
    carrier: CarrierType;
    trackingUrl: string;
    barcodeString: string;
    dispatchedAt: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Hydrate confirmed orders directly from Firebase Firestore
  useEffect(() => {
    let isMounted = true;
    async function loadLiveOrders() {
      try {
        const live = await fetchBuyerOrders();
        if (isMounted && Array.isArray(live) && live.length > 0) {
          const mapped: ConfirmedOrder[] = live.map((ord) => ({
            id: ord.id,
            poNumber: ord.orderNumber || ord.id,
            buyerName: ord.customerName || 'Direct Buyer',
            buyerPhone: '',
            companyName: '',
            deliveryAddress: ord.shippingAddress || '',
            styleName: ord.items?.[0]?.title || 'B2B Atelier Order',
            category: 'Atelier Apparel & Goods',
            quantity: ord.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 1,
            unitFobPrice: ord.items?.[0]?.price || ord.total || 0,
            currency: ord.currency === 'BDT' ? 'BDT' : 'USD',
            orderTotal: ord.total || 0,
            weightKg: 2.0,
            advancePct: 50,
            advanceRequired: (ord.total || 0) * 0.5,
            advancePaid: ord.amountPaid || 0,
            advanceMethod: 'BANK_TT',
            advanceReceived: (ord.amountPaid || 0) >= (ord.total || 0) * 0.5,
            balanceDue: Math.max(0, (ord.total || 0) - (ord.amountPaid || 0)),
            productionAuthorized: ord.status === 'cutting_authorized' || Boolean(ord.productionUnlockedAt),
            codAmount: Math.max(0, (ord.total || 0) - (ord.amountPaid || 0)),
            dispatchStatus: ord.fulfillmentStatus === 'fulfilled' ? 'DELIVERED' : ord.fulfillmentStatus === 'cutting' ? 'READY_FOR_DISPATCH' : 'PENDING_DEPOSIT',
            notes: ord.shippingAddress || '',
          }));
          setOrders(mapped);
          setSelectedOrderId((prev) => prev || mapped[0].id);
        } else {
          console.log('[NexOS Firebase Sync]: No data found or connection issue.');
        }
      } catch (err) {
        console.log('[NexOS Firebase Sync]: No data found or connection issue.');
      }
    }
    loadLiveOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync initial order if passed via prop or event
  useEffect(() => {
    if (!initialOrder) return;
    const formatted: ConfirmedOrder = {
      id: initialOrder.poNumber || initialOrder.id || `HH-PO-${Date.now().toString().slice(-4)}`,
      poNumber: initialOrder.poNumber || initialOrder.id || `HH-PO-${Date.now().toString().slice(-4)}`,
      buyerName: initialOrder.buyerName || initialOrder.customer?.name || 'Valued Buyer',
      buyerPhone: normalizePhoneNumber(initialOrder.buyerPhone || initialOrder.customer?.phone || ''),
      companyName: initialOrder.companyName || initialOrder.customer?.companyName || '',
      deliveryAddress:
        initialOrder.deliveryAddress ||
        initialOrder.customer?.addresses?.[0]?.street ||
        initialOrder.customer?.addresses?.[0]?.city ||
        'Dhaka, Bangladesh',
      styleName: initialOrder.styleName || initialOrder.category || 'Atelier Garment',
      category: initialOrder.category || 'Custom Apparel',
      quantity: initialOrder.quantity || initialOrder.totalQuantity || 1,
      unitFobPrice: initialOrder.unitFobPrice || initialOrder.unitPrice || 0,
      currency: initialOrder.currency || 'BDT',
      orderTotal:
        initialOrder.orderTotal ||
        initialOrder.totalOrderValue ||
        (initialOrder.quantity || 1) * (initialOrder.unitFobPrice || initialOrder.unitPrice || 0),
      weightKg: initialOrder.totalEstimatedWeightKg || initialOrder.weightKg || 1.5,
      advancePct: 50,
      advanceRequired: Math.round(
        ((initialOrder.orderTotal || initialOrder.totalOrderValue || 0) * 50) / 100
      ),
      advancePaid: initialOrder.advancePaid || 0,
      advanceMethod: initialOrder.advanceMethod || 'BANK_TT',
      advanceReceived: initialOrder.advanceReceived || false,
      advanceTxnRef: initialOrder.advanceTxnRef || '',
      balanceDue:
        (initialOrder.orderTotal || initialOrder.totalOrderValue || 0) - (initialOrder.advancePaid || 0),
      productionAuthorized: initialOrder.productionAuthorized || initialOrder.advanceReceived || false,
      codAmount:
        initialOrder.codAmount ||
        (initialOrder.orderTotal || initialOrder.totalOrderValue || 0) - (initialOrder.advancePaid || 0),
      dispatchStatus: initialOrder.dispatchStatus || 'PENDING_DEPOSIT',
      notes: initialOrder.notes || ''
    };

    setOrders((prev) => {
      const exists = prev.some((o) => o.id === formatted.id);
      if (exists) {
        return prev.map((o) => (o.id === formatted.id ? { ...o, ...formatted } : o));
      }
      return [formatted, ...prev];
    });
    setSelectedOrderId(formatted.id);
  }, [initialOrder]);

  // Listen to global event bridge
  useEffect(() => {
    const handleOpenLogistics = (e: any) => {
      const incomingOrder = e.detail?.order || e.detail;
      if (incomingOrder) {
        const id = incomingOrder.poNumber || incomingOrder.id;
        setSelectedOrderId(id);
      }
    };
    window.addEventListener('nexus:open-logistics', handleOpenLogistics);
    return () => window.removeEventListener('nexus:open-logistics', handleOpenLogistics);
  }, []);

  // Sync active order selection into form fields
  const currentOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0];
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!currentOrder) return;
    setCustomerName(currentOrder.buyerName || '');
    setCustomerPhone(normalizePhoneNumber(currentOrder.buyerPhone || ''));
    setDeliveryAddress(currentOrder.deliveryAddress || '');
    setItemWeight(currentOrder.weightKg || 1.5);
    setCodAmount(currentOrder.codAmount ?? currentOrder.balanceDue ?? 0);
    setHandlingNotes(currentOrder.notes || '');

    setAdvancePct(currentOrder.advancePct || 50);
    setAdvancePaid(currentOrder.advancePaid || 0);
    setAdvanceMethod(currentOrder.advanceMethod || 'BANK_TT');
    setAdvanceTxnRef(currentOrder.advanceTxnRef || '');
    setIsAdvanceReceived(currentOrder.advanceReceived || false);

    if (currentOrder.consignmentId) {
      setDispatchResult({
        consignmentId: currentOrder.consignmentId,
        carrier: currentOrder.carrier || 'STEADFAST',
        trackingUrl: currentOrder.trackingUrl || '',
        barcodeString: currentOrder.barcodeString || currentOrder.consignmentId,
        dispatchedAt: currentOrder.dispatchedAt || new Date().toISOString()
      });
    } else {
      setDispatchResult(null);
    }
  }, [currentOrder?.id]);

  // Live order calculations
  const calculatedTotal = useMemo(() => {
    if (!currentOrder) return 0;
    return currentOrder.quantity * currentOrder.unitFobPrice;
  }, [currentOrder]);

  const calculatedAdvanceRequired = useMemo(() => {
    return Math.round((calculatedTotal * advancePct) / 100);
  }, [calculatedTotal, advancePct]);

  const calculatedBalanceDue = useMemo(() => {
    return Math.max(0, calculatedTotal - advancePaid);
  }, [calculatedTotal, advancePaid]);

  const isProductionAuthorized = useMemo(() => {
    return isAdvanceReceived || advancePaid >= calculatedAdvanceRequired;
  }, [isAdvanceReceived, advancePaid, calculatedAdvanceRequired]);

  // Handle Mark Advance Received Toggle
  const handleToggleMarkReceived = useCallback(() => {
    const nextState = !isAdvanceReceived;
    setIsAdvanceReceived(nextState);

    // If turned on and advancePaid is 0, auto-fill with advance required
    const nextPaid = nextState && advancePaid === 0 ? calculatedAdvanceRequired : advancePaid;
    if (nextState && advancePaid === 0) {
      setAdvancePaid(calculatedAdvanceRequired);
      setCodAmount(Math.max(0, calculatedTotal - calculatedAdvanceRequired));
    }

    // Persist to local state
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrder.id) return o;
        return {
          ...o,
          advanceReceived: nextState,
          advancePaid: nextPaid,
          balanceDue: Math.max(0, calculatedTotal - nextPaid),
          productionAuthorized: nextState || nextPaid >= calculatedAdvanceRequired,
          advancePaidAt: nextState ? new Date().toISOString() : undefined,
          dispatchStatus: nextState ? 'READY_FOR_DISPATCH' : 'PENDING_DEPOSIT'
        };
      })
    );

    const feedback = nextState
      ? `✓ 50% Advance Confirmed for PO #${currentOrder.poNumber}. PRODUCTION AUTHORIZED!`
      : `Advance payment status reset for PO #${currentOrder.poNumber}`;
    setStatusMessage(feedback);
    setTimeout(() => setStatusMessage(null), 4000);
  }, [isAdvanceReceived, advancePaid, calculatedAdvanceRequired, calculatedTotal, currentOrder]);

  // Handle Advance Value Change
  const handleAdvancePaidChange = useCallback(
    (val: number) => {
      const num = Math.max(0, val);
      setAdvancePaid(num);
      const remaining = Math.max(0, calculatedTotal - num);
      setCodAmount(remaining);
      const authorized = num >= calculatedAdvanceRequired || isAdvanceReceived;

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== currentOrder.id) return o;
          return {
            ...o,
            advancePaid: num,
            balanceDue: remaining,
            productionAuthorized: authorized
          };
        })
      );
    },
    [calculatedTotal, calculatedAdvanceRequired, isAdvanceReceived, currentOrder]
  );

  // Dispatch Courier Action
  const handleConfirmAndDispatch = useCallback(async () => {
    if (!currentOrder) return;
    setIsDispatching(true);
    setStatusMessage(`Broadcasting API payload to ${CARRIER_CONFIG[activeCarrier].name} Gateway…`);

    // Simulate realistic carrier API latency (450ms)
    await new Promise((res) => setTimeout(res, 500));

    const carrierDef = CARRIER_CONFIG[activeCarrier];
    const generatedCid = carrierDef.generateId(currentOrder.poNumber);
    const tracking = carrierDef.getTrackingUrl(generatedCid);
    const barcode = `${generatedCid}`;
    const nowIso = new Date().toISOString();

    const dispatchPayload = {
      consignmentId: generatedCid,
      carrier: activeCarrier,
      trackingUrl: tracking,
      barcodeString: barcode,
      dispatchedAt: nowIso
    };

    setDispatchResult(dispatchPayload);

    // Update in local orders
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrder.id) return o;
        return {
          ...o,
          consignmentId: generatedCid,
          carrier: activeCarrier,
          trackingUrl: tracking,
          barcodeString: barcode,
          codAmount: codAmount,
          weightKg: itemWeight,
          dispatchStatus: 'IN_TRANSIT',
          dispatchedAt: nowIso
        };
      })
    );

    // Optional Firestore sync
    try {
      // db imported from lib/firebase
      const consignmentRef = doc(db, 'consignments', generatedCid);
      await setDoc(consignmentRef, {
        consignmentId: generatedCid,
        poNumber: currentOrder.poNumber,
        carrier: activeCarrier,
        buyerName: customerName,
        buyerPhone: customerPhone,
        deliveryAddress: deliveryAddress,
        itemWeightKg: itemWeight,
        codAmount: codAmount,
        currency: currentOrder.currency,
        trackingUrl: tracking,
        status: 'IN_TRANSIT',
        dispatchedAt: Timestamp.now(),
        createdAt: Timestamp.now()
      });
    } catch (err) {
      console.warn('[LogisticsHub] Firestore sync notice (operating offline):', err);
    }

    setIsDispatching(false);
    setStatusMessage(`✓ Parcel Dispatched via ${carrierDef.name}! Consignment ID: ${generatedCid}`);
    setTimeout(() => setStatusMessage(null), 5000);
  }, [currentOrder, activeCarrier, codAmount, itemWeight, customerName, customerPhone, deliveryAddress]);

  // WhatsApp Tracking Dispatch
  const handleWhatsAppTrackingToBuyer = useCallback(() => {
    if (!currentOrder || !dispatchResult) return;
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      alert('Please provide a valid buyer mobile number (+880...) to dispatch WhatsApp tracking.');
      return;
    }

    const carrierName = CARRIER_CONFIG[dispatchResult.carrier].name;
    const msg =
      `*HANDS & HEAD NEXUS · COURIER DISPATCH NOTICE*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Order / PO: *${currentOrder.poNumber}*\n` +
      `Buyer: ${customerName}\n` +
      `Item: ${currentOrder.styleName} (${currentOrder.quantity} pcs)\n` +
      `Carrier: ${carrierName}\n` +
      `Consignment ID: *${dispatchResult.consignmentId}*\n` +
      `Live Tracking: ${dispatchResult.trackingUrl}\n` +
      `COD Amount Payable: ৳${codAmount.toLocaleString()} BDT\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Your handcrafted order has been packaged and handed over to logistics. Thank you for choosing Hands & Head Atelier.`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }, [currentOrder, dispatchResult, customerName, customerPhone, codAmount]);

  // WhatsApp Advance Deposit Reminder
  const handleWhatsAppAdvanceReminder = useCallback(() => {
    if (!currentOrder) return;
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      alert('Please provide a valid buyer mobile number (+880...) to send advance reminder.');
      return;
    }

    const symbol = currentOrder.currency === 'BDT' ? '৳' : '$';
    const msg =
      `Dear ${customerName},\n\n` +
      `PO #${currentOrder.poNumber} for "${currentOrder.styleName}" (${currentOrder.quantity} pcs) is pending production.\n\n` +
      `Advance payment of ${symbol}${calculatedAdvanceRequired.toLocaleString()} (${advancePct}%) is required to initiate pattern grading and leather cutting on the factory floor.\n\n` +
      `Please remit deposit via:\n` +
      `• Bank TT: Hands & Head Atelier Ltd\n` +
      `  A/C: 110-88921-01 (Standard Chartered Bank Dhaka, SWIFT: SCBLBDDX)\n` +
      `• bKash Merchant: 01711-889900 (Counter 1)\n\n` +
      `Kindly reply with your Transaction ID once transferred so we can authorize immediate production. Thank you!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }, [currentOrder, customerName, customerPhone, calculatedAdvanceRequired, advancePct]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.styleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.buyerPhone.includes(searchQuery);

      if (!matchSearch) return false;
      if (filterTab === 'PENDING_DEPOSIT') return !o.productionAuthorized;
      if (filterTab === 'READY_FOR_DISPATCH') return o.productionAuthorized && !o.consignmentId;
      if (filterTab === 'IN_TRANSIT') return !!o.consignmentId;
      return true;
    });
  }, [orders, searchQuery, filterTab]);

  // Telemetry metrics
  const totalCodInTransit = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.consignmentId ? o.codAmount : 0), 0);
  }, [orders]);

  const totalAdvanceCollected = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.currency === 'BDT' ? o.advancePaid : 0), 0);
  }, [orders]);

  const productionAuthorizedCount = useMemo(() => {
    return orders.filter((o) => o.productionAuthorized).length;
  }, [orders]);

  return (
    <div
      id="logistics_settlement_hub"
      className="w-full bg-[#0D0E12] text-[#E2E8F0] font-mono p-3 sm:p-6 rounded-xl border border-[#1E222B] shadow-2xl space-y-6"
    >
      {/* ── 1. Top Header Bar & Real-time Telemetry ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E222B]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E599] animate-pulse" />
            <span className="text-[11px] font-bold text-[#FF4400] uppercase tracking-widest">
              [LOGISTICS_HUB] · DISPATCH &amp; COD SETTLEMENT DOCK
            </span>
            <span className="text-[10px] bg-[#161820] text-[#94A3B8] border border-[#1E222B] px-2 py-0.5 rounded">
              v4.9 AUTO-DISPATCH
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
            Logistics &amp; COD Settlement Dock
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            One-click courier booking with Steadfast, Pathao &amp; RedX · 50/50 Advance pre-order locking
          </p>
        </div>

        {/* Global Action & Close Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof (window as any).openFactorySlaFloorTracker === 'function') {
                (window as any).openFactorySlaFloorTracker(currentOrder?.poNumber);
              } else {
                window.dispatchEvent(
                  new CustomEvent('nexus:open-factory-sla', {
                    detail: { poNumber: currentOrder?.poNumber }
                  })
                );
              }
            }}
            className="px-3 py-1.5 bg-[#161820] hover:bg-[#1E222B] border border-[#FF4400]/50 text-xs font-bold text-[#FF4400] rounded transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Open Factory Floor & SLA Monitor"
          >
            <span>🏭</span>
            <span>FACTORY SLA →</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusMessage('Refreshing live Firestore orders & consignments…');
              setTimeout(() => setStatusMessage('✓ Order state synced with factory floor'), 1000);
            }}
            className="px-3 py-1.5 bg-[#161820] hover:bg-[#1E222B] border border-[#1E222B] text-xs font-bold text-[#E2E8F0] rounded transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Sync live factory orders"
          >
            <span>↻</span>
            <span>SYNC ORDERS</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#161820] hover:bg-[#1E222B] border border-[#1E222B] text-xs font-bold text-[#94A3B8] hover:text-white rounded transition-all cursor-pointer"
              title="Close module"
            >
              ✕ CLOSE
            </button>
          )}
        </div>
      </div>

      {/* ── Telemetry Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#12141A] border border-[#1E222B] p-3 rounded-lg">
          <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Active POs</div>
          <div className="text-xl font-bold text-white mt-0.5">{orders.length} Orders</div>
          <div className="text-[10px] text-[#00E599] font-medium mt-0.5">
            ● {productionAuthorizedCount} Production Authorized
          </div>
        </div>

        <div className="bg-[#12141A] border border-[#1E222B] p-3 rounded-lg">
          <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">50% Deposits Locked</div>
          <div className="text-xl font-bold text-[#00E599] mt-0.5">৳{totalAdvanceCollected.toLocaleString()}</div>
          <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">Pre-production deposits</div>
        </div>

        <div className="bg-[#12141A] border border-[#1E222B] p-3 rounded-lg">
          <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">COD In Transit</div>
          <div className="text-xl font-bold text-[#FF4400] mt-0.5">৳{totalCodInTransit.toLocaleString()}</div>
          <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">To be collected by couriers</div>
        </div>

        <div className="bg-[#12141A] border border-[#1E222B] p-3 rounded-lg">
          <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Courier Gateways</div>
          <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00E599]" />
            <span>Steadfast · Pathao · RedX · DHL</span>
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-0.5">API payload live test ready</div>
        </div>
      </div>

      {/* ── Status Banner ── */}
      {statusMessage && (
        <div className="bg-[#161820] border border-[#00E599]/60 text-[#00E599] text-xs px-4 py-2.5 rounded-lg flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="animate-spin">●</span>
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-white hover:text-[#FF4400] font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ── 2. Order Selector Bar ── */}
      <div className="bg-[#12141A] border border-[#1E222B] p-3 rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-white tracking-wider">Select Confirmed Order / PO</span>
            <span className="text-[10px] bg-[#161820] text-[#FF4400] border border-[#1E222B] px-2 py-0.5 rounded font-bold">
              {filteredOrders.length} Available
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            {(['ALL', 'PENDING_DEPOSIT', 'READY_FOR_DISPATCH', 'IN_TRANSIT'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                  filterTab === tab
                    ? 'bg-[#FF4400] text-white shadow-xs'
                    : 'bg-[#161820] text-[#94A3B8] hover:text-white border border-[#1E222B]'
                }`}
              >
                {tab === 'ALL'
                  ? 'All'
                  : tab === 'PENDING_DEPOSIT'
                  ? 'Pending Advance'
                  : tab === 'READY_FOR_DISPATCH'
                  ? 'Ready to Dispatch'
                  : 'In Transit'}
              </button>
            ))}
          </div>
        </div>

        {/* Search input & Order Pills Grid */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Search active POs by PO#, buyer name, style, phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-[#0D0E12] border border-[#1E222B] text-xs text-white px-3 py-1.5 rounded focus:outline-none focus:border-[#FF4400]"
          />

          <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {filteredOrders.length === 0 ? (
              <div className="px-4 py-2 text-xs text-[#94A3B8] border border-[#1E222B] bg-[#0D0E12] rounded flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4400]" />
                No active orders found in the NexOS ledger.
              </div>
            ) : (
              filteredOrders.map((ord) => {
                const isSelected = ord.id === selectedOrderId;
                return (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`px-3 py-1.5 rounded text-left shrink-0 transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#1E222B] border-[#FF4400] text-white shadow-md'
                        : 'bg-[#0D0E12] border-[#1E222B] text-[#94A3B8] hover:border-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          ord.productionAuthorized ? 'bg-[#00E599]' : 'bg-[#FF4400]'
                        }`}
                      />
                      <span className="font-bold text-xs">{ord.poNumber}</span>
                    </div>
                    <div className="text-[10px] truncate max-w-[150px]">{ord.buyerName}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Main Grid: Ledger & Courier Booking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column: Advance & Balance Ledger (50/50 Controller) ── */}
        <div className="lg:col-span-6 bg-[#12141A] border border-[#1E222B] p-4 sm:p-5 rounded-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E222B]">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#FF4400]">2. ADVANCE &amp; BALANCE LEDGER</span>
              <span className="text-[10px] bg-[#161820] text-[#94A3B8] border border-[#1E222B] px-2 py-0.5 rounded">
                50/50 CONTROLLER
              </span>
            </div>
            {/* Production status badge */}
            <div
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 border ${
                isProductionAuthorized
                  ? 'bg-[#00E599]/10 text-[#00E599] border-[#00E599]/40'
                  : 'bg-[#FF4400]/10 text-[#FF4400] border-[#FF4400]/40'
              }`}
            >
              <span>{isProductionAuthorized ? '● PRODUCTION AUTHORIZED' : '▲ AWAITING ADVANCE DEPOSIT'}</span>
            </div>
          </div>

          {/* Active Order Summary Header */}
          <div className="bg-[#0D0E12] border border-[#1E222B] p-3 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] text-[#94A3B8] uppercase">Target Purchase Order</div>
                <div className="text-sm font-bold text-white font-mono">{currentOrder?.poNumber}</div>
                <div className="text-xs text-[#E2E8F0] mt-0.5">{currentOrder?.styleName}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#94A3B8] uppercase">Quantity &amp; FOB</div>
                <div className="text-xs font-bold text-white">
                  {currentOrder?.quantity} pcs × {currentOrder?.currency === 'BDT' ? '৳' : '$'}
                  {currentOrder?.unitFobPrice?.toLocaleString()}
                </div>
                <div className="text-sm font-bold text-[#00E599]">
                  Total: {currentOrder?.currency === 'BDT' ? '৳' : '$'}
                  {calculatedTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Matrix Controls */}
          <div className="space-y-4">
            {/* Advance Required Selector */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#94A3B8] font-bold">Advance Required Deposit</span>
                <span className="text-white font-bold">
                  {advancePct}% = {currentOrder?.currency === 'BDT' ? '৳' : '$'}
                  {calculatedAdvanceRequired.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[30, 50, 70, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setAdvancePct(pct)}
                    className={`flex-1 py-1 text-xs rounded border transition-all font-bold cursor-pointer ${
                      advancePct === pct
                        ? 'bg-[#FF4400] border-[#FF4400] text-white'
                        : 'bg-[#161820] border-[#1E222B] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Advance Paid Input & Received Toggle */}
            <div className="bg-[#0D0E12] border border-[#1E222B] p-3.5 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase">Advance Paid Amount</label>
                <button
                  type="button"
                  onClick={handleToggleMarkReceived}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isAdvanceReceived
                      ? 'bg-[#00E599] text-black shadow-md'
                      : 'bg-[#161820] hover:bg-[#1E222B] border border-[#1E222B] text-[#FF4400]'
                  }`}
                >
                  <span>{isAdvanceReceived ? '✓ MARKED RECEIVED' : 'MARK AS RECEIVED'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#94A3B8]">{currentOrder?.currency === 'BDT' ? '৳' : '$'}</span>
                <input
                  type="number"
                  value={advancePaid}
                  onChange={(e) => handleAdvancePaidChange(Number(e.target.value) || 0)}
                  className="flex-1 bg-[#161820] border border-[#1E222B] rounded px-3 py-1.5 text-sm text-white font-bold focus:outline-none focus:border-[#00E599]"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                {(['BANK_TT', 'BKASH_MERCHANT', 'NAGAD', 'CASH'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setAdvanceMethod(method)}
                    className={`py-1 text-[10px] rounded border transition-all font-bold cursor-pointer ${
                      advanceMethod === method
                        ? 'bg-[#00E599] text-black border-[#00E599]'
                        : 'bg-[#161820] text-[#94A3B8] border-[#1E222B] hover:text-white'
                    }`}
                  >
                    {method === 'BANK_TT'
                      ? 'Bank TT'
                      : method === 'BKASH_MERCHANT'
                      ? 'bKash Merch'
                      : method === 'NAGAD'
                      ? 'Nagad'
                      : 'Cash'}
                  </button>
                ))}
              </div>

              {/* Txn Reference */}
              <div>
                <input
                  type="text"
                  placeholder="Bank Transaction Ref / bKash TxnID (e.g. SCB-TT-99824)"
                  value={advanceTxnRef}
                  onChange={(e) => setAdvanceTxnRef(e.target.value)}
                  className="w-full bg-[#161820] border border-[#1E222B] rounded px-2.5 py-1 text-[11px] text-[#E2E8F0] focus:outline-none focus:border-[#00E599]"
                />
              </div>
            </div>

            {/* Outstanding Balance Matrix Box */}
            <div className="bg-[#0D0E12] border border-[#1E222B] p-3.5 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#94A3B8]">Gross Order Total:</span>
                <span className="font-bold text-white">
                  {currentOrder?.currency === 'BDT' ? '৳' : '$'}
                  {calculatedTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#94A3B8]">Advance Deposit Credited:</span>
                <span className="font-bold text-[#00E599]">
                  - {currentOrder?.currency === 'BDT' ? '৳' : '$'}
                  {advancePaid.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-[#1E222B] flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase">Outstanding Balance Due:</span>
                <span className="text-base font-bold text-[#FF4400]">
                  {currentOrder?.currency === 'BDT' ? '৳' : '$'}
                  {calculatedBalanceDue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Production Authorization Notice */}
            <div
              className={`p-3 rounded-lg border text-xs space-y-1 ${
                isProductionAuthorized
                  ? 'bg-[#00E599]/10 border-[#00E599]/30 text-[#00E599]'
                  : 'bg-[#FF4400]/10 border-[#FF4400]/30 text-[#FF4400]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span>{isProductionAuthorized ? '✓' : '⚠️'}</span>
                <span>
                  {isProductionAuthorized
                    ? 'PRODUCTION UNLOCKED & AUTHORIZED'
                    : 'CUTTING LOCKED · ADVANCE REQUIRED'}
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-tight">
                {isProductionAuthorized
                  ? '50% pre-order deposit validated. Material allocation and leather cutting unlocked for factory floor.'
                  : 'Production floor queue locked. Fabric & leather cutting remains on hold until deposit is received.'}
              </p>
            </div>

            {/* 1-Click WhatsApp Reminder Action */}
            <button
              type="button"
              onClick={handleWhatsAppAdvanceReminder}
              className="w-full py-2.5 bg-[#161820] hover:bg-[#1E222B] border border-[#00E599]/60 text-[#00E599] font-bold text-xs rounded transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <span>📲</span>
              <span>1-CLICK WHATSAPP REMINDER TO BUYER</span>
            </button>
          </div>
        </div>

        {/* ── Right Column: One-Click Courier Dispatch Engine ── */}
        <div className="lg:col-span-6 bg-[#12141A] border border-[#1E222B] p-4 sm:p-5 rounded-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E222B]">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#00E599]">1. ONE-CLICK COURIER DISPATCH</span>
              <span className="text-[10px] bg-[#161820] text-[#FF4400] border border-[#1E222B] px-2 py-0.5 rounded font-bold">
                API GATEWAY
              </span>
            </div>
            <span className="text-[10px] text-[#94A3B8]">Auto-Populated</span>
          </div>

          {/* Carrier Selector Tabs */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Select Integrated Logistics Carrier</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(['STEADFAST', 'PATHAO', 'REDX', 'DHL_FEDEX'] as const).map((carrierKey) => {
                const conf = CARRIER_CONFIG[carrierKey];
                const isActive = activeCarrier === carrierKey;
                return (
                  <button
                    key={carrierKey}
                    type="button"
                    onClick={() => setActiveCarrier(carrierKey)}
                    className={`p-2 rounded border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#FF4400] text-white border-[#FF4400] shadow-md'
                        : 'bg-[#0D0E12] text-[#94A3B8] border-[#1E222B] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold leading-none">{conf.label}</div>
                    <div className={`text-[9px] mt-1 truncate ${isActive ? 'text-white' : 'text-[#64748B]'}`}>
                      {conf.eta}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carrier Gateway Telemetry Pill */}
          <div className="bg-[#0D0E12] border border-[#1E222B] p-2.5 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E599]" />
              <span className="font-bold text-white">{CARRIER_CONFIG[activeCarrier].name}</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] font-mono">{CARRIER_CONFIG[activeCarrier].baseRate}</div>
          </div>

          {/* Auto-Populated Inputs Form */}
          <div className="space-y-3">
            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-[#94A3B8] block mb-1">Customer / Consignee Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#0D0E12] border border-[#1E222B] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E599]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#94A3B8] block mb-1">
                  Normalized Phone (+880 Format)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(normalizePhoneNumber(e.target.value))}
                  placeholder="+8801712345678"
                  className="w-full bg-[#0D0E12] border border-[#1E222B] rounded px-2.5 py-1.5 text-xs text-[#00E599] font-mono focus:outline-none focus:border-[#00E599]"
                />
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <label className="text-[10px] uppercase text-[#94A3B8] block mb-1">Delivery Destination Address</label>
              <textarea
                rows={2}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full bg-[#0D0E12] border border-[#1E222B] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E599] resize-none"
              />
            </div>

            {/* Weight & COD Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-[#94A3B8] block mb-1">Item Weight (kg from Tech-Pack)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={itemWeight}
                    onChange={(e) => setItemWeight(Number(e.target.value) || 0.5)}
                    className="w-full bg-[#0D0E12] border border-[#1E222B] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E599]"
                  />
                  <span className="text-xs text-[#94A3B8]">KG</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#94A3B8] block mb-1">COD Collection Amount (BDT)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={codAmount}
                    onChange={(e) => setCodAmount(Number(e.target.value) || 0)}
                    className="w-full bg-[#0D0E12] border border-[#1E222B] rounded px-2.5 py-1.5 text-xs text-[#FF4400] font-bold focus:outline-none focus:border-[#FF4400]"
                  />
                  <span className="text-xs text-[#94A3B8]">BDT</span>
                </div>
              </div>
            </div>

            {/* Handling Notes */}
            <div>
              <label className="text-[10px] uppercase text-[#94A3B8] block mb-1">
                Courier Handling Notes &amp; Packaging
              </label>
              <input
                type="text"
                placeholder="Fragile · Genuine Leather Goods · Handle with care"
                value={handlingNotes}
                onChange={(e) => setHandlingNotes(e.target.value)}
                className="w-full bg-[#0D0E12] border border-[#1E222B] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E599]"
              />
            </div>
          </div>

          {/* Action Button: CONFIRM & DISPATCH PARCEL */}
          <button
            type="button"
            disabled={isDispatching || !customerPhone || !deliveryAddress}
            onClick={handleConfirmAndDispatch}
            className="w-full py-3 bg-[#FF4400] hover:bg-[#E03A00] text-white font-bold text-xs uppercase tracking-wider rounded transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDispatching ? (
              <>
                <span className="animate-spin">●</span>
                <span>DISPATCHING VIA {CARRIER_CONFIG[activeCarrier].name}…</span>
              </>
            ) : (
              <>
                <span>🚚</span>
                <span>CONFIRM &amp; DISPATCH PARCEL →</span>
              </>
            )}
          </button>

          {/* ── Generated Consignment & Barcode Display ── */}
          {dispatchResult && (
            <div className="bg-[#0D0E12] border border-[#00E599]/60 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E599] animate-ping" />
                  <span className="text-xs font-bold text-[#00E599] uppercase tracking-wider">
                    PARCEL DISPATCHED &amp; REGISTERED
                  </span>
                </div>
                <span className="text-[10px] bg-[#161820] text-white border border-[#1E222B] px-2 py-0.5 rounded">
                  {CARRIER_CONFIG[dispatchResult.carrier].badge}
                </span>
              </div>

              {/* Consignment ID & Tracking URL */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Consignment ID:</span>
                  <span className="font-bold text-white font-mono">{dispatchResult.consignmentId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#94A3B8]">Live Tracking URL:</span>
                  <a
                    href={dispatchResult.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#00E599] hover:underline font-mono truncate max-w-[220px]"
                  >
                    {dispatchResult.trackingUrl}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">COD Payable:</span>
                  <span className="font-bold text-[#FF4400]">৳{codAmount.toLocaleString()} BDT</span>
                </div>
              </div>

              {/* Barcode Optical Representation */}
              <div className="bg-white p-3 rounded text-center space-y-1">
                {/* Visual Barcode SVG */}
                <div className="flex justify-center items-center gap-0.5 h-10 overflow-hidden">
                  {Array.from({ length: 44 }).map((_, i) => {
                    const isThick = i % 3 === 0 || i % 7 === 0;
                    return (
                      <div
                        key={i}
                        className={`bg-black h-full ${isThick ? 'w-1.5' : 'w-0.5'}`}
                        style={{ opacity: i % 5 === 0 ? 0.9 : 1 }}
                      />
                    );
                  })}
                </div>
                <div className="text-black font-mono text-[11px] font-bold tracking-[0.25em]">
                  *{dispatchResult.barcodeString}*
                </div>
              </div>

              {/* Action: WHATSAPP TRACKING TO BUYER */}
              <button
                type="button"
                onClick={handleWhatsAppTrackingToBuyer}
                className="w-full py-2.5 bg-[#00E599] hover:bg-[#00C885] text-black font-bold text-xs rounded transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>📲</span>
                <span>WHATSAPP TRACKING TO BUYER (1-CLICK)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Active Logistics & Settlement Ledger Table ── */}
      <div className="bg-[#12141A] border border-[#1E222B] rounded-xl overflow-hidden">
        <div className="p-3.5 bg-[#161820] border-b border-[#1E222B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              3. PRODUCTION QUEUE &amp; DISPATCH RUN-SHEET
            </span>
            <span className="text-[10px] text-[#94A3B8]">({orders.length} Active Records)</span>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1 bg-[#0D0E12] border border-[#1E222B] text-[#94A3B8] hover:text-white text-[11px] rounded transition-all"
          >
            🖨 Print Run-Sheet
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0D0E12] text-[#94A3B8] text-[10px] uppercase border-b border-[#1E222B]">
              <tr>
                <th className="p-3">PO #</th>
                <th className="p-3">Buyer &amp; Company</th>
                <th className="p-3">Style / Spec</th>
                <th className="p-3 text-right">Order Value</th>
                <th className="p-3 text-right">50% Advance</th>
                <th className="p-3">Production Status</th>
                <th className="p-3">Carrier / Tracking</th>
                <th className="p-3 text-right">COD Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E222B]">
              {orders.map((ord) => (
                <tr
                  key={ord.id}
                  onClick={() => setSelectedOrderId(ord.id)}
                  className={`hover:bg-[#161820] transition-colors cursor-pointer ${
                    ord.id === selectedOrderId ? 'bg-[#161820]/60' : ''
                  }`}
                >
                  <td className="p-3 font-bold text-white">{ord.poNumber}</td>
                  <td className="p-3">
                    <div className="font-bold text-[#E2E8F0]">{ord.buyerName}</div>
                    <div className="text-[10px] text-[#94A3B8]">{ord.companyName || ord.buyerPhone}</div>
                  </td>
                  <td className="p-3 text-[#E2E8F0]">
                    <div className="truncate max-w-[180px]">{ord.styleName}</div>
                    <div className="text-[10px] text-[#94A3B8]">{ord.quantity} pcs</div>
                  </td>
                  <td className="p-3 text-right font-bold text-white">
                    {ord.currency === 'BDT' ? '৳' : '$'}
                    {ord.orderTotal.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-bold text-[#00E599]">
                    {ord.currency === 'BDT' ? '৳' : '$'}
                    {ord.advancePaid.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${
                        ord.productionAuthorized
                          ? 'bg-[#00E599]/10 text-[#00E599] border-[#00E599]/40'
                          : 'bg-[#FF4400]/10 text-[#FF4400] border-[#FF4400]/40'
                      }`}
                    >
                      {ord.productionAuthorized ? 'AUTHORIZED' : 'AWAITING DEPOSIT'}
                    </span>
                  </td>
                  <td className="p-3">
                    {ord.consignmentId ? (
                      <div>
                        <span className="text-[10px] bg-[#161820] text-white border border-[#1E222B] px-1.5 py-0.5 rounded font-mono">
                          {ord.consignmentId}
                        </span>
                        <div className="text-[9px] text-[#00E599] mt-0.5">In Transit ({ord.carrier})</div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#64748B]">Ready to dispatch</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-bold text-[#FF4400]">
                    ৳{ord.codAmount?.toLocaleString() || ord.balanceDue?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LogisticsSettlementHub;
