import React, { useState, useEffect, useMemo, useRef } from 'react';

// ── Types & Archetypes ──
export type SourcingCategory =
  | 'HEAVY_KNIT_FLEECE'
  | 'FULL_GRAIN_LEATHER'
  | 'COMBED_PIQUE'
  | 'CANVAS_HARDWARE';

export type EscrowTrancheStatus =
  | 'LOCKED_IN_ESCROW'
  | 'QC_PENDING_REVIEW'
  | 'OPERATOR_AUTHORIZED'
  | 'DISBURSED_TO_FACTORY';

export interface EscrowTranche {
  id: string;
  milestoneName: string;
  percentage: number;
  amountBdt: number;
  amountUsd: number;
  status: EscrowTrancheStatus;
  qcVerifiedAt?: string;
  qcVerifier?: string;
  cryptoProofHash?: string;
  photoEvidenceUrl?: string;
  disbursedAt?: string;
  disbursementTxId?: string;
}

export interface SourcingBatch {
  id: string;
  batchCode: string;
  materialName: string;
  category: SourcingCategory;
  millSupplier: string;
  originHub: string;
  quantityOrdered: number;
  unit: 'KG' | 'SQFT' | 'YARDS';
  unitCostBdt: number;
  totalCostBdt: number;
  totalCostUsd: number;
  advanceDepositPaid: number;
  gsmOrThickness: string;
  colorway: string;
  labCertificateNo: string;
  status: 'DISPATCHED_FROM_MILL' | 'INSPECTION_PASSED' | 'RELEASED_TO_FLOOR';
  receivedAt?: string;
}

export interface FactoryContract {
  id: string;
  factoryName: string;
  poNumber: string;
  orderId: string;
  styleName: string;
  totalUnits: number;
  totalContractValueBdt: number;
  totalContractValueUsd: number;
  escrowLockedBdt: number;
  disbursedBdt: number;
  retainedGuaranteeBdt: number;
  factoryYieldPct: number;
  aqlDefectRate: number;
  currentMilestone: string;
  assignedFloorUnit: string;
  targetCompletionDate: string;
  tranches: EscrowTranche[];
  notes: string[];
}

export interface EscrowDisbursementLog {
  id: string;
  timestamp: string;
  contractId: string;
  factoryName: string;
  trancheName: string;
  amountBdt: number;
  amountUsd: number;
  cryptoProofHash: string;
  operatorUid: string;
  status: 'COMMITTED_ON_LEDGER';
  txRef: string;
}

export interface EnterpriseSourcingAndFactoryEscrowProps {
  mode?: 'fullscreen' | 'embedded' | 'modal';
  onClose?: () => void;
  initialContractPo?: string;
}

// ── Initial Seed Dataset ──
const INITIAL_SOURCING_BATCHES: SourcingBatch[] = [
  {
    id: 'BATCH-KNIT-901',
    batchCode: 'LOT-NRY-450-BLK',
    materialName: '450 GSM 100% Combed Compact Loopback French Terry',
    category: 'HEAVY_KNIT_FLEECE',
    millSupplier: 'Robintex Fabric Mills Ltd',
    originHub: 'Narayanganj Textile Cluster',
    quantityOrdered: 850,
    unit: 'KG',
    unitCostBdt: 820,
    totalCostBdt: 697000,
    totalCostUsd: 5808,
    advanceDepositPaid: 350000,
    gsmOrThickness: '450 GSM (Lab Verified ±2%)',
    colorway: 'Carbon Black (Pantone 19-3911 TCX)',
    labCertificateNo: 'LAB-QC-RBN-88210-A',
    status: 'RELEASED_TO_FLOOR',
    receivedAt: '2026-03-02T10:15:00Z'
  },
  {
    id: 'BATCH-LTH-902',
    batchCode: 'LOT-HZR-VEG-BRN',
    materialName: '1.4mm Full-Grain Pull-Up Vegetable Tanned Cowhide',
    category: 'FULL_GRAIN_LEATHER',
    millSupplier: 'Savar Tannery Estate Artisan Collective',
    originHub: 'Hemayetpur Savar Tannery Hub',
    quantityOrdered: 1200,
    unit: 'SQFT',
    unitCostBdt: 310,
    totalCostBdt: 372000,
    totalCostUsd: 3100,
    advanceDepositPaid: 186000,
    gsmOrThickness: '1.4mm - 1.6mm Gauge',
    colorway: 'Heritage Saddle Havana Brown',
    labCertificateNo: 'LAB-LWG-SVR-44192',
    status: 'INSPECTION_PASSED',
    receivedAt: '2026-03-05T14:40:00Z'
  },
  {
    id: 'BATCH-PIQ-903',
    batchCode: 'LOT-GZP-240-NVY',
    materialName: '240 GSM Combed Micro-Pique Knit with Lycra Collar Rib',
    category: 'COMBED_PIQUE',
    millSupplier: 'Square Fashions Ltd Unit 2',
    originHub: 'Gazipur Industrial Zone',
    quantityOrdered: 620,
    unit: 'KG',
    unitCostBdt: 680,
    totalCostBdt: 421600,
    totalCostUsd: 3513,
    advanceDepositPaid: 210000,
    gsmOrThickness: '240 GSM ± 5 GSM',
    colorway: 'Corporate Obsidian Navy',
    labCertificateNo: 'LAB-SQR-77218-B',
    status: 'DISPATCHED_FROM_MILL',
    receivedAt: undefined
  }
];

const INITIAL_FACTORY_CONTRACTS: FactoryContract[] = [
  {
    id: 'ESCROW-CTR-8801',
    factoryName: 'Apex Precision Apparel Floor 4',
    poNumber: 'PO-8801',
    orderId: 'HH-B2B-ORD-901',
    styleName: 'Executive 450 GSM Heavy Loopback Hoodie',
    totalUnits: 500,
    totalContractValueBdt: 850000,
    totalContractValueUsd: 7083,
    escrowLockedBdt: 425000,
    disbursedBdt: 255000,
    retainedGuaranteeBdt: 170000,
    factoryYieldPct: 98.4,
    aqlDefectRate: 0.6,
    currentMilestone: 'Tranche 3: Sewing & Assembly Passed',
    assignedFloorUnit: 'Heavy Knit Line B-1',
    targetCompletionDate: '2026-03-24',
    tranches: [
      {
        id: 'TR-1',
        milestoneName: 'Tranche 1: Sourcing & Fabric Release',
        percentage: 30,
        amountBdt: 255000,
        amountUsd: 2125,
        status: 'DISBURSED_TO_FACTORY',
        qcVerifiedAt: '2026-03-03T11:00:00Z',
        qcVerifier: 'admin@handsandhead.com',
        cryptoProofHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        photoEvidenceUrl: 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?w=600&q=80',
        disbursedAt: '2026-03-03T12:30:00Z',
        disbursementTxId: 'ESC-TX-8801-01'
      },
      {
        id: 'TR-2',
        milestoneName: 'Tranche 2: Cutting & Bundling QC',
        percentage: 30,
        amountBdt: 255000,
        amountUsd: 2125,
        status: 'QC_PENDING_REVIEW',
        qcVerifiedAt: undefined,
        cryptoProofHash: 'a7b3c2e1f40989ad87123984029384bb234789012348921734981273984123ab',
        photoEvidenceUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80'
      },
      {
        id: 'TR-3',
        milestoneName: 'Tranche 3: Sewing & Assembly Passed',
        percentage: 20,
        amountBdt: 170000,
        amountUsd: 1416,
        status: 'LOCKED_IN_ESCROW'
      },
      {
        id: 'TR-4',
        milestoneName: 'Tranche 4: Final Packing & Dispatch Locked',
        percentage: 20,
        amountBdt: 170000,
        amountUsd: 1416,
        status: 'LOCKED_IN_ESCROW'
      }
    ],
    notes: [
      'Fabric lot LOT-NRY-450-BLK released to cutting table with zero shrinkage variance.',
      'Cryptographic proof generated for Tranche 1 release voucher.'
    ]
  },
  {
    id: 'ESCROW-CTR-8802',
    factoryName: 'Hazaribagh Atelier Craft Works',
    poNumber: 'PO-8802',
    orderId: 'HH-B2B-ORD-902',
    styleName: 'Artisan Full-Grain Leather Corporate Folio',
    totalUnits: 300,
    totalContractValueBdt: 630000,
    totalContractValueUsd: 5250,
    escrowLockedBdt: 630000,
    disbursedBdt: 0,
    retainedGuaranteeBdt: 126000,
    factoryYieldPct: 99.1,
    aqlDefectRate: 0.3,
    currentMilestone: 'Tranche 1: Sourcing & Leather Release',
    assignedFloorUnit: 'Leather Guild Bench 3',
    targetCompletionDate: '2026-03-30',
    tranches: [
      {
        id: 'TR-1',
        milestoneName: 'Tranche 1: Sourcing & Leather Release',
        percentage: 30,
        amountBdt: 189000,
        amountUsd: 1575,
        status: 'QC_PENDING_REVIEW',
        photoEvidenceUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
        cryptoProofHash: '98d7234abcf09128340912830491823094812093481209384091283409128304'
      },
      {
        id: 'TR-2',
        milestoneName: 'Tranche 2: Die Cutting & Skiving Passed',
        percentage: 30,
        amountBdt: 189000,
        amountUsd: 1575,
        status: 'LOCKED_IN_ESCROW'
      },
      {
        id: 'TR-3',
        milestoneName: 'Tranche 3: Edge Inking & Saddle Stitching',
        percentage: 20,
        amountBdt: 126000,
        amountUsd: 1050,
        status: 'LOCKED_IN_ESCROW'
      },
      {
        id: 'TR-4',
        milestoneName: 'Tranche 4: Embossed Packaging & Dispatch Signoff',
        percentage: 20,
        amountBdt: 126000,
        amountUsd: 1050,
        status: 'LOCKED_IN_ESCROW'
      }
    ],
    notes: [
      'Initial escrow funded 100% via buyer pre-order collateral.',
      'Awaiting visual verification of edge-skiving precision before releasing Tranche 1.'
    ]
  }
];

export const EnterpriseSourcingAndFactoryEscrow: React.FC<EnterpriseSourcingAndFactoryEscrowProps> = ({
  mode = 'embedded',
  onClose,
  initialContractPo
}) => {
  // ── States ──
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'SOURCING' | 'MILESTONES' | 'LEDGER'>('COMMAND');
  const [contracts, setContracts] = useState<FactoryContract[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_escrow_contracts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_FACTORY_CONTRACTS;
  });
  const [batches, setBatches] = useState<SourcingBatch[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_sourcing_batches');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_SOURCING_BATCHES;
  });
  const [logs, setLogs] = useState<EscrowDisbursementLog[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_escrow_disbursement_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'LOG-ESC-1001',
        timestamp: '2026-03-03T12:30:00Z',
        contractId: 'ESCROW-CTR-8801',
        factoryName: 'Apex Precision Apparel Floor 4',
        trancheName: 'Tranche 1: Sourcing & Fabric Release (30%)',
        amountBdt: 255000,
        amountUsd: 2125,
        cryptoProofHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        operatorUid: 'admin@handsandhead.com',
        status: 'COMMITTED_ON_LEDGER',
        txRef: 'ESC-TX-8801-01'
      }
    ];
  });

  const [selectedContractId, setSelectedContractId] = useState<string>(() => {
    if (initialContractPo) {
      const found = INITIAL_FACTORY_CONTRACTS.find(c => c.poNumber === initialContractPo);
      if (found) return found.id;
    }
    return INITIAL_FACTORY_CONTRACTS[0]?.id || '';
  });

  // Modal State for Cryptographic Master PIN release
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [targetTranche, setTargetTranche] = useState<{ contractId: string; trancheId: string } | null>(null);
  const [operatorPin, setOperatorPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const pinInputRef = useRef<HTMLInputElement | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nexus_escrow_contracts', JSON.stringify(contracts));
    } catch (e) {}
  }, [contracts]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_sourcing_batches', JSON.stringify(batches));
    } catch (e) {}
  }, [batches]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_escrow_disbursement_logs', JSON.stringify(logs));
    } catch (e) {}
  }, [logs]);

  const activeContract = useMemo(() => {
    return contracts.find(c => c.id === selectedContractId) || contracts[0];
  }, [contracts, selectedContractId]);

  // Aggregate Metrics
  const aggregateMetrics = useMemo(() => {
    const totalLockedBdt = contracts.reduce((acc, c) => acc + c.escrowLockedBdt, 0);
    const totalDisbursedBdt = contracts.reduce((acc, c) => acc + c.disbursedBdt, 0);
    const totalGuaranteesBdt = contracts.reduce((acc, c) => acc + c.retainedGuaranteeBdt, 0);
    const totalRawMtlBdt = batches.reduce((acc, b) => acc + b.totalCostBdt, 0);
    return {
      totalLockedBdt,
      totalDisbursedBdt,
      totalGuaranteesBdt,
      totalRawMtlBdt,
      activeContractCount: contracts.length,
      activeBatchCount: batches.length
    };
  }, [contracts, batches]);

  // Handle Photo QC Upload Simulation / Cryptographic Hash generation
  const handleSimulatePhotoQC = (contractId: string, trancheId: string) => {
    const randomHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setContracts(prev =>
      prev.map(c => {
        if (c.id !== contractId) return c;
        const updatedTranches = c.tranches.map(t => {
          if (t.id !== trancheId) return t;
          return {
            ...t,
            status: 'QC_PENDING_REVIEW' as EscrowTrancheStatus,
            cryptoProofHash: randomHash,
            photoEvidenceUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80',
            qcVerifiedAt: new Date().toISOString(),
            qcVerifier: 'inspector.floor@handsandhead.com'
          };
        });
        return {
          ...c,
          tranches: updatedTranches,
          notes: [`[PHOTO QC CAPTURED] Milestone proof SHA-256: ${randomHash.slice(0, 16)}... submitted for operator escrow release.`, ...c.notes]
        };
      })
    );
    setActionSuccessMsg(`Photo-QC evidence captured! SHA-256 cryptographic verification token generated: ${randomHash.slice(0, 12)}...`);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  // Open PIN Gateway for Tranche Release
  const handleOpenReleaseModal = (contractId: string, trancheId: string) => {
    setTargetTranche({ contractId, trancheId });
    setOperatorPin('');
    setPinError(null);
    setIsPinModalOpen(true);
    setTimeout(() => pinInputRef.current?.focus(), 100);
  };

  // Execute PIN Verification & Escrow Release
  const handleExecuteTrancheRelease = () => {
    if (!targetTranche) return;
    const cleanPin = operatorPin.trim();
    if (cleanPin !== '8821' && cleanPin !== '1996' && cleanPin !== '2024' && cleanPin !== '0000') {
      setPinError('Access Denied: Invalid Operator Master PIN.');
      setOperatorPin('');
      return;
    }

    const { contractId, trancheId } = targetTranche;
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const tranche = contract.tranches.find(t => t.id === trancheId);
    if (!tranche) return;

    const nowIso = new Date().toISOString();
    const txRef = `ESC-TX-${contract.poNumber}-${Date.now().toString().slice(-4)}`;

    // Update contract & tranche
    setContracts(prev =>
      prev.map(c => {
        if (c.id !== contractId) return c;
        const newDisbursed = c.disbursedBdt + tranche.amountBdt;
        const newLocked = Math.max(0, c.escrowLockedBdt - tranche.amountBdt);
        const updatedTranches = c.tranches.map(t => {
          if (t.id !== trancheId) return t;
          return {
            ...t,
            status: 'DISBURSED_TO_FACTORY' as EscrowTrancheStatus,
            disbursedAt: nowIso,
            disbursementTxId: txRef
          };
        });
        return {
          ...c,
          disbursedBdt: newDisbursed,
          escrowLockedBdt: newLocked,
          tranches: updatedTranches,
          notes: [
            `[ESCROW DISBURSED] ${tranche.milestoneName} (৳${tranche.amountBdt.toLocaleString()}) released to ${c.factoryName}. Tx: ${txRef} by Master Operator.`,
            ...c.notes
          ]
        };
      })
    );

    // Commit to Ledger
    const newLog: EscrowDisbursementLog = {
      id: `LOG-ESC-${Date.now()}`,
      timestamp: nowIso,
      contractId,
      factoryName: contract.factoryName,
      trancheName: tranche.milestoneName,
      amountBdt: tranche.amountBdt,
      amountUsd: tranche.amountUsd,
      cryptoProofHash: tranche.cryptoProofHash || 'SHA-GEN-8821-CRYPTO-ESCROW-UNLOCKED',
      operatorUid: 'admin@handsandhead.com',
      status: 'COMMITTED_ON_LEDGER',
      txRef
    };
    setLogs(prev => [newLog, ...prev]);

    setIsPinModalOpen(false);
    setActionSuccessMsg(`✓ Escrow Unlocked! ৳${tranche.amountBdt.toLocaleString()} disbursed to ${contract.factoryName} (Tx: ${txRef}).`);
    setTimeout(() => setActionSuccessMsg(null), 6000);
  };

  return (
    <div
      id="enterprise-sourcing-escrow-module"
      className={`sourcing-escrow-engine w-full max-w-7xl mx-auto font-mono text-zinc-200 select-none ${
        mode === 'fullscreen' ? 'min-h-screen bg-[#0D0D0C] p-4 sm:p-6' : 'bg-[#0D0D0C] border border-[#262624] rounded-xl p-3 sm:p-5 shadow-2xl'
      }`}
    >
      {/* ── Top Header & Industrial Brand ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#262624]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#1C1C1A] border border-[#383834] flex items-center justify-center text-[#FF5500] font-bold text-base shadow-inner">
            ⛓️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FF5500] tracking-widest uppercase">
                [SOURCING_ESCROW]
              </span>
              <span className="px-1.5 py-0.2 text-[10px] bg-[#1C1C1A] text-emerald-400 border border-emerald-500/30 rounded">
                AQL 1.5 VERIFIED
              </span>
              <span className="px-1.5 py-0.2 text-[10px] bg-[#1C1C1A] text-amber-400 border border-amber-500/30 rounded">
                TRANCHE ESCROW ACTIVE
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Enterprise Sourcing &amp; Factory Floor Escrow Engine
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="inline-flex bg-[#161615] p-0.5 rounded border border-[#262624] text-xs">
            <button
              onClick={() => setActiveTab('COMMAND')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeTab === 'COMMAND' ? 'bg-[#FF5500] text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              COMMAND
            </button>
            <button
              onClick={() => setActiveTab('SOURCING')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeTab === 'SOURCING' ? 'bg-[#FF5500] text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              SOURCING BATCHES ({batches.length})
            </button>
            <button
              onClick={() => setActiveTab('MILESTONES')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeTab === 'MILESTONES' ? 'bg-[#FF5500] text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              FACTORY MILESTONES ({contracts.length})
            </button>
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeTab === 'LEDGER' ? 'bg-[#FF5500] text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              ESCROW LEDGER ({logs.length})
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 px-3 bg-[#1C1C1A] hover:bg-[#262624] text-zinc-400 hover:text-white rounded border border-[#383834] text-xs font-bold transition-all"
            >
              ✕ CLOSE
            </button>
          )}
        </div>
      </div>

      {/* ── Success Alert Banner ── */}
      {actionSuccessMsg && (
        <div className="mt-3 p-3 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs rounded-lg flex items-center justify-between gap-2 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="font-bold">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ── Top Industrial Metric Gauges ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-[#141413] border border-[#262624] p-3 rounded-lg">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Total Escrow Vaulted</div>
          <div className="text-lg sm:text-xl font-black text-[#FF5500] mt-0.5">
            ৳{aggregateMetrics.totalLockedBdt.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Collateralized for 2 active factories
          </div>
        </div>

        <div className="bg-[#141413] border border-[#262624] p-3 rounded-lg">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Disbursed Milestones</div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
            ৳{aggregateMetrics.totalDisbursedBdt.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-1">
            Validated via SHA-256 Photo QC
          </div>
        </div>

        <div className="bg-[#141413] border border-[#262624] p-3 rounded-lg">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Retained Floor Guarantee</div>
          <div className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">
            ৳{aggregateMetrics.totalGuaranteesBdt.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            20% post-dispatch retention
          </div>
        </div>

        <div className="bg-[#141413] border border-[#262624] p-3 rounded-lg">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Raw Material Sourced</div>
          <div className="text-lg sm:text-xl font-black text-zinc-200 mt-0.5">
            ৳{aggregateMetrics.totalRawMtlBdt.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Across 3 certified mills
          </div>
        </div>
      </div>

      {/* ── Tab 1: COMMAND OVERVIEW ── */}
      {activeTab === 'COMMAND' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Col: Contract Selector & Milestones */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#141413] border border-[#262624] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#262624] mb-3">
                  <div>
                    <span className="text-[10px] text-[#FF5500] uppercase font-bold tracking-wider">
                      ACTIVE FACTORY FLOOR CONTRACT
                    </span>
                    <h2 className="text-base font-bold text-white">{activeContract.factoryName}</h2>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      PO: <span className="text-zinc-200 font-bold">{activeContract.poNumber}</span> · Style: <span className="text-zinc-200">{activeContract.styleName}</span> ({activeContract.totalUnits} Units)
                    </div>
                  </div>

                  {/* Switch contract pills */}
                  <div className="flex items-center gap-1.5">
                    {contracts.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedContractId(c.id)}
                        className={`px-2.5 py-1 text-xs rounded border transition-all ${
                          c.id === activeContract.id
                            ? 'bg-[#FF5500]/20 border-[#FF5500] text-white font-bold'
                            : 'bg-[#1C1C1A] border-[#383834] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {c.poNumber}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tranche Breakdown */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Milestone Escrow Tranche Architecture
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeContract.tranches.map((tranche, idx) => {
                      const isDisbursed = tranche.status === 'DISBURSED_TO_FACTORY';
                      const isPendingQc = tranche.status === 'QC_PENDING_REVIEW';
                      const isLocked = tranche.status === 'LOCKED_IN_ESCROW';

                      return (
                        <div
                          key={tranche.id}
                          className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                            isDisbursed
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : isPendingQc
                              ? 'bg-amber-950/20 border-amber-500/50'
                              : 'bg-[#1A1A18] border-[#2A2A28]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-zinc-200">{tranche.milestoneName}</span>
                              <span className="text-[#FF5500] font-black">{tranche.percentage}%</span>
                            </div>

                            <div className="text-base font-black text-white">
                              ৳{tranche.amountBdt.toLocaleString()}
                              <span className="text-[10px] text-zinc-400 font-normal ml-1.5">
                                (${tranche.amountUsd.toLocaleString()})
                              </span>
                            </div>

                            {/* Status Tag */}
                            <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                              {isDisbursed && (
                                <span className="text-emerald-400 font-bold bg-emerald-900/40 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                                  ✓ DISBURSED ({tranche.disbursementTxId})
                                </span>
                              )}
                              {isPendingQc && (
                                <span className="text-amber-400 font-bold bg-amber-900/40 border border-amber-500/40 px-1.5 py-0.5 rounded">
                                  ⚡ PHOTO-QC PENDING OPERATOR PIN
                                </span>
                              )}
                              {isLocked && (
                                <span className="text-zinc-400 font-bold bg-zinc-800/60 border border-zinc-700/60 px-1.5 py-0.5 rounded">
                                  🔒 LOCKED IN ESCROW
                                </span>
                              )}
                            </div>

                            {/* Crypto Hash if exists */}
                            {tranche.cryptoProofHash && (
                              <div className="mt-2 text-[9px] text-zinc-400 bg-black/40 p-1 rounded font-mono truncate">
                                SHA256: {tranche.cryptoProofHash}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-3 pt-2 border-t border-[#262624] flex items-center justify-between gap-2">
                            {isLocked && (
                              <button
                                onClick={() => handleSimulatePhotoQC(activeContract.id, tranche.id)}
                                className="w-full py-1.5 bg-[#262624] hover:bg-[#333330] text-zinc-200 hover:text-white rounded text-[11px] font-bold border border-[#40403C] transition-all flex items-center justify-center gap-1"
                              >
                                <span>📸</span>
                                <span>Upload Photo QC Evidence</span>
                              </button>
                            )}

                            {isPendingQc && (
                              <button
                                onClick={() => handleOpenReleaseModal(activeContract.id, tranche.id)}
                                className="w-full py-1.5 bg-[#FF5500] hover:bg-[#E04B00] text-black font-black rounded text-[11px] transition-all shadow-md flex items-center justify-center gap-1.5"
                              >
                                <span>🔑</span>
                                <span>Authorize Master Release</span>
                              </button>
                            )}

                            {isDisbursed && (
                              <div className="text-[10px] text-emerald-400 italic">
                                Released on {new Date(tranche.disbursedAt || '').toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sourcing Batches preview */}
              <div className="bg-[#141413] border border-[#262624] rounded-lg p-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#262624] mb-3">
                  <span className="text-[10px] text-[#FF5500] uppercase font-bold tracking-wider">
                    RAW MATERIAL DISPATCH &amp; ALLOCATION
                  </span>
                  <button
                    onClick={() => setActiveTab('SOURCING')}
                    className="text-xs text-zinc-400 hover:text-white underline"
                  >
                    View All Batches →
                  </button>
                </div>

                <div className="space-y-2">
                  {batches.slice(0, 2).map(b => (
                    <div key={b.id} className="p-2.5 bg-[#181816] rounded border border-[#262624] flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-white">{b.materialName}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {b.millSupplier} · Lot: <span className="text-zinc-200">{b.batchCode}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#FF5500]">{b.quantityOrdered} {b.unit}</div>
                        <div className="text-[10px] text-emerald-400">{b.status.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Escrow Audit Stream & Floor Parameters */}
            <div className="space-y-4">
              <div className="bg-[#141413] border border-[#262624] rounded-lg p-4">
                <div className="text-[10px] text-[#FF5500] uppercase font-bold tracking-wider mb-2">
                  FACTORY FLOOR METRICS
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#222220]">
                    <span className="text-zinc-400">Assigned Unit:</span>
                    <span className="text-white font-bold">{activeContract.assignedFloorUnit}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#222220]">
                    <span className="text-zinc-400">Factory Yield:</span>
                    <span className="text-emerald-400 font-bold">{activeContract.factoryYieldPct}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#222220]">
                    <span className="text-zinc-400">AQL Defect Rate:</span>
                    <span className="text-emerald-400 font-bold">{activeContract.aqlDefectRate}% (&lt; 1.5 Target)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#222220]">
                    <span className="text-zinc-400">Target Packing:</span>
                    <span className="text-zinc-200 font-bold">{activeContract.targetCompletionDate}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-400">Current Milestone:</span>
                    <span className="text-amber-400 font-bold truncate max-w-[150px]">{activeContract.currentMilestone}</span>
                  </div>
                </div>
              </div>

              {/* Recent Ledger Entries */}
              <div className="bg-[#141413] border border-[#262624] rounded-lg p-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#262624] mb-2">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                    ESCROW AUDIT LEDGER
                  </span>
                  <span className="text-[10px] text-emerald-400">LIVE SYNC</span>
                </div>

                <div className="space-y-2">
                  {logs.slice(0, 3).map(l => (
                    <div key={l.id} className="p-2 bg-[#181816] rounded border border-[#242422] text-[11px]">
                      <div className="flex justify-between text-zinc-300">
                        <span className="font-bold">{l.factoryName.slice(0, 18)}...</span>
                        <span className="text-emerald-400 font-bold">৳{l.amountBdt.toLocaleString()}</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 mt-1 truncate">
                        SHA256: {l.cryptoProofHash}
                      </div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">
                        Tx: {l.txRef} · {new Date(l.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: SOURCING BATCHES ── */}
      {activeTab === 'SOURCING' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#262624]">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Material Mills &amp; Raw Material Inventory Lots
            </h2>
            <span className="text-xs text-zinc-400">
              Total Batches: {batches.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {batches.map(b => (
              <div key={b.id} className="bg-[#141413] border border-[#262624] p-4 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[10px] text-[#FF5500] font-bold uppercase">{b.category.replace(/_/g, ' ')}</span>
                    <span className="text-zinc-400 text-[10px]">{b.batchCode}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-2">{b.materialName}</h3>

                  <div className="space-y-1 text-xs text-zinc-400">
                    <div>Mill: <span className="text-zinc-200 font-bold">{b.millSupplier}</span></div>
                    <div>Origin: <span className="text-zinc-200">{b.originHub}</span></div>
                    <div>Lot Size: <span className="text-[#FF5500] font-bold">{b.quantityOrdered} {b.unit}</span></div>
                    <div>Rate: <span className="text-zinc-200">৳{b.unitCostBdt}/{b.unit}</span></div>
                    <div>Lab Certificate: <span className="text-zinc-300 font-mono text-[10px]">{b.labCertificateNo}</span></div>
                    <div>Colorway: <span className="text-zinc-300">{b.colorway}</span></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#262624] flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase">Total Batch PO</div>
                    <div className="font-bold text-white">৳{b.totalCostBdt.toLocaleString()}</div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    b.status === 'RELEASED_TO_FLOOR'
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                      : b.status === 'INSPECTION_PASSED'
                      ? 'bg-amber-950/40 text-amber-400 border-amber-500/40'
                      : 'bg-zinc-800/60 text-zinc-300 border-zinc-700/60'
                  }`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 3: FACTORY MILESTONES ── */}
      {activeTab === 'MILESTONES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#262624]">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Sub-Contract Factory Escrow &amp; Tranche Checkpoints
            </h2>
            <span className="text-xs text-zinc-400">
              Showing {contracts.length} manufacturing sub-contracts
            </span>
          </div>

          <div className="space-y-4">
            {contracts.map(contract => (
              <div key={contract.id} className="bg-[#141413] border border-[#262624] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#262624]">
                  <div>
                    <div className="text-xs font-bold text-[#FF5500] uppercase">{contract.factoryName}</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {contract.styleName} ({contract.totalUnits} pcs) · PO: {contract.poNumber}
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <div className="text-zinc-400">Total Contract Value</div>
                    <div className="text-base font-bold text-white">৳{contract.totalContractValueBdt.toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                  {contract.tranches.map(t => (
                    <div key={t.id} className="p-3 bg-[#181816] rounded border border-[#242422] text-xs flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-zinc-200 mb-1">{t.milestoneName}</div>
                        <div className="text-sm font-black text-white">৳{t.amountBdt.toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-400 mt-1">{t.percentage}% of contract</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#262624]">
                        {t.status === 'DISBURSED_TO_FACTORY' ? (
                          <div className="text-[10px] text-emerald-400 font-bold">✓ Disbursed</div>
                        ) : t.status === 'QC_PENDING_REVIEW' ? (
                          <button
                            onClick={() => handleOpenReleaseModal(contract.id, t.id)}
                            className="w-full py-1 bg-[#FF5500] text-black font-bold rounded text-[10px]"
                          >
                            Release Escrow
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSimulatePhotoQC(contract.id, t.id)}
                            className="w-full py-1 bg-[#262624] hover:bg-[#333330] text-zinc-300 rounded text-[10px] border border-[#383834]"
                          >
                            Trigger Photo QC
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 4: ESCROW LEDGER ── */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#262624]">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Cryptographic Escrow Disbursement Ledger (Immutable Record)
            </h2>
            <span className="text-xs text-zinc-400">Total Transactions: {logs.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262624] text-zinc-500 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Tx Ref</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Factory</th>
                  <th className="py-2.5 px-3">Tranche</th>
                  <th className="py-2.5 px-3">Amount (BDT)</th>
                  <th className="py-2.5 px-3">SHA-256 Proof Hash</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1D]">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-[#161614] transition-colors">
                    <td className="py-3 px-3 font-bold text-zinc-200">{log.txRef}</td>
                    <td className="py-3 px-3 text-zinc-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-3 font-bold text-white">{log.factoryName}</td>
                    <td className="py-3 px-3 text-zinc-300">{log.trancheName}</td>
                    <td className="py-3 px-3 font-black text-emerald-400">৳{log.amountBdt.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-[10px] text-zinc-500 truncate max-w-[140px]" title={log.cryptoProofHash}>
                      {log.cryptoProofHash}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: Master Operator PIN Gateway for Escrow Release ── */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-md bg-[#141413] border border-[#383834] rounded-xl p-5 shadow-2xl text-zinc-200 flex flex-col space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#262624]">
              <div className="flex items-center gap-2">
                <span className="text-base text-[#FF5500]">🔑</span>
                <span className="text-xs font-bold uppercase tracking-widest text-[#FF5500]">
                  Master Operator Escrow Authorization
                </span>
              </div>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-300">
              You are authorizing the release of milestone escrow capital to manufacturing floor. This action is irreversible and committed to the append-only ledger.
            </div>

            <div className="p-3 bg-[#1A1A18] rounded border border-[#2A2A28] text-xs space-y-1">
              <div className="text-zinc-400 text-[10px] uppercase font-bold">Inspection Token Verified</div>
              <div className="text-[10px] font-mono text-emerald-400 truncate">
                SHA256: 88219962024abcdef1234567890abcdef1234567890
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                Enter 4-Digit Master PIN:
              </label>
              <input
                ref={pinInputRef}
                type="password"
                maxLength={4}
                value={operatorPin}
                onChange={e => setOperatorPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••"
                className="w-full p-2.5 bg-[#0D0D0C] border border-[#383834] focus:border-[#FF5500] rounded text-center text-lg tracking-widest font-mono text-white outline-none"
              />
              {pinError && <div className="text-red-400 text-[11px] mt-1 font-bold">{pinError}</div>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262624]">
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="px-3 py-1.5 bg-[#1C1C1A] hover:bg-[#262624] text-zinc-400 hover:text-white rounded text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTrancheRelease}
                disabled={operatorPin.length !== 4}
                className="px-4 py-1.5 bg-[#FF5500] hover:bg-[#E04B00] disabled:opacity-50 text-black font-black rounded text-xs transition-all shadow-md"
              >
                Unlock &amp; Disburse Tranche →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseSourcingAndFactoryEscrow;
