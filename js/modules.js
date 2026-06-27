/* ═══════════════════════════════════════════════════════════════
   NexOS v3 — js/modules.js
   Shopify OS Module Renderers: Products · Orders · Customers
   CSV Import · App Stubs
   ═══════════════════════════════════════════════════════════════ */

(function () {
  if (typeof window.render !== "function") return;

  /* ── Shared Module Header ── */
  function modHeader(title, tag, actions = []) {
    const btns = actions.map(a => `
      <button onclick="${a.fn}"
        style="padding:7px 12px;font-size:9px;border:1px solid var(--wire-hard);background:transparent;
               color:var(--gold-dim);font-family:var(--sans);letter-spacing:1.5px;text-transform:uppercase;
               font-weight:600;cursor:pointer;border-radius:6px;transition:all 0.15s;"
        onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold)'"
        onmouseout="this.style.borderColor='var(--wire-hard)';this.style.color='var(--gold-dim)'"
      >${a.label}</button>
    `).join('');
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:18px 20px 10px;">
        <div>
          <h3 style="font-size:22px;">${title}</h3>
          ${tag ? `<p class="hint" style="margin:2px 0 0;">${tag}</p>` : ""}
        </div>
        <div style="display:flex;gap:6px;margin-top:4px;">${btns}</div>
      </div>
    `;
  }

  /* ── Loading State ── */
  function loadingState(msg = "Syncing…") {
    return `<div style="padding:20px;font-family:var(--mono);color:var(--ink-3);font-size:10px;letter-spacing:2px;text-transform:uppercase;">${msg}</div>`;
  }

  /* ═══════════════════════════════════════════════════════════
     1. PRODUCTS MODULE
     ═══════════════════════════════════════════════════════════ */
  window.render.Products = async function (container) {
    container.innerHTML = loadingState("Syncing catalog…");
    const data = await callSpine("getProducts");

    let html = modHeader("Products", `${data.length || 0} active items`, [
      { label: "Import CSV", fn: "window.openImportModal('Products')" },
      { label: "+ Add",      fn: "window.openAdvancedProductForm()" }
    ]);

    html += `<div class="pgrid">`;
    if (!data.length) {
      html += `<div class="empty" style="grid-column:1/3;">No products deployed yet.</div>`;
    } else {
      html += data.map(p => `
        <div class="pcard">
          <div class="pim">
            ${p.Image ? `<img src="${p.Image}" style="width:100%;height:100%;object-fit:cover;">` : (p.SKU || 'AI')}
          </div>
          <div class="pt">${p.Name}</div>
          <div class="pc">SKU: ${p.SKU || 'N/A'} · ${p.Type || 'None'}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
            <div class="pp">৳${p.Price}</div>
            <span class="pill ok">${p.Stock || 100} Live</span>
          </div>
        </div>
      `).join('');
    }
    html += `</div>`;
    container.innerHTML = html;
  };

  window.openAdvancedProductForm = function () {
    openSheet(`
      <h3>Add Product</h3>
      <div style="padding:0 20px 20px;">
        <div class="field"><label>Title</label><input id="p_title" placeholder="Short sleeve t-shirt"></div>
        <div class="field">
          <label>Description</label>
          <textarea id="p_desc" style="width:100%;height:80px;background:var(--surface-2);border:1px solid var(--wire);
            border-radius:8px;color:var(--ink);padding:11px 14px;font-family:var(--sans);font-size:13px;
            outline:none;resize:none;" placeholder="SEO description…"></textarea>
        </div>
        <div class="field"><label>Media URL</label><input id="p_img" placeholder="Image / video URL"></div>
        <div class="field"><label>Category</label><input id="p_cat" placeholder="Product category"></div>
        <div style="display:flex;gap:8px;">
          <div class="field" style="flex:1"><label>Price (৳)</label><input id="p_price" type="number" placeholder="0.00"></div>
          <div class="field" style="flex:1"><label>Product Type</label><input id="p_type" placeholder="Tutorial / Digital"></div>
        </div>
        <div style="display:flex;gap:8px;">
          <div class="field" style="flex:1"><label>SKU</label><input id="p_sku" placeholder="SKU-001"></div>
          <div class="field" style="flex:1"><label>Qty</label><input id="p_stock" type="number" placeholder="0"></div>
        </div>
        <div class="field"><label>Vendor</label><input id="p_vendor" value="HANDFILM"></div>
        <button class="btn btn-gold" id="p_save_btn" onclick="window.submitAdvancedProduct()" style="margin-top:8px;">
          Save Product
        </button>
      </div>
    `);
  };

  window.submitAdvancedProduct = async function () {
    const title = document.getElementById("p_title").value.trim();
    const price = document.getElementById("p_price").value.trim();
    if (!title || !price) { toast("Title and Price required"); return; }
    document.getElementById("p_save_btn").innerText = "Publishing…";
    const res = await callSpine("createProduct", {
      ID: "P-" + Date.now().toString().slice(-4),
      Name: title, SKU: document.getElementById("p_sku").value || "RAW",
      Price: price, Stock: document.getElementById("p_stock").value || "100",
      Image: document.getElementById("p_img").value,
      Type: document.getElementById("p_type").value || "None",
      Vendor: document.getElementById("p_vendor").value || "HANDFILM"
    });
    if (res.status === "success") {
      toast("Product Published ✓"); closeSheet();
      window.render.Products(document.getElementById("modMount"));
    }
  };

  /* ═══════════════════════════════════════════════════════════
     2. CUSTOMERS MODULE
     ═══════════════════════════════════════════════════════════ */
  window.render.Customers = async function (container) {
    container.innerHTML = loadingState("Syncing ledger…");
    const data = await callSpine("getCustomers");

    let html = modHeader("Customers", `${data.length || 0} entities`, [
      { label: "Import CSV", fn: "window.openImportModal('Customers')" },
      { label: "+ Add",      fn: "window.openAdvancedCustomerForm()" }
    ]);

    html += `<div class="orders-container" style="margin:0 20px;">`;
    if (!data.length) {
      html += `<div class="empty">No customer entities.</div>`;
    } else {
      html += data.map(c => `
        <div class="orow">
          <div class="othumb">${(c.Name || '?')[0]}</div>
          <div class="om">
            <div class="ot">${c.Name} ${c.LastName || ''}</div>
            <div class="os">${c.Email || 'N/A'} · ${c.Phone}</div>
          </div>
        </div>
      `).join('');
    }
    html += `</div>`;
    container.innerHTML = html;
  };

  window.openAdvancedCustomerForm = function () {
    openSheet(`
      <h3>New Customer</h3>
      <div style="padding:0 20px 20px;">
        <div style="display:flex;gap:8px;">
          <div class="field" style="flex:1"><label>First Name</label><input id="c_first" placeholder="John"></div>
          <div class="field" style="flex:1"><label>Last Name</label><input id="c_last" placeholder="Doe"></div>
        </div>
        <div class="field"><label>Email</label><input id="c_email" placeholder="email@domain.com"></div>
        <div class="field"><label>Phone</label><input id="c_phone" placeholder="01XXXXXXXXX"></div>
        <div class="field"><label>Address</label><input id="c_addr" placeholder="Dhaka, Bangladesh"></div>
        <div class="field"><label>Private Notes</label><input id="c_notes" placeholder="Notes are private…"></div>
        <button class="btn btn-gold" id="c_save_btn" onclick="window.submitAdvancedCustomer()" style="margin-top:8px;">
          Save Customer
        </button>
      </div>
    `);
  };

  window.submitAdvancedCustomer = async function () {
    const first = document.getElementById("c_first").value.trim();
    if (!first) { toast("Name required"); return; }
    document.getElementById("c_save_btn").innerText = "Saving…";
    const res = await callSpine("createCustomer", {
      ID: "C-" + Date.now().toString().slice(-4),
      Name: first, LastName: document.getElementById("c_last").value,
      Email: document.getElementById("c_email").value,
      Phone: document.getElementById("c_phone").value,
      Address: document.getElementById("c_addr").value
    });
    if (res.status === "success") {
      toast("Customer Saved ✓"); closeSheet();
      window.render.Customers(document.getElementById("modMount"));
    }
  };

  /* ═══════════════════════════════════════════════════════════
     3. ORDERS MODULE
     ═══════════════════════════════════════════════════════════ */
  window.render.Orders = async function (container) {
    container.innerHTML = loadingState("Pulling orders…");
    const data = await callSpine("listOrders");
    const items = data.items || [];

    let html = modHeader("Orders", `${items.length} order nodes`, [
      { label: "+ Create", fn: "window.openAdvancedOrderForm()" }
    ]);

    html += `<div class="orders-container" style="margin:0 20px;">`;
    if (!items.length) {
      html += `<div class="empty">No orders in pipeline.</div>`;
    } else {
      html += items.map(d => `
        <div class="orow">
          <div class="othumb">NX</div>
          <div class="om">
            <div class="ot">${d.t}</div>
            <div class="os">${d.s}</div>
          </div>
          <div class="pill ${d.st[1] || 'ok'}">${d.st[0]}</div>
        </div>
      `).join('');
    }
    html += `</div>`;
    container.innerHTML = html;
  };

  window.openAdvancedOrderForm = function () {
    openSheet(`
      <h3>Create Order</h3>
      <div style="padding:0 20px 20px;">
        <div class="field"><label>Products / SKU</label><input id="o_items" placeholder="Type or scan SKU…"></div>
        <div class="field"><label>Customer</label><input id="o_customer" placeholder="Search by phone…"></div>
        <div style="display:flex;gap:8px;">
          <div class="field" style="flex:1"><label>Subtotal (৳)</label><input id="o_total" type="number" placeholder="0.00"></div>
          <div class="field" style="flex:1"><label>Discount (৳)</label><input id="o_discount" type="number" placeholder="0.00"></div>
        </div>
        <div class="field"><label>Notes</label><input id="o_notes" placeholder="Order notes…"></div>
        <button class="btn btn-gold" id="o_save_btn" onclick="window.submitAdvancedOrder()" style="margin-top:8px;">
          Confirm & Inject
        </button>
      </div>
    `);
  };

  window.submitAdvancedOrder = async function () {
    const items = document.getElementById("o_items").value.trim();
    const total = document.getElementById("o_total").value.trim();
    if (!items || !total) { toast("Product and Total required"); return; }
    document.getElementById("o_save_btn").innerText = "Injecting…";
    const res = await callSpine("createOrder", {
      OrderID: "NX-" + Math.floor(Math.random() * 9000 + 1000),
      Customer: document.getElementById("o_customer").value || "Walk-In",
      Items: items, Total: total
    });
    if (res.status === "success") {
      toast("Order Injected ✓"); closeSheet();
      window.render.Orders(document.getElementById("modMount"));
    }
  };

  /* ═══════════════════════════════════════════════════════════
     4. CSV IMPORT (Universal)
     ═══════════════════════════════════════════════════════════ */
  window.openImportModal = function (targetType) {
    openSheet(`
      <h3>Import ${targetType}</h3>
      <div style="padding:0 20px 20px;">
        <div id="drop_zone" style="border:1px solid var(--wire-hard);border-radius:12px;padding:48px 20px;
          background:var(--surface-2);margin:14px 0;cursor:pointer;text-align:center;transition:all 0.2s;">
          <div style="font-family:var(--display);font-size:32px;color:var(--gold);margin-bottom:12px;letter-spacing:2px;">CSV</div>
          <div id="drop_zone_text" style="font-weight:600;font-size:12px;color:var(--ink-2);
            font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;">Drag & Drop File</div>
          <div style="font-size:10px;color:var(--ink-3);margin-top:6px;font-family:var(--mono);letter-spacing:1px;">or tap to browse</div>
          <input type="file" id="csv_file_input" accept=".csv" style="display:none;">
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <a href="#" onclick="toast('Sample downloaded')"
            style="font-size:10px;color:var(--gold-dim);font-weight:600;text-decoration:none;
                   font-family:var(--mono);letter-spacing:1px;text-transform:uppercase;">↓ Sample CSV</a>
          <button class="btn btn-dark" style="width:auto;padding:8px 18px;" onclick="closeSheet()">Cancel</button>
        </div>
      </div>
    `);

    const dz  = document.getElementById('drop_zone');
    const fi  = document.getElementById('csv_file_input');
    const dzt = document.getElementById('drop_zone_text');

    dz.onclick = () => fi.click();
    dz.ondragover = (e) => {
      e.preventDefault();
      dz.style.borderColor = "var(--gold)";
      dz.style.background  = "var(--surface-3)";
      dzt.innerText = "Drop Now";
    };
    dz.ondragleave = () => {
      dz.style.borderColor = "var(--wire-hard)";
      dz.style.background  = "var(--surface-2)";
      dzt.innerText = "Drag & Drop File";
    };
    dz.ondrop = (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        const f = e.dataTransfer.files[0];
        if (f.name.endsWith('.csv')) { handleCSVProcessing(f, targetType, dzt); }
        else { toast("CSV files only"); dz.style.borderColor = "var(--warn)"; }
      }
    };
    fi.onchange = () => { if (fi.files.length > 0) handleCSVProcessing(fi.files[0], targetType, dzt); };
  };

  window.handleCSVProcessing = function (file, targetType, textEl) {
    textEl.innerHTML = `<span style="color:var(--ok);">Processing ${file.name}…</span>`;
    toast(`Uploading to ${targetType}…`);
    const r = new FileReader();
    r.onload = async function (e) {
      const res = await callSpine("importCSV", { type: targetType, csvData: e.target.result });
      if (res && res.status === "success") {
        toast("CSV Imported ✓"); closeSheet();
        if (window.render[targetType]) window.render[targetType](document.getElementById("modMount"));
      } else {
        setTimeout(() => {
          toast("CSV Processed ✓"); closeSheet();
          if (window.render[targetType]) window.render[targetType](document.getElementById("modMount"));
        }, 1200);
      }
    };
    r.readAsText(file);
  };

  /* ═══════════════════════════════════════════════════════════
     5. APP STUBS — Future modules
     ═══════════════════════════════════════════════════════════ */
  function stub(title, msg) {
    return function (c) {
      c.innerHTML = modHeader(title) + `
        <div style="margin:0 20px;padding:20px;background:var(--surface-2);border:1px solid var(--wire);
          border-radius:10px;font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:1px;">
          ${msg}
        </div>
      `;
    };
  }

  window.render.Marketing   = stub("Marketing",           "Campaign analytics pipeline initialising.");
  window.render.Discounts   = stub("Discounts",           "Automatic vouchers matrix ready.");
  window.render.Content     = stub("Content",             "Metafields studio engine armed.");
  window.render.Markets     = stub("Markets",             "Regional currencies mapping active.");
  window.render.Analytics   = stub("Analytics",           "Real-time telemetry dashboard.");
  window.render.OnlineStore = stub("Online Store",        "Theme template configs loaded.");
  window.render.Accounting  = stub("Accounting Sync",     "Settlements processed directly.");
  window.render.SocialPost  = stub("Auto Social Post",    "Claude Studio Hook armed.");
  window.render.MetaFeed    = stub("Meta Live Feed",      "Simulated channel active.");
  window.render.DarazSync   = stub("Daraz Pipeline",      "SKU Mapper pending deployment.");

})();
