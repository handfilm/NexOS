import React, { useState, useEffect, useCallback } from 'react';
import TechPackPOEngine from './components/TechPackPOEngine';
import VoicePOIngestion from './components/VoicePOIngestion';
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
    }
    return 'DEFAULT';
  });

  const [isTechPackOpen, setIsTechPackOpen] = useState<boolean>(false);
  const [isVoiceIngestOpen, setIsVoiceIngestOpen] = useState<boolean>(false);
  const [preSelectedCustomer, setPreSelectedCustomer] = useState<any | null>(null);
  const [lastExtractedSpec, setLastExtractedSpec] = useState<ExtractedPOSpec | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const openTechPack = useCallback((customer?: any) => {
    if (customer) {
      setPreSelectedCustomer(customer);
    }
    setIsTechPackOpen(true);
    setIsVoiceIngestOpen(false);
  }, []);

  const closeTechPack = useCallback(() => {
    setIsTechPackOpen(false);
    setPreSelectedCustomer(null);
  }, []);

  const openVoiceIngest = useCallback(() => {
    setIsVoiceIngestOpen(true);
    setIsTechPackOpen(false);
  }, []);

  const closeVoiceIngest = useCallback(() => {
    setIsVoiceIngestOpen(false);
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

    (window as any).NexusApp = {
      openTechPack,
      closeTechPack,
      openVoiceIngest,
      closeVoiceIngest,
      navigate: (route: string) => setCurrentRoute(route),
      getState: () => ({ isTechPackOpen, isVoiceIngestOpen, currentRoute, lastExtractedSpec })
    };

    const handleOpenTechPackEvent = (e: any) => {
      openTechPack(e.detail?.customer);
    };
    const handleOpenVoiceEvent = () => {
      openVoiceIngest();
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
      }
    };

    window.addEventListener('nexus:open-techpack', handleOpenTechPackEvent);
    window.addEventListener('nexus:open-voice', handleOpenVoiceEvent);
    window.addEventListener('nexus:navigate', handleNavigateEvent);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('nexus:open-techpack', handleOpenTechPackEvent);
      window.removeEventListener('nexus:open-voice', handleOpenVoiceEvent);
      window.removeEventListener('nexus:navigate', handleNavigateEvent);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [openTechPack, closeTechPack, openVoiceIngest, closeVoiceIngest, isTechPackOpen, isVoiceIngestOpen, currentRoute, lastExtractedSpec]);

  // View switch/case rendering
  const renderCurrentView = () => {
    switch (currentRoute.toUpperCase()) {
      case 'VOICEINGEST':
      case 'VOICE_INGEST':
      case 'VOICE':
        return (
          <div className="voice-ingest-router-view p-4 sm:p-6 max-w-5xl mx-auto font-mono text-zinc-100 bg-[#0d0d0c] rounded-2xl border border-amber-500/30 my-4 shadow-2xl">
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('TECHPACK')}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>OPEN TECH-PACK PO →</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentRoute('DEFAULT')}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
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

      default:
        return null;
    }
  };

  return (
    <div className={`nexus-react-system ${className}`}>
      {/* ── Toast Notification Banner ── */}
      {toastNotification && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[10001] max-w-lg w-11/12 bg-[#0d0d0c] border border-amber-500/60 text-zinc-100 text-xs px-4 py-2.5 rounded-lg shadow-2xl flex items-center justify-between gap-3 font-mono animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚡</span>
            <span>{toastNotification}</span>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-zinc-400 hover:text-white text-xs px-1"
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div
            className="relative w-full max-w-4xl bg-[#0e0e0d] border border-amber-500/40 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#171716] border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                      VOICE PO INGESTION &amp; AUDIO AI DOCK
                    </span>
                    <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                      GEMINI FLASH
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Speak or drag WhatsApp voice notes / voice memos to extract structured tech-pack POs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openTechPack()}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Switch directly to Tech-Pack PO Engine"
                >
                  <span>📋</span>
                  <span>OPEN TECH-PACK PO</span>
                </button>
                <button
                  type="button"
                  onClick={closeVoiceIngest}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
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
    </div>
  );
};

export default App;
