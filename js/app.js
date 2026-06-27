/* ═══════════════════════════════════════════════════════════════
   NexOS v4 — js/app.js
   PWA · Radar · Role System · Push · FX · Core Render
   ═══════════════════════════════════════════════════════════════ */

/* ── PWA Manifest ── */
(function () {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#C9A84C'/><stop offset='1' stop-color='#8A6E2A'/></linearGradient></defs><rect width='512' height='512' rx='80' fill='url(#g)'/><path d='M136 380V140L376 380V140' fill='none' stroke='#000' stroke-width='54' stroke-linecap='square' stroke-linejoin='miter'/></svg>`;
  const icon = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const manifest = { name:"NEXUS Seller OS", short_name:"NEXUS", display:"standalone", background_color:"#080808", theme_color:"#080808", start_url:"/", icons:[{src:icon,sizes:"any",type:"image/svg+xml"}] };
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

/* ── Offline ── */
let offline = !navigator.onLine;
function setOffline(b) { offline=b; document.getElementById("offBar").classList.toggle("on",b); }
window.addEventListener("online",  () => { setOffline(false); render(); });
window.addEventListener("offline", () => setOffline(true));

/* ── Push Notifications Init ── */
(async function() {
  if (window.PushEngine) await window.PushEngine.init();
})();

/* ── Spine Dispatcher ── */
async function spine(action, payload={}) {
  if (typeof window.callSpine === "function") {
    try {
      if (action==="placeOrder"||action==="createOrder") { const r=await window.callSpine("createOrder",{OrderID:payload.OrderID||"NX-"+Math.floor(Math.random()*9000+1000),Customer:payload.Customer||payload.phone||"Walk-in",Total:payload.Total||payload.price||0,Items:payload.Items||payload.item||"Quick Sale"}); return r||{status:"success"}; }
      if (action==="createCustomer") { const r=await window.callSpine("createCustomer",{ID:payload.ID||"C-"+Date.now().toString().slice(-4),Name:payload.Name||"Unknown",LastName:payload.LastName||"",Email:payload.Email||"",Phone:payload.Phone||"",Address:payload.Address||""}); return r||{status:"success"}; }
      if (action==="createProduct") { const r=await window.callSpine("createProduct",payload); return r||{status:"success"}; }
      if (action==="listOrders"||action==="getOrders") { const lo=await window.callSpine("getOrders"); if(!lo.error&&Array.isArray(lo)){return{items:lo.map(o=>({id:o.OrderID||"NX-00",t:o.Items||"Live Order",s:o.Customer+" • ৳"+o.Total,st:[o.Status||"NEW","ok"]})).reverse()};} }
      if (action==="getStats") { const of2=await window.callSpine("getOrders"); const ol=Array.isArray(of2)?of2:[]; const sales=ol.reduce((a,c)=>a+parseInt(c.Total||0),0); return{salesToday:sales,ordersToday:ol.length,pending:0,catalog:0}; }
      if (action==="getFeed"||action==="getProducts") { const lp=await window.callSpine("getProducts"); if(!lp.error&&Array.isArray(lp)){return{items:lp.map(p=>({id:p.ID||"1",t:p.Name,cat:p.Vendor||"Live",price:p.Price||0,ini:p.SKU||"PRD",img:p.Image||""}))};} }
    } catch(e) { console.error("Spine Fallback:",e); }
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
  hammer:'<svg viewBox="0 0 24 24"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 010-3L12 9"/><path d="M17.64 15L22 10.64M20.35 6.35L6.36 20.35M13 6l2-2 4 4-2 2M3 20l7-7"/></svg>'
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
  if (mode === "lite")       mTag.innerText = "Lite Seller";
  else if (mode === "expert") mTag.innerText = "Expert OS";
  else if (mode === "production") mTag.innerText = "Production";
  const b = document.getElementById("body");
  if (mode === "production") renderProductionView(b);
  else renderLiteHome(b);
  renderTabbar();
}

/* ── Lite / Expert Home ── */
async function renderLiteHome(b) {
  const s = LS.get("stats") || {salesToday:0,ordersToday:0,pending:0};
  const o = LS.get("orders") || [];

  // Get FX for hero stat
  let fxLine = '';
  try {
    const fxList = await FXRates.formatAll(s.salesToday || 0);
    fxLine = fxList.slice(0,3).map(f=>`${f.symbol}${f.amount} ${f.currency}`).join(' · ');
  } catch(e) {}

  b.innerHTML = `
    <div class="hero">
      <div class="hero-label">H&amp;H Nexus · Seller OS · ${mode === 'expert' ? 'Expert Mode' : 'Lite Mode'}</div>
      <div class="hero-display">
        <div class="hero-word">NEXOS</div>
        <div class="hero-word-filled">NEXOS</div>
      </div>
      <div class="hero-meta">
        <div class="hero-meta-line">Leather Export · B2B Terminal</div>
        <div class="hero-meta-line">EU Buyer Channel Active</div>
      </div>
    </div>

    <div class="sec-h">
      <span class="sec-h-label">Live Dashboard</span>
      <span class="sec-h-action" onclick="render()">↻ Refresh</span>
    </div>
    <div class="bento-grid">
      <div class="bento-card hero-stat">
        <div class="bento-label">Sales Today</div>
        <div class="bento-value">৳${(s.salesToday||0).toLocaleString()}</div>
        <div class="bento-trend">Active pipeline</div>
        ${fxLine ? `<div class="bento-fx">${fxLine}</div>` : ''}
      </div>
      <div class="bento-card">
        <div class="bento-label">Pending</div>
        <div class="bento-value" style="font-size:36px;">${s.pending||0}</div>
      </div>
      <div class="bento-card">
        <div class="bento-label">Orders</div>
        <div class="bento-value" style="font-size:36px;">${s.ordersToday||0}</div>
      </div>
    </div>

    <div class="sec-h" style="padding-top:14px;"><span class="sec-h-label">Quick Access</span></div>
    <div class="action-rail">
      <button class="action-node" onclick="startCamera()">
        <div class="action-icon">${I.cam}</div><div class="action-label">Capture</div>
      </button>
      <button class="action-node" onclick="openAppModule('Products')">
        <div class="action-icon">${I.tag}</div><div class="action-label">Products</div>
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
    </div>

    ${mode === 'expert' ? `
    <div class="sec-h" style="padding-top:14px;"><span class="sec-h-label">Expert Tools</span></div>
    <div class="action-rail">
      <button class="action-node" onclick="openAppModule('NexAI')">
        <div class="action-icon">${I.ai}</div><div class="action-label">NexAI</div>
      </button>
      <button class="action-node" onclick="openAppModule('Compliance')">
        <div class="action-icon">${I.doc}</div><div class="action-label">Compliance</div>
      </button>
      <button class="action-node" onclick="openAppModule('FXRates')">
        <div class="action-icon">${I.fx}</div><div class="action-label">FX Rates</div>
      </button>
      <button class="action-node" onclick="openAppModule('Notifications')">
        <div class="action-icon">${I.bell}</div><div class="action-label">Push</div>
      </button>
    </div>` : ''}

    <div class="sec-h" style="padding-top:14px;">
      <span class="sec-h-label">Quick Order</span>
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

    <div class="sec-h" style="padding-top:18px;">
      <span class="sec-h-label">Recent Orders</span>
      <span class="sec-h-action" onclick="openAllOrders()">All →</span>
    </div>
    <div class="orders-container" id="recentList">${ordersListHtml(o.slice(0,5))}</div>
    <div style="height:8px;"></div>
  `;

  setupQuickOrderLogic();
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
  if (mode === "production") {
    bar.innerHTML = `
      <button class="tb on">${I.home}</button>
      <button class="tb" onclick="openAppModule('Inventory')">${I.box}</button>
      <button class="tb hiron-btn" onclick="exitProduction()">${I.exit}</button>
    `;
    return;
  }
  if (mode === "lite") {
    bar.innerHTML = `
      <button class="tb on">${I.home}</button>
      <button class="tb" onclick="openAppModule('EUPortal')">${I.eu}</button>
      <button class="tb cam-fab" onclick="startCamera()">${I.cam}</button>
      <button class="tb" onclick="openAppModule('Analytics')">${I.chart}</button>
      <button class="tb" onclick="openGate('expert')">${I.lock}</button>
    `;
  } else {
    bar.innerHTML = `
      <button class="tb" onclick="expScreen='dashboard';render()">${I.home}</button>
      <button class="tb" onclick="openAppModule('Orders')">${I.orders}</button>
      <button class="tb cam-fab" onclick="startCamera()">${I.cam}</button>
      <button class="tb" onclick="openDrawer()"><svg viewBox="0 0 24 24" style="width:19px;height:19px;"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.7"/></svg></button>
      <button class="tb exit-btn" onclick="exitExpert()">${I.exit}</button>
    `;
  }
}

/* ── Drawer ── */
const NAV = [
  {label:"Home",icon:I.home},{label:"Orders",icon:I.orders,chev:true},{label:"Products",icon:I.tag,chev:true},{label:"Customers",icon:I.inbox,chev:true},
  {sep:"B2B Operations"},
  {label:"EU Buyer Portal",icon:I.eu,app:"EUPortal"},{label:"Quote Builder",icon:I.doc,app:"QuoteBuilder"},{label:"Buyer CRM",icon:I.users,app:"CRM"},{label:"Inventory",icon:I.box,app:"Inventory"},{label:"Shipment Tracking",icon:I.truck,app:"Tracking"},
  {sep:"Intelligence"},
  {label:"Analytics",icon:I.chart,app:"Analytics"},{label:"NexAI Forecast",icon:I.ai,app:"NexAI"},{label:"FX Rates",icon:I.fx,app:"FXRates"},{label:"Compliance Docs",icon:I.doc,app:"Compliance"},{label:"Push Notifications",icon:I.bell,app:"Notifications"},
  {sep:"Ecosystem"},
  {label:"NexOS HUB",icon:I.link,url:"https://handfilm.github.io/nexus/os/hub/"},{label:"Portal Launcher",icon:I.link,url:"https://handfilm.github.io/portal/"},{label:"FrontEnd (Handsandhead)",icon:I.globe,url:"https://handfilm.myshopify.com/pages/handsandhead"},
  {sep:"Apps"},
  {label:"Accounting Sync",icon:I.wallet,app:"Accounting"},{label:"Auto Social Post",icon:I.megaphone,app:"SocialPost"},{label:"Meta Live Feed",icon:I.spark,app:"MetaFeed"},{label:"Daraz Sync",icon:I.chart,app:"DarazSync"},
  {sep:"Roles"},
  {label:"Production View (Hiron)",icon:I.hammer,gate:"production"}
];

function renderDrawerNav() {
  return NAV.map(n => {
    if (n.sep)  return `<span class="nav-section">${n.sep}</span>`;
    if (n.url)  return `<button class="nav-row" onclick="window.open('${n.url}','_blank');closeDrawer();"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div><span class="nav-ext">↗ EXT</span></button>`;
    if (n.app)  return `<button class="nav-row" onclick="closeDrawer();openAppModule('${n.app}');"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div></button>`;
    if (n.gate) return `<button class="nav-row" onclick="closeDrawer();openGate('${n.gate}');" style="color:var(--ok);"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div><span class="nav-ext" style="color:var(--ok);">PIN</span></button>`;
    return `<button class="nav-row" onclick="navTo('${n.label}')"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div></button>`;
  }).join("");
}

/* ── DOM Mechanics ── */
function openDrawer() { document.getElementById("drawerNav").innerHTML=renderDrawerNav(); document.getElementById("drawer").classList.add("on"); document.getElementById("drawerScrim").classList.add("on"); }
function closeDrawer() { document.getElementById("drawer").classList.remove("on"); document.getElementById("drawerScrim").classList.remove("on"); }
function navTo(label) { closeDrawer(); if(label==="Home"){expScreen="dashboard";render();return;} if(window.render&&window.render[label]){openSheet(`<div id="modMount"></div>`);window.render[label](document.getElementById("modMount"));} }
function openAppModule(appName) { if(window.render&&window.render[appName]){openSheet(`<div id="modMount"></div>`);window.render[appName](document.getElementById("modMount"));} }
function openSheet(html) { document.getElementById("sheet").innerHTML=`<div class="grab"></div>`+html; document.getElementById("sheet").classList.add("on"); document.getElementById("scrim").classList.add("on"); }
function closeSheet() { document.getElementById("sheet").classList.remove("on"); document.getElementById("scrim").classList.remove("on"); }

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
function tryGate() {
  const pin = document.getElementById("gatePin").value.trim();
  const role = _pendingGateRole || 'expert';
  if (pin === PINS[role]) {
    mode = role; expScreen = "dashboard"; closeGate(); applyTheme(role); render();
    toast(role === 'production' ? "Production View Active ✓" : "Expert OS Unlocked ✓");
  } else {
    toast("Access Denied");
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
function startCamera() { openSheet(`<h3>Camera Engine</h3><div class="cam-stage"><div style="color:var(--ink-3);font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;">Active on native deployment</div></div>`); }
function openAllOrders() { const o=LS.get("orders")||[]; openSheet(`<h3>All Orders</h3><div class="orders-container" style="margin:0 20px;">${ordersListHtml(o)}</div>`); }
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
window.openAllOrders=openAllOrders; window.closeSheet=closeSheet; window.render=render;
window.openDrawer=openDrawer; window.closeDrawer=closeDrawer; window.navTo=navTo;
window.openAppModule=openAppModule; window.openAiChat=openAiChat; window.openSearch=openSearch;
window.openQuickSale=openQuickSale; window.ordersListHtml=ordersListHtml; window.dCat=dCat; window.dCompanies=dCompanies;

/* ── Boot ── */
render();
