import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ── Types & Interfaces ──
export type WorkshopUnit =
  | 'KNIT_HEAVY_FLEECE'
  | 'SCREEN_PRINT_EMBROIDERY'
  | 'LEATHER_ATELIER_HARDWARE';

export type StageCheckpoint =
  | 'FABRIC_RELEASED'
  | 'CUTTING_COMPLETED'
  | 'PRINT_STITCH_PASSED'
  | 'QC_INSPECTED'
  | 'PACKED_READY';

export type CourierCarrier = 'STEADFAST' | 'PATHAO' | 'REDX' | 'DHL_CARGO';

export type SettlementStatus = 'PENDING_COURIER_REMITTANCE' | 'SETTLED_IN_FULL';

export interface SizeBreakdown {
  [size: string]: number;
}

export interface FloorJobOrder {
  id: string;
  poNumber: string;
  dealId?: string;
  buyerName: string; // Used for shipping / dispatch, stripped from job ticket
  buyerCompany: string; // Stripped from job ticket
  contactPhone: string; // Stripped from job ticket
  deliveryAddress: string;
  styleName: string;
  category: string;
  fabricLeatherSpec: string;
  trimsSpec: string;
  colorway: string;
  lotSize: number;
  sizeBreakdown: SizeBreakdown;
  consumptionKgPerUnit: number; // e.g. 0.85 kg per hoodie or 1.2 sqft per folio
  totalConsumptionKg: number;
  targetPackDate: string; // YYYY-MM-DD
  workshopUnit: WorkshopUnit;
  // Financials (stripped from floor ticket)
  totalAmountBdt: number;
  totalAmountUsd: number;
  advancePaidBdt: number;
  advancePaidUsd: number;
  balanceDueBdt: number;
  balanceDueUsd: number;
  currency: 'BDT' | 'USD';
  // Checkpoints
  checkpoints: {
    fabricReleased: boolean;
    fabricReleasedAt?: string;
    cuttingCompleted: boolean;
    cuttingCompletedAt?: string;
    printStitchPassed: boolean;
    printStitchPassedAt?: string;
    qcInspected: boolean;
    qcInspectedAt?: string;
    packedReady: boolean;
    packedReadyAt?: string;
  };
  // QC Metrics
  approvedPcs: number;
  defectRejects: number;
  qcYieldPct: number;
  qcNotes?: string;
  surplusVaulted?: number;
  // Shipping & Dispatch
  carrier: CourierCarrier;
  awbConsignmentId?: string;
  awbBarcode?: string;
  trackingUrl?: string;
  dispatchedAt?: string;
  dispatchStatus: 'ON_FLOOR' | 'DISPATCHED' | 'DELIVERED';
  settlementStatus: SettlementStatus;
  settledAt?: string;
}

export interface ProductionFloorBridgeProps {
  initialPo?: string;
  mode?: 'embedded' | 'modal' | 'fullscreen';
  onClose?: () => void;
}

// ── Initial Seed Data (Verified Cutting-Authorized Orders) ──
const INITIAL_FLOOR_ORDERS: FloorJobOrder[] = [
  {
    id: 'PO-HH-2026-8801',
    poNumber: 'PO-8801',
    dealId: 'DEAL-2026-003',
    buyerName: 'Tariq Al-Mansoor',
    buyerCompany: 'Apex Holdings BD',
    contactPhone: '+8801713009922',
    deliveryAddress: 'Plot 42, Gulshan Avenue, Tower 3, Level 9, Dhaka-1212',
    styleName: 'Executive 450 GSM Heavy Loopback Hoodie',
    category: 'Heavy Knitwear & Fleece',
    fabricLeatherSpec: '450 GSM 100% Combed Compact Cotton French Terry (Carbon Black)',
    trimsSpec: 'Gunmetal YKK Metaluxe Zippers, 2x2 Heavy Spun Rib, Herringbone Neck Tape',
    colorway: 'Carbon Black & Washed Slate',
    lotSize: 800,
    sizeBreakdown: { S: 80, M: 240, L: 280, XL: 140, XXL: 60 },
    consumptionKgPerUnit: 0.88,
    totalConsumptionKg: 704.0,
    targetPackDate: '2026-09-14',
    workshopUnit: 'KNIT_HEAVY_FLEECE',
    totalAmountBdt: 2220000,
    totalAmountUsd: 18500,
    advancePaidBdt: 1140000,
    advancePaidUsd: 9500,
    balanceDueBdt: 1080000,
    balanceDueUsd: 9000,
    currency: 'BDT',
    checkpoints: {
      fabricReleased: true,
      fabricReleasedAt: '2026-09-06T10:00:00Z',
      cuttingCompleted: true,
      cuttingCompletedAt: '2026-09-07T16:30:00Z',
      printStitchPassed: true,
      printStitchPassedAt: '2026-09-08T11:00:00Z',
      qcInspected: true,
      qcInspectedAt: '2026-09-08T13:45:00Z',
      packedReady: false
    },
    approvedPcs: 812,
    defectRejects: 14,
    qcYieldPct: 98.3,
    qcNotes: 'Minor neck-rib tension flaw on 14 units isolated. Overrun of +12 pcs intact.',
    carrier: 'STEADFAST',
    dispatchStatus: 'ON_FLOOR',
    settlementStatus: 'PENDING_COURIER_REMITTANCE'
  },
  {
    id: 'PO-HH-2026-8802',
    poNumber: 'PO-8802',
    dealId: 'DEAL-2026-001',
    buyerName: 'Sander Van Dijk',
    buyerCompany: 'Starlight Creative Studio',
    contactPhone: '+31620194820',
    deliveryAddress: 'Keizersgracht 421-B, 1016 EK Amsterdam, Netherlands (Consolidated Port Hub)',
    styleName: 'Full-Grain Artisan Leather Portfolio & Desk Mat Set',
    category: 'Leather Atelier Goods',
    fabricLeatherSpec: '1.4mm Vegetable-Tanned Full-Grain Cowhide (Espresso Pull-Up)',
    trimsSpec: 'Solid Antiqued Brass Snap Buttons, Hand-Waxed Fil Au Chinois Thread',
    colorway: 'Dark Espresso Pull-Up',
    lotSize: 500,
    sizeBreakdown: { OS: 500 },
    consumptionKgPerUnit: 1.15,
    totalConsumptionKg: 575.0,
    targetPackDate: '2026-09-18',
    workshopUnit: 'LEATHER_ATELIER_HARDWARE',
    totalAmountBdt: 1980000,
    totalAmountUsd: 16500,
    advancePaidBdt: 990000,
    advancePaidUsd: 8250,
    balanceDueBdt: 990000,
    balanceDueUsd: 8250,
    currency: 'USD',
    checkpoints: {
      fabricReleased: true,
      fabricReleasedAt: '2026-09-07T09:00:00Z',
      cuttingCompleted: true,
      cuttingCompletedAt: '2026-09-08T14:00:00Z',
      printStitchPassed: false,
      qcInspected: false,
      packedReady: false
    },
    approvedPcs: 500,
    defectRejects: 6,
    qcYieldPct: 98.8,
    carrier: 'DHL_CARGO',
    dispatchStatus: 'ON_FLOOR',
    settlementStatus: 'PENDING_COURIER_REMITTANCE'
  },
  {
    id: 'PO-HH-2026-8803',
    poNumber: 'PO-8803',
    dealId: 'DEAL-2026-004',
    buyerName: 'Dr. Zeeshan Haque',
    buyerCompany: 'Zenith BioPharm Global',
    contactPhone: '+8801819203040',
    deliveryAddress: 'Level 14, UTC Building, 8 Panthapath, Karwan Bazar, Dhaka',
    styleName: 'Monochrome High-Density Graphic Crewneck',
    category: 'Knitwear & Graphics',
    fabricLeatherSpec: '380 GSM Heavy French Terry + Organic Micro-Rib',
    trimsSpec: 'High-Density Puff Screen Print, Custom Woven Hem Label',
    colorway: 'Bone Ivory & Raw Concrete',
    lotSize: 350,
    sizeBreakdown: { M: 100, L: 150, XL: 100 },
    consumptionKgPerUnit: 0.72,
    totalConsumptionKg: 252.0,
    targetPackDate: '2026-09-12',
    workshopUnit: 'SCREEN_PRINT_EMBROIDERY',
    totalAmountBdt: 875000,
    totalAmountUsd: 7290,
    advancePaidBdt: 450000,
    advancePaidUsd: 3750,
    balanceDueBdt: 425000,
    balanceDueUsd: 3540,
    currency: 'BDT',
    checkpoints: {
      fabricReleased: true,
      fabricReleasedAt: '2026-09-05T08:00:00Z',
      cuttingCompleted: true,
      cuttingCompletedAt: '2026-09-06T12:00:00Z',
      printStitchPassed: true,
      printStitchPassedAt: '2026-09-07T17:00:00Z',
      qcInspected: true,
      qcInspectedAt: '2026-09-08T09:30:00Z',
      packedReady: true,
      packedReadyAt: '2026-09-08T11:00:00Z'
    },
    approvedPcs: 358,
    defectRejects: 4,
    qcYieldPct: 98.9,
    carrier: 'PATHAO',
    awbConsignmentId: 'PTH-DH-8803-9921',
    awbBarcode: '*PTH88039921*',
    trackingUrl: 'https://pathao.com/courier/tracking/?consignment_id=PTH-DH-8803-9921',
    dispatchedAt: '2026-09-08T11:45:00Z',
    dispatchStatus: 'DISPATCHED',
    settlementStatus: 'PENDING_COURIER_REMITTANCE'
  }
];

export const ProductionFloorAndSettlementBridge: React.FC<ProductionFloorBridgeProps> = ({
  initialPo,
  mode = 'embedded',
  onClose
}) => {
  // ── State Management ──
  const [orders, setOrders] = useState<FloorJobOrder[]>(() => {
    try {
      const saved = localStorage.getItem('hh_floor_bridge_orders_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_FLOOR_ORDERS;
  });

  const [selectedPoId, setSelectedPoId] = useState<string>(() => {
    if (initialPo) {
      const matched = INITIAL_FLOOR_ORDERS.find(
        (o) => o.poNumber === initialPo || o.id === initialPo
      );
      if (matched) return matched.id;
    }
    return INITIAL_FLOOR_ORDERS[0]?.id || '';
  });

  const [filterWorkshop, setFilterWorkshop] = useState<string>('ALL');
  const [filterDispatch, setFilterDispatch] = useState<string>('ALL');
  const [jobTicketModalOpen, setJobTicketModalOpen] = useState<boolean>(false);
  const [awbModalOpen, setAwbModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('hh_floor_bridge_orders_v1', JSON.stringify(orders));
    } catch (e) {
      console.error('Failed saving floor bridge orders', e);
    }
  }, [orders]);

  // Selected Order
  const currentOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedPoId) || orders[0] || null;
  }, [orders, selectedPoId]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // ── Workshop Unit Switcher ──
  const handleWorkshopChange = (newUnit: WorkshopUnit) => {
    if (!currentOrder) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === currentOrder.id ? { ...o, workshopUnit: newUnit } : o))
    );
    showToast(`✓ Routing updated: ${currentOrder.poNumber} assigned to ${newUnit.replace(/_/g, ' ')}`);
  };

  // ── 5-Stage Checkpoints Toggle ──
  const handleToggleCheckpoint = (stage: StageCheckpoint) => {
    if (!currentOrder) return;
    const nowIso = new Date().toISOString();

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrder.id) return o;
        const cp = { ...o.checkpoints };

        switch (stage) {
          case 'FABRIC_RELEASED':
            cp.fabricReleased = !cp.fabricReleased;
            cp.fabricReleasedAt = cp.fabricReleased ? nowIso : undefined;
            break;
          case 'CUTTING_COMPLETED':
            cp.cuttingCompleted = !cp.cuttingCompleted;
            cp.cuttingCompletedAt = cp.cuttingCompleted ? nowIso : undefined;
            break;
          case 'PRINT_STITCH_PASSED':
            cp.printStitchPassed = !cp.printStitchPassed;
            cp.printStitchPassedAt = cp.printStitchPassed ? nowIso : undefined;
            break;
          case 'QC_INSPECTED':
            cp.qcInspected = !cp.qcInspected;
            cp.qcInspectedAt = cp.qcInspected ? nowIso : undefined;
            break;
          case 'PACKED_READY':
            cp.packedReady = !cp.packedReady;
            cp.packedReadyAt = cp.packedReady ? nowIso : undefined;
            break;
        }

        return { ...o, checkpoints: cp };
      })
    );

    showToast(`⚡ Checkpoint updated: ${stage.replace(/_/g, ' ')} toggled`);
  };

  // ── QC Metrics Adjustment ──
  const handleUpdateQcMetrics = (approved: number, rejects: number, notes?: string) => {
    if (!currentOrder) return;
    const total = approved + rejects;
    const yieldPct = total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 100;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrder.id) return o;
        return {
          ...o,
          approvedPcs: approved,
          defectRejects: rejects,
          qcYieldPct: yieldPct,
          qcNotes: notes !== undefined ? notes : o.qcNotes
        };
      })
    );
  };

  // ── 1-Click Push Surplus Overrun to Clearance Vault ──
  const handlePushSurplusToVault = () => {
    if (!currentOrder) return;
    const surplusCount = currentOrder.approvedPcs - currentOrder.lotSize;
    if (surplusCount <= 0) {
      showToast('No surplus units available (Approved count does not exceed lot size).');
      return;
    }

    const clearanceItem = {
      id: `CLR-${currentOrder.poNumber}-${Date.now().toString().slice(-4)}`,
      poNumber: currentOrder.poNumber,
      jobTicketId: `TICKET-${currentOrder.poNumber}`,
      styleName: currentOrder.styleName,
      category: currentOrder.category,
      fabricLeatherType: currentOrder.fabricLeatherSpec,
      colorway: currentOrder.colorway,
      unitsAvailable: surplusCount,
      originalFobBdt: Math.round(currentOrder.totalAmountBdt / currentOrder.lotSize),
      originalFobUsd: Math.round(currentOrder.totalAmountUsd / currentOrder.lotSize),
      suggestedDiscountPct: 40,
      clearancePriceBdt: Math.round((currentOrder.totalAmountBdt / currentOrder.lotSize) * 0.6),
      clearancePriceUsd: Math.round((currentOrder.totalAmountUsd / currentOrder.lotSize) * 0.6),
      reason: 'PRODUCTION_OVERRUN',
      condition: 'A_GRADE_NEW',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString()
    };

    try {
      const existingVault = JSON.parse(localStorage.getItem('hh_clearance_vault_v1') || '[]');
      existingVault.unshift(clearanceItem);
      localStorage.setItem('hh_clearance_vault_v1', JSON.stringify(existingVault));
    } catch {
      // offline safe
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === currentOrder.id
          ? { ...o, surplusVaulted: (o.surplusVaulted || 0) + surplusCount }
          : o
      )
    );

    showToast(`✓ Pushed ${surplusCount} overrun pcs to Clearance Vault for WhatsApp flash-liquidation!`);
  };

  // ── Carrier Switcher ──
  const handleCarrierChange = (carrier: CourierCarrier) => {
    if (!currentOrder) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === currentOrder.id ? { ...o, carrier } : o))
    );
  };

  // ── Dispatch Shipment & Generate AWB ──
  const handleDispatchShipment = () => {
    if (!currentOrder) return;
    const nowIso = new Date().toISOString();
    const cleanDigits = currentOrder.poNumber.replace(/[^0-9]/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);

    let prefix = 'SF-';
    let trackBase = 'https://steadfast.com.bd/t/';
    if (currentOrder.carrier === 'PATHAO') {
      prefix = 'PTH-';
      trackBase = 'https://pathao.com/courier/tracking/?consignment_id=';
    } else if (currentOrder.carrier === 'REDX') {
      prefix = 'RDX-';
      trackBase = 'https://redx.com.bd/track?trackingId=';
    } else if (currentOrder.carrier === 'DHL_CARGO') {
      prefix = 'DHL-AWB-';
      trackBase = 'https://www.dhl.com/en/express/tracking.html?AWB=';
    }

    const awbId = `${prefix}${cleanDigits || '8801'}-${randSuffix}`;
    const barcodeStr = `*${awbId.replace(/[^A-Z0-9]/gi, '')}*`;
    const trackingUrl = `${trackBase}${awbId}`;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== currentOrder.id) return o;
        return {
          ...o,
          awbConsignmentId: awbId,
          awbBarcode: barcodeStr,
          trackingUrl,
          dispatchedAt: nowIso,
          dispatchStatus: 'DISPATCHED'
        };
      })
    );

    // Save to shared dispatched shipments pool
    try {
      const dispatchedList = JSON.parse(localStorage.getItem('hh_dispatched_shipments_v1') || '[]');
      const entry = {
        orderId: currentOrder.id,
        poNumber: currentOrder.poNumber,
        client: currentOrder.buyerCompany,
        recipient: currentOrder.buyerName,
        phone: currentOrder.contactPhone,
        address: currentOrder.deliveryAddress,
        carrier: currentOrder.carrier,
        consignmentId: awbId,
        grossCodBdt: currentOrder.balanceDueBdt,
        grossCodUsd: currentOrder.balanceDueUsd,
        dispatchedAt: nowIso,
        deliveryFeeBdt: currentOrder.carrier === 'DHL_CARGO' ? 2400 : 150,
        courierCommissionBdt: Math.round(currentOrder.balanceDueBdt * 0.01),
        netSettledCashDueBdt: currentOrder.balanceDueBdt - (currentOrder.carrier === 'DHL_CARGO' ? 2400 : 150) - Math.round(currentOrder.balanceDueBdt * 0.01),
        settled: false
      };
      dispatchedList.unshift(entry);
      localStorage.setItem('hh_dispatched_shipments_v1', JSON.stringify(dispatchedList));
    } catch {
      // offline safe
    }

    setAwbModalOpen(true);
    showToast(`✓ Air Waybill Generated & Dispatched: ${awbId}`);
  };

  // ── WhatsApp Tracking Link Trigger ──
  const handleWhatsAppTracking = () => {
    if (!currentOrder) return;
    const cleanPhone = currentOrder.contactPhone.replace(/[^0-9]/g, '');
    const normalizedPhone =
      cleanPhone.startsWith('01') && cleanPhone.length === 11 ? '88' + cleanPhone : cleanPhone;

    const message = `*HANDS & HEAD ATELIER // DISPATCH NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear ${currentOrder.buyerName} (${currentOrder.buyerCompany}),

Your B2B Production Batch (*${currentOrder.poNumber}*) has completed final QC inspection and has been dispatched.

📦 *Consignment Details:*
• Style: ${currentOrder.styleName}
• Lot Size: ${currentOrder.approvedPcs} units
• Courier Carrier: ${currentOrder.carrier.replace('_', ' ')}
• Air Waybill / Consignment ID: *${currentOrder.awbConsignmentId || 'GENERATING'}*
• Live Tracking URL: ${currentOrder.trackingUrl || 'https://handsandhead.com/track'}

💰 *Settlement Summary:*
• 50% Advance Confirmed: ${currentOrder.currency === 'BDT' ? '৳' : '$'}${currentOrder.advancePaidBdt.toLocaleString()}
• *Balance Due upon Delivery:* *${currentOrder.currency === 'BDT' ? '৳' : '$'}${currentOrder.balanceDueBdt.toLocaleString()}*

Our dispatch team is monitoring your transit. Please inspect package seal upon delivery.

Hands & Head Atelier Operations
Dhaka, Bangladesh`;

    const desktopWaUrl = `whatsapp://send?phone=${normalizedPhone}&text=${encodeURIComponent(message)}`;
    const webWaUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

    try {
      const a = document.createElement('a');
      a.href = desktopWaUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(webWaUrl, '_blank', 'noopener,noreferrer');
    }

    showToast('✓ WhatsApp tracking payload dispatched to buyer!');
  };

  // ── WhatsApp Settlement Receipt Trigger ──
  const handleWhatsAppSettlementReceipt = () => {
    if (!currentOrder) return;
    const cleanPhone = currentOrder.contactPhone.replace(/[^0-9]/g, '');
    const normalizedPhone =
      cleanPhone.startsWith('01') && cleanPhone.length === 11 ? '88' + cleanPhone : cleanPhone;

    const message = `*HANDS & HEAD ATELIER // OFFICIAL PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━━━━━
Receipt No: REC-${currentOrder.poNumber}-${Date.now().toString().slice(-4)}
Buyer: ${currentOrder.buyerName} / ${currentOrder.buyerCompany}
PO Ref: *${currentOrder.poNumber}*

Total Order Value: ${currentOrder.currency === 'BDT' ? '৳' : '$'}${currentOrder.totalAmountBdt.toLocaleString()}
Advance Paid (50%): ${currentOrder.currency === 'BDT' ? '৳' : '$'}${currentOrder.advancePaidBdt.toLocaleString()}
Final Delivery Remittance: ${currentOrder.currency === 'BDT' ? '৳' : '$'}${currentOrder.balanceDueBdt.toLocaleString()}

*ACCOUNT STATUS: SETTLED IN FULL (100%)*
Thank you for your partnership. Your digital tech-pack archive and sizing blocks remain on file at the Atelier for seamless future replenishment.

Hands & Head Accounts Desk`;

    const desktopWaUrl = `whatsapp://send?phone=${normalizedPhone}&text=${encodeURIComponent(message)}`;
    window.location.href = desktopWaUrl;

    // Mark order settled in local state
    setOrders((prev) =>
      prev.map((o) =>
        o.id === currentOrder.id
          ? { ...o, settlementStatus: 'SETTLED_IN_FULL', settledAt: new Date().toISOString() }
          : o
      )
    );

    showToast('✓ 100% Settled Balance Receipt dispatched via WhatsApp!');
  };

  // ── Sanitized Job Ticket Copy ──
  const handleCopyJobTicket = () => {
    if (!currentOrder) return;
    const sizeStr = Object.entries(currentOrder.sizeBreakdown)
      .map(([sz, qty]) => `${sz}: ${qty}`)
      .join(' | ');

    const ticketText = `HANDS & HEAD MANUFACTURING ATELIER // SANITIZED FACTORY JOB TICKET
======================================================================
[CONFIDENTIAL DATA STRIPPED: Buyer Identity, Contact Numbers, FOB Rates & Margins Omitted]

JOB TICKET REF   : TICKET-${currentOrder.poNumber}
PO NUMBER        : ${currentOrder.poNumber}
WORKSHOP LINE    : ${currentOrder.workshopUnit.replace(/_/g, ' ')}
TARGET PACK DATE : ${currentOrder.targetPackDate}
TOTAL LOT SIZE   : ${currentOrder.lotSize} UNITS

GARMENT / PRODUCT SPECIFICATIONS:
----------------------------------------------------------------------
Style Name       : ${currentOrder.styleName}
Category         : ${currentOrder.category}
Colorway         : ${currentOrder.colorway}
Fabric / Leather : ${currentOrder.fabricLeatherSpec}
Trims & Hardware : ${currentOrder.trimsSpec}

SIZE RATIO MATRIX:
----------------------------------------------------------------------
${sizeStr}

MATERIAL CONSUMPTION ALLOCATION:
----------------------------------------------------------------------
Est. Consumption : ${currentOrder.consumptionKgPerUnit} kg/unit
Total Lot Fabric : ${currentOrder.totalConsumptionKg} kg allocated
Trims Status     : Checked & Issued

QUALITY CONTROL MANDATES:
----------------------------------------------------------------------
• Tolerances     : +/- 0.5 cm on chest/length.
• Stitch Pitch   : 12-14 SPI on seams; twin-needle topstitch.
• Defect Bar     : Immediate quarantine of shading or irregular ribs.
======================================================================
HANDS & HEAD ATELIER FLOOR SUPERVISION COPY`;

    navigator.clipboard.writeText(ticketText);
    showToast('✓ Confidential Factory Floor Ticket copied to clipboard!');
  };

  // ── Filtered Orders ──
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchWorkshop = filterWorkshop === 'ALL' || o.workshopUnit === filterWorkshop;
      const matchDispatch = filterDispatch === 'ALL' || o.dispatchStatus === filterDispatch;
      return matchWorkshop && matchDispatch;
    });
  }, [orders, filterWorkshop, filterDispatch]);

  return (
    <div className="w-full bg-[#0D0D0C] text-[#EAEAE6] font-sans border border-[#222220] rounded-lg shadow-2xl overflow-hidden">
      {/* ── Top Industrial Header ── */}
      <div className="bg-[#121211] border-b border-[#222220] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
            <span className="font-mono text-xs font-bold text-[#00E5FF] tracking-wider uppercase">
              [FLOOR_BRIDGE]
            </span>
          </div>
          <div className="h-4 w-px bg-[#262624]"></div>
          <div>
            <h1 className="text-sm font-bold text-[#F4F4F0] uppercase tracking-wide flex items-center gap-2">
              Production Floor &amp; Settlement Bridge
              <span className="text-[10px] bg-[#1F1F1D] text-[#A0A09B] px-2 py-0.5 rounded font-mono font-normal">
                v2.6.4 JIT EXECUTION
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Stats Pill */}
          <div className="hidden sm:flex items-center gap-3 bg-[#161615] border border-[#222220] rounded px-3 py-1 font-mono text-[11px]">
            <span className="text-[#888884]">ACTIVE ON FLOOR:</span>
            <span className="text-[#00E5FF] font-bold">
              {orders.filter((o) => o.dispatchStatus === 'ON_FLOOR').length}
            </span>
            <span className="text-[#2B2B28]">|</span>
            <span className="text-[#888884]">DISPATCHED:</span>
            <span className="text-[#00E599] font-bold">
              {orders.filter((o) => o.dispatchStatus === 'DISPATCHED').length}
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-xs font-mono text-[#888884] hover:text-[#EAEAE6] border border-[#2B2B28] rounded hover:border-[#444440] transition-colors"
            >
              ESC / CLOSE
            </button>
          )}
        </div>
      </div>

      {/* ── Main High-Density Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[640px]">
        {/* ── LEFT PANE: Ingested Cutting-Authorized PO Stream (4 Cols) ── */}
        <div className="lg:col-span-4 border-r border-[#222220] bg-[#111110] p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-[#A0A09B] uppercase tracking-wider">
              AUTHORIZED JIT CUTTING QUEUE
            </span>
            <span className="text-[10px] font-mono text-[#00E599] bg-[#00E599]/10 border border-[#00E599]/20 px-2 py-0.5 rounded">
              50% ADVANCE VERIFIED
            </span>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterWorkshop}
              onChange={(e) => setFilterWorkshop(e.target.value)}
              className="bg-[#161615] border border-[#222220] text-[11px] text-[#A0A09B] font-mono rounded px-2 py-1 outline-none focus:border-[#00E5FF]"
            >
              <option value="ALL">All Workshops</option>
              <option value="KNIT_HEAVY_FLEECE">Knit &amp; Heavy Fleece</option>
              <option value="SCREEN_PRINT_EMBROIDERY">Screen-Print Lab</option>
              <option value="LEATHER_ATELIER_HARDWARE">Leather Atelier</option>
            </select>

            <select
              value={filterDispatch}
              onChange={(e) => setFilterDispatch(e.target.value)}
              className="bg-[#161615] border border-[#222220] text-[11px] text-[#A0A09B] font-mono rounded px-2 py-1 outline-none focus:border-[#00E5FF]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ON_FLOOR">On Floor</option>
              <option value="DISPATCHED">Dispatched</option>
            </select>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[600px]">
            {filteredOrders.map((order) => {
              const isSelected = order.id === currentOrder?.id;
              const completedCheckpoints = Object.values(order.checkpoints).filter(Boolean).length;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedPoId(order.id)}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#181817] border-[#00E5FF] shadow-sm'
                      : 'bg-[#141413] border-[#222220] hover:border-[#333330]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#00E5FF]">
                        {order.poNumber}
                      </span>
                      <span className="text-xs text-[#EAEAE6] font-medium block truncate max-w-[200px]">
                        {order.styleName}
                      </span>
                      <span className="text-[10px] text-[#777772] block">
                        {order.buyerCompany} ({order.lotSize} pcs)
                      </span>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                          order.dispatchStatus === 'DISPATCHED'
                            ? 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30'
                            : 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30'
                        }`}
                      >
                        {order.dispatchStatus}
                      </span>
                      <div className="text-[10px] text-[#FF5500] mt-1">
                        Due: {order.currency === 'BDT' ? '৳' : '$'}
                        {order.balanceDueBdt.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[9px] font-mono text-[#777772] mb-1">
                      <span>FLOOR PROGRESS</span>
                      <span>{completedCheckpoints} / 5 STAGES</span>
                    </div>
                    <div className="w-full bg-[#222220] h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          completedCheckpoints === 5 ? 'bg-[#00E599]' : 'bg-[#00E5FF]'
                        }`}
                        style={{ width: `${(completedCheckpoints / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="text-center py-10 font-mono text-xs text-[#777772]">
                No orders match current filters.
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: Operations, Checkpoints, QC, Dispatch & Settlement (8 Cols) ── */}
        {currentOrder ? (
          <div className="lg:col-span-8 p-4 bg-[#0D0D0C] flex flex-col gap-4 overflow-y-auto max-h-[85vh]">
            {/* 1. Sub-contract & Routing Header */}
            <div className="bg-[#141413] border border-[#222220] rounded p-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1F1F1D]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/30">
                      ACTIVE PO: {currentOrder.poNumber}
                    </span>
                    <span className="font-mono text-[11px] text-[#A0A09B]">
                      TARGET PACK: {currentOrder.targetPackDate}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-[#F4F4F0] mt-1">
                    {currentOrder.styleName}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setJobTicketModalOpen(true)}
                    className="px-3 py-1.5 bg-[#1F1F1D] hover:bg-[#282825] text-[#00E5FF] border border-[#00E5FF]/40 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>📄 SANITIZED JOB TICKET</span>
                  </button>
                  <button
                    onClick={handleCopyJobTicket}
                    className="px-2.5 py-1.5 bg-[#161615] hover:bg-[#222220] text-[#EAEAE6] border border-[#2B2B28] rounded text-xs font-mono transition-colors"
                    title="Copy sanitized ticket text"
                  >
                    COPY TICKET
                  </button>
                </div>
              </div>

              {/* Workshop Assignment & Tech Consumption Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <div>
                  <label className="text-[10px] font-mono text-[#777772] uppercase block mb-1">
                    WORKSHOP ASSIGNMENT
                  </label>
                  <select
                    value={currentOrder.workshopUnit}
                    onChange={(e) => handleWorkshopChange(e.target.value as WorkshopUnit)}
                    className="w-full bg-[#181817] border border-[#2B2B28] rounded px-2.5 py-1.5 text-xs text-[#00E5FF] font-mono font-bold outline-none focus:border-[#00E5FF]"
                  >
                    <option value="KNIT_HEAVY_FLEECE">Knit &amp; Heavy Fleece Line</option>
                    <option value="SCREEN_PRINT_EMBROIDERY">Screen-Print &amp; Embroidery Lab</option>
                    <option value="LEATHER_ATELIER_HARDWARE">Leather Atelier &amp; Hardware Assembly</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#777772] uppercase block mb-1">
                    FABRIC CONSUMPTION (KG)
                  </label>
                  <div className="bg-[#181817] border border-[#222220] rounded px-2.5 py-1.5 text-xs font-mono text-[#EAEAE6] flex justify-between items-center">
                    <span>{currentOrder.totalConsumptionKg} kg total</span>
                    <span className="text-[10px] text-[#777772]">
                      ({currentOrder.consumptionKgPerUnit} kg/pc)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#777772] uppercase block mb-1">
                    LOT RATIO MATRIX
                  </label>
                  <div className="bg-[#181817] border border-[#222220] rounded px-2.5 py-1.5 text-[11px] font-mono text-[#EAEAE6] truncate">
                    {Object.entries(currentOrder.sizeBreakdown)
                      .map(([s, q]) => `${s}:${q}`)
                      .join(' ')}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 5-Stage Physical Progress Checkpoints */}
            <div className="bg-[#141413] border border-[#222220] rounded p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#A0A09B] uppercase tracking-wider">
                  5-STAGE PHYSICAL PROGRESS CHECKPOINTS
                </span>
                <span className="text-[10px] font-mono text-[#777772]">
                  CLICK CHECKPOINT TO TOGGLE PRODUCTION MILESTONE
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {/* 1. Fabric/Leather Released */}
                <button
                  onClick={() => handleToggleCheckpoint('FABRIC_RELEASED')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    currentOrder.checkpoints.fabricReleased
                      ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-[#00E5FF]'
                      : 'bg-[#181817] border-[#222220] text-[#777772] hover:border-[#333330]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span>STAGE 1</span>
                    <span>{currentOrder.checkpoints.fabricReleased ? '✓ PASS' : '○ WAIT'}</span>
                  </div>
                  <div className="text-xs font-bold mt-1">Fabric Released</div>
                  <div className="text-[9px] font-mono opacity-70 mt-1 truncate">
                    {currentOrder.checkpoints.fabricReleasedAt
                      ? new Date(currentOrder.checkpoints.fabricReleasedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Pending roll issue'}
                  </div>
                </button>

                {/* 2. Cutting Completed */}
                <button
                  onClick={() => handleToggleCheckpoint('CUTTING_COMPLETED')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    currentOrder.checkpoints.cuttingCompleted
                      ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-[#00E5FF]'
                      : 'bg-[#181817] border-[#222220] text-[#777772] hover:border-[#333330]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span>STAGE 2</span>
                    <span>{currentOrder.checkpoints.cuttingCompleted ? '✓ PASS' : '○ WAIT'}</span>
                  </div>
                  <div className="text-xs font-bold mt-1">Cutting Done</div>
                  <div className="text-[9px] font-mono opacity-70 mt-1 truncate">
                    {currentOrder.checkpoints.cuttingCompletedAt
                      ? new Date(currentOrder.checkpoints.cuttingCompletedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'On cutting table'}
                  </div>
                </button>

                {/* 3. Print/Stitch Passed */}
                <button
                  onClick={() => handleToggleCheckpoint('PRINT_STITCH_PASSED')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    currentOrder.checkpoints.printStitchPassed
                      ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-[#00E5FF]'
                      : 'bg-[#181817] border-[#222220] text-[#777772] hover:border-[#333330]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span>STAGE 3</span>
                    <span>{currentOrder.checkpoints.printStitchPassed ? '✓ PASS' : '○ WAIT'}</span>
                  </div>
                  <div className="text-xs font-bold mt-1">Print / Stitch</div>
                  <div className="text-[9px] font-mono opacity-70 mt-1 truncate">
                    {currentOrder.checkpoints.printStitchPassedAt
                      ? new Date(currentOrder.checkpoints.printStitchPassedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'In lab stitch line'}
                  </div>
                </button>

                {/* 4. QC Inspected */}
                <button
                  onClick={() => handleToggleCheckpoint('QC_INSPECTED')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    currentOrder.checkpoints.qcInspected
                      ? 'bg-[#00E599]/15 border-[#00E599] text-[#00E599]'
                      : 'bg-[#181817] border-[#222220] text-[#777772] hover:border-[#333330]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span>STAGE 4</span>
                    <span>{currentOrder.checkpoints.qcInspected ? '✓ QC PASS' : '○ WAIT'}</span>
                  </div>
                  <div className="text-xs font-bold mt-1">QC Inspected</div>
                  <div className="text-[9px] font-mono opacity-70 mt-1 truncate">
                    {currentOrder.checkpoints.qcInspectedAt
                      ? `Yield: ${currentOrder.qcYieldPct}%`
                      : 'Awaiting QC audit'}
                  </div>
                </button>

                {/* 5. Packed & Ready */}
                <button
                  onClick={() => handleToggleCheckpoint('PACKED_READY')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    currentOrder.checkpoints.packedReady
                      ? 'bg-[#00E599]/15 border-[#00E599] text-[#00E599]'
                      : 'bg-[#181817] border-[#222220] text-[#777772] hover:border-[#333330]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span>STAGE 5</span>
                    <span>{currentOrder.checkpoints.packedReady ? '✓ PACKED' : '○ WAIT'}</span>
                  </div>
                  <div className="text-xs font-bold mt-1">Packed &amp; Ready</div>
                  <div className="text-[9px] font-mono opacity-70 mt-1 truncate">
                    {currentOrder.checkpoints.packedReadyAt
                      ? 'Polybagged & Boxed'
                      : 'Awaiting polybag'}
                  </div>
                </button>
              </div>

              {/* QC Metrics & Production Surplus Logger */}
              <div className="mt-3 pt-3 border-t border-[#1F1F1D] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-mono text-[#777772] uppercase block mb-1">
                    APPROVED PCS
                  </label>
                  <input
                    type="number"
                    value={currentOrder.approvedPcs}
                    onChange={(e) =>
                      handleUpdateQcMetrics(Number(e.target.value) || 0, currentOrder.defectRejects)
                    }
                    className="w-full bg-[#181817] border border-[#2B2B28] rounded px-2 py-1 text-xs text-[#00E599] font-mono font-bold outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-mono text-[#FF2A55] uppercase block mb-1">
                    DEFECT REJECTS
                  </label>
                  <input
                    type="number"
                    value={currentOrder.defectRejects}
                    onChange={(e) =>
                      handleUpdateQcMetrics(currentOrder.approvedPcs, Number(e.target.value) || 0)
                    }
                    className="w-full bg-[#181817] border border-[#2B2B28] rounded px-2 py-1 text-xs text-[#FF2A55] font-mono font-bold outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-mono text-[#777772] uppercase block mb-1">
                    QC YIELD RATIO
                  </label>
                  <div className="bg-[#181817] border border-[#222220] rounded px-2 py-1 text-xs font-mono text-[#EAEAE6] flex items-center justify-between">
                    <span
                      className={`font-bold ${
                        currentOrder.qcYieldPct >= 98
                          ? 'text-[#00E599]'
                          : currentOrder.qcYieldPct >= 95
                          ? 'text-[#00E5FF]'
                          : 'text-[#FF2A55]'
                      }`}
                    >
                      {currentOrder.qcYieldPct}%
                    </span>
                    <span className="text-[10px] text-[#777772]">
                      Target: {currentOrder.lotSize} pcs
                    </span>
                  </div>
                </div>

                {/* Overrun Vault Action */}
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-mono text-[#FF5500] uppercase block mb-1">
                    SURPLUS OVERRUN
                  </label>
                  {currentOrder.approvedPcs > currentOrder.lotSize ? (
                    <button
                      onClick={handlePushSurplusToVault}
                      className="w-full py-1.5 px-2 bg-[#FF5500]/15 hover:bg-[#FF5500]/25 text-[#FF5500] border border-[#FF5500]/40 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>⚡ PUSH TO CLEARANCE VAULT</span>
                    </button>
                  ) : (
                    <div className="text-[10px] font-mono text-[#777772] py-1">
                      No overrun (Exact lot)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. 1-Click Courier Dispatch & Air Waybill Dock */}
            <div className="bg-[#141413] border border-[#222220] rounded p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-bold text-[#A0A09B] uppercase tracking-wider">
                  COURIER DISPATCH &amp; AIR WAYBILL (AWB) DOCK
                </span>
                <span className="text-[10px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/20">
                  AUTO-CALCULATED COD BALANCE
                </span>
              </div>

              {/* Carrier Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { key: 'STEADFAST', label: 'Steadfast Logistics' },
                  { key: 'PATHAO', label: 'Pathao Courier' },
                  { key: 'REDX', label: 'RedX Logistics' },
                  { key: 'DHL_CARGO', label: 'DHL / B2B Air Cargo' }
                ].map((c) => (
                  <button
                    key={c.key}
                    onClick={() => handleCarrierChange(c.key as CourierCarrier)}
                    className={`py-1.5 px-2 text-xs font-mono font-bold rounded border transition-all ${
                      currentOrder.carrier === c.key
                        ? 'bg-[#00E5FF] text-black border-[#00E5FF]'
                        : 'bg-[#181817] text-[#A0A09B] border-[#262624] hover:border-[#383835]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Auto-Populated Dispatch Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#111110] border border-[#1F1F1D] rounded p-2.5">
                <div>
                  <span className="text-[9px] font-mono text-[#777772] uppercase block">
                    RECIPIENT &amp; PHONE
                  </span>
                  <span className="text-xs text-[#EAEAE6] font-medium block">
                    {currentOrder.buyerName} ({currentOrder.buyerCompany})
                  </span>
                  <span className="text-[11px] font-mono text-[#00E5FF] block">
                    {currentOrder.contactPhone}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-[#777772] uppercase block">
                    DELIVERY ADDRESS
                  </span>
                  <span className="text-xs text-[#EAEAE6] font-medium line-clamp-2" title={currentOrder.deliveryAddress}>
                    {currentOrder.deliveryAddress}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-[#777772] uppercase block">
                    TOTAL ESTIMATED WEIGHT (KG)
                  </span>
                  <span className="text-xs font-mono text-[#00E599] font-bold block">
                    {currentOrder.totalConsumptionKg} kg (~
                    {Math.round(currentOrder.totalConsumptionKg / 15)} carton boxes)
                  </span>
                </div>
              </div>

              {/* COD Balance Due and Dispatch Actions */}
              <div className="mt-3 pt-3 border-t border-[#1F1F1D] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-[#777772] uppercase block">
                      COD BALANCE COLLECTION
                    </span>
                    <span className="text-base font-mono font-bold text-[#FF5500]">
                      {currentOrder.currency === 'BDT' ? '৳' : '$'}
                      {currentOrder.balanceDueBdt.toLocaleString()}
                    </span>
                  </div>
                  {currentOrder.awbConsignmentId && (
                    <div className="border-l border-[#262624] pl-3">
                      <span className="text-[10px] font-mono text-[#777772] uppercase block">
                        ACTIVE AWB ID
                      </span>
                      <span className="text-xs font-mono font-bold text-[#00E5FF]">
                        {currentOrder.awbConsignmentId}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDispatchShipment}
                    className="px-3.5 py-2 bg-[#00E5FF] hover:bg-[#00c9e0] text-black font-mono font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    <span>🚀 DISPATCH SHIPMENT &amp; GENERATE AWB</span>
                  </button>

                  <button
                    onClick={handleWhatsAppTracking}
                    className="px-3 py-2 bg-[#00E599] hover:bg-[#00c985] text-black font-mono font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    <span>💬 WHATSAPP TRACKING TO BUYER</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Remaining Balance Settlement Ledger */}
            <div className="bg-[#141413] border border-[#222220] rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#A0A09B] uppercase tracking-wider">
                  REMAINING BALANCE SETTLEMENT LEDGER
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    currentOrder.settlementStatus === 'SETTLED_IN_FULL'
                      ? 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30'
                      : 'bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30'
                  }`}
                >
                  {currentOrder.settlementStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#111110] p-2.5 rounded border border-[#1F1F1D] font-mono text-xs mb-3">
                <div>
                  <span className="text-[10px] text-[#777772] block">TOTAL ORDER AMOUNT</span>
                  <span className="text-sm font-bold text-[#EAEAE6]">
                    {currentOrder.currency === 'BDT' ? '৳' : '$'}
                    {currentOrder.totalAmountBdt.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#777772] block">ADVANCE PAID (50%)</span>
                  <span className="text-sm font-bold text-[#00E599]">
                    {currentOrder.currency === 'BDT' ? '৳' : '$'}
                    {currentOrder.advancePaidBdt.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#777772] block">BALANCE DUE AT DELIVERY</span>
                  <span className="text-sm font-bold text-[#FF5500]">
                    {currentOrder.currency === 'BDT' ? '৳' : '$'}
                    {currentOrder.balanceDueBdt.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#777772] block">COURIER REMITTANCE</span>
                  <span className="text-xs font-bold text-[#A0A09B] block">
                    {currentOrder.carrier.replace('_', ' ')} COD
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1F1F1D]">
                <div className="text-[11px] font-mono text-[#777772]">
                  {currentOrder.settledAt ? (
                    <span className="text-[#00E599]">
                      ✓ Fully settled on {new Date(currentOrder.settledAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span>Pending courier collection &amp; bank deposit</span>
                  )}
                </div>

                <button
                  onClick={handleWhatsAppSettlementReceipt}
                  className="px-3 py-1.5 bg-[#1F1F1D] hover:bg-[#282825] text-[#00E599] border border-[#00E599]/40 rounded text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
                >
                  <span>🧾 1-CLICK BALANCE RECEIPT &amp; THANK YOU NOTE</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 flex items-center justify-center p-12 text-center text-[#777772] font-mono text-xs">
            Select an order from the authorized queue to view production floor and settlement controls.
          </div>
        )}
      </div>

      {/* ── MODAL 1: Sanitized Factory Floor Job Ticket ── */}
      {jobTicketModalOpen && currentOrder && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setJobTicketModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#141413] border border-[#00E5FF]/40 rounded-lg shadow-2xl p-5 font-mono text-xs text-[#EAEAE6] space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2B2B28] pb-3">
              <div>
                <span className="text-[10px] text-[#00E5FF] font-bold tracking-widest uppercase">
                  HANDS &amp; HEAD ATELIER // FACTORY FLOOR
                </span>
                <h3 className="text-sm font-bold text-white uppercase">
                  CONFIDENTIAL SANITIZED JOB TICKET
                </h3>
              </div>
              <button
                onClick={() => setJobTicketModalOpen(false)}
                className="text-[#888884] hover:text-white text-xs px-2 py-1 border border-[#2B2B28] rounded"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Redacted warning banner */}
            <div className="p-2.5 bg-[#FF5500]/10 border border-[#FF5500]/30 rounded text-[11px] text-[#FF5500]">
              ⚠ CONFIDENTIAL DATA STRIPPED: Buyer Identity, Contact Numbers, FOB Rates &amp; Margins have
              been scrubbed for factory floor confidentiality.
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#0D0D0C] p-3 rounded border border-[#222220]">
              <div>
                <span className="text-[#777772] block">JOB TICKET REF:</span>
                <span className="text-white font-bold">TICKET-{currentOrder.poNumber}</span>
              </div>
              <div>
                <span className="text-[#777772] block">PRODUCTION PO:</span>
                <span className="text-[#00E5FF] font-bold">{currentOrder.poNumber}</span>
              </div>
              <div>
                <span className="text-[#777772] block">WORKSHOP UNIT:</span>
                <span className="text-white">{currentOrder.workshopUnit.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-[#777772] block">TARGET PACK DATE:</span>
                <span className="text-[#00E599] font-bold">{currentOrder.targetPackDate}</span>
              </div>
            </div>

            <div>
              <span className="text-[#777772] block uppercase text-[10px] mb-1">
                STYLE &amp; FABRIC REQUIREMENTS
              </span>
              <div className="bg-[#0D0D0C] p-3 rounded border border-[#222220] space-y-1 text-xs">
                <div>
                  <span className="text-[#888884]">Style Name:</span>{' '}
                  <span className="text-white font-bold">{currentOrder.styleName}</span>
                </div>
                <div>
                  <span className="text-[#888884]">Category:</span>{' '}
                  <span className="text-white">{currentOrder.category}</span>
                </div>
                <div>
                  <span className="text-[#888884]">Colorway:</span>{' '}
                  <span className="text-white">{currentOrder.colorway}</span>
                </div>
                <div>
                  <span className="text-[#888884]">Fabric / Leather Spec:</span>{' '}
                  <span className="text-white">{currentOrder.fabricLeatherSpec}</span>
                </div>
                <div>
                  <span className="text-[#888884]">Trims &amp; Hardware:</span>{' '}
                  <span className="text-white">{currentOrder.trimsSpec}</span>
                </div>
                <div>
                  <span className="text-[#888884]">Fabric Weight Allocation:</span>{' '}
                  <span className="text-[#00E5FF] font-bold">{currentOrder.totalConsumptionKg} kg</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[#777772] block uppercase text-[10px] mb-1">
                SIZE RATIO MATRIX (TOTAL: {currentOrder.lotSize} PCS)
              </span>
              <div className="grid grid-cols-5 gap-2 text-center bg-[#0D0D0C] p-2.5 rounded border border-[#222220]">
                {Object.entries(currentOrder.sizeBreakdown).map(([sz, qty]) => (
                  <div key={sz} className="p-1.5 bg-[#161615] rounded border border-[#2B2B28]">
                    <div className="text-[10px] text-[#777772]">{sz}</div>
                    <div className="text-sm font-bold text-white">{qty}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2B2B28]">
              <button
                onClick={handleCopyJobTicket}
                className="px-4 py-2 bg-[#00E5FF] text-black font-bold text-xs rounded hover:bg-[#00c9e0] transition-colors"
              >
                COPY SANITIZED TICKET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: AWB Generated Modal ── */}
      {awbModalOpen && currentOrder && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setAwbModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#141413] border border-[#00E599]/50 rounded-lg shadow-2xl p-5 font-mono text-xs text-[#EAEAE6] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2B2B28] pb-3">
              <div>
                <span className="text-[10px] text-[#00E599] font-bold uppercase tracking-wider">
                  CONSIGNMENT DISPATCH CONFIRMED
                </span>
                <h3 className="text-base font-bold text-white">AIR WAYBILL GENERATED</h3>
              </div>
              <button
                onClick={() => setAwbModalOpen(false)}
                className="text-[#888884] hover:text-white text-xs px-2 py-1 border border-[#2B2B28] rounded"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#0D0D0C] p-4 rounded border border-[#222220] space-y-2 text-center">
              <div className="text-[10px] text-[#777772] uppercase">CONSIGNMENT TRACKING ID</div>
              <div className="text-xl font-bold text-[#00E5FF]">{currentOrder.awbConsignmentId}</div>
              <div className="text-2xl font-barcode py-2 tracking-widest text-[#EAEAE6]">
                {currentOrder.awbBarcode}
              </div>
              <div className="text-[11px] text-[#A0A09B]">
                Carrier: <span className="text-white font-bold">{currentOrder.carrier}</span>
              </div>
              <div className="text-[11px] text-[#FF5500]">
                COD Payable at Delivery:{' '}
                <span className="font-bold">
                  {currentOrder.currency === 'BDT' ? '৳' : '$'}
                  {currentOrder.balanceDueBdt.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAwbModalOpen(false);
                  handleWhatsAppTracking();
                }}
                className="flex-1 py-2 bg-[#00E599] text-black font-bold text-xs rounded hover:bg-[#00c985] transition-colors"
              >
                DISPATCH TO WHATSAPP
              </button>
              <button
                onClick={() => setAwbModalOpen(false)}
                className="px-4 py-2 bg-[#181817] text-white border border-[#2B2B28] rounded text-xs hover:bg-[#222220] transition-colors"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification Bar ── */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-[11000] bg-[#161615] border border-[#00E5FF] text-[#EAEAE6] px-4 py-2.5 rounded shadow-2xl font-mono text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ProductionFloorAndSettlementBridge;
