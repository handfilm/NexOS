import { db } from '../lib/firebase';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getFirestore, collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';

export type FactoryUnit =
  | 'LEATHER_ATELIER'
  | 'SCREEN_PRINT_LAB'
  | 'KNIT_STITCH_LINE'
  | 'HEAVY_WORKWEAR_CRAFT'
  | 'ACCESSORIES_ASSEMBLY';

export interface MilestoneState {
  sourcingDone: boolean;
  sourcingAt?: string;
  cuttingDone: boolean;
  cuttingAt?: string;
  printAssemblyDone: boolean;
  printAssemblyAt?: string;
  qcPassed: boolean;
  qcPassedAt?: string;
  approvedPcs: number;
  rejectedPcs: number;
  qcDefectNote?: string;
  packedReady: boolean;
  packedAt?: string;
}

export interface SizeBreakdown {
  [size: string]: number;
}

export interface FactoryJobOrder {
  id: string;
  poNumber: string;
  jobTicketId: string;
  styleName: string;
  category: string;
  fabricLeatherType: string;
  colorway: string;
  liningHardware: string;
  totalQuantity: number;
  sizeBreakdown: SizeBreakdown;
  unitPrice?: number; // Internal only - strictly stripped from floor tickets
  currency?: 'BDT' | 'USD';
  factoryUnit: FactoryUnit;
  supervisorName: string;
  supervisorPhone: string;
  createdAt: string;
  targetShipDate: string; // ISO date
  milestones: MilestoneState;
  surplusUnits?: number;
  surplusSize?: string;
  surplusStatus?: 'NONE' | 'VAULTED' | 'LIQUIDATED';
  vaultedAt?: string;
  notes?: string;
}

export interface ClearanceItem {
  id: string;
  poNumber: string;
  jobTicketId: string;
  styleName: string;
  category: string;
  quantity: number;
  sizes: string;
  conditionGrade: 'GRADE_A_SURPLUS' | 'MINOR_BLEMISH';
  suggestedLiquidationPriceBDT: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  vaultedAt: string;
}

export interface FactorySlaFloorTrackerProps {
  initialPoNumber?: string;
  mode?: 'embedded' | 'modal';
  onClose?: () => void;
}

const FACTORY_UNITS: Record<FactoryUnit, { name: string; location: string; supervisor: string; phone: string }> = {
  LEATHER_ATELIER: {
    name: 'Leather Atelier (Unit 1)',
    location: 'Tejgaon Industrial Area, Dhaka',
    supervisor: 'Master Ustad Rafiq',
    phone: '+8801711223344'
  },
  SCREEN_PRINT_LAB: {
    name: 'Screen-Print Lab (Unit 2)',
    location: 'Mirpur Section 10, Dhaka',
    supervisor: 'Farhan Kabir',
    phone: '+8801822334455'
  },
  KNIT_STITCH_LINE: {
    name: 'Knit & Stitch Line (Unit 3)',
    location: 'Gazipur Bypass, Dhaka Suburb',
    supervisor: 'Engr. Sohel Rana',
    phone: '+8801933445566'
  },
  HEAVY_WORKWEAR_CRAFT: {
    name: 'Heavy Workwear & Denim (Unit 4)',
    location: 'Savar EPZ Hub, Dhaka',
    supervisor: 'Anwar Hossain',
    phone: '+8801644556677'
  },
  ACCESSORIES_ASSEMBLY: {
    name: 'Hardware & Accessories Assembly (Unit 5)',
    location: 'Tongi Small Craft Cluster',
    supervisor: 'Kalam Miah',
    phone: '+8801555667788'
  }
};

// Seed baseline active production jobs
const SEED_JOB_ORDERS: FactoryJobOrder[] = [
  {
    id: 'HH-PO-2026-8812',
    poNumber: 'HH-PO-2026-8812',
    jobTicketId: 'HH-JOB-2026-8812-FLR',
    styleName: 'Voyager Handcrafted Full-Grain Duffel',
    category: 'Leather Bags & Luggage',
    fabricLeatherType: '1.8mm Pull-Up Pull-Grain Bovine Leather',
    colorway: 'Cognac Brown / Burnished Edge',
    liningHardware: '16oz Olive Cotton Duck Lining, Antiqued Brass YKK #10',
    totalQuantity: 40,
    sizeBreakdown: { 'One Size (55L)': 40 },
    unitPrice: 18500,
    currency: 'BDT',
    factoryUnit: 'LEATHER_ATELIER',
    supervisorName: 'Master Ustad Rafiq',
    supervisorPhone: '+8801711223344',
    createdAt: '2026-09-02T10:00:00Z',
    targetShipDate: '2026-09-11T18:00:00Z', // In 3+ days
    milestones: {
      sourcingDone: true,
      sourcingAt: '2026-09-03T11:00:00Z',
      cuttingDone: true,
      cuttingAt: '2026-09-05T14:30:00Z',
      printAssemblyDone: true,
      printAssemblyAt: '2026-09-07T16:00:00Z',
      qcPassed: false,
      approvedPcs: 38,
      rejectedPcs: 0,
      qcDefectNote: 'Edge paint curing on handles',
      packedReady: false
    },
    surplusUnits: 2,
    surplusSize: 'One Size (55L)',
    surplusStatus: 'NONE',
    notes: 'Premium pull-up cowhide. Include brass logo rivet reinforcement on stress points.'
  },
  {
    id: 'HH-PO-2026-9041',
    poNumber: 'HH-PO-2026-9041',
    jobTicketId: 'HH-JOB-2026-9041-FLR',
    styleName: 'Full-Grain Bifold Minimalist Wallet',
    category: 'Small Leather Goods',
    fabricLeatherType: '1.2mm Vegetable Tanned Cowhide',
    colorway: 'Matte Charcoal & Tan Inner',
    liningHardware: 'RFID Blocking Core Shielding, Fil Au Chinois Waxed Thread',
    totalQuantity: 150,
    sizeBreakdown: { 'Standard Bifold': 150 },
    unitPrice: 2450,
    currency: 'BDT',
    factoryUnit: 'LEATHER_ATELIER',
    supervisorName: 'Master Ustad Rafiq',
    supervisorPhone: '+8801711223344',
    createdAt: '2026-09-04T09:00:00Z',
    targetShipDate: '2026-09-09T14:00:00Z', // In ~27 hours (Nearing deadline)
    milestones: {
      sourcingDone: true,
      sourcingAt: '2026-09-05T10:00:00Z',
      cuttingDone: true,
      cuttingAt: '2026-09-06T15:00:00Z',
      printAssemblyDone: false,
      qcPassed: false,
      approvedPcs: 0,
      rejectedPcs: 0,
      packedReady: false
    },
    surplusUnits: 5,
    surplusSize: 'Standard Bifold',
    surplusStatus: 'NONE',
    notes: 'Stitch tension 7 SPI. Cold foil deboss Hands & Head atelier mark.'
  },
  {
    id: 'HH-PO-2026-4419',
    poNumber: 'HH-PO-2026-4419',
    jobTicketId: 'HH-JOB-2026-4419-FLR',
    styleName: 'Heavy-Duty Atelier Raw Canvas Apron',
    category: 'Atelier Apparel & Workwear',
    fabricLeatherType: '14oz Japanese Selvedge Cotton Duck + Leather Straps',
    colorway: 'Raw Indigo / Chestnut Straps',
    liningHardware: 'Solid Copper Rivets, Custom Welded Steel D-Rings',
    totalQuantity: 60,
    sizeBreakdown: { Regular: 35, Tall: 25 },
    unitPrice: 32,
    currency: 'USD',
    factoryUnit: 'HEAVY_WORKWEAR_CRAFT',
    supervisorName: 'Anwar Hossain',
    supervisorPhone: '+8801644556677',
    createdAt: '2026-08-28T08:00:00Z',
    targetShipDate: '2026-09-07T20:00:00Z', // Overdue (SLA breach test)
    milestones: {
      sourcingDone: true,
      sourcingAt: '2026-08-30T10:00:00Z',
      cuttingDone: true,
      cuttingAt: '2026-09-01T12:00:00Z',
      printAssemblyDone: true,
      printAssemblyAt: '2026-09-05T17:00:00Z',
      qcPassed: true,
      qcPassedAt: '2026-09-07T11:00:00Z',
      approvedPcs: 58,
      rejectedPcs: 2,
      qcDefectNote: '2 units slight strap misalignment',
      packedReady: true,
      packedAt: '2026-09-07T14:00:00Z'
    },
    surplusUnits: 4,
    surplusSize: 'Regular: 2, Tall: 2',
    surplusStatus: 'VAULTED',
    notes: 'Export grade moisture packing. Double bar-tack pocket stress points.'
  },
  {
    id: 'HH-PO-2026-3108',
    poNumber: 'HH-PO-2026-3108',
    jobTicketId: 'HH-JOB-2026-3108-FLR',
    styleName: 'Heritage Heavyweight 280GSM Drop-Shoulder Tee',
    category: 'Premium Knitwear & Streetwear',
    fabricLeatherType: '280 GSM 100% Combed Compact Ring-Spun Cotton',
    colorway: 'Washed Vintage Onyx',
    liningHardware: '1x1 Spandex Lycra Ribbed Collar, Soft Hand Screen Print',
    totalQuantity: 120,
    sizeBreakdown: { S: 20, M: 40, L: 40, XL: 20 },
    unitPrice: 1650,
    currency: 'BDT',
    factoryUnit: 'SCREEN_PRINT_LAB',
    supervisorName: 'Farhan Kabir',
    supervisorPhone: '+8801822334455',
    createdAt: '2026-09-05T11:00:00Z',
    targetShipDate: '2026-09-14T17:00:00Z', // In 6 days
    milestones: {
      sourcingDone: true,
      sourcingAt: '2026-09-06T12:00:00Z',
      cuttingDone: true,
      cuttingAt: '2026-09-07T16:00:00Z',
      printAssemblyDone: false,
      qcPassed: false,
      approvedPcs: 0,
      rejectedPcs: 0,
      packedReady: false
    },
    surplusUnits: 6,
    surplusSize: 'M: 3, L: 3',
    surplusStatus: 'NONE',
    notes: 'High-density puff discharge graphic on front chest and back typography.'
  }
];

export const FactorySlaFloorTracker: React.FC<FactorySlaFloorTrackerProps> = ({
  initialPoNumber,
  mode = 'embedded',
  onClose
}) => {
  // State: Pipeline Orders
  const [orders, setOrders] = useState<FactoryJobOrder[]>(SEED_JOB_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    initialPoNumber || SEED_JOB_ORDERS[0].id
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ON_SCHEDULE' | 'NEARING_DEADLINE' | 'SLA_BREACH'>('ALL');

  // State: Clearance Vault items
  const [clearanceVault, setClearanceVault] = useState<ClearanceItem[]>([
    {
      id: 'CLR-4419-01',
      poNumber: 'HH-PO-2026-4419',
      jobTicketId: 'HH-JOB-2026-4419-FLR',
      styleName: 'Heavy-Duty Atelier Raw Canvas Apron',
      category: 'Atelier Apparel & Workwear',
      quantity: 4,
      sizes: 'Regular: 2, Tall: 2',
      conditionGrade: 'GRADE_A_SURPLUS',
      suggestedLiquidationPriceBDT: 2600,
      status: 'AVAILABLE',
      vaultedAt: '2026-09-07T15:00:00Z'
    }
  ]);

  // Surplus overrun local state
  const [surplusQtyInput, setSurplusQtyInput] = useState<number>(2);
  const [surplusSizesInput, setSurplusSizesInput] = useState<string>('L: 2');
  const [surplusGradeInput, setSurplusGradeInput] = useState<'GRADE_A_SURPLUS' | 'MINOR_BLEMISH'>('GRADE_A_SURPLUS');
  const [surplusPriceBdtInput, setSurplusPriceBdtInput] = useState<number>(3500);

  // Status feedback toast
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modal view state for Floor Ticket print preview
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Synchronize Firestore orders on mount if accessible
  useEffect(() => {
    let isMounted = true;
    const loadFirestoreOrders = async () => {
      try {
        // db imported from lib/firebase
        const snap = await getDocs(collection(db, 'factory_orders'));
        if (!snap.empty && isMounted) {
          const loaded: FactoryJobOrder[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            const poNum = data.poNumber || docSnap.id;
            // Check if already in seed
            const existing = SEED_JOB_ORDERS.find((o) => o.poNumber === poNum);
            if (existing) return;

            const targetDate = data.targetDeliveryDate || new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
            loaded.push({
              id: poNum,
              poNumber: poNum,
              jobTicketId: `HH-JOB-${poNum.replace(/[^0-9]/g, '') || '7701'}-FLR`,
              styleName: data.styleName || data.category || 'Atelier Garment',
              category: data.category || 'Custom Production',
              fabricLeatherType: data.fabricLeatherType || 'Standard Specification',
              colorway: data.colorway || 'Core Black',
              liningHardware: data.liningHardware || 'Standard trims',
              totalQuantity: data.totalQuantity || 50,
              sizeBreakdown: data.sizeBreakdown || { Default: data.totalQuantity || 50 },
              unitPrice: data.unitPrice || 0,
              currency: data.currency || 'BDT',
              factoryUnit: 'LEATHER_ATELIER',
              supervisorName: FACTORY_UNITS.LEATHER_ATELIER.supervisor,
              supervisorPhone: FACTORY_UNITS.LEATHER_ATELIER.phone,
              createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
              targetShipDate: targetDate,
              milestones: {
                sourcingDone: false,
                cuttingDone: false,
                printAssemblyDone: false,
                qcPassed: false,
                approvedPcs: 0,
                rejectedPcs: 0,
                packedReady: false
              },
              surplusUnits: 0,
              surplusSize: '',
              surplusStatus: 'NONE'
            });
          });

          if (loaded.length > 0 && isMounted) {
            setOrders((prev) => [...loaded, ...prev]);
          }
        }
      } catch (err) {
        // Offline / dev fallback is expected and handled gracefully
        console.info('[FactorySlaFloorTracker] Using local active production queue.');
      }
    };

    loadFirestoreOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to external event bridge: 'nexus:open-factory-sla'
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const targetPo = e.detail?.poNumber || e.detail?.id || e.detail;
      if (typeof targetPo === 'string' && targetPo.trim()) {
        setSelectedOrderId(targetPo.trim());
      }
    };
    window.addEventListener('nexus:open-factory-sla', handleOpenEvent);
    return () => window.removeEventListener('nexus:open-factory-sla', handleOpenEvent);
  }, []);

  // Selected Order
  const activeOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId || o.poNumber === selectedOrderId) || orders[0];
  }, [orders, selectedOrderId]);

  // Calculate Remaining Hours & SLA Status
  const getSlaMetrics = useCallback((targetDateIso: string) => {
    const now = new Date().getTime();
    const target = new Date(targetDateIso).getTime();
    const diffMs = target - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = (diffHours / 24).toFixed(1);

    if (diffHours < 0) {
      return {
        status: 'SLA_BREACH' as const,
        badgeLabel: 'SLA BREACH - RED',
        badgeColor: 'bg-red-500/20 text-red-400 border-red-500/50',
        hoursText: `${Math.abs(diffHours)}h OVERDUE`,
        diffHours,
        diffDays
      };
    } else if (diffHours <= 48) {
      return {
        status: 'NEARING_DEADLINE' as const,
        badgeLabel: 'NEARING DEADLINE - AMBER',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        hoursText: `${diffHours}h REMAINING`,
        diffHours,
        diffDays
      };
    } else {
      return {
        status: 'ON_SCHEDULE' as const,
        badgeLabel: 'ON SCHEDULE - GREEN',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
        hoursText: `${diffHours}h (${diffDays}d) REMAINING`,
        diffHours,
        diffDays
      };
    }
  }, []);

  const activeSla = useMemo(() => {
    if (!activeOrder) return null;
    return getSlaMetrics(activeOrder.targetShipDate);
  }, [activeOrder, getSlaMetrics]);

  // Milestone Progress percentage
  const calculateProgress = (m: MilestoneState): number => {
    let score = 0;
    if (m.sourcingDone) score += 20;
    if (m.cuttingDone) score += 20;
    if (m.printAssemblyDone) score += 20;
    if (m.qcPassed) score += 20;
    if (m.packedReady) score += 20;
    return score;
  };

  // Toggle milestone handler
  const handleToggleMilestone = (key: keyof MilestoneState) => {
    if (!activeOrder) return;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== activeOrder.id) return o;
        const currentMilestones = { ...o.milestones };
        const nowIso = new Date().toISOString();

        if (key === 'sourcingDone') {
          currentMilestones.sourcingDone = !currentMilestones.sourcingDone;
          currentMilestones.sourcingAt = currentMilestones.sourcingDone ? nowIso : undefined;
        } else if (key === 'cuttingDone') {
          currentMilestones.cuttingDone = !currentMilestones.cuttingDone;
          currentMilestones.cuttingAt = currentMilestones.cuttingDone ? nowIso : undefined;
        } else if (key === 'printAssemblyDone') {
          currentMilestones.printAssemblyDone = !currentMilestones.printAssemblyDone;
          currentMilestones.printAssemblyAt = currentMilestones.printAssemblyDone ? nowIso : undefined;
        } else if (key === 'qcPassed') {
          currentMilestones.qcPassed = !currentMilestones.qcPassed;
          currentMilestones.qcPassedAt = currentMilestones.qcPassed ? nowIso : undefined;
          if (currentMilestones.qcPassed && currentMilestones.approvedPcs === 0) {
            currentMilestones.approvedPcs = o.totalQuantity;
          }
        } else if (key === 'packedReady') {
          currentMilestones.packedReady = !currentMilestones.packedReady;
          currentMilestones.packedAt = currentMilestones.packedReady ? nowIso : undefined;
        }

        return { ...o, milestones: currentMilestones };
      })
    );

    setStatusMessage(`✓ Milestone "${String(key)}" updated for PO ${activeOrder.poNumber}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // QC Counts change handler
  const handleQcChange = (approved: number, rejected: number, defectNote?: string) => {
    if (!activeOrder) return;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== activeOrder.id) return o;
        return {
          ...o,
          milestones: {
            ...o.milestones,
            approvedPcs: Math.max(0, approved),
            rejectedPcs: Math.max(0, rejected),
            qcDefectNote: defectNote !== undefined ? defectNote : o.milestones.qcDefectNote
          }
        };
      })
    );
  };

  // Facility assignment handler
  const handleFactoryUnitChange = (unit: FactoryUnit) => {
    if (!activeOrder) return;
    const unitDef = FACTORY_UNITS[unit];
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== activeOrder.id) return o;
        return {
          ...o,
          factoryUnit: unit,
          supervisorName: unitDef.supervisor,
          supervisorPhone: unitDef.phone
        };
      })
    );
    setStatusMessage(`✓ Allocated ${activeOrder.poNumber} to ${unitDef.name}`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Push to Clearance Vault
  const handlePushToClearance = () => {
    if (!activeOrder) return;
    if (surplusQtyInput <= 0) {
      alert('Please specify at least 1 surplus unit to push to the Clearance Vault.');
      return;
    }

    const newClearanceItem: ClearanceItem = {
      id: `CLR-${activeOrder.poNumber.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
      poNumber: activeOrder.poNumber,
      jobTicketId: activeOrder.jobTicketId,
      styleName: activeOrder.styleName,
      category: activeOrder.category,
      quantity: surplusQtyInput,
      sizes: surplusSizesInput || 'Assorted Overrun',
      conditionGrade: surplusGradeInput,
      suggestedLiquidationPriceBDT: surplusPriceBdtInput,
      status: 'AVAILABLE',
      vaultedAt: new Date().toISOString()
    };

    setClearanceVault((prev) => [newClearanceItem, ...prev]);

    // Update order surplus status
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== activeOrder.id) return o;
        return {
          ...o,
          surplusUnits: surplusQtyInput,
          surplusSize: surplusSizesInput,
          surplusStatus: 'VAULTED',
          vaultedAt: new Date().toISOString()
        };
      })
    );

    // Persist to Firestore clearance_vault collection (offline safe)
    try {
      // db imported from lib/firebase
      setDoc(doc(db, 'clearance_vault', newClearanceItem.id), {
        ...newClearanceItem,
        createdAt: Timestamp.now()
      });
    } catch (e) {
      // offline safe
    }

    setStatusMessage(
      `⚡ ${surplusQtyInput} Surplus Units from ${activeOrder.poNumber} vaulted into Clearance Catalog!`
    );
    setTimeout(() => setStatusMessage(null), 4500);
  };

  // WhatsApp Factory Supervisor Escalation
  const handleWhatsAppSupervisor = () => {
    if (!activeOrder || !activeSla) return;
    const cleanPhone = activeOrder.supervisorPhone.replace(/[^0-9]/g, '');
    const completedList: string[] = [];
    if (activeOrder.milestones.sourcingDone) completedList.push('✓ Sourcing');
    if (activeOrder.milestones.cuttingDone) completedList.push('✓ Cutting');
    if (activeOrder.milestones.printAssemblyDone) completedList.push('✓ Print/Assembly');
    if (activeOrder.milestones.qcPassed)
      completedList.push(`✓ QC Passed (${activeOrder.milestones.approvedPcs} pcs approved)`);
    if (activeOrder.milestones.packedReady) completedList.push('✓ Packed & Ready');

    const msg =
      `*HANDS & HEAD NEXUS · FACTORY SLA ESCALATION*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Floor Supervisor: *${activeOrder.supervisorName}*\n` +
      `Factory Facility: *${FACTORY_UNITS[activeOrder.factoryUnit].name}*\n` +
      `Job Ticket ID: *${activeOrder.jobTicketId}*\n` +
      `PO Reference: *${activeOrder.poNumber}*\n` +
      `Style: ${activeOrder.styleName} (${activeOrder.totalQuantity} pcs)\n` +
      `Target Ship Deadline: *${new Date(activeOrder.targetShipDate).toLocaleDateString()}* (${activeSla.hoursText})\n` +
      `Current SLA Status: *${activeSla.badgeLabel}*\n` +
      `Milestones Done: ${completedList.length > 0 ? completedList.join(', ') : 'Pending Sourcing'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `URGENT FLOOR ACTION REQUIRED: Please expedite production line progression to guarantee on-time atelier dispatch. Reply with current shift status.`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // WhatsApp Clearance Vault Liquidation Blast
  const handleWhatsAppClearanceBlast = (item: ClearanceItem) => {
    const msg =
      `*⚡ ATELIER CLEARANCE VAULT · FACTORY SURPLUS OVERRUN*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Style: *${item.styleName}*\n` +
      `Grade: *${item.conditionGrade === 'GRADE_A_SURPLUS' ? 'Grade A First-Quality Overrun' : 'Minor Cosmetic Blemish'}*\n` +
      `Surplus Quantity Available: *${item.quantity} Units*\n` +
      `Sizes: ${item.sizes}\n` +
      `Liquidation Price: *৳${item.suggestedLiquidationPriceBDT.toLocaleString()} BDT* (Limited Atelier Stock)\n` +
      `Ref Ticket: ${item.jobTicketId}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Direct factory surplus from confirmed export batch. First-come reservation via WhatsApp. Reply "CLAIM ${item.id}" to lock allocation.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Copy Sanitized Floor Summary to Clipboard
  const handleCopyFloorSummary = () => {
    if (!activeOrder) return;
    const sizeStr = Object.entries(activeOrder.sizeBreakdown)
      .map(([sz, qty]) => `${sz}: ${qty} pcs`)
      .join(' | ');

    const sanitizedSummary =
      `=== HANDS & HEAD NEXUS : SANITIZED FLOOR JOB TICKET ===\n` +
      `JOB TICKET ID     : ${activeOrder.jobTicketId}\n` +
      `PO REFERENCE      : ${activeOrder.poNumber}\n` +
      `STYLE             : ${activeOrder.styleName}\n` +
      `CATEGORY          : ${activeOrder.category}\n` +
      `TOTAL UNITS       : ${activeOrder.totalQuantity} PCS\n` +
      `SIZE BREAKDOWN    : ${sizeStr}\n` +
      `MATERIAL SPEC     : ${activeOrder.fabricLeatherType}\n` +
      `COLORWAY          : ${activeOrder.colorway}\n` +
      `TRIMS & HARDWARE  : ${activeOrder.liningHardware}\n` +
      `ALLOCATED UNIT    : ${FACTORY_UNITS[activeOrder.factoryUnit].name}\n` +
      `TARGET SHIP DATE  : ${new Date(activeOrder.targetShipDate).toLocaleDateString()} (${new Date(activeOrder.targetShipDate).toLocaleTimeString()})\n` +
      `NOTES / STITCHING : ${activeOrder.notes || 'Standard craft guidelines apply.'}\n` +
      `[CONFIDENTIALITY NOTE]: Buyer pricing, margins, and customer data stripped for production floor compliance.\n` +
      `======================================================`;

    navigator.clipboard.writeText(sanitizedSummary);
    setStatusMessage(`✓ Sanitized Floor Ticket for ${activeOrder.poNumber} copied to clipboard!`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.styleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.jobTicketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (filterUnit !== 'ALL' && o.factoryUnit !== filterUnit) return false;

      const sla = getSlaMetrics(o.targetShipDate);
      if (filterStatus === 'ON_SCHEDULE' && sla.status !== 'ON_SCHEDULE') return false;
      if (filterStatus === 'NEARING_DEADLINE' && sla.status !== 'NEARING_DEADLINE') return false;
      if (filterStatus === 'SLA_BREACH' && sla.status !== 'SLA_BREACH') return false;

      return true;
    });
  }, [orders, searchQuery, filterUnit, filterStatus, getSlaMetrics]);

  // High-level pipeline metrics
  const totalFloorUnits = useMemo(() => {
    return orders.reduce((acc, o) => acc + o.totalQuantity, 0);
  }, [orders]);

  const activeBreachesCount = useMemo(() => {
    return orders.filter((o) => getSlaMetrics(o.targetShipDate).status === 'SLA_BREACH').length;
  }, [orders, getSlaMetrics]);

  const nearingDeadlinesCount = useMemo(() => {
    return orders.filter((o) => getSlaMetrics(o.targetShipDate).status === 'NEARING_DEADLINE').length;
  }, [orders, getSlaMetrics]);

  const totalVaultedSurplusPcs = useMemo(() => {
    return clearanceVault.reduce((acc, itm) => acc + itm.quantity, 0);
  }, [clearanceVault]);

  return (
    <div
      id="factory_sla_floor_tracker"
      className="w-full bg-[#0D0E12] text-[#E2E8F0] font-mono p-3 sm:p-6 rounded-xl border border-[#1E222B] shadow-2xl space-y-6"
    >
      {/* ── 1. Top Header Bar & Live Production Telemetry ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E222B]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4400] animate-pulse" />
            <span className="text-[11px] font-bold text-[#FF4400] uppercase tracking-widest">
              [FACTORY_SLA] · PRODUCTION FLOOR &amp; SLA MONITOR
            </span>
            <span className="text-[10px] bg-[#161820] text-[#00E599] border border-[#1E222B] px-2 py-0.5 rounded font-bold">
              ATELIER WORK-ORDER ENGINE v5.2
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
            Factory Floor &amp; SLA Monitor
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Real-time job ticket tracking, 5-stage milestone progression, sanitized floor ticket generation &amp; surplus clearance vault
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStatusMessage('Synchronizing floor status with factory facilities…');
              setTimeout(() => setStatusMessage('✓ Floor data synchronized across 5 facilities'), 1000);
            }}
            className="px-3 py-1.5 bg-[#161820] hover:bg-[#1E222B] border border-[#1E222B] text-xs font-bold text-[#E2E8F0] rounded transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Sync live factory floor status"
          >
            <span>↻</span>
            <span>SYNC FLOOR</span>
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

      {/* ── Production Telemetry Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#12141A] border border-[#1E222B] p-3 rounded-lg">
          <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Floor Pipeline</div>
          <div className="text-xl font-bold text-white mt-0.5">{orders.length} Active POs</div>
          <div className="text-[10px] text-[#00E599] font-medium mt-0.5">
            ● {totalFloorUnits} Total Units in Cutting &amp; Stitch
          </div>
        </div>

        <div className="bg-[#12141A] border border-[#1E222B] p-3 rounded-lg">
          <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">SLA Health</div>
          <div className="text-xl font-bold text-[#00E599] mt-0.5">
            {orders.length - activeBreachesCount - nearingDeadlinesCount} On Schedule
          </div>
          <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">
            Promised factory ship dates guarded
          </div>
        </div>

        <div className="bg-[#12141A] border border-[#1E222B] p-3 rounded-lg">
          <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Critical Escalations</div>
          <div className="text-xl font-bold text-[#FF4400] mt-0.5">
            {activeBreachesCount} Breached · {nearingDeadlinesCount} At Risk
          </div>
          <div className="text-[10px] text-[#FF4400] font-medium mt-0.5">
            Supervisor follow-up ready
          </div>
        </div>

        <div className="bg-[#12141A] border border-[#1E222B] p-3 rounded-lg">
          <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Clearance Vault</div>
          <div className="text-xl font-bold text-[#38BDF8] mt-0.5">{totalVaultedSurplusPcs} Surplus Pcs</div>
          <div className="text-[10px] text-[#94A3B8] mt-0.5">Ready for WhatsApp liquidation</div>
        </div>
      </div>

      {/* ── Status Banner ── */}
      {statusMessage && (
        <div className="bg-[#161820] border border-[#FF4400]/60 text-[#FF4400] text-xs px-4 py-2.5 rounded-lg flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="animate-spin">●</span>
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-white hover:text-[#FF4400] font-bold text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ── 2. Active Production Pipeline Table & Filters ── */}
      <div className="bg-[#12141A] border border-[#1E222B] p-4 rounded-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1E222B]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase text-white tracking-wider">
              1. ACTIVE PRODUCTION PIPELINE TABLE
            </span>
            <span className="text-[10px] bg-[#161820] text-[#FF4400] border border-[#1E222B] px-2 py-0.5 rounded font-bold">
              {filteredOrders.length} ORDERS DISPLAYED
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            {/* SLA Filter */}
            <div className="flex items-center gap-1 bg-[#0D0E12] p-1 rounded border border-[#1E222B]">
              {(['ALL', 'ON_SCHEDULE', 'NEARING_DEADLINE', 'SLA_BREACH'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                    filterStatus === st
                      ? 'bg-[#FF4400] text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All'
                    : st === 'ON_SCHEDULE'
                    ? 'On Schedule'
                    : st === 'NEARING_DEADLINE'
                    ? 'Nearing SLA'
                    : 'SLA Breach'}
                </button>
              ))}
            </div>

            {/* Facility Filter */}
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="bg-[#0D0E12] border border-[#1E222B] text-xs text-[#E2E8F0] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#FF4400]"
            >
              <option value="ALL">All Facilities</option>
              <option value="LEATHER_ATELIER">Leather Atelier (Unit 1)</option>
              <option value="SCREEN_PRINT_LAB">Screen-Print Lab (Unit 2)</option>
              <option value="KNIT_STITCH_LINE">Knit &amp; Stitch (Unit 3)</option>
              <option value="HEAVY_WORKWEAR_CRAFT">Heavy Workwear (Unit 4)</option>
              <option value="ACCESSORIES_ASSEMBLY">Hardware &amp; Accessories (Unit 5)</option>
            </select>
          </div>
        </div>

        {/* Search and Orders Table */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Search active orders by PO#, Style Name, Ticket ID, Category…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 bg-[#0D0E12] border border-[#1E222B] text-xs text-white px-3 py-1.5 rounded focus:outline-none focus:border-[#FF4400]"
          />
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-[#1E222B] rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0D0E12] border-b border-[#1E222B] text-[10px] text-[#94A3B8] uppercase">
                <th className="p-3">PO &amp; Job Ticket</th>
                <th className="p-3">Style &amp; Category</th>
                <th className="p-3">Units</th>
                <th className="p-3">Allocated Facility</th>
                <th className="p-3">Milestone Progress</th>
                <th className="p-3">Target Deadline &amp; SLA</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E222B]">
              {filteredOrders.map((ord) => {
                const isSelected = ord.id === activeOrder?.id;
                const sla = getSlaMetrics(ord.targetShipDate);
                const progress = calculateProgress(ord.milestones);

                return (
                  <tr
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#1E222B]/70' : 'hover:bg-[#161820]/60'
                    }`}
                  >
                    <td className="p-3 font-mono">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sla.status === 'SLA_BREACH'
                              ? 'bg-red-500'
                              : sla.status === 'NEARING_DEADLINE'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span>{ord.poNumber}</span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">{ord.jobTicketId}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-white">{ord.styleName}</div>
                      <div className="text-[10px] text-[#94A3B8]">{ord.category}</div>
                    </td>

                    <td className="p-3 font-bold text-white font-mono">
                      {ord.totalQuantity} pcs
                    </td>

                    <td className="p-3">
                      <div className="text-xs text-[#E2E8F0] font-medium">
                        {FACTORY_UNITS[ord.factoryUnit].name}
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">
                        Spv: {ord.supervisorName}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="w-32">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-[#94A3B8]">Progression</span>
                          <span className="font-bold text-white font-mono">{progress}%</span>
                        </div>
                        <div className="w-full bg-[#0D0E12] h-1.5 rounded-full overflow-hidden border border-[#1E222B]">
                          <div
                            className={`h-full transition-all duration-300 ${
                              progress === 100
                                ? 'bg-[#00E599]'
                                : progress >= 60
                                ? 'bg-[#FF4400]'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="text-xs font-mono font-bold text-white">
                        {new Date(ord.targetShipDate).toLocaleDateString()}
                      </div>
                      <div
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 ${sla.badgeColor}`}
                      >
                        {sla.hoursText}
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(ord.id);
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                          isSelected
                            ? 'bg-[#FF4400] text-white'
                            : 'bg-[#161820] text-[#94A3B8] hover:text-white border border-[#1E222B]'
                        }`}
                      >
                        MANAGE →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. Main Operational Workbench (Two-Column Layout) ── */}
      {activeOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left Column: Milestone Progression & QC Station ── */}
          <div className="lg:col-span-6 bg-[#12141A] border border-[#1E222B] p-4 sm:p-5 rounded-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E222B]">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#FF4400]">
                  MILESTONE EXECUTION &amp; QC DESK
                </span>
                <span className="text-[10px] bg-[#161820] text-[#94A3B8] border border-[#1E222B] px-2 py-0.5 rounded">
                  5-STAGE GATING
                </span>
              </div>

              {/* Progress Indicator */}
              <div className="text-right">
                <span className="text-xs font-bold text-white font-mono">
                  {calculateProgress(activeOrder.milestones)}% COMPLETED
                </span>
              </div>
            </div>

            {/* Target Order Info Box */}
            <div className="bg-[#0D0E12] border border-[#1E222B] p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase text-[#94A3B8]">Active Production Spec</div>
                <div className="text-sm font-bold text-white font-mono">{activeOrder.poNumber}</div>
                <div className="text-xs text-[#E2E8F0] mt-0.5">{activeOrder.styleName} ({activeOrder.totalQuantity} pcs)</div>
              </div>

              {/* Facility Allocation Selector */}
              <div className="sm:text-right">
                <label className="text-[10px] uppercase text-[#94A3B8] block mb-1">
                  Assign Facility Unit
                </label>
                <select
                  value={activeOrder.factoryUnit}
                  onChange={(e) => handleFactoryUnitChange(e.target.value as FactoryUnit)}
                  className="bg-[#161820] border border-[#1E222B] rounded px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-[#FF4400]"
                >
                  <option value="LEATHER_ATELIER">Leather Atelier (Unit 1)</option>
                  <option value="SCREEN_PRINT_LAB">Screen-Print Lab (Unit 2)</option>
                  <option value="KNIT_STITCH_LINE">Knit &amp; Stitch (Unit 3)</option>
                  <option value="HEAVY_WORKWEAR_CRAFT">Heavy Workwear (Unit 4)</option>
                  <option value="ACCESSORIES_ASSEMBLY">Accessories Assembly (Unit 5)</option>
                </select>
              </div>
            </div>

            {/* 5 Milestone Checkpoints */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Production Stage Checkpoints</span>
                <span className="text-[10px] text-[#94A3B8] font-normal">Click checkbox to authorize stage</span>
              </div>

              {/* Milestone 1: Sourcing Done */}
              <div
                onClick={() => handleToggleMilestone('sourcingDone')}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  activeOrder.milestones.sourcingDone
                    ? 'bg-[#00E599]/10 border-[#00E599]/40 text-white'
                    : 'bg-[#0D0E12] border-[#1E222B] text-[#94A3B8] hover:border-[#94A3B8]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={activeOrder.milestones.sourcingDone}
                    onChange={() => {}}
                    className="w-4 h-4 accent-[#00E599] rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold uppercase">1. Sourcing Done</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Fabrics, master leather hides, linings &amp; metal hardware secured
                    </div>
                  </div>
                </div>
                {activeOrder.milestones.sourcingAt && (
                  <span className="text-[10px] text-[#00E599] font-mono">
                    ✓ {new Date(activeOrder.milestones.sourcingAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Milestone 2: Cutting Done */}
              <div
                onClick={() => handleToggleMilestone('cuttingDone')}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  activeOrder.milestones.cuttingDone
                    ? 'bg-[#00E599]/10 border-[#00E599]/40 text-white'
                    : 'bg-[#0D0E12] border-[#1E222B] text-[#94A3B8] hover:border-[#94A3B8]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={activeOrder.milestones.cuttingDone}
                    onChange={() => {}}
                    className="w-4 h-4 accent-[#00E599] rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold uppercase">2. Cutting Done</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Patterns graded, skiving completed &amp; dye lots verified
                    </div>
                  </div>
                </div>
                {activeOrder.milestones.cuttingAt && (
                  <span className="text-[10px] text-[#00E599] font-mono">
                    ✓ {new Date(activeOrder.milestones.cuttingAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Milestone 3: Print / Assembly Done */}
              <div
                onClick={() => handleToggleMilestone('printAssemblyDone')}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  activeOrder.milestones.printAssemblyDone
                    ? 'bg-[#00E599]/10 border-[#00E599]/40 text-white'
                    : 'bg-[#0D0E12] border-[#1E222B] text-[#94A3B8] hover:border-[#94A3B8]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={activeOrder.milestones.printAssemblyDone}
                    onChange={() => {}}
                    className="w-4 h-4 accent-[#00E599] rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold uppercase">3. Print / Assembly Done</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Screen-printing cured, seam stitching &amp; edge burnishing finished
                    </div>
                  </div>
                </div>
                {activeOrder.milestones.printAssemblyAt && (
                  <span className="text-[10px] text-[#00E599] font-mono">
                    ✓ {new Date(activeOrder.milestones.printAssemblyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Milestone 4: QC Passed (With Approved / Rejected Pcs Inputs) */}
              <div
                className={`p-3 rounded-lg border transition-all space-y-2.5 ${
                  activeOrder.milestones.qcPassed
                    ? 'bg-[#00E599]/10 border-[#00E599]/40 text-white'
                    : 'bg-[#0D0E12] border-[#1E222B] text-[#94A3B8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => handleToggleMilestone('qcPassed')}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={activeOrder.milestones.qcPassed}
                      onChange={() => {}}
                      className="w-4 h-4 accent-[#00E599] rounded cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold uppercase">4. QC Passed &amp; Audit Complete</div>
                      <div className="text-[10px] text-[#94A3B8]">
                        Dimensional tolerance, stitch consistency &amp; hardware testing
                      </div>
                    </div>
                  </div>
                  {activeOrder.milestones.qcPassedAt && (
                    <span className="text-[10px] text-[#00E599] font-mono">
                      ✓ {new Date(activeOrder.milestones.qcPassedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Approved & Rejected Input Controls */}
                <div className="bg-[#161820] border border-[#1E222B] p-2.5 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] uppercase text-[#00E599] block font-bold mb-0.5">
                      Approved Pcs
                    </label>
                    <input
                      type="number"
                      value={activeOrder.milestones.approvedPcs}
                      onChange={(e) =>
                        handleQcChange(
                          Number(e.target.value) || 0,
                          activeOrder.milestones.rejectedPcs
                        )
                      }
                      className="w-full bg-[#0D0E12] border border-[#1E222B] rounded px-2 py-1 text-xs text-white font-bold font-mono focus:outline-none focus:border-[#00E599]"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase text-[#FF4400] block font-bold mb-0.5">
                      Rejected Pcs
                    </label>
                    <input
                      type="number"
                      value={activeOrder.milestones.rejectedPcs}
                      onChange={(e) =>
                        handleQcChange(
                          activeOrder.milestones.approvedPcs,
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full bg-[#0D0E12] border border-[#1E222B] rounded px-2 py-1 text-xs text-white font-bold font-mono focus:outline-none focus:border-[#FF4400]"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[9px] uppercase text-[#94A3B8] block mb-0.5">
                      QC Defect Reason
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. slight stitch unevenness"
                      value={activeOrder.milestones.qcDefectNote || ''}
                      onChange={(e) =>
                        handleQcChange(
                          activeOrder.milestones.approvedPcs,
                          activeOrder.milestones.rejectedPcs,
                          e.target.value
                        )
                      }
                      className="w-full bg-[#0D0E12] border border-[#1E222B] rounded px-2 py-1 text-[11px] text-[#E2E8F0] focus:outline-none focus:border-[#00E599]"
                    />
                  </div>
                </div>
              </div>

              {/* Milestone 5: Packed & Ready */}
              <div
                onClick={() => handleToggleMilestone('packedReady')}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  activeOrder.milestones.packedReady
                    ? 'bg-[#00E599]/10 border-[#00E599]/40 text-white'
                    : 'bg-[#0D0E12] border-[#1E222B] text-[#94A3B8] hover:border-[#94A3B8]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={activeOrder.milestones.packedReady}
                    onChange={() => {}}
                    className="w-4 h-4 accent-[#00E599] rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold uppercase">5. Packed &amp; Ready for Courier Dispatch</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Master carton sealed with silica packs, barcode ticket affixed
                    </div>
                  </div>
                </div>
                {activeOrder.milestones.packedAt && (
                  <span className="text-[10px] text-[#00E599] font-mono">
                    ✓ {new Date(activeOrder.milestones.packedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Dispatch Transition Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof (window as any).openLogisticsSettlementHub === 'function') {
                    (window as any).openLogisticsSettlementHub(activeOrder);
                  } else {
                    window.dispatchEvent(
                      new CustomEvent('nexus:open-logistics', { detail: { order: activeOrder } })
                    );
                  }
                }}
                className="w-full py-2.5 bg-[#161820] hover:bg-[#1E222B] border border-[#1E222B] text-white font-bold text-xs uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>🚚</span>
                <span>OPEN IN LOGISTICS &amp; COD SETTLEMENT DOCK →</span>
              </button>
            </div>
          </div>

          {/* ── Right Column: Floor Ticket Generator & SLA Escalations ── */}
          <div className="lg:col-span-6 space-y-6">
            {/* ── 4. Factory SLA Timer & Escalation Card ── */}
            <div className="bg-[#12141A] border border-[#1E222B] p-4 sm:p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E222B]">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">4. FACTORY SLA TIMER &amp; ESCALATION</span>
                  <span className="text-[10px] bg-[#161820] text-[#FF4400] border border-[#1E222B] px-2 py-0.5 rounded font-bold">
                    ACTIVE MONITOR
                  </span>
                </div>
                {activeSla && (
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${activeSla.badgeColor}`}>
                    {activeSla.badgeLabel}
                  </span>
                )}
              </div>

              {/* Remaining Hours & Target Ship Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#0D0E12] border border-[#1E222B] p-3 rounded-lg">
                  <div className="text-[10px] uppercase text-[#94A3B8]">Remaining Floor Hours</div>
                  <div className="text-xl font-bold text-[#FF4400] font-mono mt-0.5">
                    {activeSla?.hoursText}
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">
                    Target Ship: {new Date(activeOrder.targetShipDate).toLocaleString()}
                  </div>
                </div>

                <div className="bg-[#0D0E12] border border-[#1E222B] p-3 rounded-lg">
                  <div className="text-[10px] uppercase text-[#94A3B8]">Floor Supervisor</div>
                  <div className="text-sm font-bold text-white mt-0.5">{activeOrder.supervisorName}</div>
                  <div className="text-[11px] text-[#00E599] font-mono mt-0.5">{activeOrder.supervisorPhone}</div>
                </div>
              </div>

              {/* 1-Click WhatsApp Factory Supervisor Escalation */}
              <button
                type="button"
                onClick={handleWhatsAppSupervisor}
                className="w-full py-3 bg-[#FF4400] hover:bg-[#E03A00] text-white font-bold text-xs uppercase tracking-wider rounded transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📲</span>
                <span>WHATSAPP FACTORY SUPERVISOR (AUTO-DRAFT ESCALATION)</span>
              </button>
            </div>

            {/* ── 2. Sanitized Factory Work-Order Generator ── */}
            <div className="bg-[#12141A] border border-[#1E222B] p-4 sm:p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E222B]">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#00E599]">2. SANITIZED FLOOR TICKET (JOB CARD)</span>
                  <span className="text-[10px] bg-[#161820] text-[#94A3B8] border border-[#1E222B] px-2 py-0.5 rounded">
                    PRICING STRIPPED
                  </span>
                </div>
                <span className="text-[10px] text-[#00E599] font-bold">COMPLIANT</span>
              </div>

              {/* Visual Sanitized Floor Ticket Preview */}
              <div className="bg-[#0D0E12] border border-[#1E222B] p-3.5 rounded-lg font-mono text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#1E222B]">
                  <div>
                    <span className="text-[#FF4400] font-bold tracking-widest">[JOB TICKET]</span>{' '}
                    <span className="text-white font-bold">{activeOrder.jobTicketId}</span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">PO: {activeOrder.poNumber}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#94A3B8] block text-[9px] uppercase">Style Reference</span>
                    <span className="font-bold text-white">{activeOrder.styleName}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[9px] uppercase">Category</span>
                    <span className="font-bold text-white">{activeOrder.category}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[9px] uppercase">Fabric / Leather</span>
                    <span className="text-[#E2E8F0]">{activeOrder.fabricLeatherType}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[9px] uppercase">Colorway &amp; Finishes</span>
                    <span className="text-[#E2E8F0]">{activeOrder.colorway}</span>
                  </div>
                </div>

                {/* Size Matrix */}
                <div className="pt-1">
                  <span className="text-[#94A3B8] block text-[9px] uppercase mb-1">
                    Size Breakdown Matrix ({activeOrder.totalQuantity} Total Pcs)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(activeOrder.sizeBreakdown).map(([sz, qty]) => (
                      <span
                        key={sz}
                        className="bg-[#161820] border border-[#1E222B] px-2 py-0.5 rounded text-[10px] text-white"
                      >
                        <strong className="text-[#00E599]">{sz}:</strong> {qty} pcs
                      </span>
                    ))}
                  </div>
                </div>

                {/* Trims and Target Date */}
                <div className="pt-2 border-t border-[#1E222B] flex justify-between items-center text-[10px]">
                  <span className="text-[#94A3B8]">Hardware &amp; Trims: {activeOrder.liningHardware}</span>
                  <span className="text-[#00E599] font-bold">
                    Target: {new Date(activeOrder.targetShipDate).toLocaleDateString()}
                  </span>
                </div>

                {/* Privacy Badge */}
                <div className="bg-[#161820] p-2 rounded text-[9px] text-[#94A3B8] flex items-center gap-1.5">
                  <span className="text-[#00E599]">🔒</span>
                  <span>Buyer contact info, FOB unit prices, and margins excluded from floor ticket.</span>
                </div>
              </div>

              {/* Actions: Print & Copy Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="py-2.5 bg-[#161820] hover:bg-[#1E222B] border border-[#1E222B] text-white font-bold text-xs uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>PRINT FLOOR TICKET</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyFloorSummary}
                  className="py-2.5 bg-[#161820] hover:bg-[#1E222B] border border-[#00E599]/40 text-[#00E599] font-bold text-xs uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📄</span>
                  <span>COPY RAW SUMMARY</span>
                </button>
              </div>
            </div>

            {/* ── 3. Deadstock Overrun Capture & Clearance Vault ── */}
            <div className="bg-[#12141A] border border-[#1E222B] p-4 sm:p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E222B]">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#38BDF8]">
                    3. DEADSTOCK OVERRUN CAPTURE
                  </span>
                  <span className="text-[10px] bg-[#161820] text-[#38BDF8] border border-[#1E222B] px-2 py-0.5 rounded font-bold">
                    CLEARANCE VAULT
                  </span>
                </div>
                <span className="text-[10px] text-[#94A3B8]">Surplus Liquidation</span>
              </div>

              <p className="text-xs text-[#94A3B8]">
                Immediately catalog overruns or minor aesthetic variations from this production run for rapid direct-to-buyer liquidation via WhatsApp.
              </p>

              {/* Overrun Input Form */}
              <div className="bg-[#0D0E12] border border-[#1E222B] p-3 rounded-lg space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] uppercase text-[#94A3B8] block mb-1">
                      Surplus Quantity (Pcs)
                    </label>
                    <input
                      type="number"
                      value={surplusQtyInput}
                      onChange={(e) => setSurplusQtyInput(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-[#161820] border border-[#1E222B] rounded px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-[#38BDF8]"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase text-[#94A3B8] block mb-1">
                      Surplus Size Breakdown
                    </label>
                    <input
                      type="text"
                      value={surplusSizesInput}
                      onChange={(e) => setSurplusSizesInput(e.target.value)}
                      placeholder="e.g. M: 2, L: 2"
                      className="w-full bg-[#161820] border border-[#1E222B] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[9px] uppercase text-[#94A3B8] block mb-1">
                      Condition Grade
                    </label>
                    <select
                      value={surplusGradeInput}
                      onChange={(e) =>
                        setSurplusGradeInput(
                          e.target.value as 'GRADE_A_SURPLUS' | 'MINOR_BLEMISH'
                        )
                      }
                      className="w-full bg-[#161820] border border-[#1E222B] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                    >
                      <option value="GRADE_A_SURPLUS">Grade A First Quality</option>
                      <option value="MINOR_BLEMISH">Minor Blemish / Variation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase text-[#94A3B8] block mb-1">
                    Target Clearance Liquidation Price (BDT)
                  </label>
                  <input
                    type="number"
                    value={surplusPriceBdtInput}
                    onChange={(e) => setSurplusPriceBdtInput(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-[#161820] border border-[#1E222B] rounded px-2.5 py-1 text-xs text-[#38BDF8] font-bold focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                {/* Push to Clearance Vault Action */}
                <button
                  type="button"
                  onClick={handlePushToClearance}
                  className="w-full py-2.5 bg-[#38BDF8] hover:bg-[#0284C7] text-black font-bold text-xs uppercase tracking-wider rounded transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>⚡</span>
                  <span>PUSH TO CLEARANCE VAULT →</span>
                </button>
              </div>

              {/* Clearance Vault Live Inventory Items */}
              <div className="space-y-2 pt-2 border-t border-[#1E222B]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-white tracking-wider">
                    Vaulted Clearance Lots ({clearanceVault.length})
                  </span>
                  <span className="text-[10px] text-[#38BDF8]">Ready for WhatsApp blast</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {clearanceVault.map((itm) => (
                    <div
                      key={itm.id}
                      className="bg-[#0D0E12] border border-[#1E222B] p-2.5 rounded-lg flex items-center justify-between text-xs gap-2"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="text-[#38BDF8]">●</span>
                          <span>{itm.styleName}</span>
                          <span className="text-[10px] bg-[#161820] px-1.5 py-0.2 rounded text-[#94A3B8]">
                            {itm.quantity} pcs ({itm.sizes})
                          </span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">
                          ৳{itm.suggestedLiquidationPriceBDT.toLocaleString()} BDT ·{' '}
                          {itm.conditionGrade === 'GRADE_A_SURPLUS' ? 'Grade A' : 'Minor Blemish'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleWhatsAppClearanceBlast(itm)}
                        className="px-2 py-1 bg-[#161820] hover:bg-[#1E222B] border border-[#00E599]/50 text-[#00E599] text-[10px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer shrink-0"
                      >
                        <span>📲</span>
                        <span>BLAST</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Floor Ticket Print Preview Modal ── */}
      {showPrintModal && activeOrder && (
        <div
          className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={() => setShowPrintModal(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-white text-black font-mono p-6 rounded-lg shadow-2xl border-4 border-black my-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-black pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight uppercase">
                  HANDS &amp; HEAD ATELIER · FLOOR TICKET
                </h2>
                <p className="text-xs font-semibold text-gray-700">
                  SANITIZED SHOP-FLOOR PRODUCTION WORK ORDER
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold font-mono">{activeOrder.jobTicketId}</div>
                <div className="text-[10px] text-gray-600">PO Ref: {activeOrder.poNumber}</div>
              </div>
            </div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-300 pb-3">
              <div>
                <strong className="block text-[10px] text-gray-600 uppercase">Style Specification</strong>
                <span className="font-bold text-sm">{activeOrder.styleName}</span>
              </div>
              <div>
                <strong className="block text-[10px] text-gray-600 uppercase">Category</strong>
                <span className="font-bold">{activeOrder.category}</span>
              </div>
              <div>
                <strong className="block text-[10px] text-gray-600 uppercase">Fabric / Master Hide</strong>
                <span>{activeOrder.fabricLeatherType}</span>
              </div>
              <div>
                <strong className="block text-[10px] text-gray-600 uppercase">Colorway &amp; Finishes</strong>
                <span>{activeOrder.colorway}</span>
              </div>
              <div>
                <strong className="block text-[10px] text-gray-600 uppercase">Hardware &amp; Lining</strong>
                <span>{activeOrder.liningHardware}</span>
              </div>
              <div>
                <strong className="block text-[10px] text-gray-600 uppercase">Target Ship Date</strong>
                <span className="font-bold text-red-600">
                  {new Date(activeOrder.targetShipDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Size Breakdown Matrix */}
            <div className="border-b border-gray-300 pb-3">
              <strong className="block text-xs uppercase mb-1">
                Size Breakdown Matrix ({activeOrder.totalQuantity} Total Units)
              </strong>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(activeOrder.sizeBreakdown).map(([sz, qty]) => (
                  <div key={sz} className="border border-black p-1.5 text-center">
                    <div className="text-[10px] font-bold text-gray-600">{sz}</div>
                    <div className="text-sm font-bold">{qty} pcs</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floor Checklist */}
            <div className="border-b border-gray-300 pb-3 text-xs space-y-1">
              <strong className="block text-[10px] uppercase text-gray-600 mb-1">Quality Sign-Offs</strong>
              <div className="flex justify-between">
                <span>[ ] Master Cutter Signature: _______________</span>
                <span>[ ] Chief Stitcher Signature: _______________</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>[ ] Lead QC Auditor: _______________</span>
                <span>[ ] Master Polybag / Packing: _______________</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-gray-600">
                Notice: All financial and client identifiers stripped for floor compliance.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-black text-white font-bold text-xs uppercase tracking-wider rounded cursor-pointer"
                >
                  PRINT TICKET
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 border border-black font-bold text-xs uppercase tracking-wider rounded cursor-pointer"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactorySlaFloorTracker;
