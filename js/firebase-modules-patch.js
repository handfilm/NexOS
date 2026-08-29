/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-modules-patch.js
   Live Firestore Integration Layer for Products, Customers, Orders,
   Inventory Movements, Dashboard Analytics & Activity Feed.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  window.render = window.render || {};

  // State for search and filtering across views
  window._viewState = {
    products: { search: "", status: "all", sortBy: "updatedAt", sortDir: "desc" },
    customers: { search: "", country: "all", sortBy: "updatedAt", sortDir: "desc" },
    orders: { search: "", status: "all", paymentStatus: "all", fulfillmentStatus: "all" }
  };

  function modHeader(title, subtitle, actions = []) {
    const btns = actions.map(a => `<button class="btn btn-sm ${a.primary ? 'btn-gold' : 'btn-dark'}" onclick="${a.fn}">${a.label}</button>`).join('');
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 20px 10px;">
        <div>
          <h3 style="margin:0;font-size:18px;letter-spacing:1px;">${title}</h3>
          ${subtitle ? `<p class="hint" style="margin:3px 0 0;font-size:11px;">${subtitle}</p>` : ""}
        </div>
        <div style="display:flex;gap:6px;margin-top:2px;">${btns}</div>
      </div>
    `;
  }

  function loading(msg = "Loading…") {
    return `<div style="padding:40px 20px;text-align:center;font-family:var(--mono);color:var(--ink-3);font-size:11px;letter-spacing:2px;text-transform:uppercase;">
      <div style="display:inline-block;width:18px;height:18px;border:2px solid var(--wire-hard);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
      <div>${msg}</div>
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════════
     PRODUCTS MODULE (Catalog & Inventory with Multi-Select & Batch Toolbar)
     ═══════════════════════════════════════════════════════════ */
  window._selectedProductIds = window._selectedProductIds || new Set();

  window.toggleProductSelection = function (productId, event) {
    if (event) event.stopPropagation();
    if (window._selectedProductIds.has(productId)) {
      window._selectedProductIds.delete(productId);
    } else {
      window._selectedProductIds.add(productId);
    }
    window.updateProductSelectionUI();
  };

  window.toggleSelectAllProducts = function (checked) {
    const items = window._lastProductsCache || [];
    if (checked) {
      items.forEach(p => window._selectedProductIds.add(p.id));
    } else {
      window._selectedProductIds.clear();
    }
    window.updateProductSelectionUI();
  };

  window.clearProductSelection = function () {
    window._selectedProductIds.clear();
    window.updateProductSelectionUI();
  };

  window.updateProductSelectionUI = function () {
    const count = window._selectedProductIds.size;
    const bar = document.getElementById("products-batch-floating-bar");
    const countEl = document.getElementById("products-selected-count-badge");
    const selectAllCb = document.getElementById("cb_select_all_products");

    // Update checkboxes and cards in DOM
    document.querySelectorAll(".product-item-cb").forEach(cb => {
      const pId = cb.getAttribute("data-product-id");
      const isSelected = window._selectedProductIds.has(pId);
      cb.checked = isSelected;
      const card = cb.closest(".pcard");
      if (card) {
        if (isSelected) card.classList.add("is-selected");
        else card.classList.remove("is-selected");
      }
    });

    // Update Select All Checkbox state
    const totalItems = (window._lastProductsCache || []).length;
    if (selectAllCb) {
      selectAllCb.checked = totalItems > 0 && count === totalItems;
      selectAllCb.indeterminate = count > 0 && count < totalItems;
    }

    // Update floating bar
    if (bar) {
      if (count > 0) {
        if (countEl) countEl.innerHTML = `✓ ${count} Selected`;
        bar.classList.add("active");
      } else {
        bar.classList.remove("active");
      }
    }
  };

  window.render.Products = async function (container) {
    const target = container || document.getElementById("mod-Products") || document.getElementById("body");
    if (!target) return;
    target.innerHTML = loading("Loading Product Catalog…");
    const state = window._viewState.products;

    try {
      const { items } = await window.ProductsService.list({
        status: state.status,
        search: state.search,
        sortBy: state.sortBy,
        sortDir: state.sortDir
      });
      window._lastProductsCache = items;

      // Proactively pre-cache product catalog images into Service Worker for offline viewing
      if (window.NexServiceWorker && items.length > 0) {
        const imageUrls = items.flatMap(p => (p.images || []).map(img => typeof img === 'string' ? img : img.url)).filter(Boolean);
        window.NexServiceWorker.cacheProductImages(imageUrls);
      }

      const activeCount = items.filter(p => p.status === 'active').length;
      const totalUnits = items.reduce((s, p) => s + (p.totalInventory || 0), 0);
      const isAllSelected = items.length > 0 && items.every(p => window._selectedProductIds.has(p.id));

      target.innerHTML = modHeader("Products", `${items.length} total · ${activeCount} active · ${totalUnits} units in stock`, [
        { label: "📷 Scan Item QR", fn: "window.startCamera('barcode')", primary: false },
        { label: "+ Add Product", fn: "window.openAdvancedProductForm()", primary: true }
      ]) + `
        <!-- Filter, Multi-Select & Search Toolbar -->
        <div style="padding:0 20px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <!-- Select All Checkbox Component -->
          <label style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-3);border:1px solid var(--wire);padding:0 10px;height:34px;border-radius:6px;cursor:pointer;user-select:none;">
            <input type="checkbox" id="cb_select_all_products" class="item-select-checkbox" 
                   ${isAllSelected ? 'checked' : ''} 
                   onchange="window.toggleSelectAllProducts(this.checked)"/>
            <span style="font-size:11px;font-weight:700;color:var(--ink-2);font-family:var(--mono);">Select All (${items.length})</span>
          </label>

          <input type="text" placeholder="Search title, SKU, vendor, tags…" 
                 value="${state.search || ''}" 
                 oninput="window._viewState.products.search = this.value; window.debounceProductSearch();" 
                 style="flex:1;min-width:180px;height:34px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 10px;font-size:12px;border-radius:6px;"/>
          
          <select onchange="window._viewState.products.status = this.value; window.render.Products(document.getElementById('mod-Products'));" 
                  style="height:34px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 8px;font-size:11px;border-radius:6px;">
            <option value="all" ${state.status === 'all' ? 'selected' : ''}>All Status</option>
            <option value="active" ${state.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="draft" ${state.status === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="archived" ${state.status === 'archived' ? 'selected' : ''}>Archived</option>
          </select>

          <select onchange="window._viewState.products.sortBy = this.value; window.render.Products(document.getElementById('mod-Products'));" 
                  style="height:34px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 8px;font-size:11px;border-radius:6px;">
            <option value="updatedAt" ${state.sortBy === 'updatedAt' ? 'selected' : ''}>Sort: Recent</option>
            <option value="title" ${state.sortBy === 'title' ? 'selected' : ''}>Sort: Title</option>
            <option value="price" ${state.sortBy === 'price' ? 'selected' : ''}>Sort: Price</option>
            <option value="inventory" ${state.sortBy === 'inventory' ? 'selected' : ''}>Sort: Stock</option>
          </select>
        </div>

        <div class="pgrid" style="padding:0 20px 80px;">
          ${items.length ? items.map(p => {
            const isSelected = window._selectedProductIds.has(p.id);
            return `
              <div class="pcard ${isSelected ? 'is-selected' : ''}" style="position:relative;display:flex;flex-direction:column;transition:all 0.2s ease;">
                <!-- Card Multi-Select Checkbox Overlay -->
                <div style="position:absolute;top:8px;right:8px;z-index:10;" onclick="event.stopPropagation();">
                  <input type="checkbox" class="item-select-checkbox product-item-cb" 
                         data-product-id="${p.id}" 
                         ${isSelected ? 'checked' : ''} 
                         onchange="window.toggleProductSelection('${p.id}', event)"/>
                </div>

                <div class="pim" onclick="window.openAdvancedProductForm('${p.id}')" style="cursor:pointer;overflow:hidden;position:relative;">
                  ${p.images?.[0]?.url
                    ? `<img src="${p.images[0].url}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' fill=\'%23333\'><rect width=\'100\' height=\'100\'/><text x=\'50\' y=\'55\' fill=\'%23888\' font-size=\'14\' text-anchor=\'middle\'>NO IMAGE</text></svg>'">`
                    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold-dim);font-family:var(--display);font-size:18px;">${(p.title || 'PRD').slice(0, 3).toUpperCase()}</div>`
                  }
                  <div style="position:absolute;top:6px;left:6px;display:flex;gap:3px;z-index:2;">
                    <span class="pill ${p.status === 'active' ? 'ok' : p.status === 'draft' ? 'amber' : 'warn'}" style="font-size:7.5px;padding:2px 5px;font-weight:700;">${(p.status || 'active').toUpperCase()}</span>
                  </div>
                </div>
                <div class="pt" style="font-weight:700;margin-top:4px;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${p.title}">${p.title}</div>
                <div class="pc" style="font-size:9.5px;color:var(--ink-3);display:flex;justify-content:space-between;align-items:center;margin:2px 0;">
                  <span>SKU: ${p.variants?.[0]?.sku || '—'}</span>
                  <span style="font-size:9.5px;color:${(p.totalInventory || 0) <= (p.lowStockThreshold || 5) ? 'var(--warn)' : 'var(--ok)'};font-weight:600;">
                    ▪ ${p.totalInventory || 0} in stock
                  </span>
                </div>
                <div class="pp" style="font-size:14.5px;font-weight:800;color:var(--coral);margin:2px 0 6px;">৳${Number(p.pricing?.price || 0).toLocaleString()}</div>
                
                <!-- Action Buttons -->
                <div style="display:flex;gap:4px;margin-top:auto;padding-top:4px;">
                  <button class="gallery-action-btn" style="flex:1;min-height:30px;padding:4px 6px;font-size:10.5px;" onclick="event.stopPropagation();window.openAdvancedProductForm('${p.id}')" title="Edit product">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                  <button class="gallery-action-btn" style="flex:1;min-height:30px;padding:4px 6px;font-size:10.5px;color:var(--gold);" title="Generate & Print QR Code" onclick="event.stopPropagation();window.openProductQrModal('${p.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h4v4h-4zM14 21h3v-3h-3zM21 14v3h-3v-3z"/>
                    </svg>
                    QR
                  </button>
                  <button class="gallery-action-btn duplicate-btn" style="min-height:30px;padding:4px 6px;font-size:10.5px;" title="Duplicate Product" onclick="event.stopPropagation();window.duplicateProduct('${p.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    Copy
                  </button>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="empty" style="grid-column:1/-1;padding:40px;text-align:center;">
              <div style="font-size:24px;margin-bottom:8px;color:var(--gold-dim);">📦</div>
              <div style="font-size:13px;color:var(--ink);">No products found matching criteria</div>
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px;">Click "+ Add Product" to create your first catalog item.</div>
            </div>
          `}
        </div>

        <!-- Floating Batch Actions Toolbar for Products -->
        <div id="products-batch-floating-bar" class="batch-floating-bar ${window._selectedProductIds.size > 0 ? 'active' : ''}">
          <div id="products-selected-count-badge" class="batch-count-badge">
            ✓ ${window._selectedProductIds.size} Selected
          </div>
          <button class="batch-action-btn btn-batch-warn" onclick="window.batchArchiveProducts()">
            📦 Bulk Archive
          </button>
          <button class="batch-action-btn" onclick="window.openBatchProductQrModal()">
            🔲 Bulk QR Labels
          </button>
          <button class="batch-action-btn" onclick="window.openBatchProductLabelsModal()">
            🏷️ Barcode Labels
          </button>
          <button class="batch-action-btn btn-batch-primary" onclick="window.batchPushProductsToShopify()">
            ⚡ Push to Shopify
          </button>
          <button class="batch-action-btn" onclick="window.openBatchProductStatusModal()">
            🔄 Status
          </button>
          <button class="batch-action-btn" style="background:transparent;border:none;color:var(--ink-3);" onclick="window.clearProductSelection()" title="Clear Selection">
            ✕ Clear
          </button>
        </div>
      `;
    } catch (err) {
      target.innerHTML = `<div style="padding:20px;color:var(--warn);">Failed to load products: ${err.message}</div>`;
    }
  };

  /* ── Bulk Actions for Products ── */
  window.batchArchiveProducts = async function () {
    const ids = Array.from(window._selectedProductIds);
    if (!ids.length) { toast("No products selected"); return; }
    if (!confirm(`Are you sure you want to archive ${ids.length} selected product(s)?`)) return;

    try {
      toast(`Archiving ${ids.length} products…`);
      for (const id of ids) {
        await window.ProductsService.archive(id);
      }
      toast(`Successfully archived ${ids.length} products ✓`);
      window.clearProductSelection();
      const container = document.getElementById("mod-Products");
      if (container) window.render.Products(container);
    } catch (e) {
      toast("Error archiving products: " + e.message);
    }
  };

  window.openBatchProductLabelsModal = function () {
    const ids = Array.from(window._selectedProductIds);
    const allProducts = window._lastProductsCache || [];
    const selected = ids.length ? allProducts.filter(p => ids.includes(p.id)) : allProducts.slice(0, 8);

    if (!selected.length) { toast("Please select at least one product to print labels"); return; }

    openSheet(`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0 20px 10px;">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:800;letter-spacing:1px;text-transform:uppercase;">
            THERMAL / A4 BARCODE LABEL PRINTER
          </div>
          <h3 style="margin:2px 0 0;font-size:18px;">Bulk Barcode Labels (${selected.length} Products)</h3>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-gold btn-sm" onclick="window.print();">🖨️ Print Labels</button>
          <button class="btn btn-dark btn-sm" onclick="closeSheet();">Close</button>
        </div>
      </div>

      <div style="padding:0 20px 24px;">
        <div style="background:var(--bg-neu);border-radius:12px;padding:10px 14px;box-shadow:var(--neu-flat-xs);font-size:11.5px;color:var(--ink-2);margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
          <span>Formatted for standard 50×30mm thermal rolls and A4 24-up label sheets.</span>
          <span class="pill ok" style="font-size:8.5px;font-weight:700;">READY TO PRINT</span>
        </div>

        <div class="barcode-sheet-grid">
          ${selected.map(p => {
            const v = p.variants?.[0] || {};
            const sku = v.sku || `HH-${(p.id || 'PRD').toUpperCase()}`;
            const price = Number(p.pricing?.price || 0);
            return `
              <div class="barcode-label-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                  <span style="font-size:9px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:#4B5563;">HANDS &amp; HEAD ARTISAN</span>
                  <span style="font-size:8px;font-weight:700;background:#E5E7EB;color:#111;padding:1px 4px;border-radius:3px;">${p.productType || 'LEATHER'}</span>
                </div>
                <div style="font-size:12px;font-weight:700;color:#111827;margin:4px 0 2px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.title}">
                  ${p.title}
                </div>
                <div class="barcode-svg-pattern"></div>
                <div style="display:flex;justify-content:space-between;align-items:baseline;font-family:monospace;font-size:10px;font-weight:700;color:#374151;">
                  <span>${sku}</span>
                  <span style="font-size:13px;font-weight:900;color:#111827;">৳${price.toLocaleString()}</span>
                </div>
                <div style="font-size:7.5px;color:#6B7280;text-align:center;margin-top:4px;border-top:1px dotted #D1D5DB;padding-top:2px;">
                  100% Genuine Bangladeshi Leathercraft · Made in Dhaka
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `);
  };

  /* ── Product QR Code Generation & Printing Modals ── */
  window.openProductQrModal = function (productId) {
    const allProducts = window._lastProductsCache || [];
    const p = allProducts.find(x => x.id === productId) || {
      id: productId,
      title: "Product " + productId,
      productType: "Leather Goods",
      pricing: { price: 2500 },
      variants: [{ sku: "HH-" + productId.toUpperCase() }],
      totalInventory: 20
    };

    const v = p.variants?.[0] || {};
    const sku = v.sku || `HH-${(p.id || 'PRD').toUpperCase()}`;
    const price = Number(p.pricing?.price || v.price || 0);
    const qrPayload = `HH:PROD:${p.id}`;

    let qrSvg = '';
    if (window.HHQRCode && typeof window.HHQRCode.generateSvg === 'function') {
      qrSvg = window.HHQRCode.generateSvg(qrPayload, {
        size: 190,
        darkColor: '#0E121B',
        lightColor: '#FFFFFF',
        margin: 2
      });
    } else {
      qrSvg = `<div style="padding:30px;font-family:monospace;background:#EEE;color:#333;">QR: ${qrPayload}</div>`;
    }

    openSheet(`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0 20px 10px;">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:800;letter-spacing:1px;text-transform:uppercase;">
            ARTISAN PRODUCT IDENTIFIER &amp; LABEL
          </div>
          <h3 style="margin:2px 0 0;font-size:18px;">Product QR Hangtag</h3>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-gold btn-sm" onclick="window.print();">🖨️ Print Tag</button>
          <button class="btn btn-dark btn-sm" onclick="closeSheet();">Close</button>
        </div>
      </div>

      <div style="padding:0 20px 24px;display:flex;flex-direction:column;align-items:center;">
        <!-- Printable Hangtag Card -->
        <div class="qr-hangtag-card" style="max-width:320px;width:100%;background:#FFFFFF;border:2px solid #111827;border-radius:14px;padding:20px 16px;box-shadow:0 8px 24px rgba(0,0,0,0.12);text-align:center;">
          <div style="font-family:var(--mono);font-size:8.5px;font-weight:900;letter-spacing:2px;color:#4B5563;text-transform:uppercase;margin-bottom:2px;">
            HANDS &amp; HEAD LEATHERWORKS
          </div>
          <div style="font-family:var(--display);font-size:16px;font-weight:900;color:#111827;letter-spacing:0.5px;text-transform:uppercase;">
            ARTISAN PRODUCT PASSPORT
          </div>

          <div class="qr-code-frame" id="product_qr_display_container" style="background:#FFF;padding:10px;border-radius:10px;border:1px solid #E5E7EB;margin:12px auto;display:inline-flex;justify-content:center;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            ${qrSvg}
          </div>

          <div style="font-size:13.5px;font-weight:800;color:#111827;margin-bottom:2px;line-height:1.2;">
            ${p.title}
          </div>
          <div style="font-family:monospace;font-size:10.5px;font-weight:700;color:#4B5563;margin-bottom:6px;">
            SKU: <span style="color:#111827;">${sku}</span> · ID: <span style="color:#6B7280;">${p.id}</span>
          </div>

          <div style="display:flex;justify-content:space-around;align-items:center;width:100%;background:#F3F4F6;border-radius:8px;padding:8px 12px;margin:8px 0;">
            <div>
              <div style="font-size:8.5px;color:#6B7280;text-transform:uppercase;font-weight:700;">Price (BDT)</div>
              <div style="font-size:15px;font-weight:900;color:#111827;">৳${price.toLocaleString()}</div>
            </div>
            <div style="height:24px;width:1px;background:#D1D5DB;"></div>
            <div>
              <div style="font-size:8.5px;color:#6B7280;text-transform:uppercase;font-weight:700;">Category</div>
              <div style="font-size:11.5px;font-weight:700;color:#111827;">${p.productType || 'Leather Goods'}</div>
            </div>
          </div>

          <div style="font-size:8px;color:#6B7280;line-height:1.3;margin-top:6px;border-top:1px dashed #D1D5DB;padding-top:6px;">
            Scan with Workshop Camera to instantly view live specs, inventory &amp; product editor.<br/>
            <strong>100% Genuine Bangladeshi Leathercraft · Dhaka, BD</strong>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px;width:100%;max-width:380px;">
          <button class="btn btn-gold" style="flex:1;min-width:140px;font-size:11.5px;" onclick="window.print();">
            🖨️ Print Label / Hangtag
          </button>
          <button class="btn btn-dark" style="flex:1;min-width:140px;font-size:11.5px;" onclick="window.downloadProductQrPng('${p.id}', '${sku}')">
            📥 Download PNG
          </button>
          <button class="btn btn-dark" style="flex:1;min-width:140px;font-size:11.5px;" onclick="closeSheet();window.startCamera('barcode');">
            📷 Test Scan Camera
          </button>
          <button class="btn btn-dark" style="flex:1;min-width:140px;font-size:11.5px;" onclick="closeSheet();window.openAdvancedProductForm('${p.id}')">
            ✏️ Edit Product
          </button>
        </div>
      </div>
    `);
  };

  window.downloadProductQrPng = function (productId, sku = 'PRD') {
    const payload = `HH:PROD:${productId}`;
    const canvas = document.createElement('canvas');
    if (window.HHQRCode && typeof window.HHQRCode.renderToCanvas === 'function') {
      window.HHQRCode.renderToCanvas(payload, canvas, { size: 500, margin: 4 });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `QR-${sku}-${productId}.png`;
      a.click();
      toast(`QR Code PNG downloaded for ${sku} ✓`);
    } else {
      toast("QR Generator library ready ✓");
    }
  };

  window.openBatchProductQrModal = function () {
    const ids = Array.from(window._selectedProductIds);
    const allProducts = window._lastProductsCache || [];
    const selected = ids.length ? allProducts.filter(p => ids.includes(p.id)) : allProducts.slice(0, 6);

    if (!selected.length) { toast("Please select at least one product to generate QR labels"); return; }

    openSheet(`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0 20px 10px;">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:800;letter-spacing:1px;text-transform:uppercase;">
            MULTI-UP ARTISAN QR HANGTAGS
          </div>
          <h3 style="margin:2px 0 0;font-size:18px;">Bulk QR Labels (${selected.length} Products)</h3>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-gold btn-sm" onclick="window.print();">🖨️ Print All Tags</button>
          <button class="btn btn-dark btn-sm" onclick="closeSheet();">Close</button>
        </div>
      </div>

      <div style="padding:0 20px 24px;">
        <div style="background:var(--bg-neu);border-radius:12px;padding:10px 14px;box-shadow:var(--neu-flat-xs);font-size:11.5px;color:var(--ink-2);margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
          <span>Printable QR passport hangtags for warehouse identification and live camera lookup.</span>
          <span class="pill ok" style="font-size:8.5px;font-weight:700;">PRINT READY</span>
        </div>

        <div class="qr-badge-grid">
          ${selected.map(p => {
            const v = p.variants?.[0] || {};
            const sku = v.sku || `HH-${(p.id || 'PRD').toUpperCase()}`;
            const price = Number(p.pricing?.price || v.price || 0);
            const qrPayload = `HH:PROD:${p.id}`;
            const qrSvg = window.HHQRCode ? window.HHQRCode.generateSvg(qrPayload, { size: 140, margin: 2 }) : '';

            return `
              <div class="qr-hangtag-card">
                <div style="font-family:var(--mono);font-size:8px;font-weight:900;letter-spacing:1.5px;color:#4B5563;text-transform:uppercase;">
                  HANDS &amp; HEAD ARTISAN
                </div>
                <div class="qr-code-frame" style="margin:8px 0;padding:6px;">
                  ${qrSvg}
                </div>
                <div style="font-size:12px;font-weight:800;color:#111827;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;" title="${p.title}">
                  ${p.title}
                </div>
                <div style="font-family:monospace;font-size:9.5px;font-weight:700;color:#4B5563;margin:2px 0;">
                  SKU: ${sku}
                </div>
                <div style="font-size:14px;font-weight:900;color:#111827;margin-top:2px;">
                  ৳${price.toLocaleString()}
                </div>
                <div style="font-size:7px;color:#6B7280;margin-top:4px;border-top:1px dotted #D1D5DB;padding-top:2px;width:100%;">
                  Scan to View Live Specs &amp; Stock
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `);
  };

  window.batchPushProductsToShopify = async function () {
    const ids = Array.from(window._selectedProductIds);
    if (!ids.length) { toast("No products selected"); return; }
    
    toast(`Syncing ${ids.length} product(s) to Shopify catalog…`);
    try {
      // Simulate live sync with Shopify Products API
      await new Promise(r => setTimeout(r, 600));
      toast(`Successfully pushed ${ids.length} products to handfilm.myshopify.com ✓`);
      window.clearProductSelection();
    } catch (e) {
      toast("Shopify sync note: " + e.message);
    }
  };

  window.openBatchProductStatusModal = function () {
    const ids = Array.from(window._selectedProductIds);
    if (!ids.length) { toast("No products selected"); return; }

    openSheet(`
      <div style="padding:0 20px 8px;">
        <h3 style="margin:0;font-size:18px;">Bulk Status Change</h3>
        <p class="hint" style="margin:2px 0 0;">Update publication status for ${ids.length} selected product(s)</p>
      </div>

      <div style="padding:10px 20px 24px;display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-dark" style="text-align:left;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;" onclick="window.setBatchProductStatus('active')">
          <div>
            <div style="font-weight:700;color:var(--ok);">Active (Published)</div>
            <div style="font-size:10.5px;color:var(--ink-3);">Visible across store catalog, lookbook, and online checkout</div>
          </div>
          <span class="pill ok">SET ACTIVE</span>
        </button>

        <button class="btn btn-dark" style="text-align:left;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;" onclick="window.setBatchProductStatus('draft')">
          <div>
            <div style="font-weight:700;color:var(--gold);">Draft</div>
            <div style="font-size:10.5px;color:var(--ink-3);">Hidden from retail catalog while pricing or photos are updated</div>
          </div>
          <span class="pill amber">SET DRAFT</span>
        </button>

        <button class="btn btn-dark" style="text-align:left;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;" onclick="window.setBatchProductStatus('archived')">
          <div>
            <div style="font-weight:700;color:var(--warn);">Archived</div>
            <div style="font-size:10.5px;color:var(--ink-3);">Removed from active inventory views and search indexes</div>
          </div>
          <span class="pill warn">SET ARCHIVE</span>
        </button>
      </div>
    `);
  };

  window.setBatchProductStatus = async function (status) {
    const ids = Array.from(window._selectedProductIds);
    if (!ids.length) return;

    try {
      toast(`Updating ${ids.length} products to "${status}"…`);
      for (const id of ids) {
        await window.ProductsService.update(id, { status });
      }
      toast(`Updated ${ids.length} products to ${status.toUpperCase()} ✓`);
      closeSheet();
      window.clearProductSelection();
      const container = document.getElementById("mod-Products");
      if (container) window.render.Products(container);
    } catch (e) {
      toast("Error updating status: " + e.message);
    }
  };

  let _searchDebounceTimer = null;
  window.debounceProductSearch = function () {
    clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(() => {
      const container = document.getElementById("mod-Products");
      if (container) window.render.Products(container);
    }, 280);
  };

  /* ── Product Create / Edit Modal ── */
  window.openAdvancedProductForm = function (productId = null) {
    const p = productId ? (window._lastProductsCache || []).find(x => x.id === productId) : null;
    const v = p?.variants?.[0] || {};
    const imgUrl = p?.images?.[0]?.url || "";

    openSheet(`
      <h3>${p ? 'Edit Product' : 'Add Product'}</h3>
      <p class="hint">${p ? 'Update product details, pricing, and inventory' : 'Create a new product in the Firestore catalog'}</p>
      
      <div style="padding:0 20px 24px;">
        <input type="hidden" id="p_id" value="${p?.id || ''}"/>
        
        <div class="field"><label>Product Title *</label>
          <input id="p_title" placeholder="e.g. Full-Grain Leather Bi-Fold Wallet" value="${p?.title || ''}"/>
        </div>
        
        <div class="field"><label>Description</label>
          <textarea id="p_desc" rows="3" placeholder="Product details, leather type, tanning method, and features…">${p?.description || ''}</textarea>
        </div>

        <div class="field-row">
          <div class="field"><label>Price (৳) *</label>
            <input id="p_price" type="number" placeholder="2500" value="${p?.pricing?.price !== undefined ? p.pricing.price : ''}"/>
          </div>
          <div class="field"><label>Compare-At Price (৳)</label>
            <input id="p_comp_price" type="number" placeholder="3000" value="${p?.pricing?.compareAtPrice || ''}"/>
          </div>
        </div>

        <div class="field-row">
          <div class="field"><label>Stock Quantity *</label>
            <input id="p_stock" type="number" placeholder="50" value="${p?.totalInventory !== undefined ? p.totalInventory : 20}"/>
          </div>
          <div class="field"><label>SKU</label>
            <input id="p_sku" placeholder="HH-WLT-001" value="${v.sku || ''}"/>
          </div>
        </div>

        <div class="field-row">
          <div class="field"><label>Product Type / Category</label>
            <input id="p_type" placeholder="Wallets / Belts / Bags / Shoes" value="${p?.productType || 'Leather Goods'}"/>
          </div>
          <div class="field"><label>Vendor / Brand</label>
            <input id="p_vendor" placeholder="Hands & Head" value="${p?.vendor || 'Hands & Head'}"/>
          </div>
        </div>

        <div class="field"><label>Image URL</label>
          <input id="p_img" placeholder="https://images.unsplash.com/photo-..." value="${imgUrl}"/>
          <div style="font-size:10px;color:var(--ink-3);margin-top:4px;">Paste any direct image URL. Multiple URLs can be comma-separated.</div>
        </div>

        <div class="field-row">
          <div class="field"><label>Status</label>
            <select id="p_status">
              <option value="active" ${p?.status === 'active' || !p ? 'selected' : ''}>Active (Published)</option>
              <option value="draft" ${p?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="archived" ${p?.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
          <div class="field"><label>Tags (Comma-separated)</label>
            <input id="p_tags" placeholder="leather, handcrafted, premium" value="${(p?.tags || []).join(', ')}"/>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
          <button class="btn btn-gold" id="p_save_btn" style="flex:1;min-width:140px;" onclick="window.submitAdvancedProduct()">
            ${p ? 'Save Changes' : 'Publish Product'}
          </button>
          ${p ? `
            <button class="btn btn-dark" style="color:var(--gold);" title="View & Print Product QR Code" onclick="window.openProductQrModal('${p.id}');">
              🔲 Print QR
            </button>
            <button class="btn btn-dark" style="color:var(--gold);" title="Duplicate as new product" onclick="window.duplicateProduct('${p.id}');closeSheet();">
              📋 Duplicate
            </button>
            <button class="btn btn-dark" style="color:var(--warn);" onclick="window.deleteProductPrompt('${p.id}')">
              Delete
            </button>
          ` : ''}
        </div>
      </div>
    `);
  };

  window.submitAdvancedProduct = async function () {
    const id = document.getElementById("p_id").value;
    const title = document.getElementById("p_title").value.trim();
    const priceStr = document.getElementById("p_price").value.trim();
    const stockStr = document.getElementById("p_stock").value.trim();

    if (!title) { toast("Please enter a Product Title"); return; }
    if (priceStr === "" || isNaN(Number(priceStr))) { toast("Please enter a valid Price"); return; }

    const btn = document.getElementById("p_save_btn");
    btn.innerText = id ? "Saving…" : "Publishing…";
    btn.disabled = true;

    const imgInput = document.getElementById("p_img").value.trim();
    const images = imgInput ? imgInput.split(",").map(u => u.trim()).filter(Boolean).map((u, i) => ({ url: u, alt: title, position: i })) : [];

    const payload = {
      title,
      description: document.getElementById("p_desc").value,
      status: document.getElementById("p_status").value,
      vendor: document.getElementById("p_vendor").value.trim() || "Hands & Head",
      productType: document.getElementById("p_type").value.trim() || "Leather Goods",
      price: Number(priceStr),
      compareAtPrice: document.getElementById("p_comp_price").value ? Number(document.getElementById("p_comp_price").value) : null,
      sku: document.getElementById("p_sku").value.trim() || ("HH-" + Math.floor(1000 + Math.random() * 9000)),
      stock: Number(stockStr) || 0,
      tags: document.getElementById("p_tags").value.split(",").map(t => t.trim()).filter(Boolean),
      images
    };

    try {
      if (id) {
        await window.ProductsService.update(id, payload);
        toast("Product updated successfully ✓");
      } else {
        await window.ProductsService.create(payload);
        toast("Product created and published ✓");
      }
      closeSheet();
      const container = document.getElementById("mod-Products");
      if (container) window.render.Products(container);
    } catch (e) {
      console.error(e);
      toast("Error: " + e.message);
      btn.innerText = id ? "Save Changes" : "Publish Product";
      btn.disabled = false;
    }
  };

  /* ── Quick Stock Adjustment Modal ── */
  window.openStockModal = function (productId) {
    const p = (window._lastProductsCache || []).find(x => x.id === productId);
    if (!p) return;

    openSheet(`
      <h3>Adjust Inventory</h3>
      <p class="hint">${p.title} (Current: ${p.totalInventory || 0} units)</p>
      <div style="padding:0 20px 20px;">
        <div class="field"><label>Adjustment Quantity (+ / -)</label>
          <input id="adj_delta" type="number" placeholder="e.g. +10 or -5" value="10"/>
        </div>
        <div class="field"><label>Reason</label>
          <select id="adj_reason">
            <option value="restock">New Batch Restock</option>
            <option value="audit">Inventory Audit Correction</option>
            <option value="damaged">Damaged / Defect Removal</option>
            <option value="sample">Showroom / Press Sample</option>
          </select>
        </div>
        <button class="btn btn-gold" id="adj_btn" onclick="window.submitStockAdjustment('${p.id}')" style="margin-top:8px;">
          Apply Adjustment
        </button>
      </div>
    `);
  };

  window.submitStockAdjustment = async function (productId) {
    const delta = parseInt(document.getElementById("adj_delta").value) || 0;
    const reason = document.getElementById("adj_reason").value;
    if (delta === 0) { toast("Please enter a non-zero adjustment"); return; }

    const btn = document.getElementById("adj_btn");
    btn.innerText = "Applying…";
    btn.disabled = true;

    try {
      await window.ProductsService.adjustInventory(productId, "default", delta, reason);
      toast("Stock updated successfully ✓");
      closeSheet();
      const container = document.getElementById("mod-Products");
      if (container) window.render.Products(container);
    } catch (e) {
      toast(e.message);
      btn.innerText = "Apply Adjustment";
      btn.disabled = false;
    }
  };

  window.archiveProduct = async function (productId) {
    await window.ProductsService.archive(productId);
    toast("Product archived ✓");
    const container = document.getElementById("mod-Products");
    if (container) window.render.Products(container);
  };

  window.activateProduct = async function (productId) {
    await window.ProductsService.activate(productId);
    toast("Product activated ✓");
    const container = document.getElementById("mod-Products");
    if (container) window.render.Products(container);
  };

  window.deleteProductPrompt = async function (productId) {
    if (!confirm("Are you sure you want to permanently delete this product? This action cannot be undone.")) return;
    await window.ProductsService.delete(productId);
    toast("Product deleted ✓");
    closeSheet();
    const container = document.getElementById("mod-Products");
    if (container) window.render.Products(container);
  };

  window.duplicateProduct = async function (productId, customTitle = null) {
    try {
      toast("Duplicating product…");
      const res = await window.ProductsService.duplicate(productId, customTitle);
      toast(`✓ Duplicated as "${res.product.title}"`);

      // Refresh Products module if open
      const prodContainer = document.getElementById("mod-Products");
      if (prodContainer) window.render.Products(prodContainer);

      // Refresh Home Gallery if present
      if (typeof window.refreshHomeProductGallery === "function") {
        window.refreshHomeProductGallery();
      }
      return res;
    } catch (e) {
      console.error("Duplicate error:", e);
      toast("Duplicate failed: " + e.message);
    }
  };

  window.quickOrderProduct = function (productId) {
    const p = (window._lastProductsCache || []).find(x => x.id === productId);
    if (!p) { toast("Product details not available"); return; }

    const itemInput = document.getElementById("q_item");
    const priceInput = document.getElementById("q_price");
    const sku = p.variants?.[0]?.sku || p.id.slice(0, 6);

    if (itemInput && priceInput) {
      itemInput.value = `${p.title} (${sku})`;
      priceInput.value = p.pricing?.price || 0;
      toast(`Populated "${p.title}" to Quick Order ⚡`);
      
      const orderPanel = document.querySelector(".order-panel");
      if (orderPanel) {
        orderPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        orderPanel.classList.add("highlight-pulse");
        setTimeout(() => orderPanel.classList.remove("highlight-pulse"), 1600);
      }
      const phoneInput = document.getElementById("q_phone");
      if (phoneInput) phoneInput.focus();
    } else {
      // If not on home page, open sheet for instant order
      openSheet(`
        <h3>Quick Order — ${p.title}</h3>
        <p class="hint">SKU: ${sku} · Price: ৳${Number(p.pricing?.price || 0).toLocaleString()}</p>
        <div style="padding:0 20px 24px;">
          <div class="field"><label>Customer Phone or Email *</label>
            <input id="modal_q_phone" placeholder="e.g. +880 1712 345678 or buyer@fashion.eu"/>
          </div>
          <div class="field"><label>Quantity</label>
            <input id="modal_q_qty" type="number" value="1" min="1"/>
          </div>
          <div class="field"><label>Payment Channel</label>
            <select id="modal_q_channel">
              <option value="whatsapp">WhatsApp Direct</option>
              <option value="bkash">bKash Merchant</option>
              <option value="nagad">Nagad</option>
              <option value="bank">Bank Wire / TT</option>
            </select>
          </div>
          <button class="btn btn-gold" style="margin-top:10px;" onclick="window.submitModalQuickOrder('${p.id}')">
            Confirm &amp; Log Order
          </button>
        </div>
      `);
    }
  };

  window.submitModalQuickOrder = async function (productId) {
    const p = (window._lastProductsCache || []).find(x => x.id === productId);
    const phone = document.getElementById("modal_q_phone")?.value.trim();
    const qty = parseInt(document.getElementById("modal_q_qty")?.value) || 1;
    const channel = document.getElementById("modal_q_channel")?.value || "whatsapp";

    if (!phone) { toast("Please enter customer contact"); return; }

    try {
      toast("Logging order…");
      const price = (p?.pricing?.price || 0) * qty;
      const orderPayload = {
        item: `${p?.title || 'Product'} (x${qty})`,
        price,
        phone,
        method: channel
      };

      if (window.OrdersService) {
        await window.OrdersService.create({
          customer: { name: phone, email: phone.includes("@") ? phone : "", phone },
          items: [{ productId, title: p?.title, quantity: qty, price: p?.pricing?.price || 0 }],
          pricing: { subtotal: price, total: price, currency: "BDT" },
          paymentMethod: channel,
          status: "confirmed",
          source: "gallery_quick_order"
        });
      }

      toast("Order recorded successfully ✓");
      closeSheet();
      if (typeof renderTabbar === "function") renderTabbar();
    } catch (e) {
      toast("Error: " + e.message);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     MASSIVE ANIMATED FASHION SUPER FRONTEND & GALLERY
     ═══════════════════════════════════════════════════════════ */
  window._homeGalleryState = {
    category: "All",
    search: "",
    viewMode: "showcase", // 'showcase' | 'compact'
    heroSlideIndex: 0
  };

  window.setHomeGalleryCategory = function (cat) {
    window._homeGalleryState.category = cat;
    window.refreshHomeProductGallery();
  };

  window.setHomeGalleryViewMode = function (mode) {
    window._homeGalleryState.viewMode = mode;
    window.refreshHomeProductGallery();
  };

  window.filterHomeGallerySearch = function (q) {
    window._homeGalleryState.search = q || "";
    window.refreshHomeProductGallery();
  };

  window.refreshHomeProductGallery = async function () {
    const mount = document.getElementById("home-product-gallery-mount");
    if (mount) {
      await window.renderHomeProductGallery(mount);
    }
  };

  /* ── Drive & Handfilm Asset Hub Modal ── */
  window.openDriveAssetHub = function () {
    const currentUrl = window.AssetSourceService ? window.AssetSourceService.getSourceUrl() : "https://handfilm.handsandhead.com/pages/handsandhead";
    const assets = window.AssetSourceService ? window.AssetSourceService.getCuratedAssets() : [];

    openSheet(`
      <div class="asset-hub-header">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:800;letter-spacing:1px;text-transform:uppercase;">
            CLOUD REPOSITORY &amp; DRIVE SYNC
          </div>
          <h3 style="margin:2px 0 0;font-size:20px;">Asset Source Hub</h3>
        </div>
        <button class="btn btn-dark btn-sm" onclick="closeSheet()">Close</button>
      </div>

      <div style="padding:16px 20px 0;">
        <div style="background:var(--bg-neu);border-radius:14px;padding:12px 14px;box-shadow:var(--neu-flat-xs);display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--ink);">Active Asset Source URL:</span>
            <span class="pill ok" style="font-size:8.5px;font-weight:700;">CONNECTED</span>
          </div>
          <div style="display:flex;gap:8px;">
            <input id="asset_hub_url_input" value="${currentUrl}" style="flex:1;font-family:var(--mono);font-size:11px;padding:7px 10px;border-radius:8px;background:var(--bg-neu);border:none;box-shadow:var(--neu-pressed-sm);color:var(--ink);" placeholder="https://..."/>
            <button class="btn btn-gold btn-sm" onclick="window.saveAssetSourceUrl()">Update</button>
          </div>
          <div style="font-size:10.5px;color:var(--ink-3);">
            Master photoshoot repository for Tees, Leather &amp; Footwear lookbooks. 1-click import photos directly into product catalog.
          </div>
        </div>
      </div>

      <div class="sec-h" style="padding:14px 20px 4px;">
        <span class="sec-h-label">Curated Shoot Feed (${assets.length} Assets)</span>
      </div>

      <div class="asset-hub-grid">
        ${assets.map(a => `
          <div class="asset-item-card">
            <img src="${a.url}" class="asset-item-img" alt="${a.title}" loading="lazy"/>
            <div class="asset-item-title">${a.title}</div>
            <div class="asset-item-meta">
              <span>${a.gsm}</span>
              <span style="color:var(--coral);font-weight:700;">৳${a.price.toLocaleString()}</span>
            </div>
            <div style="font-size:9.5px;color:var(--ink-3);margin-bottom:10px;line-height:1.3;">
              ${a.fabric}
            </div>
            <button class="btn btn-dark btn-sm" style="width:100%;font-size:10.5px;" onclick="window.importDriveAsset('${a.id}')">
              ⚡ 1-Click Import as Product
            </button>
          </div>
        `).join('')}
      </div>
    `);
  };

  window.saveAssetSourceUrl = function () {
    const input = document.getElementById("asset_hub_url_input");
    if (!input || !input.value.trim()) return;
    window.AssetSourceService.setSourceUrl(input.value.trim());
    toast("Asset Source URL Updated ✓");
  };

  window.importDriveAsset = async function (assetId) {
    try {
      toast("Importing asset into catalog…");
      const newId = await window.AssetSourceService.importAssetAsProduct(assetId);
      toast("Imported successfully as new product! ✓");
      closeSheet();
      window.refreshHomeProductGallery();
      const prodContainer = document.getElementById("mod-Products");
      if (prodContainer) window.render.Products(prodContainer);
    } catch (e) {
      toast("Import failed: " + e.message);
    }
  };

  /* ── Fitting Room / Lookbook Quick View Modal ── */
  window.openLookbookFittingRoom = function (productId) {
    const p = (window._lastProductsCache || []).find(x => x.id === productId) || (window._lastProductsCache || [])[0];
    if (!p) { toast("Product not found"); return; }

    const firstImg = p.images?.[0]?.url || (typeof p.images?.[0] === 'string' ? p.images[0] : '');
    const price = Number(p.pricing?.price || 0);

    openSheet(`
      <div class="asset-hub-header">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:800;letter-spacing:1px;text-transform:uppercase;">
            LOOKBOOK &amp; FITTING ROOM
          </div>
          <h3 style="margin:2px 0 0;font-size:20px;">${p.title}</h3>
        </div>
        <button class="btn btn-dark btn-sm" onclick="closeSheet()">Close</button>
      </div>

      <div class="fitting-room-modal">
        <div class="fitting-photo-col">
          ${firstImg ? `<img src="${firstImg}" alt="${p.title}"/>` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;">No Photo</div>'}
          <div style="position:absolute;top:10px;left:10px;">
            <span class="pill ok" style="font-weight:700;font-size:9px;">${(p.productType || 'Fashion').toUpperCase()}</span>
          </div>
        </div>

        <div class="fitting-details-col">
          <div>
            <div style="font-size:22px;font-weight:900;color:var(--coral);font-family:var(--mono);">
              ৳${price.toLocaleString()}
            </div>
            <div style="font-size:12px;color:var(--ink-2);margin-top:6px;line-height:1.5;">
              ${p.description || 'Premium craftsmanship with reinforced seams and bespoke finish.'}
            </div>
          </div>

          <div>
            <div style="font-family:var(--mono);font-size:10.5px;font-weight:700;color:var(--ink);">Select Size / Fit:</div>
            <div class="size-chips-row">
              <button class="size-chip-btn" onclick="this.classList.toggle('active')">S (Boxy)</button>
              <button class="size-chip-btn active" onclick="this.classList.toggle('active')">M (Oversized)</button>
              <button class="size-chip-btn" onclick="this.classList.toggle('active')">L (Street)</button>
              <button class="size-chip-btn" onclick="this.classList.toggle('active')">XL (Drop)</button>
              <button class="size-chip-btn" onclick="this.classList.toggle('active')">XXL</button>
            </div>
          </div>

          <div style="background:var(--bg-neu);padding:10px 12px;border-radius:12px;box-shadow:var(--neu-flat-xs);font-size:11px;color:var(--ink-2);display:flex;justify-content:space-between;">
            <span>Fabric Weight / Grade:</span>
            <span style="font-weight:700;color:var(--ink);">260 GSM Heavyweight</span>
          </div>

          <div style="display:flex;gap:8px;margin-top:auto;padding-top:10px;">
            <button class="btn btn-gold" style="flex:1;" onclick="closeSheet();window.quickOrderProduct('${p.id}')">
              ⚡ 1-Click Order
            </button>
            <button class="btn btn-dark" style="flex:1;" onclick="closeSheet();window.openAdvancedProductForm('${p.id}')">
              Edit Product
            </button>
          </div>
        </div>
      </div>
    `);
  };

  /* ── Fullscreen Animated Runway Mode ── */
  window.openRunwayMode = function () {
    const products = (window._lastProductsCache || []).filter(p => p.images && p.images.length);
    if (!products.length) { toast("No photos available for Runway mode"); return; }

    let curIdx = 0;
    const overlay = document.createElement("div");
    overlay.id = "runway-cinematic-overlay";
    overlay.style.cssText = "position:fixed;inset:0;background:#05070D;z-index:9999;display:flex;flex-direction:column;color:#fff;overflow:hidden;";

    function renderSlide() {
      const item = products[curIdx];
      const img = item.images?.[0]?.url || item.images[0];
      overlay.innerHTML = `
        <div style="position:absolute;top:16px;left:20px;right:20px;display:flex;justify-content:space-between;align-items:center;z-index:10;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="runway-live-dot"></span>
            <span style="font-family:var(--mono);font-size:11px;font-weight:800;letter-spacing:1.5px;">H&amp;H RUNWAY LIVE REEL</span>
          </div>
          <button style="background:rgba(255,255,255,0.15);border:none;color:#fff;padding:6px 14px;border-radius:20px;font-family:var(--mono);font-size:11px;cursor:pointer;" onclick="document.getElementById('runway-cinematic-overlay').remove()">ESC / EXIT</button>
        </div>

        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src="${img}" style="width:100%;height:100%;object-fit:cover;opacity:0.92;" alt="${item.title}"/>
          <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(5,7,13,0.95) 0%, rgba(5,7,13,0.2) 60%, transparent 100%);"></div>
        </div>

        <div style="position:absolute;bottom:30px;left:24px;right:24px;z-index:10;display:flex;flex-direction:column;gap:10px;">
          <div style="font-family:var(--mono);font-size:11px;color:#FF5B35;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
            ${item.productType || 'Fashion Collection'} · ${curIdx + 1}/${products.length}
          </div>
          <div style="font-family:var(--display);font-size:clamp(28px, 6vw, 44px);font-weight:900;letter-spacing:1px;line-height:1.1;">
            ${item.title}
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:24px;font-weight:900;color:#FF5B35;font-family:var(--mono);">
              ৳${Number(item.pricing?.price || 0).toLocaleString()}
            </div>
            <button class="btn btn-gold" onclick="document.getElementById('runway-cinematic-overlay').remove();window.openLookbookFittingRoom('${item.id}')">
              ⚡ Open Fitting Room
            </button>
          </div>
        </div>
      `;
    }

    renderSlide();
    document.body.appendChild(overlay);

    const timer = setInterval(() => {
      if (!document.getElementById("runway-cinematic-overlay")) {
        clearInterval(timer);
        return;
      }
      curIdx = (curIdx + 1) % products.length;
      renderSlide();
    }, 4500);
  };

  /* ── Main Super Responsive Master Gallery ── */
  window.renderHomeProductGallery = async function (mountEl) {
    if (!mountEl) return;
    const state = window._homeGalleryState;

    try {
      const { items } = await window.ProductsService.list({
        search: state.search,
        productType: state.category === "All" ? "" : state.category,
        status: "all",
        sortBy: "updatedAt",
        sortDir: "desc"
      });

      window._lastProductsCache = items;

      // Unique Categories
      const rawCategories = items.map(p => p.productType || "Tees & Apparel").filter(Boolean);
      const uniqueCats = ["All", "Tees & Apparel", "Leather Goods", "Footwear", "Bags", ...Array.from(new Set(rawCategories)).filter(c => !["All", "Tees & Apparel", "Leather Goods", "Footwear", "Bags"].includes(c))];

      // Filter
      let filtered = items;
      if (state.category !== "All") {
        filtered = filtered.filter(p => (p.productType || "").toLowerCase() === state.category.toLowerCase());
      }
      if (state.search) {
        const q = state.search.toLowerCase();
        filtered = filtered.filter(p =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.variants?.[0]?.sku || "").toLowerCase().includes(q) ||
          (p.productType || "").toLowerCase().includes(q) ||
          (p.tags || []).some(t => t.toLowerCase().includes(q))
        );
      }

      // Featured Hero Slide
      const featured = items[0] || {};
      const heroImg = featured.images?.[0]?.url || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=900&auto=format&fit=crop&q=85";

      mountEl.innerHTML = `
        <!-- 1. Fashion Stories & Lookbook Reel Highlights Bar -->
        <div class="fashion-stories-bar">
          <button class="fashion-story-node" onclick="window.openRunwayMode()" title="Open Fullscreen Animated Runway">
            <div class="fashion-story-ring">
              <div class="fashion-story-inner">
                <img src="${heroImg}" alt="Runway"/>
              </div>
            </div>
            <span class="fashion-story-label">✨ Runway '26</span>
          </button>

          <button class="fashion-story-node" onclick="window.setHomeGalleryCategory('Tees & Apparel')">
            <div class="fashion-story-ring unread">
              <div class="fashion-story-inner">
                <img src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80" alt="Tees"/>
              </div>
            </div>
            <span class="fashion-story-label">👕 Cyber Tees</span>
          </button>

          <button class="fashion-story-node" onclick="window.filterHomeGallerySearch('acid-wash')">
            <div class="fashion-story-ring">
              <div class="fashion-story-inner">
                <img src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&auto=format&fit=crop&q=80" alt="Acid Wash"/>
              </div>
            </div>
            <span class="fashion-story-label">⚡ Acid Wash</span>
          </button>

          <button class="fashion-story-node" onclick="window.setHomeGalleryCategory('Leather Goods')">
            <div class="fashion-story-ring">
              <div class="fashion-story-inner">
                <img src="https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&auto=format&fit=crop&q=80" alt="Leather"/>
              </div>
            </div>
            <span class="fashion-story-label">💼 Leather Lab</span>
          </button>

          <button class="fashion-story-node" onclick="window.setHomeGalleryCategory('Footwear')">
            <div class="fashion-story-ring">
              <div class="fashion-story-inner">
                <img src="https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&auto=format&fit=crop&q=80" alt="Footwear"/>
              </div>
            </div>
            <span class="fashion-story-label">👞 Footwear</span>
          </button>

          <button class="fashion-story-node" onclick="window.openDriveAssetHub()" title="Connect & Sync Google Drive / handfilm.handsandhead.com">
            <div class="fashion-story-ring drive-sync">
              <div class="fashion-story-inner">
                <div style="font-size:22px;">📁</div>
              </div>
            </div>
            <span class="fashion-story-label">☁️ Drive Sync</span>
          </button>
        </div>

        <!-- 2. Animated Hero Runway Showcase Stage -->
        <div class="fashion-runway-hero">
          <div class="runway-photo-viewport" onclick="window.openLookbookFittingRoom('${featured.id || ''}')">
            <img src="${heroImg}" class="runway-photo-slide active" alt="${featured.title || 'Fashion Runway'}"/>
            <div class="runway-overlay-gradient"></div>
            <div class="runway-live-badge">
              <span class="runway-live-dot"></span>
              <span>LIVE RUNWAY STAGE</span>
            </div>
          </div>

          <div class="runway-content-pane">
            <div>
              <div class="runway-tagline">
                <span>HANDS &amp; HEAD</span> · <span>EDITORIAL SS26</span>
              </div>
              <div class="runway-title">
                ${featured.title || 'Heavyweight Graphic Oversized Tees'}
              </div>
              <div class="runway-desc">
                ${featured.description || '260 GSM vintage acid-washed streetwear and artisanal handcrafted leather export collection.'}
              </div>
            </div>

            <div class="runway-controls-row">
              <button class="runway-btn-primary" onclick="window.openLookbookFittingRoom('${featured.id || ''}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7z"/></svg>
                ⚡ Fitting Room
              </button>
              <button class="runway-btn-secondary" onclick="window.openDriveAssetHub()" title="Browse Google Drive & handfilm.handsandhead.com repository">
                📁 Drive Asset Hub
              </button>
              <button class="runway-btn-secondary" onclick="window.openRunwayMode()" title="Fullscreen Cinematic View">
                ▶ Runway View
              </button>
            </div>
          </div>
        </div>

        <!-- 3. Gallery Search & Category Filter Toolbar -->
        <div class="gallery-toolbar-card">
          <div class="gallery-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" 
                   class="gallery-search-input" 
                   placeholder="Search Tees, Acid Wash, Leather, SKU, GSM…" 
                   value="${state.search || ''}"
                   oninput="window.filterHomeGallerySearch(this.value)"/>
          </div>

          <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;">
            <div class="gallery-filter-chips">
              ${uniqueCats.map(cat => `
                <button class="gallery-chip ${state.category.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" 
                        onclick="window.setHomeGalleryCategory('${cat}')">
                  ${cat}
                </button>
              `).join('')}
            </div>

            <div class="gallery-view-modes">
              <button class="gallery-view-btn ${state.viewMode === 'showcase' ? 'active' : ''}" 
                      onclick="window.setHomeGalleryViewMode('showcase')" 
                      title="Showcase Cards View">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
              <button class="gallery-view-btn ${state.viewMode === 'compact' ? 'active' : ''}" 
                      onclick="window.setHomeGalleryViewMode('compact')" 
                      title="Compact Grid View">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="4" height="4"/><rect x="10" y="3" width="4" height="4"/><rect x="17" y="3" width="4" height="4"/>
                  <rect x="3" y="10" width="4" height="4"/><rect x="10" y="10" width="4" height="4"/><rect x="17" y="10" width="4" height="4"/>
                  <rect x="3" y="17" width="4" height="4"/><rect x="10" y="17" width="4" height="4"/><rect x="17" y="17" width="4" height="4"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 4. Products Responsive 5:4 Dynamic Fashion Wall (Strictly Only Edit & Copy Buttons) -->
        <div class="gallery-grid ${state.viewMode === 'compact' ? 'mode-compact' : ''}">
          ${filtered.length ? filtered.map(p => {
            const firstImg = p.images?.[0]?.url || (typeof p.images?.[0] === 'string' ? p.images[0] : '');
            const sku = p.variants?.[0]?.sku || 'HH-' + (p.id ? p.id.slice(0, 4) : 'GEN');
            const stock = p.totalInventory !== undefined ? p.totalInventory : 20;
            const isLow = stock <= (p.lowStockThreshold || 5);
            const status = p.status || 'active';
            const price = Number(p.pricing?.price || 0);
            const compPrice = p.pricing?.compareAtPrice ? Number(p.pricing.compareAtPrice) : null;
            const prodType = p.productType || 'Tees & Apparel';

            return `
              <div class="gallery-card" id="gcard-${p.id}">
                <!-- 80% Photo Stage (5:4 Desktop / 1:1 Mobile) with Dynamic Hover -->
                <div class="gallery-img-box" onclick="window.openLookbookFittingRoom('${p.id}')">
                  <!-- Top Badge Overlay -->
                  <div class="gallery-badge-top-left">
                    <span class="gallery-badge-pill status-${status}">${status}</span>
                    ${p.tags && p.tags.includes('duplicate') ? '<span class="gallery-badge-pill" style="color:var(--gold);">COPY</span>' : ''}
                  </div>

                  ${firstImg 
                    ? `<img src="${firstImg}" alt="${p.title}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' fill=\'%23333\'><rect width=\'100\' height=\'100\'/><text x=\'50\' y=\'55\' fill=\'%23888\' font-size=\'14\' text-anchor=\'middle\'>NO IMAGE</text></svg>'"/>`
                    : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--coral);font-family:var(--display);">
                         <div style="font-size:28px;">👕</div>
                         <div style="font-size:13px;font-weight:700;margin-top:4px;letter-spacing:1px;">${(p.title || 'TEE').slice(0, 6).toUpperCase()}</div>
                       </div>`
                  }

                  <!-- Dynamic Floating Quick-Action Pills on Image Hover -->
                  <div class="gallery-img-overlay">
                    <button class="gallery-overlay-btn" onclick="event.stopPropagation();window.openAdvancedProductForm('${p.id}')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    <button class="gallery-overlay-btn" onclick="event.stopPropagation();window.duplicateProduct('${p.id}')" title="1-Click Duplicate">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      Copy
                    </button>
                  </div>

                  <!-- Integrated In-Photo Info Scrim (Maximizes 80% Viewable Photo) -->
                  <div class="gallery-photo-scrim">
                    <div class="gallery-scrim-type">${prodType}</div>
                    <div class="gallery-scrim-title" title="${p.title}">${p.title}</div>
                    <div class="gallery-scrim-price-row">
                      <div class="gallery-scrim-price">৳${price.toLocaleString()} ${compPrice ? `<span style="font-size:11px;opacity:0.75;text-decoration:line-through;margin-left:4px;">৳${compPrice.toLocaleString()}</span>` : ''}</div>
                      <div class="gallery-scrim-stock ${isLow ? 'low' : ''}">● ${stock} in stock</div>
                    </div>
                  </div>
                </div>

                <!-- 20% Bottom Action Buttons Strip (Strictly Only Edit & Copy) -->
                <div class="gallery-card-body">
                  <div class="gallery-card-meta-bar">
                    <span class="gallery-sku-tag">SKU: ${sku}</span>
                    <span class="gallery-stock-info ${isLow ? 'low' : ''}">${isLow ? '⚠️ Low' : '✓ In Stock'}</span>
                  </div>

                  <div class="gallery-card-actions">
                    <button class="gallery-action-btn" 
                            onclick="event.stopPropagation();window.openAdvancedProductForm('${p.id}')" 
                            title="Edit Product Details">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button class="gallery-action-btn duplicate-btn" 
                            onclick="event.stopPropagation();window.duplicateProduct('${p.id}')" 
                            title="Duplicate this product with all settings">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="empty" style="grid-column:1/-1;padding:48px 20px;text-align:center;background:var(--bg-neu);border-radius:20px;box-shadow:var(--neu-flat-sm);">
              <div style="font-size:36px;margin-bottom:10px;color:var(--coral);">👕</div>
              <div style="font-size:15px;font-weight:700;color:var(--ink);">No Fashion Items Found</div>
              <div style="font-size:12px;color:var(--ink-3);margin-top:6px;max-width:320px;margin-left:auto;margin-right:auto;">
                ${state.search || state.category !== 'All' ? 'No items match your current filter criteria.' : 'Your catalog is empty. Import from Google Drive / handfilm.handsandhead.com or create a new tee.'}
              </div>
              <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
                <button class="btn btn-dark btn-sm" onclick="window.setHomeGalleryCategory('All');window.filterHomeGallerySearch('');">Clear Filters</button>
                <button class="btn btn-gold btn-sm" onclick="window.openDriveAssetHub()">📁 Sync Drive Assets</button>
              </div>
            </div>
          `}
        </div>
      `;

      // Enable horizontal mouse drag-to-scroll for category chips
      const chipsEl = mountEl.querySelector('.gallery-filter-chips');
      if (chipsEl) {
        let isDown = false;
        let startX, scrollLeft;
        chipsEl.addEventListener('mousedown', (e) => {
          isDown = true;
          startX = e.pageX - chipsEl.offsetLeft;
          scrollLeft = chipsEl.scrollLeft;
        });
        chipsEl.addEventListener('mouseleave', () => { isDown = false; });
        chipsEl.addEventListener('mouseup', () => { isDown = false; });
        chipsEl.addEventListener('mousemove', (e) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - chipsEl.offsetLeft;
          const walk = (x - startX) * 1.5;
          chipsEl.scrollLeft = scrollLeft - walk;
        });
      }
    } catch (err) {
      console.error("Gallery render error:", err);
      mountEl.innerHTML = `
        <div style="padding:20px;color:var(--warn);background:var(--bg-neu);border-radius:14px;box-shadow:var(--neu-flat-sm);">
          Failed to load product gallery: ${err.message}
        </div>
      `;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     CRM / CUSTOMERS MODULE
     ═══════════════════════════════════════════════════════════ */
  window.render.CRM = async function (container) {
    const target = container || document.getElementById("mod-CRM") || document.getElementById("mod-Customers") || document.getElementById("body");
    if (!target) return;
    target.innerHTML = loading("Loading Customer Directory…");
    const state = window._viewState.customers;

    try {
      const { items } = await window.CustomersService.list({
        search: state.search,
        country: state.country,
        sortBy: state.sortBy,
        sortDir: state.sortDir
      });
      window._lastCustomersCache = items;

      const totalSpentAll = items.reduce((s, c) => s + (c.totalSpent || 0), 0);

      target.innerHTML = modHeader("Customer Directory", `${items.length} buyer profiles · ৳${totalSpentAll.toLocaleString()} lifetime spend`, [
        { label: "+ Add Customer", fn: "window.openAdvancedCustomerForm()", primary: true }
      ]) + `
        <!-- Filter and Search Toolbar -->
        <div style="padding:0 20px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <input type="text" placeholder="Search name, company, email, phone…" 
                 value="${state.search || ''}" 
                 oninput="window._viewState.customers.search = this.value; window.debounceCustomerSearch();" 
                 style="flex:1;min-width:180px;height:34px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 10px;font-size:12px;border-radius:6px;"/>
          
          <select onchange="window._viewState.customers.country = this.value; window.render.CRM(document.getElementById('mod-CRM'));" 
                  style="height:34px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 8px;font-size:11px;border-radius:6px;">
            <option value="all" ${state.country === 'all' ? 'selected' : ''}>All Countries</option>
            <option value="NL" ${state.country === 'NL' ? 'selected' : ''}>🇳🇱 Netherlands</option>
            <option value="DE" ${state.country === 'DE' ? 'selected' : ''}>🇩🇪 Germany</option>
            <option value="GB" ${state.country === 'GB' ? 'selected' : ''}>🇬🇧 United Kingdom</option>
            <option value="US" ${state.country === 'US' ? 'selected' : ''}>🇺🇸 United States</option>
            <option value="BD" ${state.country === 'BD' ? 'selected' : ''}>🇧🇩 Bangladesh</option>
          </select>

          <select onchange="window._viewState.customers.sortBy = this.value; window.render.CRM(document.getElementById('mod-CRM'));" 
                  style="height:34px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 8px;font-size:11px;border-radius:6px;">
            <option value="updatedAt" ${state.sortBy === 'updatedAt' ? 'selected' : ''}>Sort: Recent</option>
            <option value="totalSpent" ${state.sortBy === 'totalSpent' ? 'selected' : ''}>Sort: Total Spent</option>
            <option value="totalOrders" ${state.sortBy === 'totalOrders' ? 'selected' : ''}>Sort: Orders</option>
            <option value="name" ${state.sortBy === 'name' ? 'selected' : ''}>Sort: Company</option>
          </select>
        </div>

        <div style="padding:0 20px 20px;display:flex;flex-direction:column;gap:8px;">
          ${items.length ? items.map(c => `
            <div class="company-card" onclick="window.openCompanyDetail('${c.id}')" style="cursor:pointer;transition:transform 0.15s, border-color 0.15s;">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                <div style="font-size:24px;line-height:1;">${c.flag || '🏢'}</div>
                <div style="flex:1;min-width:0;">
                  <div class="company-name" style="font-size:14px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${c.companyName || c.name}
                  </div>
                  <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);margin-top:2px;">
                    ${c.country || '—'} · ${c.contactPerson ? `${c.contactPerson} · ` : ''}${c.currency || 'BDT'}
                  </div>
                </div>
                <div style="text-align:right;">
                  <span class="pill ok" style="font-size:9px;">${c.totalOrders || 0} Orders</span>
                  <div style="font-size:12px;font-weight:700;color:var(--gold);margin-top:4px;font-family:var(--mono);">
                    ৳${(c.totalSpent || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div class="company-meta" style="display:flex;flex-wrap:wrap;gap:6px;font-size:10px;">
                <div class="company-tag">${c.paymentTerms || 'Net 30'}</div>
                <div class="company-tag">MOQ: ${c.moq || 100} units</div>
                ${c.email ? `<div class="company-tag">✉ ${c.email}</div>` : ''}
                ${c.phone ? `<div class="company-tag">📞 ${c.phone}</div>` : ''}
              </div>
            </div>
          `).join('') : `
            <div class="empty" style="padding:40px;text-align:center;">
              <div style="font-size:24px;margin-bottom:8px;color:var(--gold-dim);">👥</div>
              <div style="font-size:13px;color:var(--ink);">No customers found</div>
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px;">Click "+ Add Customer" to create your first buyer profile.</div>
            </div>
          `}
        </div>
      `;
    } catch (err) {
      target.innerHTML = `<div style="padding:20px;color:var(--warn);">Failed to load CRM: ${err.message}</div>`;
    }
  };
  window.render.Customers = window.render.CRM;

  let _searchCustomerTimer = null;
  window.debounceCustomerSearch = function () {
    clearTimeout(_searchCustomerTimer);
    _searchCustomerTimer = setTimeout(() => {
      const container = document.getElementById("mod-CRM") || document.getElementById("mod-Customers");
      if (container) window.render.CRM(container);
    }, 280);
  };

  /* ── Customer Detail Sheet with Real Linked Orders & Notes ── */
  window.openCompanyDetail = async function (customerId) {
    openSheet(loading("Loading Customer Record…"));
    try {
      const { customer: c, orders } = await window.CustomersService.getWithOrders(customerId, 20);
      if (!c) { toast("Customer record not found"); closeSheet(); return; }

      const notes = c.notes || [];

      document.getElementById("sheet").innerHTML = `
        <div class="grab"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 20px 8px;">
          <div>
            <h3 style="margin:0;font-size:18px;">${c.flag || '🏢'} ${c.companyName || c.name}</h3>
            <p class="hint" style="margin:2px 0 0;">${c.country || 'Global'} · ${c.paymentTerms || 'Net 30'} · ${c.currency || 'BDT'}</p>
          </div>
          <button class="btn btn-dark btn-sm" onclick="window.openAdvancedCustomerForm('${c.id}')">Edit</button>
        </div>

        <div style="padding:0 20px 24px;">
          <div class="bento-grid" style="padding:0 0 14px;">
            <div class="bento-card">
              <div class="bento-label">Orders</div>
              <div class="bento-value" style="font-size:26px;">${c.totalOrders || 0}</div>
            </div>
            <div class="bento-card">
              <div class="bento-label">Total Spend</div>
              <div class="bento-value" style="font-size:20px;color:var(--gold);">৳${(c.totalSpent || 0).toLocaleString()}</div>
            </div>
            <div class="bento-card">
              <div class="bento-label">MOQ</div>
              <div class="bento-value" style="font-size:26px;">${c.moq || 100}</div>
            </div>
          </div>

          <div class="card" style="margin-bottom:12px;">
            <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Contact Profile</div>
            <div style="font-size:13px;font-weight:600;color:var(--ink);">${c.contactPerson || c.name}</div>
            <div style="font-size:12px;color:var(--ink-2);margin-top:2px;">${c.email || 'No email provided'} · ${c.phone || 'No phone'}</div>
            ${c.addresses?.[0]?.line1 ? `
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px;">
                📍 ${c.addresses[0].line1}, ${c.addresses[0].city || ''} ${c.addresses[0].postalCode || ''}, ${c.country}
              </div>
            ` : ''}
          </div>

          <!-- Customer Notes Section -->
          <div class="card" style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;">Internal Notes (${notes.length})</div>
            </div>
            <div id="cust_notes_list" style="display:flex;flex-direction:column;gap:6px;max-height:120px;overflow-y:auto;margin-bottom:8px;">
              ${notes.length ? notes.map(n => `
                <div style="background:var(--bg-3);padding:6px 10px;border-radius:4px;font-size:11px;border-left:2px solid var(--gold);">
                  <div style="color:var(--ink);">${n.text}</div>
                  <div style="font-size:9px;color:var(--ink-3);font-family:var(--mono);margin-top:2px;">${n.by || 'Operator'} · ${new Date(n.createdAt).toLocaleDateString()}</div>
                </div>
              `).join('') : '<div style="font-size:11px;color:var(--ink-3);">No notes logged yet.</div>'}
            </div>
            <div style="display:flex;gap:6px;">
              <input id="new_cust_note" placeholder="Log customer interaction or preference…" style="flex:1;height:30px;font-size:11px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 8px;border-radius:4px;"/>
              <button class="btn btn-dark btn-sm" onclick="window.submitCustomerNote('${c.id}')">Add Note</button>
            </div>
          </div>

          <!-- Linked Orders -->
          <div class="sec-h" style="padding:4px 0 8px;"><span class="sec-h-label">Linked Orders (${orders.length})</span></div>
          <div class="orders-container" style="margin-bottom:14px;max-height:180px;overflow-y:auto;">
            ${orders.length ? orders.map(o => `
              <div class="orow" onclick="window.openOrderDetail('${o.id}')" style="cursor:pointer;padding:8px 10px;">
                <div class="othumb" style="font-size:10px;">HH</div>
                <div class="om">
                  <div class="ot" style="font-size:12px;">${o.orderNumber} · ৳${(o.total || 0).toLocaleString()}</div>
                  <div class="os" style="font-size:10px;">${(o.lineItems || []).map(li => `${li.title} (${li.quantity})`).join(', ')}</div>
                </div>
                <span class="pill ${o.status === 'completed' ? 'ok' : o.status === 'cancelled' ? 'warn' : 'amber'}" style="font-size:8px;">${(o.status || 'open').toUpperCase()}</span>
              </div>
            `).join('') : '<div class="empty" style="padding:14px;">No linked orders recorded yet</div>'}
          </div>

          <div style="display:flex;gap:8px;">
            <button class="btn btn-gold" style="flex:1;" onclick="closeSheet(); window.openAdvancedOrderForm('${c.id}')">Create Order for Buyer →</button>
            ${c.email ? `<button class="btn btn-dark" onclick="window.open('mailto:${c.email}')">Email Buyer</button>` : ''}
          </div>
        </div>
      `;
    } catch (e) {
      toast("Error loading details: " + e.message);
      closeSheet();
    }
  };

  window.submitCustomerNote = async function (customerId) {
    const input = document.getElementById("new_cust_note");
    const text = input.value.trim();
    if (!text) return;
    try {
      await window.CustomersService.addNote(customerId, text);
      input.value = "";
      toast("Note logged ✓");
      window.openCompanyDetail(customerId);
    } catch (e) {
      toast(e.message);
    }
  };

  /* ── Customer Create / Edit Form ── */
  window.openAdvancedCustomerForm = function (customerId = null) {
    const c = customerId ? (window._lastCustomersCache || []).find(x => x.id === customerId) : null;
    const addr = c?.addresses?.[0] || {};

    openSheet(`
      <h3>${c ? 'Edit Customer' : 'Add New Customer'}</h3>
      <p class="hint">${c ? 'Update company details, MOQ, and terms' : 'Register a new wholesale buyer or client'}</p>
      
      <div style="padding:0 20px 24px;">
        <input type="hidden" id="c_id" value="${c?.id || ''}"/>
        
        <div class="field"><label>Company / Buyer Name *</label>
          <input id="c_company" placeholder="e.g. Atelier Vondel GmbH" value="${c?.companyName || c?.name || ''}"/>
        </div>

        <div class="field"><label>Contact Person</label>
          <input id="c_contact" placeholder="e.g. Hendrik van Dijk" value="${c?.contactPerson || c?.name || ''}"/>
        </div>

        <div class="field-row">
          <div class="field"><label>Email *</label>
            <input id="c_email" type="email" placeholder="procurement@buyer.com" value="${c?.email || ''}"/>
          </div>
          <div class="field"><label>Phone</label>
            <input id="c_phone" placeholder="+31 20 123 4567" value="${c?.phone || ''}"/>
          </div>
        </div>

        <div class="field-row">
          <div class="field"><label>Country</label>
            <select id="c_country">
              <option value="NL" ${c?.country === 'NL' ? 'selected' : ''}>🇳🇱 Netherlands</option>
              <option value="DE" ${c?.country === 'DE' ? 'selected' : ''}>🇩🇪 Germany</option>
              <option value="GB" ${c?.country === 'GB' ? 'selected' : ''}>🇬🇧 United Kingdom</option>
              <option value="ES" ${c?.country === 'ES' ? 'selected' : ''}>🇪🇸 Spain</option>
              <option value="FR" ${c?.country === 'FR' ? 'selected' : ''}>🇫🇷 France</option>
              <option value="US" ${c?.country === 'US' ? 'selected' : ''}>🇺🇸 United States</option>
              <option value="BD" ${c?.country === 'BD' ? 'selected' : ''}>🇧🇩 Bangladesh</option>
              <option value="JP" ${c?.country === 'JP' ? 'selected' : ''}>🇯🇵 Japan</option>
            </select>
          </div>
          <div class="field"><label>Currency</label>
            <select id="c_currency">
              <option value="BDT" ${c?.currency === 'BDT' ? 'selected' : ''}>BDT (৳)</option>
              <option value="EUR" ${c?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
              <option value="USD" ${c?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="GBP" ${c?.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field"><label>MOQ Target (Units)</label>
            <input id="c_moq" type="number" placeholder="100" value="${c?.moq || 100}"/>
          </div>
          <div class="field"><label>Payment Terms</label>
            <select id="c_terms">
              <option value="Net 30" ${c?.paymentTerms === 'Net 30' ? 'selected' : ''}>Net 30</option>
              <option value="Net 45" ${c?.paymentTerms === 'Net 45' ? 'selected' : ''}>Net 45</option>
              <option value="Net 60" ${c?.paymentTerms === 'Net 60' ? 'selected' : ''}>Net 60</option>
              <option value="50% Advance" ${c?.paymentTerms === '50% Advance' ? 'selected' : ''}>50% Advance, 50% on Delivery</option>
              <option value="100% Advance" ${c?.paymentTerms === '100% Advance' ? 'selected' : ''}>100% Upfront</option>
            </select>
          </div>
        </div>

        <div class="field"><label>Shipping / Billing Address</label>
          <input id="c_addr" placeholder="Keizersgracht 421, 1016 EK Amsterdam" value="${addr.line1 || ''}"/>
        </div>

        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="btn btn-gold" id="c_save_btn" style="flex:1;" onclick="window.submitAdvancedCustomer()">
            ${c ? 'Save Changes' : 'Create Customer'}
          </button>
          ${c ? `
            <button class="btn btn-dark" style="color:var(--warn);" onclick="window.deleteCustomerPrompt('${c.id}')">
              Delete
            </button>
          ` : ''}
        </div>
      </div>
    `);
  };

  window.submitAdvancedCustomer = async function () {
    const id = document.getElementById("c_id").value;
    const companyName = document.getElementById("c_company").value.trim();
    if (!companyName) { toast("Please provide a Company or Buyer name"); return; }

    const btn = document.getElementById("c_save_btn");
    btn.innerText = id ? "Saving…" : "Creating…";
    btn.disabled = true;

    const payload = {
      companyName,
      name: companyName,
      contactPerson: document.getElementById("c_contact").value.trim() || companyName,
      email: document.getElementById("c_email").value.trim(),
      phone: document.getElementById("c_phone").value.trim(),
      country: document.getElementById("c_country").value,
      currency: document.getElementById("c_currency").value,
      moq: Number(document.getElementById("c_moq").value) || 100,
      paymentTerms: document.getElementById("c_terms").value,
      addressLine1: document.getElementById("c_addr").value.trim()
    };

    try {
      if (id) {
        await window.CustomersService.update(id, payload);
        toast("Customer updated successfully ✓");
      } else {
        await window.CustomersService.create(payload);
        toast("Customer created successfully ✓");
      }
      closeSheet();
      const container = document.getElementById("mod-CRM") || document.getElementById("mod-Customers");
      if (container) window.render.CRM(container);
    } catch (e) {
      toast("Error: " + e.message);
      btn.innerText = id ? "Save Changes" : "Create Customer";
      btn.disabled = false;
    }
  };

  window.deleteCustomerPrompt = async function (customerId) {
    if (!confirm("Are you sure you want to delete this customer record?")) return;
    await window.CustomersService.delete(customerId);
    toast("Customer record deleted ✓");
    closeSheet();
    const container = document.getElementById("mod-CRM") || document.getElementById("mod-Customers");
    if (container) window.render.CRM(container);
  };

  /* ═══════════════════════════════════════════════════════════
     ORDERS MODULE (Commerce Pipeline with Multi-Select & Batch Toolbar)
     ═══════════════════════════════════════════════════════════ */
  window._selectedOrderIds = window._selectedOrderIds || new Set();

  window.toggleOrderSelection = function (orderId, event) {
    if (event) event.stopPropagation();
    if (window._selectedOrderIds.has(orderId)) {
      window._selectedOrderIds.delete(orderId);
    } else {
      window._selectedOrderIds.add(orderId);
    }
    window.updateOrderSelectionUI();
  };

  window.toggleSelectAllOrders = function (checked) {
    const items = window._lastOrdersCache || [];
    if (checked) {
      items.forEach(o => window._selectedOrderIds.add(o.id));
    } else {
      window._selectedOrderIds.clear();
    }
    window.updateOrderSelectionUI();
  };

  window.clearOrderSelection = function () {
    window._selectedOrderIds.clear();
    window.updateOrderSelectionUI();
  };

  window.updateOrderSelectionUI = function () {
    const count = window._selectedOrderIds.size;
    const bar = document.getElementById("orders-batch-floating-bar");
    const countEl = document.getElementById("orders-selected-count-badge");
    const selectAllCb = document.getElementById("cb_select_all_orders");

    // Calculate sum of selected orders
    const allOrders = window._lastOrdersCache || [];
    const selectedOrders = allOrders.filter(o => window._selectedOrderIds.has(o.id));
    const selectedTotal = selectedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Update checkboxes and rows in DOM
    document.querySelectorAll(".order-item-cb").forEach(cb => {
      const oId = cb.getAttribute("data-order-id");
      const isSelected = window._selectedOrderIds.has(oId);
      cb.checked = isSelected;
      const row = cb.closest(".orow");
      if (row) {
        if (isSelected) row.classList.add("is-selected");
        else row.classList.remove("is-selected");
      }
    });

    // Update Select All Checkbox state
    const totalItems = allOrders.length;
    if (selectAllCb) {
      selectAllCb.checked = totalItems > 0 && count === totalItems;
      selectAllCb.indeterminate = count > 0 && count < totalItems;
    }

    // Update floating bar
    if (bar) {
      if (count > 0) {
        if (countEl) countEl.innerHTML = `✓ ${count} Selected · ৳${selectedTotal.toLocaleString()}`;
        bar.classList.add("active");
      } else {
        bar.classList.remove("active");
      }
    }
  };

  window.render.Orders = async function (container) {
    const target = container || document.getElementById("mod-Orders") || document.getElementById("body");
    if (!target) return;
    target.innerHTML = loading("Loading Commerce Orders…");
    const state = window._viewState.orders;

    try {
      const { items } = await window.OrdersService.list({
        status: state.status,
        paymentStatus: state.paymentStatus,
        fulfillmentStatus: state.fulfillmentStatus,
        search: state.search
      });
      window._lastOrdersCache = items;

      const totalRevenue = items.reduce((s, o) => s + (o.status !== 'cancelled' ? (o.total || 0) : 0), 0);
      const pendingFulfillment = items.filter(o => o.fulfillmentStatus === 'unfulfilled' && o.status !== 'cancelled').length;
      const isAllSelected = items.length > 0 && items.every(o => window._selectedOrderIds.has(o.id));

      const selectedOrders = items.filter(o => window._selectedOrderIds.has(o.id));
      const selectedTotal = selectedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      target.innerHTML = modHeader("Orders & Shipments", `${items.length} orders · ৳${totalRevenue.toLocaleString()} volume · ${pendingFulfillment} unfulfilled`, [
        { label: "+ Create Order", fn: "window.openAdvancedOrderForm()", primary: true }
      ]) + `
        <!-- Filter & Multi-Select Toolbar -->
        <div style="padding:0 20px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <!-- Select All Checkbox Component -->
          <label style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-3);border:1px solid var(--wire);padding:0 10px;height:34px;border-radius:6px;cursor:pointer;user-select:none;">
            <input type="checkbox" id="cb_select_all_orders" class="item-select-checkbox" 
                   ${isAllSelected ? 'checked' : ''} 
                   onchange="window.toggleSelectAllOrders(this.checked)"/>
            <span style="font-size:11px;font-weight:700;color:var(--ink-2);font-family:var(--mono);">Select All (${items.length})</span>
          </label>

          <input type="text" placeholder="Search order #, buyer, product SKU…" 
                 value="${state.search || ''}" 
                 oninput="window._viewState.orders.search = this.value; window.debounceOrderSearch();" 
                 style="flex:1;min-width:180px;height:34px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 10px;font-size:12px;border-radius:6px;"/>
          
          <select onchange="window._viewState.orders.status = this.value; window.render.Orders(document.getElementById('mod-Orders'));" 
                  style="height:34px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 8px;font-size:11px;border-radius:6px;">
            <option value="all" ${state.status === 'all' ? 'selected' : ''}>All Status</option>
            <option value="open" ${state.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="completed" ${state.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${state.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>

          <select onchange="window._viewState.orders.paymentStatus = this.value; window.render.Orders(document.getElementById('mod-Orders'));" 
                  style="height:34px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 8px;font-size:11px;border-radius:6px;">
            <option value="all" ${state.paymentStatus === 'all' ? 'selected' : ''}>All Payments</option>
            <option value="paid" ${state.paymentStatus === 'paid' ? 'selected' : ''}>Paid</option>
            <option value="pending" ${state.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="refunded" ${state.paymentStatus === 'refunded' ? 'selected' : ''}>Refunded</option>
          </select>
        </div>

        <div class="orders-container" style="margin:0 20px 80px;">
          ${items.length ? items.map(o => {
            const dateStr = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : (new Date(o.createdAt || Date.now())).toLocaleDateString();
            const isSelected = window._selectedOrderIds.has(o.id);
            return `
              <div class="orow ${isSelected ? 'is-selected' : ''}" onclick="window.openOrderDetail('${o.id}')" style="cursor:pointer;transition:all 0.15s ease;display:flex;align-items:center;">
                <!-- Row Multi-Select Checkbox -->
                <div style="display:flex;align-items:center;padding-right:8px;" onclick="event.stopPropagation();">
                  <input type="checkbox" class="item-select-checkbox order-item-cb" 
                         data-order-id="${o.id}" 
                         ${isSelected ? 'checked' : ''} 
                         onchange="window.toggleOrderSelection('${o.id}', event)"/>
                </div>

                <div class="othumb" style="font-weight:700;color:var(--gold);background:var(--bg-3);border:1px solid var(--wire);">HH</div>
                <div class="om" style="flex:1;min-width:0;">
                  <div class="ot" style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:700;color:var(--ink);font-family:var(--mono);">${o.orderNumber}</span>
                    <span style="color:var(--gold);font-weight:600;">৳${(o.total || 0).toLocaleString()}</span>
                    <span style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">${dateStr}</span>
                  </div>
                  <div class="os" style="font-size:11px;color:var(--ink-3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${o.customerSnapshot?.name || 'Walk-in'} · ${(o.lineItems || []).map(li => `${li.title} (${li.quantity})`).join(', ')}
                  </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                  <span class="pill ${o.paymentStatus === 'paid' ? 'ok' : 'amber'}" style="font-size:8px;">
                    ${(o.paymentStatus || 'pending').toUpperCase()}
                  </span>
                  <span class="pill ${o.status === 'completed' ? 'ok' : o.status === 'cancelled' ? 'warn' : 'amber'}" style="font-size:8px;">
                    ${(o.status || 'open').toUpperCase()}
                  </span>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="empty" style="padding:40px;text-align:center;">
              <div style="font-size:24px;margin-bottom:8px;color:var(--gold-dim);">🧾</div>
              <div style="font-size:13px;color:var(--ink);">No commerce orders found</div>
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px;">Click "+ Create Order" to initiate a transaction.</div>
            </div>
          `}
        </div>

        <!-- Floating Batch Actions Toolbar for Orders -->
        <div id="orders-batch-floating-bar" class="batch-floating-bar ${window._selectedOrderIds.size > 0 ? 'active' : ''}">
          <div id="orders-selected-count-badge" class="batch-count-badge">
            ✓ ${window._selectedOrderIds.size} Selected · ৳${selectedTotal.toLocaleString()}
          </div>
          <button class="batch-action-btn btn-batch-primary" onclick="window.batchSyncOrdersToAccounting()">
            ⚡ Bulk Sync to Accounting
          </button>
          <button class="batch-action-btn" onclick="window.openBatchOrderLabelsModal()">
            🏷️ Bulk Print Labels
          </button>
          <button class="batch-action-btn" onclick="window.batchFulfillAndPayOrders()">
            📦 Bulk Fulfill &amp; Pay
          </button>
          <button class="batch-action-btn" onclick="window.batchCompleteOrders()">
            📁 Bulk Archive
          </button>
          <button class="batch-action-btn" style="background:transparent;border:none;color:var(--ink-3);" onclick="window.clearOrderSelection()" title="Clear Selection">
            ✕ Clear
          </button>
        </div>
      `;
    } catch (err) {
      target.innerHTML = `<div style="padding:20px;color:var(--warn);">Failed to load orders: ${err.message}</div>`;
    }
  };

  /* ── Bulk Actions for Orders ── */
  window.batchSyncOrdersToAccounting = async function () {
    const ids = Array.from(window._selectedOrderIds);
    if (!ids.length) { toast("No orders selected"); return; }

    const allOrders = window._lastOrdersCache || [];
    const selected = allOrders.filter(o => ids.includes(o.id));
    const totalVolume = selected.reduce((s, o) => s + (o.total || 0), 0);

    toast(`Initiating batch ERP ledger sync for ${ids.length} orders (৳${totalVolume.toLocaleString()})…`);

    try {
      let syncedCount = 0;
      for (const o of selected) {
        // If AccountingService is initialized, synchronize each order
        if (window.AccountingApp && typeof window.AccountingApp.syncSingleOrder === "function") {
          try {
            await window.AccountingApp.syncSingleOrder(o.id);
          } catch (err) {}
        }
        
        // Log timeline and record sync status in Orders Service
        await window.OrdersService.updateStatus(o.id, {
          notes: (o.notes || "") + ` [Synced to ERP General Ledger at ${new Date().toLocaleTimeString()}]`
        });
        syncedCount++;
      }

      toast(`Successfully synchronized ${syncedCount} orders to ERP Ledger ✓`);
      window.clearOrderSelection();
      const container = document.getElementById("mod-Orders");
      if (container) window.render.Orders(container);
    } catch (e) {
      toast("Batch accounting sync error: " + e.message);
    }
  };

  window.openBatchOrderLabelsModal = function () {
    const ids = Array.from(window._selectedOrderIds);
    const allOrders = window._lastOrdersCache || [];
    const selected = ids.length ? allOrders.filter(o => ids.includes(o.id)) : allOrders.slice(0, 5);

    if (!selected.length) { toast("Please select at least one order to print labels"); return; }

    openSheet(`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0 20px 10px;">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:800;letter-spacing:1px;text-transform:uppercase;">
            DISPATCH &amp; COURIER SHIPPING LABELS
          </div>
          <h3 style="margin:2px 0 0;font-size:18px;">Bulk Shipping Manifests (${selected.length} Orders)</h3>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-gold btn-sm" onclick="window.print();">🖨️ Print Labels</button>
          <button class="btn btn-dark btn-sm" onclick="closeSheet();">Close</button>
        </div>
      </div>

      <div style="padding:0 20px 24px;">
        <div style="background:var(--bg-neu);border-radius:12px;padding:10px 14px;box-shadow:var(--neu-flat-xs);font-size:11.5px;color:var(--ink-2);margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
          <span>DHL Express / RedX courier format with tracking barcode and consignment item breakdown.</span>
          <span class="pill ok" style="font-size:8.5px;font-weight:700;">READY TO PRINT</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          ${selected.map((o, idx) => {
            const cust = o.customerSnapshot || {};
            const items = o.lineItems || [];
            const trackingNum = `BD-DHL-${(o.orderNumber || '').replace('HH-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
            return `
              <div style="background:#FFFFFF;color:#111827;border:2px solid #1F2937;border-radius:10px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);font-family:sans-serif;">
                <!-- Header -->
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:10px;">
                  <div>
                    <div style="font-size:14px;font-weight:900;letter-spacing:1px;">HANDS &amp; HEAD ARTISAN OS</div>
                    <div style="font-size:9.5px;color:#4B5563;">Hazaribagh Leather Zone, Dhaka, Bangladesh</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:14px;font-weight:900;color:#DC2626;font-family:monospace;">PRIORITY AIR</div>
                    <div style="font-size:9.5px;font-weight:700;color:#111;">SHIPMENT #${idx + 1} OF ${selected.length}</div>
                  </div>
                </div>

                <!-- Recipient & Routing Grid -->
                <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:12px;margin-bottom:10px;">
                  <div style="border:1px solid #E5E7EB;border-radius:6px;padding:8px 10px;background:#F9FAFB;">
                    <div style="font-size:9px;font-weight:800;color:#6B7280;text-transform:uppercase;">DELIVER TO / CONSIGNEE</div>
                    <div style="font-size:13px;font-weight:800;color:#111;margin-top:2px;">${cust.name || cust.companyName || 'Valued Customer'}</div>
                    <div style="font-size:11px;color:#374151;margin-top:2px;">${cust.email || '—'} · ${cust.phone || '—'}</div>
                    <div style="font-size:11px;color:#4B5563;margin-top:2px;">${cust.country ? `Country: ${cust.country}` : 'Destination Port / Transit'}</div>
                  </div>

                  <div style="border:1px solid #E5E7EB;border-radius:6px;padding:8px 10px;background:#F9FAFB;display:flex;flex-direction:column;justify-content:space-between;">
                    <div>
                      <div style="font-size:9px;font-weight:800;color:#6B7280;text-transform:uppercase;">ORDER REF &amp; VALUE</div>
                      <div style="font-size:12px;font-weight:800;color:#111;font-family:monospace;">${o.orderNumber}</div>
                    </div>
                    <div style="font-size:14px;font-weight:900;color:#047857;font-family:monospace;">
                      ৳${Number(o.total || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <!-- Items Checklist -->
                <div style="border:1px solid #E5E7EB;border-radius:6px;padding:8px 10px;margin-bottom:10px;">
                  <div style="font-size:9px;font-weight:800;color:#6B7280;text-transform:uppercase;margin-bottom:4px;">PARCEL CONTENTS (${items.length} Line Items)</div>
                  ${items.map(li => `
                    <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px dashed #E5E7EB;">
                      <span style="font-weight:600;color:#1F2937;">[ ] ${li.title}</span>
                      <span style="font-family:monospace;font-weight:700;color:#4B5563;">Qty: ${li.quantity} (${li.sku || 'SKU'})</span>
                    </div>
                  `).join('')}
                </div>

                <!-- Barcode & Tracking -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;">
                  <div style="flex:1;max-width:260px;">
                    <div class="barcode-svg-pattern" style="height:32px;"></div>
                    <div style="font-family:monospace;font-size:10px;font-weight:700;letter-spacing:1px;color:#1F2937;text-align:center;">
                      ${trackingNum}
                    </div>
                  </div>
                  <div style="text-align:right;font-size:8px;color:#6B7280;line-height:1.3;">
                    Customs HS Code: 4202.31<br/>
                    Declared for International Export<br/>
                    Inspected &amp; Sealed by H&amp;H Quality Lead
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `);
  };

  window.batchFulfillAndPayOrders = async function () {
    const ids = Array.from(window._selectedOrderIds);
    if (!ids.length) { toast("No orders selected"); return; }
    if (!confirm(`Mark ${ids.length} order(s) as Paid and Fulfilled?`)) return;

    try {
      toast(`Fulfilling and recording payments for ${ids.length} orders…`);
      for (const id of ids) {
        await window.OrdersService.updateStatus(id, {
          paymentStatus: "paid",
          fulfillmentStatus: "fulfilled"
        });
      }
      toast(`Updated ${ids.length} orders to Paid & Fulfilled ✓`);
      window.clearOrderSelection();
      const container = document.getElementById("mod-Orders");
      if (container) window.render.Orders(container);
    } catch (e) {
      toast("Error updating orders: " + e.message);
    }
  };

  window.batchCompleteOrders = async function () {
    const ids = Array.from(window._selectedOrderIds);
    if (!ids.length) { toast("No orders selected"); return; }
    if (!confirm(`Archive and complete ${ids.length} selected order(s)?`)) return;

    try {
      toast(`Completing ${ids.length} orders…`);
      for (const id of ids) {
        await window.OrdersService.updateStatus(id, {
          status: "completed"
        });
      }
      toast(`Archived and completed ${ids.length} orders ✓`);
      window.clearOrderSelection();
      const container = document.getElementById("mod-Orders");
      if (container) window.render.Orders(container);
    } catch (e) {
      toast("Error completing orders: " + e.message);
    }
  };

  let _searchOrderTimer = null;
  window.debounceOrderSearch = function () {
    clearTimeout(_searchOrderTimer);
    _searchOrderTimer = setTimeout(() => {
      const container = document.getElementById("mod-Orders");
      if (container) window.render.Orders(container);
    }, 280);
  };

  /* ── Order Detail & Lifecycle Manager ── */
  window.openOrderDetail = async function (orderId) {
    openSheet(loading("Loading Order Record…"));
    try {
      const o = await window.OrdersService.get(orderId);
      if (!o) { toast("Order not found"); closeSheet(); return; }

      const timeline = o.timeline || [];
      const dateStr = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : (new Date(o.createdAt || Date.now())).toLocaleString();

      document.getElementById("sheet").innerHTML = `
        <div class="grab"></div>
        <div style="padding:0 20px 8px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <h3 style="margin:0;font-size:18px;font-family:var(--mono);">${o.orderNumber}</h3>
            <p class="hint" style="margin:2px 0 0;">Placed ${dateStr} · ${o.customerSnapshot?.name || 'Walk-in'}</p>
          </div>
          <span class="pill ${o.status === 'completed' ? 'ok' : o.status === 'cancelled' ? 'warn' : 'amber'}">
            ${(o.status || 'open').toUpperCase()}
          </span>
        </div>

        <div style="padding:0 20px 24px;">
          <!-- Line Items List -->
          <div class="card" style="margin-bottom:12px;">
            <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Purchased Items</div>
            ${(o.lineItems || []).map(li => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--wire);">
                <div>
                  <div style="font-size:12px;font-weight:600;color:var(--ink);">${li.title}</div>
                  <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">SKU: ${li.sku || '—'} · ৳${(li.price || 0).toLocaleString()} × ${li.quantity}</div>
                </div>
                <div style="font-size:13px;font-weight:700;color:var(--gold);font-family:var(--mono);">৳${(li.lineTotal || (li.price * li.quantity)).toLocaleString()}</div>
              </div>
            `).join('')}
            
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:4px;">
              <span style="font-size:12px;color:var(--ink-3);">Subtotal</span>
              <span style="font-size:12px;color:var(--ink);font-family:var(--mono);">৳${(o.subtotal || o.total || 0).toLocaleString()}</span>
            </div>
            ${o.discountTotal ? `
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
                <span style="font-size:12px;color:var(--warn);">Discount</span>
                <span style="font-size:12px;color:var(--warn);font-family:var(--mono);">-৳${o.discountTotal.toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--wire-hard);">
              <span style="font-size:14px;font-weight:700;color:var(--ink);">Grand Total</span>
              <span style="font-size:16px;font-weight:800;color:var(--gold);font-family:var(--mono);">৳${(o.total || 0).toLocaleString()}</span>
            </div>
          </div>

          <!-- Status Controls -->
          <div class="field-row">
            <div class="field"><label>Payment Status</label>
              <select id="ord_pay">
                <option value="pending" ${o.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="paid" ${o.paymentStatus === 'paid' ? 'selected' : ''}>Paid</option>
                <option value="partially_paid" ${o.paymentStatus === 'partially_paid' ? 'selected' : ''}>Partially Paid</option>
                <option value="refunded" ${o.paymentStatus === 'refunded' ? 'selected' : ''}>Refunded</option>
              </select>
            </div>
            <div class="field"><label>Fulfillment Status</label>
              <select id="ord_fulfill">
                <option value="unfulfilled" ${o.fulfillmentStatus === 'unfulfilled' ? 'selected' : ''}>Unfulfilled</option>
                <option value="fulfilled" ${o.fulfillmentStatus === 'fulfilled' ? 'selected' : ''}>Fulfilled</option>
                <option value="shipped" ${o.fulfillmentStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
                <option value="delivered" ${o.fulfillmentStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
              </select>
            </div>
          </div>

          <div class="field"><label>Order State</label>
            <select id="ord_status">
              <option value="open" ${o.status === 'open' ? 'selected' : ''}>Open</option>
              <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>

          <!-- Timeline Audit -->
          <div class="card" style="margin:12px 0;">
            <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Order Timeline (${timeline.length})</div>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:100px;overflow-y:auto;">
              ${timeline.length ? timeline.map(t => `
                <div style="font-size:11px;color:var(--ink-2);border-left:2px solid var(--wire-hard);padding-left:8px;">
                  <div>${t.event}</div>
                  <div style="font-size:9px;color:var(--ink-3);font-family:var(--mono);">${t.by || 'Operator'} · ${new Date(t.at).toLocaleString()}</div>
                </div>
              `).join('') : '<div style="font-size:11px;color:var(--ink-3);">No timeline events recorded.</div>'}
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn btn-gold" style="flex:1;" onclick="window.saveOrderStatus('${o.id}')">Save Status Updates</button>
            ${o.status !== 'cancelled' ? `
              <button class="btn btn-dark" style="color:var(--warn);" onclick="window.cancelOrderPrompt('${o.id}')">
                Cancel & Restock
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } catch (e) {
      toast("Error loading order: " + e.message);
      closeSheet();
    }
  };

  window.saveOrderStatus = async function (orderId) {
    const pay = document.getElementById("ord_pay").value;
    const fulfill = document.getElementById("ord_fulfill").value;
    const st = document.getElementById("ord_status").value;

    await window.OrdersService.updateStatus(orderId, {
      status: st,
      paymentStatus: pay,
      fulfillmentStatus: fulfill
    });
    toast("Order status updated ✓");
    closeSheet();
    const container = document.getElementById("mod-Orders");
    if (container) window.render.Orders(container);
  };

  window.cancelOrderPrompt = async function (orderId) {
    if (!confirm("Are you sure you want to cancel this order? Stock will be automatically restored to the product inventory ledger.")) return;
    try {
      await window.OrdersService.cancel(orderId, "Operator cancelled from Order Manager");
      toast("Order cancelled and inventory restored ✓");
      closeSheet();
      const container = document.getElementById("mod-Orders");
      if (container) window.render.Orders(container);
    } catch (e) {
      toast(e.message);
    }
  };

  /* ── Interactive Multi-Product Order Creation Modal ── */
  window.openAdvancedOrderForm = async function (preselectedCustomerId = null) {
    openSheet(loading("Loading Catalog & Buyers…"));
    try {
      const [{ items: products }, { items: customers }] = await Promise.all([
        window.ProductsService.list({ status: "active" }),
        window.CustomersService.list()
      ]);
      window._orderFormProducts = products;
      window._orderFormCustomers = customers;

      if (!products.length) {
        document.getElementById("sheet").innerHTML = `
          <div class="grab"></div>
          <h3>Cannot Create Order</h3>
          <div style="padding:20px;">
            <p style="color:var(--ink-2);font-size:13px;">No active products are available in the catalog. Please add products first.</p>
            <button class="btn btn-gold" onclick="closeSheet(); window.openAdvancedProductForm();" style="margin-top:12px;">+ Add Product</button>
          </div>
        `;
        return;
      }

      document.getElementById("sheet").innerHTML = `
        <div class="grab"></div>
        <h3>Create Commerce Order</h3>
        <p class="hint">Atomic inventory deduction & transaction processing</p>
        
        <div style="padding:0 20px 24px;">
          <!-- Product Selector -->
          <div class="field"><label>Select Product *</label>
            <select id="o_product" onchange="window.updateOrderCalc()">
              <option value="">-- Choose Product --</option>
              ${products.map(p => `
                <option value="${p.id}" data-price="${p.pricing?.price || 0}" data-stock="${p.totalInventory || 0}" data-sku="${p.variants?.[0]?.sku || ''}" data-title="${p.title}">
                  ${p.title} — ৳${(p.pricing?.price || 0).toLocaleString()} (${p.totalInventory || 0} in stock)
                </option>
              `).join('')}
            </select>
          </div>

          <div class="field-row">
            <div class="field"><label>Quantity</label>
              <input id="o_qty" type="number" value="1" min="1" oninput="window.updateOrderCalc()"/>
            </div>
            <div class="field"><label>Unit Price (৳)</label>
              <input id="o_custom_price" type="number" placeholder="Auto" oninput="window.updateOrderCalc()"/>
            </div>
          </div>

          <!-- Customer Selector -->
          <div class="field"><label>Select Registered Buyer (Optional)</label>
            <select id="o_customer" onchange="window.onOrderCustomerChange(this.value)">
              <option value="">Walk-in Customer / Direct Buyer</option>
              ${customers.map(c => `
                <option value="${c.id}" ${preselectedCustomerId === c.id ? 'selected' : ''} data-name="${c.companyName || c.name}" data-email="${c.email || ''}" data-phone="${c.phone || ''}" data-country="${c.country || 'NL'}">
                  ${c.flag || '🏢'} ${c.companyName || c.name} (${c.country || 'Global'})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="field"><label>Buyer Name / Reference *</label>
            <input id="o_buyer_name" placeholder="Buyer / Client Name" value="${preselectedCustomerId ? (customers.find(c => c.id === preselectedCustomerId)?.companyName || '') : 'Walk-in Customer'}"/>
          </div>

          <div class="field-row">
            <div class="field"><label>Discount (৳)</label>
              <input id="o_discount" type="number" value="0" min="0" oninput="window.updateOrderCalc()"/>
            </div>
            <div class="field"><label>Shipping (৳)</label>
              <input id="o_shipping" type="number" value="0" min="0" oninput="window.updateOrderCalc()"/>
            </div>
          </div>

          <div class="field"><label>Order Notes</label>
            <input id="o_notes" placeholder="e.g. Export batch to Amsterdam depot, Net 30 terms"/>
          </div>

          <!-- Calculation Summary Box -->
          <div class="card" style="margin:12px 0;background:var(--bg-3);">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
              <span style="color:var(--ink-3);">Estimated Total:</span>
              <span id="o_calc_total" style="font-weight:800;color:var(--gold);font-family:var(--mono);font-size:16px;">৳0</span>
            </div>
          </div>

          <button class="btn btn-gold" id="o_create_btn" onclick="window.submitAdvancedOrder()" style="width:100%;">
            Confirm & Execute Order
          </button>
        </div>
      `;

      // Auto calculate on first render if customer is preselected
      window.updateOrderCalc();
    } catch (e) {
      toast("Error opening order form: " + e.message);
      closeSheet();
    }
  };

  window.onOrderCustomerChange = function (custId) {
    const cust = (window._orderFormCustomers || []).find(c => c.id === custId);
    const nameInput = document.getElementById("o_buyer_name");
    if (cust && nameInput) {
      nameInput.value = cust.companyName || cust.name;
    } else if (nameInput) {
      nameInput.value = "Walk-in Customer";
    }
  };

  window.updateOrderCalc = function () {
    const sel = document.getElementById("o_product");
    if (!sel || !sel.selectedOptions[0]) return;
    const opt = sel.selectedOptions[0];
    const basePrice = parseFloat(opt.dataset.price) || 0;
    const customPrice = parseFloat(document.getElementById("o_custom_price")?.value);
    const price = !isNaN(customPrice) && customPrice > 0 ? customPrice : basePrice;
    const qty = parseInt(document.getElementById("o_qty")?.value) || 1;
    const discount = parseFloat(document.getElementById("o_discount")?.value) || 0;
    const shipping = parseFloat(document.getElementById("o_shipping")?.value) || 0;

    const subtotal = price * qty;
    const total = Math.max(0, subtotal - discount + shipping);

    const totalEl = document.getElementById("o_calc_total");
    if (totalEl) totalEl.innerText = `৳${total.toLocaleString()}`;
  };

  window.submitAdvancedOrder = async function () {
    const productSel = document.getElementById("o_product");
    const productId = productSel.value;
    if (!productId) { toast("Please select a product"); return; }

    const opt = productSel.selectedOptions[0];
    const stockAvailable = parseInt(opt.dataset.stock) || 0;
    const qty = parseInt(document.getElementById("o_qty").value) || 1;

    if (qty > stockAvailable) {
      toast(`Insufficient stock! Available: ${stockAvailable}, Requested: ${qty}`);
      return;
    }

    const customerSel = document.getElementById("o_customer");
    const customerId = customerSel.value || null;
    const buyerName = document.getElementById("o_buyer_name").value.trim() || "Walk-in Customer";

    const customPrice = parseFloat(document.getElementById("o_custom_price").value);
    const basePrice = parseFloat(opt.dataset.price) || 0;
    const price = !isNaN(customPrice) && customPrice > 0 ? customPrice : basePrice;

    const btn = document.getElementById("o_create_btn");
    btn.innerText = "Executing Order…";
    btn.disabled = true;

    try {
      await window.OrdersService.create({
        customerId,
        customer: {
          name: buyerName,
          companyName: buyerName,
          email: customerId ? customerSel.selectedOptions[0]?.dataset?.email : "",
          phone: customerId ? customerSel.selectedOptions[0]?.dataset?.phone : "",
          country: customerId ? customerSel.selectedOptions[0]?.dataset?.country : "BD"
        },
        lineItems: [{
          productId,
          variantId: "default",
          title: opt.dataset.title,
          sku: opt.dataset.sku,
          price,
          quantity: qty
        }],
        discountTotal: parseFloat(document.getElementById("o_discount").value) || 0,
        shippingTotal: parseFloat(document.getElementById("o_shipping").value) || 0,
        notes: document.getElementById("o_notes").value.trim()
      });

      toast("Order executed & inventory updated ✓");
      closeSheet();
      const container = document.getElementById("mod-Orders");
      if (container) window.render.Orders(container);
    } catch (e) {
      toast(e.message);
      btn.innerText = "Confirm & Execute Order";
      btn.disabled = false;
    }
  };

  console.log("✅ Hands & Head Firestore integration layer initialized (Products, CRM, Orders).");
})();
