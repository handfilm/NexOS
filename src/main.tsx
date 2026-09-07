import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import TechPackPOEngine from './components/TechPackPOEngine';
import VoicePOIngestion from './components/VoicePOIngestion';

let appRootInstance: any = null;

export function mountApp() {
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
}

// Auto-mount when script executes
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
}

// Renderer implementation for TechPack PO
function renderTechPackComponent(container?: HTMLElement) {
  const target =
    container ||
    document.getElementById('mod-TechPackPO') ||
    document.getElementById('mod-TECHPACK') ||
    document.getElementById('body');
  if (!target) return;
  target.innerHTML = '';
  const root = createRoot(target);
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
}

// Renderer implementation for Voice Ingestion
function renderVoiceIngestComponent(container?: HTMLElement) {
  const target =
    container ||
    document.getElementById('mod-VoiceIngest') ||
    document.getElementById('mod-VOICEINGEST') ||
    document.getElementById('body');
  if (!target) return;
  target.innerHTML = '';
  const root = createRoot(target);
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
          }
        }}
        autoPopulateOnReady={true}
      />
    </div>
  );
}

// Attach module renderer bridges so openAppModule('TechPackPO'), openAppModule('TECHPACK'),
// openAppModule('VoiceIngest'), and openAppModule('VOICEINGEST') all work seamlessly.
if (typeof window !== 'undefined') {
  (window as any).render = (window as any).render || {};

  // Tech-Pack PO renderers (all case variations)
  (window as any).render.TechPackPO = renderTechPackComponent;
  (window as any).render.TECHPACKPO = renderTechPackComponent;
  (window as any).render.techpackpo = renderTechPackComponent;
  (window as any).render.TechPack = renderTechPackComponent;
  (window as any).render.TECHPACK = renderTechPackComponent;
  (window as any).render.techpack = renderTechPackComponent;
  (window as any).render.TechPackPOEngine = renderTechPackComponent;

  // Voice Ingestion renderers (all case variations including uppercase "VOICEINGEST")
  (window as any).render.VoiceIngest = renderVoiceIngestComponent;
  (window as any).render.VOICEINGEST = renderVoiceIngestComponent;
  (window as any).render.voiceingest = renderVoiceIngestComponent;
  (window as any).render.VoicePOIngestion = renderVoiceIngestComponent;
  (window as any).render.VOICE_INGEST = renderVoiceIngestComponent;
  (window as any).render.voice_ingest = renderVoiceIngestComponent;

  // Window-level helpers
  (window as any).renderTechPackPO = renderTechPackComponent;
  (window as any).renderTECHPACK = renderTechPackComponent;
  (window as any).renderTechPack = renderTechPackComponent;
  (window as any).renderVoiceIngest = renderVoiceIngestComponent;
  (window as any).renderVOICEINGEST = renderVoiceIngestComponent;
  (window as any).renderVoicePOIngestion = renderVoiceIngestComponent;
}

export default App;
