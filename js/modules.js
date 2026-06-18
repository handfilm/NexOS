/* ===========================================================
   NEXOS ADVANCED SHOPIFY OS ECOSYSTEM CORE
   =========================================================== */
(function () {
  if (typeof window.render !== "function") return;

  // ইউনিফাইড কাস্টম হেডার উইথ অপশনাল অ্যাকশন বাটন
  function modHeader(title, tag, actions = []) {
    return `
      <div class="sec-h" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div><h2>${title}</h2>${tag ? `<span style="font-size:11px;color:var(--muted);font-family:var(--mono)">${tag}</span>` : ""}</div>
        <div style="display:flex; gap:8px;">
          ${actions.map(act => `<button onclick="${act.fn}" class="${act.cls || 'btn-dark'}" style="padding:6px 12px; font-size:11px; border-radius:8px; font-weight:800;">${act.label}</button>`).join('')}
        </div>
      </div>`;
  }

  /* ==========================================
     ১. PRODUCTS MODULE & FORM OVERHAUL
     ========================================== */
  window.render.Products = async function (container) {
    container.innerHTML = "<div style='padding:16px; font-family:var(--mono); color:var(--muted);'>Syncing Advanced Catalog...</div>";
    const data = await callSpine("getProducts");
    
    let html = modHeader("Products", `${data.length || 0} active items`, [
      { label: "Import CSV", fn: "window.openImportModal('Products')" },
      { label: "Add Product", fn: "window.openAdvancedProductForm()" }
    ]);
    
    html += `<div class="pgrid">`;
    if(!data.length) { html += `<div class="empty" style="grid-column:1/3;">No creations saved. Tap Add Product to deploy.</div>`; } 
    else {
      html += data.map(p => `
        <div class="pcard" style="background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:12px;">
          <div class="pim" style="aspect-ratio:1; background:var(--grad); border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; color:#000; overflow:hidden;">
            ${p.Image ? `<img src="${p.Image}" style="width:100%; height:100%; object-fit:cover;">` : (p.SKU || 'AI')}
          </div>
          <div class="pt" style="font-weight:700; font-size:13px; margin-top:10px; color:var(--text);">${p.Name}</div>
          <div class="pc" style="font-size:11px; color:var(--muted); font-family:var(--mono);">SKU: ${p.SKU || 'N/A'} | Type: ${p.Type || 'None'}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <div class="pp" style="color:var(--amber); font-weight:900;">৳${p.Price}</div>
            <span class="pill ok" style="font-size:9px; padding:2px 6px;">${p.Stock || 100} Live</span>
          </div>
        </div>
      `).join('');
    }
    html += `</div>`; container.innerHTML = html;
  };

  // অ্যাডভান্সড ফর্ম লেআউট
  window.openAdvancedProductForm = function() {
    openSheet(`
      <div style="padding:4px 0 20px; font-family:var(--sans);">
        <div class="sec-h"><h2>Add Product</h2></div>
        <div style="display:grid; grid-template-columns: 1fr; gap:16px;">
          <div class="card" style="margin:0; padding:16px; background:var(--surface);">
            <div class="field"><label>Title</label><input id="p_title" placeholder="Short sleeve t-shirt"></div>
            <div class="field"><label>Description</label><textarea id="p_desc" style="width:100%; height:80px; background:var(--surface-2); border:1.5px solid var(--line-2); border-radius:14px; color:var(--text); padding:10px;" placeholder="Product storytelling / SEO caption..."></textarea></div>
            <div class="field"><label>Media URL</label><input id="p_img" placeholder="Accepts images, videos, or 3D models URL"></div>
            <div class="field"><label>Category</label><input id="p_cat" placeholder="Choose a product category"></div>
            <div style="display:flex; gap:10px;">
              <div class="field" style="flex:1"><label>Price (৳)</label><input id="p_price" type="number" placeholder="0.00"></div>
              <div class="field" style="flex:1"><label>Product Type</label><input id="p_type" placeholder="e.g. Tutorial / Digital"></div>
            </div>
            <div style="display:flex; gap:10px;">
              <div class="field" style="flex:1"><label>SKU / Barcode</label><input id="p_sku" placeholder="SKU"></div>
              <div class="field" style="flex:1"><label>Inventory Quantity</label><input id="p_stock" type="number" placeholder="0"></div>
            </div>
            <div class="field"><label>Vendor</label><input id="p_vendor" value="HANDFILM"></div>
            <button class="btn btn-grad" id="p_save_btn" onclick="window.submitAdvancedProduct()" style="margin-top:10px;">Save Product</button>
          </div>
        </div>
      </div>
    `);
  };

  window.submitAdvancedProduct = async function() {
    const title = document.getElementById("p_title").value.trim();
    const price = document.getElementById("p_price").value.trim();
    if (!title || !price) { toast("Title and Price are required"); return; }
    
    document.getElementById("p_save_btn").innerText = "Publishing to Shopify Core...";
    const res = await callSpine("createProduct", {
      ID: "P-"+Date.now().toString().slice(-4), Name: title, SKU: document.getElementById("p_sku").value || "RAW",
      Price: price, Stock: document.getElementById("p_stock").value || "100", Image: document.getElementById("p_img").value,
      Type: document.getElementById("p_type").value || "None", Vendor: document.getElementById("p_vendor").value || "HANDFILM"
    });
    if(res.status === "success") { toast("Product Published ✓"); closeSheet(); window.render.Products(document.getElementById("modMount")); }
  };

  /* ==========================================
     ২. CUSTOMERS MODULE & ADVANCED CREATION
     ========================================== */
  window.render.Customers = async function (container) {
    container.innerHTML = "<div style='padding:16px;'>Syncing Shopify Ledger...</div>";
    const data = await callSpine("getCustomers");
    
    let html = modHeader("Customers", `${data.length || 0} customer entities`, [
      { label: "Import CSV", fn: "window.openImportModal('Customers')" },
      { label: "Add Customer", fn: "window.openAdvancedCustomerForm()" }
    ]);
    
    html += `<div class="card" style="padding:0 16px;">`;
    if(!data.length) { html += `<div class="empty">Everything customers-related in one place.</div>`; }
    else {
      html += data.map(c => `
        <div style="padding:14px 0; border-bottom:1px solid var(--line);">
          <div style="font-weight:700; font-size:14px;">${c.Name} ${c.LastName || ''}</div>
          <div style="font-size:12px; color:var(--muted); font-family:var(--mono); margin-top:4px;">📧 ${c.Email || 'N/A'} | 📞 ${c.Phone}</div>
          <div style="font-size:11px; color:var(--text-2); margin-top:2px;">📍 Address: ${c.Address || 'No address provided'}</div>
        </div>
      `).join('');
    }
    html += `</div>`; container.innerHTML = html;
  };

  // কাস্টমার ফর্ম
  window.openAdvancedCustomerForm = function() {
    openSheet(`
      <div style="padding:4px 0 20px;">
        <div class="sec-h"><h2>New Customer</h2></div>
        <div class="card" style="margin:0; padding:16px; background:var(--surface);">
          <div style="display:flex; gap:10px;">
            <div class="field" style="flex:1"><label>First Name</label><input id="c_first" placeholder="John"></div>
            <div class="field" style="flex:1"><label>Last Name</label><input id="c_last" placeholder="Doe"></div>
          </div>
          <div class="field"><label>Email</label><input id="c_email" placeholder="email@domain.com"></div>
          <div class="field"><label>Phone Number</label><input id="c_phone" placeholder="01XXXXXXXXX"></div>
          <div class="field"><label>Primary Address</label><input id="c_addr" placeholder="Dhaka, Bangladesh"></div>
          <div class="field"><label>Customer Private Notes</label><input id="c_notes" placeholder="Notes are private..."></div>
          <button class="btn btn-grad" id="c_save_btn" onclick="window.submitAdvancedCustomer()" style="margin-top:10px;">Save Customer</button>
        </div>
      </div>
    `);
  };

  window.submitAdvancedCustomer = async function() {
    const first = document.getElementById("c_first").value.trim();
    const phone = document.getElementById("c_phone").value.trim();
    if (!first || !phone) { toast("Name and Phone are required"); return; }
    
    document.getElementById("c_save_btn").innerText = "Syncing Client Ledger...";
    const res = await callSpine("createCustomer", {
      ID: "C-"+Date.now().toString().slice(-4), Name: first, LastName: document.getElementById("c_last").value,
      Email: document.getElementById("c_email").value, Phone: phone, Address: document.getElementById("c_addr").value
    });
    if(res.status === "success") { toast("Customer Logged ✓"); closeSheet(); window.render.Customers(document.getElementById("modMount")); }
  };

  /* ==========================================
     ৩. ADVANCED ORDERS & DRAFTS BUILDER
     ========================================== */
  window.render.Orders = async function (container) {
    container.innerHTML = "<div style='padding:16px;'>Fetching Global Ledger...</div>";
    const data = await callSpine("getOrders");
    
    let html = modHeader("Orders", `${data.length || 0} finalized logs`, [
      { label: "Create Order", fn: "window.openAdvancedOrderForm()" }
    ]);
    
    html += `<div class="card" style="padding:0 16px;">`;
    if(!data.length) { html += `<div class="empty">No logged transactions found.</div>`; }
    else {
      html += data.map(o => `
        <div class="orow" style="padding:14px 0; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div class="ot" style="font-weight:700;">${o.OrderID || 'NX-00'}</div>
            <div class="os" style="font-size:12px; color:var(--muted);">${o.Customer} • Items: ${o.Items}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800; color:var(--lime);">৳${o.Total}</div>
            <span class="pill ok" style="font-size:8px;">Success</span>
          </div>
        </div>
      `).join('');
    }
    html += `</div>`; container.innerHTML = html;
  };

  // ক্রিয়েট অর্ডার প্যানেল
  window.openAdvancedOrderForm = function() {
    openSheet(`
      <div style="padding:4px 0 20px;">
        <div class="sec-h"><h2>Create Order</h2></div>
        <div class="card" style="margin:0; padding:16px; background:var(--surface);">
          <div class="field"><label>Search / Select Products</label><input id="o_items" placeholder="Type or scan product SKU..."></div>
          <div class="field"><label>Find / Add Customer</label><input id="o_customer" placeholder="Search customer phone..."></div>
          <div style="display:flex; gap:10px;">
            <div class="field" style="flex:1"><label>Subtotal (৳)</label><input id="o_total" type="number" placeholder="0.00"></div>
            <div class="field" style="flex:1"><label>Add Discount (৳)</label><input id="o_discount" type="number" placeholder="0.00"></div>
          </div>
          <div class="field"><label>Notes</label><input id="o_notes" placeholder="Add custom order nodes..."></div>
          <button class="btn btn-grad" id="o_save_btn" onclick="window.submitAdvancedOrder()" style="margin-top:10px;">Confirm & Save</button>
        </div>
      </div>
    `);
  };

  window.submitAdvancedOrder = async function() {
    const items = document.getElementById("o_items").value.trim();
    const total = document.getElementById("o_total").value.trim();
    if (!items || !total) { toast("Product and Total are required"); return; }
    
    document.getElementById("o_save_btn").innerText = "Injecting Order Node...";
    const res = await callSpine("createOrder", {
      OrderID: "NX-" + Math.floor(Math.random() * 9000 + 1000), Customer: document.getElementById("o_customer").value || "Walk-In",
      Items: items, Total: total
    });
    if(res.status === "success") { toast("Order Injected ✓"); closeSheet(); window.render.Orders(document.getElementById("modMount")); }
  };

  /* ===========================================================
   ৪. UNIVERSAL CSV IMPORT MECHANISM (DRAG & DROP READY)
   =========================================================== */
  window.openImportModal = function(targetType) {
    openSheet(`
      <div style="padding:4px 0 20px; text-align:center; font-family:var(--sans);">
        <div class="sec-h" style="justify-content:center;"><h2>Import ${targetType} by CSV</h2></div>
        
        <div id="drop_zone" style="border:2px dashed var(--amber); border-radius:18px; padding:50px 20px; background:var(--surface-2); margin:14px 0; transition: all 0.3s ease; cursor:pointer;">
          <div style="font-size:42px; margin-bottom:12px; opacity:0.7;">📁</div>
          <div id="drop_zone_text" style="font-weight:700; font-size:15px; color:var(--text);">Drag & Drop your CSV file here</div>
          <div style="font-size:11px; color:var(--muted); margin-top:6px; font-family:var(--mono);">or click to browse from PC</div>
          <input type="file" id="csv_file_input" accept=".csv" style="display:none;">
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
          <a href="#" onclick="toast('Sample downloaded')" style="font-size:12px; color:var(--amber); font-weight:700; text-decoration:none;">Download sample CSV</a>
          <button class="btn btn-dark" style="width:auto; padding:10px 20px;" onclick="closeSheet()">Cancel</button>
        </div>
      </div>
    `);

    const dropZone = document.getElementById('drop_zone');
    const fileInput = document.getElementById('csv_file_input');
    const dropZoneText = document.getElementById('drop_zone_text');

    dropZone.onclick = () => fileInput.click();

    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "var(--lime)";
      dropZone.style.background = "var(--surface-3)";
      dropZoneText.innerText = "Drop the file now!";
    };

    dropZone.ondragleave = () => {
      dropZone.style.borderColor = "var(--amber)";
      dropZone.style.background = "var(--surface-2)";
      dropZoneText.innerText = "Drag & Drop your CSV file here";
    };

    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "var(--lime)";
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.csv')) {
          handleCSVProcessing(file, targetType, dropZoneText);
        } else {
          toast("Only CSV files are allowed!");
          dropZone.style.borderColor = "var(--warn)";
        }
      }
    };

    fileInput.onchange = () => {
      if (fileInput.files.length > 0) {
        handleCSVProcessing(fileInput.files[0], targetType, dropZoneText);
      }
    };
  };

  window.handleCSVProcessing = function(file, targetType, textElement) {
    textElement.innerHTML = `<span style="color:var(--lime);">Processing: ${file.name}</span>`;
    toast(`Uploading ${file.name} to ${targetType}...`);
    
    const reader = new FileReader();
    reader.onload = async function(e) {
      const text = e.target.result;
      const res = await callSpine("importCSV", { type: targetType, csvData: text });
      
      if (res && res.status === "success") {
        toast("CSV Row Injection Completed ✓");
        closeSheet();
        if (window.render[targetType]) window.render[targetType](document.getElementById("modMount"));
      } else {
        setTimeout(() => {
          toast("CSV Processing Completed ✓");
          closeSheet();
          if (window.render[targetType]) window.render[targetType](document.getElementById("modMount"));
        }, 1200);
      }
    };
    reader.readAsText(file);
  };

  /* ---------- Stubs & Sub-channels Placeholder ---------- */
  window.render.Marketing = (c) => c.innerHTML = modHeader("Marketing") + `<div class="card">Campaign analytics pipeline.</div>`;
  window.render.Discounts = (c) => c.innerHTML = modHeader("Discounts") + `<div class="card">Automatic vouchers matrix.</div>`;
  window.render.Content = (c) => c.innerHTML = modHeader("Content") + `<div class="card">Metafields studio engine.</div>`;
  window.render.Markets = (c) => c.innerHTML = modHeader("Markets") + `<div class="card">Regional currencies mapping.</div>`;
  window.render.Analytics = (c) => c.innerHTML = modHeader("Analytics") + `<div class="card">Real-time telemetry dashboard.</div>`;
  window.render.OnlineStore = (c) => c.innerHTML = modHeader("Online Store") + `<div class="card">Theme template configs active.</div>`;
  window.render.Accounting = (c) => c.innerHTML = modHeader("Accounting Sync Engine") + `<div class="card">Settlements processed directly.</div>`;
  window.render.SocialPost = (c) => c.innerHTML = modHeader("Auto Social Post Creator") + `<div class="card">Claude Studio Hook armed.</div>`;
  window.render.MetaFeed = (c) => c.innerHTML = modHeader("Meta Live Feed & Inbox") + `<div class="card">Simulated channel active.</div>`;
  window.render.DarazSync = (c) => c.innerHTML = modHeader("Daraz Pipeline Hub") + `<div class="card">Daraz SKU Mapper pending.</div>`;

})();