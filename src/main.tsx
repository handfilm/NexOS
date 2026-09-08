import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from './App';
import TechPackPOEngine from './components/TechPackPOEngine';
import VoicePOIngestion from './components/VoicePOIngestion';
import CorporateSupplies from './components/CorporateSupplies';
import LogisticsSettlementHub from './components/LogisticsSettlementHub';
import FactorySlaFloorTracker from './components/FactorySlaFloorTracker';

// Root instances cache to avoid duplicate createRoot warnings on container re-entry
const rootInstances = new WeakMap<HTMLElement, Root>();

function getOrCreateRoot(container: HTMLElement): Root {
  let r = rootInstances.get(container);
  if (!r) {
    container.innerHTML = '';
    r = createRoot(container);
    rootInstances.set(container, r);
  }
  return r;
}

// ── 0. Renderer implementation for Logistics & Settlement Hub ──
export function renderLogisticsHubComponent(container?: HTMLElement, initialOrder?: any) {
  const target =
    container ||
    document.getElementById('mod-LogisticsSettlementHub') ||
    document.getElementById('mod-LOGISTICS_HUB') ||
    document.getElementById('mod-LogisticsHub') ||
    document.getElementById('mod-Logistics') ||
    document.getElementById('mod-Settlement') ||
    document.getElementById('body');
  if (!target) return;

  try {
    const root = getOrCreateRoot(target);
    root.render(
      <div className="logistics-module-wrapper p-2 sm:p-4 max-w-7xl mx-auto">
        <LogisticsSettlementHub
          initialOrder={initialOrder}
          mode="embedded"
          onClose={() => {
            if (typeof (window as any).navTo === 'function') {
              (window as any).navTo('Home');
            }
          }}
        />
      </div>
    );
  } catch (err) {
    console.error('Error mounting LogisticsSettlementHub:', err);
  }
}

// ── 0B. Renderer implementation for Factory Floor & SLA Monitor ──
export function renderFactorySlaComponent(container?: HTMLElement, initialPoNumber?: string) {
  const target =
    container ||
    document.getElementById('mod-FactorySlaFloorTracker') ||
    document.getElementById('mod-FACTORY_SLA') ||
    document.getElementById('mod-FactorySLA') ||
    document.getElementById('mod-FactorySla') ||
    document.getElementById('mod-FloorTracker') ||
    document.getElementById('mod-SLA') ||
    document.getElementById('body');
  if (!target) return;

  try {
    const root = getOrCreateRoot(target);
    root.render(
      <div className="factory-sla-module-wrapper p-2 sm:p-4 max-w-7xl mx-auto">
        <FactorySlaFloorTracker
          initialPoNumber={initialPoNumber}
          mode="embedded"
          onClose={() => {
            if (typeof (window as any).navTo === 'function') {
              (window as any).navTo('Home');
            }
          }}
        />
      </div>
    );
  } catch (err) {
    console.error('Error mounting FactorySlaFloorTracker:', err);
  }
}

// ── 0. Renderer implementation for Corporate Supplies ──
export function renderCorporateSuppliesComponent(container?: HTMLElement) {
  const target =
    container ||
    document.getElementById('mod-CorporateSupplies') ||
    document.getElementById('mod-CORPORATESUPPLIES') ||
    document.getElementById('mod-corporate-supplies') ||
    document.getElementById('mod-Corporate') ||
    document.getElementById('body');
  if (!target) return;

  try {
    const root = getOrCreateRoot(target);
    root.render(
      <div className="corporate-supplies-module-wrapper w-full">
        <CorporateSupplies />
      </div>
    );
  } catch (err) {
    console.error('Error mounting CorporateSupplies:', err);
  }
}

// ── 1. Renderer implementation for TechPack PO ──
export function renderTechPackComponent(container?: HTMLElement) {
  const target =
    container ||
    document.getElementById('mod-TechPackPO') ||
    document.getElementById('mod-TECHPACKPO') ||
    document.getElementById('mod-TECHPACK') ||
    document.getElementById('mod-TechPack') ||
    document.getElementById('body');
  if (!target) return;

  try {
    const root = getOrCreateRoot(target);
    root.render(
      <div className="techpack-module-wrapper p-3 max-w-7xl mx-auto">
        <TechPackPOEngine
          isOpen={true}
          mode="embedded"
          onClose={() => {
            if (typeof (window as any).navTo === 'function') {
              (window as any).navTo('Home');
            }
          }}
        />
      </div>
    );
  } catch (err) {
    console.error('Error mounting TechPackPOEngine:', err);
  }
}

// ── 2. Renderer implementation for Voice Ingestion ──
export function renderVoiceIngestComponent(container?: HTMLElement) {
  const target =
    container ||
    document.getElementById('mod-VoiceIngest') ||
    document.getElementById('mod-VOICEINGEST') ||
    document.getElementById('mod-VoicePOIngestion') ||
    document.getElementById('body');
  if (!target) return;

  try {
    const root = getOrCreateRoot(target);
    root.render(
      <div className="voice-ingest-module-wrapper p-4 max-w-4xl mx-auto font-mono text-zinc-100">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1">
              Audio Procurement Intelligence · Gemini Flash
            </div>
            <h2 className="text-xl font-bold text-white">Voice PO Ingestion &amp; Audio AI Dock</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Record voice commands or drop buyer audio notes to extract apparel specs directly into production POs.
            </p>
          </div>
          <button
            onClick={() => {
              if (typeof (window as any).openTechPackPOEngine === 'function') {
                (window as any).openTechPackPOEngine();
              } else if (typeof (window as any).openAppModule === 'function') {
                (window as any).openAppModule('TechPackPO');
              }
            }}
            className="btn btn-sm btn-gold"
            style={{ fontSize: '11px', padding: '6px 14px' }}
          >
            📋 Open Tech-Pack PO Engine →
          </button>
        </div>
        <VoicePOIngestion
          onSpecExtracted={(spec) => {
            if (typeof (window as any).openTechPackPOEngine === 'function') {
              (window as any).openTechPackPOEngine();
            } else if (typeof (window as any).openAppModule === 'function') {
              (window as any).openAppModule('TechPackPO');
            }
          }}
          autoPopulateOnReady={true}
        />
      </div>
    );
  } catch (err) {
    console.error('Error mounting VoicePOIngestion:', err);
  }
}

// ── 3. Register Bridges Synchronously on Window ──
if (typeof window !== 'undefined') {
  (window as any).render = (window as any).render || {};

  // Corporate Supplies renderers (all case variations)
  (window as any).render.CorporateSupplies = renderCorporateSuppliesComponent;
  (window as any).render.CORPORATESUPPLIES = renderCorporateSuppliesComponent;
  (window as any).render['Corporate Supplies'] = renderCorporateSuppliesComponent;
  (window as any).render['corporate-supplies'] = renderCorporateSuppliesComponent;
  (window as any).render.corporate_supplies = renderCorporateSuppliesComponent;
  (window as any).render.Corporate = renderCorporateSuppliesComponent;
  (window as any).render.CORPORATE = renderCorporateSuppliesComponent;

  // Direct window-level functions
  (window as any).renderCorporateSupplies = renderCorporateSuppliesComponent;
  (window as any).renderCorporateSuppliesComponent = renderCorporateSuppliesComponent;

  // Safe window opener fallback
  if (typeof (window as any).openCorporateSupplies !== 'function') {
    (window as any).openCorporateSupplies = () => {
      window.dispatchEvent(new CustomEvent('nexus:open-corporate-supplies'));
    };
  }

  // Tech-Pack PO renderers (all case variations)
  (window as any).render.TechPackPO = renderTechPackComponent;
  (window as any).render.TECHPACKPO = renderTechPackComponent;
  (window as any).render.techpackpo = renderTechPackComponent;
  (window as any).render.TechPack = renderTechPackComponent;
  (window as any).render.TECHPACK = renderTechPackComponent;
  (window as any).render.techpack = renderTechPackComponent;
  (window as any).render.TechPackPOEngine = renderTechPackComponent;
  (window as any).render.TECHPACKPOENGINE = renderTechPackComponent;

  // Voice Ingestion renderers (all case variations)
  (window as any).render.VoiceIngest = renderVoiceIngestComponent;
  (window as any).render.VOICEINGEST = renderVoiceIngestComponent;
  (window as any).render.voiceingest = renderVoiceIngestComponent;
  (window as any).render.VoicePOIngestion = renderVoiceIngestComponent;
  (window as any).render.VOICE_INGEST = renderVoiceIngestComponent;
  (window as any).render.voice_ingest = renderVoiceIngestComponent;

  // Window-level direct functions
  (window as any).renderTechPackPO = renderTechPackComponent;
  (window as any).renderTECHPACK = renderTechPackComponent;
  (window as any).renderTechPack = renderTechPackComponent;
  (window as any).renderTechPackComponent = renderTechPackComponent;
  (window as any).renderVoiceIngest = renderVoiceIngestComponent;
  (window as any).renderVOICEINGEST = renderVoiceIngestComponent;
  (window as any).renderVoicePOIngestion = renderVoiceIngestComponent;
  (window as any).renderVoiceIngestComponent = renderVoiceIngestComponent;

  // Safe window fallback triggers if clicked before React App effect commits
  if (typeof (window as any).openTechPackPOEngine !== 'function') {
    (window as any).openTechPackPOEngine = (cust?: any) => {
      window.dispatchEvent(new CustomEvent('nexus:open-techpack', { detail: { customer: cust } }));
    };
  }
  if (typeof (window as any).openVoicePOIngestion !== 'function') {
    (window as any).openVoicePOIngestion = () => {
      window.dispatchEvent(new CustomEvent('nexus:open-voice'));
    };
  }

  // Logistics & Settlement Hub renderers (all case variations)
  (window as any).render.LogisticsSettlementHub = renderLogisticsHubComponent;
  (window as any).render.LOGISTICS_HUB = renderLogisticsHubComponent;
  (window as any).render.LogisticsHub = renderLogisticsHubComponent;
  (window as any).render.logistics_hub = renderLogisticsHubComponent;
  (window as any).render.Logistics = renderLogisticsHubComponent;
  (window as any).render.LOGISTICS = renderLogisticsHubComponent;
  (window as any).render.logistics = renderLogisticsHubComponent;
  (window as any).render.Settlement = renderLogisticsHubComponent;
  (window as any).render.SETTLEMENT = renderLogisticsHubComponent;
  (window as any).render['Logistics & Settlement'] = renderLogisticsHubComponent;
  (window as any).render['logistics-settlement'] = renderLogisticsHubComponent;

  // Window-level direct functions
  (window as any).renderLogisticsHub = renderLogisticsHubComponent;
  (window as any).renderLogisticsSettlementHub = renderLogisticsHubComponent;
  (window as any).renderLOGISTICS_HUB = renderLogisticsHubComponent;
  (window as any).renderLogistics = renderLogisticsHubComponent;

  if (typeof (window as any).openLogisticsSettlementHub !== 'function') {
    (window as any).openLogisticsSettlementHub = (order?: any) => {
      window.dispatchEvent(new CustomEvent('nexus:open-logistics', { detail: { order } }));
    };
  }

  // Factory SLA Floor Tracker renderers (all naming variants)
  (window as any).render.FactorySlaFloorTracker = renderFactorySlaComponent;
  (window as any).render.FACTORY_SLA = renderFactorySlaComponent;
  (window as any).render.FactorySLA = renderFactorySlaComponent;
  (window as any).render.FactorySla = renderFactorySlaComponent;
  (window as any).render['Factory SLA'] = renderFactorySlaComponent;
  (window as any).render.FloorTracker = renderFactorySlaComponent;
  (window as any).render.SLA = renderFactorySlaComponent;
  (window as any).render.Factory = renderFactorySlaComponent;
  (window as any).render.FACTORY = renderFactorySlaComponent;

  // Window-level direct functions
  (window as any).renderFactorySla = renderFactorySlaComponent;
  (window as any).renderFactorySlaFloorTracker = renderFactorySlaComponent;
  (window as any).renderFACTORY_SLA = renderFactorySlaComponent;
  (window as any).renderFloorTracker = renderFactorySlaComponent;

  if (typeof (window as any).openFactorySlaFloorTracker !== 'function') {
    (window as any).openFactorySlaFloorTracker = (poNumber?: string) => {
      window.dispatchEvent(new CustomEvent('nexus:open-factory-sla', { detail: { poNumber } }));
    };
  }
}

// ── 4. Main React App Root Mount ──
let appRootInstance: Root | null = null;

export function mountApp() {
  if (typeof document === 'undefined') return;

  try {
    let rootEl = document.getElementById('react-app-root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'react-app-root';
      document.body.appendChild(rootEl);
    }

    if (!appRootInstance) {
      appRootInstance = createRoot(rootEl);
      appRootInstance.render(<App />);
    }
  } catch (err) {
    console.error('mountApp error:', err);
  }
}

// Auto-mount when script executes
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
}

export default App;
