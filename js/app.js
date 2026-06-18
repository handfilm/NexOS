/* ===========================================================
   PWA BOOT & MANIFEST
   =========================================================== */
(function(){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#CBF260'/><stop offset='1' stop-color='#FFD12E'/></linearGradient></defs><rect width='512' height='512' rx='112' fill='url(#g)'/><path d='M168 360 V160 L344 360 V160' fill='none' stroke='#16160E' stroke-width='54' stroke-linecap='square' stroke-linejoin='miter'/></svg>`;
  const icon = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const manifest = { name: "NEXUS Seller OS", short_name: "NEXUS", display: "standalone", background_color: "#FAF6EA", theme_color: "#FAF6EA", icons: [{src: icon, sizes: "any", type: "image/svg+xml"}] };
  try {
    const ml = document.createElement("link"); ml.rel = "manifest";
    ml.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], {type: "application/manifest+json"}));
    document.head.appendChild(ml);
  } catch(e) {}
})();

const WHATSAPP = "8801974518600";
const OPERATOR_PIN = "1981";

const LS = {
  get(k)   { try { return JSON.parse(localStorage.getItem("nx_"+k)); } catch(e){ return null; } },
  set(k,v) { try { localStorage.setItem("nx_"+k, JSON.stringify(v)); } catch(e){} }
};

let offline = !navigator.onLine;
function setOffline(b) { offline = b; document.getElementById("offBar").classList.toggle("on", b); }
window.addEventListener("online",  () => { setOffline(false); render(); });
window.addEventListener("offline", () => setOffline(true));

/* ===========================================================
   THE LIVE BRIDGE: Omnichannel Spine Link
   =========================================================== */
async function spine(action, payload={}) {
  if (typeof window.callSpine === "function") {
    try {
      if (action === "placeOrder" || action === "createOrder") {
        const response = await window.callSpine("createOrder", {
          OrderID: payload.OrderID || "NX-" + Math.floor(Math.random() * 9000 + 1000),
          Customer: payload.Customer || payload.phone || "Walk-in",
          Total: payload.Total || payload.price || 0,
          Items: payload.Items || payload.item || "Quick Sale"
        });
        return response || { status: "success" };
      }
      if (action === "createCustomer") {
        const response = await window.callSpine("createCustomer", {
          ID: payload.ID || "C-" + Date.now().toString().slice(-4),
          Name: payload.Name || "Unknown", LastName: payload.LastName || "",
          Email: payload.Email || "", Phone: payload.Phone || "", Address: payload.Address || ""
        });
        return response || { status: "success" };
      }
      if (action === "createProduct") {
        const response = await window.callSpine("createProduct", payload);
        return response || { status: "success" };
      }
      if (action === "listOrders" || action === "getOrders") {
        const liveOrders = await window.callSpine("getOrders");
        if (!liveOrders.error && Array.isArray(liveOrders)) {
          return { items: liveOrders.map(o => ({ id: o.OrderID || "NX-00", t: o.Items || "Live Order", s: o.Customer + " • ৳" + o.Total, st: [o.Status || "NEW", "ok"] })).reverse() };
        }
      }
      if (action === "getStats") {
        const ordersFresh = await window.callSpine("getOrders");
        const oList = Array.isArray(ordersFresh) ? ordersFresh : [];
        const sales = oList.reduce((acc, curr) => acc + parseInt(curr.Total || 0), 0);
        return { salesToday: sales, ordersToday: oList.length, pending: 0, catalog: 0 };
      }
      if (action === "getFeed" || action === "getProducts") {
        const liveProds = await window.callSpine("getProducts");
        if (!liveProds.error && Array.isArray(liveProds)) {
          return { items: liveProds.map(p => ({ id: p.ID || "1", t: p.Name, cat: p.Vendor || "Live", price: p.Price || 0, ini: p.SKU || "PRD", img: p.Image || "" }))};
        }
      }
    } catch(e) { console.error("Spine Engine Fallback Loop:", e); }
  }
  return demoSpine(action, payload);
}

let dOrders = [{id:"NX-1045", t:"The Handfilm Masterclass", s:"WhatsApp · Dhaka", st:["PENDING","warn"]}];
const dCat = [{id:"t1", t:"The Zero-Click Pipeline", cat:"TECH", price:1200, ini:"NEN"}];
function demoSpine(a, p) {
  if (a === "getStats") return Promise.resolve({salesToday:1200, ordersToday:1, pending:0, catalog:1});
  if (a === "getFeed") return Promise.resolve({items: dCat});
  if (a === "listOrders") return Promise.resolve({items: dOrders});
  if (a === "placeOrder") { dOrders.unshift({id:"NX-"+Date.now().toString().slice(-4), t:p.item, s:p.method, st:["NEW","amber"]}); return Promise.resolve({ok:true, status:"NEW"}); }
  return Promise.resolve({items:[]});
}

/* ===========================================================
   ICONS
   =========================================================== */
const I = {
  cam: '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 10l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  inbox: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h5l2 3h4l2-3h5"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M3 12v-7a2 2 0 012-2h7l9 9a2 2 0 010 2.8l-5.6 5.6a2 2 0 01-2.8 0L3 12z"/><circle cx="8" cy="8" r="2"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
  exit: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  orders: '<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05L4.93 4.93"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18"/></svg>',
  wallet: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M16 12h3"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M11 20V4M18 20v-7"/></svg>',
  store: '<svg viewBox="0 0 24 24"><path d="M3 9l1-5h16l1 5"/><path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9"/><path d="M9 20v-6h6v6"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" fill="none"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
};

/* ===========================================================
   CORE UI RENDERING
   =========================================================== */
let mode = "lite"; let expScreen = "dashboard"; let camStream = null; let lastShot = null;

function applyTheme(m) {
  document.body.classList.add("theme-transitioning");
  if (m === "expert") { document.body.classList.add("dark"); } 
  else { document.body.classList.remove("dark"); }
  setTimeout(() => document.body.classList.remove("theme-transitioning"), 500);
}

function render() {
  const mTag = document.getElementById("modeTag");
  mTag.innerText = mode === "lite" ? "Lite Seller" : "Expert OS";
  const b = document.getElementById("body");
  if (mode === "lite") renderLiteHome(b);
  else renderExpertBody(b);
  renderTabbar();
}

async function renderLiteHome(b) {
  const s = LS.get("stats") || {salesToday:0, ordersToday:0, pending:0};
  const o = LS.get("orders") || [];

  b.innerHTML = `
    <div class="pgrid" style="margin-top:20px; gap:12px;">
      <button class="pcard" onclick="startCamera()" style="background:var(--surface); border:1px solid var(--line); padding:20px; border-radius:24px; text-align:center;">
        <div style="width:50px; height:50px; background:var(--grad); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 10px;">${I.cam}</div>
        <div style="font-weight:900; font-size:13px; color:var(--text); text-align:center; width:100%;">One-Tap Capture</div>
      </button>
      <button class="pcard" onclick="window.openAppModule('Products')" style="background:var(--surface); border:1px solid var(--line); padding:20px; border-radius:24px; text-align:center;">
        <div style="width:50px; height:50px; background:var(--grad); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 10px;">${I.tag}</div>
        <div style="font-weight:900; font-size:13px; color:var(--text); text-align:center; width:100%;">Create Products</div>
      </button>
      <button class="pcard" onclick="window.openAppModule('MetaFeed')" style="background:var(--surface); border:1px solid var(--line); padding:20px; border-radius:24px; text-align:center;">
        <div style="width:50px; height:50px; background:var(--grad); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 10px;">${I.store}</div>
        <div style="font-weight:900; font-size:13px; color:var(--text); text-align:center; width:100%;">Go FB Live</div>
      </button>
      <button class="pcard" onclick="window.openAppModule('SocialPost')" style="background:var(--surface); border:1px solid var(--line); padding:20px; border-radius:24px; text-align:center;">
        <div style="width:50px; height:50px; background:var(--grad); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 10px;">${I.spark}</div>
        <div style="font-weight:900; font-size:13px; color:var(--text); text-align:center; width:100%;">NexAI</div>
      </button>
    </div>
    <div class="counters" id="counters" style="margin-top:10px;">
      <div class="stat hero"><div class="lab">Sales Today</div><div class="val">৳${s.salesToday}</div></div>
      <div class="stat"><div class="lab">Pending</div><div class="val">${s.pending || 0}</div></div>
      <div class="stat"><div class="lab">Orders</div><div class="val">${s.ordersToday || 0}</div></div>
    </div>
    <div class="sec-h"><h2>Quick Order</h2></div>
    <div class="card">
      <div class="field"><input id="q_item" placeholder="Product / SKU"></div>
      <div style="display:flex; gap:10px;"><div class="field" style="flex:1"><input id="q_price" type="number" placeholder="৳ Price"></div><div class="field" style="flex:1"><input id="q_phone" placeholder="Phone"></div></div>
      <div class="seg" id="q_seg" style="margin-bottom:14px;"><button class="on" data-m="whatsapp">WhatsApp</button><button data-m="bkash">bKash</button><button data-m="nagad">Nagad</button></div>
      <button class="btn btn-grad" id="q_go">Log Order</button>
    </div>
    <div class="sec-h"><h2>Recent Orders</h2><span class="more" onclick="openAllOrders()">All →</span></div>
    <div class="card" id="recentList" style="padding:0 16px">${ordersListHtml(o.slice(0,5))}</div>
  `;

  setupQuickOrderLogic();
  try {
    const [sFresh, oFresh] = await Promise.all([spine("getStats"), spine("listOrders")]);
    LS.set("stats", sFresh); LS.set("orders", oFresh.items);
  } catch(e) {}
}

function setupQuickOrderLogic() {
  let qMethod = "whatsapp";
  const segs = document.querySelectorAll("#q_seg button");
  if(segs.length) {
    segs.forEach(x => {
      x.onclick = () => { document.querySelectorAll("#q_seg button").forEach(y => y.classList.remove("on")); x.classList.add("on"); qMethod = x.dataset.m; };
    });
  }
  const goBtn = document.getElementById("q_go");
  if(goBtn) {
    goBtn.onclick = async () => {
      const item = document.getElementById("q_item").value.trim(); if (!item) return;
      goBtn.innerText = "Logging...";
      await spine("placeOrder", { item, price: document.getElementById("q_price").value, phone: document.getElementById("q_phone").value, method: qMethod });
      toast("Order Logged ✓"); const oFresh = await spine("listOrders"); LS.set("orders", oFresh.items); render();
    };
  }
}

function openAllOrders() { const o = LS.get("orders") || []; openSheet(`<div class="sec-h"><h2>All Orders</h2></div><div style="padding:16px;">${ordersListHtml(o)}</div>`); }
function renderExpertBody(b) { renderLiteHome(b); }
function ordersListHtml(o) { if(!o || !o.length) return `<div class="empty">No orders logged yet</div>`; return o.map(d => `<div class="orow"><div class="othumb">NX</div><div class="om"><div class="ot">${d.t}</div><div class="os">${d.s}</div></div><div class="pill ok">${d.st[0]}</div></div>`).join(""); }

/* ===========================================================
   TABBAR & DRAWER ROUTER INTERFACES
   =========================================================== */
function renderTabbar() {
  const bar = document.getElementById("tabbar");
  if(!bar) return;
  if (mode === "lite") { bar.innerHTML = `<button class="tb on">${I.home}</button><button class="tb cam-fab" onclick="startCamera()">${I.cam}</button><button class="tb" onclick="openGate()">${I.lock}</button>`; } 
  else { bar.innerHTML = `<button class="tb" onclick="expScreen='dashboard';render()">${I.home}</button><button class="tb" onclick="navTo('Products')">${I.tag}</button><button class="tb cam-fab" onclick="startCamera()">${I.cam}</button><button class="tb" onclick="openDrawer()"><svg viewBox="0 0 24 24" style="width:22px;height:22px;"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2"/></svg></button><button class="tb exit-btn" onclick="exitExpert()">${I.exit}</button>`; }
}

const NAV = [
  {label:"Home", icon:I.home}, {label:"Orders", icon:I.orders, chev:true}, {label:"Products", icon:I.tag, chev:true}, {label:"Customers", icon:I.inbox, chev:true},
  {sep:"Ecosystem HUB & Portals >"},
  {label:"NexOS HUB", icon:I.link, url:"https://handfilm.github.io/nexus/os/hub/"}, {label:"Portal Launcher", icon:I.link, url:"https://handfilm.github.io/portal/"},
  {sep:"Sales Channels (Modules) >"},
  {label:"BackEnd Store Modules", icon:I.store, chev:true}, {label:"Standard Theme Customization", icon:I.gear, chev:true}, {label:"FrontEnd (Handsandhead)", icon:I.globe, url:"https://handfilm.myshopify.com/pages/handsandhead"},
  {sep:"E-Commerce Next Level Apps >"},
  {label:"Accounting Sync", icon:I.wallet, app:"Accounting"}, {label:"Auto Social Post", icon:I.megaphone, app:"SocialPost"}, {label:"Meta Live Feed", icon:I.spark, app:"MetaFeed"}, {label:"Daraz Sync Pipeline", icon:I.chart, app:"DarazSync"}
];

function renderDrawerNav() {
  return NAV.map(n => {
    if (n.sep) return `<span class="nav-section">${n.sep}</span>`;
    if (n.url) return `<button class="nav-row" onclick="window.open('${n.url}', '_blank'); closeDrawer();"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div><span>EXT ↗</span></button>`;
    if (n.app) return `<button class="nav-row" onclick="closeDrawer(); openAppModule('${n.app}');"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div></button>`;
    return `<button class="nav-row" onclick="navTo('${n.label}')"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div></button>`;
  }).join("");
}

function openDrawer() { document.getElementById("drawer").innerHTML = `<nav class="drawer-nav">${renderDrawerNav()}</nav>`; document.getElementById("drawer").classList.add("on"); document.getElementById("drawerScrim").classList.add("on"); }
function closeDrawer() { document.getElementById("drawer").classList.remove("on"); document.getElementById("drawerScrim").classList.remove("on"); }

function navTo(label) { closeDrawer(); if (label === "Home") { expScreen = "dashboard"; render(); return; } if (window.render && window.render[label]) { openSheet(`<div id="modMount"></div>`); window.render[label](document.getElementById("modMount")); } }
function openAppModule(appName) { if (window.render && window.render[appName]) { openSheet(`<div id="modMount"></div>`); window.render[appName](document.getElementById("modMount")); } }

/* ===========================================================
   DOM MECHANICS
   =========================================================== */
function openSheet(html) { document.getElementById("sheet").innerHTML = `<div class="grab"></div>` + html; document.getElementById("sheet").classList.add("on"); document.getElementById("scrim").classList.add("on"); }
function closeSheet() { document.getElementById("sheet").classList.remove("on"); document.getElementById("scrim").classList.remove("on"); }
function openGate() { document.getElementById("gate").classList.add("on"); document.getElementById("gateScrim").classList.add("on"); }
function closeGate() { document.getElementById("gate").classList.remove("on"); document.getElementById("gateScrim").classList.remove("on"); }
function tryGate() { if (document.getElementById("gatePin").value.trim() === OPERATOR_PIN) { mode = "expert"; expScreen = "dashboard"; closeGate(); applyTheme("expert"); render(); toast("Expert OS Unlocked ✓"); } else { toast("Access Denied"); } }
function exitExpert() { mode = "lite"; applyTheme("lite"); render(); toast("Returned to Lite Mode"); }
function toast(m) { const t = document.getElementById("toast"); if(t) { t.innerText = m; t.classList.add("on"); setTimeout(() => t.classList.remove("on"), 2500); } }
function startCamera() { openSheet(`<div class="sec-h"><h2>Camera Engine</h2></div><div class="cam-stage"><div style="color:var(--muted); font-family:var(--mono);">Camera active on native app deployment.</div></div>`); }

window.openGate = openGate; window.closeGate = closeGate; window.tryGate = tryGate; window.startCamera = startCamera; window.exitExpert = exitExpert; window.openAllOrders = openAllOrders; window.closeSheet = closeSheet; window.render = render; window.openDrawer = openDrawer; window.closeDrawer = closeDrawer; window.navTo = navTo; window.openAppModule = openAppModule;

render();
