/* ═══════════════════════════════════════════════════════════════
   NexOS v4 — js/app.js
   PWA · Radar · Role System · Push · FX · Core Render
   ═══════════════════════════════════════════════════════════════ */

/* ── PWA Manifest ── */
(function () {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#C9A84C'/><stop offset='1' stop-color='#8A6E2A'/></linearGradient></defs><rect width='512' height='512' rx='80' fill='url(#g)'/><path d='M136 380V140L376 380V140' fill='none' stroke='#000' stroke-width='54' stroke-linecap='square' stroke-linejoin='miter'/></svg>`;
  const icon = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const manifest = { name:"HANDS & HEAD B2B", short_name:"H&H B2B", display:"standalone", background_color:"#080808", theme_color:"#080808", start_url:"/", icons:[{src:icon,sizes:"any",type:"image/svg+xml"}] };
  try { const ml = document.createElement("link"); ml.rel = "manifest"; ml.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:"application/manifest+json"})); document.head.appendChild(ml); } catch(e){}
})();

/* ── Radar Canvas ── */
(function () {
  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, cx, cy, maxR, sweep = 0, trails = [], dots = [];
  const G = 'rgba(201,168,76,';
  function resize() {
    W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight;
    cx = W * 0.72; cy = H * 0.26; maxR = Math.max(W, H) * 0.65;
    dots = Array.from({length:14}, () => ({ angle:Math.random()*Math.PI*2, r:maxR*(0.15+Math.random()*0.72), alpha:0.4+Math.random()*0.6, size:1+Math.random()*2 }));
  }
  function draw() {
    ctx.clearRect(0,0,W,H);
    for (let i=1;i<=5;i++) { ctx.beginPath(); ctx.arc(cx,cy,(maxR/5)*i,0,Math.PI*2); ctx.strokeStyle=G+(0.06-i*0.008)+')'; ctx.lineWidth=0.5; ctx.stroke(); }
    ctx.strokeStyle=G+'0.04)'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(cx-maxR,cy); ctx.lineTo(cx+maxR,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,cy-maxR); ctx.lineTo(cx,cy+maxR); ctx.stroke();
    trails.push({angle:sweep}); if(trails.length>52) trails.shift();
    trails.forEach((t,i) => { const a=(i/trails.length)*0.7; const sa=t.angle-0.08*(1-i/trails.length)*3; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,maxR*0.95,sa,t.angle); ctx.closePath(); ctx.fillStyle=G+(a*0.16)+')'; ctx.fill(); });
    const ex=cx+Math.cos(sweep)*maxR*0.95, ey=cy+Math.sin(sweep)*maxR*0.95;
    const lg=ctx.createLinearGradient(cx,cy,ex,ey); lg.addColorStop(0,G+'0.6)'); lg.addColorStop(1,G+'0)');
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ex,ey); ctx.strokeStyle=lg; ctx.lineWidth=1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fillStyle=G+'0.8)'; ctx.fill();
    dots.forEach(d => {
      const dx=cx+Math.cos(d.angle)*d.r, dy=cy+Math.sin(d.angle)*d.r;
      const ad=((sweep-d.angle)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
      const br=ad<0.3?1:Math.max(0,1-(ad/(Math.PI*1.5)));
      if(br>0.05) { ctx.beginPath(); ctx.arc(dx,dy,d.size+br*1.5,0,Math.PI*2); ctx.fillStyle=G+(d.alpha*br*0.9)+')'; ctx.fill(); }
    });
    sweep+=0.008; requestAnimationFrame(draw);
  }
  resize(); window.addEventListener('resize',resize); draw();
})();

/* ── Constants ── */
const WHATSAPP = "8801974518600";
const PINS = {
  lite:       null,
  expert:     "1981",
  production: "2024"   // Hiron's Production View PIN
};

/* ── Local Storage ── */
const LS = {
  get(k)    { try { return JSON.parse(localStorage.getItem("nx_"+k)); } catch(e) { return null; } },
  set(k,v)  { try { localStorage.setItem("nx_"+k, JSON.stringify(v)); } catch(e) {} },
  del(k)    { try { localStorage.removeItem("nx_"+k); } catch(e) {} }
};

/* ── Offline & Service Worker Status ── */
let offline = !navigator.onLine;
function setOffline(b) {
  offline = b;
  const offBar = document.getElementById("offBar");
  if (offBar) {
    offBar.classList.toggle("on", b);
    offBar.innerHTML = `<span class="od"></span> Offline Cache Mode · Browsing Offline Catalog & Orders`;
  }
  if (b) {
    if (typeof toast === 'function') toast("Offline Mode Active — Using Cached Catalog & Orders");
  } else {
    if (typeof toast === 'function') toast("Connected Online — Synced with Network");
  }
}
window.addEventListener("online",  () => { setOffline(false); render(); });
window.addEventListener("offline", () => { setOffline(true); render(); });

/* ── Service Worker & Push Notifications Init ── */
(async function() {
  if (window.NexServiceWorker) {
    await window.NexServiceWorker.register();
  }
  if (window.PushEngine) {
    await window.PushEngine.init();
  }
})();

/* ── Spine Dispatcher (Firestore Core + Graceful Fallbacks) ── */
async function spine(action, payload={}) {
  try {
    if (action === "placeOrder" || action === "createOrder") {
      if (window.OrdersService) {
        const itemTitle = payload.Items || payload.item || "Leather Goods";
        const price = Number(payload.Total || payload.price || 0);
        const o = await window.OrdersService.create({
          customer: { name: payload.Customer || payload.phone || "Walk-in Buyer", phone: payload.phone || "" },
          items: [{ title: itemTitle, price: price, quantity: 1 }],
          paymentMethod: payload.method || "cash",
          paymentStatus: "paid"
        });
        if (window.PushEngine) PushEngine.notifyNewOrder({ t: itemTitle, s: payload.Customer || "Quick Sale" });
        return { status: "success", ok: true, order: o };
      }
    }
    if (action === "listOrders" || action === "getOrders") {
      if (window.OrdersService) {
        const { items } = await window.OrdersService.list({ sortBy: "createdAt", sortDir: "desc" });
        if (items && items.length) {
          return {
            items: items.map(o => ({
              id: o.orderNumber || o.id,
              t: (o.lineItems || []).map(li => `${li.title} x${li.quantity}`).join(", ") || "Leather Goods",
              s: `${o.customerSnapshot?.name || 'Walk-in'} · ৳${(o.total || 0).toLocaleString()}`,
              st: [
                (o.status || 'NEW').toUpperCase(),
                o.status === 'completed' ? 'ok' : o.status === 'cancelled' ? 'warn' : 'amber'
              ]
            }))
          };
        }
      }
    }
    if (action === "getStats") {
      if (window.OrdersService && window.ProductsService) {
        const [{ items: ords }, { items: prods }] = await Promise.all([
          window.OrdersService.list().catch(() => ({ items: [] })),
          window.ProductsService.list().catch(() => ({ items: [] }))
        ]);
        const sales = ords.reduce((sum, o) => sum + (o.status !== 'cancelled' ? (o.total || 0) : 0), 0);
        const pending = ords.filter(o => o.fulfillmentStatus === 'unfulfilled' && o.status !== 'cancelled').length;
        return {
          salesToday: sales,
          ordersToday: ords.length,
          pending: pending,
          catalog: prods.length || 4
        };
      }
    }
    if (action === "getFeed" || action === "getProducts") {
      if (window.ProductsService) {
        const { items } = await window.ProductsService.list();
        if (items && items.length) {
          return {
            items: items.map(p => ({
              id: p.id,
              t: p.title,
              cat: p.productType || p.vendor || "Catalog",
              price: p.pricing?.price || 0,
              ini: p.variants?.[0]?.sku || p.title.slice(0, 3).toUpperCase(),
              img: p.images?.[0]?.url || "",
              stock: p.totalInventory || 0
            }))
          };
        }
      }
    }
    if (action === "createCustomer") {
      if (window.CustomersService) {
        await window.CustomersService.create({
          name: payload.Name || "New Customer",
          email: payload.Email || "",
          phone: payload.Phone || "",
          addressLine1: payload.Address || ""
        });
        return { status: "success" };
      }
    }
    if (action === "createProduct") {
      if (window.ProductsService) {
        await window.ProductsService.create(payload);
        return { status: "success" };
      }
    }
  } catch (err) {
    console.debug("Spine Firestore handler fallback:", err);
  }

  if (typeof window.callSpine === "function") {
    try {
      const res = await window.callSpine(action, payload);
      if (res && !res.error && res.status !== "failed" && (!Array.isArray(res) || res.length > 0)) {
        if (Array.isArray(res) && (action === "listOrders" || action === "getOrders")) {
          return { items: res.map(o => ({ id: o.OrderID || "NX-00", t: o.Items || "Live Order", s: (o.Customer || "Walk-in") + " • ৳" + (o.Total || 0), st: [o.Status || "NEW", "ok"] })) };
        }
        if (Array.isArray(res) && (action === "getFeed" || action === "getProducts")) {
          return { items: res.map(p => ({ id: p.ID || "1", t: p.Name, cat: p.Vendor || "Live", price: p.Price || 0, ini: p.SKU || "PRD", img: p.Image || "" })) };
        }
        return res;
      }
    } catch(e) {}
  }
  return demoSpine(action, payload);
}

/* ── Demo Data ── */
let dOrders = [
  {id:"NX-1045",t:"Leather Bifold Wallet x50",s:"WhatsApp · Amsterdam, NL",st:["PENDING","warn"]},
  {id:"NX-1044",t:"Full-Grain Belt x200",s:"Email · Hamburg, DE",st:["CONFIRMED","ok"]},
  {id:"NX-1043",t:"Card Holder x100",s:"Portal · London, UK",st:["SHIPPED","info"]}
];
const dCat = [
  {id:"p1",t:"Full-Grain Leather Wallet",cat:"WALLETS",price:850,ini:"FGW",stock:240},
  {id:"p2",t:"Genuine Leather Belt",cat:"BELTS",price:620,ini:"GLB",stock:180},
  {id:"p3",t:"Card Holder Slim",cat:"ACCESSORIES",price:420,ini:"CHS",stock:95},
  {id:"p4",t:"Passport Holder",cat:"TRAVEL",price:980,ini:"PHT",stock:60}
];
const dCompanies = [
  {id:"c1",name:"Leder & Mehr GmbH",country:"DE",flag:"🇩🇪",moq:100,terms:"Net 30",currency:"EUR",contact:"hans@leder.de",orders:12},
  {id:"c2",name:"Amsterdam Goods B.V.",country:"NL",flag:"🇳🇱",moq:200,terms:"Net 45",currency:"EUR",contact:"info@amsgds.nl",orders:8},
  {id:"c3",name:"London Leather Co.",country:"GB",flag:"🇬🇧",moq:150,terms:"Net 30",currency:"GBP",contact:"buy@llco.co.uk",orders:5},
  {id:"c4",name:"Iberian Trade S.L.",country:"ES",flag:"🇪🇸",moq:100,terms:"Net 60",currency:"EUR",contact:"trade@iberian.es",orders:3}
];
function demoSpine(a,p) {
  if(a==="getStats")   return Promise.resolve({salesToday:84600,ordersToday:3,pending:1,catalog:4});
  if(a==="getFeed")    return Promise.resolve({items:dCat});
  if(a==="listOrders") return Promise.resolve({items:dOrders});
  if(a==="placeOrder") { const o={id:"NX-"+Date.now().toString().slice(-4),t:p.item,s:p.method,st:["NEW","amber"]}; dOrders.unshift(o); if(window.PushEngine) PushEngine.notifyNewOrder(o); return Promise.resolve({ok:true,status:"NEW"}); }
  return Promise.resolve({items:[]});
}

/* ── SVG Icons ── */
const I = {
  cam:'<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
  home:'<svg viewBox="0 0 24 24"><path d="M3 10l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  inbox:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h5l2 3h4l2-3h5"/></svg>',
  tag:'<svg viewBox="0 0 24 24"><path d="M3 12v-7a2 2 0 012-2h7l9 9a2 2 0 010 2.8l-5.6 5.6a2 2 0 01-2.8 0L3 12z"/><circle cx="8" cy="8" r="2"/></svg>',
  exit:'<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  orders:'<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>',
  spark:'<svg viewBox="0 0 24 24"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05L4.93 4.93"/></svg>',
  globe:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18"/></svg>',
  wallet:'<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M16 12h3"/></svg>',
  chart:'<svg viewBox="0 0 24 24"><path d="M4 20V10M11 20V4M18 20v-7"/></svg>',
  megaphone:'<svg viewBox="0 0 24 24"><path d="M3 11l18-5v12L3 13M3 13V19"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>',
  store:'<svg viewBox="0 0 24 24"><path d="M3 9l1-5h16l1 5"/><path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9"/><path d="M9 20v-6h6v6"/></svg>',
  link:'<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" fill="none"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  truck:'<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  bell:'<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>',
  users:'<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
  eu:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 010 20M2 12h20"/></svg>',
  doc:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  box:'<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  ai:'<svg viewBox="0 0 24 24"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>',
  fx:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M6 10h12M8 6l2 2M16 6l-2 2"/></svg>',
  hammer:'<svg viewBox="0 0 24 24"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 010-3L12 9"/><path d="M17.64 15L22 10.64M20.35 6.35L6.36 20.35M13 6l2-2 4 4-2 2M3 20l7-7"/></svg>',
  leather:'<svg viewBox="0 0 24 24"><path d="M12 2C8 2 4 5 4 9c0 5 8 13 8 13s8-8 8-13c0-4-3.6-7-8-7z"/><circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none"/></svg>',
  rmg:'<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  mic:'<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="currentColor"/><path d="M19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 008 8.94V23h2v-2.06A9 9 0 0021 12v-2h-2z" fill="currentColor"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
};

/* ── State ── */
let mode = "lite", expScreen = "dashboard";

/* ── Theme ── */
function applyTheme(m) {
  document.body.classList.add("theme-transitioning");
  document.body.classList.remove("dark","expert-mode","production-mode");
  if (m === "expert")     document.body.classList.add("dark","expert-mode");
  if (m === "production") document.body.classList.add("production-mode");
  setTimeout(() => document.body.classList.remove("theme-transitioning"), 500);
}

/* ── Main Render ── */
function render() {
  const mTag = document.getElementById("modeTag");
  if (mTag) {
    if (mode === "lite")       mTag.innerText = "Lite Seller";
    else if (mode === "expert") mTag.innerText = "Expert OS";
    else if (mode === "production") mTag.innerText = "Production";
  }
  const b = document.getElementById("body");
  if (!b) return;
  b.innerHTML = "";
  if (expScreen && expScreen !== "dashboard" && expScreen !== "Home") {
    openAppModule(expScreen);
  } else {
    if (mode === "production") renderProductionView(b);
    else renderLiteHome(b);
  }
  renderTabbar();
}

/* ── Lite / Expert Home (Dynamic Drag-and-Drop Dashboard System) ── */
async function renderLiteHome(b) {
  const s = LS.get("stats") || {salesToday:0,ordersToday:0,pending:0};
  const o = LS.get("orders") || [];

  // Get FX for hero stat
  let fxLine = '';
  try {
    const fxList = await FXRates.formatAll(s.salesToday || 0);
    fxLine = fxList.slice(0,3).map(f=>`${f.symbol}${f.amount} ${f.currency}`).join(' · ');
  } catch(e) {}

  const engine = window.DashboardEngine;
  const isCustomizing = engine ? engine.isCustomizing() : false;
  const layout = engine ? engine.getLayout() : [
    { id: 'virtual_ledger', pinned: true },
    { id: 'accounting_sync', pinned: true },
    { id: 'recent_orders', pinned: true },
    { id: 'terminal_metrics', pinned: true },
    { id: 'quick_access', pinned: true },
    { id: 'quick_order', pinned: true },
    { id: 'pinned_apps', pinned: true },
    { id: 'product_showcase', pinned: true }
  ];

  const catalog = engine ? engine.getCatalog() : [];
  const catalogMap = new Map(catalog.map(c => [c.id, c]));

  let widgetsHtml = '';

  // Render each pinned widget in the user's custom order
  const pinnedWidgets = layout.filter(item => item.pinned);

  pinnedWidgets.forEach((item, index) => {
    const wDef = catalogMap.get(item.id) || { title: item.id, badge: 'WIDGET' };
    let contentHtml = '';

    switch (item.id) {
      case 'accounting_sync':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">Accounting Sync &amp; ERP</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="btn btn-sm btn-gold" id="dash_quick_acc_btn" onclick="window.triggerAccountingQuickSync()" style="font-size:10.5px;padding:4px 10px;" title="Synchronize pending receipts to cloud ERP">⚡ Quick Sync All</button>
              <button class="btn btn-sm btn-dark" onclick="window.open('https://account.handsandhead.com','_blank')" style="font-size:10px;padding:4px 8px;font-family:var(--mono);color:var(--coral);" title="Open account.handsandhead.com portal">account.handsandhead.com ↗</button>
              <span class="sec-h-action" onclick="openAppModule('Accounting')">Accounting Hub →</span>
            </div>
          </div>
          <div class="dash-accounting-card" style="margin:0 20px 6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:42px;height:42px;border-radius:12px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--coral);flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>
                </div>
                <div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size:14px;font-weight:700;color:var(--ink);">QuickBooks · Xero · Zoho Bridge</div>
                    <span class="pill ok" style="font-size:7.5px;">LIVE</span>
                  </div>
                  <div id="dash_acc_status_text" style="font-size:10.5px;color:var(--coral);font-family:var(--mono);">account.handsandhead.com · All sales synced ✓</div>
                </div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span class="pill ok" style="font-size:8px;">QBO ACTIVE</span>
                <span class="pill info" style="font-size:8px;">XERO READY</span>
                <span class="pill amber" style="font-size:8px;">ZOHO READY</span>
              </div>
            </div>
            <div class="dash-accounting-grid">
              <div class="dash-acc-stat-box">
                <div style="font-size:9.5px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;letter-spacing:0.5px;">Synced Revenue</div>
                <div style="font-size:17px;font-weight:800;color:var(--ink);font-family:var(--mono);">৳${(s.salesToday || 84600).toLocaleString()}</div>
              </div>
              <div class="dash-acc-stat-box">
                <div style="font-size:9.5px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;letter-spacing:0.5px;">Pending Invoices</div>
                <div style="font-size:17px;font-weight:800;color:var(--ok);font-family:var(--mono);">0 Queue</div>
              </div>
              <div class="dash-acc-stat-box">
                <div style="font-size:9.5px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;letter-spacing:0.5px;">Export Tax Treatment</div>
                <div style="font-size:14px;font-weight:700;color:var(--gold);font-family:var(--mono);">0% VAT (Export Exempt)</div>
              </div>
            </div>
          </div>
        `;
        break;

      case 'recent_orders':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">Recent Orders</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="btn btn-sm btn-dark" onclick="window.openQuickSale()" style="font-size:10.5px;padding:3px 9px;" title="Fast order creation">+ Quick Order</button>
              <span class="sec-h-action" onclick="openAllOrders()">All Orders →</span>
            </div>
          </div>
          <div class="orders-container" id="recentList">${ordersListHtml(o.slice(0,5))}</div>
        `;
        break;

      case 'terminal_metrics':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">Live Terminal Metrics</span>
            <div style="display:flex;gap:10px;align-items:center;">
              <div class="neu-toggle-wrap on" id="syncToggle" onclick="this.classList.toggle('on');this.classList.toggle('off');toast(this.classList.contains('on')?'Live Sync: Active':'Live Sync: Paused');">
                <div class="neu-toggle-track"><div class="neu-toggle-thumb"></div></div>
                <span class="neu-toggle-label">Sync</span>
              </div>
              <span class="sec-h-action" onclick="render()">↻</span>
            </div>
          </div>
          <div class="bento-grid">
            <div class="bento-card hero-stat">
              <div class="bento-label">Sales Today</div>
              <div class="bento-value">৳${(s.salesToday||0).toLocaleString()}</div>
              <div class="bento-trend">Active Pipeline</div>
              ${fxLine ? `<div class="bento-fx">${fxLine}</div>` : ''}
            </div>
            <div class="bento-card">
              <div class="bento-label">Pending Orders</div>
              <div class="bento-value" style="font-size:36px;color:var(--coral);">${s.pending||0}</div>
            </div>
            <div class="bento-card">
              <div class="bento-label">Completed Today</div>
              <div class="bento-value" style="font-size:36px;">${s.ordersToday||0}</div>
            </div>
          </div>
        `;
        break;

      case 'virtual_ledger':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">Statistic &amp; Financial Overview</span>
            <div style="display:flex;gap:6px;align-items:center;">
              <span class="pill ok" style="font-size:8px;">EXPORT PIPELINE ACTIVE</span>
            </div>
          </div>
          <div class="bento-grid" style="margin-bottom:6px;padding-top:2px;">
            <!-- Virtual Ledger Card (Ref 1) -->
            <div class="neu-virtual-card">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-family:var(--display);font-size:20px;letter-spacing:1.5px;color:var(--ink);">H&amp;H NEXUS</div>
                <div class="neu-card-chip"></div>
              </div>
              <div class="neu-card-number">5303 6084 2402 3649</div>
              <div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:2;">
                <div>
                  <div style="font-size:9.5px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;letter-spacing:1px;">Today's Inflow</div>
                  <div style="font-size:22px;font-weight:700;color:var(--ink);font-family:var(--mono);">৳${(s.salesToday || 84600).toLocaleString()}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:9px;font-family:var(--mono);color:var(--ink-3);">EXP</div>
                  <div style="font-size:12px;font-weight:700;color:var(--ink);font-family:var(--mono);">09/28</div>
                </div>
              </div>
              <div class="neu-slider-wrap" style="margin-top:14px;position:relative;z-index:2;">
                <div style="display:flex;justify-content:space-between;font-size:10.5px;font-family:var(--mono);color:var(--ink-3);">
                  <span>Credit Facility</span>
                  <span>৳25,000 / ৳100,000</span>
                </div>
                <div class="neu-slider-track">
                  <div class="neu-slider-fill" style="width:25%;"></div>
                  <div class="neu-slider-knob" style="left:25%;"></div>
                </div>
              </div>
              <div class="neu-card-holo"></div>
            </div>

            <!-- Neumorphic Statistic Gauge (Ref 1 & 2) -->
            <div class="neu-gauge-card">
              <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                <div style="font-family:var(--display);font-size:16px;letter-spacing:1px;color:var(--ink);">STATISTIC</div>
                <div class="pill info" style="font-size:9.5px;cursor:pointer;" onclick="toast('Period: Last 30 Days')">Last 30 days ›</div>
              </div>
              
              <div class="neu-gauge-wheel">
                <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(166,180,200,0.22)" stroke-width="11"/>
                  <circle cx="50" cy="50" r="38" fill="none" stroke="url(#coralGrad)" stroke-width="11" stroke-dasharray="238.76" stroke-dashoffset="179" stroke-linecap="round"/>
                  <defs>
                    <linearGradient id="coralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#FF7B54"/>
                      <stop offset="100%" stop-color="#FF5024"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div class="neu-gauge-center">
                  <div class="neu-gauge-arrow-btn" onclick="toast('Channel: EU Direct Export')" title="EU Direct Export channel active">
                    <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:#fff;stroke-width:2.5;fill:none;"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
                  </div>
                </div>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:4px;">
                <div style="text-align:left;">
                  <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">EU EXPORT VOLUME</div>
                  <div style="font-size:16px;font-weight:700;color:var(--ink);font-family:var(--mono);">€1,593.58</div>
                </div>
                <div class="pill ok" style="font-size:10.5px;font-weight:700;">25% SHARE</div>
              </div>
            </div>
          </div>
        `;
        break;

      case 'quick_access':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;"><span class="sec-h-label">Quick Access Launchpad</span></div>
          <div class="action-rail">
            <button class="action-node" onclick="window.VoiceEngine.toggle()">
              <div class="action-icon" style="color:var(--coral);">${I.mic}</div><div class="action-label">Voice</div>
            </button>
            <button class="action-node" onclick="startCamera()">
              <div class="action-icon">${I.cam}</div><div class="action-label">Capture</div>
            </button>
            <button class="action-node" onclick="openAppModule('Products')">
              <div class="action-icon">${I.tag}</div><div class="action-label">Products</div>
            </button>
            <button class="action-node" onclick="openAppModule('Accounting')">
              <div class="action-icon" style="color:var(--gold);">${I.wallet}</div><div class="action-label">Accounting</div>
            </button>
            <button class="action-node" onclick="openAppModule('EUPortal')">
              <div class="action-icon">${I.eu}</div><div class="action-label">EU Portal</div>
            </button>
            <button class="action-node" onclick="openAppModule('Analytics')">
              <div class="action-icon">${I.chart}</div><div class="action-label">Analytics</div>
            </button>
            <button class="action-node" onclick="openAppModule('QuoteBuilder')">
              <div class="action-icon">${I.doc}</div><div class="action-label">Quote</div>
            </button>
            <button class="action-node" onclick="openAppModule('CRM')">
              <div class="action-icon">${I.users}</div><div class="action-label">CRM</div>
            </button>
            <button class="action-node" onclick="openAppModule('Inventory')">
              <div class="action-icon">${I.box}</div><div class="action-label">Stock</div>
              ${(s.pending||0)>0?'<div class="action-badge"></div>':''}
            </button>
            <button class="action-node" onclick="openAppModule('Tracking')">
              <div class="action-icon">${I.truck}</div><div class="action-label">Track</div>
            </button>
            <button class="action-node" onclick="openAppModule('PortalArutemika')">
              <div class="action-icon">${I.leather}</div><div class="action-label">Leather</div>
            </button>
            <button class="action-node" onclick="openAppModule('PortalRMG')">
              <div class="action-icon">${I.rmg}</div><div class="action-label">RMG</div>
            </button>
          </div>
        `;
        break;

      case 'quick_order':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">Quick Order Logger</span>
          </div>
          <div class="order-panel">
            <div class="order-panel-inner">
              <div class="field"><input id="q_item" placeholder="Product name or SKU…"/></div>
              <div class="field-row">
                <div class="field"><input id="q_price" type="number" placeholder="৳ Price"/></div>
                <div class="field"><input id="q_phone" placeholder="Phone / Email"/></div>
              </div>
              <div class="seg" id="q_seg">
                <button class="on" data-m="whatsapp">WhatsApp</button>
                <button data-m="bkash">bKash</button>
                <button data-m="nagad">Nagad</button>
                <button data-m="bank">Bank</button>
              </div>
              <button class="btn btn-gold" id="q_go">Log Order</button>
            </div>
          </div>
        `;
        break;

      case 'pinned_apps':
        contentHtml = `
          <div class="sec-h" style="padding-top:12px;">
            <span class="sec-h-label">Apps &amp; Pages Shelf</span>
            <span class="sec-h-action" onclick="openAppModule('CustomApps')">All Apps Studio →</span>
          </div>
          <div class="neu-apps-list" style="display:flex;flex-direction:column;gap:10px;margin:0 20px 10px;">
            <!-- Front End Storefront App Card -->
            <div class="neu-app-card" onclick="window.open('https://shop.handsandhead.com', '_blank')" style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat-sm);cursor:pointer;border:1px solid var(--gold-dim);transition:all 0.25s var(--ease-bouncy);">
              <div class="neu-app-icon" style="width:42px;height:42px;border-radius:12px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0;">
                <svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:currentColor;stroke-width:1.8;fill:none;"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 010 20M2 12h20"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="font-size:14px;font-weight:700;color:var(--ink);">Front End</div>
                  <span class="pill gold" style="font-size:7.5px;">STOREFRONT</span>
                </div>
                <div style="font-size:10.5px;color:var(--coral);font-family:var(--mono);">shop.handsandhead.com</div>
              </div>
              <span class="pill ok" style="font-size:8px;">ONLINE ↗</span>
            </div>

            <!-- Accounting Sync App Card -->
            <div class="neu-app-card" onclick="openAppModule('Accounting')" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat-sm);cursor:pointer;border:1px solid rgba(255,123,84,0.3);transition:all 0.25s var(--ease-bouncy);">
              <div class="neu-app-icon" style="width:42px;height:42px;border-radius:12px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--coral);flex-shrink:0;">
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="font-size:14px;font-weight:700;color:var(--ink);">Accounting Sync</div>
                  <span class="pill ok" style="font-size:7.5px;">ERP</span>
                </div>
                <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">account.handsandhead.com</div>
              </div>
              <span class="pill info" style="font-size:8px;">SYNCED</span>
            </div>

            <!-- Custom Page & App Builder Card -->
            <div class="neu-app-card" onclick="openAppModule('CustomApps')" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat-sm);cursor:pointer;transition:all 0.25s var(--ease-bouncy);">
              <div class="neu-app-icon" style="width:42px;height:42px;border-radius:12px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--ink-2);flex-shrink:0;">
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:var(--ink);">Create Own App / Page</div>
                <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">Build &amp; publish custom apps &amp; catalogs</div>
              </div>
              <span class="pill info" style="font-size:8px;">BUILDER</span>
            </div>

            <!-- Auto Social Post App Card -->
            <div class="neu-app-card" onclick="openAppModule('SocialPost')" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat-sm);cursor:pointer;transition:all 0.25s var(--ease-bouncy);">
              <div class="neu-app-icon" style="width:42px;height:42px;border-radius:12px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--ink-2);flex-shrink:0;">
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:var(--ink);">Auto Social Post</div>
                <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">WhatsApp Catalog · Meta Feed · 1-Click</div>
              </div>
              <span class="pill ok" style="font-size:8px;">ACTIVE</span>
            </div>

            <!-- Meta Live Feed App Card -->
            <div class="neu-app-card" onclick="openAppModule('MetaFeed')" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat-sm);cursor:pointer;transition:all 0.25s var(--ease-bouncy);">
              <div class="neu-app-icon" style="width:42px;height:42px;border-radius:12px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--ink-2);flex-shrink:0;">
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:var(--ink);">Meta Live Feed</div>
                <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">Instagram &amp; Facebook Commerce</div>
              </div>
              <span class="pill info" style="font-size:8px;">SYNCED</span>
            </div>

            <!-- Daraz Sync App Card -->
            <div class="neu-app-card" onclick="openAppModule('DarazSync')" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat-sm);cursor:pointer;transition:all 0.25s var(--ease-bouncy);">
              <div class="neu-app-icon" style="width:42px;height:42px;border-radius:12px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--ink-2);flex-shrink:0;">
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:var(--ink);">Daraz Sync</div>
                <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">South Asia Marketplace Bridge</div>
              </div>
              <span class="pill amber" style="font-size:8px;">READY</span>
            </div>

            <!-- Shopify Omnichannel Suite Card -->
            <div class="neu-app-card" onclick="openAppModule('ShopifySuite')" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat-sm);cursor:pointer;transition:all 0.25s var(--ease-bouncy);border:1px solid var(--gold-dim);">
              <div class="neu-app-icon" style="width:42px;height:42px;border-radius:12px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0;">
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:var(--ink);">Shopify Omnichannel Suite</div>
                <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">Webhooks · B2B Draft Quotes · Multi-Stock · Promos</div>
              </div>
              <span class="pill gold" style="font-size:8px;">ARCHITECT</span>
            </div>
          </div>
        `;
        break;

      case 'product_showcase':
        contentHtml = `
          <div class="sec-h" style="padding-top:14px;">
            <span class="sec-h-label">Product Showcase &amp; Master Gallery</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="btn btn-sm btn-dark" onclick="window.openAdvancedProductForm()" style="font-size:11px;padding:4px 10px;" title="Add new product">+ New Product</button>
              <span class="sec-h-action" onclick="openAppModule('Products')">Manage All →</span>
            </div>
          </div>
          <div id="home-product-gallery-mount" class="home-product-gallery-wrap"></div>
        `;
        break;

      case 'daraz_sync':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">Daraz Marketplace Sync</span>
            <span class="sec-h-action" onclick="openAppModule('DarazSync')">Daraz Portal →</span>
          </div>
          <div class="dash-pinned-box" style="margin:0 20px 6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:38px;height:38px;border-radius:10px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--amber);flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                </div>
                <div>
                  <div style="font-size:13.5px;font-weight:700;color:var(--ink);">Daraz Bangladesh &amp; Pakistan Bridge</div>
                  <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">Catalog SKU mapping &amp; live price synchronization</div>
                </div>
              </div>
              <button class="btn btn-sm btn-gold" onclick="openAppModule('DarazSync')" style="font-size:10.5px;padding:4px 10px;">Push Catalog</button>
            </div>
          </div>
        `;
        break;

      case 'social_feed':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">Auto Social &amp; Meta Feed</span>
            <span class="sec-h-action" onclick="openAppModule('SocialPost')">Social Studio →</span>
          </div>
          <div class="dash-pinned-box" style="margin:0 20px 6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:38px;height:38px;border-radius:10px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--ok);flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
                </div>
                <div>
                  <div style="font-size:13.5px;font-weight:700;color:var(--ink);">WhatsApp Catalog &amp; Meta Commerce</div>
                  <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">1-Click product broadcasting to verified buyers</div>
                </div>
              </div>
              <button class="btn btn-sm btn-dark" onclick="openAppModule('SocialPost')" style="font-size:10.5px;padding:4px 10px;">Broadcast Post</button>
            </div>
          </div>
        `;
        break;

      case 'shopify_suite':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">Shopify Omnichannel Suite</span>
            <span class="sec-h-action" onclick="openAppModule('ShopifySuite')">Shopify Architect →</span>
          </div>
          <div class="dash-pinned-box" style="margin:0 20px 6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:38px;height:38px;border-radius:10px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <div>
                  <div style="font-size:13.5px;font-weight:700;color:var(--ink);">B2B Draft Quotes &amp; Webhook Matrix</div>
                  <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">Multi-location stock, custom tiered pricing rules</div>
                </div>
              </div>
              <button class="btn btn-sm btn-gold" onclick="openAppModule('ShopifySuite')" style="font-size:10.5px;padding:4px 10px;">Open Suite</button>
            </div>
          </div>
        `;
        break;

      case 'quote_builder':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">B2B Export Quote Builder</span>
            <span class="sec-h-action" onclick="openAppModule('QuoteBuilder')">Build Quote →</span>
          </div>
          <div class="dash-pinned-box" style="margin:0 20px 6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:38px;height:38px;border-radius:10px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--coral);flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div>
                  <div style="font-size:13.5px;font-weight:700;color:var(--ink);">FOB Chittagong Calculator &amp; RFQs</div>
                  <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">Live EUR / USD export pricing &amp; volume tiers</div>
                </div>
              </div>
              <button class="btn btn-sm btn-gold" onclick="openAppModule('QuoteBuilder')" style="font-size:10.5px;padding:4px 10px;">+ New Quote</button>
            </div>
          </div>
        `;
        break;

      case 'inventory_watch':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">Stock &amp; Inventory Watch</span>
            <span class="sec-h-action" onclick="openAppModule('Inventory')">Full Stock →</span>
          </div>
          <div style="margin:0 20px 6px;">
            ${renderInventoryInline()}
          </div>
        `;
        break;

      case 'fx_rates':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">FX Currency Ticker &amp; Margins</span>
            <span class="sec-h-action" onclick="openAppModule('FXRates')">FX Board →</span>
          </div>
          <div class="dash-pinned-box" style="margin:0 20px 6px;">
            <div style="display:flex;justify-content:space-around;align-items:center;flex-wrap:wrap;gap:12px;text-align:center;">
              <div>
                <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">EUR / BDT</div>
                <div style="font-size:16px;font-weight:800;color:var(--gold);font-family:var(--mono);">€1 = ৳131.40</div>
              </div>
              <div style="height:28px;width:1px;background:var(--wire);"></div>
              <div>
                <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">USD / BDT</div>
                <div style="font-size:16px;font-weight:800;color:var(--ok);font-family:var(--mono);">$1 = ৳121.80</div>
              </div>
              <div style="height:28px;width:1px;background:var(--wire);"></div>
              <div>
                <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">GBP / BDT</div>
                <div style="font-size:16px;font-weight:800;color:var(--coral);font-family:var(--mono);">£1 = ৳156.20</div>
              </div>
            </div>
          </div>
        `;
        break;

      case 'nexai_assistant':
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">NexAI Intelligence Terminal</span>
            <span class="sec-h-action" onclick="openAppModule('NexAI')">Open AI Terminal →</span>
          </div>
          <div class="dash-pinned-box" style="margin:0 20px 6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <input type="text" placeholder="Ask NexAI about leather tanning specs, HS Codes, or EU buyer compliance…" style="flex:1;background:var(--bg-neu);box-shadow:var(--neu-pressed-sm);border:1px solid var(--wire);border-radius:10px;padding:8px 12px;font-size:12px;color:var(--ink);" onkeydown="if(event.key==='Enter'){openAppModule('NexAI');}"/>
              <button class="btn btn-gold btn-sm" onclick="openAppModule('NexAI')" style="padding:8px 14px;font-size:11px;">Ask AI</button>
            </div>
          </div>
        `;
        break;

      default:
        contentHtml = `
          <div class="sec-h" style="padding-top:10px;">
            <span class="sec-h-label">${wDef.title}</span>
          </div>
          <div class="dash-pinned-box" style="margin:0 20px 6px;">
            <div style="font-size:13px;color:var(--ink-2);">${wDef.subtitle || 'Custom Pinned Module'}</div>
          </div>
        `;
    }

    widgetsHtml += `
      <div class="dash-widget-wrap ${isCustomizing ? 'is-customizing' : ''}" 
           draggable="${isCustomizing ? 'true' : 'false'}" 
           data-widget-id="${item.id}" 
           id="dash_widget_${item.id}">
        
        <div class="dash-widget-controls-bar">
          <div class="dash-drag-handle" title="Drag to reorder card">
            <span>⋮⋮</span>
            <span>${wDef.title}</span>
            <span class="pill gold" style="font-size:7px;letter-spacing:0.5px;">PINNED #${index + 1}</span>
          </div>
          <div style="display:flex;gap:4px;align-items:center;">
            <button class="dash-btn-mini" onclick="window.DashboardEngine.moveWidget('${item.id}', -1)" title="Move Up (Shift Higher)">▲</button>
            <button class="dash-btn-mini" onclick="window.DashboardEngine.moveWidget('${item.id}', 1)" title="Move Down (Shift Lower)">▼</button>
            <button class="dash-btn-mini" onclick="window.DashboardEngine.togglePin('${item.id}', false)" title="Unpin from Home" style="color:var(--coral);">✕</button>
          </div>
        </div>

        ${contentHtml}
      </div>
    `;
  });

  b.innerHTML = `
    <!-- Top Hero Header -->
    <div class="hero">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div class="hero-label">H&amp;H Nexus · Seller OS · ${mode === 'expert' ? 'Expert Mode' : 'Lite Mode'}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
          <button class="btn btn-sm btn-dark" onclick="window.DashboardEngine.openPinAppsModal()" style="font-size:10.5px;padding:4px 10px;" title="Pin your favorite apps to the dashboard">
            📌 Pin Apps
          </button>
          <button class="btn btn-sm ${isCustomizing ? 'btn-gold' : 'btn-dark'}" onclick="window.DashboardEngine.toggleCustomizing()" style="font-size:10.5px;padding:4px 10px;" title="Reorder and customize your dashboard widgets">
            ${isCustomizing ? '✓ Done Editing' : '✏️ Edit Layout'}
          </button>
        </div>
      </div>
      <div class="hero-display">
        <div class="hero-word" style="font-size:clamp(36px,9vw,60px); letter-spacing:1px;">HANDS &amp; HEAD</div>
      </div>
      <div class="hero-meta">
        <div class="hero-meta-line">Leather Export Terminal</div>
        <div class="hero-meta-line">EU Buyer Channel Active</div>
        <div class="hero-meta-line" style="color:var(--gold);cursor:pointer;" onclick="window.DashboardEngine.openPinAppsModal()">
          ${pinnedWidgets.length} Pinned Apps Active
        </div>
      </div>
    </div>

    <!-- Sticky Customization Helper Banner (when in Edit Layout mode) -->
    ${isCustomizing ? `
      <div class="dash-customizer-banner">
        <div class="banner-info">
          <div class="banner-icon">⠿</div>
          <div>
            <div style="font-size:13px;font-weight:800;color:var(--ink);">Drag &amp; Drop Dashboard Layout Active</div>
            <div style="font-size:10.5px;color:var(--ink-2);">Drag card handles (⋮⋮) to reorder or use ▲/▼ buttons to position your most-used apps.</div>
          </div>
        </div>
        <div class="dash-toolbar-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.DashboardEngine.openPinAppsModal()" style="font-size:10.5px;">+ Pin Apps</button>
          <button class="btn btn-secondary btn-sm" onclick="window.DashboardEngine.resetDefaultLayout()" style="font-size:10.5px;">↺ Reset</button>
          <button class="btn btn-gold btn-sm" onclick="window.DashboardEngine.toggleCustomizing(false)" style="font-size:10.5px;">✓ Done</button>
        </div>
      </div>
    ` : ''}

    <!-- Dynamic Pinned Widgets Container -->
    <div id="dash-widgets-mount" class="dash-widgets-mount">
      ${widgetsHtml}
    </div>

    <div style="height:16px;"></div>
  `;

  // Bind Quick Order logic
  setupQuickOrderLogic();
  
  // Render Super Responsive Home Product Gallery if mounted
  const galleryMount = document.getElementById("home-product-gallery-mount");
  if (galleryMount && typeof window.renderHomeProductGallery === "function") {
    window.renderHomeProductGallery(galleryMount);
  }

  // Bind native HTML5 Drag and Drop events to all widget cards
  if (engine && typeof engine.bindDragEvents === "function") {
    engine.bindDragEvents(b);
  }

  try {
    const [sf, of2] = await Promise.all([spine("getStats"), spine("listOrders")]);
    LS.set("stats", sf); LS.set("orders", of2.items);
  } catch(e) {}
}


/* ── Production View (Hiron's Mode) ── */
async function renderProductionView(b) {
  const o = LS.get("orders") || [];
  const pending = o.filter(x => x.st[1] === 'warn' || x.st[0] === 'PENDING' || x.st[0] === 'CONFIRMED');
  b.innerHTML = `
    <div class="hero" style="padding-bottom:14px;">
      <div class="hero-label">Production View — Hiron</div>
      <div class="hero-display" style="margin-bottom:8px;">
        <div class="hero-word" style="font-size:clamp(42px,12vw,64px); -webkit-text-stroke-color:var(--ok);">PROD</div>
        <div class="hero-word-filled" style="font-size:clamp(42px,12vw,64px); color:var(--ok);">PROD</div>
      </div>
      <div class="hero-meta">
        <div class="hero-meta-line">H&amp;H Nexus · Factory Floor Terminal</div>
      </div>
    </div>
    <div class="bento-grid">
      <div class="bento-card hero-stat" style="border-color:rgba(61,186,124,0.35);">
        <div class="bento-label" style="color:rgba(61,186,124,0.6);">Pending Production</div>
        <div class="bento-value" style="background:linear-gradient(135deg,#3DBA7C,#2A9A5E);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${pending.length}</div>
        <div class="bento-trend" style="color:var(--gold);">Orders awaiting production</div>
      </div>
      <div class="bento-card"><div class="bento-label">Total SKUs</div><div class="bento-value" style="font-size:34px;">4</div></div>
      <div class="bento-card"><div class="bento-label">Active</div><div class="bento-value" style="font-size:34px;">${o.length}</div></div>
    </div>
    <div class="sec-h"><span class="sec-h-label">Needs Production</span></div>
    <div class="orders-container">${pending.length ? ordersListHtml(pending) : '<div class="empty">All orders fulfilled</div>'}</div>
    <div class="sec-h" style="padding-top:14px;"><span class="sec-h-label">Inventory Status</span></div>
    ${renderInventoryInline()}
    <div style="height:8px;"></div>
  `;
}

function renderInventoryInline() {
  return `<div class="orders-container">
    ${dCat.map(p => {
      const pct = Math.min(100, (p.stock / 300) * 100);
      const color = p.stock < 80 ? 'var(--warn)' : p.stock < 150 ? 'var(--gold)' : 'var(--ok)';
      return `<div class="inv-row">
        <div class="inv-sku">${p.ini}</div>
        <div class="inv-name">${p.t}</div>
        <div class="inv-bar-wrap"><div class="inv-bar" style="width:${pct}%;background:${color};"></div></div>
        <div class="inv-count" style="color:${color};font-size:16px;">${p.stock}</div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ── Tab Bar ── */
function renderTabbar() {
  const bar = document.getElementById("tabbar"); if(!bar) return;
  const isHome = (!expScreen || expScreen === "dashboard" || expScreen === "Home");
  if (mode === "production") {
    bar.innerHTML = `
      <button class="tb ${isHome ? 'on' : ''}" onclick="navTo('Home')" title="Home">${I.home}</button>
      <button class="tb ${expScreen === 'Inventory' ? 'on' : ''}" onclick="openAppModule('Inventory')" title="Stock">${I.box}</button>
      <button class="tb hiron-btn" onclick="exitProduction()" title="Exit">${I.exit}</button>
    `;
    return;
  }
  if (mode === "lite") {
    bar.innerHTML = `
      <button class="tb ${isHome ? 'on' : ''}" onclick="navTo('Home')" title="Home">${I.home}</button>
      <button class="tb ${expScreen === 'EUPortal' ? 'on' : ''}" onclick="openAppModule('EUPortal')" title="EU Portal">${I.eu}</button>
      <button class="tb cam-fab" onclick="startCamera()" title="Capture">${I.cam}</button>
      <button class="tb ${expScreen === 'Analytics' ? 'on' : ''}" onclick="openAppModule('Analytics')" title="Analytics">${I.chart}</button>
      <button class="tb" onclick="openGate('expert')" title="Expert Mode">${I.lock}</button>
    `;
  } else {
    bar.innerHTML = `
      <button class="tb ${isHome ? 'on' : ''}" onclick="navTo('Home')" title="Home">${I.home}</button>
      <button class="tb ${expScreen === 'Orders' ? 'on' : ''}" onclick="openAppModule('Orders')" title="Orders">${I.orders}</button>
      <button class="tb cam-fab" onclick="startCamera()" title="Capture">${I.cam}</button>
      <button class="tb" onclick="openDrawer()" title="Menu"><svg viewBox="0 0 24 24" style="width:19px;height:19px;"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.7"/></svg></button>
      <button class="tb exit-btn" onclick="exitExpert()" title="Exit Expert">${I.exit}</button>
    `;
  }
}


/* ── Inject Portal CSS at runtime ── */
(function(){
  const s = document.createElement('style');
  s.textContent = `
/* ── Portal Dash Cards ── */
.portal-dash-card {
  background: var(--surface-2);
  border: 1px solid var(--wire);
  border-radius: 10px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 80px;
}
.portal-dash-card:hover { border-color: var(--gold); background: var(--surface-3); }
.pdc-eye { font-family: var(--mono); font-size: 8px; letter-spacing: 1.5px; color: var(--gold-dim); text-transform: uppercase; }
.pdc-name { font-family: var(--display); font-size: 18px; letter-spacing: 2px; color: var(--ink); line-height: 1; }
.pdc-meta { font-family: var(--mono); font-size: 8px; color: var(--ink-3); letter-spacing: 0.5px; margin-top: 2px; }
.pdc-open { font-family: var(--mono); font-size: 9px; color: var(--gold); letter-spacing: 1px; margin-top: 4px; }
/* ── Portal Full Overlay ── */
#portalOverlay {
  position: fixed; inset: 0; z-index: 180;
  background: #080808;
  display: flex; flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
}
#portalOverlay.on { transform: translateY(0); }
.portal-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--wire);
  background: #0a0a0a;
  flex-shrink: 0;
}
.portal-topbar-name { font-family: var(--display); font-size: 16px; letter-spacing: 3px; color: var(--ink); }
.portal-topbar-sub { font-family: var(--mono); font-size: 9px; color: var(--gold-dim); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 1px; }
.portal-close-btn {
  background: var(--surface-2); border: 1px solid var(--wire);
  border-radius: 8px; padding: 7px 14px;
  font-family: var(--mono); font-size: 10px; color: var(--ink-2);
  cursor: pointer; letter-spacing: 1px;
  transition: all 0.15s;
}
.portal-close-btn:hover { border-color: var(--gold); color: var(--gold); }
.portal-frame-wrap { flex: 1; overflow: hidden; position: relative; }
.portal-frame-wrap iframe { width: 100%; height: 100%; border: none; display: block; }
`;
  document.head.appendChild(s);
})();

/* ═══════════════════════════════════════════════════════════════
   DRAWER & NAVIGATION ARCHITECTURE (NEXT-LEVEL COMMAND MENU)
   ═══════════════════════════════════════════════════════════════ */

const NAV_SECTIONS = [
  {
    id: "core",
    title: "Core Operations",
    badge: "WORKPLACE",
    desc: "Primary commerce terminals and live order queues",
    items: [
      { label: "Home", icon: I.home, app: "Home", desc: "Main operator terminal & pinned shelf", ext: "DASH" },
      { label: "Orders", icon: I.orders, app: "Orders", chev: true, desc: "Live order stream & fulfillment tracker", ext: "POS" },
      { label: "Products", icon: I.tag, app: "Products", chev: true, desc: "Inventory catalog, variants & pricing matrix", ext: "CATALOG" },
      { label: "Customers", icon: I.inbox, app: "CRM", chev: true, desc: "Global wholesale buyer CRM & accounts", ext: "CRM" }
    ]
  },
  {
    id: "d2c",
    title: "D2C Portals",
    badge: "2 STORES",
    desc: "Direct-to-consumer storefronts & retail e-commerce channels",
    items: [
      { 
        label: "Shop (Front End)", 
        icon: I.globe, 
        url: "https://shop.handsandhead.com",
        app: "FrontEnd",
        desc: "shop.handsandhead.com · Global retail storefront", 
        ext: "D2C", 
        extClass: "d2c" 
      },
      { 
        label: "Japan Store (Arutemika)", 
        icon: I.leather, 
        url: "https://arutemika.official.ec",
        app: "JapanStore",
        desc: "arutemika.official.ec · Tokyo & Japan D2C Boutique (BASE)", 
        ext: "JAPAN", 
        extClass: "d2c" 
      }
    ]
  },
  {
    id: "finance",
    title: "Financial & Accounting ERP",
    badge: "ERP",
    desc: "Direct synchronization with account.handsandhead.com & Cloud ERPs",
    items: [
      { 
        label: "Accounting Sync", 
        icon: I.wallet, 
        app: "Accounting", 
        desc: "account.handsandhead.com · General ledger, QBO, Xero & Tax sync", 
        ext: "ERP", 
        extClass: "erp" 
      }
    ]
  },
  {
    id: "ecosystem",
    title: "Ecosystem & Portals",
    badge: "EXTERNAL",
    desc: "Headless B2B network hubs, RAWxOS & custom launchers",
    items: [
      { label: "Customize Dashboard Layout", icon: I.gear, fn: "window.DashboardEngine.openPinAppsModal()", desc: "Reorder and pin favorite widgets to Home", ext: "LAYOUT" },
      { label: "NexOS HUB", icon: I.link, url: "https://handfilm.github.io/nexus/os/hub/", desc: "nexus/os/hub · Enterprise distribution bridge", ext: "HUB" },
      { label: "Portal Launcher", icon: I.link, url: "https://handfilm.github.io/portal/", desc: "Universal gateway for B2B brand portals", ext: "LAUNCHER" },
      { label: "RAWxOS", icon: I.spark, url: "https://handfilm.github.io/RAWxOS/", desc: "Raw materials, tanning & chemical ledger OS", ext: "RAW" },
      { label: "HANDFILM", icon: I.cam, url: "https://handfilm.myshopify.com/", desc: "Official Shopify flagship studio", ext: "SHOPIFY" },
      { label: "H&H Nexus Website", icon: I.globe, url: "https://www.handsandhead.com/", desc: "Official corporate website & brand portfolio", ext: "WEB" }
    ]
  },
  {
    id: "buyer_portals",
    title: "Buyer Portals & B2B",
    badge: "GLOBAL",
    desc: "Dedicated export portals for European & International buyers",
    items: [
      { label: "Arutemika — Leather EU", icon: I.leather, app: "PortalArutemika", desc: "Wholesale leather goods catalog & RFQ for EU buyers", ext: "EU B2B", extClass: "b2b" },
      { label: "HANDS & HEAD — RMG", icon: I.rmg, app: "PortalRMG", desc: "RMG apparel manufacturing portal for EU & US brands", ext: "RMG B2B", extClass: "b2b" },
      { label: "EU Buyer Portal", icon: I.eu, app: "EUPortal", desc: "Curated collection & sample requests for EU buyers", ext: "PORTAL" },
      { label: "Quote Builder", icon: I.doc, app: "QuoteBuilder", desc: "Interactive pricing calculator & quotation generator", ext: "RFQ" }
    ]
  },
  {
    id: "operations",
    title: "B2B Operations & Logistics",
    badge: "COMMERCE",
    desc: "Omnichannel commerce, inventory tracking & scanning tools",
    items: [
      { label: "Shopify Suite", icon: I.tag, app: "ShopifySuite", desc: "Tokyo Atelier showroom, webhooks & draft orders", ext: "SHOPIFY" },
      { label: "Daraz Sync", icon: I.chart, app: "DarazSync", desc: "South Asia marketplace bridge & catalog sync", ext: "DARAZ" },
      { label: "Inventory Stock", icon: I.box, app: "Inventory", desc: "Real-time stock matrix & raw hide levels", ext: "STOCK" },
      { label: "Quote Builder", icon: I.doc, app: "QuoteBuilder", desc: "Pro-forma invoice & FOB export quote generator", ext: "QUOTE" },
      { label: "Shipment Tracking", icon: I.truck, app: "Tracking", desc: "Air & sea freight logistics status tracker", ext: "LOGISTICS" },
      { label: "QR & Barcode Scanner", icon: I.cam, fn: "window.startCamera('barcode')", desc: "Scan product hangtags & warehouse SKUs", ext: "CAM" }
    ]
  },
  {
    id: "studio",
    title: "Custom Apps & Studio",
    badge: "STUDIO",
    desc: "Custom page builder, social automation & feed bridges",
    items: [
      { label: "Create Own App", icon: I.box, app: "CustomApps", desc: "Deploy custom single-page apps & landing views", ext: "CREATE" },
      { label: "Custom Apps Studio", icon: I.store, app: "CustomApps", desc: "Browse pre-built brand apps & micro-tools", ext: "STUDIO" },
      { label: "Auto Social Post", icon: I.megaphone, app: "SocialPost", desc: "Automate Instagram, FB & TikTok product drops", ext: "SOCIAL" },
      { label: "Meta Live Feed", icon: I.spark, app: "MetaFeed", desc: "Graph API catalog sync for Instagram Shopping", ext: "META" }
    ]
  },
  {
    id: "intelligence",
    title: "Intelligence & Forecast",
    badge: "AI",
    desc: "Voice commands, AI forecasts, FX rates & compliance",
    items: [
      { label: "Voice Commands (Mic)", icon: I.mic, fn: "window.VoiceEngine.toggle()", desc: "Hands-free voice POS & order creation", ext: "MIC" },
      { label: "Analytics", icon: I.chart, app: "Analytics", desc: "Revenue velocity, margin breakdown & order charts", ext: "REPORTS" },
      { label: "NexAI Forecast", icon: I.ai, app: "NexAI", desc: "AI tanning advisor, compliance & market intelligence", ext: "AI" },
      { label: "FX Currency Rates", icon: I.fx, app: "FXRates", desc: "Live EUR, USD & GBP conversion ticker", ext: "FX" },
      { label: "Compliance Docs", icon: I.doc, app: "Compliance", desc: "REACH, BSCI, OEKO-TEX & EUDR certificate vault", ext: "DOCS" },
      { label: "Push Notifications", icon: I.bell, app: "Notifications", desc: "Real-time dispatch & browser alert center", ext: "PUSH" }
    ]
  },
  {
    id: "roles",
    title: "Access Control & Roles",
    badge: "SECURITY",
    desc: "Role-gated factory floor and manager terminals",
    items: [
      { label: "Production View (Hiron)", icon: I.hammer, gate: "production", desc: "Hiron's dedicated factory floor production queue", ext: "PIN: 2024" }
    ]
  }
];

const MODULE_MAP = {
  "Home": "Home",
  "dashboard": "Home",
  "Dashboard": "Home",
  "Orders": "Orders",
  "Products": "Products",
  "Customers": "CRM",
  "CRM": "CRM",
  "Buyer CRM": "CRM",
  "EUPortal": "EUPortal",
  "EU Buyer Portal": "EUPortal",
  "Analytics": "Analytics",
  "QuoteBuilder": "QuoteBuilder",
  "Quote Builder": "QuoteBuilder",
  "Inventory": "Inventory",
  "Stock": "Inventory",
  "Inventory Stock": "Inventory",
  "Tracking": "Tracking",
  "Shipment Tracking": "Tracking",
  "NexAI": "NexAI",
  "NexAI Forecast": "NexAI",
  "FXRates": "FXRates",
  "FX Rates": "FXRates",
  "FX Currency Rates": "FXRates",
  "Compliance": "Compliance",
  "Compliance Docs": "Compliance",
  "Notifications": "Notifications",
  "Push Notifications": "Notifications",
  "Accounting": "Accounting",
  "Accounting Sync": "Accounting",
  "Accounting Sync (account.handsandhead.com)": "Accounting",
  "account.handsandhead.com": "Accounting",
  "Front End": "FrontEnd",
  "FrontEnd": "FrontEnd",
  "Shop (Front End)": "FrontEnd",
  "Front End (shop.handsandhead.com)": "FrontEnd",
  "shop.handsandhead.com": "FrontEnd",
  "JapanStore": "JapanStore",
  "Japan Store": "JapanStore",
  "Japan Store (Arutemika)": "JapanStore",
  "arutemika.official.ec": "JapanStore",
  "SocialPost": "SocialPost",
  "Auto Social Post": "SocialPost",
  "MetaFeed": "MetaFeed",
  "Meta Live Feed": "MetaFeed",
  "DarazSync": "DarazSync",
  "Daraz Sync": "DarazSync",
  "Marketing": "Marketing",
  "OnlineStore": "OnlineStore",
  "Online Store": "OnlineStore",
  "PortalArutemika": "PortalArutemika",
  "Arutemika — Leather EU": "PortalArutemika",
  "PortalRMG": "PortalRMG",
  "HANDS & HEAD — RMG": "PortalRMG",
  "CustomApps": "CustomApps",
  "Create Own App": "CustomApps",
  "EnterpriseApps": "CustomApps",
  "Custom Apps Studio": "CustomApps",
  "ShopifySuite": "ShopifySuite",
  "Shopify Suite": "ShopifySuite",
  "Shopify": "ShopifySuite",
  "Webhooks": "ShopifySuite",
  "DraftOrders": "ShopifySuite",
  "InventoryMatrix": "ShopifySuite",
  "PriceRules": "ShopifySuite"
};

let _drawerFilterQuery = "";
const _collapsedSections = new Set();
let _activeQuickJump = null;

const QUICK_JUMP_CATEGORIES = [
  { id: "d2c", label: "D2C Stores", icon: I.globe, class: "qj-d2c", tag: "D2C" },
  { id: "finance", label: "Accounting ERP", icon: I.wallet, class: "qj-erp", tag: "ERP" },
  { id: "core", label: "Core POS", icon: I.home, class: "qj-core", tag: "POS" },
  { id: "buyer_portals", label: "Buyer B2B", icon: I.leather, class: "qj-b2b", tag: "B2B" },
  { id: "operations", label: "Operations", icon: I.box, class: "qj-ops", tag: "OPS" },
  { id: "ecosystem", label: "Ecosystem", icon: I.link, class: "qj-hub", tag: "HUB" },
  { id: "studio", label: "Studio", icon: I.spark, class: "qj-ops", tag: "APPS" },
  { id: "intelligence", label: "NexAI", icon: I.ai, class: "qj-ai", tag: "AI" }
];

function renderDrawerQuickJump() {
  const container = document.getElementById("drawerQuickJump");
  if (!container) return;

  container.innerHTML = QUICK_JUMP_CATEGORIES.map(c => `
    <button class="drawer-qjump-btn ${c.class} ${_activeQuickJump === c.id ? 'active' : ''}" 
            id="qjump_btn_${c.id}"
            onclick="window.quickJumpToSection('${c.id}')"
            title="Quick-Jump to ${c.label}">
      <span class="drawer-qjump-ic">${c.icon}</span>
      <span>${c.label}</span>
    </button>
  `).join("");
}

function quickJumpToSection(sectionId) {
  _activeQuickJump = sectionId;
  
  // If search query is currently filtering out this section, clear search
  if (_drawerFilterQuery) {
    const input = document.getElementById("drawerSearchInput");
    if (input) input.value = "";
    _drawerFilterQuery = "";
    const clearBtn = document.getElementById("drawerSearchClear");
    if (clearBtn) clearBtn.classList.remove("visible");
    const navContainer = document.getElementById("drawerNav");
    if (navContainer) navContainer.innerHTML = renderDrawerNav();
  }

  // If section was collapsed, automatically expand it
  if (_collapsedSections.has(sectionId)) {
    _collapsedSections.delete(sectionId);
    const secEl = document.getElementById(`nav_section_${sectionId}`);
    if (secEl) secEl.classList.remove('collapsed');
  }

  // Update active state on buttons
  renderDrawerQuickJump();

  // Smooth scroll directly to the targeted section in the drawer
  const target = document.getElementById(`nav_section_${sectionId}`);
  const navContainer = document.getElementById("drawerNav");
  if (target && navContainer) {
    const navTop = navContainer.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const scrollOffset = targetTop - navTop + navContainer.scrollTop - 6;

    navContainer.scrollTo({
      top: scrollOffset,
      behavior: "smooth"
    });

    // Apply attention pulse animation
    target.classList.remove("highlight-pulse");
    void target.offsetWidth; // force reflow
    target.classList.add("highlight-pulse");
    setTimeout(() => {
      target.classList.remove("highlight-pulse");
    }, 1200);
  }
}

function toggleDrawerSection(sectionId) {
  if (_collapsedSections.has(sectionId)) {
    _collapsedSections.delete(sectionId);
  } else {
    _collapsedSections.add(sectionId);
  }
  const el = document.getElementById(`nav_section_${sectionId}`);
  if (el) {
    el.classList.toggle('collapsed', _collapsedSections.has(sectionId));
  }
}

function filterDrawerNav(query) {
  _drawerFilterQuery = (query || "").trim().toLowerCase();
  const clearBtn = document.getElementById("drawerSearchClear");
  if (clearBtn) clearBtn.classList.toggle("visible", _drawerFilterQuery.length > 0);
  
  const navContainer = document.getElementById("drawerNav");
  if (navContainer) {
    navContainer.innerHTML = renderDrawerNav();
  }
}

function clearDrawerSearch() {
  const input = document.getElementById("drawerSearchInput");
  if (input) {
    input.value = "";
    input.focus();
  }
  filterDrawerNav("");
}

window.toggleDrawerSection = toggleDrawerSection;
window.filterDrawerNav = filterDrawerNav;
window.clearDrawerSearch = clearDrawerSearch;
window.quickJumpToSection = quickJumpToSection;
window.renderDrawerQuickJump = renderDrawerQuickJump;

function renderDrawerNav() {
  const storeId = window.NexAuth?.getStoreId() || "default";
  const customAcc = JSON.parse(localStorage.getItem(`hh_custom_accounting_${storeId}`) || "[]");
  const customSoc = JSON.parse(localStorage.getItem(`hh_custom_social_${storeId}`) || "[]");
  const customApps = JSON.parse(localStorage.getItem(`hh_custom_apps_registry_${storeId}`) || "[]");

  const q = _drawerFilterQuery;
  let html = "";

  NAV_SECTIONS.forEach(sec => {
    // Filter items
    const matchingItems = sec.items.filter(item => {
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        (item.desc && item.desc.toLowerCase().includes(q)) ||
        (item.ext && item.ext.toLowerCase().includes(q)) ||
        sec.title.toLowerCase().includes(q)
      );
    });

    if (matchingItems.length === 0 && q) return;

    const isCollapsed = !q && _collapsedSections.has(sec.id);

    html += `
      <div class="nav-section-group ${isCollapsed ? 'collapsed' : ''}" id="nav_section_${sec.id}">
        <div class="nav-section-header" onclick="window.toggleDrawerSection('${sec.id}')" title="Click to collapse/expand section">
          <div class="nav-section-title-wrap">
            <span class="nav-section-title">${sec.title}</span>
            <span class="nav-section-badge">${sec.badge || matchingItems.length}</span>
          </div>
          <span class="nav-section-toggle">▼</span>
        </div>
        <div class="nav-section-desc">${sec.desc}</div>
        <div class="nav-section-items">
    `;

    matchingItems.forEach(item => {
      let clickHandler = "";
      let rightBadge = item.ext ? `<span class="nav-ext ${item.extClass || ''}">${item.ext}</span>` : '';
      if (item.chev) rightBadge = `<span class="nav-chev">›</span>` + rightBadge;

      if (item.fn) {
        clickHandler = `onclick="${item.fn};closeDrawer();"`;
      } else if (item.url && item.app) {
        // Dual-purpose item: click opens in-app module view with direct launch link
        clickHandler = `onclick="closeDrawer();openAppModule('${item.app}');"`;
      } else if (item.url) {
        clickHandler = `onclick="window.open('${item.url}','_blank');closeDrawer();"`;
      } else if (item.app) {
        clickHandler = `onclick="closeDrawer();openAppModule('${item.app}');"`;
      } else if (item.gate) {
        clickHandler = `onclick="closeDrawer();openGate('${item.gate}');"`;
      } else {
        clickHandler = `onclick="navTo('${item.label}')"`;
      }

      html += `
        <button class="nav-row" ${clickHandler} title="${item.desc || item.label}">
          <div class="nav-row-main">
            <div class="nav-row-left">
              <span class="nav-ic">${item.icon}</span>
              <span class="nav-row-label">${item.label}</span>
            </div>
            ${rightBadge}
          </div>
          ${item.desc ? `<div class="nav-row-desc">${item.desc}</div>` : ''}
        </button>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  // Render Custom Apps Section if registered
  if (customApps.length || customAcc.length || customSoc.length) {
    html += `
      <div class="nav-section-group" id="nav_section_custom">
        <div class="nav-section-header">
          <div class="nav-section-title-wrap">
            <span class="nav-section-title">Your Custom Pages &amp; Integrations</span>
            <span class="nav-section-badge">${customApps.length + customAcc.length + customSoc.length}</span>
          </div>
        </div>
        <div class="nav-section-items">
    `;

    customApps.forEach(ca => {
      html += `
        <button class="nav-row" onclick="closeDrawer();openAppModule('CustomApps');">
          <div class="nav-row-main">
            <div class="nav-row-left">
              <span class="nav-ic">${I.spark}</span>
              <span class="nav-row-label">${ca.name}</span>
            </div>
            <span class="nav-ext" style="color:var(--gold);">PAGE</span>
          </div>
          <div class="nav-row-desc">Custom landing view (${ca.slug})</div>
        </button>
      `;
    });

    customAcc.forEach(ca => {
      html += `
        <button class="nav-row" onclick="closeDrawer();openAppModule('Accounting');window.openAccountingSettingsModal('${ca.id}');">
          <div class="nav-row-main">
            <div class="nav-row-left">
              <span class="nav-ic">${I.wallet}</span>
              <span class="nav-row-label">${ca.name}</span>
            </div>
            <span class="nav-ext erp">ERP</span>
          </div>
          <div class="nav-row-desc">Custom accounting connection</div>
        </button>
      `;
    });

    customSoc.forEach(cs => {
      html += `
        <button class="nav-row" onclick="closeDrawer();openAppModule('SocialPost');">
          <div class="nav-row-main">
            <div class="nav-row-left">
              <span class="nav-ic">${I.megaphone}</span>
              <span class="nav-row-label">${cs.name}</span>
            </div>
            <span class="nav-ext">SOC</span>
          </div>
          <div class="nav-row-desc">Social media publishing channel</div>
        </button>
      `;
    });

    html += `
        </div>
      </div>
    `;
  }

  return html;
}

/* ── DOM Mechanics & Dynamic Module Router ── */
function openDrawer() { 
  renderDrawerQuickJump();
  document.getElementById("drawerNav").innerHTML = renderDrawerNav(); 
  document.getElementById("drawer").classList.add("on"); 
  document.getElementById("drawerScrim").classList.add("on"); 
}
function closeDrawer() { 
  document.getElementById("drawer").classList.remove("on"); 
  document.getElementById("drawerScrim").classList.remove("on"); 
}

function navTo(label) {
  closeDrawer();
  closeSheet();
  const modKey = MODULE_MAP[label] || label;
  if (modKey === "Home" || modKey === "dashboard") {
    expScreen = "dashboard";
    const b = document.getElementById("body");
    if (b) {
      if (mode === "production") renderProductionView(b);
      else renderLiteHome(b);
    }
    renderTabbar();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  openAppModule(modKey);
}

function openAppModule(appName) {
  closeDrawer();
  closeSheet();
  const modKey = MODULE_MAP[appName] || appName;
  if (modKey === "Home" || modKey === "dashboard") {
    navTo("Home");
    return;
  }

  const b = document.getElementById("body");
  if (!b) return;

  // 1. Properly clear the #body container
  b.innerHTML = "";
  expScreen = modKey;

  // 2. Update navigation tabbar state
  renderTabbar();

  // 3. Inject top navigation return bar
  const navHeader = document.createElement("div");
  navHeader.className = "module-nav-bar";
  navHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 20px 8px;border-bottom:1px solid var(--wire);margin-bottom:8px;";
  navHeader.innerHTML = `
    <button class="btn btn-sm btn-dark" onclick="navTo('Home')" style="display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:6px 12px;cursor:pointer;">
      <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      <span>Dashboard</span>
    </button>
    <div style="font-family:var(--mono);font-size:10px;color:var(--gold-dim);letter-spacing:1.5px;text-transform:uppercase;">
      ${modKey}
    </div>
  `;
  b.appendChild(navHeader);

  // 4. Create module container
  const modContainer = document.createElement("div");
  modContainer.id = "mod-" + modKey;
  modContainer.className = "module-container";
  b.appendChild(modContainer);

  // 5. Dynamically inject the correct rendering function for the selected module
  const getRenderFn = () => {
    if (window.render && typeof window.render[modKey] === "function") return window.render[modKey];
    if (typeof window["render" + modKey] === "function") return window["render" + modKey];
    if (modKey === "Accounting" && typeof window.renderAccounting === "function") return window.renderAccounting;
    if (modKey === "SocialPost" && typeof window.renderSocialPost === "function") return window.renderSocialPost;
    return null;
  };

  const renderFn = getRenderFn();
  if (renderFn) {
    try {
      renderFn(modContainer);
    } catch(err) {
      console.error("Error rendering module:", modKey, err);
      modContainer.innerHTML = `<div style="padding:20px;color:var(--warn);">Failed to render ${modKey}: ${err.message}</div>`;
    }
  } else {
    // If not loaded yet, poll briefly
    modContainer.innerHTML = `<div style="padding:24px;font-family:var(--mono);color:var(--ink-3);font-size:11px;letter-spacing:1px;text-transform:uppercase;">Loading ${modKey}…</div>`;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const delayedFn = getRenderFn();
      if (delayedFn) {
        clearInterval(interval);
        modContainer.innerHTML = "";
        try {
          delayedFn(modContainer);
        } catch (e) {
          console.error("Delayed render error:", e);
          modContainer.innerHTML = `<div style="padding:20px;color:var(--warn);">Failed to render ${modKey}: ${e.message}</div>`;
        }
      } else if (attempts > 20) {
        clearInterval(interval);
        modContainer.innerHTML = `
          <div class="empty" style="padding:40px 20px;text-align:center;">
            <div style="font-weight:700;font-size:14px;color:var(--ink);margin-bottom:6px;">Module "${modKey}" is unavailable.</div>
            <div style="font-size:11.5px;color:var(--ink-3);margin-bottom:14px;">The module script could not be loaded. Please refresh.</div>
            <button class="btn btn-sm btn-gold" onclick="window.location.reload()" style="font-weight:700;">🔄 Reload Terminal</button>
          </div>
        `;
      }
    }, 150);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openSheet(html) { document.getElementById("sheet").innerHTML=`<div class="grab"></div>`+html; document.getElementById("sheet").classList.add("on"); document.getElementById("scrim").classList.add("on"); }
function closeSheet() { document.getElementById("sheet").classList.remove("on"); document.getElementById("scrim").classList.remove("on"); }


/* ── Portal Overlay DOM + Functions ── */
(function(){
  const ov = document.createElement('div');
  ov.id = 'portalOverlay';
  ov.innerHTML = `
    <div class="portal-topbar">
      <div>
        <div class="portal-topbar-name" id="portalName">PORTAL</div>
        <div class="portal-topbar-sub" id="portalSub">H&H Nexus</div>
      </div>
      <button class="portal-close-btn" onclick="closePortalOverlay()">✕ CLOSE</button>
    </div>
    <div class="portal-frame-wrap">
      <iframe id="portalFrame" src="" title="Portal" allow="fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
    </div>
  `;
  document.body.appendChild(ov);
})();

function openPortalOverlay(url, name, sub) {
  document.getElementById('portalName').textContent = name;
  document.getElementById('portalSub').textContent = sub || 'H&H Nexus Portal';
  document.getElementById('portalFrame').src = url;
  document.getElementById('portalOverlay').classList.add('on');
}
function closePortalOverlay() {
  document.getElementById('portalOverlay').classList.remove('on');
  setTimeout(() => { document.getElementById('portalFrame').src = ''; }, 400);
}

/* ── Gate System (Multi-Role) ── */
let _pendingGateRole = null;
function openGate(role = 'expert') {
  _pendingGateRole = role;
  const g = document.getElementById("gate");
  const sub = g.querySelector(".gate-sub");
  const hint = g.querySelector(".gate-role-hint");
  if (role === 'production') {
    if (sub) sub.innerText = "Production Access — Hiron Only";
    if (hint) hint.innerText = "Role: Production Head";
  } else {
    if (sub) sub.innerText = "Enter 4-Digit PIN to Unlock";
    if (hint) hint.innerText = "Role: Expert Operator";
  }
  g.classList.add("on");
  document.getElementById("gateScrim").classList.add("on");
  setTimeout(() => document.getElementById("gatePin").focus(), 300);
}
function closeGate() { document.getElementById("gate").classList.remove("on"); document.getElementById("gateScrim").classList.remove("on"); document.getElementById("gatePin").value=""; }
async function tryGate() {
  const pin = document.getElementById("gatePin").value.trim();
  const role = _pendingGateRole || 'expert';
  let isValid = false;
  if (window.NexAuth && typeof window.NexAuth.verifyOperatorPin === 'function') {
    isValid = await window.NexAuth.verifyOperatorPin(pin);
  }
  if (!isValid && typeof PINS !== 'undefined' && PINS[role]) {
    isValid = (pin === PINS[role]);
  }

  if (isValid) {
    mode = role; expScreen = "dashboard"; closeGate(); applyTheme(role); render();
    toast(role === 'production' ? "Production View Active ✓" : "Operator OS Unlocked ✓");
  } else {
    toast("Access Denied — Incorrect Operator PIN");
    const g = document.getElementById("gate");
    g.style.animation = "shake 0.45s ease";
    setTimeout(() => g.style.animation="", 450);
    document.getElementById("gatePin").value = "";
  }
}
function exitExpert() { mode="lite"; applyTheme("lite"); render(); toast("Returned to Lite Mode"); }
function exitProduction() { mode="lite"; applyTheme("lite"); render(); toast("Exited Production View"); }

/* ── Toast ── */
function toast(m) { const t=document.getElementById("toast"); if(!t)return; t.innerText=m; t.classList.add("on"); setTimeout(()=>t.classList.remove("on"),2500); }

/* ── Utility ── */
function startCamera(mode = 'photo') {
  if (window.CameraEngine && typeof window.CameraEngine.open === 'function') {
    window.CameraEngine.open({ mode });
  } else {
    openSheet(`<h3>Camera Engine</h3><div class="cam-stage"><div style="color:var(--ink-3);font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;">Initializing camera optics…</div></div>`);
  }
}
function openAllOrders() { openAppModule('Orders'); }
function ordersListHtml(o) {
  if(!o||!o.length) return `<div class="empty">No orders yet</div>`;
  return o.map(d=>`<div class="orow"><div class="othumb">NX</div><div class="om"><div class="ot">${d.t}</div><div class="os">${d.s}</div></div><div class="pill ${d.st[1]||'ok'}">${d.st[0]}</div></div>`).join("");
}

/* ── Search ── */
function openSearch() { openSheet(`<h3>Search</h3><div style="padding:0 20px;"><div class="field" style="margin-top:8px;"><input placeholder="Orders, products, buyers…" autofocus/></div></div>`); }
function openAiChat() { openAppModule('NexAI'); }
function openQuickSale() { openSheet(`<h3>Quick Sale</h3><div style="padding:0 20px;"><div class="field"><label>Item</label><input id="qs_item" placeholder="Product…"/></div><div class="field"><label>Price (৳)</label><input id="qs_price" type="number" placeholder="0.00"/></div><button class="btn btn-gold" style="margin-top:8px;" onclick="document.getElementById('q_item').value=document.getElementById('qs_item').value;document.getElementById('q_price').value=document.getElementById('qs_price').value;closeSheet();toast('Loaded into Quick Order');">Load to Quick Order</button></div>`); }

/* ── Quick Order Logic ── */
function setupQuickOrderLogic() {
  let qMethod = "whatsapp";
  const segs = document.querySelectorAll("#q_seg button");
  if(segs.length) segs.forEach(x=>{ x.onclick=()=>{ segs.forEach(y=>y.classList.remove("on")); x.classList.add("on"); qMethod=x.dataset.m; }; });
  const goBtn = document.getElementById("q_go");
  if(goBtn) {
    goBtn.onclick = async () => {
      const item = document.getElementById("q_item").value.trim(); if(!item) return;
      goBtn.innerText="Logging…";
      await spine("placeOrder",{item,price:document.getElementById("q_price").value,phone:document.getElementById("q_phone")?.value||"",method:qMethod});
      toast("Order Logged ✓"); const of2=await spine("listOrders"); LS.set("orders",of2.items); render();
    };
  }
}

/* ── Global Exports ── */
window.openGate=openGate; window.closeGate=closeGate; window.tryGate=tryGate;
window.startCamera=startCamera; window.exitExpert=exitExpert; window.exitProduction=exitProduction;
window.openAllOrders=openAllOrders; window.closeSheet=closeSheet; window.render=Object.assign(render, window.render || {});
window.openDrawer=openDrawer; window.closeDrawer=closeDrawer; window.navTo=navTo;
window.openAppModule=openAppModule; window.openAiChat=openAiChat; window.openSearch=openSearch;
window.openQuickSale=openQuickSale; window.ordersListHtml=ordersListHtml; window.dCat=dCat; window.dCompanies=dCompanies;

/* ── Boot ── */
render();
