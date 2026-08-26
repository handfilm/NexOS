/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/voice.js
   Voice Command & Microphone Operator Engine
   Continuous & Push-to-Talk Keyword Recognition
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let recognition = null;
  let isListening = false;
  let isContinuousMode = false;
  let audioStream = null;
  let audioContext = null;
  let analyser = null;
  let animFrameId = null;
  let lastCommandTime = 0;

  // Speech Recognition Compatibility Check
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Synthesized Sound Effects
  function playVoiceSound(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'stop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.11);
      }
    } catch (e) {}
  }

  // Setup Web Audio Visualizer
  async function startAudioMonitoring() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(audioStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      visualizeAudio();
    } catch (err) {
      console.warn('Microphone stream visualization unavailable:', err);
    }
  }

  function stopAudioMonitoring() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach(t => {
        try { t.stop(); } catch(e){}
      });
      audioStream = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      try { audioContext.close(); } catch(e){}
      audioContext = null;
    }
  }

  function visualizeAudio() {
    const bars = document.querySelectorAll('.voice-wave-bar');
    if (!bars || bars.length === 0 || !analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    let avg = 0;
    for (let i = 0; i < dataArray.length; i++) {
      avg += dataArray[i];
    }
    avg = avg / dataArray.length;

    bars.forEach((bar, index) => {
      const val = dataArray[index * 2] || avg;
      const height = Math.max(4, Math.min(28, (val / 255) * 32));
      bar.style.height = `${height}px`;
    });

    if (isListening) {
      animFrameId = requestAnimationFrame(visualizeAudio);
    }
  }

  // Initialize Speech Recognition Engine
  function initSpeechEngine() {
    if (!SpeechRecognition) return null;

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';
    recog.maxAlternatives = 3;

    recog.onstart = function () {
      isListening = true;
      updateVoiceUI();
      playVoiceSound('start');
      if (typeof window.toast === 'function') {
        window.toast('🎙️ Voice Assistant Listening… (Say "Quick Sale" or "Search")');
      }
    };

    recog.onresult = function (event) {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const activeText = (finalTranscript || interimTranscript).trim();
      updateTranscriptDisplay(activeText);

      if (activeText) {
        processVoiceCommand(activeText.toLowerCase());
      }
    };

    recog.onerror = function (event) {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        if (typeof window.toast === 'function') {
          window.toast('⚠️ Microphone access denied. Check browser permissions.');
        }
        stopListening();
      }
    };

    recog.onend = function () {
      if (isListening && isContinuousMode) {
        try {
          recog.start();
        } catch (e) {
          isListening = false;
          updateVoiceUI();
        }
      } else {
        isListening = false;
        stopAudioMonitoring();
        updateVoiceUI();
      }
    };

    return recog;
  }

  // Command Keyword Dispatcher
  function processVoiceCommand(rawText) {
    const now = Date.now();
    // Debounce triggers within 1.2s to prevent rapid duplicate firing
    if (now - lastCommandTime < 1200) return;

    const clean = rawText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

    // 1. Quick Sale Trigger
    if (
      clean.includes('quick sale') ||
      clean.includes('quicksale') ||
      clean.includes('make sale') ||
      clean.includes('new sale') ||
      clean.includes('quick order') ||
      clean.includes('instant sale') ||
      clean === 'sale'
    ) {
      lastCommandTime = now;
      executeCommand('Quick Sale', () => {
        if (typeof window.openQuickSale === 'function') window.openQuickSale();
      });
      return;
    }

    // 2. Search Trigger
    if (
      clean.startsWith('search for ') ||
      clean.startsWith('search ') ||
      clean.startsWith('find ') ||
      clean.startsWith('look up ') ||
      clean.startsWith('lookup ') ||
      clean === 'search' ||
      clean === 'find' ||
      clean.includes('search catalog') ||
      clean.includes('search products')
    ) {
      lastCommandTime = now;
      let query = '';
      if (clean.startsWith('search for ')) query = clean.replace('search for ', '').trim();
      else if (clean.startsWith('search ')) query = clean.replace('search ', '').trim();
      else if (clean.startsWith('find ')) query = clean.replace('find ', '').trim();
      else if (clean.startsWith('look up ')) query = clean.replace('look up ', '').trim();
      else if (clean.startsWith('lookup ')) query = clean.replace('lookup ', '').trim();

      executeCommand(`Search: "${query || 'Catalog'}"`, () => {
        if (typeof window.openSearch === 'function') {
          window.openSearch();
          if (query && query !== 'catalog' && query !== 'products') {
            setTimeout(() => {
              const sInput = document.getElementById('search-input');
              if (sInput) {
                sInput.value = query;
                sInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }, 250);
          }
        }
      });
      return;
    }

    // 3. Camera / Scanner Trigger
    if (
      clean.includes('camera') ||
      clean.includes('take photo') ||
      clean.includes('scanner') ||
      clean.includes('scan barcode') ||
      clean.includes('scan sku') ||
      clean.includes('open camera')
    ) {
      lastCommandTime = now;
      const isBarcode = clean.includes('barcode') || clean.includes('sku') || clean.includes('scan');
      executeCommand(isBarcode ? 'Barcode Scanner' : 'Camera Studio', () => {
        if (window.CameraEngine && typeof window.CameraEngine.open === 'function') {
          window.CameraEngine.open({ mode: isBarcode ? 'barcode' : 'photo' });
        } else if (typeof window.startCamera === 'function') {
          window.startCamera(isBarcode ? 'barcode' : 'photo');
        }
      });
      return;
    }

    // 4. Products / Catalog / Gallery Trigger
    if (
      clean.includes('gallery') ||
      clean.includes('product gallery') ||
      clean.includes('show gallery') ||
      clean.includes('open gallery') ||
      clean.includes('products') ||
      clean.includes('product catalog') ||
      clean.includes('open catalog') ||
      clean.includes('inventory')
    ) {
      lastCommandTime = now;
      executeCommand('Product Gallery', () => {
        const mount = document.getElementById("home-product-gallery-mount");
        if (mount) {
          mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (typeof window.openAppModule === 'function') {
          window.openAppModule('Products');
        }
      });
      return;
    }

    // 4b. Duplicate Product / Add Product Voice Commands
    if (
      clean.includes('duplicate product') ||
      clean.includes('duplicate') ||
      clean.includes('copy product')
    ) {
      lastCommandTime = now;
      executeCommand('Duplicate Product', () => {
        const firstProd = window._lastProductsCache?.[0];
        if (firstProd && typeof window.duplicateProduct === 'function') {
          window.duplicateProduct(firstProd.id);
        } else {
          toast('Select a product to duplicate');
        }
      });
      return;
    }

    if (
      clean.includes('add product') ||
      clean.includes('new product') ||
      clean.includes('create product')
    ) {
      lastCommandTime = now;
      executeCommand('New Product', () => {
        if (typeof window.openAdvancedProductForm === 'function') window.openAdvancedProductForm();
      });
      return;
    }

    // 5. Orders Trigger
    if (
      clean.includes('orders') ||
      clean.includes('view orders') ||
      clean.includes('order list') ||
      clean.includes('all orders')
    ) {
      lastCommandTime = now;
      executeCommand('Orders Management', () => {
        if (typeof window.openAppModule === 'function') window.openAppModule('Orders');
      });
      return;
    }

    // 6. AI Assistant Trigger
    if (
      clean.includes('nex ai') ||
      clean.includes('nexai') ||
      clean.includes('assistant') ||
      clean.includes('ai chat') ||
      clean.includes('open ai')
    ) {
      lastCommandTime = now;
      executeCommand('NexAI Assistant', () => {
        if (typeof window.openAiChat === 'function') window.openAiChat();
      });
      return;
    }

    // 7. Menu / Command Drawer
    if (
      clean.includes('open menu') ||
      clean.includes('drawer') ||
      clean.includes('command menu') ||
      clean === 'menu'
    ) {
      lastCommandTime = now;
      executeCommand('Command Menu', () => {
        if (typeof window.openDrawer === 'function') window.openDrawer();
      });
      return;
    }

    // 8. Close / Dismiss
    if (
      clean === 'close' ||
      clean === 'cancel' ||
      clean === 'dismiss' ||
      clean.includes('close window') ||
      clean.includes('close modal')
    ) {
      lastCommandTime = now;
      executeCommand('Close Window', () => {
        if (typeof window.closeSheet === 'function') window.closeSheet();
        if (typeof window.closeDrawer === 'function') window.closeDrawer();
        if (window.CameraEngine && typeof window.CameraEngine.close === 'function') window.CameraEngine.close();
      });
      return;
    }
  }

  function executeCommand(label, actionFn) {
    playVoiceSound('success');
    showCommandBadge(label);
    if (typeof window.toast === 'function') {
      window.toast(`⚡ Voice Command Triggered: ${label}`);
    }
    setTimeout(() => {
      try { actionFn(); } catch (e) { console.error('Error executing voice action:', e); }
    }, 200);

    // If not in continuous hands-free mode, stop listening after executing
    if (!isContinuousMode) {
      setTimeout(() => {
        stopListening();
      }, 1000);
    }
  }

  // Start Listening
  async function startListening() {
    if (!SpeechRecognition) {
      if (typeof window.toast === 'function') {
        window.toast('Speech Recognition API not supported in this browser environment.');
      }
      return;
    }

    try {
      if (!recognition) {
        recognition = initSpeechEngine();
      }
      if (recognition) {
        recognition.start();
        await startAudioMonitoring();
      }
    } catch (e) {
      console.warn('Voice start exception:', e);
      // Already running or restart
      isListening = true;
      updateVoiceUI();
    }
  }

  // Stop Listening
  function stopListening() {
    isListening = false;
    playVoiceSound('stop');
    stopAudioMonitoring();
    if (recognition) {
      try { recognition.stop(); } catch(e){}
    }
    updateVoiceUI();
  }

  // Toggle Listening
  function toggleVoiceListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  // Toggle Continuous Mode
  function toggleContinuousMode() {
    isContinuousMode = !isContinuousMode;
    const modeBadge = document.getElementById('voice-mode-tag');
    if (modeBadge) {
      modeBadge.textContent = isContinuousMode ? 'Continuous Mode' : 'Push to Talk';
      modeBadge.classList.toggle('active', isContinuousMode);
    }
    if (typeof window.toast === 'function') {
      window.toast(isContinuousMode ? '🎙️ Continuous Hands-Free Listening Enabled' : '🎙️ Push-to-Talk Mode Enabled');
    }
  }

  // UI Updates & HUD
  function updateVoiceUI() {
    const topbarMicBtn = document.getElementById('topbar-voice-btn');
    const hud = document.getElementById('voice-hud-panel');
    const hudStatus = document.getElementById('voice-hud-status');

    if (topbarMicBtn) {
      topbarMicBtn.classList.toggle('listening', isListening);
      topbarMicBtn.setAttribute('title', isListening ? 'Listening… Click to Stop Voice Command' : 'Voice Command (Say "Quick Sale" or "Search")');
    }

    if (hud) {
      hud.classList.toggle('active', isListening);
    }

    if (hudStatus) {
      hudStatus.textContent = isListening 
        ? (isContinuousMode ? 'Hands-Free Listening…' : 'Listening for Voice Commands…')
        : 'Microphone Standby';
    }
  }

  function updateTranscriptDisplay(text) {
    const transcriptEl = document.getElementById('voice-hud-transcript');
    if (transcriptEl) {
      transcriptEl.textContent = text ? `“${text}”` : 'Say "Quick Sale", "Search", "Camera", "Orders"…';
    }
  }

  function showCommandBadge(label) {
    const badgeEl = document.getElementById('voice-hud-matched-badge');
    if (badgeEl) {
      badgeEl.textContent = `✓ ${label}`;
      badgeEl.classList.add('pop');
      setTimeout(() => {
        badgeEl.classList.remove('pop');
      }, 1800);
    }
  }

  // Build HUD HTML
  function injectVoiceHUD() {
    if (document.getElementById('voice-hud-panel')) return;

    const hud = document.createElement('div');
    hud.id = 'voice-hud-panel';
    hud.className = 'voice-hud-panel';
    hud.innerHTML = `
      <div class="voice-hud-inner">
        <div class="voice-hud-left">
          <div class="voice-wave-container">
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
            <div class="voice-wave-bar"></div>
          </div>
          <div class="voice-hud-text-block">
            <div class="voice-hud-status" id="voice-hud-status">Listening for Voice Commands…</div>
            <div class="voice-hud-transcript" id="voice-hud-transcript">Say "Quick Sale", "Search", "Camera"…</div>
          </div>
        </div>

        <div class="voice-hud-right">
          <div class="voice-hud-matched-badge" id="voice-hud-matched-badge"></div>
          <button class="voice-hud-btn" id="voice-mode-tag" onclick="window.VoiceEngine.toggleContinuous()" title="Toggle Continuous Hands-Free Mode">
            Push to Talk
          </button>
          <button class="voice-hud-close" onclick="window.VoiceEngine.stop()" title="Stop Listening">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(hud);
  }

  // Keyboard shortcut listener (Press 'V' to toggle voice if not typing in input)
  window.addEventListener('keydown', function (e) {
    if (e.key === 'v' || e.key === 'V') {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag !== 'input' && activeTag !== 'textarea') {
        e.preventDefault();
        toggleVoiceListening();
      }
    }
  });

  // Global Engine Export
  window.VoiceEngine = {
    start: startListening,
    stop: stopListening,
    toggle: toggleVoiceListening,
    toggleContinuous: toggleContinuousMode,
    isListening: () => isListening,
    processText: processVoiceCommand
  };

  // Auto-init DOM HUD when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectVoiceHUD);
  } else {
    injectVoiceHUD();
  }

})();
