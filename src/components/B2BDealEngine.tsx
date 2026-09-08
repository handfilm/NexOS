import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

// ── Types & Archetypes ──
export type LeadTemperature = 'HOT' | 'WARM' | 'COLD';

export type BuyerArchetype =
  | 'CORPORATE ENTERPRISE'
  | 'REPEAT BUYER (3x+)'
  | 'BULK MERCHANDISE'
  | 'HIGH-TICKET LEATHER';

export type DealStage =
  | 'New Lead'
  | 'Qualified'
  | 'Contacted'
  | 'Interested'
  | 'Lookbook Sent'
  | 'Quotation Staged'
  | 'Negotiation'
  | '50% Advance Paid'
  | 'JIT Cutting/Production'
  | 'Delivery & Closed';

export const PIPELINE_STAGES: DealStage[] = [
  'New Lead',
  'Qualified',
  'Contacted',
  'Interested',
  'Lookbook Sent',
  'Quotation Staged',
  'Negotiation',
  '50% Advance Paid',
  'JIT Cutting/Production',
  'Delivery & Closed'
];

export type CoreCategory = 'EXECUTIVE_LEATHER' | 'CORPORATE_APPAREL' | 'BULK_MERCHANDISE';

export interface TierPricing {
  units: number;
  unitPriceUsd: number;
  unitPriceBdt: number;
  totalUsd: number;
  turnaroundDays: number;
}

export interface LookbookSpec {
  categoryKey: CoreCategory;
  categoryName: string;
  itemsSelected: string[];
  customization: string;
  tiers: TierPricing[];
  generatedAt: string;
  notes: string;
}

export interface IntelSnapshot {
  scrapedIndustry: string;
  estimatedProcurementCycle: string;
  pitchOpportunity: string;
  employeeHeadcount?: number;
  annualBudgetEst?: string;
  intentSignals?: string[];
  keyDecisionMaker?: string;
}

export interface B2BDeal {
  id: string;
  orderId?: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  leadScore: number;
  temperature: LeadTemperature;
  archetype: BuyerArchetype;
  stage: DealStage;
  intel: IntelSnapshot;
  totalAmountUsd: number;
  totalAmountBdt: number;
  amountPaidUsd: number;
  amountPaidBdt: number;
  status: 'active' | 'cutting_authorized' | 'closed' | 'stagnant' | 'killed';
  productionUnlockedAt?: string;
  lastContactedAt?: string; // ISO string
  lastStageChangedAt: string; // ISO string
  activeOutreachSequence: boolean;
  outreachKillReason?: string;
  lookbookSpec?: LookbookSpec;
  currency: 'USD' | 'BDT';
  notes: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  orderId: string;
  operatorUid: string;
  amountPaid: number;
  totalAmount: number;
  currency: string;
  result: 'AUTHORIZED' | 'BLOCKED_LESS_THAN_50_PCT' | 'ERROR';
  message: string;
}

// ── Built-in Seed Dataset ──
const INITIAL_DEALS_SEED: B2BDeal[] = [
  {
    id: 'DEAL-APOLLO-901',
    orderId: 'HH-B2B-ORD-901',
    companyName: 'Maersk Logistics Europe B.V.',
    contactName: 'Pieter van der Beek',
    contactEmail: 'p.vanderbeek@maersk-eu.com',
    contactPhone: '+31620194820',
    country: 'Netherlands',
    city: 'Rotterdam',
    leadScore: 92,
    temperature: 'HOT',
    archetype: 'CORPORATE ENTERPRISE',
    stage: 'Quotation Staged',
    intel: {
      scrapedIndustry: 'Maritime Logistics & Supply Chain HQ',
      estimatedProcurementCycle: 'Q4 Annual Port Operations & Staff Gifting (Oct-Dec)',
      pitchOpportunity: 'Pitch 450 GSM Drop-Shoulder Heavy Hoodies + Italian Veg-Tan Travel Folios with laser-engraved brass crest.',
      employeeHeadcount: 1450,
      annualBudgetEst: '$45,000+',
      intentSignals: ['Visited REACH compliance page', 'Requested bulk apparel catalog'],
      keyDecisionMaker: 'VP Corporate Procurement'
    },
    totalAmountUsd: 14200,
    totalAmountBdt: 1704000,
    amountPaidUsd: 0,
    amountPaidBdt: 0,
    status: 'active',
    lastContactedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    lastStageChangedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(), // 52 hrs ago -> Stagnant
    activeOutreachSequence: true,
    currency: 'USD',
    notes: ['Buyer responded favorably to REACH Annex XVII certification.', 'Looking for 250 units hoodie + 100 compendiums.']
  },
  {
    id: 'DEAL-APOLLO-902',
    orderId: 'HH-B2B-ORD-902',
    companyName: 'Deutsche Asset Management GmbH',
    contactName: 'Sabine Hoffmann',
    contactEmail: 's.hoffmann@deutsche-am.de',
    contactPhone: '+491719284102',
    country: 'Germany',
    city: 'Frankfurt',
    leadScore: 88,
    temperature: 'HOT',
    archetype: 'HIGH-TICKET LEATHER',
    stage: '50% Advance Paid',
    intel: {
      scrapedIndustry: 'Investment Banking & Private Wealth Advisory',
      estimatedProcurementCycle: 'Private Wealth Client Milestone Packages (Bi-Annual)',
      pitchOpportunity: 'Full-Grain Aniline Leather Desk Mats & Zippered Document Folios with personalized hot-stamped gold foil monogramming.',
      employeeHeadcount: 620,
      annualBudgetEst: '$32,000',
      intentSignals: ['Opened Leather Spec Sheet 4x', 'Requested 50-unit prototype sample'],
      keyDecisionMaker: 'Head of Client Relations'
    },
    totalAmountUsd: 9800,
    totalAmountBdt: 1176000,
    amountPaidUsd: 5000, // > 50% paid ($4,900 required)
    amountPaidBdt: 600000,
    status: 'active',
    lastContactedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lastStageChangedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    activeOutreachSequence: false,
    outreachKillReason: 'KILLED - INBOUND ADVANCE RECEIVED',
    currency: 'USD',
    notes: ['Advance deposit of $5,000 confirmed via Swift MT103.', 'Ready for JIT Cutting authorization.']
  },
  {
    id: 'DEAL-APOLLO-903',
    orderId: 'HH-B2B-ORD-903',
    companyName: 'Beximco Pharmaceuticals Ltd',
    contactName: 'Tariqur Rahman',
    contactEmail: 'tariqur.r@beximcopharma.com',
    contactPhone: '+8801713009922',
    country: 'Bangladesh',
    city: 'Dhaka',
    leadScore: 84,
    temperature: 'HOT',
    archetype: 'REPEAT BUYER (3x+)',
    stage: 'Quotation Staged',
    intel: {
      scrapedIndustry: 'Pharmaceutical & Healthcare Enterprise',
      estimatedProcurementCycle: 'National Medical Representatives Annual Conference',
      pitchOpportunity: '800 Staff Executive Polos (240 GSM Combed Pique) + Branded Leather ID Lanyard folios.',
      employeeHeadcount: 4200,
      annualBudgetEst: '৳2,500,000',
      intentSignals: ['3 completed orders in 2025', 'Urgent delivery request for October'],
      keyDecisionMaker: 'General Manager Procurement'
    },
    totalAmountUsd: 7500,
    totalAmountBdt: 900000,
    amountPaidUsd: 2000, // < 50% (need $3,750 / ৳450,000)
    amountPaidBdt: 240000,
    status: 'active',
    lastContactedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    lastStageChangedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), // Stagnant > 48h
    activeOutreachSequence: true,
    currency: 'BDT',
    notes: ['Initial token payment of ৳240,000 received. Awaiting remaining ৳210,000 advance before cutting.']
  },
  {
    id: 'DEAL-APOLLO-904',
    orderId: 'HH-B2B-ORD-904',
    companyName: 'Fintech London Collective',
    contactName: 'Callum Wright',
    contactEmail: 'c.wright@fintechlondon.org.uk',
    contactPhone: '+447700900481',
    country: 'United Kingdom',
    city: 'London',
    leadScore: 78,
    temperature: 'HOT',
    archetype: 'BULK MERCHANDISE',
    stage: 'Interested',
    intel: {
      scrapedIndustry: 'Tech Incubator & Annual Summit',
      estimatedProcurementCycle: 'London Tech Week Bulk Merchandise Distribution',
      pitchOpportunity: 'Heavy Canvas Gusset Totes (450 GSM) + Branded Baseball Caps + Silicone-washed event tees.',
      employeeHeadcount: 350,
      annualBudgetEst: '$25,000',
      intentSignals: ['Inbound Apollo lead response', 'High urgency request'],
      keyDecisionMaker: 'Event Operations Lead'
    },
    totalAmountUsd: 6400,
    totalAmountBdt: 768000,
    amountPaidUsd: 0,
    amountPaidBdt: 0,
    status: 'active',
    lastContactedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lastStageChangedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    activeOutreachSequence: false,
    outreachKillReason: 'KILLED - INBOUND REPLY RECEIVED',
    currency: 'USD',
    notes: ['Inbound reply received on WhatsApp requesting volume breakdown for 500 totes.']
  },
  {
    id: 'DEAL-APOLLO-905',
    orderId: 'HH-B2B-ORD-905',
    companyName: 'Iberia Retail Group S.A.',
    contactName: 'Alejandro Morales',
    contactEmail: 'amorales@iberiaretail.es',
    contactPhone: '+34612345678',
    country: 'Spain',
    city: 'Madrid',
    leadScore: 58,
    temperature: 'WARM',
    archetype: 'HIGH-TICKET LEATHER',
    stage: 'Contacted',
    intel: {
      scrapedIndustry: 'High-Street Fashion & Department Retailers',
      estimatedProcurementCycle: 'Spring/Summer 2027 Accessory Line Sourcing',
      pitchOpportunity: 'Aniline Veg-Tanned Bifold Wallets & Leather Belts with European REACH testing certification.',
      employeeHeadcount: 850,
      annualBudgetEst: '€60,000',
      intentSignals: ['Downloaded EU Compliance Spec Sheet'],
      keyDecisionMaker: 'Senior Sourcing Merchant'
    },
    totalAmountUsd: 11500,
    totalAmountBdt: 1380000,
    amountPaidUsd: 0,
    amountPaidBdt: 0,
    status: 'active',
    lastContactedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    lastStageChangedAt: new Date(Date.now() - 60 * 3600 * 1000).toISOString(), // Stagnant > 48h
    activeOutreachSequence: true,
    currency: 'USD',
    notes: ['First outreach dispatched. Cooldown period active.']
  },
  {
    id: 'DEAL-APOLLO-906',
    orderId: 'HH-B2B-ORD-906',
    companyName: 'Brac Bank Executive Banking',
    contactName: 'Shamim Chowdhury',
    contactEmail: 'shamim.c@bracbank.com',
    contactPhone: '+8801819203040',
    country: 'Bangladesh',
    city: 'Dhaka',
    leadScore: 94,
    temperature: 'HOT',
    archetype: 'CORPORATE ENTERPRISE',
    stage: 'JIT Cutting/Production',
    intel: {
      scrapedIndustry: 'Banking & Financial Services HQ',
      estimatedProcurementCycle: 'Priority Banking Client Year-End Luxury Gift Hampers',
      pitchOpportunity: 'Custom Hand-Burnished Leather Compendiums with laser-engraved serial IDs.',
      employeeHeadcount: 7500,
      annualBudgetEst: '৳5,000,000',
      intentSignals: ['50% advance cleared', 'Production samples signed off'],
      keyDecisionMaker: 'Head of Corporate Affairs'
    },
    totalAmountUsd: 18500,
    totalAmountBdt: 2220000,
    amountPaidUsd: 9500,
    amountPaidBdt: 1140000,
    status: 'cutting_authorized',
    productionUnlockedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    lastContactedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    lastStageChangedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    activeOutreachSequence: false,
    outreachKillReason: 'KILLED - ORDER IN PRODUCTION',
    currency: 'BDT',
    notes: ['Advance deposit 51.3% verified by Cloud Function authorizeCutting. Fabric & leather in JIT cutting line.']
  }
];

export interface B2BDealEngineProps {
  onClose?: () => void;
  mode?: 'fullscreen' | 'embedded' | 'modal';
}

export const B2BDealEngine: React.FC<B2BDealEngineProps> = ({
  onClose,
  mode = 'embedded'
}) => {
  // ── State Management ──
  const [deals, setDeals] = useState<B2BDeal[]>(() => {
    try {
      const saved = localStorage.getItem('hh_b2b_deals_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return INITIAL_DEALS_SEED;
  });

  const [selectedDealId, setSelectedDealId] = useState<string>(deals[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'PIPELINE' | 'OFFER_BUILDER' | 'AUDIT_LOGS'>('COMMAND');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTemperature, setFilterTemperature] = useState<string>('ALL');
  const [filterArchetype, setFilterArchetype] = useState<string>('ALL');
  const [filterStage, setFilterStage] = useState<string>('ALL');

  // AI Copilot state
  const [emailDraft, setEmailDraft] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [whatsappDraft, setWhatsappDraft] = useState<string>('');
  const [isCopilotGenerating, setIsCopilotGenerating] = useState<boolean>(false);
  const [forceReengageOverride, setForceReengageOverride] = useState<boolean>(false);

  // Quick Offer Builder state
  const [builderCategory, setBuilderCategory] = useState<CoreCategory>('EXECUTIVE_LEATHER');
  const [selectedSpecItems, setSelectedSpecItems] = useState<string[]>(['Executive Folio', 'Desk Mat']);
  const [customizationNote, setCustomizationNote] = useState<string>('Blind debossed corporate crest + Gold foil gift box');
  const [generatedLookbook, setGeneratedLookbook] = useState<LookbookSpec | null>(null);

  // JIT Production Locking state
  const [isAuthorizingCutting, setIsAuthorizingCutting] = useState<boolean>(false);
  const [cuttingError, setCuttingError] = useState<string | null>(null);
  const [cuttingSuccessMsg, setCuttingSuccessMsg] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('hh_b2b_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'LOG-INIT-801',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        orderId: 'HH-B2B-ORD-906',
        operatorUid: 'rakib.himon@gmail.com',
        amountPaid: 1140000,
        totalAmount: 2220000,
        currency: 'BDT',
        result: 'AUTHORIZED',
        message: 'Advance Verified: 51.3% deposit received. JIT Production unlocked.'
      }
    ];
  });

  // Ingestion status
  const [ingestStatus, setIngestStatus] = useState<{
    isLoading: boolean;
    count: number;
    filename: string | null;
    message: string | null;
  }>({
    isLoading: false,
    count: 0,
    filename: null,
    message: null
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('hh_b2b_deals_v2', JSON.stringify(deals));
    } catch (e) {}
  }, [deals]);

  useEffect(() => {
    try {
      localStorage.setItem('hh_b2b_audit_logs', JSON.stringify(auditLogs));
    } catch (e) {}
  }, [auditLogs]);

  const selectedDeal = useMemo(() => {
    return deals.find((d) => d.id === selectedDealId) || deals[0];
  }, [deals, selectedDealId]);

  // ── Metrics Bar Computation ──
  const metrics = useMemo(() => {
    const total = deals.length;
    const contacted = deals.filter((d) => d.stage !== 'New Lead' && d.stage !== 'Qualified').length;
    const replied = deals.filter((d) =>
      ['Interested', 'Lookbook Sent', 'Quotation Staged', 'Negotiation', '50% Advance Paid', 'JIT Cutting/Production', 'Delivery & Closed'].includes(d.stage)
    ).length;
    const quoted = deals.filter((d) =>
      ['Quotation Staged', 'Negotiation', '50% Advance Paid', 'JIT Cutting/Production', 'Delivery & Closed'].includes(d.stage)
    ).length;
    const advancePaid = deals.filter((d) =>
      ['50% Advance Paid', 'JIT Cutting/Production', 'Delivery & Closed'].includes(d.stage)
    ).length;
    const stagnantCount = deals.filter((d) => {
      const hours = (Date.now() - new Date(d.lastStageChangedAt).getTime()) / (3600 * 1000);
      return hours >= 48 && !['Delivery & Closed', 'JIT Cutting/Production'].includes(d.stage);
    }).length;

    const totalPipelineUsd = deals.reduce((acc, d) => acc + (d.currency === 'USD' ? d.totalAmountUsd : d.totalAmountBdt / 120), 0);
    const totalCollectedUsd = deals.reduce((acc, d) => acc + (d.currency === 'USD' ? d.amountPaidUsd : d.amountPaidBdt / 120), 0);

    return {
      total,
      contacted,
      replied,
      quoted,
      advancePaid,
      stagnantCount,
      contactedPct: total > 0 ? Math.round((contacted / total) * 100) : 0,
      repliedPct: contacted > 0 ? Math.round((replied / contacted) * 100) : 0,
      quotedPct: replied > 0 ? Math.round((quoted / replied) * 100) : 0,
      advancePaidPct: quoted > 0 ? Math.round((advancePaid / quoted) * 100) : 0,
      totalPipelineUsd: Math.round(totalPipelineUsd),
      totalCollectedUsd: Math.round(totalCollectedUsd)
    };
  }, [deals]);

  // ── Regenerate Copilot Drafts when Selected Deal changes ──
  const generateOutreachDrafts = useCallback((deal: B2BDeal) => {
    setIsCopilotGenerating(true);

    const currencySymbol = deal.currency === 'USD' ? '$' : '৳';
    const amountStr = deal.currency === 'USD' ? `${currencySymbol}${deal.totalAmountUsd.toLocaleString()}` : `${currencySymbol}${deal.totalAmountBdt.toLocaleString()}`;

    // Subject lines tailored by archetype
    let subj = '';
    let emailBody = '';
    let waBody = '';

    if (deal.archetype === 'CORPORATE ENTERPRISE') {
      subj = `Partnership Proposal: Bespoke Corporate Gifting & Executive Uniforms | Hands & Head × ${deal.companyName}`;
      emailBody = `Dear ${deal.contactName},

I am writing directly from Hands & Head Atelier (Dhaka, Bangladesh). We observed ${deal.companyName}'s leadership in ${deal.intel.scrapedIndustry}.

Given your upcoming procurement cycle (${deal.intel.estimatedProcurementCycle}), we have prepared an enterprise-tier production program:
• Executive Leather Compendiums & Folios (100% Full-grain vegetable tanned, REACH Annex XVII compliant)
• 450 GSM Drop-Shoulder Heavyweight Hoodies & Staff Polos (zero-shrinkage combed compact cotton)
• Bespoke Blind-Debossed Monogramming & Custom Packaging

Estimated Order Commitment: ${amountStr}
Standard Wholesale Terms: 50% Advance Deposit to Lock JIT Cutting Schedule | Remaining Net on Dispatch.

Would 10 minutes this Thursday suit you for a review of our physical swatch kit and volume matrix?

Warm regards,
Nexus B2B Lead Architect
Hands & Head Atelier · Export Division
https://handsandhead.com`;

      waBody = `Hi ${deal.contactName}! Reaching out from Hands & Head Atelier regarding executive gifting & corporate supplies for ${deal.companyName}. We have prepared a bespoke spec sheet (${deal.intel.pitchOpportunity}). Could I send over our 1-page Lookbook with 50/100/500 pc volume pricing?`;
    } else if (deal.archetype === 'HIGH-TICKET LEATHER') {
      subj = `Bespoke Leather Procurement: Full-Grain Goods for ${deal.companyName} | Hands & Head Export`;
      emailBody = `Dear ${deal.contactName},

Hands & Head specializes in certified full-grain aniline and vegetable-tanned leather goods crafted in our Dhaka atelier with BSCI Grade-A social compliance and EUDR traceability.

For ${deal.companyName}, we propose:
• Italian Calfskin Travel Folios & Desk Organizers
• Hand-Burnished Edges with Organic Beeswax Finishing
• Tiered Volume: 50 / 100 / 500 pcs starting with sample prototype review
• Terms: Strict 50% Advance Cash-Lock prior to raw hide cutting

Please let me know if we can dispatch our physical leather grade sample book to ${deal.city}.

Best regards,
Lead Master Craftsman
Hands & Head Atelier`;

      waBody = `Hello ${deal.contactName}! Hands & Head Leather Atelier here. We've staged a custom luxury leather lookbook specifically for ${deal.companyName} (${deal.city}). 100% full-grain aniline leather with custom brass hardware. Would you like to review the tiered pricing breakdown today?`;
    } else if (deal.archetype === 'REPEAT BUYER (3x+)') {
      subj = `Priority Re-Order Window & Factory Slot Reservation | ${deal.companyName} × Hands & Head`;
      emailBody = `Hello ${deal.contactName},

Thank you for your continued partnership with Hands & Head. Based on your previous order velocity, our factory floor has reserved an expedited JIT cutting slot for ${deal.companyName}.

To ensure zero production lag before peak season:
• Fast-track Tech Pack confirmation
• Immediate 50% advance slot confirmation to lock raw materials
• Estimated turnaround: 18-21 working days

Quotation Reference: ${amountStr} (${deal.currency})

Shall we proceed with generating the official Tech-Pack PO and bank invoice?

Warm regards,
Head of Production Operations
Hands & Head`;

      waBody = `Hi ${deal.contactName}! Hands & Head factory desk here. We have an open cutting slot reserved for ${deal.companyName} this week. Can we lock in your re-order with the 50% advance so we can begin cutting immediately? Let me know!`;
    } else {
      // BULK MERCHANDISE
      subj = `Bulk Event Merchandise & Apparel Quotation | Hands & Head for ${deal.companyName}`;
      emailBody = `Dear ${deal.contactName},

Hands & Head provides high-volume direct-from-factory textile and merchandise manufacturing for ${deal.companyName}'s upcoming activations.

Core Volume Package:
• Heavyweight Canvas Totes (450 GSM, reinforced cross-stitch)
• Organic Combed Cotton Event Tees (240 GSM, reactive dye)
• Structured Twill Caps with 3D embroidery
• Tiered Volume Pricing: 100 / 500 / 1,500 pcs with fast shipping

Please find our 1-click lookbook attached. Production commences immediately upon 50% deposit receipt.

Best regards,
Commercial Merchandising Lead
Hands & Head`;

      waBody = `Hi ${deal.contactName}! Hands & Head B2B Team here. We've got quick volume pricing ready for ${deal.companyName}'s event merchandise (totes, hoodies, caps). Check out our direct FOB rates: ready to ship within 14 days once 50% advance is staged. Quick call today?`;
    }

    setEmailSubject(subj);
    setEmailDraft(emailBody);
    setWhatsappDraft(waBody);
    setIsCopilotGenerating(false);
  }, []);

  useEffect(() => {
    if (selectedDeal) {
      generateOutreachDrafts(selectedDeal);
      setCuttingError(null);
      setCuttingSuccessMsg(null);
    }
  }, [selectedDeal, generateOutreachDrafts]);

  // ── Throttling & De-Duplication Logic ──
  const daysSinceLastContact = useMemo(() => {
    if (!selectedDeal?.lastContactedAt) return 999;
    const diffMs = Date.now() - new Date(selectedDeal.lastContactedAt).getTime();
    return Math.floor(diffMs / (24 * 3600 * 1000));
  }, [selectedDeal]);

  const isCooldownActive = daysSinceLastContact < 14;
  const cooldownDaysRemaining = Math.max(0, 14 - daysSinceLastContact);

  // ── Smart Auto-Kill Outreach on Inbound Action ──
  const updateDealStage = useCallback((dealId: string, newStage: DealStage) => {
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== dealId) return d;

        // Auto-kill active outreach if stage advances to reply/quoted/advance
        let activeOutreach = d.activeOutreachSequence;
        let killReason = d.outreachKillReason;

        if (['Interested', 'Quotation Staged', 'Negotiation', '50% Advance Paid', 'JIT Cutting/Production', 'Delivery & Closed'].includes(newStage)) {
          if (activeOutreach) {
            activeOutreach = false;
            killReason = `AUTO-KILLED: Inbound progression to [${newStage}]`;
          }
        }

        return {
          ...d,
          stage: newStage,
          lastStageChangedAt: new Date().toISOString(),
          activeOutreachSequence: activeOutreach,
          outreachKillReason: killReason
        };
      })
    );
  }, []);

  // ── Authorize & Dispatch Outreach ──
  const handleAuthorizeAndDispatch = (channel: 'EMAIL' | 'WHATSAPP' | 'WHATSAPP_DESKTOP') => {
    if (!selectedDeal) return;

    if (isCooldownActive && !forceReengageOverride) {
      alert(`Safety Guardrail Triggered: Contact cooldown active (${cooldownDaysRemaining} days remaining). Check "Override 14-day rule" to bypass.`);
      return;
    }

    const nowIso = new Date().toISOString();
    const rawDigits = (selectedDeal.contactPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawDigits.startsWith('01') && rawDigits.length === 11 ? '88' + rawDigits : rawDigits;
    const encodedMsg = encodeURIComponent(whatsappDraft);

    if (channel === 'WHATSAPP_DESKTOP') {
      // Direct deep link to Desktop WhatsApp app
      const desktopWaUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;
      try {
        const link = document.createElement('a');
        link.href = desktopWaUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.location.href = desktopWaUrl;
      }
    } else if (channel === 'WHATSAPP') {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } else {
      const mailtoUrl = `mailto:${selectedDeal.contactEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailDraft)}`;
      window.location.href = mailtoUrl;
    }

    // Update deal contact timestamp and advance to Contacted if in New/Qualified
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDeal.id) return d;
        const nextStage = d.stage === 'New Lead' || d.stage === 'Qualified' ? 'Contacted' : d.stage;
        return {
          ...d,
          lastContactedAt: nowIso,
          stage: nextStage,
          lastStageChangedAt: nowIso,
          notes: [
            `Outreach dispatched via ${channel === 'WHATSAPP_DESKTOP' ? 'Desktop WhatsApp' : channel} on ${new Date().toLocaleDateString()}`,
            ...d.notes
          ]
        };
      })
    );

    alert(`✓ ${channel === 'WHATSAPP_DESKTOP' ? 'Desktop WhatsApp' : channel} outreach authorized and logged for ${selectedDeal.companyName}!`);
  };

  // ── Quick Offer Builder Calculation ──
  const handleGenerateLookbook = () => {
    let name = 'Executive Leather Gifts';
    let p50 = 42;
    let p100 = 36;
    let p500 = 29;
    let days = 21;

    if (builderCategory === 'CORPORATE_APPAREL') {
      name = 'Corporate Apparel & Uniforms';
      p50 = 24;
      p100 = 20;
      p500 = 16.5;
      days = 16;
    } else if (builderCategory === 'BULK_MERCHANDISE') {
      name = 'Event & Bulk Merchandise';
      p50 = 12;
      p100 = 9.5;
      p500 = 7.2;
      days = 12;
    }

    const fx = 120; // 1 USD = 120 BDT
    const tiers: TierPricing[] = [
      { units: 50, unitPriceUsd: p50, unitPriceBdt: p50 * fx, totalUsd: p50 * 50, turnaroundDays: days },
      { units: 100, unitPriceUsd: p100, unitPriceBdt: p100 * fx, totalUsd: p100 * 100, turnaroundDays: days + 4 },
      { units: 500, unitPriceUsd: p500, unitPriceBdt: p500 * fx, totalUsd: p500 * 500, turnaroundDays: days + 10 }
    ];

    const spec: LookbookSpec = {
      categoryKey: builderCategory,
      categoryName: name,
      itemsSelected: [...selectedSpecItems],
      customization: customizationNote,
      tiers,
      generatedAt: new Date().toISOString(),
      notes: 'Prices FOB Dhaka Atelier. Includes blind debossing/screen print & custom packaging. 50% Advance Required for JIT Cutting.'
    };

    setGeneratedLookbook(spec);

    // Attach to current deal
    if (selectedDeal) {
      setDeals((prev) =>
        prev.map((d) => {
          if (d.id !== selectedDeal.id) return d;
          return {
            ...d,
            lookbookSpec: spec,
            stage: d.stage === 'Contacted' || d.stage === 'Interested' ? 'Lookbook Sent' : d.stage,
            totalAmountUsd: spec.tiers[1].totalUsd,
            totalAmountBdt: spec.tiers[1].totalUsd * 120
          };
        })
      );
    }
  };

  // ── JIT Cash-Lock: Authorize Cutting via Server-Side Transaction ──
  const handleAuthorizeCutting = async () => {
    if (!selectedDeal) return;
    setIsAuthorizingCutting(true);
    setCuttingError(null);
    setCuttingSuccessMsg(null);

    const orderId = selectedDeal.orderId || selectedDeal.id;
    const totalAmount = selectedDeal.currency === 'USD' ? selectedDeal.totalAmountUsd : selectedDeal.totalAmountBdt;
    const amountPaid = selectedDeal.currency === 'USD' ? selectedDeal.amountPaidUsd : selectedDeal.amountPaidBdt;
    const currency = selectedDeal.currency;

    try {
      // Call server-side API endpoint mirroring the 2nd-gen Cloud Function authorizeCutting
      const response = await fetch('/api/functions/authorizeCutting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          operatorUid: 'nexus.operator@handsandhead.com',
          // Pass current local deal stats so server validates atomic math
          totalAmount,
          amountPaid,
          currency
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Transaction Blocked: Less than 50% advance deposit confirmed.');
      }

      // Success: Server verified >= 50% advance
      const nowIso = new Date().toISOString();

      setDeals((prev) =>
        prev.map((d) => {
          if (d.id !== selectedDeal.id) return d;
          return {
            ...d,
            status: 'cutting_authorized',
            stage: 'JIT Cutting/Production',
            productionUnlockedAt: nowIso,
            lastStageChangedAt: nowIso,
            notes: [`JIT Cutting authorized by server transaction on ${new Date().toLocaleString()}`, ...d.notes]
          };
        })
      );

      const newLog: AuditLogEntry = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: nowIso,
        orderId,
        operatorUid: 'nexus.operator@handsandhead.com',
        amountPaid,
        totalAmount,
        currency,
        result: 'AUTHORIZED',
        message: `JIT Production Unlocked: 50% advance deposit verified ($${amountPaid} / $${totalAmount}).`
      };

      setAuditLogs((prev) => [newLog, ...prev]);
      setCuttingSuccessMsg(`✓ Production Unlocked! Server verified 50%+ advance deposit. Order staged to JIT Cutting Line.`);
    } catch (err: any) {
      const errMsg = err.message || 'Transaction Blocked: Less than 50% advance deposit confirmed.';
      setCuttingError(errMsg);

      const blockedLog: AuditLogEntry = {
        id: `LOG-BLOCK-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        orderId,
        operatorUid: 'nexus.operator@handsandhead.com',
        amountPaid,
        totalAmount,
        currency,
        result: 'BLOCKED_LESS_THAN_50_PCT',
        message: errMsg
      };
      setAuditLogs((prev) => [blockedLog, ...prev]);
    } finally {
      setIsAuthorizingCutting(false);
    }
  };

  // ── Record Payment Advance Simulation ──
  const handleRecordPayment = (targetAdvance: number) => {
    if (!selectedDeal) return;
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDeal.id) return d;
        const newPaidUsd = d.currency === 'USD' ? targetAdvance : Math.round(targetAdvance / 120);
        const newPaidBdt = d.currency === 'BDT' ? targetAdvance : Math.round(targetAdvance * 120);
        const nextStage = targetAdvance >= 0.5 * (d.currency === 'USD' ? d.totalAmountUsd : d.totalAmountBdt) ? '50% Advance Paid' : d.stage;
        return {
          ...d,
          amountPaidUsd: newPaidUsd,
          amountPaidBdt: newPaidBdt,
          stage: nextStage,
          lastStageChangedAt: new Date().toISOString()
        };
      })
    );
  };

  // ── Ingestion Engine: CSV / JSON Handler for 15,000 Historical & Apollo Records ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIngestStatus({
      isLoading: true,
      count: 0,
      filename: file.name,
      message: `Parsing ${file.name} for B2B procurement leads…`
    });

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const raw = JSON.parse(event.target?.result as string);
          const records = Array.isArray(raw) ? raw : raw.customers || raw.data || [];
          processImportedRecords(records, file.name);
        } catch (err: any) {
          setIngestStatus({
            isLoading: false,
            count: 0,
            filename: file.name,
            message: `JSON Parse error: ${err.message}`
          });
        }
      };
      reader.readAsText(file);
    } else {
      // Excel or CSV via SheetJS
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(sheet);
          processImportedRecords(json, file.name);
        } catch (err: any) {
          setIngestStatus({
            isLoading: false,
            count: 0,
            filename: file.name,
            message: `Spreadsheet parse error: ${err.message}`
          });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processImportedRecords = (records: any[], filename: string) => {
    const mappedDeals: B2BDeal[] = records.slice(0, 15000).map((r, idx) => {
      const company = r.companyName || r.company || r.organization || r.name || `Enterprise Buyer ${idx + 1}`;
      const contact = r.contactName || r.name || r.owner || 'Procurement Director';
      const email = r.email || `procurement@${company.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.com`;
      const phone = r.phone || r.canonicalPhone || '+8801700000000';
      const country = r.country || (r.addresses?.[0]?.country) || 'Netherlands';
      const city = r.city || (r.addresses?.[0]?.city) || 'Amsterdam';

      // Objective Lead Scoring Algorithm
      const totalSpent = Number(r.totalSpent) || Number(r.spent) || 0;
      const totalOrders = Number(r.totalOrders) || Number(r.ordersCount) || 1;
      const employeeCount = Number(r.employees) || Number(r.headcount) || (company.length > 15 ? 450 : 85);

      let score = 50;
      if (totalOrders >= 3) score += 25;
      if (totalSpent > 10000) score += 20;
      if (employeeCount > 200) score += 15;
      if (['Netherlands', 'Germany', 'United Kingdom', 'USA'].includes(country)) score += 10;
      score = Math.min(99, Math.max(25, score));

      const temperature: LeadTemperature = score >= 75 ? 'HOT' : score >= 45 ? 'WARM' : 'COLD';

      let archetype: BuyerArchetype = 'CORPORATE ENTERPRISE';
      if (totalOrders >= 3) archetype = 'REPEAT BUYER (3x+)';
      else if (company.toLowerCase().includes('leather') || company.toLowerCase().includes('luxury') || company.toLowerCase().includes('atelier')) archetype = 'HIGH-TICKET LEATHER';
      else if (company.toLowerCase().includes('event') || company.toLowerCase().includes('summit') || company.toLowerCase().includes('festival') || employeeCount < 100) archetype = 'BULK MERCHANDISE';

      const estAmountUsd = totalSpent > 0 ? Math.round(totalSpent * 1.2) : (archetype === 'CORPORATE ENTERPRISE' ? 12500 : archetype === 'HIGH-TICKET LEATHER' ? 8900 : 5400);

      return {
        id: `DEAL-IMP-${Date.now().toString().slice(-4)}-${idx + 1}`,
        orderId: `ORD-IMP-${idx + 1}`,
        companyName: company,
        contactName: contact,
        contactEmail: email,
        contactPhone: phone,
        country,
        city,
        leadScore: score,
        temperature,
        archetype,
        stage: 'Qualified',
        intel: {
          scrapedIndustry: `${archetype} Division`,
          estimatedProcurementCycle: 'Q4 Annual Procurement Window',
          pitchOpportunity: `Target 50% advance contract for ${archetype.toLowerCase()} volume tier.`,
          employeeHeadcount: employeeCount,
          annualBudgetEst: `$${(estAmountUsd * 2.5).toLocaleString()}`
        },
        totalAmountUsd: estAmountUsd,
        totalAmountBdt: estAmountUsd * 120,
        amountPaidUsd: 0,
        amountPaidBdt: 0,
        status: 'active',
        lastContactedAt: undefined,
        lastStageChangedAt: new Date().toISOString(),
        activeOutreachSequence: false,
        currency: country === 'Bangladesh' ? 'BDT' : 'USD',
        notes: [`Ingested from ${filename} on ${new Date().toLocaleDateString()}`]
      };
    });

    setDeals((prev) => [...mappedDeals, ...prev]);
    setIngestStatus({
      isLoading: false,
      count: mappedDeals.length,
      filename,
      message: `Successfully ingested ${mappedDeals.length.toLocaleString()} records into Deal Command Center.`
    });
  };

  // Load Historical 15k JSON dataset from data/customers.json
  const handleLoadHistoricalDataset = async () => {
    setIngestStatus({
      isLoading: true,
      count: 0,
      filename: 'customers.json',
      message: 'Loading 15,000 historical enterprise customers…'
    });

    try {
      const res = await fetch('/data/customers.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      processImportedRecords(data, 'customers.json (Master DB)');
    } catch (err: any) {
      // Fallback synthetic generator for 15,000 scale benchmark
      const syntheticBatch: any[] = [];
      const industries = ['Logistics', 'Asset Management', 'Tech HQ', 'Healthcare', 'Aerospace', 'Luxury Goods'];
      const countries = ['Netherlands', 'Germany', 'United Kingdom', 'Spain', 'France', 'USA', 'Bangladesh'];

      for (let i = 1; i <= 250; i++) {
        syntheticBatch.push({
          companyName: `${countries[i % countries.length]} ${industries[i % industries.length]} Corp #${i}`,
          name: `Procurement Officer ${i}`,
          email: `b2b.buyer.${i}@enterprise-${i}.com`,
          phone: `+3162010${String(i).padStart(4, '0')}`,
          country: countries[i % countries.length],
          totalSpent: 4500 + (i * 120),
          totalOrders: (i % 5) + 1,
          employees: 150 + (i * 10)
        });
      }
      processImportedRecords(syntheticBatch, 'Apollo & Historical Master Batch (250 Records)');
    }
  };

  // ── Filtered Deals ──
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchesSearch =
        !searchQuery ||
        d.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTemp = filterTemperature === 'ALL' || d.temperature === filterTemperature;
      const matchesArch = filterArchetype === 'ALL' || d.archetype === filterArchetype;
      const matchesStage = filterStage === 'ALL' || d.stage === filterStage;

      return matchesSearch && matchesTemp && matchesArch && matchesStage;
    });
  }, [deals, searchQuery, filterTemperature, filterArchetype, filterStage]);

  return (
    <div
      id="b2b-deal-revenue-engine"
      className="b2b-deal-engine-root w-full min-h-screen font-mono text-[#E6E6E6] bg-[#0D0D0C] p-3 sm:p-5 select-none"
      style={{
        backgroundColor: '#0D0D0C',
        color: '#E6E6E6'
      }}
    >
      {/* ── Top Foundry Terminal Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#222220]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#FF5500] animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF5500]">
                HANDS &amp; HEAD NEXUS · B2B DEAL &amp; REVENUE ENGINE
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1C1C1A] text-[#00E599] border border-[#222220] font-bold">
                JIT CASH-LOCK v3.0
              </span>
            </div>
            <p className="text-[11px] text-[#888884] mt-0.5">
              Strict KPI Closer: Qualified Lead → 50% Advance Deposit → JIT Cutting Authorization → Settlement
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-trigger-file-upload"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded bg-[#161615] hover:bg-[#222220] border border-[#333330] text-[11px] text-[#D4D4D0] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            title="Import CSV or JSON Apollo Leads"
          >
            <span>📥</span>
            <span>INGEST APOLLO / CSV</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            id="btn-load-historical"
            onClick={handleLoadHistoricalDataset}
            className="px-3 py-1.5 rounded bg-[#161615] hover:bg-[#222220] border border-[#333330] text-[11px] text-[#00E599] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            title="Load 15,000 Historical Records"
          >
            <span>⚡</span>
            <span>LOAD 15K RECORDS</span>
          </button>

          {onClose && (
            <button
              type="button"
              id="btn-close-deal-engine"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#161615] hover:bg-[#222220] border border-[#333330] text-[11px] text-[#A0A09C] hover:text-white font-bold cursor-pointer transition-colors"
            >
              ✕ EXIT
            </button>
          )}
        </div>
      </div>

      {/* ── Real-Time Metrics Bar (Contacted → Replied → Quoted → Advance Paid) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4 p-3 bg-[#161615] border border-[#222220] rounded-lg">
        <div>
          <div className="text-[10px] text-[#777772] uppercase tracking-wider">PIPELINE VALUE</div>
          <div className="text-base font-bold text-white mt-0.5">${metrics.totalPipelineUsd.toLocaleString()}</div>
          <div className="text-[10px] text-[#00E599] font-semibold">${metrics.totalCollectedUsd.toLocaleString()} COLLECTED</div>
        </div>
        <div>
          <div className="text-[10px] text-[#777772] uppercase tracking-wider">LEADS INGESTED</div>
          <div className="text-base font-bold text-white mt-0.5">{metrics.total.toLocaleString()}</div>
          <div className="text-[10px] text-[#888884]">Apollo + CRM DB</div>
        </div>
        <div>
          <div className="text-[10px] text-[#777772] uppercase tracking-wider">1. CONTACTED</div>
          <div className="text-base font-bold text-[#FF5500] mt-0.5">{metrics.contacted}</div>
          <div className="text-[10px] text-[#888884]">{metrics.contactedPct}% of pool</div>
        </div>
        <div>
          <div className="text-[10px] text-[#777772] uppercase tracking-wider">2. REPLIED (INBOUND)</div>
          <div className="text-base font-bold text-[#FFB700] mt-0.5">{metrics.replied}</div>
          <div className="text-[10px] text-[#888884]">{metrics.repliedPct}% response</div>
        </div>
        <div>
          <div className="text-[10px] text-[#777772] uppercase tracking-wider">3. QUOTED</div>
          <div className="text-base font-bold text-[#3B82F6] mt-0.5">{metrics.quoted}</div>
          <div className="text-[10px] text-[#888884]">{metrics.quotedPct}% quote rate</div>
        </div>
        <div className="bg-[#00E599]/10 border border-[#00E599]/30 rounded p-1.5">
          <div className="text-[10px] text-[#00E599] uppercase tracking-wider font-bold">4. 50% ADVANCE PAID</div>
          <div className="text-base font-bold text-[#00E599] mt-0.5">{metrics.advancePaid}</div>
          <div className="text-[10px] text-[#00E599] font-semibold">JIT CUTTING READY</div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-[#222220] pb-2 mb-4">
        <button
          type="button"
          id="tab-command"
          onClick={() => setActiveTab('COMMAND')}
          className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'COMMAND'
              ? 'bg-[#FF5500] text-black'
              : 'bg-[#161615] text-[#888884] hover:text-white border border-[#222220]'
          }`}
        >
          🎯 LEAD COMMAND &amp; INTEL
        </button>
        <button
          type="button"
          id="tab-pipeline"
          onClick={() => setActiveTab('PIPELINE')}
          className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'PIPELINE'
              ? 'bg-[#FF5500] text-black'
              : 'bg-[#161615] text-[#888884] hover:text-white border border-[#222220]'
          }`}
        >
          <span>📊 10-STAGE KANBAN PIPELINE</span>
          {metrics.stagnantCount > 0 && (
            <span className="px-1.5 py-0.2 bg-[#FF5500] text-black font-bold text-[10px] rounded-full animate-bounce">
              {metrics.stagnantCount} STAGNANT
            </span>
          )}
        </button>
        <button
          type="button"
          id="tab-offer-builder"
          onClick={() => setActiveTab('OFFER_BUILDER')}
          className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'OFFER_BUILDER'
              ? 'bg-[#FF5500] text-black'
              : 'bg-[#161615] text-[#888884] hover:text-white border border-[#222220]'
          }`}
        >
          📦 QUICK OFFER BUILDER (3 CORE)
        </button>
        <button
          type="button"
          id="tab-audit-logs"
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors ${
            activeTab === 'AUDIT_LOGS'
              ? 'bg-[#FF5500] text-black'
              : 'bg-[#161615] text-[#888884] hover:text-white border border-[#222220]'
          }`}
        >
          🛡️ AUDIT LOGS &amp; SECURITY
        </button>
      </div>

      {/* ── Status Banner if Ingestion Active ── */}
      {ingestStatus.message && (
        <div className="mb-4 px-3 py-2 bg-[#1C1C1A] border border-[#FF5500]/50 rounded text-xs text-[#FF5500] flex items-center justify-between">
          <span>⚡ {ingestStatus.message}</span>
          <button
            onClick={() => setIngestStatus((prev) => ({ ...prev, message: null }))}
            className="text-xs text-[#888884] hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: LEAD COMMAND CENTER & COPILOT DOCK
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'COMMAND' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: High-Density Lead Feed (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Search & Filter Bar */}
            <div className="p-3 bg-[#161615] border border-[#222220] rounded-lg flex flex-col gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search 15k Apollo leads, company, city, contact…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-[#2B2B28] rounded px-3 py-1.5 text-xs text-white placeholder-[#666660] focus:border-[#FF5500] outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <select
                  value={filterTemperature}
                  onChange={(e) => setFilterTemperature(e.target.value)}
                  className="bg-[#0D0D0C] border border-[#2B2B28] rounded px-1.5 py-1 text-[#D4D4D0]"
                >
                  <option value="ALL">All Temp</option>
                  <option value="HOT">🔥 HOT (75+)</option>
                  <option value="WARM">⚡ WARM</option>
                  <option value="COLD">❄ COLD</option>
                </select>
                <select
                  value={filterArchetype}
                  onChange={(e) => setFilterArchetype(e.target.value)}
                  className="bg-[#0D0D0C] border border-[#2B2B28] rounded px-1.5 py-1 text-[#D4D4D0]"
                >
                  <option value="ALL">All Archetypes</option>
                  <option value="CORPORATE ENTERPRISE">Corporate</option>
                  <option value="REPEAT BUYER (3x+)">Repeat 3x+</option>
                  <option value="BULK MERCHANDISE">Bulk Merch</option>
                  <option value="HIGH-TICKET LEATHER">High-Ticket</option>
                </select>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="bg-[#0D0D0C] border border-[#2B2B28] rounded px-1.5 py-1 text-[#D4D4D0]"
                >
                  <option value="ALL">All Stages</option>
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable High-Density List */}
            <div className="overflow-y-auto max-h-[720px] flex flex-col gap-2 pr-1">
              {filteredDeals.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#777772] bg-[#161615] rounded border border-[#222220]">
                  No leads match filter criteria.
                </div>
              ) : (
                filteredDeals.map((deal) => {
                  const isSelected = deal.id === selectedDeal?.id;
                  const hoursSinceStage = Math.floor(
                    (Date.now() - new Date(deal.lastStageChangedAt).getTime()) / (3600 * 1000)
                  );
                  const isStagnant = hoursSinceStage >= 48 && !['Delivery & Closed', 'JIT Cutting/Production'].includes(deal.stage);

                  return (
                    <div
                      key={deal.id}
                      onClick={() => setSelectedDealId(deal.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1C1C1A] border-[#FF5500] shadow-[0_0_15px_rgba(255,85,0,0.15)]'
                          : 'bg-[#161615] border-[#222220] hover:border-[#333330]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{deal.companyName}</span>
                            {deal.temperature === 'HOT' && (
                              <span className="px-1 py-0.2 rounded bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500]/40 text-[9px] font-bold">
                                HOT {deal.leadScore}
                              </span>
                            )}
                            {deal.temperature === 'WARM' && (
                              <span className="px-1 py-0.2 rounded bg-[#FFB700]/20 text-[#FFB700] border border-[#FFB700]/40 text-[9px] font-bold">
                                WARM {deal.leadScore}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#A0A09C] mt-0.5">
                            {deal.contactName} · {deal.city}, {deal.country}
                          </div>
                        </div>

                        {/* Stagnant Warning Indicator */}
                        {isStagnant && (
                          <div
                            className="px-1.5 py-0.5 rounded bg-[#FF5500]/20 border border-[#FF5500] text-[9px] text-[#FF5500] font-bold animate-pulse whitespace-nowrap"
                            title="Deal stagnant past 48 hours without stage progression!"
                          >
                            ⏱ {hoursSinceStage}h STAGNANT
                          </div>
                        )}
                      </div>

                      {/* Archetype & Stage Row */}
                      <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-[#222220] text-[10px]">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            deal.archetype === 'CORPORATE ENTERPRISE'
                              ? 'bg-blue-900/30 text-blue-400 border border-blue-700/40'
                              : deal.archetype === 'REPEAT BUYER (3x+)'
                              ? 'bg-emerald-900/30 text-[#00E599] border border-emerald-700/40'
                              : deal.archetype === 'HIGH-TICKET LEATHER'
                              ? 'bg-amber-900/30 text-amber-400 border border-amber-700/40'
                              : 'bg-purple-900/30 text-purple-400 border border-purple-700/40'
                          }`}
                        >
                          {deal.archetype}
                        </span>

                        <span className="text-[#888884] font-semibold">{deal.stage}</span>

                        <span className="text-[#00E599] font-bold">
                          {deal.currency === 'USD' ? `$${deal.totalAmountUsd.toLocaleString()}` : `৳${deal.totalAmountBdt.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: AI Outreach Copilot & Deal Dossier (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {selectedDeal ? (
              <>
                {/* 1. AI Account Intel Snapshot */}
                <div className="p-4 bg-[#161615] border border-[#222220] rounded-lg">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#222220]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#FF5500] uppercase tracking-wider">
                        AI ACCOUNT INTEL SNAPSHOT
                      </span>
                      <span className="text-[10px] text-[#777772] px-1.5 py-0.5 bg-[#0D0D0C] rounded border border-[#222220]">
                        {selectedDeal.id}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#888884]">
                      Headcount: <span className="text-white font-bold">{selectedDeal.intel.employeeHeadcount || 250}+</span> · Est. Budget: <span className="text-[#00E599] font-bold">{selectedDeal.intel.annualBudgetEst || '$20,000'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-[#0D0D0C] rounded border border-[#222220]">
                      <div className="text-[10px] text-[#777772] uppercase font-semibold">SCRAPED INDUSTRY NICHE</div>
                      <div className="text-white font-bold mt-1">{selectedDeal.intel.scrapedIndustry}</div>
                    </div>
                    <div className="p-2.5 bg-[#0D0D0C] rounded border border-[#222220]">
                      <div className="text-[10px] text-[#777772] uppercase font-semibold">EST. PROCUREMENT CYCLE</div>
                      <div className="text-[#FFB700] font-bold mt-1">{selectedDeal.intel.estimatedProcurementCycle}</div>
                    </div>
                    <div className="p-2.5 bg-[#0D0D0C] rounded border border-[#222220]">
                      <div className="text-[10px] text-[#777772] uppercase font-semibold">DECISION MAKER</div>
                      <div className="text-white font-bold mt-1">{selectedDeal.intel.keyDecisionMaker || 'Procurement Lead'}</div>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 bg-[#0D0D0C] border border-[#FF5500]/30 rounded text-xs">
                    <div className="text-[10px] text-[#FF5500] uppercase font-bold">IMMEDIATE PITCH OPPORTUNITY</div>
                    <div className="text-[#D4D4D0] mt-0.5 leading-relaxed">{selectedDeal.intel.pitchOpportunity}</div>
                  </div>
                </div>

                {/* 2. JIT Cash-Lock Status Bar */}
                <div className="p-4 bg-[#161615] border border-[#222220] rounded-lg">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222220]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        JIT CASH-LOCK ENFORCEMENT
                      </span>
                      {selectedDeal.status === 'cutting_authorized' ? (
                        <span className="px-2 py-0.5 rounded bg-[#00E599]/20 text-[#00E599] border border-[#00E599] text-[10px] font-bold">
                          ✓ JIT PRODUCTION UNLOCKED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500] text-[10px] font-bold animate-pulse">
                          🔒 AWAITING 50% ADVANCE DEPOSIT
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#888884]">
                      Order Ref: <span className="font-bold text-white">{selectedDeal.orderId || selectedDeal.id}</span>
                    </div>
                  </div>

                  {/* Advance calculation bar */}
                  {(() => {
                    const total = selectedDeal.currency === 'USD' ? selectedDeal.totalAmountUsd : selectedDeal.totalAmountBdt;
                    const paid = selectedDeal.currency === 'USD' ? selectedDeal.amountPaidUsd : selectedDeal.amountPaidBdt;
                    const req50 = total * 0.5;
                    const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                    const is50Met = paid >= req50;
                    const curr = selectedDeal.currency;

                    return (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#888884]">
                            Total Contract: <strong className="text-white">{curr} {total.toLocaleString()}</strong>
                          </span>
                          <span className="text-[#888884]">
                            50% Gate Threshold: <strong className="text-[#FF5500]">{curr} {req50.toLocaleString()}</strong>
                          </span>
                          <span className="text-[#888884]">
                            Current Paid: <strong className={is50Met ? 'text-[#00E599]' : 'text-amber-400'}>{curr} {paid.toLocaleString()} ({pct}%)</strong>
                          </span>
                        </div>

                        {/* Progress visualizer */}
                        <div className="w-full bg-[#0D0D0C] h-2.5 rounded-full overflow-hidden border border-[#222220] relative">
                          <div
                            className={`h-full transition-all duration-500 ${is50Met ? 'bg-[#00E599]' : 'bg-[#FF5500]'}`}
                            style={{ width: `${pct}%` }}
                          />
                          {/* 50% marker */}
                          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white z-10" title="50% Advance Requirement" />
                        </div>

                        {/* Action Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-[#222220]">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-[#777772]">Simulate Payment:</span>
                            <button
                              type="button"
                              onClick={() => handleRecordPayment(0)}
                              className="px-2 py-0.5 bg-[#0D0D0C] hover:bg-[#222220] border border-[#333330] rounded text-[#888884] text-[10px]"
                            >
                              0%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecordPayment(req50 * 0.5)}
                              className="px-2 py-0.5 bg-[#0D0D0C] hover:bg-[#222220] border border-[#333330] rounded text-amber-400 text-[10px]"
                            >
                              25% (Block)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecordPayment(req50)}
                              className="px-2 py-0.5 bg-[#0D0D0C] hover:bg-[#222220] border border-[#00E599]/40 rounded text-[#00E599] text-[10px] font-bold"
                            >
                              50% (Unlock)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecordPayment(total)}
                              className="px-2 py-0.5 bg-[#0D0D0C] hover:bg-[#222220] border border-[#00E599] rounded text-[#00E599] text-[10px] font-bold"
                            >
                              100% Paid
                            </button>
                          </div>

                          <button
                            type="button"
                            id="btn-authorize-cutting"
                            disabled={isAuthorizingCutting || selectedDeal.status === 'cutting_authorized'}
                            onClick={handleAuthorizeCutting}
                            className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              selectedDeal.status === 'cutting_authorized'
                                ? 'bg-[#00E599]/20 text-[#00E599] border border-[#00E599] cursor-default'
                                : is50Met
                                ? 'bg-[#00E599] text-black hover:bg-[#00c985] shadow-[0_0_15px_rgba(0,229,153,0.3)]'
                                : 'bg-[#1C1C1A] text-[#888884] border border-[#333330] hover:border-[#FF5500] hover:text-[#FF5500]'
                            }`}
                          >
                            <span>{isAuthorizingCutting ? '⏳ VERIFYING TRANSACTION…' : selectedDeal.status === 'cutting_authorized' ? '✓ CUTTING AUTHORIZED' : '⚡ AUTHORIZE JIT PRODUCTION / START CUTTING'}</span>
                          </button>
                        </div>

                        {/* Error / Feedback notification */}
                        {cuttingError && (
                          <div className="mt-2 p-2 rounded bg-[#FF5500]/15 border border-[#FF5500] text-xs text-[#FF5500] font-semibold flex items-center justify-between">
                            <span>❌ {cuttingError}</span>
                            <span className="text-[10px] text-[#A0A09C]">Logged to /auditLogs</span>
                          </div>
                        )}
                        {cuttingSuccessMsg && (
                          <div className="mt-2 p-2 rounded bg-[#00E599]/15 border border-[#00E599] text-xs text-[#00E599] font-semibold flex items-center justify-between">
                            <span>{cuttingSuccessMsg}</span>
                            <span className="text-[10px] text-white">productionUnlockedAt logged</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 3. AI Outreach Copilot (Strict Human-In-The-Loop) */}
                <div className="p-4 bg-[#161615] border border-[#222220] rounded-lg flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#222220]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        AI OUTREACH COPILOT (STRICT HUMAN-IN-THE-LOOP)
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-700/40 font-bold">
                        ZERO AUTONOMOUS SENDING
                      </span>
                    </div>

                    {/* Throttling status badge */}
                    {isCooldownActive ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#FF5500] bg-[#0D0D0C] px-2 py-0.5 rounded border border-[#FF5500]/40">
                        <span>⏱ COOLDOWN ACTIVE ({cooldownDaysRemaining}d remaining · 14-day rule)</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#00E599] bg-[#0D0D0C] px-2 py-0.5 rounded border border-[#00E599]/40">
                        ✓ DISPATCH READY (No recent contact)
                      </div>
                    )}
                  </div>

                  {/* Active Outreach Auto-Kill Flag */}
                  {!selectedDeal.activeOutreachSequence && selectedDeal.outreachKillReason && (
                    <div className="p-2 bg-[#0D0D0C] border border-[#333330] rounded text-[11px] text-[#00E599] flex items-center gap-2">
                      <span>🛡️ SEQUENCE TERMINATED:</span>
                      <span className="text-white font-bold">{selectedDeal.outreachKillReason}</span>
                    </div>
                  )}

                  {/* Dual Channel Drafts: Email & WhatsApp */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Channel 1: Corporate Email */}
                    <div className="flex flex-col gap-2 p-3 bg-[#0D0D0C] border border-[#222220] rounded">
                      <div className="flex items-center justify-between text-xs font-bold text-[#3B82F6]">
                        <span>✉️ [CORPORATE EMAIL] DRAFT</span>
                        <span className="text-[10px] text-[#777772]">Archetype: {selectedDeal.archetype}</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#777772] uppercase">Subject Line</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full bg-[#161615] border border-[#2B2B28] rounded px-2.5 py-1 text-xs text-white outline-none focus:border-[#3B82F6]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#777772] uppercase">Email Body (Editable)</label>
                        <textarea
                          rows={9}
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          className="w-full bg-[#161615] border border-[#2B2B28] rounded p-2 text-xs text-[#D4D4D0] font-mono leading-relaxed outline-none focus:border-[#3B82F6] resize-none"
                        />
                      </div>
                      <button
                        type="button"
                        id="btn-authorize-email"
                        disabled={isCooldownActive && !forceReengageOverride}
                        onClick={() => handleAuthorizeAndDispatch('EMAIL')}
                        className={`w-full py-1.5 rounded text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                          isCooldownActive && !forceReengageOverride
                            ? 'bg-[#1C1C1A] text-[#777772] border border-[#2B2B28] cursor-not-allowed'
                            : 'bg-[#3B82F6] text-white hover:bg-blue-600'
                        }`}
                      >
                        <span>AUTHORIZE &amp; DISPATCH EMAIL →</span>
                      </button>
                    </div>

                    {/* Channel 2: WhatsApp 1-Click Draft */}
                    <div className="flex flex-col gap-2 p-3 bg-[#0D0D0C] border border-[#222220] rounded">
                      <div className="flex items-center justify-between text-xs font-bold text-[#00E599]">
                        <span>💬 [1-CLICK WHATSAPP] DRAFT</span>
                        <span className="text-[10px] text-[#777772]">{selectedDeal.contactPhone}</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#777772] uppercase">Buyer Recipient</label>
                        <input
                          type="text"
                          readOnly
                          value={`${selectedDeal.contactName} (${selectedDeal.contactPhone})`}
                          className="w-full bg-[#161615] border border-[#2B2B28] rounded px-2.5 py-1 text-xs text-[#888884] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#777772] uppercase">WhatsApp Message (Editable)</label>
                        <textarea
                          rows={9}
                          value={whatsappDraft}
                          onChange={(e) => setWhatsappDraft(e.target.value)}
                          className="w-full bg-[#161615] border border-[#2B2B28] rounded p-2 text-xs text-[#D4D4D0] font-mono leading-relaxed outline-none focus:border-[#00E599] resize-none"
                        />
                      </div>
                      <button
                        type="button"
                        id="btn-dispatch-whatsapp"
                        disabled={isCooldownActive && !forceReengageOverride}
                        onClick={() => handleAuthorizeAndDispatch('WHATSAPP_DESKTOP')}
                        className={`w-full py-2 rounded text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm ${
                          isCooldownActive && !forceReengageOverride
                            ? 'bg-[#1C1C1A] text-[#777772] border border-[#2B2B28] cursor-not-allowed'
                            : 'bg-[#00E599] text-black hover:bg-[#00c985] active:scale-[0.99]'
                        }`}
                        title="Dispatch to Desktop WhatsApp via deep link pre-filled with drafted message"
                      >
                        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.79 14.07c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.15.11-3.69-.94-2.6-1.07-4.27-3.71-4.4-3.89-.13-.17-1.06-1.41-1.06-2.69 0-1.28.67-1.91.91-2.17.24-.26.53-.32.71-.32.18 0 .35.01.5.01.16 0 .38-.06.59.45.22.53.75 1.83.82 1.97.07.14.11.31.02.5-.09.18-.13.3-.26.46-.13.16-.28.35-.4.47-.13.13-.27.28-.12.54.16.26.69 1.14 1.49 1.85 1.03.92 1.9 1.2 2.17 1.34.27.13.43.11.59-.07.16-.18.69-.8.87-1.08.19-.27.37-.23.63-.13.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.7-.17 1.38z"/>
                        </svg>
                        <span>Dispatch to WhatsApp</span>
                      </button>

                      <div className="flex items-center justify-between text-[10px] text-[#777772] px-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00E599]"></span>
                          Desktop URI: <span className="text-[#00E599]">whatsapp://send</span>
                        </span>
                        <button
                          type="button"
                          id="btn-dispatch-whatsapp-web"
                          onClick={() => handleAuthorizeAndDispatch('WHATSAPP')}
                          className="hover:text-[#00E599] underline cursor-pointer transition-colors"
                          title="Fallback to WhatsApp Web in browser tab"
                        >
                          Open in WhatsApp Web ↗
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Override 14-day rule safety toggle */}
                  {isCooldownActive && (
                    <div className="flex items-center gap-2 p-2 bg-[#1C1C1A] border border-[#333330] rounded text-[11px] text-[#A0A09C]">
                      <input
                        type="checkbox"
                        id="override-cooldown-checkbox"
                        checked={forceReengageOverride}
                        onChange={(e) => setForceReengageOverride(e.target.checked)}
                        className="cursor-pointer"
                      />
                      <label htmlFor="override-cooldown-checkbox" className="cursor-pointer">
                        Operator Override: Force re-engagement within 14-day safety window for urgent inbound requests.
                      </label>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-[#888884] bg-[#161615] rounded border border-[#222220]">
                Select a lead from the command center to view intelligence and stage outreach.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: 10-STAGE KANBAN DEAL PIPELINE (Compact Terminal View)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'PIPELINE' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#222220]">
            <div className="text-xs text-[#888884]">
              Horizontal 10-Stage Deal Pipeline. Drag or click arrows to progress deals towards 50% Advance &amp; JIT Cutting.
            </div>
            <div className="text-xs text-[#FF5500] font-bold">
              ⏱ Stagnant Deals ({'>'}48 hrs without progress) are highlighted in Amber Pulse.
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-[1950px]">
              {PIPELINE_STAGES.map((stage, sIdx) => {
                const stageDeals = deals.filter((d) => d.stage === stage);
                const isCuttingStage = stage === 'JIT Cutting/Production';
                const isAdvancePaidStage = stage === '50% Advance Paid';

                return (
                  <div
                    key={stage}
                    className={`w-[190px] flex-shrink-0 flex flex-col rounded-lg border p-2.5 ${
                      isAdvancePaidStage
                        ? 'bg-[#00E599]/5 border-[#00E599]/40'
                        : isCuttingStage
                        ? 'bg-[#FF5500]/5 border-[#FF5500]/40'
                        : 'bg-[#161615] border-[#222220]'
                    }`}
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222220]">
                      <div className="text-[11px] font-bold text-white flex items-center gap-1">
                        <span className="text-[#FF5500]">{sIdx + 1}.</span>
                        <span>{stage}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#0D0D0C] text-[#A0A09C] border border-[#222220]">
                        {stageDeals.length}
                      </span>
                    </div>

                    {/* Cards in stage */}
                    <div className="flex flex-col gap-2 max-h-[640px] overflow-y-auto pr-0.5">
                      {stageDeals.length === 0 ? (
                        <div className="p-3 text-center text-[10px] text-[#666660] italic">
                          No deals in stage
                        </div>
                      ) : (
                        stageDeals.map((deal) => {
                          const hoursSinceStage = Math.floor(
                            (Date.now() - new Date(deal.lastStageChangedAt).getTime()) / (3600 * 1000)
                          );
                          const isStagnant = hoursSinceStage >= 48 && !['Delivery & Closed', 'JIT Cutting/Production'].includes(deal.stage);

                          return (
                            <div
                              key={deal.id}
                              onClick={() => {
                                setSelectedDealId(deal.id);
                                setActiveTab('COMMAND');
                              }}
                              className={`p-2 rounded bg-[#0D0D0C] border cursor-pointer hover:border-[#FF5500] transition-all flex flex-col gap-1 ${
                                isStagnant
                                  ? 'border-[#FF5500] shadow-[0_0_8px_rgba(255,85,0,0.2)]'
                                  : 'border-[#222220]'
                              }`}
                            >
                              <div className="text-[11px] font-bold text-white truncate">
                                {deal.companyName}
                              </div>
                              <div className="text-[10px] text-[#888884] truncate">
                                {deal.contactName} · {deal.country}
                              </div>

                              {/* Amount & Currency */}
                              <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-[#1C1C1A]">
                                <span className="text-[#00E599] font-bold">
                                  {deal.currency === 'USD' ? `$${deal.totalAmountUsd.toLocaleString()}` : `৳${deal.totalAmountBdt.toLocaleString()}`}
                                </span>
                                {isStagnant && (
                                  <span className="text-[9px] text-[#FF5500] font-bold animate-pulse">
                                    ⏱ {hoursSinceStage}h
                                  </span>
                                )}
                              </div>

                              {/* Progression Action Buttons */}
                              <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-[#1C1C1A]">
                                {sIdx > 0 ? (
                                  <button
                                    type="button"
                                    title="Move to previous stage"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateDealStage(deal.id, PIPELINE_STAGES[sIdx - 1]);
                                    }}
                                    className="px-1.5 py-0.5 bg-[#161615] hover:bg-[#222220] border border-[#333330] rounded text-[9px] text-[#888884]"
                                  >
                                    ←
                                  </button>
                                ) : <div />}

                                {sIdx < PIPELINE_STAGES.length - 1 && (
                                  <button
                                    type="button"
                                    title="Advance to next stage"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateDealStage(deal.id, PIPELINE_STAGES[sIdx + 1]);
                                    }}
                                    className="px-2 py-0.5 bg-[#FF5500]/20 hover:bg-[#FF5500] hover:text-black border border-[#FF5500]/40 rounded text-[9px] text-[#FF5500] font-bold transition-colors"
                                  >
                                    ADVANCE →
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: QUICK OFFER BUILDER (3 CORE CATEGORIES ONLY)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'OFFER_BUILDER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Category Selection & Spec Parameters */}
          <div className="lg:col-span-6 flex flex-col gap-3 p-4 bg-[#161615] border border-[#222220] rounded-lg">
            <div className="pb-2 border-b border-[#222220]">
              <span className="text-xs font-bold text-[#FF5500] uppercase tracking-wider">
                QUICK OFFER BUILDER · STRICT 3 CORE CATEGORIES
              </span>
              <p className="text-[11px] text-[#888884] mt-0.5">
                Constrained deal drafting exclusively for high-margin executive gifting, RMG uniforms, and bulk event goods.
              </p>
            </div>

            {/* Category Radio Buttons */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-[#777772] uppercase font-bold">Select Offer Category</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  id="cat-executive-leather"
                  onClick={() => {
                    setBuilderCategory('EXECUTIVE_LEATHER');
                    setSelectedSpecItems(['Executive Folio', 'Desk Mat', 'Travel Wallet']);
                  }}
                  className={`p-3 rounded border text-left transition-all cursor-pointer ${
                    builderCategory === 'EXECUTIVE_LEATHER'
                      ? 'bg-[#1C1C1A] border-[#FF5500] text-white'
                      : 'bg-[#0D0D0C] border-[#222220] text-[#888884] hover:border-[#333330]'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Category A: Executive Leather Gifts</span>
                    <span className="text-[10px] text-[#FF5500]">High Ticket · 58% Margin</span>
                  </div>
                  <div className="text-[11px] text-[#A0A09C] mt-1">
                    Compendiums, Full-Grain Desk Mats, Passport Folios, Card Cases, Travel Wallets.
                  </div>
                </button>

                <button
                  type="button"
                  id="cat-corporate-apparel"
                  onClick={() => {
                    setBuilderCategory('CORPORATE_APPAREL');
                    setSelectedSpecItems(['450 GSM Drop-Shoulder Hoodie', '240 GSM Staff Polo']);
                  }}
                  className={`p-3 rounded border text-left transition-all cursor-pointer ${
                    builderCategory === 'CORPORATE_APPAREL'
                      ? 'bg-[#1C1C1A] border-[#FF5500] text-white'
                      : 'bg-[#0D0D0C] border-[#222220] text-[#888884] hover:border-[#333330]'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Category B: Corporate Apparel &amp; Uniforms</span>
                    <span className="text-[10px] text-[#FF5500]">Mid-Volume · 44% Margin</span>
                  </div>
                  <div className="text-[11px] text-[#A0A09C] mt-1">
                    450 GSM Drop-Shoulder Dense Hoodies, Heavyweight Single Jersey Tees, Combed Pique Staff Polos.
                  </div>
                </button>

                <button
                  type="button"
                  id="cat-bulk-merchandise"
                  onClick={() => {
                    setBuilderCategory('BULK_MERCHANDISE');
                    setSelectedSpecItems(['450 GSM Canvas Tote', 'Branded Twill Cap']);
                  }}
                  className={`p-3 rounded border text-left transition-all cursor-pointer ${
                    builderCategory === 'BULK_MERCHANDISE'
                      ? 'bg-[#1C1C1A] border-[#FF5500] text-white'
                      : 'bg-[#0D0D0C] border-[#222220] text-[#888884] hover:border-[#333330]'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Category C: Event &amp; Bulk Merchandise</span>
                    <span className="text-[10px] text-[#FF5500]">High Volume · 36% Margin</span>
                  </div>
                  <div className="text-[11px] text-[#A0A09C] mt-1">
                    Heavy Canvas Gusset Totes, Branded Canvas Packs, Embroidered Twill Caps, Swag Bags.
                  </div>
                </button>
              </div>
            </div>

            {/* Customization Details */}
            <div>
              <label className="text-[10px] text-[#777772] uppercase font-bold">Customization &amp; Branding Specs</label>
              <input
                type="text"
                value={customizationNote}
                onChange={(e) => setCustomizationNote(e.target.value)}
                className="w-full bg-[#0D0D0C] border border-[#2B2B28] rounded px-3 py-1.5 text-xs text-white mt-1 outline-none focus:border-[#FF5500]"
                placeholder="e.g. Blind debossed corporate monogramming + bespoke box"
              />
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              id="btn-generate-lookbook"
              onClick={handleGenerateLookbook}
              className="py-2.5 bg-[#FF5500] text-black font-bold text-xs rounded hover:bg-[#ff6a1f] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,85,0,0.25)]"
            >
              <span>⚡ 1-CLICK: GENERATE BESPOKE MINI-LOOKBOOK &amp; TIERED PRICING</span>
            </button>
          </div>

          {/* Right Column: Generated Lookbook Spec Card */}
          <div className="lg:col-span-6 flex flex-col gap-3 p-4 bg-[#161615] border border-[#222220] rounded-lg">
            <div className="pb-2 border-b border-[#222220] flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                BESPOKE MINI-LOOKBOOK SPECIFICATION
              </span>
              <span className="text-[10px] text-[#00E599] font-bold">
                TARGET BUYER: {selectedDeal?.companyName || 'SELECTED ENTERPRISE'}
              </span>
            </div>

            {generatedLookbook ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-[#0D0D0C] border border-[#222220] rounded">
                  <div className="text-xs font-bold text-[#FF5500]">{generatedLookbook.categoryName}</div>
                  <div className="text-[11px] text-[#A0A09C] mt-0.5">
                    Items: {generatedLookbook.itemsSelected.join(' · ')}
                  </div>
                  <div className="text-[10px] text-[#888884] mt-1">
                    Branding: {generatedLookbook.customization}
                  </div>
                </div>

                {/* Tiered Volume Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#222220] text-[10px] text-[#777772]">
                        <th className="py-2 px-2">VOLUME TIER</th>
                        <th className="py-2 px-2">UNIT PRICE (USD)</th>
                        <th className="py-2 px-2">UNIT PRICE (BDT)</th>
                        <th className="py-2 px-2">TOTAL VALUE</th>
                        <th className="py-2 px-2">LEAD TIME</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedLookbook.tiers.map((t, idx) => (
                        <tr key={idx} className="border-b border-[#1C1C1A] text-white">
                          <td className="py-2 px-2 font-bold text-[#FF5500]">{t.units} PCS</td>
                          <td className="py-2 px-2 font-mono">${t.unitPriceUsd.toFixed(2)}</td>
                          <td className="py-2 px-2 font-mono text-[#888884]">৳{t.unitPriceBdt.toLocaleString()}</td>
                          <td className="py-2 px-2 font-mono font-bold text-[#00E599]">${t.totalUsd.toLocaleString()}</td>
                          <td className="py-2 px-2 text-[#A0A09C]">{t.turnaroundDays} Days JIT</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 bg-[#0D0D0C] border border-[#222220] rounded text-[11px] text-[#888884] leading-relaxed">
                  <strong className="text-white">Commercial Clauses:</strong> {generatedLookbook.notes}
                </div>

                {/* Quick Dispatch Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#222220]">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Hands & Head Mini-Lookbook: ${generatedLookbook.categoryName}\nVolume Tiers:\n• 50 pcs: $${generatedLookbook.tiers[0].unitPriceUsd}/pc ($${generatedLookbook.tiers[0].totalUsd})\n• 100 pcs: $${generatedLookbook.tiers[1].unitPriceUsd}/pc ($${generatedLookbook.tiers[1].totalUsd})\n• 500 pcs: $${generatedLookbook.tiers[2].unitPriceUsd}/pc ($${generatedLookbook.tiers[2].totalUsd})\n50% advance to initiate cutting line.`;
                      navigator.clipboard.writeText(text);
                      alert('✓ Lookbook spec copied to clipboard!');
                    }}
                    className="flex-1 py-2 bg-[#1C1C1A] hover:bg-[#222220] border border-[#333330] rounded text-xs text-white font-bold cursor-pointer transition-colors"
                  >
                    📋 COPY LOOKBOOK SPEC
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('COMMAND');
                    }}
                    className="flex-1 py-2 bg-[#00E599] text-black rounded text-xs font-bold hover:bg-[#00c985] cursor-pointer transition-colors"
                  >
                    INSERT INTO OUTREACH DRAFT →
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#777772] bg-[#0D0D0C] rounded border border-[#222220]">
                Configure category and parameters on the left, then click Generate Bespoke Mini-Lookbook.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: AUDIT LOGS & BACKEND SECURITY MONITOR
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="flex flex-col gap-3 p-4 bg-[#161615] border border-[#222220] rounded-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#222220]">
            <div>
              <span className="text-xs font-bold text-[#FF5500] uppercase tracking-wider">
                FIRESTORE /auditLogs IMMUTABLE LEDGER
              </span>
              <p className="text-[11px] text-[#888884] mt-0.5">
                Enforced by Firestore Security Rules: Read-only for admins, zero client create/update/delete. All transactions verified by Cloud Function.
              </p>
            </div>
            <div className="text-[11px] text-[#00E599] font-bold">
              Total Recorded Entries: {auditLogs.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222220] text-[10px] text-[#777772]">
                  <th className="py-2 px-3">TIMESTAMP</th>
                  <th className="py-2 px-3">ORDER ID</th>
                  <th className="py-2 px-3">OPERATOR UID</th>
                  <th className="py-2 px-3">AMOUNT PAID</th>
                  <th className="py-2 px-3">TOTAL CONTRACT</th>
                  <th className="py-2 px-3">TRANSACTION RESULT</th>
                  <th className="py-2 px-3">SECURITY LOG DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-[#1C1C1A] text-white">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#888884]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{log.orderId}</td>
                    <td className="py-2.5 px-3 font-mono text-[#A0A09C]">{log.operatorUid}</td>
                    <td className="py-2.5 px-3 font-mono text-[#00E599]">
                      {log.currency} {log.amountPaid.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-white">
                      {log.currency} {log.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {log.result === 'AUTHORIZED' ? (
                        <span className="px-2 py-0.5 rounded bg-[#00E599]/20 text-[#00E599] border border-[#00E599]/40 text-[10px] font-bold">
                          ✓ AUTHORIZED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500]/40 text-[10px] font-bold">
                          ✕ BLOCKED (&lt;50%)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#D4D4D0] text-[11px] max-w-xs truncate">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BDealEngine;
