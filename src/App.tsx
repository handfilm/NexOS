import React, { useState, useEffect, useCallback } from 'react';
import TechPackPOEngine from './components/TechPackPOEngine';
import VoicePOIngestion from './components/VoicePOIngestion';
import CorporateSupplies from './components/CorporateSupplies';
import LogisticsSettlementHub from './components/LogisticsSettlementHub';
import { ExtractedPOSpec } from './components/VoicePOIngestion';

export interface AppProps {
  className?: string;
  initialRoute?: string;
}

export const App: React.FC<AppProps> = ({ className = '', initialRoute = 'DEFAULT' }) => {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (initialRoute && initialRoute !== 'DEFAULT') return initialRoute;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#/', '').replace('#', '').toUpperCase();
      if (hash === 'VOICEINGEST' || hash === 'VOICE_INGEST' || hash === 'VOICE') return 'VOICEINGEST';
      if (hash === 'TECHPACK' || hash === 'TECHPACKPO' || hash === 'TECHPACK_PO') return 'TECHPACK';
      if (hash === 'CORPORATESUPPLIES' || hash === 'CORPORATE_SUPPLIES' || hash === 'CORPORATE') return 'CORPORATESUPPLIES';
      if (hash === 'LOGISTICS' || hash === 'LOGISTICS_HUB' || hash === 'SETTLEMENT' || hash === 'LOGISTICSSETTLEMENTHUB') return 'LOGISTICS';
    }
    return 'DEFAULT';
  });

  const [isTechPackOpen, setIsTechPackOpen] = useState<boolean>(false);
  const [isVoiceIngestOpen, setIsVoiceIngestOpen] = useState<boolean>(false);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState<boolean>(false);
  const [preSelectedCustomer, setPreSelectedCustomer] = useState<any | null>(null);
  const [preSelectedLogisticsOrder, setPreSelectedLogisticsOrder] = useState<any | null>(null);
  const [lastExtractedSpec, setLastExtractedSpec] = useState<ExtractedPOSpec | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const openTechPack = useCallback((customer?: any) => {
    if (customer) {
      setPreSelectedCustomer(customer);
    }
    setIsTechPackOpen(true);
    setIsVoiceIngestOpen(false);
    setIsLogisticsOpen(false);
  }, []);

  const closeTechPack = useCallback(() => {
    setIsTechPackOpen(false);
    setPreSelectedCustomer(null);
  }, []);

  const openVoiceIngest = useCallback(() => {
    setIsVoiceIngestOpen(true);
    setIsTechPackOpen(false);
    setIsLogisticsOpen(false);
  }, []);

  const closeVoiceIngest = useCallback(() => {
    setIsVoiceIngestOpen(false);
  }, []);

  const openLogistics = useCallback((order?: any) => {
    if (order) {
      setPreSelectedLogisticsOrder(order);
    }
    setIsLogisticsOpen(true);
    setIsTechPackOpen(false);
    setIsVoiceIngestOpen(false);
  }, []);

  const closeLogistics = useCallback(() => {
    setIsLogisticsOpen(false);
    setPreSelectedLogisticsOrder(null);
  }, []);

  const handleVoiceSpecExtracted = useCallback((spec: ExtractedPOSpec) => {
    setLastExtractedSpec(spec);
    setIsVoiceIngestOpen(false);
    setIsTechPackOpen(true);

    const msg = `Voice PO Spec Extracted: ${spec.category || 'Apparel'} (${spec.totalQuantity || 0} pcs, ${spec.fabric || 'Custom Fabric'}) routed to Tech-Pack PO Engine`;
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 6000);

    // Also trigger native app toast if available
    if (typeof (window as any).toast === 'function') {
      (window as any).toast(msg, 'ok');
    }
  }, []);

  // Global window listeners & hash routing bridges
  useEffect(() => {
    (window as any).openTechPackPOEngine = (cust?: any) => {
      openTechPack(cust);
    };
    (window as any).closeTechPackPOEngine = () => {
      closeTechPack();
    };
    (window as any).openVoicePOIngestion = () => {
      openVoiceIngest();
    };
    (window as any).closeVoicePOIngestion = () => {
      closeVoiceIngest();
    };

    (window as any).openLogisticsSettlementHub = (order?: any) => {
      openLogistics(order);
    };
    (window as any).closeLogisticsSettlementHub = () => {
      closeLogistics();
    };

    (window as any).NexusApp = {
      openTechPack,
      closeTechPack,
      openVoiceIngest,
      closeVoiceIngest,
      openLogistics,
      closeLogistics,
      navigate: (route: string) => setCurrentRoute(route),
      getState: () => ({ isTechPackOpen, isVoiceIngestOpen, isLogisticsOpen, currentRoute, lastExtractedSpec })
    };

    const handleOpenTechPackEvent = (e: any) => {
      openTechPack(e.detail?.customer);
    };
    const handleOpenVoiceEvent = () => {
      openVoiceIngest();
    };
    const handleOpenCorporateEvent = () => {
      setCurrentRoute('CORPORATESUPPLIES');
    };
    const handleOpenLogisticsEvent = (e: any) => {
      const order = e.detail?.order || e.detail;
      openLogistics(order);
    };
    const handleNavigateEvent = (e: any) => {
      const target = (e.detail?.route || e.detail || '').toString().toUpperCase();
      if (target) setCurrentRoute(target);
    };

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '').toUpperCase();
      if (hash === 'VOICEINGEST' || hash === 'VOICE_INGEST' || hash === 'VOICE') {
        setCurrentRoute('VOICEINGEST');
      } else if (hash === 'TECHPACK' || hash === 'TECHPACKPO' || hash === 'TECHPACK_PO') {
        setCurrentRoute('TECHPACK');
      } else if (hash === 'CORPORATESUPPLIES' || hash === 'CORPORATE_SUPPLIES' || hash === 'CORPORATE') {
        setCurrentRoute('CORPORATESUPPLIES');
      } else if (hash === 'LOGISTICS' || hash === 'LOGISTICS_HUB' || hash === 'SETTLEMENT' || hash === 'LOGISTICSSETTLEMENTHUB') {
        setCurrentRoute('LOGISTICS');
      }
    };

    window.addEventListener('nexus:open-techpack', handleOpenTechPackEvent);
    window.addEventListener('nexus:open-voice', handleOpenVoiceEvent);
    window.addEventListener('nexus:open-corporate-supplies', handleOpenCorporateEvent);
    window.addEventListener('nexus:open-logistics', handleOpenLogisticsEvent);
    window.addEventListener('nexus:navigate', handleNavigateEvent);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('nexus:open-techpack', handleOpenTechPackEvent);
      window.removeEventListener('nexus:open-voice', handleOpenVoiceEvent);
      window.removeEventListener('nexus:open-corporate-supplies', handleOpenCorporateEvent);
      window.removeEventListener('nexus:open-logistics', handleOpenLogisticsEvent);
      window.removeEventListener('nexus:navigate', handleNavigateEvent);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [openTechPack, closeTechPack, openVoiceIngest, closeVoiceIngest, openLogistics, closeLogistics, isTechPackOpen, isVoiceIngestOpen, isLogisticsOpen, currentRoute, lastExtractedSpec]);

  // View switch/case rendering
  const renderCurrentView = () => {
    console.log('[Router] renderCurrentView active route:', currentRoute);
    switch (currentRoute.toUpperCase()) {
      case 'VOICEINGEST':
      case 'VOICE_INGEST':
      case 'VOICE':
      case 'VOICEPOINGESTION':
      case 'VOICE_PO_INGEST':
      case 'VOICEINGESTION':
        return (
          <div className="voice-ingest-router-view p-4 sm:p-6 max-w-5xl mx-auto font-mono text-[#1e293b] bg-white/85 backdrop-blur-xl rounded-2xl border border-white/90 my-4 shadow-[4px_4px_20px_rgba(166,180,200,0.35),-4px_-4px_20px_#ffffff]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-1">
                  Audio Procurement Intelligence · Gemini Flash
                </div>
                <h2 className="text-xl font-bold text-[#1e293b]">Voice PO Ingestion &amp; Audio AI Dock</h2>
                <p className="text-xs text-[#64748b] mt-1">
                  Record voice commands or drop buyer audio notes to extract apparel specs directly into production POs.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('TECHPACK')}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-[#d97706] hover:bg-[#b45309] text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>📋</span>
                  <span>OPEN TECH-PACK PO →</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentRoute('DEFAULT')}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-white/90 hover:bg-white border border-slate-200 text-[#475569] hover:text-[#1e293b] transition-all cursor-pointer shadow-sm"
                >
                  ✕ CLOSE VIEW
                </button>
              </div>
            </div>
            <VoicePOIngestion
              onSpecExtracted={handleVoiceSpecExtracted}
              onCancel={() => setCurrentRoute('DEFAULT')}
              autoPopulateOnReady={true}
            />
          </div>
        );

      case 'TECHPACK':
      case 'TECHPACKPO':
      case 'TECHPACK_PO':
      case 'TECH_PACK':
      case 'TECHPACKPOENGINE':
      case 'TECH_PACK_PO':
        return (
          <div className="techpack-router-view p-3 max-w-7xl mx-auto my-4">
            <TechPackPOEngine
              isOpen={true}
              mode="embedded"
              onClose={() => setCurrentRoute('DEFAULT')}
              preSelectedCustomer={preSelectedCustomer}
              initialPOSpec={lastExtractedSpec || undefined}
              onSuccess={(specOrder) => {
                const successMsg = `PO ${specOrder?.poNumber || 'Order'} saved to factory ledger & queue!`;
                setToastNotification(successMsg);
                if (typeof (window as any).toast === 'function') {
                  (window as any).toast(successMsg, 'ok');
                }
              }}
            />
          </div>
        );

      case 'CORPORATESUPPLIES':
      case 'CORPORATE_SUPPLIES':
      case 'CORPORATE':
      case 'CORPORATESUPPLY':
        return (
          <div className="corporate-router-view w-full">
            <CorporateSupplies />
          </div>
        );

      case 'LOGISTICS':
      case 'LOGISTICS_HUB':
      case 'LOGISTICSSETTLEMENTHUB':
      case 'LOGISTICS_SETTLEMENT':
      case 'SETTLEMENT':
        return (
          <div className="logistics-router-view max-w-7xl mx-auto my-4">
            <LogisticsSettlementHub
              initialOrder={preSelectedLogisticsOrder}
              mode="embedded"
              onClose={() => setCurrentRoute('DEFAULT')}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`nexus-react-system ${className}`}>
      {/* ── Toast Notification Banner ── */}
      {toastNotification && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[10001] max-w-lg w-11/12 bg-white/95 backdrop-blur-xl border border-amber-500/60 text-[#1e293b] text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center justify-between gap-3 font-mono animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">⚡</span>
            <span>{toastNotification}</span>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Router Active View Switch/Case ── */}
      {renderCurrentView()}

      {/* ── Tech Pack PO Engine (Modal Mode) ── */}
      {isTechPackOpen && (
        <TechPackPOEngine
          isOpen={isTechPackOpen}
          onClose={closeTechPack}
          preSelectedCustomer={preSelectedCustomer}
          mode="modal"
          initialPOSpec={lastExtractedSpec || undefined}
          onSuccess={(specOrder) => {
            const successMsg = `PO ${specOrder?.poNumber || 'Order'} saved to factory ledger & queue!`;
            setToastNotification(successMsg);
            if (typeof (window as any).toast === 'function') {
              (window as any).toast(successMsg, 'ok');
            }
          }}
        />
      )}

      {/* ── Voice PO Ingestion Modal / Drawer ── */}
      {isVoiceIngestOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-md overflow-y-auto">
          <div
            className="relative w-full max-w-4xl bg-white/95 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(166,180,200,0.5)] overflow-hidden flex flex-col my-auto text-[#1e293b]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white/90 border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold tracking-widest text-amber-600 uppercase">
                      VOICE PO INGESTION &amp; AUDIO AI DOCK
                    </span>
                    <span className="text-[10px] font-mono bg-amber-50 border border-amber-200 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                      GEMINI FLASH
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] font-mono mt-0.5">
                    Speak or drag WhatsApp voice notes / voice memos to extract structured tech-pack POs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openTechPack()}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-[#d97706] hover:bg-[#b45309] text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Switch directly to Tech-Pack PO Engine"
                >
                  <span>📋</span>
                  <span>OPEN TECH-PACK PO</span>
                </button>
                <button
                  type="button"
                  onClick={closeVoiceIngest}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-white/90 hover:bg-white border border-slate-200 text-[#475569] hover:text-[#1e293b] transition-all cursor-pointer shadow-sm"
                  title="Close modal"
                >
                  ✕ CLOSE
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[82vh]">
              <VoicePOIngestion
                onSpecExtracted={handleVoiceSpecExtracted}
                onCancel={closeVoiceIngest}
                autoPopulateOnReady={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Logistics & COD Settlement Dock (Modal Mode) ── */}
      {isLogisticsOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto"
          onClick={closeLogistics}
        >
          <div
            className="relative w-full max-w-6xl overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <LogisticsSettlementHub
              initialOrder={preSelectedLogisticsOrder}
              mode="modal"
              onClose={closeLogistics}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
