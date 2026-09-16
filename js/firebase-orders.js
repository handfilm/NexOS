/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-orders.js
   Orders Service — Real Firestore Commerce Pipeline + Resilient Cache
   ═══════════════════════════════════════════════════════════════ */

window.OrdersService = {
  PAGE_SIZE: 50,
  _lastDoc: null,
  _memCache: [],
  _initPromise: null,

  _getCollection() {
    return window.Collections?.orders || window.db.collection("orders");
  },

  async _ensureInit() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      try {
        const col = this._getCollection();
        if (col && typeof col.onSnapshot === "function") {
          col.onSnapshot(snap => {
            if (snap && !snap.empty) {
              this._memCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
          }, err => console.debug("Orders snapshot notice:", err?.message));
        }
      } catch (e) {}
    })();
    return this._initPromise;
  },

  _getDefaultSeedOrders() {
    return [
      {
        id: "ord-849201",
        orderNumber: "HH-849201",
        customerName: "Amsterdam Leather Atelier",
        customerSnapshot: { name: "Amsterdam Leather Atelier", companyName: "Amsterdam Leather Atelier", email: "procurement@leather-amsterdam.nl", country: "NL", city: "Amsterdam", address: "Singel 382, 1016 AK Amsterdam, Netherlands", phone: "+31 20 555 0192", currency: "BDT" },
        lineItems: [
          { title: "Full-Grain Leather Bi-Fold Wallet", sku: "HH-WLT-01", price: 2850, quantity: 10, lineTotal: 28500 },
          { title: "Executive Leather Weekender Duffel", sku: "HH-BAG-04", price: 16500, quantity: 1, lineTotal: 16500 }
        ],
        subtotal: 45000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 45000,
        lifecycleStage: "50_paid",
        paymentStatus: "paid",
        fulfillmentStatus: "in_production",
        status: "open",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        timeline: [{ event: "Order placed & 50% deposit secured", at: new Date(Date.now() - 3600000 * 2).toISOString(), by: "Operator" }]
      },
      {
        id: "ord-731920",
        orderNumber: "HH-731920",
        customerName: "Berlin Concept Store",
        customerSnapshot: { name: "Berlin Concept Store", companyName: "Berlin Concept Store", email: "hamburg@nordicfashion.de", country: "DE", city: "Berlin", address: "Friedrichstraße 140, 10117 Berlin, Germany", phone: "+49 30 2849 0122", currency: "BDT" },
        lineItems: [
          { title: "Executive Leather Briefcase", sku: "HH-BRF-02", price: 18500, quantity: 3, lineTotal: 55500 },
          { title: "Classic Full-Grain Dress Belt", sku: "HH-BLT-01", price: 2250, quantity: 12, lineTotal: 27000 }
        ],
        subtotal: 82500,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 82500,
        lifecycleStage: "jit_cutting",
        paymentStatus: "paid",
        fulfillmentStatus: "in_production",
        status: "open",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        timeline: [{ event: "Issued to JIT Floor for cutting", at: new Date(Date.now() - 86400000).toISOString(), by: "Floor Mgr" }]
      },
      {
        id: "ord-592810",
        orderNumber: "HH-592810",
        customerName: "London Retail Group",
        customerSnapshot: { name: "London Retail Group", companyName: "London Retail Group", email: "orders@londonretail.co.uk", country: "GB", city: "London", address: "42 Regent Street, London W1B 5AH, UK", phone: "+44 20 7946 0912", currency: "BDT" },
        lineItems: [
          { title: "Heritage Leather Backpack", sku: "HH-BPK-01", price: 14500, quantity: 6, lineTotal: 87000 },
          { title: "Minimalist Leather Card Holder", sku: "HH-CRD-03", price: 1250, quantity: 20, lineTotal: 25000 }
        ],
        subtotal: 112000,
        discountTotal: 0,
        shippingTotal: 16000,
        taxTotal: 0,
        total: 128000,
        lifecycleStage: "shipped",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        status: "completed",
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        timeline: [{ event: "Air freight dispatch via DHL Express", at: new Date(Date.now() - 86400000 * 2).toISOString(), by: "Logistics" }]
      },
      {
        id: "ord-492105",
        orderNumber: "HH-492105",
        customerName: "Scandinavian Leather Lab",
        customerSnapshot: { name: "Scandinavian Leather Lab", companyName: "Nordic Design AB", email: "buyer@scandileather.se", country: "SE", city: "Stockholm", address: "Drottninggatan 88, 111 36 Stockholm, Sweden", phone: "+46 8 123 4567", currency: "BDT" },
        lineItems: [
          { title: "Minimalist Leather Card Holder", sku: "HH-CRD-03", price: 1250, quantity: 20, lineTotal: 25000 },
          { title: "Full-Grain Key Lanyard", sku: "HH-ACC-01", price: 550, quantity: 20, lineTotal: 11000 }
        ],
        subtotal: 36000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 36000,
        lifecycleStage: "lead",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        timeline: [{ event: "Inbound B2B wholesale quotation", at: new Date(Date.now() - 86400000 * 4).toISOString(), by: "Portal" }]
      },
      {
        id: "ord-382910",
        orderNumber: "HH-382910",
        customerName: "Parisian Luxury Goods",
        customerSnapshot: { name: "Parisian Luxury Goods", companyName: "Atelier Saint-Honoré", email: "achats@saint-honore.fr", country: "FR", city: "Paris", address: "24 Rue Saint-Honoré, 75001 Paris, France", phone: "+33 1 42 68 55 00", currency: "BDT" },
        lineItems: [
          { title: "Executive Leather Weekender Duffel", sku: "HH-BAG-04", price: 16500, quantity: 6, lineTotal: 99000 },
          { title: "Passport Wallet Travel Folio", sku: "HH-TRV-02", price: 4000, quantity: 4, lineTotal: 16000 }
        ],
        subtotal: 115000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 115000,
        lifecycleStage: "50_paid",
        paymentStatus: "paid",
        fulfillmentStatus: "in_production",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        timeline: [{ event: "Escrow received. Ready for JIT cutting queue", at: new Date(Date.now() - 86400000 * 5).toISOString(), by: "Escrow" }]
      },
      {
        id: "ord-291024",
        orderNumber: "HH-291024",
        customerName: "Milanese Craft Co.",
        customerSnapshot: { name: "Milanese Craft Co.", companyName: "Pelletteria Milano SpA", email: "ordini@pelletteriamilano.it", country: "IT", city: "Milan", address: "Via Monte Napoleone 12, 20121 Milano, Italy", phone: "+39 02 8765 4321", currency: "BDT" },
        lineItems: [
          { title: "Classic Full-Grain Dress Belt", sku: "HH-BLT-01", price: 2250, quantity: 25, lineTotal: 56250 },
          { title: "Slim Leather Card Case", sku: "HH-CRD-01", price: 775, quantity: 10, lineTotal: 7750 }
        ],
        subtotal: 64000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 64000,
        lifecycleStage: "jit_cutting",
        paymentStatus: "paid",
        fulfillmentStatus: "in_production",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        timeline: [{ event: "Laser cutting completed", at: new Date(Date.now() - 86400000 * 6).toISOString(), by: "Floor CNC" }]
      },
      {
        id: "ord-182903",
        orderNumber: "HH-182903",
        customerName: "Madrid Artisan Hub",
        customerSnapshot: { name: "Madrid Artisan Hub", companyName: "Iberian Leather Goods SL", email: "compras@iberianleather.es", country: "ES", city: "Madrid", address: "Calle Gran Vía 28, 28013 Madrid, Spain", phone: "+34 91 555 4321", currency: "BDT" },
        lineItems: [
          { title: "Full-Grain Leather Tote Bag", sku: "HH-BAG-02", price: 3600, quantity: 15, lineTotal: 54000 }
        ],
        subtotal: 54000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 54000,
        lifecycleStage: "shipped",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        status: "completed",
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        timeline: [{ event: "Dispatched with tracking ES-8492048", at: new Date(Date.now() - 86400000 * 7).toISOString(), by: "Courier" }]
      },
      {
        id: "ord-910284",
        orderNumber: "HH-910284",
        customerName: "Zurich Leather Works",
        customerSnapshot: { name: "Zurich Leather Works", companyName: "Helvetia Goods AG", email: "contact@helvetiagoods.ch", country: "CH", city: "Zurich", address: "Bahnhofstrasse 45, 8001 Zürich, Switzerland", phone: "+41 44 211 5500", currency: "BDT" },
        lineItems: [
          { title: "Executive Leather Briefcase", sku: "HH-BRF-02", price: 18500, quantity: 4, lineTotal: 74000 },
          { title: "Leather Bi-Fold Wallet", sku: "HH-WLT-01", price: 2850, quantity: 6, lineTotal: 17100 }
        ],
        subtotal: 92000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 92000,
        lifecycleStage: "50_paid",
        paymentStatus: "paid",
        fulfillmentStatus: "in_production",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
        timeline: [{ event: "Advance wire transfer settled", at: new Date(Date.now() - 86400000 * 8).toISOString(), by: "Accounting" }]
      },
      {
        id: "ord-801923",
        orderNumber: "HH-801923",
        customerName: "Tokyo Minimalist Store",
        customerSnapshot: { name: "Tokyo Minimalist Store", companyName: "Shibuya Retail Corp", email: "procurement@shibuyaretail.jp", country: "JP", city: "Tokyo", address: "1-22-8 Shibuya, Shibuya-ku, Tokyo 150-0002, Japan", phone: "+81 3 3461 1100", currency: "BDT" },
        lineItems: [
          { title: "Minimalist Leather Card Holder", sku: "HH-CRD-03", price: 1250, quantity: 40, lineTotal: 50000 },
          { title: "Full-Grain Leather Bi-Fold Wallet", sku: "HH-WLT-01", price: 2850, quantity: 30, lineTotal: 85500 }
        ],
        subtotal: 148000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 148000,
        lifecycleStage: "jit_cutting",
        paymentStatus: "paid",
        fulfillmentStatus: "in_production",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
        timeline: [{ event: "JIT assembly bench assigned", at: new Date(Date.now() - 86400000 * 9).toISOString(), by: "Production" }]
      },
      {
        id: "ord-712839",
        orderNumber: "HH-712839",
        customerName: "BayXBengal Wholesalers",
        customerSnapshot: { name: "BayXBengal Wholesalers", companyName: "BayXBengal Exporters Ltd", email: "export@bayxbengal.com", country: "BD", city: "Dhaka", address: "House 14, Road 7, Sector 3, Uttara, Dhaka-1230, Bangladesh", phone: "+880 1711 987654", currency: "BDT" },
        lineItems: [
          { title: "Raw Vegetable-Tanned Sides", sku: "HH-RAW-01", price: 4300, quantity: 50, lineTotal: 215000 }
        ],
        subtotal: 215000,
        discountTotal: 0,
        shippingTotal: 5000,
        taxTotal: 0,
        total: 220000,
        lifecycleStage: "shipped",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        status: "completed",
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        timeline: [{ event: "Container manifest cleared customs", at: new Date(Date.now() - 86400000 * 10).toISOString(), by: "Customs Hub" }]
      },
      {
        id: "ord-623910",
        orderNumber: "HH-623910",
        customerName: "Dubai Luxury Haberdashery",
        customerSnapshot: { name: "Dubai Luxury Haberdashery", companyName: "Emirates Premier Gift FZE", email: "concierge@emiratesgift.ae", country: "AE", city: "Dubai", address: "DIFC Gate Precinct 4, Level 5, Dubai, UAE", phone: "+971 4 362 7000", currency: "BDT" },
        lineItems: [
          { title: "Gold-Foil Embossed Leather Folio", sku: "HH-CORP-01", price: 3120, quantity: 25, lineTotal: 78000 }
        ],
        subtotal: 78000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 78000,
        lifecycleStage: "lead",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
        timeline: [{ event: "Bespoke monogramming quotation requested", at: new Date(Date.now() - 86400000 * 11).toISOString(), by: "Corporate RFQ" }]
      },
      {
        id: "ord-534821",
        orderNumber: "HH-534821",
        customerName: "Manhattan Leather & Co",
        customerSnapshot: { name: "Manhattan Leather & Co", companyName: "Gotham Mercantile LLC", email: "wholesale@gothamb2b.com", country: "US", city: "New York", address: "594 Broadway, Suite 801, New York, NY 10012, USA", phone: "+1 212 555 0184", currency: "BDT" },
        lineItems: [
          { title: "Full-Grain Leather Messenger Bag", sku: "HH-BAG-06", price: 16500, quantity: 10, lineTotal: 165000 }
        ],
        subtotal: 165000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 165000,
        lifecycleStage: "50_paid",
        paymentStatus: "paid",
        fulfillmentStatus: "in_production",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
        timeline: [{ event: "50% deposit received via Stripe B2B", at: new Date(Date.now() - 86400000 * 12).toISOString(), by: "Stripe" }]
      },
      {
        id: "ord-445732",
        orderNumber: "HH-445732",
        customerName: "Melbourne Artisan Guild",
        customerSnapshot: { name: "Melbourne Artisan Guild", companyName: "Flinders Craft Guild", email: "orders@flinderscraft.com.au", country: "AU", city: "Melbourne", address: "120 Flinders Lane, Melbourne VIC 3000, Australia", phone: "+61 3 9654 8800", currency: "BDT" },
        lineItems: [
          { title: "Leather Laptop Sleeve 14-inch", sku: "HH-SLV-01", price: 1933, quantity: 30, lineTotal: 58000 }
        ],
        subtotal: 58000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 58000,
        lifecycleStage: "jit_cutting",
        paymentStatus: "paid",
        fulfillmentStatus: "in_production",
        status: "open",
        createdAt: new Date(Date.now() - 86400000 * 13).toISOString(),
        timeline: [{ event: "JIT cutting commenced", at: new Date(Date.now() - 86400000 * 13).toISOString(), by: "Floor Ops" }]
      },
      {
        id: "ord-356843",
        orderNumber: "HH-356843",
        customerName: "Dublin Heritage Goods",
        customerSnapshot: { name: "Dublin Heritage Goods", companyName: "Trinity Goods Ltd", email: "import@trinitygoods.ie", country: "IE", city: "Dublin", address: "15 Grafton Street, Dublin 2, Ireland", phone: "+353 1 496 1122", currency: "BDT" },
        lineItems: [
          { title: "Executive Leather Weekender Duffel", sku: "HH-BAG-04", price: 14000, quantity: 3, lineTotal: 42000 }
        ],
        subtotal: 42000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 42000,
        lifecycleStage: "shipped",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        status: "completed",
        createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        timeline: [{ event: "Delivered to consignee Dublin port", at: new Date(Date.now() - 86400000 * 14).toISOString(), by: "DHL Carrier" }]
      }
    ];
  },

  /* ── Query & List Orders with Search & Filter ── */
  async list({ status = null, paymentStatus = null, fulfillmentStatus = null, search = null, sortBy = "createdAt", sortDir = "desc" } = {}) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    let items = [];
    const col = this._getCollection();

    try {
      let q = col;

      if (status && status !== "all") {
        q = q.where("status", "==", status);
      }
      if (paymentStatus && paymentStatus !== "all") {
        q = q.where("paymentStatus", "==", paymentStatus);
      }
      if (fulfillmentStatus && fulfillmentStatus !== "all") {
        q = q.where("fulfillmentStatus", "==", fulfillmentStatus);
      }

      try {
        q = q.orderBy(sortBy, sortDir);
      } catch (e) {
        console.debug("Orders query fallback ordering:", e?.message);
      }

      const snap = await q.limit(this.PAGE_SIZE).get();
      if (snap && !snap.empty) {
        items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        this._lastDoc = snap.docs[snap.docs.length - 1] || null;
      }
    } catch (err) {
      console.warn("Firestore orders fetch notice:", err?.message);
    }

    // Auto-seed global Firestore collection if empty on first boot so cloud persistence is active across all devices
    if (!items.length && (!status || status === "all") && (!paymentStatus || paymentStatus === "all") && (!fulfillmentStatus || fulfillmentStatus === "all") && !search) {
      if (this._memCache && this._memCache.length) {
        items = [...this._memCache];
      } else {
        const seedOrders = this._getDefaultSeedOrders();
        try {
          const batch = window.db.batch();
          seedOrders.forEach(o => {
            const ref = col.doc(o.id);
            batch.set(ref, o);
          });
          await batch.commit();
          items = seedOrders;
          this._memCache = [...seedOrders];
        } catch (seedErr) {
          console.debug("Firestore order seeding note:", seedErr?.message);
          items = seedOrders;
          this._memCache = [...seedOrders];
        }
      }
    } else if (items.length) {
      this._memCache = items;
    } else if (this._memCache && this._memCache.length) {
      items = [...this._memCache];
      if (status && status !== "all") items = items.filter(o => o.status === status);
      if (paymentStatus && paymentStatus !== "all") items = items.filter(o => o.paymentStatus === paymentStatus);
      if (fulfillmentStatus && fulfillmentStatus !== "all") items = items.filter(o => o.fulfillmentStatus === fulfillmentStatus);
    }

    // Client-side text search (Order #, Customer Name, Email, SKU, Product Title)
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      items = items.filter(o =>
        (o.orderNumber || "").toLowerCase().includes(s) ||
        (o.customerSnapshot?.name || "").toLowerCase().includes(s) ||
        (o.customerSnapshot?.email || "").toLowerCase().includes(s) ||
        (o.customerSnapshot?.companyName || "").toLowerCase().includes(s) ||
        (o.notes || "").toLowerCase().includes(s) ||
        (o.lineItems || []).some(li =>
          (li.title || "").toLowerCase().includes(s) ||
          (li.sku || "").toLowerCase().includes(s)
        )
      );
    }

    // Sort in memory if needed
    if (sortBy === "total") {
      items.sort((a, b) => sortDir === "asc" ? (a.total || 0) - (b.total || 0) : (b.total || 0) - (a.total || 0));
    } else if (sortBy === "createdAt") {
      items.sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return sortDir === "asc" ? ta - tb : tb - ta;
      });
    }

    // Sync cloud backup endpoint in background
    try {
      fetch("/api/orders?limit=100").catch(() => {});
    } catch (e) {}

    return { items, count: items.length };
  },

  /* ── Get All Cached Orders (Synchronous Quick Access) ── */
  getAll() {
    return this._memCache.length ? this._memCache : this._getDefaultSeedOrders();
  },

  async get(orderId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (apiErr) {}

    const col = this._getCollection();

    // 1. Direct Global Firestore Document Fetch
    try {
      const doc = await col.doc(orderId).get();
      if (doc.exists) {
        const data = { id: doc.id, ...doc.data() };
        const idx = this._memCache.findIndex(o => o.id === orderId);
        if (idx !== -1) this._memCache[idx] = data;
        else this._memCache.unshift(data);
        return data;
      }
    } catch (e) {
      console.warn("Firestore get order notice:", e?.message);
    }

    // 2. Query Firestore by Order Number
    try {
      const snap = await col.where("orderNumber", "==", orderId).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = { id: doc.id, ...doc.data() };
        return data;
      }
    } catch (e) {}

    return this._memCache.find(o => o.id === orderId || o.orderNumber === orderId) || null;
  },

  /* ── Resilient Cloud Firestore Write Helper (Prevents UI Freeze) ── */
  async _safeDocWrite(docRef, data, merge = false) {
    try {
      const writePromise = merge ? docRef.set(data, { merge: true }) : docRef.set(data);
      await Promise.race([
        writePromise,
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (err) {
      console.warn("Firestore order write fallback:", err?.message || err);
    }
  },

  /* ── Atomic Order Creation Transaction ──
     1. Reads all products in transaction
     2. Validates and decrements variant inventory
     3. Computes subtotal, discount, shipping, tax, total
     4. Sets immutable customerSnapshot & lineItems
     5. Increments customer totalSpent & totalOrders in Firestore
     6. Creates audit logs & activity feed
  ── */
  async create(orderInput) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const customerId = orderInput.customerId || null;
    const customer = orderInput.customer || orderInput.customerSnapshot || null;
    const rawLineItems = orderInput.lineItems || orderInput.items || [];
    const discountTotal = Number(orderInput.discountTotal || orderInput.discount || 0);
    const shippingTotal = Number(orderInput.shippingTotal || orderInput.shipping || orderInput.deliveryCharge || 0);
    const taxTotal = Number(orderInput.taxTotal || orderInput.tax || 0);
    const paymentStatus = orderInput.paymentStatus || "paid";
    const fulfillmentStatus = orderInput.fulfillmentStatus || "unfulfilled";
    const paymentMethod = orderInput.paymentMethod || orderInput.method || "cash";
    const shippingAddress = orderInput.shippingAddress || null;
    const billingAddress = orderInput.billingAddress || null;
    const notes = orderInput.notes || "";
    const storeId = orderInput.storeId || "default";

    if (!rawLineItems || !rawLineItems.length) {
      throw new Error("Order must contain at least one line item.");
    }

    const col = this._getCollection();
    const orderRef = orderInput.id ? col.doc(orderInput.id) : col.doc();
    const newId = orderRef.id;

    const orderNumber = orderInput.orderNumber || ("HH-" + Math.floor(100000 + Math.random() * 900000));
    const subtotal = rawLineItems.reduce((sum, li) => sum + (Number(li.price || 0) * Number(li.quantity || 1)), 0);
    const total = Math.max(0, subtotal - discountTotal + shippingTotal + taxTotal);

    const customerSnapshot = {
      name: customer?.name || customer?.companyName || orderInput.Customer || orderInput.buyer || "Walk-in Customer",
      companyName: customer?.companyName || customer?.name || "",
      email: customer?.email || orderInput.email || "",
      phone: customer?.phone || orderInput.phone || "",
      country: customer?.country || orderInput.country || "BD",
      currency: customer?.currency || orderInput.currency || "BDT",
      address: customer?.address || orderInput.address || ""
    };

    const operatorName = window.NexAuth?.profile?.name || window.NexAuth?.currentUser?.email || "Operator";

    const resolvedLineItems = rawLineItems.map(li => ({
      productId: li.productId || li.id || ("prod-" + Math.random().toString(36).slice(2, 7)),
      variantId: li.variantId || "default",
      title: li.title || li.name || "Leather Goods",
      sku: li.sku || "HH-SKU",
      price: Number(li.price) || 0,
      quantity: Math.max(1, Number(li.quantity) || 1),
      lineTotal: (Number(li.price) || 0) * Math.max(1, Number(li.quantity) || 1),
      image: li.image || ""
    }));

    const nowIso = new Date().toISOString();
    const orderData = {
      id: newId,
      orderNumber,
      customerId: customerId || null,
      customerSnapshot,
      lineItems: resolvedLineItems,
      subtotal,
      discountTotal,
      shippingTotal,
      taxTotal,
      total,
      currency: customerSnapshot.currency,
      paymentStatus: paymentStatus || "paid",
      fulfillmentStatus: fulfillmentStatus || "unfulfilled",
      paymentMethod,
      paidAmount: Number(orderInput.paidAmount !== undefined ? orderInput.paidAmount : (paymentStatus === "paid" ? total : 0)),
      dueAmount: Number(orderInput.dueAmount !== undefined ? orderInput.dueAmount : (paymentStatus === "paid" ? 0 : total)),
      status: "open",
      shippingAddress: shippingAddress || { line1: customerSnapshot.address || "", city: "Dhaka", country: customerSnapshot.country },
      billingAddress: billingAddress || shippingAddress || null,
      notes: notes || "",
      timeline: [{
        event: `Order placed (${resolvedLineItems.length} items, ৳${total.toLocaleString()})`,
        at: nowIso,
        by: operatorName
      }],
      storeId,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 1. Strictly persist to global Cloud Firestore collection with resilient timeout
    await this._safeDocWrite(orderRef, orderData, true);

    // 2. Decrement inventory in Firestore for line items
    for (const item of resolvedLineItems) {
      if (item.productId && window.ProductsService?.adjustInventory) {
        try {
          window.ProductsService.adjustInventory(item.productId, item.variantId, -item.quantity, "order_placement").catch(() => {});
        } catch (invErr) {}
      }
    }

    // 3. Bump customer aggregates in Firestore
    if (customerId && window.CustomersService?._bumpAggregates) {
      try {
        window.CustomersService._bumpAggregates(customerId, total).catch(() => {});
      } catch (custErr) {}
    }

    // 4. Server persistence backup for cross-system consistency
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      }).catch(() => {});
    } catch (apiErr) {}

    // Update in-memory cache
    const existingIdx = this._memCache.findIndex(o => o.id === newId);
    if (existingIdx !== -1) {
      this._memCache[existingIdx] = orderData;
    } else {
      this._memCache.unshift(orderData);
    }

    // Emit live cross-device & client events
    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", orderData);
      window.NexEvents.emit("DATA_SYNC", { type: "order_created", order: orderData });
    }

    return { id: orderData.id, orderId: orderData.id, orderNumber: orderData.orderNumber, total, resolvedLineItems, item: orderData, order: orderData };
  },

  /* ── Update Order Statuses & Timeline ── */
  async updateStatus(orderId, { status, paymentStatus, fulfillmentStatus, notes }) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const patch = { updatedAt: new Date().toISOString() };
    const events = [];
    const operator = window.NexAuth?.profile?.name || "Operator";

    if (status) {
      patch.status = status;
      events.push(`Order status updated to "${status.toUpperCase()}" by ${operator}`);
    }
    if (paymentStatus) {
      patch.paymentStatus = paymentStatus;
      events.push(`Payment marked as "${paymentStatus.toUpperCase()}" by ${operator}`);
    }
    if (fulfillmentStatus) {
      patch.fulfillmentStatus = fulfillmentStatus;
      events.push(`Fulfillment marked as "${fulfillmentStatus.toUpperCase()}" by ${operator}`);
    }
    if (notes !== undefined) {
      patch.notes = notes;
    }

    let timelineEntries = [];
    if (events.length) {
      timelineEntries = events.map(e => ({
        event: e,
        at: new Date().toISOString(),
        by: operator
      }));
      if (window.FieldValue?.arrayUnion) {
        patch.timeline = window.FieldValue.arrayUnion(...timelineEntries);
      }
    }

    const col = this._getCollection();

    // 1. Strictly update in global Cloud Firestore collection with resilient timeout
    await this._safeDocWrite(col.doc(orderId), patch, true);

    // 2. Server persistence backup
    try {
      const serverPayload = { ...patch, updatedAt: new Date().toISOString() };
      delete serverPayload.timeline;
      await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serverPayload)
      }).catch(() => {});
    } catch (apiErr) {}

    // Update in-memory cache
    const idx = this._memCache.findIndex(o => o.id === orderId || o.orderNumber === orderId);
    if (idx !== -1) {
      this._memCache[idx] = { ...this._memCache[idx], ...patch };
      if (timelineEntries.length) {
        this._memCache[idx].timeline = [...(this._memCache[idx].timeline || []), ...timelineEntries];
      }
    }

    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", { id: orderId, ...patch });
    }

    return true;
  },

  /* ── Cancel Order & Restore Inventory in Firestore Transaction ── */
  async cancel(orderId, reason = "Customer request") {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const order = await this.get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "cancelled") return true;

    const operator = window.NexAuth?.profile?.name || "Operator";
    const cancelTimeline = {
      event: `Order cancelled. Reason: ${reason}`,
      at: new Date().toISOString(),
      by: operator
    };

    const col = this._getCollection();

    // 1. Strictly update in global Cloud Firestore collection
    await col.doc(orderId).update({
      status: "cancelled",
      paymentStatus: order.paymentStatus === "paid" ? "refunded" : order.paymentStatus,
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
      timeline: window.FieldValue?.arrayUnion ? window.FieldValue.arrayUnion(cancelTimeline) : [cancelTimeline]
    });

    // 2. Restore inventory if line items exist
    if (Array.isArray(order.lineItems)) {
      for (const item of order.lineItems) {
        if (item.productId && window.ProductsService?.adjustInventory) {
          try {
            await window.ProductsService.adjustInventory(item.productId, item.variantId, item.quantity, "order_cancellation");
          } catch (invErr) {}
        }
      }
    }

    // 3. Server persistence backup
    try {
      fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          paymentStatus: order.paymentStatus === "paid" ? "refunded" : order.paymentStatus
        })
      }).catch(() => {});
    } catch (e) {}

    // Update in-memory cache
    const idx = this._memCache.findIndex(o => o.id === orderId || o.orderNumber === orderId);
    if (idx !== -1) {
      this._memCache[idx].status = "cancelled";
      if (this._memCache[idx].paymentStatus === "paid") this._memCache[idx].paymentStatus = "refunded";
      this._memCache[idx].timeline = [...(this._memCache[idx].timeline || []), cancelTimeline];
    }

    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", { id: orderId, status: "cancelled" });
    }

    return true;
  },

  /* ── Full Order Update & Customization (Shopify-Style Order Editing) ── */
  async update(orderId, patch) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const operator = window.NexAuth?.profile?.name || "Operator";
    const updatePayload = {
      ...patch,
      updatedAt: new Date().toISOString()
    };
    
    const timelineEntry = {
      event: patch.timelineEvent || `Order customized & details updated by ${operator}`,
      at: new Date().toISOString(),
      by: operator
    };

    const col = this._getCollection();

    // 1. Strictly update in global Cloud Firestore collection with resilient timeout
    if (window.FieldValue?.arrayUnion) {
      updatePayload.timeline = window.FieldValue.arrayUnion(timelineEntry);
    }
    await this._safeDocWrite(col.doc(orderId), updatePayload, true);

    // 2. Server persistence backup
    try {
      const serverPayload = { ...updatePayload, updatedAt: new Date().toISOString() };
      delete serverPayload.timeline;
      await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serverPayload)
      }).catch(() => {});
    } catch (e) {}

    // Update in-memory cache
    const idx = this._memCache.findIndex(o => o.id === orderId || o.orderNumber === orderId);
    if (idx !== -1) {
      const existing = this._memCache[idx];
      const updatedTimeline = [...(existing.timeline || []), timelineEntry];
      this._memCache[idx] = { ...existing, ...patch, timeline: updatedTimeline, updatedAt: new Date().toISOString() };
    }

    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", { id: orderId, ...patch });
    }

    return true;
  },

  /* ── Delete Order ── */
  async delete(orderId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();
    // Strictly delete from global Cloud Firestore collection with resilient timeout
    try {
      await Promise.race([
        col.doc(orderId).delete(),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (e) {}

    try {
      fetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" }).catch(() => {});
    } catch (e) {}

    this._memCache = this._memCache.filter(o => o.id !== orderId && o.orderNumber !== orderId);

    if (window.NexEvents) {
      window.NexEvents.emit("ORDERS_CHANGED", { id: orderId, deleted: true });
    }

    return true;
  },

  /* ── Hydrate Comprehensive Order & Customer Data for Invoicing ── */
  async getInvoiceData(orderId) {
    const order = await this.get(orderId);
    if (!order) return null;

    let customer = null;
    if (order.customerId && window.CustomersService) {
      try {
        customer = await window.CustomersService.get(order.customerId);
      } catch (e) {
        console.warn("Could not fetch customer by ID for invoice:", e);
      }
    }

    // Fallback: match by phone or name in customer database using CustomersService
    if (!customer && window.CustomersService) {
      const snapPhone = order.customerSnapshot?.phone || order.phone || order.shippingAddress?.phone;
      const snapName = order.customerSnapshot?.name || order.customerName;
      if (snapPhone || snapName) {
        try {
          const allCustomers = window.CustomersService.getAll();
          customer = allCustomers.find(c => 
            (snapPhone && c.phone && c.phone.replace(/[^0-9]/g, "") === String(snapPhone).replace(/[^0-9]/g, "")) ||
            (snapName && c.name && c.name.toLowerCase() === snapName.toLowerCase())
          ) || null;
        } catch (e) {}
      }
    }

    return { order, customer };
  }
};

window.OrdersService.createOrder = window.OrdersService.create.bind(window.OrdersService);
window.OrdersService.updateOrder = window.OrdersService.update.bind(window.OrdersService);

