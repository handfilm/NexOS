import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ── Types & Interfaces ──
export type RemittanceCourier = 'STEADFAST' | 'PATHAO' | 'REDX' | 'DHL_CARGO';

export interface RemittanceParcel {
  id: string;
  orderId: string;
  poNumber: string;
  client: string;
  contactName: string;
  phone: string;
  courier: RemittanceCourier;
  consignmentId: string;
  deliveredAt: string; // ISO date
  grossCodBdt: number;
  deliveryFeeBdt: number;
  courierCommissionPct: number; // e.g. 1%
  courierCommissionBdt: number;
  netSettledCashBdt: number;
  status: 'COURIER_HELD' | 'DEPOSITED';
  depositedAt?: string;
  depositTxnRef?: string;
}

export interface ReignitionAccount {
  id: string;
  client: string;
  contactName: string;
  phone: string;
  lastPoNumber: string;
  lastDeliveredAt: string; // ISO date
  daysSinceDelivery: number;
  archivedStyleName: string;
  archivedFabricSpec: string;
  archivedColorways: string[];
  archivedTier1FobBdt: number;
  recommendedBatchSize: number;
  status: 'ALERT_ACTIVE' | 'PITCHED' | 'REORDERED';
  pitchedAt?: string;
}

export interface DeadstockVaultItem {
  id: string;
  poNumber: string;
  styleName: string;
  category: string;
  fabricLeatherType: string;
  colorway: string;
  unitsAvailable: number;
  standardFobBdt: number;
  discountPct: number; // e.g. 40
  clearancePriceBdt: number;
  reason: 'PRODUCTION_OVERRUN' | 'QC_SALVAGE' | 'CLIENT_CANCELLATION';
  status: 'AVAILABLE' | 'RESERVED' | 'LIQUIDATED';
}

export interface ClientProfitMetric {
  clientId: string;
  clientName: string;
  totalVolumePcs: number;
  grossRevenueBdt: number;
  materialCostBdt: number;
  subcontractCostBdt: number;
  logisticsFeesBdt: number;
  netProfitBdt: number;
  netMarginPct: number;
  cashEfficiencyRating: 'TIER_1_PRIME' | 'TIER_2_SOLID' | 'TIER_3_LOW_MARGIN';
}

export interface VaultAndReorderEngineProps {
  mode?: 'embedded' | 'modal' | 'fullscreen';
  onClose?: () => void;
}

// ── Initial Seed Data ──
const INITIAL_REMITTANCES: RemittanceParcel[] = [
  {
    id: 'REM-8803',
    orderId: 'PO-HH-2026-8803',
    poNumber: 'PO-8803',
    client: 'Zenith BioPharm Global',
    contactName: 'Dr. Zeeshan Haque',
    phone: '+8801819203040',
    courier: 'PATHAO',
    consignmentId: 'PTH-DH-8803-9921',
    deliveredAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    grossCodBdt: 425000,
    deliveryFeeBdt: 150,
    courierCommissionPct: 1.0,
    courierCommissionBdt: 4250,
    netSettledCashBdt: 420600,
    status: 'COURIER_HELD'
  },
  {
    id: 'REM-8799',
    orderId: 'PO-HH-2026-8799',
    poNumber: 'PO-8799',
    client: 'Delta Logistics SG',
    contactName: 'Karim Chowdhury',
    phone: '+8801711223344',
    courier: 'STEADFAST',
    consignmentId: 'SF-8799-4321',
    deliveredAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    grossCodBdt: 780000,
    deliveryFeeBdt: 350,
    courierCommissionPct: 1.0,
    courierCommissionBdt: 7800,
    netSettledCashBdt: 771850,
    status: 'COURIER_HELD'
  },
  {
    id: 'REM-8795',
    orderId: 'PO-HH-2026-8795',
    poNumber: 'PO-8795',
    client: 'Bespoke Atelier UK',
    contactName: 'Marcus Sterling',
    phone: '+447700900481',
    courier: 'DHL_CARGO',
    consignmentId: 'DHL-AWB-8795-1029',
    deliveredAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    grossCodBdt: 1250000,
    deliveryFeeBdt: 3200,
    courierCommissionPct: 0.5,
    courierCommissionBdt: 6250,
    netSettledCashBdt: 1240550,
    status: 'DEPOSITED',
    depositedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    depositTxnRef: 'EBL-TR-90218-CLR'
  }
];

const INITIAL_REIGNITION_ACCOUNTS: ReignitionAccount[] = [
  {
    id: 'REIG-01',
    client: 'Apex Holdings BD',
    contactName: 'Tariq Al-Mansoor',
    phone: '+8801713009922',
    lastPoNumber: 'PO-8772',
    lastDeliveredAt: new Date(Date.now() - 24 * 24 * 3600 * 1000).toISOString(),
    daysSinceDelivery: 24,
    archivedStyleName: 'Executive 450 GSM Heavy Loopback Hoodie',
    archivedFabricSpec: '450 GSM Combed French Terry (Carbon Black)',
    archivedColorways: ['Carbon Black', 'Washed Slate'],
    archivedTier1FobBdt: 2775,
    recommendedBatchSize: 150,
    status: 'ALERT_ACTIVE'
  },
  {
    id: 'REIG-02',
    client: 'Nordic Craft BV',
    contactName: 'Lukas Meijer',
    phone: '+31620194820',
    lastPoNumber: 'PO-8760',
    lastDeliveredAt: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(),
    daysSinceDelivery: 28,
    archivedStyleName: 'Full-Grain Artisan Leather Portfolio & Desk Mat',
    archivedFabricSpec: '1.4mm Pull-Up Cowhide + Solid Antiqued Brass Hardware',
    archivedColorways: ['Dark Espresso', 'Cognac Tan'],
    archivedTier1FobBdt: 3960,
    recommendedBatchSize: 100,
    status: 'ALERT_ACTIVE'
  },
  {
    id: 'REIG-03',
    client: 'Zenith BioPharm Global',
    contactName: 'Dr. Zeeshan Haque',
    phone: '+8801819203040',
    lastPoNumber: 'PO-8748',
    lastDeliveredAt: new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString(),
    daysSinceDelivery: 31,
    archivedStyleName: 'Monochrome High-Density Graphic Crewneck',
    archivedFabricSpec: '380 GSM Heavy French Terry + Organic Micro-Rib',
    archivedColorways: ['Bone Ivory', 'Concrete Grey'],
    archivedTier1FobBdt: 2500,
    recommendedBatchSize: 200,
    status: 'ALERT_ACTIVE'
  }
];

const INITIAL_DEADSTOCK: DeadstockVaultItem[] = [
  {
    id: 'VAULT-01',
    poNumber: 'PO-8801',
    styleName: 'Executive 450 GSM Heavy Loopback Hoodie (Overrun)',
    category: 'Heavy Fleece & Knitwear',
    fabricLeatherType: '450 GSM 100% Combed Cotton French Terry',
    colorway: 'Carbon Black',
    unitsAvailable: 24,
    standardFobBdt: 2800,
    discountPct: 40,
    clearancePriceBdt: 1680,
    reason: 'PRODUCTION_OVERRUN',
    status: 'AVAILABLE'
  },
  {
    id: 'VAULT-02',
    poNumber: 'PO-8802',
    styleName: 'Full-Grain Leather Desk Mat & Cord Keeper Set',
    category: 'Leather Atelier Goods',
    fabricLeatherType: '1.4mm Vegetable-Tanned Pull-Up Leather',
    colorway: 'Dark Espresso',
    unitsAvailable: 15,
    standardFobBdt: 3500,
    discountPct: 40,
    clearancePriceBdt: 2100,
    reason: 'PRODUCTION_OVERRUN',
    status: 'AVAILABLE'
  },
  {
    id: 'VAULT-03',
    poNumber: 'PO-8790',
    styleName: 'Heavy Canvas Atelier Workshop Apron (QC Sample Archive)',
    category: 'Heavy Workwear',
    fabricLeatherType: '16oz Washed Duck Canvas with Brass Rivets',
    colorway: 'Raw Khaki',
    unitsAvailable: 18,
    standardFobBdt: 2400,
    discountPct: 50,
    clearancePriceBdt: 1200,
    reason: 'QC_SALVAGE',
    status: 'AVAILABLE'
  }
];

const INITIAL_PROFIT_METRICS: ClientProfitMetric[] = [
  {
    clientId: 'CL-001',
    clientName: 'Apex Holdings BD',
    totalVolumePcs: 1450,
    grossRevenueBdt: 4120000,
    materialCostBdt: 1680000,
    subcontractCostBdt: 580000,
    logisticsFeesBdt: 95000,
    netProfitBdt: 1765000,
    netMarginPct: 42.8,
    cashEfficiencyRating: 'TIER_1_PRIME'
  },
  {
    clientId: 'CL-002',
    clientName: 'Nordic Craft BV',
    totalVolumePcs: 900,
    grossRevenueBdt: 3564000,
    materialCostBdt: 1390000,
    subcontractCostBdt: 470000,
    logisticsFeesBdt: 180000,
    netProfitBdt: 1524000,
    netMarginPct: 42.8,
    cashEfficiencyRating: 'TIER_1_PRIME'
  },
  {
    clientId: 'CL-003',
    clientName: 'Zenith BioPharm Global',
    totalVolumePcs: 850,
    grossRevenueBdt: 2125000,
    materialCostBdt: 980000,
    subcontractCostBdt: 340000,
    logisticsFeesBdt: 62000,
    netProfitBdt: 743000,
    netMarginPct: 35.0,
    cashEfficiencyRating: 'TIER_2_SOLID'
  },
  {
    clientId: 'CL-004',
    clientName: 'Delta Logistics SG',
    totalVolumePcs: 500,
    grossRevenueBdt: 1100000,
    materialCostBdt: 560000,
    subcontractCostBdt: 210000,
    logisticsFeesBdt: 55000,
    netProfitBdt: 275000,
    netMarginPct: 25.0,
    cashEfficiencyRating: 'TIER_3_LOW_MARGIN'
  }
];

export const VaultAndReorderEngine: React.FC<VaultAndReorderEngineProps> = ({
  mode = 'embedded',
  onClose
}) => {
  // ── State Management ──
  const [activeTab, setActiveTab] = useState<'REMITTANCE' | 'REIGNITION' | 'CLEARANCE' | 'LTV_PROFIT'>('REMITTANCE');
  const [remittances, setRemittances] = useState<RemittanceParcel[]>(() => {
    try {
      const saved = localStorage.getItem('hh_vault_remittances_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_REMITTANCES;
  });

  const [reignitions, setReignitions] = useState<ReignitionAccount[]>(() => {
    try {
      const saved = localStorage.getItem('hh_vault_reignitions_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_REIGNITION_ACCOUNTS;
  });

  const [deadstock, setDeadstock] = useState<DeadstockVaultItem[]>(() => {
    try {
      const saved = localStorage.getItem('hh_clearance_vault_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_DEADSTOCK;
  });

  const [profitMetrics] = useState<ClientProfitMetric[]>(INITIAL_PROFIT_METRICS);
  const [markdownDiscount, setMarkdownDiscount] = useState<number>(40);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('hh_vault_remittances_v1', JSON.stringify(remittances));
    } catch (e) {
      console.error(e);
    }
  }, [remittances]);

  useEffect(() => {
    try {
      localStorage.setItem('hh_clearance_vault_v1', JSON.stringify(deadstock));
    } catch (e) {
      console.error(e);
    }
  }, [deadstock]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // ── Financial Summaries ──
  const financialTotals = useMemo(() => {
    const courierHeld = remittances
      .filter((r) => r.status === 'COURIER_HELD')
      .reduce((acc, r) => acc + r.netSettledCashBdt, 0);

    const clearedCash = remittances
      .filter((r) => r.status === 'DEPOSITED')
      .reduce((acc, r) => acc + r.netSettledCashBdt, 0);

    const courierCommissionTotal = remittances.reduce(
      (acc, r) => acc + r.courierCommissionBdt + r.deliveryFeeBdt,
      0
    );

    return { courierHeld, clearedCash, courierCommissionTotal };
  }, [remittances]);

  // ── Action: Verify & Mark Deposited ──
  const handleVerifyDeposit = (id: string) => {
    const nowIso = new Date().toISOString();
    const txnRef = `BANK-DEP-${Date.now().toString().slice(-6)}`;

    setRemittances((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          status: 'DEPOSITED',
          depositedAt: nowIso,
          depositTxnRef: txnRef
        };
      })
    );

    showToast(`✓ Cash Verified & Deposited: ৳${remittances.find((r) => r.id === id)?.netSettledCashBdt.toLocaleString()} moved to Net Cash in Hand!`);
  };

  // ── Action: Dispatch 1-Click Re-Order Pitch ──
  const handleDispatchReorderPitch = (account: ReignitionAccount) => {
    const cleanPhone = account.phone.replace(/[^0-9]/g, '');
    const normalizedPhone =
      cleanPhone.startsWith('01') && cleanPhone.length === 11 ? '88' + cleanPhone : cleanPhone;

    const message = `*HANDS & HEAD ATELIER // ZERO-FRICTION REPLENISHMENT SPEC*
━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi ${account.contactName} (${account.client}),

Your previous production lot (*${account.lastPoNumber}*) was successfully delivered ${account.daysSinceDelivery} days ago.

Based on corporate restocking cycles, your team may be approaching replenishment thresholds.

🧵 *Archived Atelier Tooling & Specs:*
• Style: ${account.archivedStyleName}
• Fabric: ${account.archivedFabricSpec}
• Archived Colorways: ${account.archivedColorways.join(', ')}
• Approved Sizing Blocks & Debossing Dies: ARCHIVED & READY

⚡ *Zero-Friction Re-Order Authorization:*
We have reserved priority atelier capacity for a *${account.recommendedBatchSize}-unit replenishment batch* at your locked Tier-1 rate (*৳${account.archivedTier1FobBdt.toLocaleString()} / unit*).

Reply *"REORDER ${account.lastPoNumber}"* to release fabric for cutting with zero setup fees.

Hands & Head Atelier Operations`;

    const desktopWaUrl = `whatsapp://send?phone=${normalizedPhone}&text=${encodeURIComponent(message)}`;
    window.location.href = desktopWaUrl;

    setReignitions((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, status: 'PITCHED', pitchedAt: new Date().toISOString() } : a))
    );

    showToast(`✓ Tailored replenishment pitch dispatched via WhatsApp to ${account.client}!`);
  };

  // ── Action: Export Deadstock to VIP Flash Broadcast ──
  const handleExportFlashBroadcast = () => {
    const activeLots = deadstock.filter((d) => d.status === 'AVAILABLE');
    if (activeLots.length === 0) {
      showToast('No active deadstock lots available for broadcast.');
      return;
    }

    const lotLines = activeLots
      .map(
        (l) =>
          `• *${l.styleName}* (${l.colorway})
  Available: ${l.unitsAvailable} pcs | Reg FOB: ৳${l.standardFobBdt.toLocaleString()}
  *VIP Clearance: ৳${l.clearancePriceBdt.toLocaleString()}* (-${l.discountPct}% Cost-Recovery)`
      )
      .join('\n\n');

    const broadcastText = `🔥 *HANDS & HEAD ATELIER // VIP CLEARANCE VAULT LIQUIDATION*
━━━━━━━━━━━━━━━━━━━━━━━━━━
Exclusive factory overrun and archived QC specimens available for immediate dispatch. First-come reservation; no MOQ restriction.

${lotLines}

⚡ *Instant Reservation:*
Reply *"CLAIM [STYLE NAME] + [QTY]"* on WhatsApp to lock allocation with same-day dispatch.

Hands & Head Logistics & Inventory Desk`;

    navigator.clipboard.writeText(broadcastText);
    showToast('✓ Raw VIP Flash Broadcast copy saved to clipboard! Ready to paste to VIP Broadcast List.');
  };

  return (
    <div className="w-full bg-[#0D0D0C] text-[#EAEAE6] font-sans border border-[#222220] rounded-lg shadow-2xl overflow-hidden">
      {/* ── Top Industrial Header ── */}
      <div className="bg-[#121211] border-b border-[#222220] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E599] animate-pulse"></span>
            <span className="font-mono text-xs font-bold text-[#00E599] tracking-wider uppercase">
              [VAULT_REORDER]
            </span>
          </div>
          <div className="h-4 w-px bg-[#262624]"></div>
          <div>
            <h1 className="text-sm font-bold text-[#F4F4F0] uppercase tracking-wide flex items-center gap-2">
              Vault &amp; Reorder Engine
              <span className="text-[10px] bg-[#1F1F1D] text-[#A0A09B] px-2 py-0.5 rounded font-mono font-normal">
                v2.1 MONETIZATION &amp; RECONCILIATION
              </span>
            </h1>
          </div>
        </div>

        {/* Top Financial Stat Pills */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <div className="bg-[#161615] border border-[#222220] rounded px-3 py-1 flex items-center gap-2">
            <span className="text-[#FFCC00]">COURIER-HELD COD:</span>
            <span className="text-[#FFCC00] font-bold">
              ৳{financialTotals.courierHeld.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#161615] border border-[#222220] rounded px-3 py-1 flex items-center gap-2">
            <span className="text-[#00E599]">CLEARED IN HAND:</span>
            <span className="text-[#00E599] font-bold">
              ৳{financialTotals.clearedCash.toLocaleString()}
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

      {/* ── Tab Selector Navigation ── */}
      <div className="bg-[#141413] border-b border-[#222220] px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {[
            { key: 'REMITTANCE', label: '1. Courier Remittance Terminal', icon: '💰' },
            { key: 'REIGNITION', label: '2. 30-Day Re-Ignition Radar', icon: '📡' },
            { key: 'CLEARANCE', label: '3. Deadstock & Overrun Vault', icon: '📦' },
            { key: 'LTV_PROFIT', label: '4. Client Net Profit & LTV', icon: '📊' }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all flex items-center gap-1.5 ${
                activeTab === t.key
                  ? 'bg-[#00E599] text-black shadow-sm'
                  : 'bg-[#181817] text-[#A0A09B] border border-[#262624] hover:border-[#383835]'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="text-[10px] font-mono text-[#777772]">
          POST-FULFILLMENT MONETIZATION CORE
        </div>
      </div>

      {/* ── TAB 1: Courier Remittance & Reconciliation Terminal ── */}
      {activeTab === 'REMITTANCE' && (
        <div className="p-4 space-y-4">
          <div className="bg-[#141413] border border-[#222220] rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#00E599] uppercase tracking-wider">
                  COURIER CASH RECONCILIATION TERMINAL
                </span>
                <p className="text-xs text-[#888884] mt-0.5">
                  Real-time reconciliation of COD collected by Steadfast, Pathao, RedX and DHL Air Cargo.
                </p>
              </div>

              <div className="text-right font-mono text-xs">
                <span className="text-[#888884]">TOTAL FEES DEDUCTED:</span>{' '}
                <span className="text-[#FF5500] font-bold">
                  ৳{financialTotals.courierCommissionTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* High-density financial data grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#222220] text-[#777772] text-[10px] uppercase">
                    <th className="py-2 px-3">Order Ref &amp; Client</th>
                    <th className="py-2 px-3">Carrier &amp; Consignment</th>
                    <th className="py-2 px-3 text-right">Gross COD (BDT)</th>
                    <th className="py-2 px-3 text-right">Fee &amp; Commission</th>
                    <th className="py-2 px-3 text-right">Net Settled Cash</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Reconciliation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B1B19]">
                  {remittances.map((rem) => {
                    const isHeld = rem.status === 'COURIER_HELD';
                    return (
                      <tr key={rem.id} className="hover:bg-[#181817]/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-[#EAEAE6] block">{rem.poNumber}</span>
                          <span className="text-[11px] text-[#888884] block">{rem.client}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="text-[#00E5FF] font-bold block">{rem.courier}</span>
                          <span className="text-[10px] text-[#777772] block">{rem.consignmentId}</span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-[#EAEAE6]">
                          ৳{rem.grossCodBdt.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-right text-[#FF5500]">
                          -৳{(rem.deliveryFeeBdt + rem.courierCommissionBdt).toLocaleString()}
                          <span className="text-[9px] text-[#777772] block">
                            (Fee: ৳{rem.deliveryFeeBdt} + 1% Comm)
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-[#00E599]">
                          ৳{rem.netSettledCashBdt.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isHeld
                                ? 'bg-[#FFCC00]/15 text-[#FFCC00] border border-[#FFCC00]/30'
                                : 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30'
                            }`}
                          >
                            {isHeld ? 'COURIER HELD' : 'CLEARED IN HAND'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          {isHeld ? (
                            <button
                              onClick={() => handleVerifyDeposit(rem.id)}
                              className="px-3 py-1 bg-[#00E599] hover:bg-[#00c985] text-black font-bold text-[11px] rounded transition-colors shadow-sm"
                            >
                              VERIFY &amp; MARK DEPOSITED
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#00E599] flex items-center justify-end gap-1">
                              ✓ {rem.depositTxnRef}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: 30-Day Corporate Re-Ignition Radar ── */}
      {activeTab === 'REIGNITION' && (
        <div className="p-4 space-y-4">
          <div className="bg-[#141413] border border-[#222220] rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#FFCC00] uppercase tracking-wider">
                  30-DAY CORPORATE RE-IGNITION RADAR
                </span>
                <p className="text-xs text-[#888884] mt-0.5">
                  Automated re-order trigger analyzing buyer delivery age (21–30 days post-fulfillment) to lock repeat volume runs.
                </p>
              </div>

              <div className="text-right font-mono text-xs text-[#00E599]">
                ZERO-FRICTION REPLENISHMENT ACTIVATED
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {reignitions.map((acc) => (
                <div
                  key={acc.id}
                  className="bg-[#161615] border border-[#222220] hover:border-[#383835] rounded p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-[#FFCC00] font-bold">
                        {acc.daysSinceDelivery} DAYS POST-DELIVERY
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1F1D] text-[#A0A09B]">
                        PO: {acc.lastPoNumber}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{acc.client}</h3>
                    <div className="text-[11px] text-[#888884] mt-0.5">{acc.contactName}</div>

                    <div className="mt-3 bg-[#111110] p-2 rounded border border-[#1F1F1D] text-xs font-mono space-y-1">
                      <div className="text-[#777772] text-[10px] uppercase">Archived Spec:</div>
                      <div className="text-[#EAEAE6] font-medium truncate">{acc.archivedStyleName}</div>
                      <div className="text-[10px] text-[#00E5FF] truncate">{acc.archivedFabricSpec}</div>
                      <div className="text-[10px] text-[#00E599]">
                        Locked Rate: ৳{acc.archivedTier1FobBdt.toLocaleString()} / unit
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#222220]">
                    <button
                      onClick={() => handleDispatchReorderPitch(acc)}
                      className={`w-full py-2 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        acc.status === 'PITCHED'
                          ? 'bg-[#1F1F1D] text-[#00E599] border border-[#00E599]/30'
                          : 'bg-[#FFCC00] hover:bg-[#e6b800] text-black shadow-sm'
                      }`}
                    >
                      <span>💬</span>
                      <span>
                        {acc.status === 'PITCHED' ? 'PITCHED (DISPATCH AGAIN)' : 'DISPATCH 1-CLICK RE-ORDER PITCH'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Deadstock & QC Overrun Clearance Dock ── */}
      {activeTab === 'CLEARANCE' && (
        <div className="p-4 space-y-4">
          <div className="bg-[#141413] border border-[#222220] rounded p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#FF5500] uppercase tracking-wider">
                  DEADSTOCK &amp; QC OVERRUN CLEARANCE DOCK
                </span>
                <p className="text-xs text-[#888884] mt-0.5">
                  Cost-recovery liquidation engine converting surplus atelier specimens into instant cash flow.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportFlashBroadcast}
                  className="px-3.5 py-1.5 bg-[#FF5500] hover:bg-[#e04b00] text-black font-mono font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <span>⚡ EXPORT TO VIP FLASH BROADCAST</span>
                </button>
              </div>
            </div>

            {/* Markdown Calculator Controls */}
            <div className="bg-[#111110] border border-[#222220] rounded p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#888884] uppercase">
                  MARKDOWN COST-RECOVERY SLIDER:
                </span>
                <div className="flex items-center gap-1">
                  {[30, 40, 50].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setMarkdownDiscount(pct)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                        markdownDiscount === pct
                          ? 'bg-[#FF5500] text-black'
                          : 'bg-[#181817] text-[#A0A09B] border border-[#262624]'
                      }`}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs font-mono text-[#A0A09B]">
                Active Discount Applied: <span className="text-[#FF5500] font-bold">-{markdownDiscount}% off standard FOB</span>
              </div>
            </div>

            {/* Deadstock Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {deadstock.map((item) => {
                const discountedPrice = Math.round(item.standardFobBdt * (1 - markdownDiscount / 100));
                return (
                  <div
                    key={item.id}
                    className="bg-[#161615] border border-[#222220] rounded p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="text-[#FF5500] font-bold">{item.unitsAvailable} PCS AVAILABLE</span>
                        <span className="text-[10px] text-[#777772]">{item.reason}</span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{item.styleName}</h4>
                      <div className="text-xs text-[#888884] mt-0.5">{item.fabricLeatherType}</div>
                      <div className="text-[11px] font-mono text-[#00E5FF] mt-1">{item.colorway}</div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#222220] flex items-center justify-between font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-[#777772] block line-through">
                          ৳{item.standardFobBdt.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-[#00E599]">
                          ৳{discountedPrice.toLocaleString()}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-[#FF5500] bg-[#FF5500]/10 border border-[#FF5500]/20 px-2 py-0.5 rounded">
                        -{markdownDiscount}% RECOVERY
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Client Net Profit & LTV Matrix ── */}
      {activeTab === 'LTV_PROFIT' && (
        <div className="p-4 space-y-4">
          <div className="bg-[#141413] border border-[#222220] rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#00E5FF] uppercase tracking-wider">
                  CLIENT NET PROFIT &amp; LTV MATRIX
                </span>
                <p className="text-xs text-[#888884] mt-0.5">
                  True pocket margin per B2B corporate account: Total Revenue minus Material, Subcontract &amp; Courier logistics fees.
                </p>
              </div>

              <div className="font-mono text-xs text-[#00E599]">
                CASH EFFICIENCY RANKING
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#222220] text-[#777772] text-[10px] uppercase">
                    <th className="py-2 px-3">Corporate Account</th>
                    <th className="py-2 px-3 text-right">Delivered Vol (Pcs)</th>
                    <th className="py-2 px-3 text-right">Gross Revenue</th>
                    <th className="py-2 px-3 text-right">Materials + Subcontract</th>
                    <th className="py-2 px-3 text-right">Logistics Fees</th>
                    <th className="py-2 px-3 text-right">Net Profit</th>
                    <th className="py-2 px-3 text-right">Net Margin %</th>
                    <th className="py-2 px-3 text-center">Cash Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B1B19]">
                  {profitMetrics.map((client) => {
                    const totalCost = client.materialCostBdt + client.subcontractCostBdt;
                    return (
                      <tr key={client.clientId} className="hover:bg-[#181817]/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-white block">{client.clientName}</span>
                          <span className="text-[10px] text-[#777772]">{client.clientId}</span>
                        </td>

                        <td className="py-2.5 px-3 text-right text-[#EAEAE6]">
                          {client.totalVolumePcs.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-[#EAEAE6]">
                          ৳{client.grossRevenueBdt.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-right text-[#FF5500]">
                          -৳{totalCost.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-right text-[#FF5500]">
                          -৳{client.logisticsFeesBdt.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-[#00E599]">
                          ৳{client.netProfitBdt.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`font-bold ${
                              client.netMarginPct >= 40
                                ? 'text-[#00E599]'
                                : client.netMarginPct >= 30
                                ? 'text-[#00E5FF]'
                                : 'text-[#FFCC00]'
                            }`}
                          >
                            {client.netMarginPct.toFixed(1)}%
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              client.cashEfficiencyRating === 'TIER_1_PRIME'
                                ? 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30'
                                : client.cashEfficiencyRating === 'TIER_2_SOLID'
                                ? 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30'
                                : 'bg-[#FFCC00]/15 text-[#FFCC00] border border-[#FFCC00]/30'
                            }`}
                          >
                            {client.cashEfficiencyRating.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification Bar ── */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-[11000] bg-[#161615] border border-[#00E599] text-[#EAEAE6] px-4 py-2.5 rounded shadow-2xl font-mono text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00E599] animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default VaultAndReorderEngine;
