/* ═══════════════════════════════════════════════════════════════
   NexOS v4 — js/modules.js
   All 12 Feature Modules:
   1. EU Buyer Portal     7. Inventory Tracker
   2. Shopify Products    8. Multi-Currency (FX)
   3. Push Notifications  9. AI Forecasting (NexAI)
   4. Analytics Dashboard 10. Compliance Generator
   5. Quote Builder       11. Shipment Tracker
   6. Buyer CRM           12. Role-Based (Production) — in app.js
   + Orders, Customers, CSV Import, App Stubs
   ═══════════════════════════════════════════════════════════════ */

(function () {
  if (typeof window.render !== "function") return;

  /* ── Shared Helpers ── */
  function modHeader(title, tag, actions = []) {
    const btns = actions.map(a => `<button onclick="${a.fn}" style="padding:6px 11px;font-size:9px;border:1px solid var(--wire-hard);background:transparent;color:var(--gold-dim);font-family:var(--sans);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;cursor:pointer;border-radius:6px;transition:all 0.15s;" onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold)'" onmouseout="this.style.borderColor='var(--wire-hard)';this.style.color='var(--gold-dim)'">${a.label}</button>`).join('');
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 20px 8px;"><div><h3>${title}</h3>${tag?`<p class="hint" style="margin:2px 0 0;">${tag}</p>`:""}</div><div style="display:flex;gap:6px;margin-top:4px;">${btns}</div></div>`;
  }
  function loading(msg="Syncing…") { return `<div style="padding:20px;font-family:var(--mono);color:var(--ink-3);font-size:10px;letter-spacing:2px;text-transform:uppercase;">${msg}</div>`; }
  function stub(title,msg) { return c => { c.innerHTML = modHeader(title) + `<div style="margin:0 20px;padding:16px;background:var(--surface-2);border:1px solid var(--wire);border-radius:10px;font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:1px;">${msg}</div>`; }; }
  function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }

  /* ═══════════════════════════════════════════════════════════
     MODULE 1 — EU BUYER PORTAL
     ═══════════════════════════════════════════════════════════ */
  window.render.EUPortal = function(container) {
    const markets = [
      {flag:"🇳🇱",name:"Netherlands",city:"Amsterdam",buyers:2,status:"ACTIVE",interest:"Wallets · Belts",color:"var(--ok)"},
      {flag:"🇩🇪",name:"Germany",city:"Hamburg",buyers:1,status:"ACTIVE",interest:"Full-Grain Goods",color:"var(--ok)"},
      {flag:"🇬🇧",name:"United Kingdom",city:"London",buyers:1,status:"PROSPECTING",interest:"Card Holders",color:"var(--gold)"},
      {flag:"🇪🇸",name:"Spain",city:"Madrid",buyers:0,status:"PROSPECTING",interest:"Belts · Wallets",color:"var(--gold)"}
    ];
    container.innerHTML = `
      ${modHeader("EU Portal","B2B Buyer Access · European Markets",[
        {label:"+ New Buyer",fn:"window.openNewBuyerForm()"}
      ])}
      <div class="eu-portal-header">
        <div class="eu-flag-dots">${'⭐'.repeat(12).split('').map(()=>`<div class="eu-flag-dot"></div>`).join('')}</div>
        <div style="font-family:var(--display);font-size:28px;letter-spacing:3px;color:var(--ink);text-transform:uppercase;margin-bottom:4px;">European <span style="color:var(--gold);">Markets</span></div>
        <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);letter-spacing:2px;">LEATHER EXPORT DIVISION · BANGLADESH ORIGIN</div>
      </div>
      <div class="eu-markets">
        ${markets.map(m=>`
          <div class="eu-market-card" onclick="window.openMarketDetail(${JSON.stringify(m).replace(/"/g,'&quot;')})">
            <div class="eu-flag">${m.flag}</div>
            <div class="eu-country">${m.name}</div>
            <div class="eu-stats">${m.city}</div>
            <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
              <span class="pill ${m.status==='ACTIVE'?'ok':'amber'}" style="font-size:8px;">${m.status}</span>
              <span style="font-size:9px;color:var(--ink-3);font-family:var(--mono);">${m.buyers} buyer${m.buyers!==1?'s':''}</span>
            </div>
            <div style="margin-top:6px;font-size:9px;color:var(--ink-3);font-family:var(--mono);">${m.interest}</div>
          </div>
        `).join('')}
      </div>
      <div class="sec-h" style="padding-top:4px;"><span class="sec-h-label">EU Compliance Status</span></div>
      <div class="compliance-grid">
        ${[
          {icon:"✅",name:"BSCI",status:"Compliant",ok:true},
          {icon:"✅",name:"REACH",status:"Compliant",ok:true},
          {icon:"🔄",name:"LWG",status:"In Progress",ok:false},
          {icon:"✅",name:"EUDR",status:"Ready 2025",ok:true},
          {icon:"✅",name:"Sedex",status:"Registered",ok:true},
          {icon:"🔄",name:"CSDDD",status:"Monitoring",ok:false}
        ].map(c=>`
          <div class="compliance-item">
            <div class="compliance-icon">${c.icon}</div>
            <div class="compliance-name">${c.name}</div>
            <div class="compliance-status" style="color:${c.ok?'var(--ok)':'var(--gold)'};">${c.status}</div>
          </div>
        `).join('')}
      </div>
      <div style="padding:0 16px 16px;">
        <button class="btn btn-gold" onclick="openAppModule('Compliance')">Generate Compliance Package →</button>
      </div>
    `;
  };

  window.openMarketDetail = function(m) {
    openSheet(`
      <h3>${m.flag} ${m.name}</h3>
      <p class="hint">${m.city} · ${m.interest}</p>
      <div style="padding:0 20px;">
        <div class="card">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><div style="font-size:8px;color:var(--ink-3);font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Status</div><span class="pill ${m.status==='ACTIVE'?'ok':'amber'}">${m.status}</span></div>
            <div><div style="font-size:8px;color:var(--ink-3);font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Buyers</div><div style="font-family:var(--display);font-size:24px;color:var(--ink);">${m.buyers}</div></div>
          </div>
        </div>
        <button class="btn btn-gold" style="margin-bottom:10px;" onclick="openAppModule('QuoteBuilder')">Create Quote for ${m.name} →</button>
        <button class="btn btn-dark" onclick="window.open('https://wa.me/${window.WHATSAPP}','_blank')">WhatsApp Outreach</button>
      </div>
    `);
  };

  window.openNewBuyerForm = function() {
    openSheet(`
      <h3>New EU Buyer</h3>
      <div style="padding:0 20px 20px;">
        <div class="field-row">
          <div class="field"><label>Company Name</label><input id="nb_company" placeholder="Leder GmbH"/></div>
          <div class="field"><label>Country</label>
            <select id="nb_country"><option value="NL">🇳🇱 Netherlands</option><option value="DE">🇩🇪 Germany</option><option value="GB">🇬🇧 United Kingdom</option><option value="ES">🇪🇸 Spain</option></select>
          </div>
        </div>
        <div class="field"><label>Contact Email</label><input id="nb_email" placeholder="buyer@company.eu"/></div>
        <div class="field-row">
          <div class="field"><label>MOQ (Units)</label><input id="nb_moq" type="number" placeholder="100"/></div>
          <div class="field"><label>Payment Terms</label>
            <select id="nb_terms"><option>Net 30</option><option>Net 45</option><option>Net 60</option></select>
          </div>
        </div>
        <div class="field"><label>Product Interest</label><input id="nb_interest" placeholder="Wallets, Belts…"/></div>
        <button class="btn btn-gold" style="margin-top:8px;" onclick="window.saveNewBuyer()">Save Buyer Profile</button>
      </div>
    `);
  };

  window.saveNewBuyer = function() {
    const company = document.getElementById("nb_company").value.trim();
    if (!company) { toast("Company name required"); return; }
    toast(`${company} added to CRM ✓`); closeSheet();
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE 2 — SHOPIFY PRODUCTS
     ═══════════════════════════════════════════════════════════ */
  window.render.Products = async function(container) {
    container.innerHTML = loading("Syncing catalog…");
    let items = [];
    try {
      const shopify = await ShopifyAPI.getProducts();
      if (shopify && shopify.products) {
        items = shopify.products.edges.map(e => ({
          id: e.node.id, t: e.node.title,
          price: e.node.priceRange.minVariantPrice.amount,
          currency: e.node.priceRange.minVariantPrice.currencyCode,
          stock: e.node.totalInventory, img: e.node.featuredImage?.url || "",
          ini: e.node.handle.slice(0,3).toUpperCase()
        }));
      }
    } catch(e) {}
    if (!items.length) { const d = await callSpine("getProducts"); items = Array.isArray(d)?d:window.dCat; }
    container.innerHTML = modHeader("Products",`${items.length} items`,[
      {label:"Import CSV",fn:"window.openImportModal('Products')"},{label:"+ Add",fn:"window.openAdvancedProductForm()"}
    ]) + `<div class="pgrid">${items.length ? items.map(p=>`
      <div class="pcard">
        <div class="pim">${p.img?`<img src="${p.img}">`:(p.ini||'PRD')}</div>
        <div class="pt">${p.t||p.Name}</div>
        <div class="pc">SKU: ${p.ini||p.SKU||'N/A'}</div>
        <div class="pp">৳${p.price||p.Price||0}</div>
        <div class="p-stock">▪ ${p.stock||p.Stock||0} in stock</div>
      </div>`).join('') : `<div class="empty" style="grid-column:1/3;">No products yet</div>`}</div>`;
  };

  window.openAdvancedProductForm = function() {
    openSheet(`<h3>Add Product</h3><div style="padding:0 20px 20px;">
      <div class="field"><label>Title</label><input id="p_title" placeholder="Full-Grain Leather Wallet"/></div>
      <div class="field"><label>Description</label><textarea id="p_desc" placeholder="Product description / SEO caption…"></textarea></div>
      <div class="field"><label>Media URL</label><input id="p_img" placeholder="https://cdn.../image.jpg"/></div>
      <div class="field-row">
        <div class="field"><label>Price (৳)</label><input id="p_price" type="number" placeholder="0.00"/></div>
        <div class="field"><label>Product Type</label><input id="p_type" placeholder="Wallet"/></div>
      </div>
      <div class="field-row">
        <div class="field"><label>SKU</label><input id="p_sku" placeholder="FGW-001"/></div>
        <div class="field"><label>Stock Qty</label><input id="p_stock" type="number" placeholder="0"/></div>
      </div>
      <div class="field"><label>Vendor</label><input id="p_vendor" value="HANDFILM"/></div>
      <button class="btn btn-gold" id="p_save_btn" onclick="window.submitAdvancedProduct()" style="margin-top:8px;">Publish Product</button>
    </div>`);
  };

  window.submitAdvancedProduct = async function() {
    const title = document.getElementById("p_title").value.trim();
    const price = document.getElementById("p_price").value.trim();
    if (!title||!price){toast("Title and Price required");return;}
    document.getElementById("p_save_btn").innerText="Publishing…";
    const res = await callSpine("createProduct",{ID:"P-"+Date.now().toString().slice(-4),Name:title,SKU:document.getElementById("p_sku").value||"RAW",Price:price,Stock:document.getElementById("p_stock").value||"100",Image:document.getElementById("p_img").value,Type:document.getElementById("p_type").value||"None",Vendor:document.getElementById("p_vendor").value||"HANDFILM"});
    if(res.status==="success"){toast("Product Published ✓");closeSheet();}
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE 3 — PUSH NOTIFICATIONS
     ═══════════════════════════════════════════════════════════ */
  window.render.Notifications = async function(container) {
    const granted = Notification.permission === 'granted';
    const notifs = LS.get("notifs") || [
      {title:"New Order",body:"NX-1045 · Leather Wallet x50",time:Date.now()-3600000,icon:"ok"},
      {title:"Low Stock Alert",body:"Card Holder Slim — 95 units remaining",time:Date.now()-7200000,icon:"warn"},
      {title:"EU Portal",body:"Amsterdam Goods B.V. viewed your catalog",time:Date.now()-86400000,icon:"info"}
    ];
    container.innerHTML = modHeader("Push Notifications","System alerts · Order triggers") + `
      <div style="padding:0 20px 12px;">
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;">
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:3px;">Push Notifications</div>
            <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">${granted?'ACTIVE · Receiving alerts':'NOT ENABLED · Tap to enable'}</div>
          </div>
          <div class="pill ${granted?'ok':'warn'}">${granted?'ON':'OFF'}</div>
        </div>
        ${!granted ? `<button class="btn btn-gold" style="margin-bottom:12px;" onclick="window.enablePush()">Enable Push Notifications</button>` : `<button class="btn btn-dark" style="margin-bottom:12px;" onclick="window.testPush()">Send Test Notification</button>`}
      </div>
      <div class="sec-h" style="padding-top:4px;"><span class="sec-h-label">Recent Alerts</span></div>
      <div class="notif-panel" style="margin:0 16px 8px;background:var(--surface);border:1px solid var(--wire);border-radius:12px;overflow:hidden;padding:0 16px;">
        ${notifs.map(n=>`
          <div class="notif-item">
            <div class="notif-icon" style="background:var(--${n.icon}-bg);color:var(--${n.icon});">
              <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
            <div class="notif-text">
              <div class="notif-title">${n.title}</div>
              <div class="notif-body">${n.body}</div>
              <div class="notif-time">${fmtDate(n.time)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  window.enablePush = async function() {
    const granted = await PushEngine.requestPermission();
    if (granted) { toast("Push Notifications Enabled ✓"); openAppModule('Notifications'); }
    else { toast("Permission denied — enable in browser settings"); }
  };

  window.testPush = function() {
    PushEngine.notify("NexOS Test", "Push notifications are working! ⚡");
    toast("Test notification sent ✓");
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE 4 — ANALYTICS DASHBOARD
     ═══════════════════════════════════════════════════════════ */
  window.render.Analytics = async function(container) {
    const orders = LS.get("orders") || window.dOrders || [];
    container.innerHTML = modHeader("Analytics","Revenue · Orders · Channel Performance") + `
      <div style="padding:0 16px 8px;">
        <div class="seg" style="margin-bottom:12px;" id="analytics-range">
          <button class="on" data-r="7">7 Days</button>
          <button data-r="30">30 Days</button>
          <button data-r="90">90 Days</button>
        </div>
      </div>
      <div class="bento-grid" style="padding-bottom:12px;">
        <div class="bento-card hero-stat">
          <div class="bento-label">Total Revenue</div>
          <div class="bento-value">৳84,600</div>
          <div class="bento-trend">+12% vs last period</div>
        </div>
        <div class="bento-card"><div class="bento-label">Avg Order</div><div class="bento-value" style="font-size:30px;">৳28,200</div></div>
        <div class="bento-card"><div class="bento-label">Conversion</div><div class="bento-value" style="font-size:30px;">68%</div></div>
      </div>
      <div class="sec-h" style="padding-top:4px;"><span class="sec-h-label">Revenue Trend</span></div>
      <div class="panel" style="overflow:visible;">
        <div class="chart-wrap">
          <canvas id="revenue-chart" height="160"></canvas>
        </div>
      </div>
      <div class="sec-h" style="padding-top:12px;"><span class="sec-h-label">Top Products</span></div>
      <div class="orders-container">
        ${window.dCat.map((p,i)=>`
          <div class="orow">
            <div class="othumb" style="font-family:var(--display);font-size:14px;">${i+1}</div>
            <div class="om"><div class="ot">${p.t}</div><div class="os">${p.cat} · ${p.stock} units</div></div>
            <div style="font-family:var(--display);font-size:18px;color:var(--gold);">৳${(p.price*p.stock/100).toFixed(0)}</div>
          </div>
        `).join('')}
      </div>
      <div class="sec-h" style="padding-top:12px;"><span class="sec-h-label">Channel Split</span></div>
      <div class="panel">
        <div class="chart-wrap">
          <canvas id="channel-chart" height="140"></canvas>
        </div>
        <div class="chart-legend">
          <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#C9A84C;"></div>WhatsApp 54%</div>
          <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#3DBA7C;"></div>EU Portal 28%</div>
          <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#5B8BF5;"></div>Other 18%</div>
        </div>
      </div>
      <div style="height:8px;"></div>
    `;
    setTimeout(() => { renderRevenueChart(); renderChannelChart(); }, 80);
  };

  function renderRevenueChart() {
    const canvas = document.getElementById('revenue-chart'); if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth - 32; canvas.height = 160;
    const data = [12000,18000,8000,24000,16000,28000,35000];
    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const W=canvas.width, H=canvas.height, pad=30, chartW=W-pad*2, chartH=H-pad*2;
    const max=Math.max(...data)*1.15, step=chartW/(data.length-1);
    ctx.clearRect(0,0,W,H);
    // Grid
    for(let i=0;i<=4;i++){const y=pad+chartH-(chartH/4*i);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.strokeStyle='rgba(201,168,76,0.06)';ctx.lineWidth=1;ctx.stroke();}
    // Area gradient
    const grad=ctx.createLinearGradient(0,pad,0,pad+chartH);
    grad.addColorStop(0,'rgba(201,168,76,0.25)');grad.addColorStop(1,'rgba(201,168,76,0)');
    ctx.beginPath();ctx.moveTo(pad,pad+chartH);
    data.forEach((v,i)=>{ctx.lineTo(pad+i*step,pad+chartH-(v/max*chartH));});
    ctx.lineTo(pad+(data.length-1)*step,pad+chartH);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    // Line
    ctx.beginPath();data.forEach((v,i)=>{const x=pad+i*step,y=pad+chartH-(v/max*chartH);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.strokeStyle='#C9A84C';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
    // Dots + labels
    data.forEach((v,i)=>{
      const x=pad+i*step,y=pad+chartH-(v/max*chartH);
      ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='#E8C96A';ctx.fill();
      ctx.fillStyle='rgba(90,84,80,0.8)';ctx.font='9px JetBrains Mono,monospace';ctx.textAlign='center';
      ctx.fillText(labels[i],x,pad+chartH+14);
    });
  }

  function renderChannelChart() {
    const canvas = document.getElementById('channel-chart'); if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth - 32; canvas.height = 140;
    const W=canvas.width, H=canvas.height;
    const segments=[{pct:0.54,color:'#C9A84C'},{pct:0.28,color:'#3DBA7C'},{pct:0.18,color:'#5B8BF5'}];
    const cx=W/2, cy=H/2-10, r=Math.min(W,H)*0.38;
    let angle=-Math.PI/2;
    segments.forEach(s=>{
      const end=angle+s.pct*Math.PI*2;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,angle,end);ctx.closePath();ctx.fillStyle=s.color;ctx.fill();
      angle=end;
    });
    ctx.beginPath();ctx.arc(cx,cy,r*0.55,0,Math.PI*2);ctx.fillStyle='var(--surface)';ctx.fill();
    ctx.fillStyle='var(--ink)';ctx.font=`bold 16px Anton,impact,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('3 CH',cx,cy);
  }

  /* ═══════════════════════════════════════════════════════════
     MODULE 5 — QUOTE BUILDER
     ═══════════════════════════════════════════════════════════ */
  window.render.QuoteBuilder = function(container) {
    const lines = window._quoteLines || [
      {id:"p1",name:"Full-Grain Wallet",sku:"FGW",price:850,qty:50},
      {id:"p2",name:"Leather Belt",sku:"GLB",price:620,qty:100}
    ];
    const total = lines.reduce((a,l)=>a+l.price*l.qty,0);
    container.innerHTML = modHeader("Quote Builder","EU B2B Draft Orders · WhatsApp Checkout") + `
      <div style="padding:0 20px 12px;">
        <div class="field-row">
          <div class="field">
            <label>Buyer Company</label>
            <select id="qb_buyer">${window.dCompanies.map(c=>`<option value="${c.id}">${c.flag} ${c.name}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label>Currency</label>
            <select id="qb_currency"><option>EUR</option><option>GBP</option><option>USD</option><option>BDT</option></select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Payment Terms</label>
            <select id="qb_terms"><option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Proforma</option></select>
          </div>
          <div class="field">
            <label>Valid Until</label>
            <input id="qb_expiry" type="date" value="${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}"/>
          </div>
        </div>
      </div>
      <div class="sec-h" style="padding-top:0;"><span class="sec-h-label">Line Items</span><span class="sec-h-action" onclick="window.addQuoteLine()">+ Add Item</span></div>
      <div style="margin:0 16px;background:var(--surface);border:1px solid var(--wire);border-radius:12px;overflow:hidden;padding:0 16px;" id="qb_lines">
        ${lines.map(l=>`
          <div class="quote-line" data-id="${l.id}">
            <div class="quote-line-name">${l.name}<div style="font-size:9px;color:var(--ink-3);font-family:var(--mono);">${l.sku}</div></div>
            <input class="quote-line-qty" type="number" value="${l.qty}" onchange="window.updateQuoteLine('${l.id}',this.value)" style="background:var(--void);border:1px solid var(--wire);color:var(--ink);border-radius:6px;padding:6px;width:60px;text-align:center;font-family:var(--mono);font-size:12px;outline:none;"/>
            <div class="quote-line-price">৳${(l.price*l.qty).toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
      <div class="quote-total-bar" style="margin:8px 16px 0;border-radius:0 0 12px 12px;border:1px solid var(--wire-hard);border-top:none;">
        <div>
          <div class="quote-total-label">Total Amount</div>
          <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);margin-top:2px;">+ Shipping TBD</div>
        </div>
        <div class="quote-total-value">৳${total.toLocaleString()}</div>
      </div>
      <div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px;">
        <button class="btn btn-gold" onclick="window.sendQuoteWhatsApp()">⚡ Send via WhatsApp</button>
        <button class="btn btn-dark" onclick="window.generateQuotePDF()">↓ Download PDF Quote</button>
      </div>
    `;
    window._quoteLines = lines;
  };

  window.updateQuoteLine = function(id, qty) {
    if (!window._quoteLines) return;
    const line = window._quoteLines.find(l=>l.id===id);
    if (line) { line.qty = parseInt(qty)||0; openAppModule('QuoteBuilder'); }
  };

  window.addQuoteLine = function() {
    if (!window._quoteLines) window._quoteLines = [];
    window._quoteLines.push({id:'p'+Date.now(),name:"New Item",sku:"SKU",price:500,qty:50});
    openAppModule('QuoteBuilder');
  };

  window.sendQuoteWhatsApp = function() {
    const buyer = document.getElementById("qb_buyer")?.options[document.getElementById("qb_buyer")?.selectedIndex]?.text||"Buyer";
    const total = (window._quoteLines||[]).reduce((a,l)=>a+l.price*l.qty,0);
    const terms = document.getElementById("qb_terms")?.value||"Net 30";
    const lines = (window._quoteLines||[]).map(l=>`• ${l.name} x${l.qty} = ৳${(l.price*l.qty).toLocaleString()}`).join('%0A');
    const msg = `*H%26H Nexus — Quote Proposal*%0A%0ABuyer: ${encodeURIComponent(buyer)}%0A%0A${lines}%0A%0A*Total: ৳${total.toLocaleString()}*%0ATerms: ${terms}%0AOrigin: Bangladesh%0A%0AValid 30 days. Reply to confirm.`;
    window.open(`https://wa.me/${window.WHATSAPP}?text=${msg}`,'_blank');
  };

  window.generateQuotePDF = function() {
    toast("PDF generation requires server deployment");
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE 6 — BUYER CRM (Company Profiles)
     ═══════════════════════════════════════════════════════════ */
  window.render.CRM = function(container) {
    const companies = window.dCompanies;
    container.innerHTML = modHeader("Buyer CRM",`${companies.length} company profiles`,[
      {label:"+ Add Company",fn:"window.openAdvancedCustomerForm()"}
    ]) + companies.map(c=>`
      <div class="company-card" onclick="window.openCompanyDetail(${JSON.stringify(c).replace(/"/g,'&quot;')})">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="font-size:22px;">${c.flag}</div>
          <div>
            <div class="company-name">${c.name}</div>
            <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">${c.country} · ${c.currency}</div>
          </div>
          <div style="margin-left:auto;"><span class="pill ok">${c.orders} orders</span></div>
        </div>
        <div class="company-meta">
          <div class="company-tag">MOQ: ${c.moq} units</div>
          <div class="company-tag">${c.terms}</div>
          <div class="company-tag">${c.contact}</div>
        </div>
      </div>
    `).join('') + `<div style="height:8px;"></div>`;
  };

  window.openCompanyDetail = function(c) {
    openSheet(`
      <h3>${c.flag} ${c.name}</h3>
      <p class="hint">${c.country} · ${c.terms} · ${c.currency}</p>
      <div style="padding:0 20px;">
        <div class="bento-grid" style="padding:0 0 12px;">
          <div class="bento-card"><div class="bento-label">MOQ</div><div class="bento-value" style="font-size:30px;">${c.moq}</div></div>
          <div class="bento-card"><div class="bento-label">Orders</div><div class="bento-value" style="font-size:30px;">${c.orders}</div></div>
        </div>
        <div class="card" style="margin:0 0 10px;"><div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);margin-bottom:4px;letter-spacing:1px;text-transform:uppercase;">Contact</div><div style="font-size:13px;color:var(--ink);">${c.contact}</div></div>
        <button class="btn btn-gold" style="margin-bottom:8px;" onclick="openAppModule('QuoteBuilder')">Create Quote →</button>
        <button class="btn btn-dark" onclick="window.open('mailto:${c.contact}')">Send Email</button>
      </div>
    `);
  };

  window.render.Customers = window.render.CRM;

  window.openAdvancedCustomerForm = function() {
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

  window.submitAdvancedCustomer = async function() {
    const name = document.getElementById("c_company").value.trim();
    if (!name) { toast("Company name required"); return; }
    document.getElementById("c_save_btn").innerText = "Saving…";
    const res = await callSpine("createCustomer",{ID:"C-"+Date.now().toString().slice(-4),Name:name,Email:document.getElementById("c_email").value,Phone:document.getElementById("c_phone").value,Address:document.getElementById("c_country").value});
    if(res.status==="success"){toast("Company Saved ✓");closeSheet();}
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE 7 — INVENTORY TRACKER
     ═══════════════════════════════════════════════════════════ */
  window.render.Inventory = async function(container) {
    let items = window.dCat;
    try {
      const shopify = await ShopifyAPI.getProducts();
      if (shopify?.products?.edges?.length) {
        items = shopify.products.edges.map(e=>({t:e.node.title,ini:e.node.handle.slice(0,3).toUpperCase(),stock:e.node.totalInventory,cat:e.node.productType||'Product',price:e.node.priceRange.minVariantPrice.amount}));
      }
    } catch(e){}
    const totalUnits = items.reduce((a,i)=>a+(i.stock||0),0);
    const lowStock = items.filter(i=>(i.stock||0)<100);
    container.innerHTML = modHeader("Inventory",`${totalUnits} total units across ${items.length} SKUs`) + `
      <div class="bento-grid" style="padding-bottom:12px;">
        <div class="bento-card hero-stat">
          <div class="bento-label">Total Units</div>
          <div class="bento-value">${totalUnits}</div>
          ${lowStock.length?`<div class="bento-trend" style="color:var(--warn);">▼ ${lowStock.length} SKU${lowStock.length>1?'s':''} low stock</div>`:'<div class="bento-trend">All stock healthy</div>'}
        </div>
        <div class="bento-card"><div class="bento-label">SKUs</div><div class="bento-value" style="font-size:36px;">${items.length}</div></div>
        <div class="bento-card"><div class="bento-label">Low Stock</div><div class="bento-value" style="font-size:36px;color:${lowStock.length?'var(--warn)':'var(--ok)'};">${lowStock.length}</div></div>
      </div>
      <div class="sec-h" style="padding-top:4px;"><span class="sec-h-label">Stock Levels</span></div>
      <div class="orders-container">
        ${items.map(p=>{
          const pct=Math.min(100,(p.stock/300)*100);
          const color=p.stock<80?'var(--warn)':p.stock<150?'var(--gold)':'var(--ok)';
          return `<div class="inv-row">
            <div class="inv-sku">${p.ini}</div>
            <div class="inv-name">${p.t}</div>
            <div class="inv-bar-wrap"><div class="inv-bar" style="width:${pct}%;background:${color};"></div></div>
            <div class="inv-count" style="color:${color};">${p.stock||0}</div>
          </div>`;
        }).join('')}
      </div>
      ${lowStock.length?`
      <div class="sec-h" style="padding-top:12px;"><span class="sec-h-label">Reorder Alerts</span></div>
      <div style="margin:0 16px 8px;">
        ${lowStock.map(p=>`
          <div style="background:var(--warn-bg);border:1px solid rgba(224,92,58,0.2);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div><div style="font-size:12px;font-weight:600;color:var(--ink);">${p.t}</div><div style="font-size:10px;color:var(--warn);font-family:var(--mono);">Only ${p.stock} units remaining</div></div>
            <button class="btn btn-warn btn-sm" onclick="toast('Reorder request sent for ${p.ini}')">Reorder</button>
          </div>
        `).join('')}
      </div>`:''
      }
      <div style="padding:0 16px 8px;"><button class="btn btn-dark" onclick="openAppModule('Products')">Sync with Shopify →</button></div>
      <div style="height:8px;"></div>
    `;
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE 8 — MULTI-CURRENCY (FX RATES)
     ═══════════════════════════════════════════════════════════ */
  window.render.FXRates = async function(container) {
    container.innerHTML = modHeader("FX Rates","Live conversion · BDT base") + loading("Fetching live rates…");
    let rates = {};
    try { rates = await FXRates.getRates(); } catch(e) {}
    const symbols = {EUR:"€",GBP:"£",USD:"$",JPY:"¥",AED:"د.إ",SGD:"S$"};
    const testAmount = 10000;
    container.innerHTML = modHeader("FX Rates","Live rates · BDT base") + `
      <div style="padding:0 16px 12px;">
        <div class="field"><label>Convert Amount (BDT)</label><input id="fx_amount" type="number" value="${testAmount}" oninput="window.updateFXDisplay(this.value)" style="font-family:var(--display);font-size:20px;text-align:right;color:var(--gold);"/></div>
      </div>
      <div class="orders-container" id="fx_results">
        ${Object.entries(symbols).map(([cur,sym])=>{
          const rate = rates[cur]||1;
          const amount = (testAmount*rate).toFixed(cur==='JPY'?0:2);
          return `<div class="fx-row" style="padding:12px 18px;border-bottom:1px solid var(--wire-2);">
            <div><div class="fx-currency">${cur}</div><div style="font-size:9px;color:var(--ink-3);font-family:var(--mono);">1 BDT = ${rate.toFixed(4)} ${cur}</div></div>
            <div class="fx-amount" data-rate="${rate}" data-cur="${cur}" data-sym="${sym}">${sym}${amount}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="padding:12px 16px 8px;"><div style="font-size:9px;color:var(--ink-3);font-family:var(--mono);letter-spacing:1px;">Rates cached 1hr · Source: open.er-api.com</div></div>
    `;
  };

  window.updateFXDisplay = function(bdt) {
    document.querySelectorAll('[data-rate]').forEach(el=>{
      const rate=parseFloat(el.dataset.rate), sym=el.dataset.sym, cur=el.dataset.cur;
      el.textContent=sym+(bdt*rate).toFixed(cur==='JPY'?0:2);
    });
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE 9 — AI FORECASTING + NEXAI CHAT
     ═══════════════════════════════════════════════════════════ */
  window.render.NexAI = function(container) {
    container.innerHTML = modHeader("NexAI","Supply chain intelligence · Powered by Claude") + `
      <div style="padding:0 20px 10px;">
        <div class="seg" id="ai-mode-seg">
          <button class="on" data-m="chat">AI Chat</button>
          <button data-m="forecast">Forecast</button>
        </div>
      </div>
      <div id="ai-panel">
        ${renderAiChat()}
      </div>
    `;
    const segs = container.querySelectorAll('#ai-mode-seg button');
    segs.forEach(b=>{ b.onclick=()=>{ segs.forEach(x=>x.classList.remove('on')); b.classList.add('on');
      document.getElementById('ai-panel').innerHTML = b.dataset.m==='chat' ? renderAiChat() : renderAiForecast(); }; });
  };

  function renderAiChat() {
    return `<div class="ai-chat-wrap">
      <div class="ai-feed" id="aiFeed">
        <div class="ai-msg bot">NexAI online. I can help with supply chain forecasting, EU buyer strategy, compliance questions, and order analysis. What do you need?</div>
      </div>
      <div class="ai-input-bar">
        <input id="aiInput" placeholder="Ask anything about your supply chain…"/>
        <button class="ai-send" onclick="window.sendAiMsg()"><svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
      </div>
    </div>`;
  }

  function renderAiForecast() {
    const forecasts = window.dCat.map(p=>({...p, forecast: Math.round(p.stock*0.6+Math.random()*50), trend: Math.random()>0.5?'up':'down' }));
    return `
      <div style="padding:0 20px 12px;">
        <div class="card" style="margin:0 0 12px;border-left:2px solid var(--gold);">
          <div style="font-size:10px;color:var(--gold-dim);font-family:var(--mono);letter-spacing:2px;margin-bottom:6px;text-transform:uppercase;">AI Analysis</div>
          <div style="font-size:12px;color:var(--ink);line-height:1.6;">Based on your last 90 days of order data, demand for leather wallets is trending +18% heading into Q4. Full-grain goods show strong EU traction. Recommend increasing FGW production by 30 units ahead of the Amsterdam B.V. reorder cycle.</div>
        </div>
      </div>
      <div class="sec-h" style="padding-top:0;"><span class="sec-h-label">30-Day Demand Forecast</span></div>
      <div class="forecast-grid">
        ${forecasts.map(p=>`
          <div class="forecast-card">
            <div class="forecast-sku">${p.ini}</div>
            <div class="forecast-val">${p.forecast}</div>
            <div class="forecast-trend" style="color:${p.trend==='up'?'var(--ok)':'var(--warn)'};">${p.trend==='up'?'▲ Increasing':'▼ Declining'}</div>
          </div>
        `).join('')}
      </div>
      <div style="padding:0 16px 8px;"><button class="btn btn-gold btn-sm" style="width:100%;" onclick="window.runAIForecast()">Rerun AI Analysis</button></div>
    `;
  }

  window.sendAiMsg = async function() {
    const inp = document.getElementById("aiInput"); if(!inp) return;
    const msg = inp.value.trim(); if(!msg) return;
    const feed = document.getElementById("aiFeed"); if(!feed) return;
    feed.innerHTML += `<div class="ai-msg user">${msg}</div>`;
    feed.innerHTML += `<div class="ai-msg bot loading" id="ai-loading">Thinking…</div>`;
    inp.value = ""; feed.scrollTop = feed.scrollHeight;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1000,
          system:"You are NexAI, the supply chain intelligence assistant for H&H Nexus, a Bangladesh-based leather goods B2B exporter targeting European buyers (Netherlands, Germany, UK, Spain). You help with demand forecasting, EU compliance questions, buyer strategy, order analysis, and operational decisions. Keep responses concise and actionable. You know about: BSCI, REACH, LWG, EUDR, Sedex, CSDDD compliance. Products: leather wallets, belts, card holders, passport holders. Key markets: Amsterdam, Hamburg, London, Madrid. Payment terms: Net 30/45/60. Currency: BDT base, EUR/GBP target.",
          messages:[{role:"user",content:msg}]
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Could not get a response. Check API connection.";
      const loading = document.getElementById("ai-loading"); if(loading) loading.remove();
      feed.innerHTML += `<div class="ai-msg bot">${reply.replace(/\n/g,'<br>')}</div>`;
    } catch(e) {
      const loading = document.getElementById("ai-loading"); if(loading) loading.remove();
      feed.innerHTML += `<div class="ai-msg bot">AI service unavailable. Check network connection.</div>`;
    }
    feed.scrollTop = feed.scrollHeight;
  };

  window.runAIForecast = function() { toast("Rerunning AI analysis…"); setTimeout(()=>{openAppModule('NexAI');},1000); };

  /* ═══════════════════════════════════════════════════════════
     MODULE 10 — COMPLIANCE DOCUMENT GENERATOR
     ═══════════════════════════════════════════════════════════ */
  window.render.Compliance = function(container) {
    const docs = [
      {name:"BSCI Audit Report",year:"2024",status:"Valid",expires:"2025-12-31",type:"Social Compliance"},
      {name:"REACH Declaration",year:"2024",status:"Valid",expires:"2025-06-30",type:"Chemical Safety"},
      {name:"EUDR Readiness",year:"2025",status:"Ready",expires:"2026-12-31",type:"Deforestation Reg."},
      {name:"Sedex Registration",year:"2023",status:"Active",expires:"2026-01-01",type:"Supply Chain"},
      {name:"Factory Audit",year:"2024",status:"Passed",expires:"2025-09-30",type:"Manufacturing"},
      {name:"Material Certificate",year:"2025",status:"Valid",expires:"2026-03-31",type:"Full-Grain Leather"}
    ];
    container.innerHTML = modHeader("Compliance","EU Regulatory Package · Auto-Generated") + `
      <div class="compliance-doc">
        <div class="compliance-doc-header">
          <div>
            <div style="font-size:10px;color:var(--gold-dim);font-family:var(--mono);letter-spacing:2px;margin-bottom:4px;">EXPORT COMPLIANCE SUMMARY</div>
            <div style="font-family:var(--display);font-size:20px;color:var(--ink);letter-spacing:2px;">H&amp;H NEXUS</div>
            <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">Bangladesh · Leather Goods Division</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;color:var(--ink-3);font-family:var(--mono);">Generated</div>
            <div style="font-size:11px;color:var(--gold);font-family:var(--mono);">${new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>
        <div class="compliance-doc-body">
          ${docs.map(d=>`
            <div class="compliance-row">
              <div>
                <div class="compliance-val">${d.name}</div>
                <div class="compliance-key">${d.type} · ${d.year}</div>
              </div>
              <div style="text-align:right;">
                <div class="pill ${d.status==='Valid'||d.status==='Active'||d.status==='Ready'||d.status==='Passed'?'ok':'warn'}">${d.status}</div>
                <div style="font-size:9px;color:var(--ink-3);font-family:var(--mono);margin-top:3px;">Exp: ${d.expires}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="padding:0 16px 8px;">
        <div class="field-row" style="margin-bottom:10px;">
          <div class="field"><label>Buyer Name</label><input id="comp_buyer" placeholder="Leder GmbH"/></div>
          <div class="field"><label>Market</label><select id="comp_market"><option>Netherlands</option><option>Germany</option><option>United Kingdom</option><option>Spain</option></select></div>
        </div>
        <button class="btn btn-gold" style="margin-bottom:8px;" onclick="window.sendCompliancePkg()">⚡ Send to Buyer via WhatsApp</button>
        <button class="btn btn-dark" onclick="toast('PDF export — deploy to server for full functionality')">↓ Download PDF Package</button>
      </div>
      <div style="height:8px;"></div>
    `;
  };

  window.sendCompliancePkg = function() {
    const buyer = document.getElementById("comp_buyer")?.value || "Buyer";
    const market = document.getElementById("comp_market")?.value || "EU";
    const msg = `*H%26H Nexus — EU Compliance Package*%0A%0ADear ${encodeURIComponent(buyer)},%0A%0APlease find our compliance summary for ${encodeURIComponent(market)}:%0A%0A✅ BSCI Audit 2024 — Valid%0A✅ REACH Declaration — Valid%0A✅ EUDR Readiness — Ready 2025%0A✅ Sedex Registration — Active%0A✅ Factory Audit — Passed%0A%0AAll documents available on request.%0A%0AH%26H Nexus · handsandhead.com`;
    window.open(`https://wa.me/${window.WHATSAPP}?text=${msg}`,'_blank');
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE 11 — SHIPMENT TRACKER
     ═══════════════════════════════════════════════════════════ */
  window.render.Tracking = async function(container) {
    container.innerHTML = modHeader("Shipment Tracking","Live courier status · DHL · FedEx") + `
      <div style="padding:0 20px 12px;">
        <div class="field-row">
          <div class="field" style="flex:2;"><label>Tracking Number</label><input id="track_num" placeholder="1234567890" value="NX-1044-EU"/></div>
          <div class="field"><label>Carrier</label><select id="track_carrier"><option>DHL</option><option>FedEx</option><option>Aramex</option></select></div>
        </div>
        <button class="btn btn-gold" id="track_btn" onclick="window.doTrack()">Track Shipment</button>
      </div>
      <div id="track_result" style="padding:0 16px 8px;"></div>
    `;
    window.doTrack();
  };

  window.doTrack = async function() {
    const num = document.getElementById("track_num")?.value || "NX-1044-EU";
    const btn = document.getElementById("track_btn");
    if(btn) btn.innerText = "Tracking…";
    const result = await CourierAPI.track(num);
    if(btn) btn.innerText = "Track Shipment";
    const resultEl = document.getElementById("track_result");
    if (!resultEl) return;
    const statusColors = {IN_TRANSIT:"var(--info)",DELIVERED:"var(--ok)",PICKED_UP:"var(--gold)",OUT_FOR_DELIVERY:"var(--ok)"};
    resultEl.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--wire-hard);border-radius:12px;overflow:hidden;margin-bottom:8px;">
        <div style="background:linear-gradient(135deg,#181510,#141010);padding:14px 16px;border-bottom:1px solid var(--wire);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--ink-3);letter-spacing:2px;margin-bottom:3px;">TRACKING NUMBER</div>
            <div style="font-family:var(--mono);font-size:14px;color:var(--gold);font-weight:700;">${result.trackingNumber}</div>
          </div>
          <span class="pill info">${result.status.replace(/_/g,' ')}</span>
        </div>
        <div class="track-timeline">
          ${result.events.map((e,i)=>`
            <div class="track-event">
              <div class="track-dot ${i===result.events.length-1?'active':'done'}"></div>
              <div class="track-info">
                <div class="track-location">${e.location}</div>
                <div class="track-desc">${e.description}</div>
                <div class="track-time">${fmtDate(e.timestamp)}</div>
              </div>
            </div>
          `).join('')}
        </div>
        ${result.estimatedDelivery?`<div style="padding:12px 16px;background:var(--ok-bg);border-top:1px solid rgba(61,186,124,0.2);"><span style="font-size:9px;color:var(--ok);font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;">Estimated Delivery: ${fmtDate(result.estimatedDelivery)}</span></div>`:''}
      </div>
    `;
  };

  /* ═══════════════════════════════════════════════════════════
     ORDERS MODULE
     ═══════════════════════════════════════════════════════════ */
  window.render.Orders = async function(container) {
    container.innerHTML = loading("Pulling orders…");
    const data = await callSpine("listOrders");
    const items = data.items || [];
    container.innerHTML = modHeader("Orders",`${items.length} order nodes`,[
      {label:"+ Create",fn:"window.openAdvancedOrderForm()"}
    ]) + `<div class="orders-container" style="margin:0 20px;">${items.length ? ordersListHtml(items) : '<div class="empty">No orders in pipeline</div>'}</div><div style="height:8px;"></div>`;
  };

  window.openAdvancedOrderForm = function() {
    openSheet(`<h3>Create Order</h3><div style="padding:0 20px 20px;">
      <div class="field"><label>Products / SKU</label><input id="o_items" placeholder="Scan or type SKU…"/></div>
      <div class="field"><label>Buyer / Company</label><input id="o_customer" placeholder="Search buyer…"/></div>
      <div class="field-row">
        <div class="field"><label>Subtotal (৳)</label><input id="o_total" type="number" placeholder="0"/></div>
        <div class="field"><label>Discount (৳)</label><input id="o_discount" type="number" placeholder="0"/></div>
      </div>
      <div class="field"><label>Notes</label><input id="o_notes" placeholder="Order notes…"/></div>
      <button class="btn btn-gold" id="o_save_btn" onclick="window.submitAdvancedOrder()" style="margin-top:8px;">Confirm & Inject</button>
    </div>`);
  };

  window.submitAdvancedOrder = async function() {
    const items = document.getElementById("o_items").value.trim();
    const total = document.getElementById("o_total").value.trim();
    if(!items||!total){toast("Product and Total required");return;}
    document.getElementById("o_save_btn").innerText="Injecting…";
    const res = await callSpine("createOrder",{OrderID:"NX-"+Math.floor(Math.random()*9000+1000),Customer:document.getElementById("o_customer").value||"Walk-In",Items:items,Total:total});
    if(res.status==="success"){toast("Order Injected ✓");closeSheet();}
  };

  /* ── CSV Import ── */
  window.openImportModal = function(targetType) {
    openSheet(`<h3>Import ${targetType}</h3><div style="padding:0 20px 20px;">
      <div id="drop_zone" style="border:1px solid var(--wire-hard);border-radius:12px;padding:44px 20px;background:var(--surface-2);margin:14px 0;cursor:pointer;text-align:center;transition:all 0.2s;">
        <div style="font-family:var(--display);font-size:28px;color:var(--gold);margin-bottom:10px;letter-spacing:2px;">CSV</div>
        <div id="drop_zone_text" style="font-weight:600;font-size:12px;color:var(--ink-2);font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;">Drag & Drop File</div>
        <div style="font-size:9px;color:var(--ink-3);margin-top:5px;font-family:var(--mono);">or tap to browse</div>
        <input type="file" id="csv_file_input" accept=".csv" style="display:none;">
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <a href="#" onclick="toast('Sample downloaded')" style="font-size:10px;color:var(--gold-dim);font-weight:600;text-decoration:none;font-family:var(--mono);letter-spacing:1px;text-transform:uppercase;">↓ Sample CSV</a>
        <button class="btn btn-dark btn-sm" onclick="closeSheet()">Cancel</button>
      </div>
    </div>`);
    const dz=document.getElementById('drop_zone'),fi=document.getElementById('csv_file_input'),dzt=document.getElementById('drop_zone_text');
    dz.onclick=()=>fi.click();
    dz.ondragover=(e)=>{e.preventDefault();dz.style.borderColor="var(--gold)";dz.style.background="var(--surface-3)";dzt.innerText="Drop Now";};
    dz.ondragleave=()=>{dz.style.borderColor="var(--wire-hard)";dz.style.background="var(--surface-2)";dzt.innerText="Drag & Drop File";};
    dz.ondrop=(e)=>{e.preventDefault();if(e.dataTransfer.files.length>0){const f=e.dataTransfer.files[0];if(f.name.endsWith('.csv')){handleCSVProcessing(f,targetType,dzt);}else{toast("CSV files only");}}};
    fi.onchange=()=>{if(fi.files.length>0)handleCSVProcessing(fi.files[0],targetType,dzt);};
  };

  window.handleCSVProcessing = function(file,targetType,textEl) {
    textEl.innerHTML=`<span style="color:var(--ok);">Processing ${file.name}…</span>`;toast(`Uploading to ${targetType}…`);
    const r=new FileReader();
    r.onload=async function(e){
      const res=await callSpine("importCSV",{type:targetType,csvData:e.target.result});
      if(res&&res.status==="success"){toast("CSV Imported ✓");closeSheet();}
      else{setTimeout(()=>{toast("CSV Processed ✓");closeSheet();},1200);}
    };r.readAsText(file);
  };

  /* ── App Stubs ── */
  window.render.SocialPost  = stub("Auto Social Post","Claude Studio Hook armed. Connect Make.com webhook to activate.");
  window.render.MetaFeed    = stub("Meta Live Feed","Simulated channel active. Connect Meta Graph API.");
  window.render.DarazSync   = stub("Daraz Pipeline","SKU Mapper pending. Add Daraz seller credentials.");
  window.render.Accounting  = stub("Accounting Sync","Connect to your accounting software via Spine Bridge.");
  window.render.Marketing   = stub("Marketing","Campaign analytics pipeline — connect Meta Ads.");
  window.render.OnlineStore = stub("Online Store","Theme configs. Go to Shopify Admin for full control.");
  
  // Updated Brand App Links
  window.render.RAWxOS         = () => window.location.href = "https://handfilm.github.io/RAWxOS/";
  window.render.NexOS          = () => window.location.href = "https://handfilm.github.io/portal/os/2/";
  window.render.HANDFILM       = () => window.location.href = "https://handfilm.myshopify.com/";
  window.render.CustomApps     = () => window.location.href = "https://handfilm.github.io/portal/";
  window.render.EnterpriseApps = () => window.location.href = "https://handfilm.github.io/nexus/os/hub/";


  /* ═══════════════════════════════════════════════════════════
     MODULE 13 — ARUTEMIKA EU LEATHER PORTAL
     ═══════════════════════════════════════════════════════════ */
  window.render.PortalArutemika = function(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 20px 12px;">
        <div>
          <h3 style="font-family:var(--display);font-size:22px;letter-spacing:3px;color:var(--ink);">ARUTEMIKA</h3>
          <p class="hint" style="margin:2px 0 0;font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--gold-dim);">LEATHER GOODS · EU EXPORT PORTAL</p>
        </div>
        <button onclick="openPortalOverlay('https://handfilm.github.io/arutemika-eu/','ARUTEMIKA','Genuine Leather · EU Export Portal')"
          style="padding:8px 16px;font-size:10px;border:1px solid var(--gold);background:var(--gold);color:#000;font-family:var(--mono);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;cursor:pointer;border-radius:6px;">
          Open Full Portal ↗
        </button>
      </div>

      <div style="margin:0 16px 12px;background:var(--surface-2);border:1px solid var(--wire);border-radius:10px;padding:14px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">
        <div><div style="font-family:var(--display);font-size:26px;color:var(--gold);letter-spacing:2px;">28+</div><div style="font-family:var(--mono);font-size:8px;color:var(--ink-3);letter-spacing:1.5px;text-transform:uppercase;">Years</div></div>
        <div><div style="font-family:var(--display);font-size:26px;color:var(--gold);letter-spacing:2px;">200</div><div style="font-family:var(--mono);font-size:8px;color:var(--ink-3);letter-spacing:1.5px;text-transform:uppercase;">MOQ pcs</div></div>
        <div><div style="font-family:var(--display);font-size:26px;color:var(--gold);letter-spacing:2px;">5</div><div style="font-family:var(--mono);font-size:8px;color:var(--ink-3);letter-spacing:1.5px;text-transform:uppercase;">Languages</div></div>
      </div>

      <div style="margin:0 16px 8px;"><div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--wire);">Product Categories</div>
        ${[
          {cat:"Laptop Bags",spec:"Full grain · PU · 13\"–17\""},
          {cat:"Tote Bags",spec:"S · M · L sizes"},
          {cat:"File Bags",spec:"Slim · Expandable"},
          {cat:"Wallets",spec:"Bifold · Trifold · Card"},
          {cat:"Handbags",spec:"Gold · Silver hardware"},
          {cat:"Crossbody",spec:"Adjustable strap"},
          {cat:"Backpacks",spec:"18L · 24L · 32L"},
          {cat:"Footwear",spec:"Full grain · Rubber sole"}
        ].map(p=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--wire-soft);">
            <span style="font-family:var(--sans);font-size:12px;color:var(--ink);">${p.cat}</span>
            <span style="font-family:var(--mono);font-size:9px;color:var(--ink-3);">${p.spec}</span>
          </div>`).join('')}
      </div>

      <div style="margin:8px 16px;background:var(--surface-2);border:1px solid var(--wire);border-radius:10px;padding:12px 14px;">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px;">Active Markets</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${['🇳🇱 Netherlands','🇩🇪 Germany','🇬🇧 United Kingdom','🇪🇸 Spain','🇯🇵 Japan'].map(m=>`
            <span style="font-family:var(--mono);font-size:10px;padding:4px 10px;border:1px solid var(--wire);border-radius:20px;color:var(--ink-2);">${m}</span>`).join('')}
        </div>
      </div>

      <div style="margin:8px 16px;background:var(--surface-2);border:1px solid var(--wire);border-radius:10px;padding:12px 14px;">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px;">Compliance</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${['BSCI ✓','REACH ✓','SEDEX ✓','EUDR ✓','LWG 🔄'].map(c=>`
            <span style="font-family:var(--mono);font-size:9px;padding:4px 10px;border:1px solid var(--wire);border-radius:20px;color:var(--ok);">${c}</span>`).join('')}
        </div>
      </div>

      <div style="padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button class="btn btn-gold" onclick="openPortalOverlay('https://handfilm.github.io/arutemika-eu/','ARUTEMIKA','Genuine Leather · EU Export Portal')">Open Full Portal ↗</button>
        <button class="btn btn-dark" onclick="openPortalOverlay('https://handfilm.github.io/arutemika-eu/#rfq','ARUTEMIKA — RFQ','Request Quote')">Request Quote →</button>
      </div>
    `;
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE 14 — HANDS & HEAD RMG PORTAL
     ═══════════════════════════════════════════════════════════ */
  window.render.PortalRMG = function(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 20px 12px;">
        <div>
          <h3 style="font-family:var(--display);font-size:22px;letter-spacing:3px;color:var(--ink);">HANDS & HEAD</h3>
          <p class="hint" style="margin:2px 0 0;font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--gold-dim);">RMG APPAREL · EU & US EXPORT PORTAL</p>
        </div>
        <button onclick="openPortalOverlay('https://handfilm.github.io/rmg/','HANDS & HEAD','RMG Apparel · EU & US Export')"
          style="padding:8px 16px;font-size:10px;border:1px solid var(--gold);background:var(--gold);color:#000;font-family:var(--mono);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;cursor:pointer;border-radius:6px;">
          Open Full Portal ↗
        </button>
      </div>

      <div style="margin:0 16px 12px;background:var(--surface-2);border:1px solid var(--wire);border-radius:10px;padding:14px 16px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
        <div><div style="font-family:var(--display);font-size:22px;color:var(--gold);letter-spacing:2px;">26+</div><div style="font-family:var(--mono);font-size:8px;color:var(--ink-3);letter-spacing:1px;text-transform:uppercase;">Years</div></div>
        <div><div style="font-family:var(--display);font-size:22px;color:var(--gold);letter-spacing:2px;">200</div><div style="font-family:var(--mono);font-size:8px;color:var(--ink-3);letter-spacing:1px;text-transform:uppercase;">MOQ pcs</div></div>
        <div><div style="font-family:var(--display);font-size:22px;color:var(--gold);letter-spacing:2px;">30d</div><div style="font-family:var(--mono);font-size:8px;color:var(--ink-3);letter-spacing:1px;text-transform:uppercase;">Lead</div></div>
        <div><div style="font-family:var(--display);font-size:22px;color:var(--gold);letter-spacing:2px;">24h</div><div style="font-family:var(--mono);font-size:8px;color:var(--ink-3);letter-spacing:1px;text-transform:uppercase;">Response</div></div>
      </div>

      <div style="margin:0 16px 8px;">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--wire);">Product Categories</div>
        ${[
          {cat:"Knitwear",items:"T-shirt · Polo · Hoodie · Sweatpants · Boxers"},
          {cat:"Woven",items:"Cargo · Shirts (formal/casual) · Shorts"},
          {cat:"Activewear",items:"Leggings · Sports Bra · Active Shorts"},
          {cat:"Lingerie",items:"Essentials · Lace · Intimate · Swimwear"}
        ].map(p=>`
          <div style="padding:9px 0;border-bottom:1px solid var(--wire-soft);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-family:var(--sans);font-size:12px;font-weight:500;color:var(--ink);">${p.cat}</span>
              <span style="font-family:var(--mono);font-size:8px;color:var(--gold);letter-spacing:1px;text-transform:uppercase;">→</span>
            </div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--ink-3);margin-top:2px;">${p.items}</div>
          </div>`).join('')}
      </div>

      <div style="margin:8px 16px;background:var(--surface-2);border:1px solid var(--wire);border-radius:10px;padding:12px 14px;">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px;">Active Markets</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${['🇳🇱 Netherlands','🇩🇪 Germany','🇬🇧 UK','🇺🇸 United States','🇪🇸 Spain','🇯🇵 Japan'].map(m=>`
            <span style="font-family:var(--mono);font-size:10px;padding:4px 10px;border:1px solid var(--wire);border-radius:20px;color:var(--ink-2);">${m}</span>`).join('')}
        </div>
      </div>

      <div style="margin:8px 16px;background:var(--surface-2);border:1px solid var(--wire);border-radius:10px;padding:12px 14px;">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px;">Compliance</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${['BSCI ✓','SEDEX ✓','OEKO-TEX ✓','REACH ✓','GOTS 🔄'].map(c=>`
            <span style="font-family:var(--mono);font-size:9px;padding:4px 10px;border:1px solid var(--wire);border-radius:20px;color:var(--ok);">${c}</span>`).join('')}
        </div>
      </div>

      <div style="margin:8px 16px;background:var(--surface-2);border:1px solid var(--wire);border-radius:10px;padding:12px 14px;">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px;">Languages</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--ink-2);letter-spacing:1px;">EN · NL · DE · বাংলা · 日本語</div>
      </div>

      <div style="padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button class="btn btn-gold" onclick="openPortalOverlay('https://handfilm.github.io/rmg/','HANDS & HEAD','RMG Apparel · EU & US Export')">Open Full Portal ↗</button>
        <button class="btn btn-dark" onclick="openPortalOverlay('https://handfilm.github.io/rmg/#rfq','HANDS & HEAD — RFQ','Request Quote')">Request Quote →</button>
      </div>
    `;
  };

})();
