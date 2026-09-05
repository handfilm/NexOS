/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/camera.js
   Native Camera & Optical Scanner Engine
   Full-Spectrum Camera Studio · Barcode/QR Scanner · File Fallback
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let currentStream = null;
  let currentFacingMode = 'environment'; // 'environment' | 'user'
  let availableDevices = [];
  let currentDeviceId = null;
  let isTorchOn = false;
  let scanInterval = null;
  let currentFilter = 'normal'; // 'normal' | 'leather' | 'doc'
  let activeMode = 'photo'; // 'photo' | 'barcode' | 'doc'
  let capturedImageDataUrl = null;
  let barcodeDetector = null;

  // Initialize BarcodeDetector if browser supports it
  if ('BarcodeDetector' in window) {
    try {
      barcodeDetector = new window.BarcodeDetector({
        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'data_matrix', 'itf']
      });
    } catch (e) {
      console.warn('BarcodeDetector format error, using default:', e);
      try { barcodeDetector = new window.BarcodeDetector(); } catch(err){}
    }
  }

  // Synthesized Sound Effects (No external audio file dependencies)
  function playAudioChirp(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'shutter') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      } else if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } else if (type === 'focus') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(900, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch (e) {}
  }

  // Enumerate video devices
  async function listCameras() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableDevices = devices.filter(d => d.kind === 'videoinput');
      return availableDevices;
    } catch (e) {
      return [];
    }
  }

  // Stop current active media stream
  function stopStream() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        try { track.stop(); } catch(e){}
      });
      currentStream = null;
    }
    isTorchOn = false;
  }

  // Start Camera Stream
  async function startStream(facing = 'environment', deviceId = null) {
    const videoEl = document.getElementById('camera-video-feed');
    const statusEl = document.getElementById('camera-status-msg');
    const fallbackBox = document.getElementById('camera-fallback-box');
    const loaderEl = document.getElementById('camera-stream-loader');

    if (!videoEl) return;
    stopStream();

    if (loaderEl) loaderEl.style.display = 'flex';
    if (statusEl) statusEl.textContent = 'Connecting Camera…';
    if (fallbackBox) fallbackBox.style.display = 'none';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (loaderEl) loaderEl.style.display = 'none';
      if (statusEl) statusEl.textContent = 'Camera API not supported in this browser.';
      if (fallbackBox) fallbackBox.style.display = 'flex';
      return;
    }

    try {
      const constraints = {
        audio: false,
        video: deviceId 
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: facing },
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 }
            }
      };

      currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      videoEl.srcObject = currentStream;
      videoEl.setAttribute('playsinline', 'true');
      await videoEl.play();

      if (loaderEl) loaderEl.style.display = 'none';
      if (statusEl) statusEl.textContent = activeMode === 'barcode' ? 'Align Barcode / QR within frame' : 'Live Camera Active';
      
      currentFacingMode = facing;
      await listCameras();
      updateCameraControlsUI();

      if (activeMode === 'barcode') {
        startBarcodeScannerLoop();
      }
    } catch (err) {
      console.warn('Direct camera constraint error, retrying standard video:', err);
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoEl.srcObject = currentStream;
        videoEl.setAttribute('playsinline', 'true');
        await videoEl.play();
        if (loaderEl) loaderEl.style.display = 'none';
        if (statusEl) statusEl.textContent = 'Live Camera Active';
        updateCameraControlsUI();
        if (activeMode === 'barcode') startBarcodeScannerLoop();
      } catch (fallbackErr) {
        console.error('Camera stream access failed:', fallbackErr);
        if (loaderEl) loaderEl.style.display = 'none';
        if (statusEl) statusEl.textContent = 'Camera access blocked or unavailable.';
        if (fallbackBox) fallbackBox.style.display = 'flex';
      }
    }
  }

  // Toggle Camera Facing Mode (Front vs Back)
  async function toggleCameraFacing() {
    const nextFacing = currentFacingMode === 'environment' ? 'user' : 'environment';
    await startStream(nextFacing);
  }

  // Switch to specific camera device
  async function switchCameraDevice(deviceId) {
    currentDeviceId = deviceId;
    await startStream(currentFacingMode, deviceId);
  }

  // Toggle Torch / Flashlight
  async function toggleTorch() {
    if (!currentStream) return;
    const track = currentStream.getVideoTracks()[0];
    if (!track) return;
    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        isTorchOn = !isTorchOn;
        await track.applyConstraints({ advanced: [{ torch: isTorchOn }] });
        const torchBtn = document.getElementById('camera-torch-btn');
        if (torchBtn) {
          torchBtn.classList.toggle('active', isTorchOn);
          torchBtn.style.color = isTorchOn ? 'var(--gold)' : 'var(--ink-2)';
        }
        toast(isTorchOn ? 'Flashlight Enabled' : 'Flashlight Disabled');
      } else {
        toast('Torch not supported on this device camera');
      }
    } catch (e) {
      toast('Torch control unavailable');
    }
  }

  // Apply Visual Filters
  function setCameraFilter(filterName) {
    currentFilter = filterName;
    const videoEl = document.getElementById('camera-video-feed');
    const filterBtns = document.querySelectorAll('.camera-filter-pill');
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filterName);
    });

    if (!videoEl) return;
    if (filterName === 'leather') {
      videoEl.style.filter = 'contrast(1.45) saturate(1.25) brightness(1.02)';
      toast('Filter: Leather Texture Inspector');
    } else if (filterName === 'doc') {
      videoEl.style.filter = 'grayscale(1) contrast(1.7) brightness(1.1)';
      toast('Filter: Document & Spec Sheet B&W');
    } else {
      videoEl.style.filter = 'none';
      toast('Filter: Normal');
    }
  }

  // Switch Modes: Photo Studio vs Barcode Scanner vs Spec Sheet
  function setCameraMode(mode) {
    activeMode = mode;
    const modeBtns = document.querySelectorAll('.camera-mode-tab');
    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

    const statusEl = document.getElementById('camera-status-msg');
    const reticleEl = document.getElementById('camera-scanner-reticle');
    const shutterBtn = document.getElementById('camera-shutter-btn');
    const filterBar = document.getElementById('camera-filter-bar');
    const manualBar = document.getElementById('camera-scanner-manual-bar');

    if (mode === 'barcode') {
      if (reticleEl) reticleEl.style.display = 'block';
      if (manualBar) manualBar.style.display = 'block';
      if (filterBar) filterBar.style.display = 'none';
      if (statusEl) statusEl.textContent = 'Scan Barcode / QR / SKU Code';
      if (shutterBtn) shutterBtn.style.display = 'none';
      startBarcodeScannerLoop();
    } else if (mode === 'doc') {
      if (reticleEl) reticleEl.style.display = 'none';
      if (manualBar) manualBar.style.display = 'none';
      if (filterBar) filterBar.style.display = 'flex';
      if (statusEl) statusEl.textContent = 'Position Leather Spec / Invoice';
      if (shutterBtn) shutterBtn.style.display = 'flex';
      setCameraFilter('doc');
      if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    } else {
      if (reticleEl) reticleEl.style.display = 'none';
      if (manualBar) manualBar.style.display = 'none';
      if (filterBar) filterBar.style.display = 'flex';
      if (statusEl) statusEl.textContent = 'Capture Leather Goods / Product Photo';
      if (shutterBtn) shutterBtn.style.display = 'flex';
      setCameraFilter('normal');
      if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    }
  }

  // Continuous Barcode Scanning
  function startBarcodeScannerLoop() {
    if (scanInterval) clearInterval(scanInterval);
    const videoEl = document.getElementById('camera-video-feed');
    if (!videoEl) return;

    scanInterval = setInterval(async () => {
      if (!currentStream || !videoEl || videoEl.readyState < 2) return;
      
      if (barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(videoEl);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            handleDetectedBarcode(code, barcodes[0].format);
          }
        } catch (e) {}
      }
    }, 350);
  }

  // Handle Detected Barcode or QR Code
  async function handleDetectedBarcode(code, format = 'QR / BARCODE') {
    playAudioChirp('beep');
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }

    // Clean and normalize code
    const rawCode = String(code || '').trim();
    let productId = null;
    let sku = null;

    // Check if code matches HH QR format: "HH:PROD:id", "HH-PRD:id", "PROD:id"
    if (rawCode.startsWith('HH:PROD:')) {
      productId = rawCode.replace('HH:PROD:', '').trim();
    } else if (rawCode.startsWith('HH-PRD:')) {
      productId = rawCode.replace('HH-PRD:', '').trim();
    } else if (rawCode.startsWith('PROD:')) {
      productId = rawCode.replace('PROD:', '').trim();
    } else if (rawCode.startsWith('{') && rawCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(rawCode);
        if (parsed.id) productId = parsed.id;
        if (parsed.sku) sku = parsed.sku;
      } catch (e) {}
    } else if (rawCode.includes('#product/')) {
      productId = rawCode.split('#product/')[1]?.split('?')[0];
    } else if (rawCode.includes('/products/')) {
      const parts = rawCode.split('/products/')[1]?.split('?')[0];
      if (parts) productId = parts;
    }

    // Find product in catalog cache or fetch from service
    const cache = window._lastProductsCache || [];
    let product = null;

    if (productId) {
      product = cache.find(p => p.id === productId || p.handle === productId);
    }
    if (!product && (sku || rawCode)) {
      const matchKey = (sku || rawCode).toLowerCase();
      product = cache.find(p => 
        (p.id && p.id.toLowerCase() === matchKey) ||
        (p.handle && p.handle.toLowerCase() === matchKey) ||
        (p.variants && p.variants.some(v => v.sku && v.sku.toLowerCase() === matchKey))
      );
    }

    // If still not found and we have an ID, attempt async fetch from ProductsService
    if (!product && productId && window.ProductsService && typeof window.ProductsService.get === 'function') {
      try {
        product = await window.ProductsService.get(productId);
      } catch (e) {}
    }

    const modalBody = document.getElementById('camera-scanner-result-overlay');
    if (modalBody) {
      if (product) {
        // RICH PRODUCT DETECTED CARD
        const v = product.variants?.[0] || {};
        const productSku = v.sku || `HH-${(product.id || 'PRD').toUpperCase()}`;
        const price = Number(product.pricing?.price || v.price || 0);
        const imgUrl = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80';
        const stock = product.totalInventory !== undefined ? product.totalInventory : (v.inventoryQty || 0);

        modalBody.innerHTML = `
          <div class="camera-product-detected-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span class="pill ok" style="font-size:9px;font-weight:800;letter-spacing:1px;">
                ✓ PRODUCT MATCHED
              </span>
              <span style="font-family:var(--mono);font-size:10px;color:var(--ink-3);">
                Format: ${format}
              </span>
            </div>

            <div style="display:flex;gap:12px;align-items:center;background:var(--bg-3);padding:10px;border-radius:10px;border:1px solid var(--wire);margin-bottom:14px;">
              <img src="${imgUrl}" alt="${product.title}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--wire);" onerror="this.src='https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80'"/>
              <div style="flex:1;min-width:0;">
                <div style="font-size:9.5px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:0.5px;">${product.productType || 'Leather Goods'}</div>
                <div style="font-size:14px;font-weight:800;color:var(--ink);margin:2px 0;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${product.title}">
                  ${product.title}
                </div>
                <div style="display:flex;gap:8px;align-items:center;font-size:11px;font-family:var(--mono);margin-top:4px;">
                  <span style="font-weight:800;color:var(--ink);font-size:13px;">৳${price.toLocaleString()}</span>
                  <span style="color:var(--ink-3);">·</span>
                  <span style="color:var(--ink-2);">${productSku}</span>
                  <span style="color:var(--ink-3);">·</span>
                  <span style="color:${stock > 5 ? 'var(--ok)' : 'var(--warn)'};font-weight:700;">${stock} in stock</span>
                </div>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;">
              <button class="btn btn-gold" style="font-size:13px;padding:12px;font-weight:800;display:flex;justify-content:center;align-items:center;gap:6px;" onclick="window.openProductFromScanner('${product.id}')">
                ⚡ Open Product Details
              </button>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <button class="btn btn-dark" style="font-size:11px;padding:9px;" onclick="window.CameraEngine.applyBarcodeToQuickSale('${productSku}')">
                  ⚡ Add to Order
                </button>
                <button class="btn btn-dark" style="font-size:11px;padding:9px;" onclick="window.openProductQrModal('${product.id}')">
                  🔲 QR Hangtag
                </button>
              </div>
              <button class="btn btn-secondary" style="margin-top:4px;font-size:11px;" onclick="window.CameraEngine.resumeScanner()">
                ↻ Scan Next Item
              </button>
            </div>
          </div>
        `;
      } else {
        // UNMATCHED CODE DETECTED CARD
        modalBody.innerHTML = `
          <div class="camera-result-card">
            <div style="font-family:var(--mono);font-size:10px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;">Code / QR Detected ✓</div>
            <div style="font-family:var(--display);font-size:22px;color:var(--ink);margin:6px 0 2px;word-break:break-all;">${rawCode}</div>
            <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);margin-bottom:14px;">Format: ${format}</div>
            
            <div style="display:flex;flex-direction:column;gap:8px;">
              <button class="btn btn-gold" onclick="window.openNewProductWithSku('${rawCode}')">
                + Create Product with this Code
              </button>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <button class="btn btn-dark" onclick="window.CameraEngine.applyBarcodeToQuickSale('${rawCode}')">⚡ Add to Order</button>
                <button class="btn btn-dark" onclick="window.CameraEngine.searchCatalogByBarcode('${rawCode}')">🔍 Search SKU</button>
              </div>
              <button class="btn btn-secondary" style="margin-top:4px;" onclick="window.CameraEngine.resumeScanner()">↻ Scan Next</button>
            </div>
          </div>
        `;
      }
      modalBody.style.display = 'flex';
    }
    toast(`Scanned: ${rawCode}`);
  }

  // Snap Snapshot
  function capturePhoto() {
    const videoEl = document.getElementById('camera-video-feed');
    if (!videoEl || !currentStream) {
      toast('No active camera feed');
      return;
    }

    playAudioChirp('shutter');

    // Visual Flash Animation
    const flashEl = document.getElementById('camera-flash-overlay');
    if (flashEl) {
      flashEl.style.opacity = '0.85';
      setTimeout(() => { flashEl.style.opacity = '0'; }, 150);
    }

    // Capture to Canvas
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 1280;
    canvas.height = videoEl.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // Apply Filter if selected
    if (currentFilter === 'leather') {
      ctx.filter = 'contrast(1.4) saturate(1.25)';
    } else if (currentFilter === 'doc') {
      ctx.filter = 'grayscale(1) contrast(1.6)';
    }

    // Flip horizontal if front camera
    if (currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    capturedImageDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    showCapturedPreview(capturedImageDataUrl);
  }

  // Display Captured Image Review Screen
  function showCapturedPreview(dataUrl) {
    const reviewWrap = document.getElementById('camera-preview-review');
    const previewImg = document.getElementById('camera-captured-img');
    const liveWrap = document.getElementById('camera-live-viewport');

    if (previewImg) previewImg.src = dataUrl;
    if (liveWrap) liveWrap.style.display = 'none';
    if (reviewWrap) reviewWrap.style.display = 'flex';

    toast('Photo Captured ✓');
  }

  // Discard and Retake
  function retakePhoto() {
    capturedImageDataUrl = null;
    const reviewWrap = document.getElementById('camera-preview-review');
    const liveWrap = document.getElementById('camera-live-viewport');
    if (reviewWrap) reviewWrap.style.display = 'none';
    if (liveWrap) liveWrap.style.display = 'block';
  }

  // Download Captured Photo
  function downloadCapturedPhoto() {
    if (!capturedImageDataUrl) return;
    const link = document.createElement('a');
    link.download = `HH_Capture_${Date.now()}.jpg`;
    link.href = capturedImageDataUrl;
    link.click();
    toast('Image Downloaded ✓');
  }

  // Use captured photo to create a new Product
  function usePhotoAsNewProduct() {
    if (!capturedImageDataUrl) return;
    const imgData = capturedImageDataUrl;
    closeCameraModal();
    
    // If product sheet is already open in DOM, append photo directly
    if (document.getElementById('p_gallery_container') && typeof window.addCapturedProductPhoto === 'function') {
      window.addCapturedProductPhoto(imgData);
      return;
    }

    // Otherwise open product form and preload photo
    if (typeof window.openAdvancedProductForm === 'function') {
      window.openAdvancedProductForm();
      setTimeout(() => {
        if (typeof window.addCapturedProductPhoto === 'function') {
          window.addCapturedProductPhoto(imgData);
        } else {
          const imgInput = document.getElementById('p_img');
          if (imgInput) imgInput.value = imgData;
        }
        toast('Captured photo loaded into product builder');
      }, 250);
    }
  }

  // Attach photo to Quick Sale / Order
  function attachPhotoToQuickOrder() {
    if (!capturedImageDataUrl) return;
    closeCameraModal();
    if (typeof window.openQuickSale === 'function') {
      window.openQuickSale();
      toast('Photo attached to transaction draft');
    }
  }

  // Handle local file selection / gallery / OS native camera upload
  function handleFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      capturedImageDataUrl = event.target.result;
      showCapturedPreview(capturedImageDataUrl);
    };
    reader.readAsDataURL(file);
  }

  // Interactive Viewfinder Tap to Focus
  function handleViewfinderTap(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const focusRing = document.getElementById('camera-focus-ring');
    if (focusRing) {
      focusRing.style.left = `${x}px`;
      focusRing.style.top = `${y}px`;
      focusRing.classList.remove('focusing');
      void focusRing.offsetWidth; // trigger reflow
      focusRing.classList.add('focusing');
      playAudioChirp('focus');
    }
  }

  // Update UI Elements with camera info
  function updateCameraControlsUI() {
    const switchBtn = document.getElementById('camera-switch-btn');
    if (switchBtn) {
      switchBtn.style.display = (availableDevices.length > 1 || currentFacingMode) ? 'flex' : 'none';
    }
  }

  // Build the Camera Studio UI DOM
  function buildCameraStudioModalHtml() {
    return `
      <div class="camera-studio-container" id="cameraStudioRoot">
        <!-- Top Studio Bar -->
        <div class="camera-studio-header">
          <div class="camera-studio-title-block">
            <span class="camera-studio-badge">NATIVE OPTICS</span>
            <h2 class="camera-studio-title">Camera &amp; Scanner Studio</h2>
          </div>

          <!-- Mode Selectors -->
          <div class="camera-mode-tabs">
            <button class="camera-mode-tab active" data-mode="photo" onclick="window.CameraEngine.setMode('photo')">
              📸 Photo Studio
            </button>
            <button class="camera-mode-tab" data-mode="barcode" onclick="window.CameraEngine.setMode('barcode')">
              🔍 Barcode / SKU
            </button>
            <button class="camera-mode-tab" data-mode="doc" onclick="window.CameraEngine.setMode('doc')">
              📄 Spec Sheet
            </button>
          </div>

          <div style="display:flex;align-items:center;gap:8px;">
            <button class="camera-close-btn" onclick="window.CameraEngine.close()" title="Close Camera (ESC)">
              <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>

        <!-- Main Viewport Area -->
        <div class="camera-viewport-area">
          <!-- Live Viewport Container -->
          <div class="camera-live-viewport" id="camera-live-viewport" onclick="window.CameraEngine.handleTap(event)">
            <video id="camera-video-feed" autoplay playsinline muted></video>

            <!-- Optical Grid Overlay -->
            <div class="camera-grid-overlay">
              <div class="camera-grid-line v1"></div>
              <div class="camera-grid-line v2"></div>
              <div class="camera-grid-line h1"></div>
              <div class="camera-grid-line h2"></div>
            </div>

            <!-- Optical Focus Reticle -->
            <div class="camera-focus-ring" id="camera-focus-ring"></div>

            <!-- Scanner Reticle & Laser Line -->
            <div class="camera-scanner-reticle" id="camera-scanner-reticle" style="display:none;">
              <div class="scanner-corner tl"></div>
              <div class="scanner-corner tr"></div>
              <div class="scanner-corner bl"></div>
              <div class="scanner-corner br"></div>
              <div class="scanner-laser-line"></div>
              <div class="scanner-target-text">ALIGN BARCODE / QR</div>
            </div>

            <!-- Flash Animation Overlay -->
            <div class="camera-flash-overlay" id="camera-flash-overlay"></div>

            <!-- Loading Spinner -->
            <div class="camera-stream-loader" id="camera-stream-loader">
              <div class="camera-spinner"></div>
              <span style="font-family:var(--mono);font-size:11px;letter-spacing:1px;color:var(--ink-3);text-transform:uppercase;">Opening Sensor…</span>
            </div>

            <!-- Barcode Result Overlay -->
            <div class="camera-scanner-result-overlay" id="camera-scanner-result-overlay" style="display:none;"></div>

            <!-- Manual Barcode / QR Direct Tester (Warehouse Simulator) -->
            <div id="camera-scanner-manual-bar" style="display:none;position:absolute;bottom:78px;left:50%;transform:translateX(-50%);width:92%;max-width:380px;z-index:25;background:rgba(14,18,27,0.88);backdrop-filter:blur(10px);border:1px solid rgba(212,163,89,0.35);border-radius:10px;padding:8px 10px;box-shadow:0 8px 24px rgba(0,0,0,0.6);">
              <div style="font-size:8.5px;font-family:var(--mono);color:var(--gold);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;font-weight:700;display:flex;justify-content:space-between;">
                <span>WAREHOUSE QR / BARCODE EMULATOR</span>
                <span style="color:var(--ink-3);">ENTER SKU OR ID</span>
              </div>
              <div style="display:flex;gap:6px;">
                <input id="camera_manual_qr_input" type="text" placeholder="e.g. HH:PROD:prod-wlt-01 or HH-WLT-01" style="flex:1;height:30px;font-size:11.5px;background:#1F2937;border:1px solid #374151;color:#FFF;border-radius:6px;padding:0 8px;font-family:monospace;" onkeydown="if(event.key==='Enter') window.CameraEngine.testScan(this.value);"/>
                <button class="btn btn-gold btn-sm" style="height:30px;padding:0 12px;font-size:11px;font-weight:700;" onclick="window.CameraEngine.testScan(document.getElementById('camera_manual_qr_input').value)">
                  Scan
                </button>
              </div>
            </div>

            <!-- Fallback Box (Permission Blocked / No Camera) -->
            <div class="camera-fallback-box" id="camera-fallback-box" style="display:none;">
              <div style="font-size:36px;margin-bottom:8px;">📷</div>
              <div style="font-family:var(--display);font-size:20px;letter-spacing:1px;color:var(--ink);">Direct Camera Feed Blocked</div>
              <p style="font-size:12px;color:var(--ink-3);font-family:var(--mono);margin:6px 0 16px;max-width:320px;line-height:1.5;">
                Browser camera permissions can be enabled in settings, or use device file picker / OS camera roll below.
              </p>
              <label class="btn btn-gold" style="cursor:pointer;display:inline-flex;width:auto;padding:12px 24px;">
                📁 Browse Gallery / Device Camera
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="window.CameraEngine.handleFile(event)">
              </label>
            </div>
          </div>

          <!-- Photo Review Screen (Shown after capture) -->
          <div class="camera-preview-review" id="camera-preview-review" style="display:none;">
            <div class="camera-captured-img-wrap">
              <img id="camera-captured-img" src="" alt="Captured Image" />
            </div>
            <div class="camera-review-action-bar">
              <button class="btn btn-dark" onclick="window.CameraEngine.retake()">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                Retake
              </button>
              <button class="btn btn-dark" onclick="window.CameraEngine.download()">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Save
              </button>
              <button class="btn btn-gold" onclick="window.CameraEngine.useAsProduct()">
                🏷️ Add to Products
              </button>
              <button class="btn btn-gold" onclick="window.CameraEngine.useInOrder()">
                ⚡ Attach Order
              </button>
            </div>
          </div>
        </div>

        <!-- Live Filter Bar -->
        <div class="camera-filter-bar" id="camera-filter-bar">
          <button class="camera-filter-pill active" data-filter="normal" onclick="window.CameraEngine.setFilter('normal')">
            ● Normal
          </button>
          <button class="camera-filter-pill" data-filter="leather" onclick="window.CameraEngine.setFilter('leather')">
            ● Leather Detail
          </button>
          <button class="camera-filter-pill" data-filter="doc" onclick="window.CameraEngine.setFilter('doc')">
            ● Document B&amp;W
          </button>
        </div>

        <!-- Bottom Controls Bar -->
        <div class="camera-controls-dock">
          <!-- Gallery / File Picker -->
          <label class="camera-aux-btn" title="Upload from Device / Gallery">
            <svg viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="window.CameraEngine.handleFile(event)">
          </label>

          <!-- Primary Shutter Button -->
          <button class="camera-shutter-btn" id="camera-shutter-btn" onclick="window.CameraEngine.snap()" title="Take Photo">
            <div class="camera-shutter-ring"></div>
            <div class="camera-shutter-center"></div>
          </button>

          <!-- Flip Camera (Front / Back) -->
          <button class="camera-aux-btn" id="camera-switch-btn" onclick="window.CameraEngine.toggleFacing()" title="Switch Camera">
            <svg viewBox="0 0 24 24"><path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 3.655 2.457 6.737 5.808 7.665M4 14c0 4.418 3.582 8 8 8s8-3.582 8-8c0-3.655-2.457-6.737-5.808-7.665M20 4l-4 4 4 4M4 20l4-4-4-4" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>

          <!-- Flashlight / Torch -->
          <button class="camera-aux-btn" id="camera-torch-btn" onclick="window.CameraEngine.toggleTorch()" title="Flashlight Torch">
            <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>
        </div>

        <!-- Status String -->
        <div class="camera-status-bar">
          <span id="camera-status-msg">Live Camera Active</span>
        </div>
      </div>
    `;
  }

  // Open Camera Overlay
  function openCamera(options = {}) {
    activeMode = options.mode || 'photo';
    currentFilter = 'normal';

    // Remove existing overlay if present
    let overlay = document.getElementById('cameraOverlayModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cameraOverlayModal';
      overlay.className = 'camera-modal-backdrop';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = buildCameraStudioModalHtml();
    overlay.classList.add('open');

    // Add ESC key listener to close
    window.addEventListener('keydown', handleEscKey);

    startStream(currentFacingMode);
  }

  function handleEscKey(e) {
    if (e.key === 'Escape') {
      closeCameraModal();
    }
  }

  // Close Camera
  function closeCameraModal() {
    stopStream();
    window.removeEventListener('keydown', handleEscKey);
    const overlay = document.getElementById('cameraOverlayModal');
    if (overlay) {
      overlay.classList.remove('open');
      setTimeout(() => {
        if (overlay) overlay.innerHTML = '';
      }, 350);
    }
  }

  // Barcode actions
  function resumeScanner() {
    const resultOverlay = document.getElementById('camera-scanner-result-overlay');
    if (resultOverlay) resultOverlay.style.display = 'none';
    startBarcodeScannerLoop();
  }

  function applyBarcodeToQuickSale(code) {
    closeCameraModal();
    if (typeof window.openQuickSale === 'function') {
      window.openQuickSale();
      setTimeout(() => {
        const itemInput = document.getElementById('qs_item') || document.getElementById('q_item');
        if (itemInput) itemInput.value = code;
        toast(`SKU ${code} loaded into Quick Order`);
      }, 300);
    }
  }

  function searchCatalogByBarcode(code) {
    closeCameraModal();
    if (typeof window.openAppModule === 'function') {
      window.openAppModule('Products');
      setTimeout(() => {
        toast(`Searching catalog for SKU ${code}`);
      }, 300);
    }
  }

  function testScan(code) {
    if (!code || !code.trim()) {
      toast('Please enter a barcode, SKU, or QR code to test');
      return;
    }
    handleDetectedBarcode(code.trim(), 'WAREHOUSE SIMULATOR');
  }

  // Global helper to open product form directly from scanner
  window.openProductFromScanner = function (productId) {
    closeCameraModal();
    if (typeof window.openAppModule === 'function') {
      window.openAppModule('Products');
    }
    setTimeout(() => {
      if (typeof window.openAdvancedProductForm === 'function') {
        window.openAdvancedProductForm(productId);
      }
    }, 200);
  };

  // Global helper to open new product form with prefilled SKU from scanner
  window.openNewProductWithSku = function (skuCode) {
    closeCameraModal();
    if (typeof window.openAppModule === 'function') {
      window.openAppModule('Products');
    }
    setTimeout(() => {
      if (typeof window.openAdvancedProductForm === 'function') {
        window.openAdvancedProductForm(null);
        setTimeout(() => {
          const skuInput = document.getElementById('p_sku');
          if (skuInput) skuInput.value = skuCode;
        }, 100);
      }
    }, 200);
  };

  // Public API
  window.CameraEngine = {
    open: openCamera,
    close: closeCameraModal,
    snap: capturePhoto,
    retake: retakePhoto,
    download: downloadCapturedPhoto,
    useAsProduct: usePhotoAsNewProduct,
    useInOrder: attachPhotoToQuickOrder,
    setMode: setCameraMode,
    setFilter: setCameraFilter,
    toggleFacing: toggleCameraFacing,
    toggleTorch: toggleTorch,
    handleFile: handleFileSelected,
    handleTap: handleViewfinderTap,
    resumeScanner: resumeScanner,
    testScan: testScan,
    applyBarcodeToQuickSale: applyBarcodeToQuickSale,
    searchCatalogByBarcode: searchCatalogByBarcode
  };

  // Wire global startCamera to CameraEngine.open
  window.startCamera = function (mode = 'photo') {
    window.CameraEngine.open({ mode });
  };

})();
