import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

export type AgentId = 'AGENT_01' | 'AGENT_02' | 'AGENT_03' | 'AGENT_04';

export type AgentStatus =
  | 'MONITORING'
  | 'RUNNING_QUEUE'
  | 'STANDBY'
  | 'ACTIVE_SCANNING'
  | 'PROCESSING'
  | 'PAUSED'
  | 'ERROR';

export interface WorkerAgent {
  id: AgentId;
  code: string;
  name: string;
  tag: string;
  category: string;
  status: AgentStatus;
  statusLabel: string;
  statusColor: string;
  lastAction: string;
  lastActionTimestamp: string;
  loadPct: number;
  tokensProcessed: number;
  latencyMs: number;
  isPaused: boolean;
  autoPublish?: boolean;
}

export interface StreamEventLog {
  id: string;
  timestamp: string;
  agentId: AgentId;
  agentCode: string;
  agentName: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ALERT' | 'SYSTEM';
  message: string;
  payload?: any;
}

export interface StagedProduct {
  id: string;
  sku: string;
  title: string;
  gsm: number;
  fabricSpec: string;
  colorways: string[];
  sizes: string[];
  suggestedPriceBDT: number;
  driveFolderSource: string;
  extractedAt: string;
  status: 'PENDING_REVIEW' | 'COMMITTED';
}

export interface B2BOutreachLead {
  id: string;
  company: string;
  segment: string;
  contactName: string;
  contactRole: string;
  channel: 'WhatsApp B2B API' | 'Apollo Verified Lead';
  pitchPreview: string;
  status: 'STAGED' | 'DISPATCHED' | 'OPENED' | 'PO_REQUESTED';
  phoneOrEmail: string;
  queuedTime: string;
}

export interface DepositHoldOrder {
  id: string;
  poNumber: string;
  company: string;
  contactName: string;
  phone: string;
  styleName: string;
  units: number;
  totalAmountBDT: number;
  advancePct: number;
  advanceDueBDT: number;
  advancePaidBDT: number;
  holdStage: 'FABRIC_CUTTING_HOLD' | 'LEATHER_SKIVING_HOLD';
  daysDelayed: number;
  reminderSent: boolean;
  lastReminderTime?: string;
}

export interface AgentAutonomousFleetProps {
  mode?: 'embedded' | 'modal';
  onClose?: () => void;
}

export const AgentAutonomousFleet: React.FC<AgentAutonomousFleetProps> = ({
  mode = 'embedded',
  onClose
}) => {
  // ── Global Fleet State ──
  const [isArmed, setIsArmed] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TERMINAL' | 'STAGED_CATALOG' | 'B2B_QUEUE' | 'DEPOSIT_HOLDS'>('OVERVIEW');
  const [feedFilter, setFeedFilter] = useState<'ALL' | AgentId | 'ALERT'>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // ── Telemetry & Computational Load ──
  const [computeLoad, setComputeLoad] = useState<number>(64);
  const [tokensPerMin, setTokensPerMin] = useState<number>(42850);
  const [memoryBufferPct, setMemoryBufferPct] = useState<number>(38);
  const [telemetryJitter, setTelemetryJitter] = useState<number>(4.2);

  // ── Worker Agents State ──
  const [agents, setAgents] = useState<Record<AgentId, WorkerAgent>>({
    AGENT_01: {
      id: 'AGENT_01',
      code: 'AGENT 01',
      name: 'CATALOG INGESTION & VISION RUNNER',
      tag: 'VISION_CATALOG',
      category: 'Product Ops',
      status: 'MONITORING',
      statusLabel: 'MONITORING DRIVE FOLDER',
      statusColor: '#00E599',
      lastAction: 'Ingested RAWx heavy fleece drop; auto-extracted 450 GSM spec and generated colorways.',
      lastActionTimestamp: '2 mins ago',
      loadPct: 58,
      tokensProcessed: 184500,
      latencyMs: 310,
      isPaused: false,
      autoPublish: false
    },
    AGENT_02: {
      id: 'AGENT_02',
      code: 'AGENT 02',
      name: 'B2B OUTREACH & APOLLO HUNTER',
      tag: 'APOLLO_PIPELINE',
      category: 'Commercial Growth',
      status: 'RUNNING_QUEUE',
      statusLabel: 'RUNNING THROTTLED QUEUE',
      statusColor: '#00E599',
      lastAction: 'Dispatched personalized tech lookbook to Square Textiles procurement desk.',
      lastActionTimestamp: '42 secs ago',
      loadPct: 72,
      tokensProcessed: 329000,
      latencyMs: 440,
      isPaused: false
    },
    AGENT_03: {
      id: 'AGENT_03',
      code: 'AGENT 03',
      name: 'VOICE PO & SPEC COMPILER',
      tag: 'GEMINI_VOICE',
      category: 'Procurement AI',
      status: 'STANDBY',
      statusLabel: 'STANDBY - AUDIO DOCK SYNCED',
      statusColor: '#E5A93C',
      lastAction: 'Awaiting buyer audio streaming payload from WhatsApp Webhook or Local Mic.',
      lastActionTimestamp: '14 mins ago',
      loadPct: 12,
      tokensProcessed: 94200,
      latencyMs: 145,
      isPaused: false
    },
    AGENT_04: {
      id: 'AGENT_04',
      code: 'AGENT 04',
      name: 'ADVANCE & SLA DEPOSIT WATCHDOG',
      tag: 'FINANCE_GOVERNANCE',
      category: 'Treasury & Risk',
      status: 'ACTIVE_SCANNING',
      statusLabel: 'ACTIVE SCANNING',
      statusColor: '#FF4400',
      lastAction: 'Production hold asserted on 2 POs: missing 50% factory milestone deposit.',
      lastActionTimestamp: '18 secs ago',
      loadPct: 81,
      tokensProcessed: 215400,
      latencyMs: 290,
      isPaused: false
    }
  });

  // ── Modals / Detail Inspect Drawers ──
  const [inspectModal, setInspectModal] = useState<'NONE' | 'STAGED_PRODUCTS' | 'B2B_OUTREACH' | 'DEPOSIT_HOLDS'>('NONE');

  // ── Staged Products State (Agent 01) ──
  const [stagedProducts, setStagedProducts] = useState<StagedProduct[]>([
    {
      id: 'stg-01',
      sku: 'RAWX-FLC-450-BLK',
      title: 'RAWx Heavy Fleece Modular Parka Hoodie',
      gsm: 450,
      fabricSpec: '450 GSM Heavy French Terry Loopback Cotton, Carbon Peached Finish',
      colorways: ['Jet Black', 'Heather Charcoal', 'Deep Navy'],
      sizes: ['M', 'L', 'XL', '2XL'],
      suggestedPriceBDT: 4850,
      driveFolderSource: 'Master Drive: /Drops/2026_Winter_RAWx/',
      extractedAt: '10:04 AM Today',
      status: 'PENDING_REVIEW'
    },
    {
      id: 'stg-02',
      sku: 'RAWX-FLC-450-TAN',
      title: 'RAWx Heavy Fleece Drop-Shoulder Oversized Sweatshirt',
      gsm: 450,
      fabricSpec: '450 GSM Brushed Diagonal Terry, Custom Dyed Low-Impact Pigment',
      colorways: ['Desert Tan', 'Muted Olive', 'Dusty Clay'],
      sizes: ['S', 'M', 'L', 'XL'],
      suggestedPriceBDT: 3950,
      driveFolderSource: 'Master Drive: /Drops/2026_Winter_RAWx/',
      extractedAt: '10:07 AM Today',
      status: 'PENDING_REVIEW'
    },
    {
      id: 'stg-03',
      sku: 'HH-LTHR-BMR-002',
      title: 'Artisanal Full-Grain Buffalo Biker Jacket',
      gsm: 0,
      fabricSpec: '1.2mm Drum-Dyed Vegetable-Tanned Top-Grain Buffalo Hide with Cupro Lining',
      colorways: ['Cognac Vintage', 'Noir Black'],
      sizes: ['38', '40', '42', '44'],
      suggestedPriceBDT: 18500,
      driveFolderSource: 'Master Drive: /Atelier/Leather_2026_Samples/',
      extractedAt: '10:14 AM Today',
      status: 'PENDING_REVIEW'
    }
  ]);

  // ── B2B Outreach Leads State (Agent 02) ──
  const [b2bLeads, setB2bLeads] = useState<B2BOutreachLead[]>([
    {
      id: 'lead-01',
      company: 'Incepta Pharmaceuticals Ltd.',
      segment: 'Corporate Corporate Gifting & Annual Gala Attire',
      contactName: 'Engr. Tariqul Islam',
      contactRole: 'Head of Strategic Procurement',
      channel: 'WhatsApp B2B API',
      pitchPreview: 'Tailored 450 GSM executive winter fleece jackets with understated silicone embossed crest.',
      status: 'PO_REQUESTED',
      phoneOrEmail: '+880 1711-489201',
      queuedTime: '4 mins ago'
    },
    {
      id: 'lead-02',
      company: 'Square Textiles Ltd.',
      segment: 'B2B Merchandising & Executive Executive Gifting',
      contactName: 'Sadia Rahman',
      contactRole: 'Lead Merchandiser',
      channel: 'Apollo Verified Lead',
      pitchPreview: 'Handcrafted vegetable-tanned leather organizer folios + heavy cotton hoodies presentation deck.',
      status: 'OPENED',
      phoneOrEmail: 'sadia.rahman@squaregroup.com',
      queuedTime: '12 mins ago'
    },
    {
      id: 'lead-03',
      company: 'Grameenphone Corporate HQ',
      segment: 'Annual Leadership Summit Welcome Kits',
      contactName: 'Kazi Mahbub',
      contactRole: 'Procurement Specialist',
      channel: 'WhatsApp B2B API',
      pitchPreview: 'Sustainable dyed organic canvas weekenders & custom laser-etched cardholder sets.',
      status: 'STAGED',
      phoneOrEmail: '+880 1713-990144',
      queuedTime: 'Just staged'
    },
    {
      id: 'lead-04',
      company: 'Renata Limited (Gulshan HQ)',
      segment: 'Medical Affairs Field Force Uniforms',
      contactName: 'Dr. Nayeem Chowdhury',
      contactRole: 'Admin & Facilities Director',
      channel: 'Apollo Verified Lead',
      pitchPreview: 'High-durability moisture-wicking technical overshirts with sanitized RFID ID pockets.',
      status: 'DISPATCHED',
      phoneOrEmail: 'n.chowdhury@renata-ltd.com',
      queuedTime: '18 mins ago'
    }
  ]);

  // ── Deposit Holds State (Agent 04) ──
  const [depositHolds, setDepositHolds] = useState<DepositHoldOrder[]>([
    {
      id: 'hld-01',
      poNumber: 'HH-2026-6467',
      company: 'Incepta Pharmaceuticals',
      contactName: 'Engr. Tariqul Islam',
      phone: '+880 1711-489201',
      styleName: 'Executive Heavy Fleece Modular Parka',
      units: 250,
      totalAmountBDT: 925000,
      advancePct: 50,
      advanceDueBDT: 462500,
      advancePaidBDT: 0,
      holdStage: 'FABRIC_CUTTING_HOLD',
      daysDelayed: 2,
      reminderSent: false
    },
    {
      id: 'hld-02',
      poNumber: 'HH-2026-6482',
      company: 'Grameenphone Corporate HQ',
      contactName: 'Kazi Mahbub',
      phone: '+880 1713-990144',
      styleName: 'Top-Grain Leather Folio & Cardholder Gift Set',
      units: 120,
      totalAmountBDT: 540000,
      advancePct: 50,
      advanceDueBDT: 270000,
      advancePaidBDT: 50000,
      holdStage: 'LEATHER_SKIVING_HOLD',
      daysDelayed: 1,
      reminderSent: false
    }
  ]);

  // ── Real-Time Event Stream Terminal State ──
  const [eventLogs, setEventLogs] = useState<StreamEventLog[]>([
    {
      id: 'log-01',
      timestamp: '09:14:02',
      agentId: 'AGENT_01',
      agentCode: 'AGENT_01',
      agentName: 'VISION RUNNER',
      level: 'INFO',
      message: 'Processed 4 high-res product photos from Drive Master folder [1BNzQpgYtf-CB7GemrQVtqIWGQEkTiZIT].'
    },
    {
      id: 'log-02',
      timestamp: '09:14:15',
      agentId: 'AGENT_02',
      agentCode: 'AGENT_02',
      agentName: 'APOLLO HUNTER',
      level: 'SUCCESS',
      message: 'Generated B2B lookbook spec for Lead #8841 (Square Textiles Corporate Desk).'
    },
    {
      id: 'log-03',
      timestamp: '09:14:30',
      agentId: 'AGENT_04',
      agentCode: 'AGENT_04',
      agentName: 'SLA WATCHDOG',
      level: 'ALERT',
      message: 'Alert: PO #HH-2026-6467 missing advance deposit (BDT 462,500). Production cutting hold active.'
    },
    {
      id: 'log-04',
      timestamp: '09:14:48',
      agentId: 'AGENT_01',
      agentCode: 'AGENT_01',
      agentName: 'VISION RUNNER',
      level: 'INFO',
      message: 'Tokenized RAWx Fleece drop: 450 GSM extracted; 3 colorway cards staged for catalog commitment.'
    },
    {
      id: 'log-05',
      timestamp: '09:15:10',
      agentId: 'AGENT_02',
      agentCode: 'AGENT_02',
      agentName: 'APOLLO HUNTER',
      level: 'INFO',
      message: 'Throttled message interval committed (4.2s jitter). 48 pitches staged in Meta-safe queue.'
    },
    {
      id: 'log-06',
      timestamp: '09:15:22',
      agentId: 'AGENT_03',
      agentCode: 'AGENT_03',
      agentName: 'VOICE COMPILER',
      level: 'INFO',
      message: 'Gemini 1.5 Flash streaming audio dock healthy. WebSocket latency 145ms.'
    }
  ]);

  // ── Helper to Append Terminal Event ──
  const appendLog = useCallback((agentId: AgentId, level: StreamEventLog['level'], message: string) => {
    const now = new Date();
    const ts = now.toTimeString().split(' ')[0];
    const ag = agents[agentId];
    const newLog: StreamEventLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: ts,
      agentId,
      agentCode: ag ? ag.code.replace(' ', '_') : agentId,
      agentName: ag ? ag.name.split(' ')[0] + ' ' + (ag.name.split(' ')[1] || '') : agentId,
      level,
      message
    };
    setEventLogs(prev => [...prev.slice(-120), newLog]);
  }, [agents]);

  // ── Live Simulation Loop when Armed ──
  useEffect(() => {
    if (!isArmed) return;

    const interval = setInterval(() => {
      // Dynamic subtle telemetry jitter
      setComputeLoad(prev => Math.min(94, Math.max(48, prev + Math.floor((Math.random() - 0.48) * 8))));
      setTokensPerMin(prev => Math.max(32000, prev + Math.floor((Math.random() - 0.48) * 2200)));
      setTelemetryJitter(prev => +(Math.max(3.8, Math.min(4.9, prev + (Math.random() - 0.5) * 0.2))).toFixed(1));

      // Periodic realistic autonomous decisions
      const dice = Math.random();
      if (dice < 0.25) {
        appendLog(
          'AGENT_01',
          'INFO',
          `Drive Scanner ping: Synced 8 webp assets. Filename regex validated against tokenized standard.`
        );
      } else if (dice < 0.5) {
        appendLog(
          'AGENT_02',
          'SUCCESS',
          `Apollo Hunter: Dispatch queue ticked. 1 corporate pitch staged for Renata Limited Procurement.`
        );
      } else if (dice < 0.75) {
        appendLog(
          'AGENT_04',
          'ALERT',
          `SLA Deposit Watchdog: PO #HH-2026-6482 balance check: 50k paid of 270k advance. Production clearance hold remains.`
        );
      } else {
        appendLog(
          'AGENT_03',
          'SYSTEM',
          `Voice Compiler: Audio buffer ping OK. Gemini Flash streaming listener primed.`
        );
      }
    }, 5500);

    return () => clearInterval(interval);
  }, [isArmed, appendLog]);

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [eventLogs, autoScroll]);

  // ── Filtered Event Logs ──
  const filteredLogs = useMemo(() => {
    if (feedFilter === 'ALL') return eventLogs;
    if (feedFilter === 'ALERT') return eventLogs.filter(l => l.level === 'ALERT' || l.level === 'WARN');
    return eventLogs.filter(l => l.agentId === feedFilter);
  }, [eventLogs, feedFilter]);

  // ── Agent Action Handlers ──
  const toggleAgentPause = (agentId: AgentId) => {
    setAgents(prev => {
      const target = prev[agentId];
      const newPaused = !target.isPaused;
      const newStatus = newPaused ? 'PAUSED' : (agentId === 'AGENT_03' ? 'STANDBY' : 'MONITORING');
      const newLabel = newPaused ? 'PAUSED BY OPERATOR' : (agentId === 'AGENT_03' ? 'STANDBY - AUDIO DOCK SYNCED' : 'ACTIVE SCANNING');
      const newColor = newPaused ? '#8E9BAE' : (agentId === 'AGENT_04' ? '#FF4400' : '#00E599');

      appendLog(
        agentId,
        newPaused ? 'WARN' : 'INFO',
        `Worker ${target.code} ${newPaused ? 'suspended by operator' : 're-armed to active execution loop'}.`
      );

      return {
        ...prev,
        [agentId]: {
          ...target,
          isPaused: newPaused,
          status: newStatus,
          statusLabel: newLabel,
          statusColor: newColor
        }
      };
    });
  };

  const toggleAutoPublish = () => {
    setAgents(prev => {
      const ag1 = prev.AGENT_01;
      const nextVal = !ag1.autoPublish;
      appendLog(
        'AGENT_01',
        nextVal ? 'WARN' : 'INFO',
        `Auto-Publish Mode ${nextVal ? 'ARMED: Newly ingested products will bypass manual staging review' : 'DISABLED: Staging review required before Firestore commit'}.`
      );
      return {
        ...prev,
        AGENT_01: {
          ...ag1,
          autoPublish: nextVal
        }
      };
    });
    if (typeof (window as any).toast === 'function') {
      (window as any).toast(
        agents.AGENT_01.autoPublish ? 'Auto-Publish Disabled (Review Mode)' : 'Auto-Publish Armed (Live Ingest Mode)',
        'ok'
      );
    }
  };

  const trigger1ClickReminders = () => {
    setDepositHolds(prev =>
      prev.map(h => ({
        ...h,
        reminderSent: true,
        lastReminderTime: 'Just now'
      }))
    );

    appendLog(
      'AGENT_04',
      'SUCCESS',
      'Dispatched 1-Click WhatsApp & SMS Advance Payment Reminders to 2 held clients (Incepta & Grameenphone). bKash merchant & Bank TT details embedded.'
    );

    if (typeof (window as any).toast === 'function') {
      (window as any).toast('✓ Dispatched 2 Advance Payment Reminders via WhatsApp API', 'ok');
    }
  };

  const commitAllStagedProducts = () => {
    setStagedProducts(prev =>
      prev.map(p => ({
        ...p,
        status: 'COMMITTED'
      }))
    );

    appendLog(
      'AGENT_01',
      'SUCCESS',
      'Committed 3 staged products (RAWx Heavy Fleece Parka, Oversized Pullover, Buffalo Biker) to Firestore master catalog.'
    );

    if (typeof (window as any).toast === 'function') {
      (window as any).toast('✓ 3 Staged Items Committed to Master Catalog', 'ok');
    }
  };

  const simulateVoiceNoteParsing = () => {
    appendLog('AGENT_03', 'INFO', 'Ingesting 14-sec buyer voice note from WhatsApp Procurement channel...');
    setTimeout(() => {
      appendLog(
        'AGENT_03',
        'SUCCESS',
        'Gemini 1.5 Flash extracted PO: Category [Hoodies], Fabric [420 GSM Terry], Color [Washed Black], Sizing [S:50, M:100, L:100, XL:50]. Auto-compiled to Tech-Pack queue!'
      );
      if (typeof (window as any).toast === 'function') {
        (window as any).toast('✓ Voice Audio Parsed & Compiled: 300 Pcs Heavy Hoodie Spec', 'ok');
      }
    }, 900);
  };

  const dispatchSingleLead = (leadId: string) => {
    setB2bLeads(prev =>
      prev.map(l => (l.id === leadId ? { ...l, status: 'DISPATCHED', queuedTime: 'Dispatched just now' } : l))
    );
    const lead = b2bLeads.find(l => l.id === leadId);
    appendLog(
      'AGENT_02',
      'SUCCESS',
      `Dispatched throttled B2B pitch to ${lead ? lead.company : 'Client'} via ${lead ? lead.channel : 'API'}.`
    );
    if (typeof (window as any).toast === 'function') {
      (window as any).toast(`✓ Outreach Dispatched to ${lead?.company || 'Lead'}`, 'ok');
    }
  };

  // Master switch toggle
  const toggleMasterArmed = () => {
    const nextState = !isArmed;
    setIsArmed(nextState);
    const ts = new Date().toTimeString().split(' ')[0];
    setEventLogs(prev => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        timestamp: ts,
        agentId: 'AGENT_01',
        agentCode: 'SYSTEM_FLEET',
        agentName: 'ORCHESTRATOR',
        level: nextState ? 'SUCCESS' : 'WARN',
        message: nextState
          ? 'FLEET RE-ARMED: Autonomous background polling, intake, and risk detection resumed.'
          : 'GLOBAL HALT ASSERTED: All autonomous background routines suspended.'
      }
    ]);
    if (typeof (window as any).toast === 'function') {
      (window as any).toast(
        nextState ? '⚡ Autonomous Fleet Armed & Active' : '⏸ Fleet Execution Paused',
        nextState ? 'ok' : 'warn'
      );
    }
  };

  // Counters
  const activeCount = Object.values(agents).filter(a => !a.isPaused && a.status !== 'STANDBY').length;
  const standbyCount = Object.values(agents).filter(a => a.status === 'STANDBY' && !a.isPaused).length;
  const breachedCount = 0; // High reliability

  return (
    <div
      className="agent-fleet-container w-full font-mono text-zinc-100"
      style={{
        backgroundColor: '#0D0E12',
        minHeight: mode === 'modal' ? 'auto' : '85vh',
        color: '#E2E8F0',
        borderRadius: mode === 'modal' ? '14px' : '10px',
        border: '1px solid #1E222B',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        overflow: 'hidden'
      }}
    >
      {/* ── 1. MODULE HEADER & GLOBAL TELEMETRY STRIP ── */}
      <div
        className="fleet-header p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: '#12141B', borderColor: '#1E222B' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{
              backgroundColor: isArmed ? '#00E599' : '#FF4400',
              boxShadow: isArmed ? '0 0 12px #00E599' : '0 0 12px #FF4400',
              animation: isArmed ? 'pulse 2s infinite' : 'none'
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded"
                style={{ backgroundColor: '#1A1E27', color: '#00E599', border: '1px solid #232936' }}
              >
                [AGENT_ORCHESTRATION]
              </span>
              <span className="text-xs text-zinc-500 font-bold">NEXUS MESH v2.6</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
              AUTONOMOUS AGENT COMMAND FLEET
            </h1>
          </div>
        </div>

        {/* Global Master Switch & Close Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleMasterArmed}
            className="px-3.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            style={{
              backgroundColor: isArmed ? 'rgba(255, 68, 0, 0.15)' : 'rgba(0, 229, 153, 0.15)',
              color: isArmed ? '#FF4400' : '#00E599',
              border: `1px solid ${isArmed ? '#FF4400' : '#00E599'}`
            }}
            title={isArmed ? 'Suspend all autonomous execution loops' : 'Resume background AI worker fleet'}
          >
            <span>{isArmed ? '⏸' : '▶'}</span>
            <span>{isArmed ? 'PAUSE ALL AGENT TASKS' : 'ARM AUTONOMOUS LOOP'}</span>
          </button>

          {mode === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer"
            >
              ✕ CLOSE
            </button>
          )}
        </div>
      </div>

      {/* ── 2. LIVE FLEET STATUS & TELEMETRY STRIP ── */}
      <div
        className="telemetry-strip px-4 py-3 border-b grid grid-cols-1 md:grid-cols-4 gap-3 text-xs"
        style={{ backgroundColor: '#0F1117', borderColor: '#1E222B' }}
      >
        {/* Active Agents Counter */}
        <div
          className="p-2.5 rounded border flex flex-col justify-between"
          style={{ backgroundColor: '#141720', borderColor: '#1E222B' }}
        >
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">
            FLEET READINESS
          </div>
          <div className="flex items-center gap-3 font-bold text-sm">
            <span style={{ color: '#00E599' }}>{activeCount} Active</span>
            <span className="text-zinc-600">|</span>
            <span style={{ color: '#E5A93C' }}>{standbyCount} Standby</span>
            <span className="text-zinc-600">|</span>
            <span style={{ color: '#8E9BAE' }}>{breachedCount} Breached</span>
          </div>
        </div>

        {/* Computational Load */}
        <div
          className="p-2.5 rounded border flex flex-col justify-between"
          style={{ backgroundColor: '#141720', borderColor: '#1E222B' }}
        >
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">
            <span>COMPUTE LOAD</span>
            <span style={{ color: computeLoad > 80 ? '#FF4400' : '#00E599' }}>{computeLoad}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${computeLoad}%`,
                backgroundColor: computeLoad > 80 ? '#FF4400' : computeLoad > 65 ? '#E5A93C' : '#00E599'
              }}
            />
          </div>
        </div>

        {/* Token Ingestion Tracker */}
        <div
          className="p-2.5 rounded border flex flex-col justify-between"
          style={{ backgroundColor: '#141720', borderColor: '#1E222B' }}
        >
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">
            TOKEN INGESTION RATE
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">
              {(tokensPerMin / 1000).toFixed(1)}k <span className="text-[10px] text-zinc-400 font-normal">tokens/min</span>
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={{ backgroundColor: 'rgba(0, 229, 153, 0.1)', color: '#00E599' }}
            >
              GEMINI 1.5 FLASH
            </span>
          </div>
        </div>

        {/* Throttled Anti-Ban Protection */}
        <div
          className="p-2.5 rounded border flex flex-col justify-between"
          style={{ backgroundColor: '#141720', borderColor: '#1E222B' }}
        >
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">
            DISPATCH SAFETY JITTER
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">
              {telemetryJitter}s <span className="text-[10px] text-zinc-400 font-normal">jitter window</span>
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={{ backgroundColor: 'rgba(229, 169, 60, 0.1)', color: '#E5A93C' }}
            >
              META ANTI-BAN SHIELD
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. SUB-NAVIGATION BAR ── */}
      <div
        className="px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs"
        style={{ backgroundColor: '#0B0C10', borderColor: '#1E222B' }}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-zinc-800 text-white border border-zinc-600'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            FLEET MATRIX (4 WORKERS)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TERMINAL')}
            className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TERMINAL'
                ? 'bg-zinc-800 text-white border border-zinc-600'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>LIVE TERMINAL FEED</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STAGED_CATALOG')}
            className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'STAGED_CATALOG'
                ? 'bg-zinc-800 text-white border border-zinc-600'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>STAGED PRODUCTS ({stagedProducts.filter(p => p.status === 'PENDING_REVIEW').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('B2B_QUEUE')}
            className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer ${
              activeTab === 'B2B_QUEUE'
                ? 'bg-zinc-800 text-white border border-zinc-600'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            B2B OUTREACH QUEUE (48)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DEPOSIT_HOLDS')}
            className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DEPOSIT_HOLDS'
                ? 'bg-zinc-800 text-white border border-zinc-600'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span style={{ color: '#FF4400' }}>DEPOSIT HOLDS (2)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              appendLog('AGENT_01', 'INFO', 'Manual Drive scan triggered from Fleet command console.');
              if (typeof (window as any).runDriveSyncNow === 'function') {
                (window as any).runDriveSyncNow();
              }
            }}
            className="text-[11px] font-bold px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer"
          >
            🔄 SYNC DRIVE FOLDER
          </button>
        </div>
      </div>

      {/* ── 4. PRIMARY VIEW AREA ── */}
      <div className="p-4 sm:p-5">
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ── WORKER 01: CATALOG INGESTION & VISION RUNNER ── */}
            <div
              className="agent-card rounded-lg border p-4 flex flex-col justify-between"
              style={{ backgroundColor: '#13161F', borderColor: '#1E222B' }}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400">AGENT 01</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-xs font-bold text-emerald-400">CATALOG &amp; VISION</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5"
                      style={{
                        backgroundColor: agents.AGENT_01.isPaused ? 'rgba(142, 155, 174, 0.15)' : 'rgba(0, 229, 153, 0.15)',
                        color: agents.AGENT_01.statusColor,
                        border: `1px solid ${agents.AGENT_01.statusColor}40`
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: agents.AGENT_01.statusColor }}
                      />
                      {agents.AGENT_01.statusLabel}
                    </span>
                  </div>
                </div>

                <div className="py-3">
                  <h3 className="font-bold text-white text-sm">CATALOG INGESTION &amp; VISION RUNNER</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Auto-watches master Drive drops, performs Gemini multi-angle OCR/vision spec extraction, extracts
                    fabric GSM, and formats tech colorway variants.
                  </p>

                  <div
                    className="mt-3 p-3 rounded text-xs border"
                    style={{ backgroundColor: '#0E1017', borderColor: '#1A1E27' }}
                  >
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">LAST EXECUTED ACTION:</div>
                    <div className="text-zinc-200 font-mono text-[11px] leading-tight">
                      {agents.AGENT_01.lastAction}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">STAGED INTAKE</span>
                      <span className="font-bold text-white">3 Heavy Garment Drops</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">AUTO-PUBLISH</span>
                      <span className="font-bold" style={{ color: agents.AGENT_01.autoPublish ? '#00E599' : '#E5A93C' }}>
                        {agents.AGENT_01.autoPublish ? 'ENABLED (LIVE)' : 'STAGED REVIEW'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('STAGED_CATALOG')}
                    className="text-xs font-bold px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all cursor-pointer"
                  >
                    INSPECT PENDING STAGED ({stagedProducts.filter(p => p.status === 'PENDING_REVIEW').length})
                  </button>
                  <button
                    type="button"
                    onClick={toggleAutoPublish}
                    className="text-xs font-bold px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer"
                  >
                    {agents.AGENT_01.autoPublish ? 'DISABLE AUTO-PUBLISH' : 'ARM AUTO-PUBLISH'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAgentPause('AGENT_01')}
                  className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer underline"
                >
                  {agents.AGENT_01.isPaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>

            {/* ── WORKER 02: B2B OUTREACH & APOLLO HUNTER ── */}
            <div
              className="agent-card rounded-lg border p-4 flex flex-col justify-between"
              style={{ backgroundColor: '#13161F', borderColor: '#1E222B' }}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400">AGENT 02</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-xs font-bold text-cyan-400">B2B APOLLO HUNTER</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5"
                      style={{
                        backgroundColor: agents.AGENT_02.isPaused ? 'rgba(142, 155, 174, 0.15)' : 'rgba(0, 229, 153, 0.15)',
                        color: agents.AGENT_02.statusColor,
                        border: `1px solid ${agents.AGENT_02.statusColor}40`
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: agents.AGENT_02.statusColor }}
                      />
                      {agents.AGENT_02.statusLabel}
                    </span>
                  </div>
                </div>

                <div className="py-3">
                  <h3 className="font-bold text-white text-sm">B2B OUTREACH &amp; APOLLO HUNTER</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Surfaces corporate procurement segments across Pharmaceuticals, Telco, and Export RMG with
                    personalized tech lookbooks.
                  </p>

                  <div
                    className="mt-3 p-3 rounded text-xs border"
                    style={{ backgroundColor: '#0E1017', borderColor: '#1A1E27' }}
                  >
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">THROTTLE SAFETY MONITOR:</div>
                    <div className="text-zinc-200 font-mono text-[11px] leading-tight flex items-center justify-between">
                      <span>4.2s jitter delay between message staging to prevent Meta bans.</span>
                      <span className="text-cyan-400 font-bold ml-2">✓ COMPLIANT</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-center">
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">STAGED</span>
                      <span className="font-bold text-white">48 Pitches</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">OPENED</span>
                      <span className="font-bold text-cyan-400">12 Leads</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">PO INBOUND</span>
                      <span className="font-bold text-emerald-400">4 Requests</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAgentPause('AGENT_02')}
                    className="text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer"
                    style={{
                      backgroundColor: agents.AGENT_02.isPaused ? 'rgba(0, 229, 153, 0.2)' : 'rgba(255, 68, 0, 0.2)',
                      color: agents.AGENT_02.isPaused ? '#00E599' : '#FF4400',
                      border: `1px solid ${agents.AGENT_02.isPaused ? '#00E599' : '#FF4400'}`
                    }}
                  >
                    {agents.AGENT_02.isPaused ? 'RESUME QUEUE' : 'PAUSE QUEUE'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('B2B_QUEUE')}
                    className="text-xs font-bold px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer"
                  >
                    VIEW STAGED OUTREACH
                  </button>
                </div>
                <span className="text-[11px] text-zinc-500">Targeting Incepta, Square, GP</span>
              </div>
            </div>

            {/* ── WORKER 03: VOICE PO & SPEC COMPILER ── */}
            <div
              className="agent-card rounded-lg border p-4 flex flex-col justify-between"
              style={{ backgroundColor: '#13161F', borderColor: '#1E222B' }}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400">AGENT 03</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-xs font-bold text-amber-400">VOICE &amp; AUDIO SPEC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5"
                      style={{
                        backgroundColor: 'rgba(229, 169, 60, 0.15)',
                        color: agents.AGENT_03.statusColor,
                        border: `1px solid ${agents.AGENT_03.statusColor}40`
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: agents.AGENT_03.statusColor }}
                      />
                      {agents.AGENT_03.statusLabel}
                    </span>
                  </div>
                </div>

                <div className="py-3">
                  <h3 className="font-bold text-white text-sm">VOICE PO &amp; SPEC COMPILER</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Powered by Gemini 1.5 Flash streaming audio parser. Translates spoken buyer WhatsApp memos and voice notes
                    into parametric sizing tables and fabric consumption weights.
                  </p>

                  <div
                    className="mt-3 p-3 rounded text-xs border"
                    style={{ backgroundColor: '#0E1017', borderColor: '#1A1E27' }}
                  >
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">CAPABILITY MATRIX:</div>
                    <div className="text-zinc-200 font-mono text-[11px] leading-tight">
                      Streaming multimodal audio transcription + Banglish dialect recognition for apparel sizing.
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">ENGINE</span>
                      <span className="font-bold text-amber-400">Gemini 1.5 Flash</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">INTEGRATION</span>
                      <span className="font-bold text-white">Voice Ingestion Dock</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof (window as any).openVoicePOIngestion === 'function') {
                        (window as any).openVoicePOIngestion();
                      } else if (typeof (window as any).navTo === 'function') {
                        (window as any).navTo('VoiceIngest');
                      }
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🎙️</span>
                    <span>LAUNCH AUDIO DOCK</span>
                  </button>
                  <button
                    type="button"
                    onClick={simulateVoiceNoteParsing}
                    className="text-xs font-bold px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer"
                  >
                    SIMULATE AUDIO INGEST
                  </button>
                </div>
                <span className="text-[11px] text-zinc-500">Latency: 145ms</span>
              </div>
            </div>

            {/* ── WORKER 04: ADVANCE & SLA DEPOSIT WATCHDOG ── */}
            <div
              className="agent-card rounded-lg border p-4 flex flex-col justify-between"
              style={{ backgroundColor: '#13161F', borderColor: '#1E222B' }}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400">AGENT 04</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-xs font-bold text-red-400">TREASURY WATCHDOG</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5"
                      style={{
                        backgroundColor: 'rgba(255, 68, 0, 0.15)',
                        color: agents.AGENT_04.statusColor,
                        border: `1px solid ${agents.AGENT_04.statusColor}40`
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: agents.AGENT_04.statusColor }}
                      />
                      {agents.AGENT_04.statusLabel}
                    </span>
                  </div>
                </div>

                <div className="py-3">
                  <h3 className="font-bold text-white text-sm">ADVANCE &amp; SLA DEPOSIT WATCHDOG</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Enforces factory floor safety gates. Automatically flags orders missing required 50% down-payment before
                    raw material cutting or skiving commences.
                  </p>

                  <div
                    className="mt-3 p-3 rounded text-xs border"
                    style={{ backgroundColor: '#1A1010', borderColor: '#381616' }}
                  >
                    <div className="text-[10px] uppercase font-bold text-red-400 mb-1">SAFETY HOLD CRITERIA:</div>
                    <div className="text-zinc-200 font-mono text-[11px] leading-tight">
                      Zero cutting authorization granted without verified Bank TT or bKash Merchant txn hash in Firestore ledger.
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">PRODUCTION HOLDS</span>
                      <span className="font-bold text-red-400">2 Orders Flagged</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">EXPOSURE BLOCKED</span>
                      <span className="font-bold text-white">BDT 732,500</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={trigger1ClickReminders}
                    className="text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5"
                    style={{ backgroundColor: '#FF4400', color: '#FFFFFF' }}
                  >
                    <span>⚡</span>
                    <span>TRIGGER 1-CLICK ADVANCE REMINDERS (2 PENDING)</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('DEPOSIT_HOLDS')}
                  className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer underline"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: REAL-TIME EVENT STREAM (TERMINAL FEED) ── */}
        {activeTab === 'TERMINAL' && (
          <div
            className="terminal-feed-wrapper rounded-lg border overflow-hidden"
            style={{ backgroundColor: '#090A0D', borderColor: '#1E222B' }}
          >
            {/* Terminal Controls Bar */}
            <div
              className="p-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs"
              style={{ backgroundColor: '#11131A', borderColor: '#1E222B' }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-zinc-400 font-bold ml-2 text-[11px]">nexus_agent_daemon.sh --stream</span>
              </div>

              {/* Feed Filters */}
              <div className="flex items-center gap-1">
                {(['ALL', 'AGENT_01', 'AGENT_02', 'AGENT_03', 'AGENT_04', 'ALERT'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFeedFilter(f)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      feedFilter === f
                        ? 'bg-zinc-700 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Terminal Utility Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    autoScroll ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  AUTO-SCROLL: {autoScroll ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setEventLogs([])}
                  className="px-2.5 py-1 rounded text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 cursor-pointer"
                >
                  CLEAR
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div
              className="p-4 overflow-y-auto font-mono text-[12px] space-y-2 select-text"
              style={{ maxHeight: '58vh', minHeight: '380px', backgroundColor: '#090A0D' }}
            >
              {filteredLogs.length === 0 ? (
                <div className="text-zinc-600 italic text-center py-12">No execution events match current filter.</div>
              ) : (
                filteredLogs.map(log => {
                  let badgeColor = '#00E599';
                  if (log.level === 'ALERT') badgeColor = '#FF4400';
                  else if (log.level === 'WARN') badgeColor = '#E5A93C';
                  else if (log.level === 'SUCCESS') badgeColor = '#00E599';
                  else if (log.level === 'INFO') badgeColor = '#4E9FFF';

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-2.5 hover:bg-zinc-900/40 p-1 rounded transition-colors"
                    >
                      <span className="text-zinc-600 flex-shrink-0">[{log.timestamp}]</span>
                      <span
                        className="font-bold flex-shrink-0 text-[11px] px-1 rounded"
                        style={{ color: badgeColor, backgroundColor: `${badgeColor}15` }}
                      >
                        {log.agentCode}:
                      </span>
                      <span className={`leading-relaxed ${log.level === 'ALERT' ? 'text-red-300 font-bold' : 'text-zinc-300'}`}>
                        {log.message}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={terminalBottomRef} />
            </div>
          </div>
        )}

        {/* ── TAB: STAGED CATALOG (AGENT 01 DEEP INSPECTION) ── */}
        {activeTab === 'STAGED_CATALOG' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded bg-zinc-900/80 border border-zinc-800 text-xs">
              <div>
                <span className="font-bold text-white text-sm">AGENT 01 Pending Ingestion Staging</span>
                <p className="text-zinc-400 mt-0.5 text-[11px]">
                  RAWx Drops auto-parsed from Google Drive Master Folder with fabric GSM tokenization.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={commitAllStagedProducts}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer"
                >
                  ✓ COMMIT ALL TO MASTER CATALOG
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stagedProducts.map(p => (
                <div
                  key={p.id}
                  className="p-4 rounded-lg border flex flex-col justify-between"
                  style={{ backgroundColor: '#13161F', borderColor: '#1E222B' }}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                      <span className="font-bold text-amber-400">{p.sku}</span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: p.status === 'COMMITTED' ? 'rgba(0, 229, 153, 0.15)' : 'rgba(229, 169, 60, 0.15)',
                          color: p.status === 'COMMITTED' ? '#00E599' : '#E5A93C'
                        }}
                      >
                        {p.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm mb-2">{p.title}</h4>

                    <div className="text-xs text-zinc-300 space-y-1.5 mb-3">
                      <div>
                        <span className="text-zinc-500">Fabric Spec: </span>
                        <span className="text-zinc-200">{p.fabricSpec}</span>
                      </div>
                      {p.gsm > 0 && (
                        <div>
                          <span className="text-zinc-500">Weight: </span>
                          <span className="font-bold text-emerald-400">{p.gsm} GSM</span>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-500">Colorways: </span>
                        <span className="text-zinc-300">{p.colorways.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Sizes: </span>
                        <span className="text-zinc-300">{p.sizes.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">MSRP / FOB: </span>
                        <span className="font-bold text-white">BDT {p.suggestedPriceBDT.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-zinc-500">{p.driveFolderSource}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStagedProducts(prev =>
                          prev.map(item => (item.id === p.id ? { ...item, status: 'COMMITTED' } : item))
                        );
                        appendLog('AGENT_01', 'SUCCESS', `Published ${p.sku} to Firestore active products collection.`);
                        if (typeof (window as any).toast === 'function') {
                          (window as any).toast(`✓ Published ${p.sku}`, 'ok');
                        }
                      }}
                      className="px-2.5 py-1 rounded text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                    >
                      {p.status === 'COMMITTED' ? '✓ In Catalog' : 'Publish'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: B2B OUTREACH QUEUE (AGENT 02 DEEP INSPECTION) ── */}
        {activeTab === 'B2B_QUEUE' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded bg-zinc-900/80 border border-zinc-800 text-xs">
              <div>
                <span className="font-bold text-white text-sm">AGENT 02 Throttled B2B Apollo Pipeline</span>
                <p className="text-zinc-400 mt-0.5 text-[11px]">
                  Automated outreach to corporate gifting &amp; apparel procurement leads with 4.2s jitter security.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  METRICS: 48 Staged | 12 Opened | 4 POs
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800">
                    <th className="p-3">COMPANY &amp; SEGMENT</th>
                    <th className="p-3">TARGET CONTACT</th>
                    <th className="p-3">CHANNEL</th>
                    <th className="p-3">PITCH SUMMARY</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-[#13161F]">
                  {b2bLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-zinc-900/40">
                      <td className="p-3 font-bold text-white">
                        <div>{lead.company}</div>
                        <div className="text-[10px] text-zinc-400 font-normal">{lead.segment}</div>
                      </td>
                      <td className="p-3 text-zinc-300">
                        <div>{lead.contactName}</div>
                        <div className="text-[10px] text-zinc-500">{lead.contactRole}</div>
                      </td>
                      <td className="p-3 text-zinc-300">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700">
                          {lead.channel}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-300 text-[11px] max-w-xs truncate" title={lead.pitchPreview}>
                        {lead.pitchPreview}
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor:
                              lead.status === 'PO_REQUESTED'
                                ? 'rgba(0, 229, 153, 0.2)'
                                : lead.status === 'OPENED'
                                ? 'rgba(78, 159, 255, 0.2)'
                                : 'rgba(229, 169, 60, 0.2)',
                            color:
                              lead.status === 'PO_REQUESTED'
                                ? '#00E599'
                                : lead.status === 'OPENED'
                                ? '#4E9FFF'
                                : '#E5A93C'
                          }}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {lead.status === 'STAGED' ? (
                          <button
                            type="button"
                            onClick={() => dispatchSingleLead(lead.id)}
                            className="px-2.5 py-1 rounded text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
                          >
                            Dispatch Now
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-500">Dispatched</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: DEPOSIT HOLDS (AGENT 04 DEEP INSPECTION) ── */}
        {activeTab === 'DEPOSIT_HOLDS' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded bg-red-950/40 border border-red-900/60 text-xs">
              <div>
                <span className="font-bold text-red-300 text-sm">AGENT 04 Treasury &amp; SLA Production Holds</span>
                <p className="text-zinc-400 mt-0.5 text-[11px]">
                  Factory floor cutting gates asserted: Work orders paused until 50% deposit clearance is verified.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={trigger1ClickReminders}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                >
                  ⚡ TRIGGER 1-CLICK ADVANCE REMINDERS (2 PENDING)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {depositHolds.map(hold => (
                <div
                  key={hold.id}
                  className="p-4 rounded-lg border flex flex-col justify-between"
                  style={{ backgroundColor: '#161214', borderColor: '#381A1E' }}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                      <span className="font-bold text-red-400">{hold.poNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                        {hold.holdStage}
                      </span>
                    </div>

                    <div className="py-3">
                      <h4 className="font-bold text-white text-sm">{hold.company}</h4>
                      <p className="text-xs text-zinc-400">{hold.styleName} ({hold.units} pcs)</p>

                      <div className="mt-3 p-3 rounded bg-zinc-950/80 border border-zinc-800 text-xs space-y-1.5 font-mono">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Order Total:</span>
                          <span className="text-zinc-200">BDT {hold.totalAmountBDT.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-red-400">
                          <span>50% Required Advance:</span>
                          <span>BDT {hold.advanceDueBDT.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400">
                          <span>Amount Received:</span>
                          <span>BDT {hold.advancePaidBDT.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-800 pt-1 text-amber-400 font-bold">
                          <span>Balance Due Before Cutting:</span>
                          <span>BDT {(hold.advanceDueBDT - hold.advancePaidBDT).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Contact: {hold.contactName} ({hold.phone})</span>
                        <span className="text-red-400">{hold.daysDelayed} days in hold</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">
                      {hold.reminderSent ? '✓ Reminder Sent via WhatsApp' : 'Status: Awaiting Reminder'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDepositHolds(prev =>
                          prev.map(h => (h.id === hold.id ? { ...h, reminderSent: true, lastReminderTime: 'Just now' } : h))
                        );
                        appendLog(
                          'AGENT_04',
                          'SUCCESS',
                          `Dispatched WhatsApp advance deposit alert to ${hold.contactName} (${hold.company}) for PO ${hold.poNumber}.`
                        );
                        if (typeof (window as any).toast === 'function') {
                          (window as any).toast(`✓ WhatsApp Reminder Sent to ${hold.company}`, 'ok');
                        }
                      }}
                      className="px-3 py-1.5 rounded text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer"
                    >
                      {hold.reminderSent ? 'Resend' : 'Send WhatsApp Reminder'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 5. FOOTER ARCHITECTURE NOTE ── */}
      <div
        className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500"
        style={{ backgroundColor: '#090A0D', borderColor: '#1E222B' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>HANDS &amp; HEAD AUTONOMOUS ORCHESTRATION LAYER</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Vision OCR</span>
          <span>·</span>
          <span>Apollo Pipeline</span>
          <span>·</span>
          <span>Gemini 1.5 Flash</span>
          <span>·</span>
          <span>Production Gatekeeper</span>
        </div>
      </div>
    </div>
  );
};

export default AgentAutonomousFleet;
