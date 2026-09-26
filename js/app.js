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

/* ── Radar Canvas (Mobile-optimized & throttled) ── */
(function () {
  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;

  // On mobile screens, disable full-viewport canvas animation completely to protect memory & battery
  if (window.innerWidth <= 768) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  let W, H, cx, cy, maxR, sweep = 0, trails = [], dots = [];
  let animId = null;
  let lastFrameTime = 0;
  const targetInterval = 1000 / 30; // Smooth 30fps cap to halve GPU workload
  const G = 'rgba(201,168,76,';

  function resize() {
    if (window.innerWidth <= 768) {
      canvas.style.display = 'none';
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      return;
    }
    canvas.style.display = 'block';
    W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight;
    cx = W * 0.72; cy = H * 0.26; maxR = Math.max(W, H) * 0.65;
    dots = Array.from({length:14}, () => ({ angle:Math.random()*Math.PI*2, r:maxR*(0.15+Math.random()*0.72), alpha:0.4+Math.random()*0.6, size:1+Math.random()*2 }));
  }

  function draw(timestamp) {
    if (document.hidden || window.innerWidth <= 768) {
      animId = null;
      return;
    }

    if (!timestamp) timestamp = performance.now();
    const elapsed = timestamp - lastFrameTime;

    if (elapsed >= targetInterval) {
      lastFrameTime = timestamp - (elapsed % targetInterval);

      ctx.clearRect(0,0,W,H);
      for (let i=1;i<=5;i++) { ctx.beginPath(); ctx.arc(cx,cy,(maxR/5)*i,0,Math.PI*2); ctx.strokeStyle=G+(0.06-i*0.008)+')'; ctx.lineWidth=0.5; ctx.stroke(); }
      ctx.strokeStyle=G+'0.04)'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(cx-maxR,cy); ctx.lineTo(cx+maxR,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-maxR); ctx.lineTo(cx,cy+maxR); ctx.stroke();
      trails.push({angle:sweep}); if(trails.length>36) trails.shift();
      trails.forEach((t,i) => { const a=(i/trails.length)*0.7; const sa=t.angle-0.08*(1-i/trails.length)*3; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,maxR*0.95,sa,t.angle); ctx.closePath(); ctx.fillStyle=G+(a*0.14)+')'; ctx.fill(); });
      const ex=cx+Math.cos(sweep)*maxR*0.95, ey=cy+Math.sin(sweep)*maxR*0.95;
      const lg=ctx.createLinearGradient(cx,cy,ex,ey); lg.addColorStop(0,G+'0.5)'); lg.addColorStop(1,G+'0)');
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ex,ey); ctx.strokeStyle=lg; ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fillStyle=G+'0.8)'; ctx.fill();
      dots.forEach(d => {
        const dx=cx+Math.cos(d.angle)*d.r, dy=cy+Math.sin(d.angle)*d.r;
        const ad=((sweep-d.angle)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
        const br=ad<0.3?1:Math.max(0,1-(ad/(Math.PI*1.5)));
        if(br>0.05) { ctx.beginPath(); ctx.arc(dx,dy,d.size+br*1.5,0,Math.PI*2); ctx.fillStyle=G+(d.alpha*br*0.9)+')'; ctx.fill(); }
      });
      sweep+=0.008;
    }

    animId = requestAnimationFrame(draw);
  }

  function start() {
    if (!animId && !document.hidden && window.innerWidth > 768) {
      animId = requestAnimationFrame(draw);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    } else {
      start();
    }
  });

  resize();
  window.addEventListener('resize', () => {
    resize();
    start();
  });
  start();
})();

/* ── Constants ── */
const WHATSAPP = "8801974518600";
const PINS = {
  lite:       null,
  expert:     null,
  production: null
};

/* ── Local Storage ── */
const LS = {
  get(k) {
    try {
      const v = JSON.parse(localStorage.getItem("nx_"+k));
      if (k === "orders" && Array.isArray(v)) {
        return v.filter(o => !o.archived && !o.isMock && o.id !== "ord-1048" && o.id !== "ord-1047" && o.id !== "BD-RFQ-0D2510A5" && o.customerName !== "Amsterdam Goods B.V." && o.customerName !== "London Retail Group");
      }
      return v;
    } catch(e) { return null; }
  },
  set(k,v) {
    try {
      if (k === "orders" && Array.isArray(v)) {
        v = v.filter(o => !o.archived && !o.isMock && o.id !== "ord-1048" && o.id !== "ord-1047" && o.id !== "BD-RFQ-0D2510A5" && o.customerName !== "Amsterdam Goods B.V." && o.customerName !== "London Retail Group");
      }
      localStorage.setItem("nx_"+k, JSON.stringify(v));
    } catch(e) {}
  },
  del(k) { try { localStorage.removeItem("nx_"+k); } catch(e) {}
  }
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
        return {
          items: (items || []).map(o => ({
            id: o.orderNumber || o.id,
            rawId: o.id,
            total: o.total || 0,
            status: o.status || 'NEW',
            fulfillmentStatus: o.fulfillmentStatus || 'unfulfilled',
            createdAt: o.createdAt,
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

/* ── Real Production Seed Data (Preserving User Data Sync) ── */
let dOrders = [
  {
    "id": "NX-1049",
    "rawId": "ord-1049",
    "orderNumber": "NX-1049",
    "customerName": "Lailatul Mehnaz",
    "t": "Artisanal Raw-Hem Oversized Drop Tee, Minimalist Cardholder — Aniline Tan",
    "s": "Lailatul Mehnaz · Dhaka - North",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 3180,
    "subtotal": 3100,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "bKash (merchant)",
    "customerSnapshot": {
      "city": "Dhaka - North",
      "id": "8613774622945",
      "rawPhone": "+8801844051980",
      "email": "lailatul.mehnaz@citybank.com.bd",
      "currency": "BDT",
      "name": "Lailatul Mehnaz",
      "country": "BD",
      "canonicalPhone": "+8801844051980",
      "phone": "+8801844051980",
      "address": "The City Bank Limited, Nitol Niloy Centre, Level 4, House 7, Road 113/A, Gulshan - 2, Dhaka"
    },
    "lineItems": [
      {
        "sku": "HH-TEE-02-L",
        "total": 1650,
        "productId": "prod-tee-02",
        "title": "Artisanal Raw-Hem Oversized Drop Tee",
        "variantTitle": "Bone White / L",
        "quantity": 1,
        "price": 1650
      },
      {
        "price": 1450,
        "productId": "prod-crd-02",
        "title": "Minimalist Cardholder — Aniline Tan",
        "variantTitle": "Aniline Tan",
        "sku": "HH-CRD-02",
        "total": 1450,
        "quantity": 1
      }
    ],
    "createdAt": "2026-09-12T11:20:00.000Z",
    "updatedAt": "2026-09-13T14:10:00.000Z"
  },
  {
    "id": "NX-1050",
    "rawId": "ord-1050",
    "orderNumber": "NX-1050",
    "customerName": "Shabbir",
    "t": "Full-Grain Leather Bi-Fold Wallet",
    "s": "Shabbir · DHAKA",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 2930,
    "subtotal": 2850,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "cod",
    "customerSnapshot": {
      "id": "8548307730657",
      "canonicalPhone": "+8801745395313",
      "email": "shabbir.dhk@gmail.com",
      "address": "Mohammadia housing society rd 2 house no 150 mohammadpur",
      "name": "Shabbir",
      "country": "BD",
      "currency": "BDT",
      "phone": "+8801745395313",
      "city": "DHAKA",
      "rawPhone": "+8801745395313"
    },
    "lineItems": [
      {
        "title": "Full-Grain Leather Bi-Fold Wallet",
        "sku": "HH-WLT-01",
        "productId": "prod-wlt-01",
        "price": 2850,
        "variantTitle": "Tan Brown",
        "quantity": 1,
        "total": 2850
      }
    ],
    "createdAt": "2026-09-12T14:45:00.000Z",
    "updatedAt": "2026-09-13T17:45:00.000Z"
  },
  {
    "id": "NX-1051",
    "rawId": "ord-1051",
    "orderNumber": "NX-1051",
    "customerName": "Bappa Chowdhury",
    "t": "Heavyweight Boxy Graphic Tee — Dhaka Cyber x2, Full-Grain Leather Bi-Fold Wallet",
    "s": "Bappa Chowdhury · Dhaka",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 6490,
    "subtotal": 6550,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "bKash (merchant)",
    "customerSnapshot": {
      "city": "Dhaka",
      "email": "bappa.chowdhury@yahoo.com",
      "currency": "BDT",
      "name": "Bappa Chowdhury",
      "canonicalPhone": "+8801338789272",
      "country": "BD",
      "rawPhone": "+8801338789272",
      "phone": "+8801338789272",
      "address": "Chowdhury House 11/1A Kobi jashimuddin rd North Komlapur motijheel Dhaka",
      "id": "8423562477793"
    },
    "lineItems": [
      {
        "quantity": 2,
        "total": 3700,
        "sku": "HH-TEE-01-L",
        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
        "productId": "prod-tee-01",
        "price": 1850,
        "variantTitle": "Vintage Washed Black / L"
      },
      {
        "price": 2850,
        "sku": "HH-WLT-01",
        "quantity": 1,
        "title": "Full-Grain Leather Bi-Fold Wallet",
        "total": 2850,
        "productId": "prod-wlt-01",
        "variantTitle": "Tan Brown"
      }
    ],
    "createdAt": "2026-09-13T10:15:00.000Z",
    "updatedAt": "2026-09-14T11:20:00.000Z"
  },
  {
    "id": "NX-1052",
    "rawId": "ord-1052",
    "orderNumber": "NX-1052",
    "customerName": "Adeeb",
    "t": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
    "s": "Adeeb · Dhaka",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 1930,
    "subtotal": 1850,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "cod",
    "customerSnapshot": {
      "city": "Dhaka",
      "email": "adeeb.dhn@gmail.com",
      "rawPhone": "+8801745411340",
      "id": "8340944879841",
      "name": "Adeeb",
      "country": "BD",
      "currency": "BDT",
      "canonicalPhone": "+8801745411340",
      "phone": "+8801745411340",
      "address": "House - 18, Road - 6, Dhanmondi, Dhaka - 1205."
    },
    "lineItems": [
      {
        "variantTitle": "Vintage Washed Black / M",
        "price": 1850,
        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
        "quantity": 1,
        "sku": "HH-TEE-01-M",
        "total": 1850,
        "productId": "prod-tee-01"
      }
    ],
    "createdAt": "2026-09-13T16:30:00.000Z",
    "updatedAt": "2026-09-14T15:20:00.000Z"
  },
  {
    "id": "NX-1053",
    "rawId": "ord-1053",
    "orderNumber": "NX-1053",
    "customerName": "Nasif Nahian",
    "t": "Architectural Cutout Leather-Pocket Tee, Heavyweight Boxy Graphic Tee — Dhaka Cyber",
    "s": "Nasif Nahian · Dhaka",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 4380,
    "subtotal": 4300,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "bKash (merchant)",
    "customerSnapshot": {
      "city": "Dhaka",
      "currency": "BDT",
      "email": "nasif.nahian@gmail.com",
      "name": "Nasif Nahian",
      "address": "House 132, Road 3, Block A, Niketon, Gulshan, Dhaka",
      "canonicalPhone": "+8801717155699",
      "id": "8191632539873",
      "phone": "+8801717155699",
      "rawPhone": "+8801717155699",
      "country": "BD"
    },
    "lineItems": [
      {
        "total": 2450,
        "sku": "HH-TEE-03-L",
        "variantTitle": "Charcoal Slate / L",
        "title": "Architectural Cutout Leather-Pocket Tee",
        "quantity": 1,
        "price": 2450,
        "productId": "prod-tee-03"
      },
      {
        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
        "price": 1850,
        "sku": "HH-TEE-01-L",
        "variantTitle": "Vintage Washed Black / L",
        "total": 1850,
        "productId": "prod-tee-01",
        "quantity": 1
      }
    ],
    "createdAt": "2026-09-14T09:20:00.000Z",
    "updatedAt": "2026-09-15T18:30:00.000Z"
  },
  {
    "id": "NX-1054",
    "rawId": "ord-1054",
    "orderNumber": "NX-1054",
    "customerName": "Shahed Chowdhury Robin",
    "t": "Full-Grain Leather Bi-Fold Wallet x2, Heavyweight Boxy Graphic Tee — Dhaka Cyber, Test Leather Belt",
    "s": "Shahed Chowdhury Robin · Chittagong",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 8880,
    "subtotal": 8750,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "bKash (merchant)",
    "customerSnapshot": {
      "phone": "+8801814152500",
      "id": "8063450382561",
      "address": "EPZ Chittagong",
      "rawPhone": "+8801814152500",
      "name": "Shahed Chowdhury Robin",
      "country": "BD",
      "currency": "BDT",
      "email": "shahed.robin.epz@gmail.com",
      "city": "Chittagong",
      "canonicalPhone": "+8801814152500"
    },
    "lineItems": [
      {
        "variantTitle": "Tan Brown",
        "total": 5700,
        "quantity": 2,
        "sku": "HH-WLT-01",
        "title": "Full-Grain Leather Bi-Fold Wallet",
        "productId": "prod-wlt-01",
        "price": 2850
      },
      {
        "quantity": 1,
        "variantTitle": "Vintage Washed Black / XL",
        "total": 1850,
        "productId": "prod-tee-01",
        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
        "sku": "HH-TEE-01-XL",
        "price": 1850
      },
      {
        "price": 1200,
        "sku": "HH-3780",
        "title": "Test Leather Belt",
        "quantity": 1,
        "productId": "prod-mtoeo9ex-949",
        "total": 1200,
        "variantTitle": "Standard"
      }
    ],
    "createdAt": "2026-09-14T12:40:00.000Z",
    "updatedAt": "2026-09-16T12:00:00.000Z"
  },
  {
    "id": "NX-1055",
    "rawId": "ord-1055",
    "orderNumber": "NX-1055",
    "customerName": "Anne Drong",
    "t": "Architectural Cutout Leather-Pocket Tee, Full-Grain Leather Bi-Fold Wallet",
    "s": "Anne Drong · DHAKA",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 5380,
    "subtotal": 5300,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "cod",
    "customerSnapshot": {
      "email": "anne.drong@gmail.com",
      "currency": "BDT",
      "name": "Anne Drong",
      "address": "Grace Legacy, flat 2A, House 247/7&8 South Pirerbagh, Amtola, 60 feet road, Mirpur, Dhaka",
      "canonicalPhone": "+8801726793834",
      "country": "BD",
      "city": "DHAKA",
      "phone": "+8801726793834",
      "id": "8054275080417",
      "rawPhone": "+8801726793834"
    },
    "lineItems": [
      {
        "price": 2450,
        "productId": "prod-tee-03",
        "title": "Architectural Cutout Leather-Pocket Tee",
        "sku": "HH-TEE-03-M",
        "variantTitle": "Charcoal Slate / M",
        "total": 2450,
        "quantity": 1
      },
      {
        "sku": "HH-WLT-01",
        "productId": "prod-wlt-01",
        "variantTitle": "Tan Brown",
        "total": 2850,
        "quantity": 1,
        "title": "Full-Grain Leather Bi-Fold Wallet",
        "price": 2850
      }
    ],
    "createdAt": "2026-09-14T17:15:00.000Z",
    "updatedAt": "2026-09-15T16:40:00.000Z"
  },
  {
    "id": "NX-1056",
    "rawId": "ord-1056",
    "orderNumber": "NX-1056",
    "customerName": "Md Shihab Hussain",
    "t": "Heavyweight Boxy Graphic Tee — Dhaka Cyber x2, Full-Grain Leather Bi-Fold Wallet",
    "s": "Md Shihab Hussain · Dhaka",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 6630,
    "subtotal": 6550,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "bKash (merchant)",
    "customerSnapshot": {
      "country": "BD",
      "currency": "BDT",
      "id": "8019856425185",
      "address": "House 20,Road 3,Block D,Banasree, Rampura, Dhaka",
      "phone": "+8801855521805",
      "city": "Dhaka",
      "rawPhone": "+8801855521805",
      "canonicalPhone": "+8801855521805",
      "name": "Md Shihab Hussain",
      "email": "shihab.hussain@gmail.com"
    },
    "lineItems": [
      {
        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
        "variantTitle": "Vintage Washed Black / L",
        "price": 1850,
        "productId": "prod-tee-01",
        "sku": "HH-TEE-01-L",
        "total": 3700,
        "quantity": 2
      },
      {
        "productId": "prod-wlt-01",
        "quantity": 1,
        "total": 2850,
        "title": "Full-Grain Leather Bi-Fold Wallet",
        "variantTitle": "Tan Brown",
        "price": 2850,
        "sku": "HH-WLT-01"
      }
    ],
    "createdAt": "2026-09-15T11:00:00.000Z",
    "updatedAt": "2026-09-16T14:30:00.000Z"
  },
  {
    "id": "NX-1057",
    "rawId": "ord-1057",
    "orderNumber": "NX-1057",
    "customerName": "Nur Rahman",
    "t": "Architectural Cutout Leather-Pocket Tee, Full-Grain Leather Bi-Fold Wallet",
    "s": "Nur Rahman · Dhaka",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 5380,
    "subtotal": 5300,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "cod",
    "customerSnapshot": {
      "city": "Dhaka",
      "email": "nur.rahman@dhkcantt.com",
      "canonicalPhone": "+8801711535595",
      "currency": "BDT",
      "id": "8019831849185",
      "address": "House 424/ East kafrul",
      "rawPhone": "+8801711535595",
      "name": "Nur Rahman",
      "phone": "+8801711535595",
      "country": "BD"
    },
    "lineItems": [
      {
        "title": "Architectural Cutout Leather-Pocket Tee",
        "productId": "prod-tee-03",
        "quantity": 1,
        "price": 2450,
        "variantTitle": "Charcoal Slate / L",
        "total": 2450,
        "sku": "HH-TEE-03-L"
      },
      {
        "quantity": 1,
        "total": 2850,
        "variantTitle": "Tan Brown",
        "productId": "prod-wlt-01",
        "title": "Full-Grain Leather Bi-Fold Wallet",
        "sku": "HH-WLT-01",
        "price": 2850
      }
    ],
    "createdAt": "2026-09-15T15:30:00.000Z",
    "updatedAt": "2026-09-16T17:15:00.000Z"
  },
  {
    "id": "NX-1058",
    "rawId": "ord-1058",
    "orderNumber": "NX-1058",
    "customerName": "Vladislav",
    "t": "Artisanal Raw-Hem Oversized Drop Tee, Test Leather Belt",
    "s": "Vladislav · Pabna",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 3000,
    "subtotal": 2850,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "cod",
    "customerSnapshot": {
      "id": "8162539634913",
      "phone": "+8801328056287",
      "city": "Pabna",
      "currency": "BDT",
      "country": "BD",
      "address": "Green city",
      "rawPhone": "+8801328056287",
      "canonicalPhone": "+8801328056287",
      "email": "vladislav.pabna@mail.ru",
      "name": "Vladislav"
    },
    "lineItems": [
      {
        "price": 1650,
        "quantity": 1,
        "title": "Artisanal Raw-Hem Oversized Drop Tee",
        "productId": "prod-tee-02",
        "sku": "HH-TEE-02-XL",
        "total": 1650,
        "variantTitle": "Bone White / XL"
      },
      {
        "variantTitle": "Standard",
        "total": 1200,
        "sku": "HH-3780",
        "quantity": 1,
        "title": "Test Leather Belt",
        "productId": "prod-mtoeo9ex-949",
        "price": 1200
      }
    ],
    "createdAt": "2026-09-15T18:10:00.000Z",
    "updatedAt": "2026-09-17T15:40:00.000Z"
  },
  {
    "id": "NX-1059",
    "rawId": "ord-1059",
    "orderNumber": "NX-1059",
    "customerName": "Tatiana",
    "t": "Architectural Cutout Leather-Pocket Tee, Minimalist Cardholder — Aniline Tan",
    "s": "Tatiana · Pabna",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 4050,
    "subtotal": 3900,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "bKash (merchant)",
    "customerSnapshot": {
      "id": "8045721157857",
      "country": "BD",
      "rawPhone": "+8801958598547",
      "address": "Green city",
      "canonicalPhone": "+8801958598547",
      "city": "Pabna",
      "phone": "+8801958598547",
      "currency": "BDT",
      "name": "Tatiana",
      "email": "tatiana.ishwardi@yandex.ru"
    },
    "lineItems": [
      {
        "price": 2450,
        "sku": "HH-TEE-03-M",
        "productId": "prod-tee-03",
        "title": "Architectural Cutout Leather-Pocket Tee",
        "quantity": 1,
        "total": 2450,
        "variantTitle": "Charcoal Slate / M"
      },
      {
        "productId": "prod-crd-02",
        "total": 1450,
        "variantTitle": "Aniline Tan",
        "sku": "HH-CRD-02",
        "quantity": 1,
        "price": 1450,
        "title": "Minimalist Cardholder — Aniline Tan"
      }
    ],
    "createdAt": "2026-09-16T10:05:00.000Z",
    "updatedAt": "2026-09-17T17:20:00.000Z"
  },
  {
    "id": "NX-1060",
    "rawId": "ord-1060",
    "orderNumber": "NX-1060",
    "customerName": "Hridoy Shaikh",
    "t": "Artisanal Raw-Hem Oversized Drop Tee, Test Leather Belt",
    "s": "Hridoy Shaikh · narail",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 2980,
    "subtotal": 2850,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "cod",
    "customerSnapshot": {
      "canonicalPhone": "+8801610490729",
      "phone": "+8801610490729",
      "id": "8154034340065",
      "name": "Hridoy Shaikh",
      "currency": "BDT",
      "country": "BD",
      "email": "hridoy.narail@gmail.com",
      "rawPhone": "+8801610490729",
      "address": "narail sodor.narail",
      "city": "narail"
    },
    "lineItems": [
      {
        "price": 1650,
        "variantTitle": "Bone White / L",
        "title": "Artisanal Raw-Hem Oversized Drop Tee",
        "productId": "prod-tee-02",
        "total": 1650,
        "quantity": 1,
        "sku": "HH-TEE-02-L"
      },
      {
        "price": 1200,
        "title": "Test Leather Belt",
        "sku": "HH-3780",
        "variantTitle": "Standard",
        "total": 1200,
        "quantity": 1,
        "productId": "prod-mtoeo9ex-949"
      }
    ],
    "createdAt": "2026-09-16T13:40:00.000Z",
    "updatedAt": "2026-09-18T11:45:00.000Z"
  },
  {
    "id": "NX-1061",
    "rawId": "ord-1061",
    "orderNumber": "NX-1061",
    "customerName": "Mohammed Raihan",
    "t": "Full-Grain Leather Bi-Fold Wallet",
    "s": "Mohammed Raihan · Kadamtali",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 2980,
    "subtotal": 2850,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "cod",
    "customerSnapshot": {
      "name": "Mohammed Raihan",
      "canonicalPhone": "+8801762953916",
      "phone": "+8801762953916",
      "address": ": বি- বাড়িয়া ,,,,বাঞ্ছারাপমুর ,,, কদমতলী",
      "country": "BD",
      "currency": "BDT",
      "email": "raihan.kadamtali@gmail.com",
      "city": "Kadamtali",
      "id": "8104068088033",
      "rawPhone": "+8801762953916"
    },
    "lineItems": [
      {
        "title": "Full-Grain Leather Bi-Fold Wallet",
        "quantity": 1,
        "price": 2850,
        "productId": "prod-wlt-01",
        "sku": "HH-WLT-01",
        "variantTitle": "Tan Brown",
        "total": 2850
      }
    ],
    "createdAt": "2026-09-16T16:20:00.000Z",
    "updatedAt": "2026-09-18T16:20:00.000Z"
  },
  {
    "id": "NX-1062",
    "rawId": "ord-1062",
    "orderNumber": "NX-1062",
    "customerName": "Sayeed Ahmed",
    "t": "Artisanal Raw-Hem Oversized Drop Tee",
    "s": "Sayeed Ahmed · Mouluvibazar",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 1780,
    "subtotal": 1650,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "Nagad",
    "customerSnapshot": {
      "id": "8070759842017",
      "currency": "BDT",
      "country": "BD",
      "address": "Cloth House, chndgram, Borolekha, Moulivibazar,",
      "phone": "+8801786934199",
      "city": "Mouluvibazar",
      "canonicalPhone": "+8801786934199",
      "rawPhone": "+8801786934199",
      "name": "Sayeed Ahmed",
      "email": "sayeed.clothhouse@gmail.com"
    },
    "lineItems": [
      {
        "price": 1650,
        "quantity": 1,
        "title": "Artisanal Raw-Hem Oversized Drop Tee",
        "productId": "prod-tee-02",
        "total": 1650,
        "variantTitle": "Bone White / L",
        "sku": "HH-TEE-02-L"
      }
    ],
    "createdAt": "2026-09-17T09:30:00.000Z",
    "updatedAt": "2026-09-18T17:10:00.000Z"
  },
  {
    "id": "NX-1063",
    "rawId": "ord-1063",
    "orderNumber": "NX-1063",
    "customerName": "Kobir",
    "t": "Heavyweight Boxy Graphic Tee — Dhaka Cyber, Test Leather Belt",
    "s": "Kobir · Noakhali",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 3180,
    "subtotal": 3050,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "cod",
    "customerSnapshot": {
      "name": "Kobir",
      "phone": "+8801622265291",
      "canonicalPhone": "+8801622265291",
      "rawPhone": "+8801622265291",
      "email": "kobir.noakhali@gmail.com",
      "country": "BD",
      "city": "Noakhali",
      "id": "cust-kobir-nk",
      "address": "santi nagar",
      "currency": "BDT"
    },
    "lineItems": [
      {
        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
        "price": 1850,
        "productId": "prod-tee-01",
        "sku": "HH-TEE-01-XL",
        "variantTitle": "Vintage Washed Black / XL",
        "total": 1850,
        "quantity": 1
      },
      {
        "price": 1200,
        "title": "Test Leather Belt",
        "sku": "HH-3780",
        "productId": "prod-mtoeo9ex-949",
        "total": 1200,
        "variantTitle": "Standard",
        "quantity": 1
      }
    ],
    "createdAt": "2026-09-17T11:50:00.000Z",
    "updatedAt": "2026-09-19T14:15:00.000Z"
  },
  {
    "id": "NX-1046",
    "rawId": "ord-1046",
    "orderNumber": "NX-1046",
    "customerName": "Tomotaka Minoura",
    "t": "Heavyweight Boxy Graphic Tee — Dhaka Cyber x2, Minimalist Cardholder — Aniline Tan",
    "s": "Tomotaka Minoura · Dhaka - North",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "delivered",
    "total": 5230,
    "subtotal": 5150,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "cod",
    "customerSnapshot": {
      "rawPhone": "+8801912010701",
      "email": "tomotaka.minoura@gmail.com",
      "country": "BD",
      "name": "Tomotaka Minoura",
      "id": "8779761975521",
      "canonicalPhone": "+8801912010701",
      "address": "House no.9, Road no.2, Park road",
      "phone": "+8801912010701",
      "currency": "BDT",
      "city": "Dhaka - North"
    },
    "lineItems": [
      {
        "price": 1850,
        "variantTitle": "Vintage Washed Black / L",
        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
        "sku": "HH-TEE-01-L",
        "total": 3700,
        "productId": "prod-tee-01",
        "quantity": 2
      },
      {
        "quantity": 1,
        "total": 1450,
        "sku": "HH-CRD-02",
        "title": "Minimalist Cardholder — Aniline Tan",
        "productId": "prod-crd-02",
        "variantTitle": "Aniline Tan",
        "price": 1450
      }
    ],
    "createdAt": "2026-09-05T06:53:07.350Z",
    "updatedAt": "2026-09-06T12:30:00.000Z"
  },
  {
    "id": "QS-555554",
    "rawId": "ord-qs-mtpl6a86",
    "orderNumber": "QS-555554",
    "customerName": "Tariqul Islam",
    "t": "Full-Grain Leather Cardholder x2",
    "s": "Tariqul Islam · Dhaka, BD",
    "st": [
      "COMPLETED",
      "ok"
    ],
    "status": "completed",
    "lifecycleStage": "completed",
    "total": 3700,
    "subtotal": 3700,
    "currency": "BDT",
    "paymentStatus": "paid",
    "fulfillmentStatus": "fulfilled",
    "paymentMethod": "bKash (merchant)",
    "customerSnapshot": {
      "rawPhone": "+8801711234567",
      "email": "tariqul@example.com",
      "name": "Tariqul Islam",
      "country": "BD",
      "canonicalPhone": "+8801711234567",
      "address": "Dhaka Counter Sale",
      "phone": "+8801711234567",
      "currency": "BDT",
      "id": "cust-mtpl6a8h"
    },
    "lineItems": [
      {
        "quantity": 2,
        "productId": "prod-crd-02",
        "price": 1850,
        "variantTitle": "Default",
        "title": "Full-Grain Leather Cardholder",
        "total": 3700,
        "sku": "HH-CRD-02"
      }
    ],
    "createdAt": "2026-09-06T09:05:17.382Z",
    "updatedAt": "2026-09-06T09:05:17.382Z"
  }
];

const dCat = [
  { id: "prod-mtoeo9ex-949", t: "Test Leather Belt", cat: "ACCESSORIES", price: 1200, ini: "TLB", stock: 10 },
  { id: "prod-tee-01", t: "Heavyweight Boxy Graphic Tee — Dhaka Cyber", cat: "TEES & APPAREL", price: 1850, ini: "HBG", stock: 135 },
  { id: "prod-tee-02", t: "Artisanal Raw-Hem Oversized Drop Tee", cat: "TEES & APPAREL", price: 1650, ini: "ARH", stock: 88 },
  { id: "prod-tee-03", t: "Architectural Cutout Leather-Pocket Tee", cat: "TEES & APPAREL", price: 2450, ini: "ACL", stock: 72 },
  { id: "prod-wlt-01", t: "Full-Grain Leather Bi-Fold Wallet", cat: "LEATHER GOODS", price: 2850, ini: "FGW", stock: 105 },
  { id: "prod-crd-02", t: "Minimalist Cardholder — Aniline Tan", cat: "LEATHER GOODS", price: 1450, ini: "MCA", stock: 80 }
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
  if(a==="listOrders") return Promise.resolve({items: (window.OrdersService && typeof window.OrdersService.getAll === "function" ? window.OrdersService.getAll() : dOrders).filter(o => o && !o.archived && !o.isMock && o.id !== "ord-1048" && o.id !== "ord-1047" && o.id !== "BD-RFQ-0D2510A5" && o.customerName !== "Amsterdam Goods B.V." && o.customerName !== "London Retail Group")});
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
  grid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  factory:'<svg viewBox="0 0 24 24"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>',
  warehouse:'<svg viewBox="0 0 24 24"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>'
};

/* ── State ── */
let _initialRole = "lite";
try {
  const saved = localStorage.getItem("nx_saved_role");
  if (saved === "expert" || saved === "production") _initialRole = saved;
} catch (e) {}
let mode = _initialRole, expScreen = "dashboard";

/* ── Persistent Dark Mode & Global Theme Engine ── */
window.NexTheme = {
  getTheme: function() {
    return document.documentElement.classList.contains('dark') || (document.body && document.body.classList.contains('dark')) ? 'dark' : 'light';
  },
  isDark: function() {
    return this.getTheme() === 'dark';
  },
  setTheme: function(theme, isUserAction = false) {
    const isDark = (theme === 'dark');
    if (isUserAction) {
      document.documentElement.classList.add('theme-transitioning');
      if (document.body) document.body.classList.add('theme-transitioning');
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      if (document.body) {
        document.body.classList.add('dark');
        document.body.setAttribute('data-theme', 'dark');
      }
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      if (document.body) {
        document.body.classList.remove('dark');
        document.body.setAttribute('data-theme', 'light');
      }
    }

    try {
      localStorage.setItem('nx_theme', isDark ? 'dark' : 'light');
    } catch(e) {}

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0B0F17' : '#EBF1F8');
    }

    this.updateToggleUIs();

    if (isUserAction) {
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
        if (document.body) document.body.classList.remove('theme-transitioning');
      }, 350);
    }

    if (window.NexEvents && typeof window.NexEvents.emit === 'function') {
      window.NexEvents.emit('THEME_CHANGED', isDark ? 'dark' : 'light');
    }
  },
  toggle: function() {
    const nextTheme = this.isDark() ? 'light' : 'dark';
    this.setTheme(nextTheme, true);
    if (typeof window.toast === 'function') {
      window.toast(nextTheme === 'dark' ? '🌙 Dark Mode Activated' : '☀️ Light Mode Activated');
    }
    return nextTheme;
  },
  updateToggleUIs: function() {
    const isDark = this.isDark();
    document.querySelectorAll('.theme-toggle-input').forEach(el => {
      el.checked = isDark;
    });
    document.querySelectorAll('.theme-toggle-badge').forEach(el => {
      el.innerText = isDark ? 'DARK' : 'LIGHT';
      el.className = 'theme-toggle-badge ' + (isDark ? 'dark-active' : 'light-active');
    });
    document.querySelectorAll('.theme-toggle-btn').forEach(el => {
      el.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      el.title = isDark ? 'Switch to Light Mode (Currently Dark)' : 'Switch to Dark Mode (Currently Light)';
    });

    const headerBtn = document.getElementById('topbar-theme-btn');
    if (headerBtn) {
      headerBtn.setAttribute('title', isDark ? 'Switch to Light Mode (Currently Dark)' : 'Switch to Dark Mode (Currently Light)');
      const iconWrap = headerBtn.querySelector('.theme-btn-icon');
      if (iconWrap) {
        iconWrap.innerHTML = isDark 
          ? `<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
          : `<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      }
    }

    const orb = document.getElementById('dropdownThemeOrb');
    if (orb) {
      orb.innerHTML = isDark
        ? `<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:#F59E0B;fill:none;stroke-width:2;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      orb.style.background = isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 91, 53, 0.12)';
      orb.style.color = isDark ? '#F59E0B' : 'var(--coral)';
    }
  },
  init: function() {
    const saved = localStorage.getItem('nx_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? (saved === 'dark') : prefersDark;
    this.setTheme(isDark ? 'dark' : 'light', false);
  }
};

/* ── Theme ── */
function applyTheme(m) {
  document.body.classList.remove("expert-mode","production-mode");
  if (m === "expert")     document.body.classList.add("expert-mode");
  if (m === "production") document.body.classList.add("production-mode");

  const isDark = (window.NexTheme && typeof window.NexTheme.isDark === 'function')
    ? window.NexTheme.isDark()
    : (localStorage.getItem('nx_theme') === 'dark');

  if (isDark) {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
  }
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
  let s = LS.get("stats");
  let o = LS.get("orders");
  if (!s || !o) {
    try {
      const [sf, of2] = await Promise.all([spine("getStats"), spine("listOrders")]);
      if (sf) { s = sf; LS.set("stats", sf); }
      if (of2 && of2.items) { o = of2.items; LS.set("orders", o); }
    } catch(e) {}
  }
  s = s || {salesToday:0,ordersToday:0,pending:0};
  o = o || [];

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
                <div style="font-size:17px;font-weight:800;color:var(--ink);font-family:var(--mono);" id="dash_acc_revenue">৳${(s.salesToday || 0).toLocaleString()}</div>
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
          <div class="orders-density-container" id="recentList">${ordersListHtml(o.slice(0, 14))}</div>
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
              <div class="bento-value" id="dash_sales_today">৳${(s.salesToday||0).toLocaleString()}</div>
              <div class="bento-trend">Active Pipeline</div>
              ${fxLine ? `<div class="bento-fx">${fxLine}</div>` : ''}
            </div>
            <div class="bento-card">
              <div class="bento-label">Pending Orders</div>
              <div class="bento-value" id="dash_pending_orders" style="font-size:36px;color:var(--coral);">${s.pending||0}</div>
            </div>
            <div class="bento-card">
              <div class="bento-label">Completed Today</div>
              <div class="bento-value" id="dash_completed_orders" style="font-size:36px;">${s.ordersToday||0}</div>
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
                  <div style="font-size:22px;font-weight:700;color:var(--ink);font-family:var(--mono);" id="dash_vcard_inflow">৳${(s.salesToday || 0).toLocaleString()}</div>
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
            <button class="action-node" onclick="window.openB2BDealEngine ? window.openB2BDealEngine() : openAppModule('B2BDealEngine')" title="Open B2B Deal & Revenue Engine" style="border-color:rgba(255,85,0,0.45);background:rgba(255,85,0,0.06);">
              <div class="action-icon" style="color:#FF5500;">⚡</div><div class="action-label" style="color:#FF5500;font-weight:800;">B2B Deals</div>
            </button>
            <button class="action-node" onclick="window.openProductionFloorBridge ? window.openProductionFloorBridge() : openAppModule('ProductionFloorBridge')" title="Open Production Floor & Settlement Bridge" style="border-color:rgba(0,229,255,0.45);background:rgba(0,229,255,0.06);">
              <div class="action-icon" style="color:#00E5FF;">🏭</div><div class="action-label" style="color:#00E5FF;font-weight:800;">Floor Bridge</div>
            </button>
            <button class="action-node" onclick="window.openVaultReorderEngine ? window.openVaultReorderEngine() : openAppModule('VaultAndReorderEngine')" title="Open Vault & Reorder Engine" style="border-color:rgba(0,229,153,0.45);background:rgba(0,229,153,0.06);">
              <div class="action-icon" style="color:#00E599;">💎</div><div class="action-label" style="color:#00E599;font-weight:800;">Vault &amp; Reorder</div>
            </button>
            <button class="action-node" onclick="window.openTechPackPOEngine ? window.openTechPackPOEngine() : openAppModule('TechPackPO')" title="Open Tech-Pack PO Engine" style="border-color:rgba(217,119,6,0.35);">
              <div class="action-icon" style="color:var(--gold);">📋</div><div class="action-label" style="color:var(--gold);font-weight:700;">Tech-Pack</div>
            </button>
            <button class="action-node" onclick="window.openVoicePOIngestion ? window.openVoicePOIngestion() : openAppModule('VoiceIngest')" title="Open Voice PO Ingestion & Audio AI Dock" style="border-color:rgba(255,91,53,0.35);">
              <div class="action-icon" style="color:var(--coral);">🎙️</div><div class="action-label" style="color:var(--coral);font-weight:700;">Voice PO</div>
            </button>
            <button class="action-node" onclick="(window.VoiceEngine?.toggle ? window.VoiceEngine.toggle() : null)">
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

      case 'techpack_po':
        contentHtml = `
          <div class="sec-h" style="padding-top:12px;">
            <span class="sec-h-label">Tech-Pack &amp; Factory PO Engine</span>
            <span class="sec-h-action" onclick="window.openTechPackPOEngine ? window.openTechPackPOEngine() : openAppModule('TechPackPO')">Open Full Screen →</span>
          </div>
          <div style="margin:0 20px 10px;padding:16px;background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat-sm);border:1px solid rgba(245,158,11,0.3);display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:10px;background:#18181b;display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid rgba(245,158,11,0.4);">📋</div>
                <div>
                  <div style="font-size:15px;font-weight:700;color:var(--ink);">Parametric Apparel PO Engine</div>
                  <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);">Auto Consumption · Fabric Matrix · WhatsApp PO Dispatch</div>
                </div>
              </div>
              <span class="pill gold" style="font-size:8px;">FACTORY READY</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-sm" onclick="window.openTechPackPOEngine ? window.openTechPackPOEngine() : openAppModule('TechPackPO')" style="background:#18181b;color:#fbbf24;border:1px solid #f59e0b;font-weight:600;font-size:11px;padding:6px 14px;cursor:pointer;">Launch PO Generator</button>
              <button class="btn btn-sm" onclick="window.openVoicePOIngestion ? window.openVoicePOIngestion() : openAppModule('VoiceIngest')" style="background:transparent;color:var(--coral);border:1px solid var(--coral);font-size:11px;padding:6px 14px;cursor:pointer;">🎙️ Voice Ingest</button>
            </div>
          </div>
        `;
        break;

      case 'voice_po_ingest':
        contentHtml = `
          <div class="sec-h" style="padding-top:12px;">
            <span class="sec-h-label">Voice PO Ingestion Dock</span>
            <span class="sec-h-action" onclick="window.openVoicePOIngestion ? window.openVoicePOIngestion() : openAppModule('VoiceIngest')">Open Audio Dock →</span>
          </div>
          <div style="margin:0 20px 10px;padding:16px;background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat-sm);border:1px solid rgba(255,91,53,0.3);display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:10px;background:#18181b;display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid rgba(255,91,53,0.4);">🎙️</div>
                <div>
                  <div style="font-size:15px;font-weight:700;color:var(--ink);">Gemini Flash Audio Extraction</div>
                  <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);">Record Spoken Audio · Auto-Extract RMG Specifications</div>
                </div>
              </div>
              <span class="pill amber" style="font-size:8px;">MULTIMODAL AI</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-sm" onclick="window.openVoicePOIngestion ? window.openVoicePOIngestion() : openAppModule('VoiceIngest')" style="background:#18181b;color:#ff794d;border:1px solid #ff5b35;font-weight:600;font-size:11px;padding:6px 14px;cursor:pointer;">Open Voice Ingest Dock</button>
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
            <span class="sec-h-label">The Gemini AI Terminal</span>
            <span class="sec-h-action" onclick="openAiChat()">Open The Gemini AI →</span>
          </div>
          <div class="dash-pinned-box" style="margin:0 20px 6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <input id="dash_ai_input" type="text" placeholder="Ask The Gemini AI about leather specs, delivery fees, or EU export tariffs…" style="flex:1;background:var(--bg-neu);box-shadow:var(--neu-pressed-sm);border:1px solid var(--wire);border-radius:10px;padding:8px 12px;font-size:12px;color:var(--ink);" onkeydown="if(event.key==='Enter'){openAiChat(this.value);}"/>
              <button class="btn btn-gold btn-sm" onclick="openAiChat(document.getElementById('dash_ai_input')?.value)" style="padding:8px 14px;font-size:11px;">Ask Gemini</button>
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
            <button class="dash-btn-mini" onclick="(window.DashboardEngine?.moveWidget ? window.DashboardEngine.moveWidget('${item.id}', -1) : null)" title="Move Up (Shift Higher)">▲</button>
            <button class="dash-btn-mini" onclick="(window.DashboardEngine?.moveWidget ? window.DashboardEngine.moveWidget('${item.id}', 1) : null)" title="Move Down (Shift Lower)">▼</button>
            <button class="dash-btn-mini" onclick="(window.DashboardEngine?.togglePin ? window.DashboardEngine.togglePin('${item.id}', false) : null)" title="Unpin from Home" style="color:var(--coral);">✕</button>
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
          <button class="btn btn-sm btn-dark" onclick="(window.DashboardEngine?.openPinAppsModal ? window.DashboardEngine.openPinAppsModal() : null)" style="font-size:10.5px;padding:4px 10px;" title="Pin your favorite apps to the dashboard">
            📌 Pin Apps
          </button>
          <button class="btn btn-sm ${isCustomizing ? 'btn-gold' : 'btn-dark'}" onclick="(window.DashboardEngine?.toggleCustomizing ? window.DashboardEngine.toggleCustomizing() : null)" style="font-size:10.5px;padding:4px 10px;" title="Reorder and customize your dashboard widgets">
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
        <div class="hero-meta-line" style="color:var(--gold);cursor:pointer;" onclick="(window.DashboardEngine?.openPinAppsModal ? window.DashboardEngine.openPinAppsModal() : null)">
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
          <button class="btn btn-secondary btn-sm" onclick="(window.DashboardEngine?.openPinAppsModal ? window.DashboardEngine.openPinAppsModal() : null)" style="font-size:10.5px;">+ Pin Apps</button>
          <button class="btn btn-secondary btn-sm" onclick="(window.DashboardEngine?.resetDefaultLayout ? window.DashboardEngine.resetDefaultLayout() : null)" style="font-size:10.5px;">↺ Reset</button>
          <button class="btn btn-gold btn-sm" onclick="(window.DashboardEngine?.toggleCustomizing ? window.DashboardEngine.toggleCustomizing(false) : null)" style="font-size:10.5px;">✓ Done</button>
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
    if (typeof window.updateDashboardLiveElements === "function") {
      window.updateDashboardLiveElements(sf, of2.items);
    }
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

/* ── Responsive Dock Navigation ── */
function renderTabbar() {
  const bar = document.getElementById("tabbar"); if(!bar) return;
  const isHome = (!expScreen || expScreen === "dashboard" || expScreen === "Home");
  const isOrders = expScreen === 'Orders';
  const isProducts = expScreen === 'Products';
  const isOtherActive = !isHome && !isOrders && !isProducts;

  bar.innerHTML = `
    <!-- Top 3 Essential Navigation Buttons (Desktop + Mobile) -->
    <button class="tb tb-essential ${isHome ? 'on' : ''}" onclick="navTo('Home')" title="Home Command">
      ${I.home}
    </button>
    <button class="tb tb-essential ${isOrders ? 'on' : ''}" onclick="openAppModule('Orders')" title="Commerce Orders (High Density)">
      ${I.orders}
    </button>
    <button class="tb tb-essential ${isProducts ? 'on' : ''}" onclick="openAppModule('Products')" title="Products & Catalog">
      ${I.tag}
    </button>

    <!-- Desktop-Only Expanded Dock Buttons -->
    <button class="tb tb-desktop-only ${expScreen === 'CRM' || expScreen === 'Customers' ? 'on' : ''}" onclick="openAppModule('CRM')" title="Buyer CRM & Accounts">
      ${I.inbox}
    </button>
    <button class="tb tb-desktop-only ${expScreen === 'Suppliers' ? 'on' : ''}" onclick="window.handleOpsSelect('Suppliers')" title="Garment Exporters Registry" style="color:#38BDF8;">
      <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>
    </button>
    <button class="tb tb-desktop-only ${expScreen === 'B2BDealEngine' ? 'on' : ''}" onclick="openAppModule('B2BDealEngine')" title="B2B Deal Engine" style="color:#FF5500;">
      <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    </button>
    <button class="tb tb-desktop-only ${expScreen === 'LogisticsSettlementHub' ? 'on' : ''}" onclick="openAppModule('LogisticsSettlementHub')" title="Logistics & COD Dock" style="color:#FF4400;">
      <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    </button>
    <button class="tb tb-desktop-only ${expScreen === 'FactorySlaFloorTracker' ? 'on' : ''}" onclick="openAppModule('FactorySlaFloorTracker')" title="Factory Floor SLA Monitor" style="color:#00E599;">
      <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M2 20h20M5 20V9l5 4V9l5 4V4h5v16"/></svg>
    </button>
    <button class="tb tb-desktop-only ${expScreen === 'VaultAndReorderEngine' ? 'on' : ''}" onclick="openAppModule('VaultAndReorderEngine')" title="Vault & Reorder Engine" style="color:#A855F7;">
      <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
    </button>
    <button class="tb cam-fab tb-desktop-only" onclick="startCamera()" title="Capture Optics">
      ${I.cam}
    </button>
    <button class="tb tb-desktop-only" onclick="openDrawer()" title="Terminal Drawer">
      <svg viewBox="0 0 24 24" style="width:19px;height:19px;stroke:currentColor;stroke-width:1.7;fill:none;"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>

    <!-- Mobile-Only "More" (•••) Popover Button -->
    <button class="tb tb-more-btn ${isOtherActive ? 'on' : ''}" onclick="window.openDockMoreMenu()" title="More Modules &amp; Hubs" aria-label="Open More Modules Menu">
      <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;stroke:none;"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>
      ${isOtherActive ? '<span class="dock-active-dot"></span>' : ''}
    </button>
  `;
}

/* Mobile "More" Popover Menu / Bottom Sheet */
window.openDockMoreMenu = function() {
  const current = expScreen || 'Home';
  const isExpert = (mode === 'expert');
  const isProduction = (mode === 'production');

  const menuItems = [
    { key: 'CRM', label: 'Buyer CRM', icon: '👥', color: '#D4AF37', desc: 'Wholesalers & Accounts', badge: 'CRM' },
    { key: 'Suppliers', label: 'Exporters Registry', icon: '🏢', color: '#38BDF8', desc: 'BayXBengal Verified', badge: 'MILLS' },
    { key: 'B2BDealEngine', label: 'B2B Deal Engine', icon: '⚡', color: '#FF5500', desc: 'RFQ Ingestion & Deals', badge: 'DEALS' },
    { key: 'RMG', label: 'RMG Apparel ↗', icon: '👔', color: '#F97316', desc: 'rmg.handsandhead.com · Mill & Garment Export', badge: 'RMG ↗', url: 'https://rmg.handsandhead.com' },
    { key: 'Arutemika', label: 'Arutemika Flagship ↗', icon: '✨', color: '#F97316', desc: 'arutemika.com · Global Leather Store', badge: 'GLOBAL ↗', url: 'https://arutemika.com' },
    { key: 'LogisticsSettlementHub', label: 'Logistics & COD', icon: '🚚', color: '#FF4400', desc: 'Courier & Settlements', badge: 'COD' },
    { key: 'FactorySlaFloorTracker', label: 'Factory SLA Floor', icon: '⏱️', color: '#00E599', desc: 'Cutting & Sewing SLA', badge: 'FLOOR' },
    { key: 'ProductionFloorBridge', label: 'Floor Bridge', icon: '🏭', color: '#00E5FF', desc: 'Live QC & Cost Sync', badge: 'SYNC' },
    { key: 'VaultAndReorderEngine', label: 'Vault Reorders', icon: '📦', color: '#A855F7', desc: 'Tech-Pack Archives & POs', badge: 'VAULT' },
    { key: 'CorporateSupplies', label: 'Corporate Gifts', icon: '🎁', color: '#F59E0B', desc: 'Bespoke Custom Packs', badge: 'B2B' },
    { key: 'TechPackPO', label: 'Tech-Pack PO', icon: '📐', color: '#38BDF8', desc: 'Specification Sheets', badge: 'PO' },
    { key: 'Camera', label: 'Barcode Scanner', icon: '📷', color: '#EC4899', desc: 'Optical SKU Capture', badge: 'SCAN' },
    { key: 'Accounting', label: 'Accounting Hub', icon: '📊', color: '#10B981', desc: 'Ledger & Export VAT', badge: 'VAT' },
    { key: 'Drawer', label: 'Terminal Settings', icon: '⚙️', color: '#94A3B8', desc: 'Command Drawer', badge: 'SYS' }
  ];

  const gridHtml = menuItems.map((item, idx) => {
    const isActive = current === item.key;
    return `
      <div class="more-card-item ${isActive ? 'is-active-module' : ''}" 
           onclick="window.handleDockMoreSelect('${item.key}')" 
           style="--card-color:${item.color};--card-glow:${item.color}40;--delay-idx:${idx};"
           title="${item.label} — ${item.desc}">
        <span class="more-card-badge">${item.badge}</span>
        ${isActive ? `<span class="more-card-active-dot"></span>` : ''}
        <span class="more-card-icon">${item.icon}</span>
        <span class="more-card-title">${item.label}</span>
        <span class="more-card-desc">${item.desc}</span>
      </div>
    `;
  }).join('');

  const sheetEl = document.getElementById("sheet");
  if (sheetEl) sheetEl.classList.add("more-menu-sheet");

  openSheet(`
    <div class="more-grab-handle"></div>
    <div class="more-panel-header">
      <div>
        <div class="more-header-eyebrow">
          <span class="more-header-beacon"></span>
          <span>NEXOS SYSTEM MATRIX · MULTI-MODULE</span>
        </div>
        <div class="more-header-title">Executive Operations Hub</div>
      </div>
      <button class="more-close-circular-btn" onclick="closeSheet()" title="Close Navigation Hub" aria-label="Close">✕</button>
    </div>

    <!-- ⚡ HERO VIP CARD: EXPERT OPERATOR OS (PIN: 1981) -->
    <div class="more-expert-hero-card" onclick="window.handleExpertSwitch()" title="Toggle Expert Mode & Enterprise Operator Suite">
      <div class="more-expert-left">
        <div class="more-expert-icon-wrap">
          <span style="font-size:22px;line-height:1;">⚡</span>
        </div>
        <div class="more-expert-info">
          <div class="more-expert-badge-line">
            <span class="more-expert-tag">${isExpert ? 'OPERATOR ACTIVE' : isProduction ? 'PRODUCTION HEAD' : 'OPERATOR GATE'}</span>
            <span class="more-expert-pin-chip">${isExpert ? 'ACTIVE' : 'PIN: 1981'}</span>
          </div>
          <div class="more-expert-name">${isExpert ? 'Expert OS Terminal (Active)' : 'Switch to Expert Operator OS'}</div>
          <div class="more-expert-desc">${isExpert ? 'Full telemetry unlocked · Tap to return to Lite Seller' : 'Deep B2B engines, Cloud SQL/Firestore & raw analytics'}</div>
        </div>
      </div>
      <button class="more-expert-btn-action" type="button">
        ${isExpert ? 'Exit Mode' : 'Unlock Now →'}
      </button>
    </div>

    <!-- Multi-Module Commerce & Factory Grid -->
    <div class="more-grid-container">
      ${gridHtml}
    </div>
  `);
};

window.handleExpertSwitch = function() {
  closeSheet();
  if (mode === 'expert') {
    exitExpert();
  } else {
    openGate('expert');
  }
};

window.handleDockMoreSelect = function(key) {
  closeSheet();
  if (key === 'RMG') {
    window.open('https://rmg.handsandhead.com', '_blank', 'noopener,noreferrer');
  } else if (key === 'Arutemika') {
    window.open('https://arutemika.com', '_blank', 'noopener,noreferrer');
  } else if (key === 'Camera') {
    startCamera();
  } else if (key === 'Drawer') {
    openDrawer();
  } else if (key === 'Suppliers') {
    window.handleOpsSelect('Suppliers');
  } else {
    openAppModule(key);
  }
};



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
      { label: "Products", icon: I.tag, app: "Products", chev: true, desc: "Inventory catalog, variants & pricing matrix", ext: "CATALOG" },
      { label: "Orders", icon: I.orders, app: "Orders", chev: true, desc: "Live order stream & fulfillment tracker", ext: "POS" },
      { label: "Customers", icon: I.inbox, app: "CRM", chev: true, desc: "Global wholesale buyer CRM & accounts", ext: "CRM" },
      { label: "Suppliers", icon: I.warehouse, app: "Suppliers", url: "/admin/suppliers", fn: "if(window.openSuppliersManagement){window.openSuppliersManagement();}else if(window.openAppModule){window.openAppModule('Suppliers');}else{window.location.href='/admin/suppliers';}", chev: true, desc: "Verified RMG exporters, customs bonded status & HS codes registry", ext: "SUPPLIERS", extClass: "gold" },
      { label: "B2B Deal & Revenue Engine", icon: "⚡", app: "B2BDealEngine", chev: true, desc: "High-density B2B deal closer: Apollo lead scoring, 10-stage pipeline, quick offers & JIT cash-lock", ext: "DEALS", extClass: "gold" },
      { label: "Production Floor & Settlement Bridge", icon: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:#00E5FF;stroke-width:2;"><path d="M2 20h20M5 20V9l5 4V9l5 4V4h5v16"/></svg>`, app: "ProductionFloorBridge", chev: true, desc: "Production pipeline, 5-stage checkpoints, one-click courier routing & balance settlement", ext: "FLOOR", extClass: "gold" },
      { label: "Vault & Reorder Engine", icon: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:#00E599;stroke-width:2;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`, app: "VaultAndReorderEngine", chev: true, desc: "Courier remittance reconciliation, 30-day corporate re-ignition radar & deadstock clearance vault", ext: "VAULT", extClass: "gold" },
      { label: "Corporate Supplies & Gifts", icon: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`, app: "CorporateSupplies", chev: true, desc: "B2B enterprise corporate supplies, bespoke corporate gifts, executive tech & bulk RFQ matrix", ext: "B2B", extClass: "gold" },
      { label: "Drive Sync Monitor", icon: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><polyline points="12 11 12 17 14 15"></polyline></svg>`, app: "DriveSync", chev: true, desc: "Master Google Drive auto-sync, tokenized specs & staging", ext: "SYNC", extClass: "gold" },
      { label: "Tech-Pack PO Engine", icon: "📋", app: "TechPackPO", chev: true, desc: "Parametric apparel tech pack & factory PO calculations with WhatsApp dispatch", ext: "PO", extClass: "gold" },
      { label: "Factory Floor & SLA Monitor", icon: "🏭", app: "FactorySlaFloorTracker", chev: true, desc: "Milestone execution, floor tickets, overrun clearance vault & supervisor SLA escalation", ext: "SLA", extClass: "gold" },
      { label: "Logistics & COD Settlement Dock", icon: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`, app: "LogisticsSettlementHub", chev: true, desc: "One-click courier dispatch (Steadfast, Pathao, RedX) & COD collection tracking", ext: "COD", extClass: "gold" },
      { label: "Voice PO Ingestion", icon: "🎙️", app: "VoiceIngest", chev: true, desc: "Gemini Flash audio transcription & RMG PO spec extraction", ext: "AI", extClass: "gold" },
      { label: "Data Quality Center", icon: `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`, app: "DataQuality", chev: true, desc: "Deterministic BD phone normalization, customer deduplication & audit", ext: "AUDIT", extClass: "gold" }
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
      { label: "Customize Dashboard Layout", icon: I.gear, fn: "(window.DashboardEngine?.openPinAppsModal ? window.DashboardEngine.openPinAppsModal() : null)", desc: "Reorder and pin favorite widgets to Home", ext: "LAYOUT" },
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
      { label: "Arutemika (Global Store)", icon: I.leather, url: "https://arutemika.com", target: "_blank", rel: "noopener noreferrer", desc: "arutemika.com · Luxury Leather Goods & Global D2C Flagship", ext: "GLOBAL ↗", extClass: "d2c" },
      { label: "RMG (Garment & Mills)", icon: I.rmg, url: "https://rmg.handsandhead.com", target: "_blank", rel: "noopener noreferrer", desc: "rmg.handsandhead.com · Apparel Manufacturing & Mill Sourcing", ext: "RMG ↗", extClass: "b2b" },
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
      { label: "WhatsApp Broadcast Studio", icon: I.megaphone, fn: "window.openWhatsAppCampaignStudio()", desc: "Send bulk products & digital lookbooks to 15K+ buyers via WhatsApp", ext: "WHATSAPP", extClass: "ok" },
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
      { label: "Voice Commands (Mic)", icon: I.mic, fn: "(window.VoiceEngine?.toggle ? window.VoiceEngine.toggle() : null)", desc: "Hands-free voice POS & order creation", ext: "MIC" },
      { label: "Analytics", icon: I.chart, app: "Analytics", desc: "Revenue velocity, margin breakdown & order charts", ext: "REPORTS" },
      { label: "The Gemini AI", icon: I.spark, app: "NexAI", desc: "Enterprise Google Gemini supply chain reasoning, EU compliance & forecasting", ext: "GEMINI AI" },
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
      { label: "Expert OS (Operator)", icon: "⚡", gate: "expert", desc: "Unlock full-spectrum developer & enterprise controls", ext: "PIN: 1981", extClass: "gold" },
      { label: "Production View (Hiron)", icon: I.hammer, gate: "production", desc: "Hiron's dedicated factory floor production queue", ext: "PIN: 2024" }
    ]
  }
];

const MODULE_MAP = {
  "Home": "Home",
  "dashboard": "Home",
  "Dashboard": "Home",
  "B2BDealEngine": "B2BDealEngine",
  "B2BDEAL": "B2BDealEngine",
  "B2B_DEAL": "B2BDealEngine",
  "B2BDeal": "B2BDealEngine",
  "b2bdeal": "B2BDealEngine",
  "B2B Deal Engine": "B2BDealEngine",
  "B2B Deal & Revenue Engine": "B2BDealEngine",
  "B2B Deals": "B2BDealEngine",
  "Deals": "B2BDealEngine",
  "DEALS": "B2BDealEngine",
  "Revenue": "B2BDealEngine",
  "REVENUE": "B2BDealEngine",
  "ProductionFloorBridge": "ProductionFloorBridge",
  "PRODUCTION_FLOOR_BRIDGE": "ProductionFloorBridge",
  "ProductionFloor": "ProductionFloorBridge",
  "FloorBridge": "ProductionFloorBridge",
  "FLOOR_BRIDGE": "ProductionFloorBridge",
  "FLOORBRIDGE": "ProductionFloorBridge",
  "Floor": "ProductionFloorBridge",
  "FLOOR": "ProductionFloorBridge",
  "VaultAndReorderEngine": "VaultAndReorderEngine",
  "VaultReorder": "VaultAndReorderEngine",
  "VAULT_REORDER": "VaultAndReorderEngine",
  "VAULTREORDER": "VaultAndReorderEngine",
  "Vault": "VaultAndReorderEngine",
  "VAULT": "VaultAndReorderEngine",
  "ReorderEngine": "VaultAndReorderEngine",
  "REORDER": "VaultAndReorderEngine",
  "CorporateSupplies": "CorporateSupplies",
  "Corporate Supplies": "CorporateSupplies",
  "corporate-supplies": "CorporateSupplies",
  "corporate_supplies": "CorporateSupplies",
  "Corporate": "CorporateSupplies",
  "CORPORATESUPPLIES": "CorporateSupplies",
  "B2BSupplies": "CorporateSupplies",
  "Suppliers": "Suppliers",
  "suppliers": "Suppliers",
  "Supplier": "Suppliers",
  "supplier": "Suppliers",
  "SuppliersManagement": "Suppliers",
  "SuppliersManagementDashboard": "Suppliers",
  "GarmentExporters": "Suppliers",
  "Exporters": "Suppliers",
  "Garments": "Suppliers",
  "TechPackPO": "TechPackPO",
  "TECHPACKPO": "TechPackPO",
  "techpackpo": "TechPackPO",
  "TechPack": "TechPackPO",
  "TECHPACK": "TechPackPO",
  "techpack": "TechPackPO",
  "Tech-Pack PO": "TechPackPO",
  "TechPack PO Engine": "TechPackPO",
  "TechPackPOEngine": "TechPackPO",
  "TECH_PACK": "TechPackPO",
  "TECH-PACK": "TechPackPO",
  "VoiceIngest": "VoiceIngest",
  "VOICEINGEST": "VoiceIngest",
  "voiceingest": "VoiceIngest",
  "VOICE_INGEST": "VoiceIngest",
  "voice_ingest": "VoiceIngest",
  "Voice Ingest": "VoiceIngest",
  "Voice PO Ingestion": "VoiceIngest",
  "VoicePOIngestion": "VoiceIngest",
  "VOICEPOINGESTION": "VoiceIngest",
  "LogisticsSettlementHub": "LogisticsSettlementHub",
  "LOGISTICS_HUB": "LogisticsSettlementHub",
  "LogisticsHub": "LogisticsSettlementHub",
  "Logistics": "LogisticsSettlementHub",
  "LOGISTICS": "LogisticsSettlementHub",
  "logistics": "LogisticsSettlementHub",
  "Settlement": "LogisticsSettlementHub",
  "SETTLEMENT": "LogisticsSettlementHub",
  "Logistics & Settlement": "LogisticsSettlementHub",
  "COD Settlement": "LogisticsSettlementHub",
  "FactorySlaFloorTracker": "FactorySlaFloorTracker",
  "FACTORY_SLA": "FactorySlaFloorTracker",
  "FactorySLA": "FactorySlaFloorTracker",
  "FactorySla": "FactorySlaFloorTracker",
  "Factory SLA": "FactorySlaFloorTracker",
  "Factory Floor": "FactorySlaFloorTracker",
  "FloorTracker": "FactorySlaFloorTracker",
  "Floor Tracker": "FactorySlaFloorTracker",
  "SLA": "FactorySlaFloorTracker",
  "Factory": "FactorySlaFloorTracker",
  "Orders": "Orders",
  "Products": "Products",
  "DriveSync": "DriveSync",
  "Drive Sync": "DriveSync",
  "Drive Sync Monitor": "DriveSync",
  "Drive": "DriveSync",
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
  "The Gemini AI": "NexAI",
  "Gemini AI": "NexAI",
  "Gemini": "NexAI",
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
  "PriceRules": "ShopifySuite",
  "WhatsAppStudio": "WhatsAppStudio",
  "WhatsApp Broadcast": "WhatsAppStudio",
  "WhatsApp Broadcast Studio": "WhatsAppStudio"
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
  { id: "intelligence", label: "The Gemini AI", icon: I.spark, class: "qj-ai", tag: "GEMINI" }
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
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nexus:navigate", { detail: "DEFAULT" }));
        if (window.NexusApp && typeof window.NexusApp.navigate === "function") {
          window.NexusApp.navigate("DEFAULT");
        }
        if (window.location.pathname.includes('/admin/suppliers')) {
          window.history.pushState({}, '', '/');
        }
      }
      document.body.classList.remove('has-active-module');
    } catch(e) {}
    const b = document.getElementById("body");
    if (b) {
      b.style.display = "";
      if (mode === "production") renderProductionView(b);
      else renderLiteHome(b);
    }
    const rootEl = document.getElementById("react-app-root");
    if (rootEl) rootEl.style.display = "none";
    renderTabbar();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  openAppModule(modKey);
}

function openAppModule(appName) {
  closeDrawer();
  closeSheet();
  let modKey = MODULE_MAP[appName];
  if (!modKey && appName) {
    const rawLower = appName.toString().trim().toLowerCase();
    for (const [k, v] of Object.entries(MODULE_MAP)) {
      if (k.toLowerCase() === rawLower) {
        modKey = v;
        break;
      }
    }
  }
  if (!modKey) modKey = appName;

  if (modKey === "Home" || modKey === "dashboard") {
    navTo("Home");
    return;
  }

  if (modKey === "Suppliers" || modKey === "SuppliersManagementDashboard" || modKey === "SuppliersManagement" || modKey.toString().toLowerCase().includes("supplier")) {
    if (typeof window.openSuppliersManagement === "function") {
      window.openSuppliersManagement();
      return;
    }
  }

  if (modKey === "PortalRMG" || modKey === "RMG" || modKey === "rmg") {
    window.open("https://rmg.handsandhead.com", "_blank", "noopener,noreferrer");
    return;
  }

  if (modKey === "PortalArutemika" || modKey === "Arutemika" || modKey === "arutemika") {
    window.open("https://arutemika.com", "_blank", "noopener,noreferrer");
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
  navHeader.innerHTML = `
    <button class="btn btn-sm btn-dark" onclick="navTo('Home')" title="Return to Dashboard">
      <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;"><path d="M19 12H5M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>Dashboard</span>
    </button>
    <div style="font-family:var(--mono);font-size:10.5px;font-weight:700;color:var(--gold-dim);letter-spacing:1px;text-transform:uppercase;">
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

    // Case-insensitive lookup in window.render
    if (window.render && typeof window.render === "object") {
      const lowerKey = modKey.toLowerCase();
      for (const [k, fn] of Object.entries(window.render)) {
        if (k.toLowerCase() === lowerKey && typeof fn === "function") return fn;
      }
    }

    // Case-insensitive lookup on window for render<Key>
    const lowerRenderKey = ("render" + modKey).toLowerCase();
    for (const k of Object.keys(window)) {
      if (k.toLowerCase() === lowerRenderKey && typeof window[k] === "function") {
        return window[k];
      }
    }

    // Explicit fallback for B2B Deal & Revenue Engine
    if (modKey.toLowerCase().includes("b2b") || modKey.toLowerCase().includes("deal")) {
      if (window.render && typeof window.render.B2BDealEngine === "function") return window.render.B2BDealEngine;
      if (window.render && typeof window.render.B2BDEAL === "function") return window.render.B2BDEAL;
      if (typeof window.renderB2BDealEngineComponent === "function") return window.renderB2BDealEngineComponent;
      if (typeof window.renderB2BDealEngine === "function") return window.renderB2BDealEngine;
      if (window.render && typeof window.render["B2B Deal & Revenue Engine"] === "function") return window.render["B2B Deal & Revenue Engine"];
    }

    // Explicit fallback for Production Floor & Settlement Bridge
    if (modKey.toLowerCase().includes("productionfloor") || modKey.toLowerCase().includes("floorbridge") || (modKey.toLowerCase().includes("production") && modKey.toLowerCase().includes("floor"))) {
      if (window.render && typeof window.render.ProductionFloorBridge === "function") return window.render.ProductionFloorBridge;
      if (window.render && typeof window.render.FLOOR_BRIDGE === "function") return window.render.FLOOR_BRIDGE;
      if (typeof window.renderProductionFloorBridgeComponent === "function") return window.renderProductionFloorBridgeComponent;
      if (typeof window.renderProductionFloorBridge === "function") return window.renderProductionFloorBridge;
      if (typeof window.renderFloorBridge === "function") return window.renderFloorBridge;
      if (window.render && typeof window.render["Production Floor & Settlement Bridge"] === "function") return window.render["Production Floor & Settlement Bridge"];
    }

    // Explicit fallback for Vault & Reorder Engine
    if (modKey.toLowerCase().includes("vault") || modKey.toLowerCase().includes("reorder")) {
      if (window.render && typeof window.render.VaultAndReorderEngine === "function") return window.render.VaultAndReorderEngine;
      if (window.render && typeof window.render.VaultReorderEngine === "function") return window.render.VaultReorderEngine;
      if (window.render && typeof window.render.VAULT_REORDER === "function") return window.render.VAULT_REORDER;
      if (typeof window.renderVaultReorderEngineComponent === "function") return window.renderVaultReorderEngineComponent;
      if (typeof window.renderVaultAndReorderEngine === "function") return window.renderVaultAndReorderEngine;
      if (typeof window.renderVaultReorderEngine === "function") return window.renderVaultReorderEngine;
      if (window.render && typeof window.render["Vault & Reorder Engine"] === "function") return window.render["Vault & Reorder Engine"];
    }

    // Explicit fallback for Corporate Supplies
    if (modKey.toLowerCase().includes("corporate")) {
      if (window.render && typeof window.render.CorporateSupplies === "function") return window.render.CorporateSupplies;
      if (window.render && typeof window.render.CORPORATESUPPLIES === "function") return window.render.CORPORATESUPPLIES;
      if (typeof window.renderCorporateSupplies === "function") return window.renderCorporateSupplies;
      if (typeof window.renderCorporateSuppliesComponent === "function") return window.renderCorporateSuppliesComponent;
    }

    // Explicit fallback for Voice Ingestion
    if (modKey.toLowerCase().includes("voice")) {
      if (window.render && typeof window.render.VoiceIngest === "function") return window.render.VoiceIngest;
      if (window.render && typeof window.render.VOICEINGEST === "function") return window.render.VOICEINGEST;
      if (typeof window.renderVoiceIngest === "function") return window.renderVoiceIngest;
      if (typeof window.renderVOICEINGEST === "function") return window.renderVOICEINGEST;
    }

    // Explicit fallback for Tech-Pack PO
    if (modKey.toLowerCase().includes("techpack")) {
      if (window.render && typeof window.render.TechPackPO === "function") return window.render.TechPackPO;
      if (window.render && typeof window.render.TECHPACK === "function") return window.render.TECHPACK;
      if (typeof window.renderTechPackPO === "function") return window.renderTechPackPO;
      if (typeof window.renderTECHPACK === "function") return window.renderTECHPACK;
    }

    // Explicit fallback for Logistics & Settlement Hub
    if (modKey.toLowerCase().includes("logistics") || modKey.toLowerCase().includes("settlement")) {
      if (window.render && typeof window.render.LogisticsSettlementHub === "function") return window.render.LogisticsSettlementHub;
      if (window.render && typeof window.render.LOGISTICS_HUB === "function") return window.render.LOGISTICS_HUB;
      if (typeof window.renderLogisticsHub === "function") return window.renderLogisticsHub;
      if (typeof window.renderLogisticsSettlementHub === "function") return window.renderLogisticsSettlementHub;
    }

    // Explicit fallback for Factory Floor & SLA Tracker
    if (modKey.toLowerCase().includes("factory") || modKey.toLowerCase().includes("sla")) {
      if (window.render && typeof window.render.FactorySlaFloorTracker === "function") return window.render.FactorySlaFloorTracker;
      if (window.render && typeof window.render.FACTORY_SLA === "function") return window.render.FACTORY_SLA;
      if (window.render && typeof window.render.FactorySLA === "function") return window.render.FactorySLA;
      if (window.render && typeof window.render['Factory SLA'] === "function") return window.render['Factory SLA'];
      if (typeof window.renderFactorySla === "function") return window.renderFactorySla;
      if (typeof window.renderFactorySlaFloorTracker === "function") return window.renderFactorySlaFloorTracker;
      if (typeof window.renderFactorySlaComponent === "function") return window.renderFactorySlaComponent;
    }

    // Explicit fallback for Suppliers Management Dashboard
    if (modKey.toLowerCase().includes("supplier") || modKey.toLowerCase().includes("exporter") || modKey.toLowerCase() === "garments") {
      if (window.render && typeof window.render.SuppliersManagementDashboard === "function") return window.render.SuppliersManagementDashboard;
      if (window.render && typeof window.render.Suppliers === "function") return window.render.Suppliers;
      if (window.render && typeof window.render.SuppliersManagement === "function") return window.render.SuppliersManagement;
      if (typeof window.renderSuppliersManagementComponent === "function") return window.renderSuppliersManagementComponent;
    }

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
        
        // Final fallback: try calling global module launchers or dispatching React navigation
        if (modKey.toLowerCase().includes("voice")) {
          if (typeof window.openVoicePOIngestion === "function") {
            window.openVoicePOIngestion();
            modContainer.innerHTML = `<div style="padding:24px;font-family:var(--mono);color:var(--gold);font-size:11px;">🎙️ Voice Ingestion Engine Initialized</div>`;
            return;
          }
          window.dispatchEvent(new CustomEvent('nexus:navigate', { detail: 'VOICEINGEST' }));
        } else if (modKey.toLowerCase().includes("techpack")) {
          if (typeof window.openTechPackPOEngine === "function") {
            window.openTechPackPOEngine();
            modContainer.innerHTML = `<div style="padding:24px;font-family:var(--mono);color:var(--gold);font-size:11px;">📋 Tech-Pack PO Engine Initialized</div>`;
            return;
          }
          window.dispatchEvent(new CustomEvent('nexus:navigate', { detail: 'TECHPACK' }));
        }

        modContainer.innerHTML = `
          <div class="empty" style="padding:40px 20px;text-align:center;">
            <div style="font-weight:700;font-size:14px;color:var(--ink);margin-bottom:6px;">Module "${modKey}" is loading.</div>
            <div style="font-size:11.5px;color:var(--ink-3);margin-bottom:14px;">If the engine doesn't display automatically, tap to mount:</div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
              <button class="btn btn-sm btn-gold" onclick="if(window.render && window.render['${modKey}']){window.render['${modKey}'](document.getElementById('mod-${modKey}'))}else{window.location.reload()}" style="font-weight:700;">🚀 Launch ${modKey}</button>
              <button class="btn btn-sm btn-dark" onclick="window.location.reload()" style="font-weight:700;">🔄 Reload Terminal</button>
            </div>
          </div>
        `;
      }
    }, 150);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openSheet(html) { document.getElementById("sheet").innerHTML=`<div class="grab"></div>`+html; document.getElementById("sheet").classList.add("on"); document.getElementById("scrim").classList.add("on"); }
function closeSheet() { 
  const sheetEl = document.getElementById("sheet");
  if (sheetEl) sheetEl.classList.remove("on", "more-menu-sheet");
  const scrimEl = document.getElementById("scrim");
  if (scrimEl) scrimEl.classList.remove("on");
}


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
let _pendingGateModule = null;
function openGate(role = 'expert', targetModule = null) {
  _pendingGateRole = role;
  _pendingGateModule = targetModule || null;
  const g = document.getElementById("gate");
  const sub = g.querySelector(".gate-sub");
  const hint = g.querySelector(".gate-role-hint");
  if (role === 'production') {
    if (sub) sub.innerText = "Production Access — Hiron Only (PIN: 2024)";
    if (hint) hint.innerText = "Role: Production Head";
  } else {
    if (sub) sub.innerText = targetModule ? `Enter Operator PIN (1981) to access ${targetModule}` : "Enter Base Operator PIN (1981) to Unlock";
    if (hint) hint.innerText = "Role: Nexus Operator (PIN: 1981)";
  }
  g.classList.add("on");
  document.getElementById("gateScrim").classList.add("on");
  setTimeout(() => {
    const pinEl = document.getElementById("gatePin");
    if (pinEl) {
      pinEl.focus();
      pinEl.value = "";
    }
  }, 250);
}
function closeGate() { 
  document.getElementById("gate").classList.remove("on"); 
  document.getElementById("gateScrim").classList.remove("on"); 
  document.getElementById("gatePin").value=""; 
  _pendingGateModule = null;
}
async function tryGate() {
  const pinEl = document.getElementById("gatePin");
  const pin = pinEl ? pinEl.value.trim() : "";
  const role = _pendingGateRole || 'expert';
  const targetModule = _pendingGateModule;
  let isValid = false;

  // 1. BASE OPERATOR PIN CHECK (Guaranteed offline & cross-device instant unlock)
  if (pin === "1981") {
    isValid = true;
  } else if (pin === "2024" && (role === "production" || !_pendingGateRole)) {
    isValid = true;
  }

  // 2. Remote verification check
  if (!isValid && pin.length >= 4) {
    try {
      const authRes = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, role })
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.ok) isValid = true;
      }
    } catch (apiErr) {
      console.debug("PIN auth API fallback:", apiErr.message);
    }
  }

  // 3. NexAuth fallback
  if (!isValid && window.NexAuth && typeof window.NexAuth.verifyOperatorPin === 'function') {
    isValid = await window.NexAuth.verifyOperatorPin(pin);
  }

  if (isValid) {
    const activeRole = (pin === "2024") ? "production" : (role || 'expert');
    mode = activeRole;
    _pendingGateModule = null;
    try {
      localStorage.setItem("nx_saved_role", activeRole);
      localStorage.setItem("nx_saved_pin", pin);
    } catch (e) {}

    closeGate();
    applyTheme(activeRole);
    render();

    if (targetModule) {
      setTimeout(() => {
        if (typeof window.openAppModule === "function") window.openAppModule(targetModule);
      }, 50);
    }

    toast(activeRole === 'production' ? "Production View Active (PIN: 2024) ✓" : "Operator OS Unlocked (PIN: 1981) ✓");
  } else {
    toast("Access Denied — Enter Operator PIN: 1981");
    const g = document.getElementById("gate");
    if (g) {
      g.style.animation = "shake 0.45s ease";
      setTimeout(() => g.style.animation="", 450);
    }
    if (pinEl) pinEl.value = "";
  }
}
function exitExpert() {
  mode = "lite";
  try {
    localStorage.removeItem("nx_saved_role");
    localStorage.removeItem("nx_saved_pin");
  } catch (e) {}
  applyTheme("lite");
  render();
  toast("Returned to Lite Mode");
}
function exitProduction() {
  mode = "lite";
  try {
    localStorage.removeItem("nx_saved_role");
    localStorage.removeItem("nx_saved_pin");
  } catch (e) {}
  applyTheme("lite");
  render();
  toast("Exited Production View");
}

/* ── Role & Account Switcher Modal ── */
window.openAccountProfileModal = function() {
  const isExpert = (mode === 'expert');
  const isProd = (mode === 'production');
  const prof = window.NexAuth?.profile || {};
  const user = window.NexAuth?.currentUser || window.NexAuth?.getUser() || null;
  const userName = prof.name || user?.displayName || "Merchant Admin";
  const userEmail = prof.email || user?.email || "admin@handsandhead.com";
  const roleTitle = isExpert ? "Expert OS (Operator)" : isProd ? "Production Head" : "Lite Seller";
  const isDark = (window.NexTheme && typeof window.NexTheme.isDark === 'function') ? window.NexTheme.isDark() : false;

  const sheetEl = document.getElementById("sheet");
  if (sheetEl) sheetEl.classList.add("more-menu-sheet");

  openSheet(`
    <div class="more-grab-handle"></div>
    <div class="more-panel-header">
      <div>
        <div class="more-header-eyebrow">
          <span class="more-header-beacon"></span>
          <span>SYSTEM PRIVILEGES &amp; ACCOUNT</span>
        </div>
        <div class="more-header-title">Operator Profile &amp; Preferences</div>
      </div>
      <button class="more-close-circular-btn" onclick="closeSheet()" title="Close">✕</button>
    </div>

    <!-- Active Status Card -->
    <div style="background:var(--bg-neu);border:1px solid var(--wire);border-radius:14px;padding:14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;box-shadow:var(--neu-flat-xs);">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:42px;height:42px;border-radius:50%;background:var(--coral-gradient);color:#FFF;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:var(--display);box-shadow:var(--coral-shadow);flex-shrink:0;">
          ${(userName || 'MA').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--ink);">${userName}</div>
          <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);">${userEmail}</div>
          <div style="font-size:10px;color:var(--gold);font-family:var(--mono);margin-top:2px;">Terminal: ${roleTitle}</div>
        </div>
      </div>
      <div style="padding:4px 10px;border-radius:20px;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4);color:#D4AF37;font-family:var(--mono);font-size:9.5px;font-weight:800;">
        ACTIVE
      </div>
    </div>

    <!-- PERSISTENT DARK MODE TOGGLE (Featured Card) -->
    <div style="background:var(--bg-neu);border-radius:14px;border:1px solid var(--wire);box-shadow:var(--neu-flat-xs);padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="window.NexTheme?.toggle ? window.NexTheme.toggle() : null" title="Click to toggle Dark / Light mode">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,91,53,0.12);color:var(--coral);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </div>
        <div>
          <div style="font-size:13.5px;font-weight:700;color:var(--ink);">Dark Mode</div>
          <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">Updates CSS variables &amp; Tailwind globally</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;" onclick="event.stopPropagation()">
        <span class="theme-toggle-badge ${isDark ? 'dark-active' : 'light-active'}">${isDark ? 'DARK' : 'LIGHT'}</span>
        <label class="theme-switch" title="Toggle Dark/Light Mode">
          <input type="checkbox" class="theme-toggle-input" ${isDark ? 'checked' : ''} onchange="window.NexTheme?.setTheme ? window.NexTheme.setTheme(this.checked ? 'dark' : 'light') : null" />
          <span class="theme-slider"></span>
        </label>
      </div>
    </div>

    <!-- Switch Roles Options -->
    <div style="font-family:var(--mono);font-size:9.5px;color:var(--ink-3);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;font-weight:700;">
      Terminal Roles &amp; Mode Gates
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
      <div style="background:linear-gradient(135deg, rgba(212,175,55,0.15), rgba(15,23,42,0.95));border:1px solid ${isExpert ? '#D4AF37' : 'rgba(212,175,55,0.4)'};border-radius:12px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;"
           onclick="closeSheet(); ${isExpert ? 'exitExpert()' : 'openGate(\'expert\')'}">
        <div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:16px;">⚡</span>
            <span style="font-size:13px;font-weight:800;color:#FFF;">Expert OS (Operator Mode)</span>
            <span style="font-family:var(--mono);font-size:9px;background:#D4AF37;color:#000;padding:1px 5px;border-radius:4px;font-weight:800;">PIN: 1981</span>
          </div>
          <div style="font-size:10px;color:#94A3B8;margin-top:2px;">Full developer & enterprise operations, raw metrics & fulfillment tools</div>
        </div>
        <button class="btn btn-sm ${isExpert ? 'btn-dark' : 'btn-gold'}" style="flex-shrink:0;font-size:10.5px;">
          ${isExpert ? 'Exit Expert' : 'Switch →'}
        </button>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;"
           onclick="closeSheet(); ${isProd ? 'exitProduction()' : 'openGate(\'production\')'}">
        <div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:16px;">🏭</span>
            <span style="font-size:13px;font-weight:800;color:#FFF;">Production Head View</span>
            <span style="font-family:var(--mono);font-size:9px;background:rgba(255,255,255,0.1);color:#CBD5E1;padding:1px 5px;border-radius:4px;font-weight:700;">PIN: 2024</span>
          </div>
          <div style="font-size:10px;color:#94A3B8;margin-top:2px;">Hiron's factory floor cutting lines, milestones & QC queue</div>
        </div>
        <button class="btn btn-sm btn-dark" style="flex-shrink:0;font-size:10.5px;">
          ${isProd ? 'Exit View' : 'Switch →'}
        </button>
      </div>

      ${(isExpert || isProd) ? `
        <button class="btn btn-dark" onclick="closeSheet(); exitExpert();" style="width:100%;margin-top:4px;">
          ↩ Return to Lite Seller Mode
        </button>
      ` : ''}
    </div>
  `);
};

/* ── Toast ── */
function toast(m) { const t=document.getElementById("toast"); if(!t)return; t.innerText=m; t.classList.add("on"); setTimeout(()=>t.classList.remove("on"),2500); }

/* ── Global Broadcast & Lookbook Fallbacks ── */
window.openWhatsAppCampaignStudio = window.openWhatsAppCampaignStudio || function(options = {}) {
  if (window.WhatsAppCampaignStudio && typeof window.WhatsAppCampaignStudio.open === 'function') {
    return window.WhatsAppCampaignStudio.open(options);
  }
  setTimeout(() => {
    if (window.WhatsAppCampaignStudio && typeof window.WhatsAppCampaignStudio.open === 'function') {
      window.WhatsAppCampaignStudio.open(options);
    }
  }, 100);
};

window.openLookbookViewer = window.openLookbookViewer || function(productIds = []) {
  if (window.WhatsAppCampaignStudio && typeof window.WhatsAppCampaignStudio.openLookbookViewer === 'function') {
    return window.WhatsAppCampaignStudio.openLookbookViewer(productIds);
  }
  setTimeout(() => {
    if (window.WhatsAppCampaignStudio && typeof window.WhatsAppCampaignStudio.openLookbookViewer === 'function') {
      window.WhatsAppCampaignStudio.openLookbookViewer(productIds);
    }
  }, 100);
};

/* ── Operations Dropdown Controller ── */
window.toggleOperationsDropdown = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const menu = document.getElementById('operationsDropdownMenu');
  const btn = document.getElementById('operationsBtn');
  if (!menu) return;
  const isHidden = menu.style.display === 'none' || menu.classList.contains('hidden');
  if (isHidden) {
    menu.style.display = 'block';
    menu.classList.remove('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  } else {
    menu.style.display = 'none';
    menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
};

window.handleOpsSelect = function(modKey) {
  const menu = document.getElementById('operationsDropdownMenu');
  const btn = document.getElementById('operationsBtn');
  if (menu) {
    menu.style.display = 'none';
    menu.classList.add('hidden');
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');

  if (modKey === 'Suppliers') {
    if (typeof window.openSuppliersManagement === 'function') {
      window.openSuppliersManagement();
    } else {
      openAppModule('Suppliers');
    }
  } else if (modKey === 'Camera') {
    startCamera();
  } else {
    openAppModule(modKey);
  }
};

// Global click listener to close Operations dropdown when clicking outside
document.addEventListener('click', function(e) {
  const wrap = document.querySelector('.operations-dropdown-wrap');
  const menu = document.getElementById('operationsDropdownMenu');
  const btn = document.getElementById('operationsBtn');
  if (wrap && menu && !wrap.contains(e.target)) {
    menu.style.display = 'none';
    menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
});

/* ── Topbar User Account Menu Controller ── */
window.syncTopbarUserProfile = function() {
  const prof = window.NexAuth?.profile || {};
  const user = window.NexAuth?.currentUser || {};
  const name = prof.name || user.displayName || 'Merchant Admin';
  const email = prof.email || user.email || 'admin@handsandhead.com';
  const initials = (name || 'MA').slice(0, 2).toUpperCase();

  const avatarEl = document.getElementById('topbarUserAvatar');
  if (avatarEl) avatarEl.innerText = initials;
  const nameEl = document.getElementById('topbarUserName');
  if (nameEl) nameEl.innerText = name;

  const dropAvatar = document.getElementById('dropdownUserAvatar');
  if (dropAvatar) dropAvatar.innerText = initials;
  const dropName = document.getElementById('dropdownUserName');
  if (dropName) dropName.innerText = name;
  const dropEmail = document.getElementById('dropdownUserEmail');
  if (dropEmail) dropEmail.innerText = email;
};

window.toggleUserAccountDropdown = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const menu = document.getElementById('userAccountDropdown');
  const btn = document.getElementById('userAccountBtn');
  if (!menu) return;
  const isHidden = menu.style.display === 'none' || menu.classList.contains('hidden');
  if (isHidden) {
    // Close operations dropdown if open
    const opsMenu = document.getElementById('operationsDropdownMenu');
    const opsBtn = document.getElementById('operationsBtn');
    if (opsMenu) { opsMenu.style.display = 'none'; opsMenu.classList.add('hidden'); }
    if (opsBtn) opsBtn.setAttribute('aria-expanded', 'false');

    menu.style.display = 'block';
    menu.classList.remove('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    window.syncTopbarUserProfile?.();
    window.NexTheme?.updateToggleUIs?.();
  } else {
    menu.style.display = 'none';
    menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
};

window.closeAllUserMenus = function() {
  const menu = document.getElementById('userAccountDropdown');
  const btn = document.getElementById('userAccountBtn');
  if (menu) {
    menu.style.display = 'none';
    menu.classList.add('hidden');
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');
};

document.addEventListener('click', function(e) {
  const wrap = document.getElementById('userAccountMenuWrap');
  const menu = document.getElementById('userAccountDropdown');
  const btn = document.getElementById('userAccountBtn');
  if (wrap && menu && !wrap.contains(e.target)) {
    menu.style.display = 'none';
    menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
});

/* ── High-Density Order Strips Architecture ── */
window.ORDER_STATUS_STAGES = [
  { id: 'lead', label: 'LEAD', badgeClass: 'status-lead', pillClass: 'info' },
  { id: '50_paid', label: '50% PAID', badgeClass: 'status-50_paid', pillClass: 'amber' },
  { id: 'jit_cutting', label: 'JIT CUTTING', badgeClass: 'status-jit_cutting', pillClass: 'info' },
  { id: 'shipped', label: 'SHIPPED', badgeClass: 'status-shipped', pillClass: 'ok' }
];

window.inferOrderStage = function(order) {
  if (!order) return window.ORDER_STATUS_STAGES[0];
  const explicit = (order.lifecycleStage || '').toLowerCase().replace(/[\s-]/g, '_');
  if (explicit) {
    const found = window.ORDER_STATUS_STAGES.find(s => s.id === explicit);
    if (found) return found;
  }
  const stText = (Array.isArray(order.st) ? order.st[0] : (order.status || '')).toUpperCase();
  if (stText.includes('LEAD') || stText.includes('NEW') || stText.includes('DRAFT')) return window.ORDER_STATUS_STAGES[0];
  if (stText.includes('50') || stText.includes('PAID') || stText.includes('CONFIRM') || stText.includes('PENDING')) return window.ORDER_STATUS_STAGES[1];
  if (stText.includes('CUT') || stText.includes('PROD') || stText.includes('JIT')) return window.ORDER_STATUS_STAGES[2];
  if (stText.includes('SHIP') || stText.includes('FULFILL') || stText.includes('DELIVER') || stText.includes('DISPATCH')) return window.ORDER_STATUS_STAGES[3];
  return window.ORDER_STATUS_STAGES[0];
};

window.extractLocationSnippet = function(order) {
  if (!order) return 'Amsterdam, NL';
  if (order.customerSnapshot) {
    const city = order.customerSnapshot.city || '';
    const country = order.customerSnapshot.country || '';
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    if (order.customerSnapshot.address) {
      const parts = order.customerSnapshot.address.split(',');
      if (parts.length >= 2) return parts.slice(-2).join(',').trim();
      return order.customerSnapshot.address.trim();
    }
  }
  if (order.s && typeof order.s === 'string') {
    const parts = order.s.split('·');
    if (parts.length > 1) return parts[parts.length - 1].trim();
  }
  return 'Global';
};

window.renderLifecycleStepperHtml = function(orderId, activeStageId) {
  const stages = [
    { id: 'lead', label: '1. Lead' },
    { id: '50_paid', label: '2. 50% Paid' },
    { id: 'jit_cutting', label: '3. JIT Cutting' },
    { id: 'shipped', label: '4. Shipped' }
  ];
  const activeIdx = stages.findIndex(s => s.id === activeStageId);

  return `
    <div class="lifecycle-stepper">
      ${stages.map((s, idx) => {
        const isCompleted = idx < activeIdx;
        const isActive = idx === activeIdx;
        const cls = isActive ? 'active' : (isCompleted ? 'completed' : '');
        return `
          <div class="stepper-step ${cls}" onclick="window.setOrderExplicitStage('${orderId}', '${s.id}', event)">
            <span class="step-dot"></span>
            <span>${s.label}</span>
          </div>
          ${idx < stages.length - 1 ? `<div class="stepper-line ${idx < activeIdx ? 'completed' : ''}"></div>` : ''}
        `;
      }).join('')}
    </div>
  `;
};

window.cycleOrderStatus = function(orderId, evt) {
  if (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }
  let order = null;
  if (Array.isArray(dOrders)) {
    order = dOrders.find(o => (o.id === orderId || o.orderNumber === orderId));
  }
  if (!order && window.FirebaseOrders && Array.isArray(window.FirebaseOrders._cache)) {
    order = window.FirebaseOrders._cache.find(o => (o.id === orderId || o.orderNumber === orderId));
  }
  if (!order) {
    order = { id: orderId, lifecycleStage: 'lead' };
  }

  const currentStage = window.inferOrderStage(order);
  const currentIndex = window.ORDER_STATUS_STAGES.findIndex(s => s.id === currentStage.id);
  const nextIndex = (currentIndex + 1) % window.ORDER_STATUS_STAGES.length;
  const nextStage = window.ORDER_STATUS_STAGES[nextIndex];

  order.lifecycleStage = nextStage.id;
  order.status = nextStage.label;
  order.st = [nextStage.label, nextStage.pillClass];

  if (window.FirebaseOrders && typeof window.FirebaseOrders.update === 'function' && order.id) {
    try {
      window.FirebaseOrders.update(order.id, {
        lifecycleStage: nextStage.id,
        status: nextStage.label,
        st: [nextStage.label, nextStage.pillClass]
      });
    } catch(err) {
      console.warn('Firebase order update caught:', err);
    }
  }

  const btn = document.getElementById(`statusCycleBtn_${orderId}`);
  if (btn) {
    btn.className = `order-cycle-btn ${nextStage.badgeClass}`;
    btn.innerHTML = `<span class="cycle-dot"></span><span>${nextStage.label}</span><span class="cycle-arrow">↻</span>`;
    btn.style.transform = 'scale(1.15)';
    setTimeout(() => { if (btn) btn.style.transform = 'scale(1)'; }, 180);
  }

  const stepperContainer = document.getElementById(`drawerStepper_${orderId}`);
  if (stepperContainer) {
    stepperContainer.innerHTML = window.renderLifecycleStepperHtml(orderId, nextStage.id);
  }

  if (typeof toast === 'function') {
    toast(`Order ${order.orderNumber || order.id} status cycled ➔ ${nextStage.label}`);
  }
};

window.setOrderExplicitStage = function(orderId, stageId, evt) {
  if (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }
  const targetStage = window.ORDER_STATUS_STAGES.find(s => s.id === stageId) || window.ORDER_STATUS_STAGES[0];
  let order = null;
  if (Array.isArray(dOrders)) {
    order = dOrders.find(o => (o.id === orderId || o.orderNumber === orderId));
  }
  if (!order && window.FirebaseOrders && Array.isArray(window.FirebaseOrders._cache)) {
    order = window.FirebaseOrders._cache.find(o => (o.id === orderId || o.orderNumber === orderId));
  }
  if (order) {
    order.lifecycleStage = targetStage.id;
    order.status = targetStage.label;
    order.st = [targetStage.label, targetStage.pillClass];
    if (window.FirebaseOrders && typeof window.FirebaseOrders.update === 'function' && order.id) {
      window.FirebaseOrders.update(order.id, {
        lifecycleStage: targetStage.id,
        status: targetStage.label,
        st: [targetStage.label, targetStage.pillClass]
      });
    }
  }

  const btn = document.getElementById(`statusCycleBtn_${orderId}`);
  if (btn) {
    btn.className = `order-cycle-btn ${targetStage.badgeClass}`;
    btn.innerHTML = `<span class="cycle-dot"></span><span>${targetStage.label}</span><span class="cycle-arrow">↻</span>`;
  }

  const stepperContainer = document.getElementById(`drawerStepper_${orderId}`);
  if (stepperContainer) {
    stepperContainer.innerHTML = window.renderLifecycleStepperHtml(orderId, targetStage.id);
  }

  if (typeof toast === 'function') {
    toast(`Order status set to ${targetStage.label}`);
  }

  // Live update drawer content if it exists
  const drawer = document.getElementById(`orderDrawer_${orderId}`);
  if (drawer && typeof window.renderOrderExpandDrawerHtml === 'function') {
    const isHidden = drawer.style.display === 'none' || drawer.classList.contains('hidden');
    drawer.innerHTML = window.renderOrderExpandDrawerHtml(order || { id: orderId, lifecycleStage: targetStage.id }, orderId, targetStage);
    if (isHidden) {
      drawer.style.display = 'none';
      drawer.classList.add('hidden');
    } else {
      drawer.style.display = 'block';
      drawer.classList.remove('hidden');
    }
  }
};

window.copyAwbTracking = function(awb, evt) {
  if (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(awb).then(() => {
      if (typeof toast === 'function') toast(`📋 Copied Airway Bill: ${awb}`);
    }).catch(() => {
      if (typeof toast === 'function') toast(`Airway Bill: ${awb}`);
    });
  } else {
    if (typeof toast === 'function') toast(`Airway Bill: ${awb}`);
  }
};

window.toggleOrderExpand = function(orderId, evt) {
  if (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }
  const drawer = document.getElementById(`orderDrawer_${orderId}`);
  const btn = document.getElementById(`expandBtn_${orderId}`);
  const row = document.getElementById(`orderStrip_${orderId}`);

  if (!drawer) return;
  const isHidden = drawer.style.display === 'none' || drawer.classList.contains('hidden');
  if (isHidden) {
    drawer.style.display = 'block';
    drawer.classList.remove('hidden');
    if (btn) btn.classList.add('expanded');
    if (row) row.classList.add('is-expanded-row');
  } else {
    drawer.style.display = 'none';
    drawer.classList.add('hidden');
    if (btn) btn.classList.remove('expanded');
    if (row) row.classList.remove('is-expanded-row');
  }
};

window.toggleEditOrderNotes = function(orderId, evt) {
  if (evt) { evt.preventDefault(); evt.stopPropagation(); }
  const display = document.getElementById(`notesDisplay_${orderId}`);
  const form = document.getElementById(`notesEditForm_${orderId}`);
  if (!display || !form) return;
  const isEditing = form.style.display !== 'none';
  if (isEditing) {
    form.style.display = 'none';
    display.style.display = 'block';
  } else {
    form.style.display = 'block';
    display.style.display = 'none';
    const input = document.getElementById(`notesInput_${orderId}`);
    if (input) input.focus();
  }
};

window.saveOrderNotes = async function(orderId, evt) {
  if (evt) { evt.preventDefault(); evt.stopPropagation(); }
  const input = document.getElementById(`notesInput_${orderId}`);
  if (!input) return;
  const newNotes = input.value.trim();
  const textEl = document.getElementById(`notesText_${orderId}`);
  if (textEl) textEl.textContent = `"${newNotes}"`;

  // Update in local cache
  if (window._lastOrdersCache && Array.isArray(window._lastOrdersCache)) {
    const o = window._lastOrdersCache.find(x => x.id === orderId || x.orderNumber === orderId);
    if (o) {
      o.customerNotes = newNotes;
      o.notes = newNotes;
    }
  }

  // Update in Firestore if OrdersService available
  try {
    if (window.OrdersService && typeof window.OrdersService.update === 'function') {
      await window.OrdersService.update(orderId, { customerNotes: newNotes, notes: newNotes });
    }
    if (typeof toast === 'function') toast('✓ Customer directives updated');
  } catch (err) {
    console.warn('OrdersService.update notes error:', err);
    if (typeof toast === 'function') toast('✓ Directives saved locally');
  }

  window.toggleEditOrderNotes(orderId, evt);
};

window.handleOrderStripClick = function(orderId, evt) {
  // If clicking on buttons/inputs that have their own dedicated action, do not trigger window
  if (evt && (
    evt.target.closest('.order-cycle-btn') || 
    evt.target.closest('.order-act-btn') || 
    evt.target.closest('.order-expand-toggle-btn') ||
    evt.target.closest('.btn') || 
    evt.target.closest('.item-select-checkbox') || 
    evt.target.closest('.order-item-cb') || 
    evt.target.closest('input') ||
    evt.target.closest('select') ||
    evt.target.closest('textarea') ||
    evt.target.closest('.order-quick-actions')
  )) {
    return;
  }
  // Upon clicking the bar view, open the popup window with advance order edit & fulfillment option with note
  if (typeof window.openOrderDetail === 'function') {
    window.openOrderDetail(orderId);
  } else {
    window.toggleOrderExpand(orderId, evt);
  }
};

window.selectOrderRow = function(orderId, evt) {
  // Seamlessly toggle expansion in-place without navigating away
  window.toggleOrderExpand(orderId, evt);
};

window.renderOrderExpandDrawerHtml = function(order, oid, stage) {
  const buyerName = (order.customerSnapshot && order.customerSnapshot.name) || order.customerName || 'Direct Wholesale Buyer';
  const companyName = (order.customerSnapshot && order.customerSnapshot.companyName) || buyerName;
  const address = (order.customerSnapshot && order.customerSnapshot.address) || window.extractLocationSnippet(order) || 'Amsterdam, Netherlands';
  const phone = (order.customerSnapshot && order.customerSnapshot.phone) || order.phone || '+31 20 555 0192';
  const email = (order.customerSnapshot && order.customerSnapshot.email) || order.email || 'procurement@wholesale-direct.com';
  const location = window.extractLocationSnippet(order);
  const totalVal = order.total != null ? order.total : (order.subtotal || 45000);
  const totalFmt = '৳' + Number(totalVal).toLocaleString();
  const depositVal = Math.round(totalVal * 0.5);
  const depositFmt = '৳' + Number(depositVal).toLocaleString();
  const orderNum = order.orderNumber || order.id || oid;

  // 1. Customer Notes:
  const rawNotes = order.customerNotes || order.notes || order.specialInstructions || order.memo || '';
  const customerNotes = rawNotes.trim() 
    ? rawNotes 
    : `Custom buyer directive: Verify double-stitched perimeter seams and debossed foil branding before export dispatch. Ship in moisture-barrier master packaging with anti-humidity silica packets.`;

  // 2. Production Timeline Milestones:
  const createdDate = order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)) : new Date();
  const createdDateStr = isNaN(createdDate.getTime()) ? 'Recent' : createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isPaid = stage.id === '50_paid' || stage.id === 'jit_cutting' || stage.id === 'shipped';
  const isJit = stage.id === 'jit_cutting' || stage.id === 'shipped';
  const isShipped = stage.id === 'shipped';

  // 3. Logistics History:
  const carrier = order.carrier || order.courier || (isShipped ? 'DHL Express Worldwide' : 'BayXBengal Cargo Line');
  const trackingNo = order.trackingNumber || order.waybillNumber || ('AWB-BD-' + String(orderNum).replace(/[^0-9]/g, '').padStart(6, '0').slice(-6) + '-EXP');
  const customsBondRef = order.customsBondRef || ('CBW-BD-' + String(orderNum).replace(/[^0-9]/g, '').padStart(5, '0').slice(-5));

  return `
    <!-- Interactive Stepper Track -->
    <div id="drawerStepper_${oid}">
      ${window.renderLifecycleStepperHtml ? window.renderLifecycleStepperHtml(oid, stage.id) : ''}
    </div>

    <!-- 3-Column Detailed Section: Customer Notes | Production Timeline | Logistics History -->
    <div class="order-detail-grid">
      <!-- 1. Customer Notes & Fulfillment -->
      <div class="order-detail-card">
        <div class="order-detail-card-header">
          <span class="order-card-title">📝 Customer Notes &amp; Fulfillment</span>
          <span class="order-card-badge badge-amber">Directives</span>
        </div>

        <div class="order-notes-box" id="notesBox_${oid}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div style="font-size:9.5px;font-family:var(--mono);color:#FB923C;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:4px;">
              <span>★</span> Special Handling Instructions
            </div>
            <button type="button" class="btn btn-xs btn-dark" onclick="window.toggleEditOrderNotes('${oid}', event)" style="font-size:9.5px;padding:2px 7px;height:20px;color:var(--gold-dim);border-color:rgba(212,175,55,0.3);">
              ✏️ Edit
            </button>
          </div>
          <div id="notesDisplay_${oid}">
            <div style="font-style:italic;" id="notesText_${oid}">"${customerNotes}"</div>
          </div>
          <div id="notesEditForm_${oid}" style="display:none;margin-top:6px;">
            <textarea id="notesInput_${oid}" rows="3" style="width:100%;font-size:11px;background:#0d0d0c;border:1px solid var(--wire);color:var(--ink);padding:6px;border-radius:4px;font-family:inherit;box-sizing:border-box;">${customerNotes}</textarea>
            <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:4px;">
              <button type="button" class="btn btn-xs btn-dark" onclick="window.toggleEditOrderNotes('${oid}', event)" style="font-size:10px;padding:2px 8px;height:22px;">Cancel</button>
              <button type="button" class="btn btn-xs btn-gold" onclick="window.saveOrderNotes('${oid}', event)" style="font-size:10px;padding:2px 10px;height:22px;font-weight:700;">Save Directives</button>
            </div>
          </div>
        </div>

        <div class="order-notes-meta">
          <div class="order-notes-meta-row">
            <span class="order-notes-meta-label">Consignee:</span>
            <span style="font-weight:700;color:#F8FAFC;">${buyerName}</span>
          </div>
          ${companyName !== buyerName ? `
            <div class="order-notes-meta-row">
              <span class="order-notes-meta-label">Company:</span>
              <span style="color:#CBD5E1;">${companyName}</span>
            </div>
          ` : ''}
          <div class="order-notes-meta-row">
            <span class="order-notes-meta-label">Destination:</span>
            <span style="color:#CBD5E1;text-align:right;">📍 ${address}</span>
          </div>
          <div class="order-notes-meta-row">
            <span class="order-notes-meta-label">Direct Contact:</span>
            <span style="font-family:var(--mono);color:#38BDF8;">📞 ${phone}</span>
          </div>
          <div class="order-notes-meta-row">
            <span class="order-notes-meta-label">Commercial PO:</span>
            <span style="font-family:var(--mono);color:#94A3B8;">PO-${String(orderNum).replace(/[^0-9]/g, '').slice(0, 6) || '84920'}</span>
          </div>
        </div>
      </div>

      <!-- 2. Production Timeline -->
      <div class="order-detail-card">
        <div class="order-detail-card-header">
          <span class="order-card-title">⚡ Production Timeline</span>
          <span class="order-card-badge ${isShipped ? 'badge-green' : (isJit ? 'badge-amber' : 'badge-blue')}">
            ${isShipped ? 'QC Certified' : (isJit ? 'Assembly Floor' : (isPaid ? 'Deposit Verified' : 'Commercial Review'))}
          </span>
        </div>

        <div class="order-timeline-list">
          <div class="order-timeline-node completed">
            <div class="order-node-top">
              <span class="order-node-title">1. Deposit &amp; PO Acceptance</span>
              <span class="order-node-time">${createdDateStr}</span>
            </div>
            <div class="order-node-desc">50% Escrow deposit cleared. Tech-pack specs locked.</div>
          </div>

          <div class="order-timeline-node ${isPaid ? 'completed' : 'pending'}">
            <div class="order-node-top">
              <span class="order-node-title">2. Raw Material Allocation</span>
              <span class="order-node-time">${isPaid ? 'Day +1' : 'Queued'}</span>
            </div>
            <div class="order-node-desc">${isPaid ? 'Full-grain leather batch &amp; custom fittings verified.' : 'Waiting for floor material staging.'}</div>
          </div>

          <div class="order-timeline-node ${isJit ? (isShipped ? 'completed' : 'active') : 'pending'}">
            <div class="order-node-top">
              <span class="order-node-title">3. JIT Cutting &amp; Assembly</span>
              <span class="order-node-time">${isJit ? (isShipped ? 'Passed' : 'Active Now') : 'Queued'}</span>
            </div>
            <div class="order-node-desc">${isJit ? 'Automated CNC pattern cutting &amp; saddle-stitching bench assembly.' : 'Awaiting production line release.'}</div>
          </div>

          <div class="order-timeline-node ${isShipped ? 'completed' : 'pending'}">
            <div class="order-node-top">
              <span class="order-node-title">4. Quality Audit &amp; Export Box</span>
              <span class="order-node-time">${isShipped ? 'Day +5' : 'Scheduled'}</span>
            </div>
            <div class="order-node-desc">${isShipped ? '100% QA tolerance pass. Master packing completed.' : 'Scheduled post-bench assembly.'}</div>
          </div>
        </div>
      </div>

      <!-- 3. Logistics History -->
      <div class="order-detail-card">
        <div class="order-detail-card-header">
          <span class="order-card-title">🚚 Logistics History</span>
          <span class="order-card-badge ${isShipped ? 'badge-green' : 'badge-amber'}">
            ${isShipped ? 'Air Dispatched' : 'Bond Warehouse'}
          </span>
        </div>

        <div class="order-logistics-box">
          <div class="logistics-tracking-pill">
            <div>
              <span style="color:#94A3B8;font-size:9.5px;display:block;">AIRWAY BILL (AWB)</span>
              <strong>${trackingNo}</strong>
            </div>
            <button type="button" onclick="window.copyAwbTracking('${trackingNo}', event)" title="Copy Waybill Number">Copy AWB</button>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;padding:2px 0;">
            <span style="color:#94A3B8;">Carrier / Courier:</span>
            <span style="font-weight:700;color:#E2E8F0;">${carrier}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;padding:2px 0;">
            <span style="color:#94A3B8;">Customs Bond:</span>
            <span style="font-family:var(--mono);color:#10B981;">✓ ${customsBondRef}</span>
          </div>

          <div class="logistics-checkpoint-item">
            <div class="checkpoint-top">
              <span class="checkpoint-title">🛫 Origin Port DAC Cargo Terminal</span>
              <span class="checkpoint-status">${isPaid ? 'Cleared' : 'Staged'}</span>
            </div>
            <div class="checkpoint-desc">Bonded customs export inspection &amp; pallet seal verification.</div>
          </div>

          <div class="logistics-checkpoint-item">
            <div class="checkpoint-top">
              <span class="checkpoint-title">🛬 Destination: ${location}</span>
              <span class="checkpoint-status">${isShipped ? 'In Transit' : 'Scheduled'}</span>
            </div>
            <div class="checkpoint-desc">${isShipped ? 'Air freight flight en-route to international transit terminal.' : 'Flight space booked upon final packaging release.'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Drawer Footer: Financials & In-Place Actions (No Navigation Required) -->
    <div class="order-drawer-footer">
      <div class="order-drawer-financials">
        <div class="order-financial-tag">
          Order Total: <strong>${totalFmt}</strong>
        </div>
        <div class="order-financial-tag" style="color:#10B981;">
          Escrow Deposit (50%): <strong>${depositFmt}</strong>
        </div>
        <div class="order-financial-tag" style="color:#94A3B8;font-size:10.5px;font-family:var(--mono);">
          Tax: Export Exempt (0% VAT)
        </div>
      </div>

      <div class="order-drawer-actions">
        <button class="btn btn-xs btn-gold" onclick="window.openOrderDetail('${oid}')" style="font-size:11px;padding:5px 12px;font-weight:700;" title="Open Advance Edit &amp; Fulfillment Window">
          ⚡ Advance Edit &amp; Fulfillment
        </button>
        <button class="btn btn-xs btn-coral" onclick="window.cycleOrderStatus('${oid}', event)" style="font-size:11px;padding:5px 12px;font-weight:700;" title="Advance production lifecycle stage in-place">
          Advance Stage ↻
        </button>
        <button class="btn btn-xs btn-dark" onclick="window.openQuickOrderPrint('${oid}', event)" style="font-size:11px;padding:5px 12px;" title="Print Dispatch Waybill">
          Print Waybill 🖨️
        </button>
        <button class="btn btn-xs btn-dark" onclick="window.toggleOrderExpand('${oid}', event)" style="font-size:11px;padding:5px 10px;color:#94A3B8;" title="Collapse Detailed View">
          ▲ Collapse
        </button>
      </div>
    </div>
  `;
};

window.renderHighDensityOrderRow = function(order, isSelected) {
  const oid = order.id || order.orderNumber || ('NX-' + Math.random().toString(36).slice(2, 6));
  const orderNum = order.orderNumber || order.id || 'NX-ORDER';
  const stage = window.inferOrderStage(order);
  const location = window.extractLocationSnippet(order);
  const buyerName = (order.customerSnapshot && order.customerSnapshot.name) || order.customerName || 'Direct Wholesale Buyer';
  const totalVal = order.total != null ? order.total : (order.subtotal || 45000);
  const totalFmt = '৳' + Number(totalVal).toLocaleString();
  const itemsText = order.lineItems && order.lineItems.length 
    ? order.lineItems.map(i => `${i.title} (${i.quantity}x)`).join(', ')
    : (order.t || 'Standard Export Order Items');

  return `
    <div class="orow-strip ${isSelected ? 'is-selected' : ''}" 
         id="orderStrip_${oid}" 
         onclick="window.handleOrderStripClick('${oid}', event)">
      <!-- Expand chevron -->
      <button class="order-expand-toggle-btn" 
              id="expandBtn_${oid}" 
              onclick="window.toggleOrderExpand('${oid}', event)" 
              title="Toggle Detailed View (Customer Notes, Timeline, Logistics)">
        <svg class="chev-icon" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>

      <!-- Inline Status Cycling Badge -->
      <button class="order-cycle-btn ${stage.badgeClass}" 
              id="statusCycleBtn_${oid}" 
              onclick="window.cycleOrderStatus('${oid}', event)" 
              title="Click to cycle: Lead ➔ 50% Paid ➔ JIT Cutting ➔ Shipped">
        <span class="cycle-dot"></span>
        <span>${stage.label}</span>
        <span class="cycle-arrow">↻</span>
      </button>

      <!-- Buyer & Location Snippet -->
      <div class="order-buyer-cell">
        <span class="buyer-name" title="${buyerName}">${buyerName}</span>
        <span class="location-chip" title="Buyer Delivery Destination">📍 ${location}</span>
      </div>

      <!-- Line items preview (hidden on narrow screens) -->
      <div class="order-items-snippet" title="${itemsText}">${itemsText}</div>

      <!-- Total Amount -->
      <div class="order-total-cell">${totalFmt}</div>

      <!-- Quick Actions -->
      <div class="order-quick-actions" onclick="event.stopPropagation()">
        <button class="btn btn-xs btn-gold" style="font-size:9.5px;padding:2px 7px;font-weight:700;height:24px;display:inline-flex;align-items:center;gap:3px;" onclick="window.openOrderDetail('${oid}')" title="Open Advance Edit &amp; Fulfillment Window">
          ⚡ <span class="order-act-label">Edit</span>
        </button>
        <button class="order-act-btn" onclick="window.toggleOrderExpand('${oid}', event)" title="Toggle Detailed View (Customer Notes, Timeline, Logistics)">👁️</button>
        <button class="order-act-btn" onclick="window.openQuickOrderPrint('${oid}', event)" title="Print Dispatch Waybill">🖨️</button>
      </div>
    </div>

    <!-- Expandable Deep Accordion Drawer -->
    <div class="order-expand-drawer hidden" id="orderDrawer_${oid}" style="display:none;">
      ${window.renderOrderExpandDrawerHtml(order, oid, stage)}
    </div>
  `;
};

window.openQuickOrderPrint = function(orderId, evt) {
  if (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }
  let order = null;
  if (Array.isArray(dOrders)) {
    order = dOrders.find(o => (o.id === orderId || o.orderNumber === orderId));
  }
  if (!order && window.FirebaseOrders && Array.isArray(window.FirebaseOrders._cache)) {
    order = window.FirebaseOrders._cache.find(o => (o.id === orderId || o.orderNumber === orderId));
  }
  const orderNum = (order && order.orderNumber) || orderId;
  openSheet(`
    <div style="padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;font-size:16px;color:#F8FAFC;">Print Dispatch Waybill · ${orderNum}</h3>
        <button class="btn btn-xs btn-dark" onclick="closeSheet()">✕</button>
      </div>
      <div style="background:#000;border:1px solid rgba(255,255,255,0.15);padding:14px;border-radius:8px;font-family:var(--mono);font-size:11px;color:#E2E8F0;line-height:1.6;">
        <div>BAYXBENGAL LOGISTICS · AIRWAY BILL</div>
        <div>CONSIGNEE: ${(order && order.customerName) || 'International Buyer'}</div>
        <div>DESTINATION: ${window.extractLocationSnippet(order)}</div>
        <div>MANIFEST: ${(order && order.t) || 'Custom Leather Goods'}</div>
        <div>STATUS: ${order ? window.inferOrderStage(order).label : 'PROCESSING'}</div>
      </div>
      <button class="btn btn-coral" style="width:100%;margin-top:14px;" onclick="window.print();">Confirm &amp; Print Waybill</button>
    </div>
  `);
};

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
  return o.map(d=>window.renderHighDensityOrderRow(d, false)).join("");
}


/* ── Search ── */
function openSearch() { openSheet(`<h3>Search</h3><div style="padding:0 20px;"><div class="field" style="margin-top:8px;"><input placeholder="Orders, products, buyers…" autofocus/></div></div>`); }
function openAiChat(initialQuery) {
  openAppModule('NexAI');
  if (initialQuery && typeof initialQuery === 'string' && initialQuery.trim()) {
    setTimeout(() => {
      const inp = document.getElementById('aiInput');
      if (inp) {
        inp.value = initialQuery.trim();
        if (typeof window.sendAiMsg === 'function') window.sendAiMsg();
      }
    }, 150);
  }
}
function openQuickSale(prefill = {}) {
  const pCustName = prefill.customerName || prefill.name || "";
  const pCustPhone = prefill.customerPhone || prefill.phone || "";
  const pCustEmail = prefill.customerEmail || prefill.email || "";
  const pCustId = prefill.customerId || prefill.id || "";
  const pItemTitle = prefill.title || prefill.item || (prefill.lineItems?.[0]?.title || "");
  const pPrice = prefill.price || (prefill.lineItems?.[0]?.price || "");
  const pQty = prefill.quantity || (prefill.lineItems?.[0]?.quantity || 1);
  const pSku = prefill.sku || (prefill.lineItems?.[0]?.sku || "HH-ITEM");

  openSheet(`
    <div style="padding:0 20px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:700;letter-spacing:1px;text-transform:uppercase;">
            ATOMIC POS TRANSACTION · H&amp;H NEXUS
          </div>
          <h3 style="margin:2px 0 0;font-size:18px;">⚡ Quick Sale POS</h3>
        </div>
        <span class="pill gold" style="font-size:8.5px;">LIVE ATTRIBUTION</span>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <!-- Customer Details -->
        <div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:10px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;">1. Buyer / Attributed Account</div>
          <input type="hidden" id="qs_cust_id" value="${pCustId}"/>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="field" style="margin:0;"><label>Buyer / Company *</label><input id="qs_cust_name" value="${pCustName}" placeholder="e.g. Tariqul Islam"/></div>
            <div class="field" style="margin:0;"><label>Phone (BD Mobile) *</label><input id="qs_cust_phone" value="${pCustPhone}" placeholder="017... or +8801..."/></div>
          </div>
          <div class="field" style="margin:0;"><label>Email (Optional for Invoice)</label><input id="qs_cust_email" value="${pCustEmail}" placeholder="buyer@example.com"/></div>
        </div>

        <!-- Product Line Item -->
        <div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:10px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;">2. Product &amp; Pricing</div>
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">
            <div class="field" style="margin:0;"><label>Product Title / Description *</label><input id="qs_item_title" value="${pItemTitle}" placeholder="Handcrafted Leather Asset…"/></div>
            <div class="field" style="margin:0;"><label>SKU</label><input id="qs_item_sku" value="${pSku}" placeholder="HH-SKU"/></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <div class="field" style="margin:0;"><label>Qty</label><input id="qs_qty" type="number" min="1" value="${pQty}" oninput="window.updateQsTotal()"/></div>
            <div class="field" style="margin:0;"><label>Unit Price (৳)</label><input id="qs_unit_price" type="number" value="${pPrice}" placeholder="0" oninput="window.updateQsTotal()"/></div>
            <div class="field" style="margin:0;"><label>Total (৳)</label><input id="qs_total_display" readonly style="background:var(--bg-3);color:var(--gold);font-weight:700;font-family:var(--mono);" value="৳0"/></div>
          </div>
        </div>

        <!-- Channel, Payment & Campaign -->
        <div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:10px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;">3. Channel, Payment &amp; Promo</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="field" style="margin:0;">
              <label>Sales Channel</label>
              <select id="qs_channel" style="width:100%;height:36px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);border-radius:6px;padding:0 8px;">
                <option value="WhatsApp Direct">📲 WhatsApp Direct</option>
                <option value="Phone Order">📞 Phone Order</option>
                <option value="Showroom Walk-in">🏬 Showroom Walk-in</option>
                <option value="BASE Japan">🇯🇵 BASE Japan (Arutemika)</option>
                <option value="Export B2B">🇪🇺 Export B2B Portal</option>
              </select>
            </div>
            <div class="field" style="margin:0;">
              <label>Payment Method</label>
              <select id="qs_payment" style="width:100%;height:36px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);border-radius:6px;padding:0 8px;">
                <option value="bKash (merchant)">📱 bKash (Merchant)</option>
                <option value="Cash on Delivery">🚚 Cash on Delivery (COD)</option>
                <option value="Nagad">📱 Nagad</option>
                <option value="Bank Transfer">🏦 Bank Transfer</option>
                <option value="Card">💳 Credit / Debit Card</option>
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="field" style="margin:0;"><label>Promo / Campaign Token</label><input id="qs_promo" placeholder="e.g. RAMADAN25"/></div>
            <div class="field" style="margin:0;"><label>Order Note</label><input id="qs_notes" placeholder="Operator counter memo…"/></div>
          </div>
        </div>

        <button class="btn btn-gold" id="btn_commit_qs" onclick="window.submitAtomicQuickSale()" style="height:42px;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;">
          ⚡ Commit POS Order
        </button>
      </div>
    </div>
  `);

  window.updateQsTotal = function() {
    const q = Math.max(1, parseInt(document.getElementById("qs_qty")?.value || "1", 10));
    const p = Math.max(0, parseFloat(document.getElementById("qs_unit_price")?.value || "0"));
    const disp = document.getElementById("qs_total_display");
    if (disp) disp.value = "৳" + (q * p).toLocaleString();
  };
  window.updateQsTotal();
}

window.submitAtomicQuickSale = async function() {
  const btn = document.getElementById("btn_commit_qs");
  const name = document.getElementById("qs_cust_name")?.value.trim();
  const phone = document.getElementById("qs_cust_phone")?.value.trim();
  const email = document.getElementById("qs_cust_email")?.value.trim() || "";
  const customerId = document.getElementById("qs_cust_id")?.value.trim() || undefined;
  const title = document.getElementById("qs_item_title")?.value.trim();
  const sku = document.getElementById("qs_item_sku")?.value.trim() || "HH-ITEM";
  const quantity = Math.max(1, parseInt(document.getElementById("qs_qty")?.value || "1", 10));
  const price = Math.max(0, parseFloat(document.getElementById("qs_unit_price")?.value || "0"));
  const channel = document.getElementById("qs_channel")?.value || "WhatsApp Direct";
  const paymentMethod = document.getElementById("qs_payment")?.value || "Cash on Delivery";
  const promoCode = document.getElementById("qs_promo")?.value.trim() || undefined;
  const notes = document.getElementById("qs_notes")?.value.trim() || "";

  if (!name) { toast("Customer name required"); return; }
  if (!phone) { toast("Customer phone required"); return; }
  if (!title) { toast("Product title required"); return; }
  if (price <= 0) { toast("Valid price required"); return; }

  if (btn) { btn.disabled = true; btn.innerText = "Writing to Spine…"; }

  try {
    const res = await fetch('/api/orders/quick-sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        channel,
        paymentMethod,
        paymentStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        promoCode,
        notes,
        lineItems: [{
          title,
          sku,
          quantity,
          price
        }]
      })
    });

    const data = await res.json();
    if (!data || !data.ok) throw new Error(data?.error || 'Order creation rejected');

    const order = data.order;
    const orderNum = order.orderNumber || order.id;
    const total = order.total || (price * quantity);
    const waText = encodeURIComponent(`*H&H NEXUS ORDER CONFIRMATION*\nOrder: ${orderNum}\nCustomer: ${name}\nItem: ${title} (x${quantity})\nTotal: ৳${total.toLocaleString()}\nStatus: Confirmed & Paid\nThank you for choosing Hands & Head!`);
    const waUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${waText}`;

    openSheet(`
      <div style="padding:0 20px 24px;text-align:center;">
        <div style="width:52px;height:52px;border-radius:50%;background:rgba(16,185,129,0.15);border:1px solid var(--emerald);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:var(--emerald);font-size:24px;">✓</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:1.5px;">ORDER ATOMICALLY COMMITTED</div>
        <h3 style="margin:4px 0 2px;font-size:20px;font-family:var(--mono);">${orderNum}</h3>
        <p style="font-size:12px;color:var(--ink-2);margin:0 0 16px;">
          Consolidated for <b>${name}</b> · Total: <b style="color:var(--gold);">৳${total.toLocaleString()}</b>
          ${order.campaignAttribution ? `<br/><span style="color:var(--emerald);font-size:11px;">Attributed to Campaign: ${order.campaignAttribution.campaignName || order.campaignAttribution.promoCode}</span>` : ''}
        </p>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <a href="${waUrl}" target="_blank" class="btn btn-emerald" style="text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:700;">
            📲 Send WhatsApp Receipt to ${phone}
          </a>
          <button class="btn btn-dark" onclick="window.openOrderInvoice('${order.id}'); closeSheet();" style="font-size:12px;">
            📄 View &amp; Print Official Invoice
          </button>
          <button class="btn btn-sm btn-dark" onclick="closeSheet(); if (window.render?.Orders) window.render.Orders(document.getElementById('mod-Orders'));" style="margin-top:6px;font-size:11px;color:var(--ink-3);">
            Done &amp; Return
          </button>
        </div>
      </div>
    `);

    toast(`Order ${orderNum} Created ✓`);
    if (window.render?.Orders && document.getElementById('mod-Orders')) {
      window.render.Orders(document.getElementById('mod-Orders'));
    }
  } catch (err) {
    alert(`Quick Sale Error: ${err.message}`);
    if (btn) { btn.disabled = false; btn.innerText = "⚡ Commit POS Order"; }
  }
};

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

/* ── Live Dashboard UI Synchronizer ── */
window.updateDashboardLiveElements = function(stats, orders) {
  const s = stats || LS.get("stats") || { salesToday: 0, ordersToday: 0, pending: 0 };
  const o = orders || LS.get("orders") || [];

  const salesEl = document.getElementById("dash_sales_today");
  if (salesEl) salesEl.innerText = `৳${(s.salesToday || 0).toLocaleString()}`;

  const pendingEl = document.getElementById("dash_pending_orders");
  if (pendingEl) pendingEl.innerText = String(s.pending || 0);

  const compEl = document.getElementById("dash_completed_orders");
  if (compEl) compEl.innerText = String(s.ordersToday || 0);

  const accRevEl = document.getElementById("dash_acc_revenue");
  if (accRevEl) accRevEl.innerText = `৳${(s.salesToday || 0).toLocaleString()}`;

  const vcardEl = document.getElementById("dash_vcard_inflow");
  if (vcardEl) vcardEl.innerText = `৳${(s.salesToday || 0).toLocaleString()}`;

  const recentEl = document.getElementById("recentList");
  if (recentEl && Array.isArray(o)) {
    recentEl.innerHTML = ordersListHtml(o.slice(0, 5));
  }
};

/* ═══════════════════════════════════════════════════════════════
   SYNC ENGINE (Continuous Server-Authoritative Cross-Device Heartbeat)
   ═══════════════════════════════════════════════════════════════ */
window.SyncEngine = {
  _lastSignatures: null,
  _timer: null,
  _sse: null,
  _isSyncing: false,
  _pollInterval: 2500,
  _active: true,

  init() {
    this.connectSse();
    this.poll();
    this.bindEvents();
  },

  connectSse() {
    if (typeof window === "undefined") return;
    try {
      if (this._sse) {
        try { this._sse.close(); } catch(e) {}
        this._sse = null;
      }
      // Use direct Firebase SDK onSnapshot listeners instead of dead server route /api/sync/stream
      if (window.Collections) {
        if (window.Collections.orders && typeof window.Collections.orders.onSnapshot === "function") {
          window.Collections.orders.onSnapshot(() => {
            this.syncOrders(true);
          }, (err) => console.debug("[SyncEngine] orders onSnapshot notice:", err?.message));
        }
        if (window.Collections.products && typeof window.Collections.products.onSnapshot === "function") {
          window.Collections.products.onSnapshot(() => {
            this.syncProducts(true);
          }, (err) => console.debug("[SyncEngine] products onSnapshot notice:", err?.message));
        }
        if (window.Collections.customers && typeof window.Collections.customers.onSnapshot === "function") {
          window.Collections.customers.onSnapshot(() => {
            this.syncCustomers(true);
          }, (err) => console.debug("[SyncEngine] customers onSnapshot notice:", err?.message));
        }
      }
    } catch (e) {
      console.debug("[SyncEngine] Direct Firestore listener notice:", e.message);
    }
  },

  bindEvents() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.check();
      }
    });
    window.addEventListener("focus", () => {
      this.check();
    });

    if (window.NexEvents) {
      window.NexEvents.on("ORDERS_CHANGED", () => {
        this.syncOrders(true);
      });
      window.NexEvents.on("ORDER_CREATED", () => {
        this.syncOrders(true);
      });
      window.NexEvents.on("PRODUCTS_CHANGED", () => {
        this.syncProducts(true);
      });
      window.NexEvents.on("CUSTOMERS_CHANGED", () => {
        this.syncCustomers(true);
      });
    }
  },

  async poll() {
    if (this._timer) clearTimeout(this._timer);
    if (this._active && !document.hidden) {
      await this.check();
    }
    this._timer = setTimeout(() => this.poll(), document.hidden ? 10000 : this._pollInterval);
  },

  async check() {
    if (this._isSyncing) return;
    this._isSyncing = true;
    try {
      if (!this._lastSignatures) {
        this._lastSignatures = { initialized: true };
        await Promise.allSettled([
          this.syncOrders(false),
          this.syncProducts(false),
          this.syncCustomers(false)
        ]);
      }
    } catch (e) {
      console.debug("[SyncEngine] Sync check notice:", e.message);
    } finally {
      this._isSyncing = false;
    }
  },

  async syncOrders(forceRerender = false) {
    try {
      const [sf, of2] = await Promise.all([
        spine("getStats"),
        spine("listOrders")
      ]);
      if (sf) LS.set("stats", sf);
      if (of2 && of2.items) LS.set("orders", of2.items);

      const isHome = (!expScreen || expScreen === "dashboard" || expScreen === "Home");
      if (isHome) {
        window.updateDashboardLiveElements(sf, of2?.items || []);
      } else if (expScreen === "Orders" && window.render && window.render.Orders) {
        const modEl = document.getElementById("mod-Orders");
        if (modEl) window.render.Orders(modEl);
      }

      if (mode === "production") {
        const b = document.getElementById("body");
        if (b) renderProductionView(b);
      }

      if (window.NexEvents) {
        window.NexEvents.emit("DATA_SYNC", { type: "orders", count: of2?.items?.length || 0 });
      }
    } catch (e) {
      console.debug("[SyncEngine] Sync orders note:", e.message);
    }
  },

  async syncProducts(forceRerender = false) {
    if (this._syncingProducts) return;
    this._syncingProducts = true;
    try {
      let prods = [];
      if (window.ProductsService) {
        const res = await window.ProductsService.list();
        prods = res?.items || [];
      }
      if (typeof window.refreshHomeProductGallery === "function") {
        window.refreshHomeProductGallery();
      }
      if ((expScreen === "Products" || expScreen === "catalog")) {
        // If smooth in-place updater exists, update without screen blinking or losing input focus
        if (typeof window.updateProductsListInPlace === "function") {
          window.updateProductsListInPlace(prods);
        } else if (forceRerender && window.render && window.render.Products) {
          const modEl = document.getElementById("mod-Products");
          // Only re-render if user is NOT currently focusing on a search/filter input
          const activeTag = document.activeElement ? document.activeElement.tagName : "";
          if (modEl && activeTag !== "INPUT" && activeTag !== "TEXTAREA" && activeTag !== "SELECT") {
            window.render.Products(modEl, { silent: true });
          }
        }
      }
      if (window.DriveSyncMonitor && typeof window.DriveSyncMonitor.refreshCurrentView === "function") {
        window.DriveSyncMonitor.refreshCurrentView();
      }
      if (window.NexEvents) {
        window.NexEvents.emit("DATA_SYNC", { type: "products", count: prods.length });
        // NOTE: Do not re-emit PRODUCTS_CHANGED here to avoid infinite feedback loop
      }
    } catch (e) {
      console.debug("[SyncEngine] Sync products note:", e.message);
    } finally {
      this._syncingProducts = false;
    }
  },

  async syncCustomers(forceRerender = false) {
    try {
      if (window.CustomersService) {
        await window.CustomersService.list();
      }
      if (expScreen === "Customers" && window.render && window.render.Customers) {
        const modEl = document.getElementById("mod-Customers");
        if (modEl) window.render.Customers(modEl);
      }
      if (window.NexEvents) {
        window.NexEvents.emit("DATA_SYNC", { type: "customers" });
      }
    } catch (e) {
      console.debug("[SyncEngine] Sync customers note:", e.message);
    }
  }
};

/* ── Global Exports ── */
window.openGate=openGate; window.closeGate=closeGate; window.tryGate=tryGate;
window.startCamera=startCamera; window.exitExpert=exitExpert; window.exitProduction=exitProduction;
window.openAllOrders=openAllOrders; window.closeSheet=closeSheet; window.render=Object.assign(render, window.render || {});
window.openDrawer=openDrawer; window.closeDrawer=closeDrawer; window.navTo=navTo;
window.openAppModule=openAppModule; window.openAiChat=openAiChat; window.openSearch=openSearch;
window.openQuickSale=openQuickSale; window.ordersListHtml=ordersListHtml; window.dCat=dCat; window.dCompanies=dCompanies;
window.SyncEngine=SyncEngine;

/* ── Boot ── */
if (window.NexTheme && typeof window.NexTheme.init === 'function') {
  window.NexTheme.init();
}
if (mode === "expert" || mode === "production") {
  applyTheme(mode);
}
render();

if (typeof window !== "undefined" && window.syncTopbarUserProfile) {
  window.syncTopbarUserProfile();
}

if (typeof window !== "undefined" && window.NexEvents) {
  window.NexEvents.on(window.NexEvents.EVENTS.AUTH_CHANGED, () => {
    if (window.syncTopbarUserProfile) window.syncTopbarUserProfile();
  });
}

// Initialize Continuous Cross-Device Sync Engine
if (typeof window !== "undefined" && window.SyncEngine) {
  window.SyncEngine.init();
}
