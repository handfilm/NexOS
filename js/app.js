/* ═══════════════════════════════════════════════════════════════
   NexOS v3 — js/app.js
   PWA Boot · Radar Canvas · Core Render · UI Mechanics
   ═══════════════════════════════════════════════════════════════ */

/* ── PWA Manifest ── */
(function () {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#C9A84C'/><stop offset='1' stop-color='#8A6E2A'/></linearGradient></defs><rect width='512' height='512' rx='80' fill='url(#g)'/><path d='M136 380V140L376 380V140' fill='none' stroke='#000' stroke-width='54' stroke-linecap='square' stroke-linejoin='miter'/></svg>`;
  const icon = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const manifest = {
    name: "NEXUS Seller OS", short_name: "NEXUS", display: "standalone",
    background_color: "#080808", theme_color: "#080808",
    icons: [{ src: icon, sizes: "any", type: "image/svg+xml" }]
  };
  try {
    const ml = document.createElement("link"); ml.rel = "manifest";
    ml.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
    document.head.appendChild(ml);
  } catch (e) {}
})();

/* ── Radar Canvas ── */
(function () {
  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, cx, cy, maxR, sweep = 0, trails = [], dots = [];
  const GOLD = 'rgba(201,168,76,';

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cx = W * 0.72; cy = H * 0.28;
    maxR = Math.max(W, H) * 0.65;
    dots = Array.from({ length: 12 }, () => ({
      angle: Math.random() * Math.PI * 2,
      r: maxR * (0.15 + Math.random() * 0.72),
      alpha: 0.4 + Math.random() * 0.6,
      size: 1 + Math.random() * 2,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Concentric rings
    for (let i = 1; i <= 5; i++) {
      const r = (maxR / 5) * i;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = GOLD + (0.06 - i * 0.008) + ')';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Crosshairs
    ctx.strokeStyle = GOLD + '0.05)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();

    // Sweep trail
    trails.push({ angle: sweep, alpha: 0.55 });
    if (trails.length > 48) trails.shift();
    trails.forEach((t, i) => {
      const a = t.alpha * (i / trails.length) * 0.7;
      const len = 0.08;
      const sa = t.angle - len * (1 - i / trails.length) * 3;
      const ea = t.angle;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR * 0.95, sa, ea);
      ctx.closePath();
      ctx.fillStyle = GOLD + (a * 0.18) + ')';
      ctx.fill();
    });

    // Main sweep line
    const ex = cx + Math.cos(sweep) * maxR * 0.95;
    const ey = cy + Math.sin(sweep) * maxR * 0.95;
    const lineGrad = ctx.createLinearGradient(cx, cy, ex, ey);
    lineGrad.addColorStop(0, GOLD + '0.6)');
    lineGrad.addColorStop(1, GOLD + '0)');
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = lineGrad; ctx.lineWidth = 1.5; ctx.stroke();

    // Center dot
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = GOLD + '0.8)'; ctx.fill();

    // Blips
    dots.forEach(d => {
      const dx = cx + Math.cos(d.angle) * d.r;
      const dy = cy + Math.sin(d.angle) * d.r;
      const angDiff = ((sweep - d.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const bright = angDiff < 0.3 ? 1 : Math.max(0, 1 - (angDiff / (Math.PI * 1.5)));
      if (bright > 0.05) {
        ctx.beginPath(); ctx.arc(dx, dy, d.size + bright * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = GOLD + (d.alpha * bright * 0.9) + ')'; ctx.fill();
        if (bright > 0.6) {
          ctx.beginPath(); ctx.arc(dx, dy, (d.size + 3) * bright, 0, Math.PI * 2);
          ctx.fillStyle = GOLD + (0.1 * bright) + ')'; ctx.fill();
        }
      }
    });

    sweep += 0.008;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
})();

/* ── Constants ── */
const WHATSAPP    = "8801974518600";
const OPERATOR_PIN = "1981";

/* ── Local Storage ── */
const LS = {
  get(k)   { try { return JSON.parse(localStorage.getItem("nx_" + k)); } catch (e) { return null; } },
  set(k, v){ try { localStorage.setItem("nx_" + k, JSON.stringify(v)); } catch (e) {} }
};

/* ── Offline Detection ── */
let offline = !navigator.onLine;
function setOffline(b) { offline = b; document.getElementById("offBar").classList.toggle("on", b); }
window.addEventListener("online",  () => { setOffline(false); render(); });
window.addEventListener("offline", () => setOffline(true));

/* ── Spine Dispatcher ── */
async function spine(action, payload = {}) {
  if (typeof window.callSpine === "function") {
    try {
      if (action === "placeOrder" || action === "createOrder") {
        const r = await window.callSpine("createOrder", {
          OrderID: payload.OrderID || "NX-" + Math.floor(Math.random() * 9000 + 1000),
          Customer: payload.Customer || payload.phone || "Walk-in",
          Total: payload.Total || payload.price || 0,
          Items: payload.Items || payload.item || "Quick Sale"
        });
        return r || { status: "success" };
      }
      if (action === "createCustomer") {
        const r = await window.callSpine("createCustomer", {
          ID: payload.ID || "C-" + Date.now().toString().slice(-4),
          Name: payload.Name || "Unknown", LastName: payload.LastName || "",
          Email: payload.Email || "", Phone: payload.Phone || "", Address: payload.Address || ""
        });
        return r || { status: "success" };
      }
      if (action === "createProduct") {
        const r = await window.callSpine("createProduct", payload);
        return r || { status: "success" };
      }
      if (action === "listOrders" || action === "getOrders") {
        const lo = await window.callSpine("getOrders");
        if (!lo.error && Array.isArray(lo)) {
          return { items: lo.map(o => ({ id: o.OrderID || "NX-00", t: o.Items || "Live Order", s: o.Customer + " • ৳" + o.Total, st: [o.Status || "NEW", "ok"] })).reverse() };
        }
      }
      if (action === "getStats") {
        const of2 = await window.callSpine("getOrders");
        const ol = Array.isArray(of2) ? of2 : [];
        const sales = ol.reduce((a, c) => a + parseInt(c.Total || 0), 0);
        return { salesToday: sales, ordersToday: ol.length, pending: 0, catalog: 0 };
      }
      if (action === "getFeed" || action === "getProducts") {
        const lp = await window.callSpine("getProducts");
        if (!lp.error && Array.isArray(lp)) {
          return { items: lp.map(p => ({ id: p.ID || "1", t: p.Name, cat: p.Vendor || "Live", price: p.Price || 0, ini: p.SKU || "PRD", img: p.Image || "" })) };
        }
      }
    } catch (e) { console.error("Spine Fallback:", e); }
  }
  return demoSpine(action, payload);
}

/* ── Demo Data (offline fallback) ── */
let dOrders = [{ id: "NX-1045", t: "The Handfilm Masterclass", s: "WhatsApp · Dhaka", st: ["PENDING", "warn"] }];
const dCat   = [{ id: "t1", t: "The Zero-Click Pipeline", cat: "TECH", price: 1200, ini: "NEN" }];
function demoSpine(a, p) {
  if (a === "getStats")   return Promise.resolve({ salesToday: 1200, ordersToday: 1, pending: 0, catalog: 1 });
  if (a === "getFeed")    return Promise.resolve({ items: dCat });
  if (a === "listOrders") return Promise.resolve({ items: dOrders });
  if (a === "placeOrder") {
    dOrders.unshift({ id: "NX-" + Date.now().toString().slice(-4), t: p.item, s: p.method, st: ["NEW", "amber"] });
    return Promise.resolve({ ok: true, status: "NEW" });
  }
  return Promise.resolve({ items: [] });
}

/* ── SVG Icons ── */
const I = {
  cam:      '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  lock:     '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
  home:     '<svg viewBox="0 0 24 24"><path d="M3 10l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  inbox:    '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h5l2 3h4l2-3h5"/></svg>',
  tag:      '<svg viewBox="0 0 24 24"><path d="M3 12v-7a2 2 0 012-2h7l9 9a2 2 0 010 2.8l-5.6 5.6a2 2 0 01-2.8 0L3 12z"/><circle cx="8" cy="8" r="2"/></svg>',
  exit:     '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  orders:   '<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>',
  spark:    '<svg viewBox="0 0 24 24"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>',
  gear:     '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05L4.93 4.93"/></svg>',
  globe:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18"/></svg>',
  wallet:   '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M16 12h3"/></svg>',
  chart:    '<svg viewBox="0 0 24 24"><path d="M4 20V10M11 20V4M18 20v-7"/></svg>',
  megaphone:'<svg viewBox="0 0 24 24"><path d="M3 11l18-5v12L3 13M3 13V19"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>',
  store:    '<svg viewBox="0 0 24 24"><path d="M3 9l1-5h16l1 5"/><path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9"/><path d="M9 20v-6h6v6"/></svg>',
  link:     '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" fill="none"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
};

/* ── State ── */
let mode = "lite", expScreen = "dashboard", camStream = null, lastShot = null;

/* ── Theme ── */
function applyTheme(m) {
  document.body.classList.add("theme-transitioning");
  if (m === "expert") document.body.classList.add("dark", "expert-mode");
  else document.body.classList.remove("dark", "expert-mode");
  setTimeout(() => document.body.classList.remove("theme-transitioning"), 500);
}

/* ── Main Render ── */
function render() {
  document.getElementById("modeTag").innerText = mode === "lite" ? "Lite Seller" : "Expert OS";
  const b = document.getElementById("body");
  if (mode === "lite") renderLiteHome(b);
  else renderExpertBody(b);
  renderTabbar();
}

async function renderLiteHome(b) {
  const s = LS.get("stats") || { salesToday: 0, ordersToday: 0, pending: 0 };
  const o = LS.get("orders") || [];

  b.innerHTML = `
    <!-- HERO -->
    <div class="hero">
      <div class="hero-label">H&amp;H Nexus · Seller OS</div>
      <div class="hero-display">
        <div class="hero-word">NEXOS</div>
        <div class="hero-word-filled">NEXOS</div>
      </div>
      <div class="hero-meta">
        <div class="hero-meta-line">Supply Chain Terminal</div>
        <div class="hero-meta-line">Leather Export · B2B Channel</div>
      </div>
    </div>

    <!-- BENTO STATS -->
    <div class="sec-h">
      <span class="sec-h-label">Live Dashboard</span>
      <span class="sec-h-action" onclick="render()">↻ Refresh</span>
    </div>
    <div class="bento-grid">
      <div class="bento-card hero-stat">
        <div class="bento-label">Sales Today</div>
        <div class="bento-value">৳${s.salesToday || '0'}</div>
        <div class="bento-trend">Active pipeline</div>
      </div>
      <div class="bento-card">
        <div class="bento-label">Pending</div>
        <div class="bento-value" style="font-size:34px;">${s.pending || 0}</div>
      </div>
      <div class="bento-card">
        <div class="bento-label">Orders</div>
        <div class="bento-value" style="font-size:34px;">${s.ordersToday || 0}</div>
      </div>
    </div>

    <!-- QUICK ACTIONS -->
    <div class="sec-h" style="padding-top:16px;">
      <span class="sec-h-label">Quick Access</span>
    </div>
    <div class="action-rail">
      <button class="action-node" onclick="startCamera()">
        <div class="action-icon">${I.cam}</div>
        <div class="action-label">Capture</div>
      </button>
      <button class="action-node" onclick="window.openAppModule('Products')">
        <div class="action-icon">${I.tag}</div>
        <div class="action-label">Products</div>
      </button>
      <button class="action-node" onclick="window.openAppModule('MetaFeed')">
        <div class="action-icon">${I.store}</div>
        <div class="action-label">FB Live</div>
      </button>
      <button class="action-node" onclick="window.openAppModule('SocialPost')">
        <div class="action-icon">${I.spark}</div>
        <div class="action-label">NexAI</div>
      </button>
    </div>

    <!-- QUICK ORDER -->
    <div class="sec-h" style="padding-top:16px;">
      <span class="sec-h-label">Quick Order</span>
    </div>
    <div class="order-panel">
      <div class="order-panel-inner">
        <div class="field"><input id="q_item" placeholder="Product name or SKU…"/></div>
        <div style="display:flex;gap:8px;">
          <div class="field" style="flex:1;"><input id="q_price" type="number" placeholder="৳ Price"/></div>
          <div class="field" style="flex:1;"><input id="q_phone" placeholder="Phone #"/></div>
        </div>
        <div class="seg" id="q_seg" style="margin-bottom:14px;">
          <button class="on" data-m="whatsapp">WhatsApp</button>
          <button data-m="bkash">bKash</button>
          <button data-m="nagad">Nagad</button>
        </div>
        <button class="btn btn-gold" id="q_go">Log Order</button>
      </div>
    </div>

    <!-- RECENT ORDERS -->
    <div class="sec-h" style="padding-top:20px;">
      <span class="sec-h-label">Recent Orders</span>
      <span class="sec-h-action" onclick="openAllOrders()">View All →</span>
    </div>
    <div class="orders-container" id="recentList">${ordersListHtml(o.slice(0, 5))}</div>
    <div style="height:8px;"></div>
  `;

  setupQuickOrderLogic();
  try {
    const [sFresh, oFresh] = await Promise.all([spine("getStats"), spine("listOrders")]);
    LS.set("stats", sFresh); LS.set("orders", oFresh.items);
  } catch (e) {}
}

function setupQuickOrderLogic() {
  let qMethod = "whatsapp";
  const segs = document.querySelectorAll("#q_seg button");
  if (segs.length) {
    segs.forEach(x => {
      x.onclick = () => {
        document.querySelectorAll("#q_seg button").forEach(y => y.classList.remove("on"));
        x.classList.add("on"); qMethod = x.dataset.m;
      };
    });
  }
  const goBtn = document.getElementById("q_go");
  if (goBtn) {
    goBtn.onclick = async () => {
      const item = document.getElementById("q_item").value.trim(); if (!item) return;
      goBtn.innerText = "Logging…";
      await spine("placeOrder", { item, price: document.getElementById("q_price").value, phone: document.getElementById("q_phone").value, method: qMethod });
      toast("Order Logged ✓");
      const oFresh = await spine("listOrders"); LS.set("orders", oFresh.items); render();
    };
  }
}

function renderExpertBody(b) { renderLiteHome(b); }

function ordersListHtml(o) {
  if (!o || !o.length) return `<div class="empty">No orders logged yet</div>`;
  return o.map(d => `
    <div class="orow">
      <div class="othumb">NX</div>
      <div class="om">
        <div class="ot">${d.t}</div>
        <div class="os">${d.s}</div>
      </div>
      <div class="pill ${d.st[1] || 'ok'}">${d.st[0]}</div>
    </div>
  `).join("");
}

/* ── Tab Bar ── */
function renderTabbar() {
  const bar = document.getElementById("tabbar"); if (!bar) return;
  if (mode === "lite") {
    bar.innerHTML = `
      <button class="tb on">${I.home}</button>
      <button class="tb cam-fab" onclick="startCamera()">${I.cam}</button>
      <button class="tb" onclick="openGate()">${I.lock}</button>
    `;
  } else {
    bar.innerHTML = `
      <button class="tb" onclick="expScreen='dashboard';render()">${I.home}</button>
      <button class="tb" onclick="navTo('Products')">${I.tag}</button>
      <button class="tb cam-fab" onclick="startCamera()">${I.cam}</button>
      <button class="tb" onclick="openDrawer()"><svg viewBox="0 0 24 24" style="width:20px;height:20px;"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.7"/></svg></button>
      <button class="tb exit-btn" onclick="exitExpert()">${I.exit}</button>
    `;
  }
}

/* ── Drawer Nav ── */
const NAV = [
  { label: "Home",     icon: I.home },
  { label: "Orders",   icon: I.orders,   chev: true },
  { label: "Products", icon: I.tag,       chev: true },
  { label: "Customers",icon: I.inbox,     chev: true },
  { sep: "Ecosystem HUB & Portals" },
  { label: "NexOS HUB",            icon: I.link,  url: "https://handfilm.github.io/nexus/os/hub/" },
  { label: "Portal Launcher",       icon: I.link,  url: "https://handfilm.github.io/portal/" },
  { sep: "Sales Channels" },
  { label: "BackEnd Store Modules",        icon: I.store, chev: true },
  { label: "Standard Theme Customization", icon: I.gear,  chev: true },
  { label: "FrontEnd (Handsandhead)",      icon: I.globe, url: "https://handfilm.myshopify.com/pages/handsandhead" },
  { sep: "E-Commerce Apps" },
  { label: "Accounting Sync",    icon: I.wallet,    app: "Accounting" },
  { label: "Auto Social Post",   icon: I.megaphone, app: "SocialPost" },
  { label: "Meta Live Feed",     icon: I.spark,     app: "MetaFeed" },
  { label: "Daraz Sync Pipeline",icon: I.chart,     app: "DarazSync" }
];

function renderDrawerNav() {
  return NAV.map(n => {
    if (n.sep) return `<span class="nav-section">${n.sep}</span>`;
    if (n.url) return `<button class="nav-row" onclick="window.open('${n.url}','_blank');closeDrawer();"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div><span class="nav-ext">↗ EXT</span></button>`;
    if (n.app) return `<button class="nav-row" onclick="closeDrawer();openAppModule('${n.app}');"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div></button>`;
    return `<button class="nav-row" onclick="navTo('${n.label}')"><div class="nav-row-left"><span class="nav-ic">${n.icon}</span>${n.label}</div></button>`;
  }).join("");
}

/* ── DOM Mechanics ── */
function openDrawer() {
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
  if (label === "Home") { expScreen = "dashboard"; render(); return; }
  if (window.render && window.render[label]) {
    openSheet(`<div id="modMount"></div>`);
    window.render[label](document.getElementById("modMount"));
  }
}
function openAppModule(appName) {
  if (window.render && window.render[appName]) {
    openSheet(`<div id="modMount"></div>`);
    window.render[appName](document.getElementById("modMount"));
  }
}

function openSheet(html) {
  document.getElementById("sheet").innerHTML = `<div class="grab"></div>` + html;
  document.getElementById("sheet").classList.add("on");
  document.getElementById("scrim").classList.add("on");
}
function closeSheet() {
  document.getElementById("sheet").classList.remove("on");
  document.getElementById("scrim").classList.remove("on");
}
function openGate() {
  document.getElementById("gate").classList.add("on");
  document.getElementById("gateScrim").classList.add("on");
  setTimeout(() => document.getElementById("gatePin").focus(), 300);
}
function closeGate() {
  document.getElementById("gate").classList.remove("on");
  document.getElementById("gateScrim").classList.remove("on");
}
function tryGate() {
  if (document.getElementById("gatePin").value.trim() === OPERATOR_PIN) {
    mode = "expert"; expScreen = "dashboard";
    closeGate(); applyTheme("expert"); render(); toast("Expert OS Unlocked ✓");
  } else {
    toast("Access Denied");
    const g = document.getElementById("gate");
    g.style.animation = "shake 0.45s ease";
    setTimeout(() => g.style.animation = "", 450);
    document.getElementById("gatePin").value = "";
  }
}
function exitExpert() { mode = "lite"; applyTheme("lite"); render(); toast("Returned to Lite Mode"); }
function toast(m) {
  const t = document.getElementById("toast"); if (!t) return;
  t.innerText = m; t.classList.add("on");
  setTimeout(() => t.classList.remove("on"), 2500);
}
function startCamera() {
  openSheet(`<h3>Camera Engine</h3><div class="cam-stage"><div style="color:var(--ink-3);font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;">Active on native deployment</div></div>`);
}
function openAllOrders() {
  const o = LS.get("orders") || [];
  openSheet(`<h3>All Orders</h3><div class="orders-container" style="margin:0 20px;">${ordersListHtml(o)}</div>`);
}

/* ── AI Chat ── */
function openAiChat() {
  openSheet(`
    <h3>NexAI</h3>
    <p class="hint">Supply chain intelligence terminal</p>
    <div class="ai-chat-wrap">
      <div class="ai-feed" id="aiFeed">
        <div class="ai-msg bot">NexAI online. Supply chain intelligence armed. How can I assist?</div>
      </div>
      <div class="ai-input-bar">
        <input id="aiInput" placeholder="Query the system…"/>
        <button class="ai-send" onclick="sendAiMsg()">
          <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  `);
}
function sendAiMsg() {
  const inp = document.getElementById("aiInput"); if (!inp) return;
  const msg = inp.value.trim(); if (!msg) return;
  const feed = document.getElementById("aiFeed");
  feed.innerHTML += `<div class="ai-msg user">${msg}</div>`;
  inp.value = "";
  setTimeout(() => {
    feed.innerHTML += `<div class="ai-msg bot">Processing "${msg}" — NexAI inference engaged.</div>`;
    feed.scrollTop = feed.scrollHeight;
  }, 800);
  feed.scrollTop = feed.scrollHeight;
}

function openSearch() {
  openSheet(`<h3>Search</h3><div style="padding:0 20px;"><div class="field"><input placeholder="Orders, products, customers…" autofocus style="margin-top:8px;"/></div></div>`);
}
function openQuickSale() {
  openSheet(`
    <h3>Quick Sale</h3>
    <div style="padding:0 20px;">
      <div class="field"><label>Item</label><input id="qs_item" placeholder="Product name…"/></div>
      <div class="field"><label>Price (৳)</label><input id="qs_price" type="number" placeholder="0.00"/></div>
      <button class="btn btn-gold" style="margin-top:8px;" onclick="
        document.getElementById('q_item').value=document.getElementById('qs_item').value;
        document.getElementById('q_price').value=document.getElementById('qs_price').value;
        closeSheet();toast('Loaded into Quick Order');
      ">Load to Quick Order</button>
    </div>
  `);
}

/* ── Global Exports ── */
window.openGate      = openGate;
window.closeGate     = closeGate;
window.tryGate       = tryGate;
window.startCamera   = startCamera;
window.exitExpert    = exitExpert;
window.openAllOrders = openAllOrders;
window.closeSheet    = closeSheet;
window.render        = render;
window.openDrawer    = openDrawer;
window.closeDrawer   = closeDrawer;
window.navTo         = navTo;
window.openAppModule = openAppModule;
window.openAiChat    = openAiChat;
window.openSearch    = openSearch;
window.openQuickSale = openQuickSale;
window.sendAiMsg     = sendAiMsg;

/* ── Boot ── */
render();
