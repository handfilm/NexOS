/* ═══════════════════════════════════════════════════════════════
   NexOS v5 — js/firebase-modules-patch.js
   এই ফাইলটি js/modules.js এর পরে লোড হবে।
   এটা mock ডেটার window.render.Products / CRM / Orders কে
   আসল Firestore সার্ভিস (ProductsService / CustomersService / OrdersService)
   দিয়ে override করে — পুরনো js/modules.js ফাইলে হাত না দিয়েই।
   ═══════════════════════════════════════════════════════════════ */

(function () {

  function modHeader(title, tag, actions = []) {
    const btns = actions.map(a => `<button onclick="${a.fn}" style="padding:6px 11px;font-size:9px;border:1px solid var(--wire-hard);background:transparent;color:var(--gold-dim);font-family:var(--sans);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;cursor:pointer;border-radius:6px;">${a.label}</button>`).join('');
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 20px 8px;"><div><h3>${title}</h3>${tag ? `<p class="hint" style="margin:2px 0 0;">${tag}</p>` : ""}</div><div style="display:flex;gap:6px;margin-top:4px;">${btns}</div></div>`;
  }
  function loading(msg = "লোড হচ্ছে…") { return `<div style="padding:20px;font-family:var(--mono);color:var(--ink-3);font-size:10px;letter-spacing:2px;text-transform:uppercase;">${msg}</div>`; }

  /* ═══════════════════════════════════════════════════════════
     PRODUCTS — Firestore-backed
     ═══════════════════════════════════════════════════════════ */
  window.render.Products = async function (container) {
    container.innerHTML = loading("ক্যাটালগ লোড হচ্ছে…");
    const { items } = await window.ProductsService.list({ status: null });
    window._lastProductsCache = items; // এডিট ফর্মে prefill করার জন্য

    container.innerHTML = modHeader("Products", `${items.length}টা প্রোডাক্ট`, [
      { label: "Import CSV", fn: "window.openImportModal('Products')" },
      { label: "+ Add", fn: "window.openAdvancedProductForm()" }
    ]) + `<div class="pgrid">${items.length ? items.map(p => `
      <div class="pcard" style="position:relative;">
        <div class="pim" onclick="window.openAdvancedProductForm('${p.id}')">${p.images?.[0]?.url ? `<img src="${p.images[0].url}">` : (p.title || '').slice(0, 3).toUpperCase()}</div>
        <div class="pt">${p.title}</div>
        <div class="pc">SKU: ${p.variants?.[0]?.sku || 'N/A'} · <span class="pill ${p.status === 'active' ? 'ok' : p.status === 'draft' ? 'amber' : 'warn'}" style="font-size:8px;">${p.status}</span></div>
        <div class="pp">৳${p.pricing?.price || 0}</div>
        <div class="p-stock">▪ ${p.totalInventory || 0} in stock</div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button class="btn btn-dark btn-sm" onclick="window.openAdvancedProductForm('${p.id}')">Edit</button>
          <button class="btn btn-dark btn-sm" onclick="window.archiveProduct('${p.id}')">Archive</button>
        </div>
      </div>`).join('') : `<div class="empty" style="grid-column:1/3;">কোনো প্রোডাক্ট নেই — "+ Add" চেপে প্রথমটা যোগ করুন</div>`}</div>`;
  };

  /* ── + Add / Edit একই ফর্ম, productId থাকলে Edit মোড ── */
  window.openAdvancedProductForm = function (productId = null) {
    const p = productId ? (window._lastProductsCache || []).find(x => x.id === productId) : null;
    openSheet(`<h3>${p ? 'Edit Product' : 'Add Product'}</h3><div style="padding:0 20px 20px;">
      <input type="hidden" id="p_id" value="${p?.id || ''}"/>
      <div class="field"><label>Title</label><input id="p_title" placeholder="Full-Grain Leather Wallet" value="${p?.title || ''}"/></div>
      <div class="field"><label>Description</label><textarea id="p_desc" placeholder="Product description / SEO caption…">${p?.description || ''}</textarea></div>
      <div class="field"><label>Media URL</label><input id="p_img" placeholder="https://cdn.../image.jpg" value="${p?.images?.[0]?.url || ''}"/></div>
      <div class="field-row">
        <div class="field"><label>Price (৳)</label><input id="p_price" type="number" placeholder="0.00" value="${p?.pricing?.price || ''}"/></div>
        <div class="field"><label>Product Type</label><input id="p_type" placeholder="Wallet" value="${p?.productType || ''}"/></div>
      </div>
      <div class="field-row">
        <div class="field"><label>SKU</label><input id="p_sku" placeholder="FGW-001" value="${p?.variants?.[0]?.sku || ''}"/></div>
        <div class="field"><label>Stock Qty</label><input id="p_stock" type="number" placeholder="0" value="${p?.totalInventory ?? ''}"/></div>
      </div>
      <div class="field"><label>Vendor</label><input id="p_vendor" value="${p?.vendor || 'HANDFILM'}"/></div>
      <div class="field"><label>Status</label>
        <select id="p_status">
          <option value="draft" ${p?.status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="active" ${p?.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="archived" ${p?.status === 'archived' ? 'selected' : ''}>Archived</option>
        </select>
      </div>
      <button class="btn btn-gold" id="p_save_btn" onclick="window.submitAdvancedProduct()" style="margin-top:8px;">${p ? 'Save Changes' : 'Publish Product'}</button>
    </div>`);
  };

  window.submitAdvancedProduct = async function () {
    const id = document.getElementById("p_id").value;
    const title = document.getElementById("p_title").value.trim();
    const price = document.getElementById("p_price").value.trim();
    if (!title || !price) { toast("Title এবং Price লাগবে"); return; }
    const btn = document.getElementById("p_save_btn");
    btn.innerText = id ? "Saving…" : "Publishing…";

    const payload = {
      title,
      description: document.getElementById("p_desc").value,
      status: document.getElementById("p_status").value,
      vendor: document.getElementById("p_vendor").value || "HANDFILM",
      productType: document.getElementById("p_type").value,
      price: parseFloat(price),
      sku: document.getElementById("p_sku").value,
      stock: parseInt(document.getElementById("p_stock").value) || 0,
      images: document.getElementById("p_img").value ? [{ url: document.getElementById("p_img").value, alt: title, position: 0 }] : []
    };

    try {
      if (id) {
        await window.ProductsService.update(id, {
          title: payload.title, description: payload.description, status: payload.status,
          vendor: payload.vendor, productType: payload.productType,
          pricing: { price: payload.price, currency: "BDT" },
          images: payload.images,
          variants: [{ id: "default", title: "Default", sku: payload.sku, price: payload.price, inventoryQty: payload.stock, availableForSale: true }]
        });
        toast("প্রোডাক্ট আপডেট হয়েছে ✓");
      } else {
        await window.ProductsService.create(payload);
        toast("প্রোডাক্ট পাবলিশ হয়েছে ✓");
      }
      closeSheet();
      openAppModule('Products');
    } catch (e) {
      toast("সমস্যা হয়েছে: " + e.message);
      btn.innerText = id ? "Save Changes" : "Publish Product";
    }
  };

  window.archiveProduct = async function (productId) {
    if (!confirm("এই প্রোডাক্টটা আর্কাইভ করবেন?")) return;
    await window.ProductsService.archive(productId);
    toast("আর্কাইভ হয়েছে ✓");
    openAppModule('Products');
  };

  /* ═══════════════════════════════════════════════════════════
     CRM / CUSTOMERS — Firestore-backed
     ═══════════════════════════════════════════════════════════ */
  window.render.CRM = async function (container) {
    container.innerHTML = loading("বায়ার তালিকা লোড হচ্ছে…");
    const { items } = await window.CustomersService.list();
    window._lastCustomersCache = items;

    container.innerHTML = modHeader("Buyer CRM", `${items.length} company profiles`, [
      { label: "+ Add Company", fn: "window.openAdvancedCustomerForm()" }
    ]) + (items.length ? items.map(c => `
      <div class="company-card" onclick="window.openCompanyDetail('${c.id}')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="font-size:22px;">${c.flag || '🏢'}</div>
          <div>
            <div class="company-name">${c.companyName || c.name}</div>
            <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">${c.country || '—'} · ${c.currency || 'EUR'}</div>
          </div>
          <div style="margin-left:auto;"><span class="pill ok">${c.totalOrders || 0} orders</span></div>
        </div>
        <div class="company-meta">
          <div class="company-tag">MOQ: ${c.moq || 0} units</div>
          <div class="company-tag">${c.paymentTerms || 'Net 30'}</div>
          <div class="company-tag">${c.email || c.contactPerson || '—'}</div>
        </div>
      </div>
    `).join('') : `<div class="empty">কোনো বায়ার নেই — "+ Add Company" চেপে যোগ করুন</div>`) + `<div style="height:8px;"></div>`;
  };
  window.render.Customers = window.render.CRM;

  window.openCompanyDetail = async function (customerId) {
    openSheet(loading("লোড হচ্ছে…"));
    const { customer: c, orders } = await window.CustomersService.getWithOrders(customerId);
    if (!c) { toast("পাওয়া যায়নি"); closeSheet(); return; }
    document.getElementById("sheet").innerHTML = `<div class="grab"></div>
      <h3>${c.flag || '🏢'} ${c.companyName || c.name}</h3>
      <p class="hint">${c.country || '—'} · ${c.paymentTerms || 'Net 30'} · ${c.currency || 'EUR'}</p>
      <div style="padding:0 20px;">
        <div class="bento-grid" style="padding:0 0 12px;">
          <div class="bento-card"><div class="bento-label">MOQ</div><div class="bento-value" style="font-size:30px;">${c.moq || 0}</div></div>
          <div class="bento-card"><div class="bento-label">Orders</div><div class="bento-value" style="font-size:30px;">${c.totalOrders || 0}</div></div>
          <div class="bento-card"><div class="bento-label">Total Spent</div><div class="bento-value" style="font-size:22px;">৳${(c.totalSpent || 0).toLocaleString()}</div></div>
        </div>
        <div class="card" style="margin:0 0 10px;"><div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);margin-bottom:4px;letter-spacing:1px;text-transform:uppercase;">Contact</div><div style="font-size:13px;color:var(--ink);">${c.email || '—'} · ${c.phone || '—'}</div></div>
        <div class="sec-h" style="padding:6px 0;"><span class="sec-h-label">সাম্প্রতিক অর্ডার</span></div>
        <div class="orders-container" style="margin-bottom:12px;">${orders.length ? orders.map(o => `<div class="orow"><div class="othumb">NX</div><div class="om"><div class="ot">${o.orderNumber} · ৳${o.total}</div><div class="os">${(o.lineItems || []).map(li => li.title).join(', ')}</div></div><div class="pill ${o.status === 'completed' ? 'ok' : 'amber'}">${o.status}</div></div>`).join('') : `<div class="empty">এখনো কোনো অর্ডার নেই</div>`}</div>
        <button class="btn btn-gold" style="margin-bottom:8px;" onclick="openAppModule('QuoteBuilder')">Create Quote →</button>
        <button class="btn btn-dark" onclick="window.open('mailto:${c.email}')">Send Email</button>
      </div>`;
  };

  window.openAdvancedCustomerForm = function () {
    openSheet(`<h3>New Company</h3><div style="padding:0 20px 20px;">
      <div class="field"><label>Company Name</label><input id="c_company" placeholder="Leder GmbH"/></div>
      <div class="field-row">
        <div class="field"><label>Country</label><select id="c_country"><option value="NL">🇳🇱 Netherlands</option><option value="DE">🇩🇪 Germany</option><option value="GB">🇬🇧 UK</option><option value="ES">🇪🇸 Spain</option><option value="JP">🇯🇵 Japan</option></select></div>
        <div class="field"><label>Currency</label><select id="c_currency"><option>EUR</option><option>GBP</option><option>JPY</option><option>USD</option></select></div>
      </div>
      <div class="field"><label>Contact Email</label><input id="c_email" placeholder="buyer@company.eu"/></div>
      <div class="field"><label>Contact Phone</label><input id="c_phone" placeholder="+31 ..."/></div>
      <div class="field-row">
        <div class="field"><label>MOQ (Units)</label><input id="c_moq" type="number" placeholder="100"/></div>
        <div class="field"><label>Payment Terms</label><select id="c_terms"><option>Net 30</option><option>Net 45</option><option>Net 60</option></select></div>
      </div>
      <div class="field"><label>Product Interest</label><input id="c_interest" placeholder="Wallets, Belts…"/></div>
      <button class="btn btn-gold" id="c_save_btn" onclick="window.submitAdvancedCustomer()" style="margin-top:8px;">Save Company</button>
    </div>`);
  };

  window.submitAdvancedCustomer = async function () {
    const name = document.getElementById("c_company").value.trim();
    if (!name) { toast("Company name লাগবে"); return; }
    const btn = document.getElementById("c_save_btn");
    btn.innerText = "Saving…";
    const flags = { NL: "🇳🇱", DE: "🇩🇪", GB: "🇬🇧", ES: "🇪🇸", JP: "🇯🇵" };
    const country = document.getElementById("c_country").value;
    try {
      await window.CustomersService.create({
        companyName: name, name,
        email: document.getElementById("c_email").value,
        phone: document.getElementById("c_phone").value,
        country, flag: flags[country] || "",
        currency: document.getElementById("c_currency").value,
        moq: document.getElementById("c_moq").value,
        paymentTerms: document.getElementById("c_terms").value,
        tags: document.getElementById("c_interest").value ? [document.getElementById("c_interest").value] : []
      });
      toast("Company Saved ✓");
      closeSheet();
      openAppModule('CRM');
    } catch (e) {
      toast("সমস্যা: " + e.message);
      btn.innerText = "Save Company";
    }
  };

  /* ═══════════════════════════════════════════════════════════
     ORDERS — Firestore-backed, Products ও Customers এর সাথে সংযুক্ত
     ═══════════════════════════════════════════════════════════ */
  window.render.Orders = async function (container) {
    container.innerHTML = loading("অর্ডার লোড হচ্ছে…");
    const { items } = await window.OrdersService.list();
    container.innerHTML = modHeader("Orders", `${items.length} order${items.length !== 1 ? 's' : ''}`, [
      { label: "+ Create", fn: "window.openAdvancedOrderForm()" }
    ]) + `<div class="orders-container" style="margin:0 20px;">${items.length ? items.map(o => `
      <div class="orow" onclick="window.openOrderDetail('${o.id}')" style="cursor:pointer;">
        <div class="othumb">NX</div>
        <div class="om"><div class="ot">${o.orderNumber} · ৳${o.total}</div><div class="os">${o.customerSnapshot?.name || 'Walk-in'} · ${(o.lineItems || []).map(li => li.title).join(', ')}</div></div>
        <div class="pill ${o.status === 'completed' ? 'ok' : o.status === 'cancelled' ? 'warn' : 'amber'}">${o.status.toUpperCase()}</div>
      </div>`).join('') : '<div class="empty">No orders in pipeline</div>'}</div><div style="height:8px;"></div>`;
  };

  window.openOrderDetail = async function (orderId) {
    const o = await window.OrdersService.get(orderId);
    if (!o) return;
    openSheet(`<h3>${o.orderNumber}</h3><p class="hint">${o.customerSnapshot?.name || 'Walk-in'} · ৳${o.total}</p>
      <div style="padding:0 20px 20px;">
        <div class="card" style="margin-bottom:10px;">
          ${o.lineItems.map(li => `<div class="spec-row" style="display:flex;justify-content:space-between;padding:4px 0;"><span>${li.title} × ${li.quantity}</span><span>৳${li.lineTotal}</span></div>`).join('')}
        </div>
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
        <button class="btn btn-gold" style="margin-bottom:8px;" onclick="window.saveOrderStatus('${o.id}')">Update Status</button>
        ${o.status !== 'cancelled' ? `<button class="btn btn-dark" onclick="window.cancelOrder('${o.id}')">Cancel Order (স্টক ফেরত দেবে)</button>` : ''}
      </div>`);
  };

  window.saveOrderStatus = async function (orderId) {
    await window.OrdersService.updateStatus(orderId, {
      paymentStatus: document.getElementById("ord_pay").value,
      fulfillmentStatus: document.getElementById("ord_fulfill").value
    });
    toast("অর্ডার আপডেট হয়েছে ✓");
    closeSheet();
    openAppModule('Orders');
  };

  window.cancelOrder = async function (orderId) {
    if (!confirm("অর্ডার বাতিল করবেন? স্টক ফেরত যোগ হয়ে যাবে।")) return;
    await window.OrdersService.cancel(orderId);
    toast("অর্ডার বাতিল হয়েছে, স্টক ফেরত দেওয়া হয়েছে ✓");
    closeSheet();
    openAppModule('Orders');
  };

  /* ── Create Order: প্রোডাক্ট ও কাস্টমার Firestore থেকে ড্রপডাউনে লোড হয় ── */
  window.openAdvancedOrderForm = async function () {
    openSheet(loading("প্রোডাক্ট ও বায়ার লোড হচ্ছে…"));
    const [{ items: products }, { items: customers }] = await Promise.all([
      window.ProductsService.list({ status: "active" }),
      window.CustomersService.list()
    ]);
    window._orderFormProducts = products;

    document.getElementById("sheet").innerHTML = `<div class="grab"></div><h3>Create Order</h3><div style="padding:0 20px 20px;">
      <div class="field"><label>Product</label>
        <select id="o_product">
          <option value="">-- নির্বাচন করুন --</option>
          ${products.map(p => `<option value="${p.id}" data-price="${p.pricing?.price || 0}" data-sku="${p.variants?.[0]?.sku || ''}" data-title="${p.title}">${p.title} — ৳${p.pricing?.price || 0} (${p.totalInventory || 0} in stock)</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Quantity</label><input id="o_qty" type="number" value="1" min="1"/></div>
      <div class="field"><label>Buyer / Company</label>
        <select id="o_customer">
          <option value="">Walk-in (নিচে নাম দিন)</option>
          ${customers.map(c => `<option value="${c.id}" data-name="${c.companyName || c.name}" data-email="${c.email || ''}" data-phone="${c.phone || ''}" data-country="${c.country || ''}" data-currency="${c.currency || 'BDT'}">${c.companyName || c.name}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Walk-in Name (যদি উপরে বায়ার সিলেক্ট না করেন)</label><input id="o_walkin_name" placeholder="Walk-in customer name"/></div>
      <div class="field-row">
        <div class="field"><label>Discount (৳)</label><input id="o_discount" type="number" value="0"/></div>
        <div class="field"><label>Shipping (৳)</label><input id="o_shipping" type="number" value="0"/></div>
      </div>
      <div class="field"><label>Notes</label><input id="o_notes" placeholder="Order notes…"/></div>
      <button class="btn btn-gold" id="o_save_btn" onclick="window.submitAdvancedOrder()" style="margin-top:8px;">Confirm & Create</button>
    </div>`;
  };

  window.submitAdvancedOrder = async function () {
    const productSel = document.getElementById("o_product");
    const productId = productSel.value;
    const qty = parseInt(document.getElementById("o_qty").value) || 1;
    if (!productId) { toast("একটা প্রোডাক্ট বেছে নিন"); return; }

    const opt = productSel.selectedOptions[0];
    const customerSel = document.getElementById("o_customer");
    const cOpt = customerSel.selectedOptions[0];
    const customerId = customerSel.value || null;
    const walkinName = document.getElementById("o_walkin_name").value.trim();

    if (!customerId && !walkinName) { toast("বায়ার বেছে নিন অথবা Walk-in নাম দিন"); return; }

    const btn = document.getElementById("o_save_btn");
    btn.innerText = "Creating…";
    try {
      await window.OrdersService.create({
        customerId,
        customer: customerId
          ? { name: cOpt.dataset.name, email: cOpt.dataset.email, phone: cOpt.dataset.phone, country: cOpt.dataset.country, currency: cOpt.dataset.currency }
          : { name: walkinName, currency: "BDT" },
        lineItems: [{
          productId, variantId: "default",
          title: opt.dataset.title, sku: opt.dataset.sku,
          price: parseFloat(opt.dataset.price), quantity: qty
        }],
        discountTotal: parseFloat(document.getElementById("o_discount").value) || 0,
        shippingTotal: parseFloat(document.getElementById("o_shipping").value) || 0,
        notes: document.getElementById("o_notes").value
      });
      toast("অর্ডার তৈরি হয়েছে, স্টক আপডেট হয়েছে ✓");
      closeSheet();
      openAppModule('Orders');
    } catch (e) {
      toast(e.message);
      btn.innerText = "Confirm & Create";
    }
  };

  console.log("✅ NexOS Firestore মডিউল প্যাচ লোড হয়েছে — Products, CRM, Orders এখন লাইভ ডেটাবেজের সাথে সংযুক্ত।");
})();
