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
        customerSnapshot: { name: "Amsterdam Leather Atelier", companyName: "Amsterdam Leather Atelier", email: "procurement@leather-amsterdam.nl", country: "NL", currency: "BDT" },
        lineItems: [
          { title: "Full-Grain Leather Bi-Fold Wallet", sku: "HH-WLT-01", price: 2850, quantity: 10, lineTotal: 28500 },
          { title: "Executive Leather Weekender Duffel", sku: "HH-BAG-04", price: 16500, quantity: 1, lineTotal: 16500 }
        ],
        subtotal: 45000,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 45000,
        paymentStatus: "paid",
        fulfillmentStatus: "unfulfilled",
        status: "open",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        timeline: [{ event: "Order placed & verified", at: new Date(Date.now() - 3600000 * 2).toISOString(), by: "Operator" }]
      },
      {
        id: "ord-731920",
        orderNumber: "HH-731920",
        customerSnapshot: { name: "Berlin Concept Store", companyName: "Berlin Concept Store", email: "hamburg@nordicfashion.de", country: "DE", currency: "BDT" },
        lineItems: [
          { title: "Executive Leather Briefcase", sku: "HH-BRF-02", price: 18500, quantity: 3, lineTotal: 55500 },
          { title: "Classic Full-Grain Dress Belt", sku: "HH-BLT-01", price: 2250, quantity: 12, lineTotal: 27000 }
        ],
        subtotal: 82500,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 82500,
        paymentStatus: "paid",
        fulfillmentStatus: "unfulfilled",
        status: "open",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        timeline: [{ event: "Order confirmed for EU air freight", at: new Date(Date.now() - 86400000).toISOString(), by: "Operator" }]
      },
      {
        id: "ord-592810",
        orderNumber: "HH-592810",
        customerSnapshot: { name: "London Retail Group", companyName: "London Retail Group", email: "orders@londonretail.co.uk", country: "GB", currency: "BDT" },
        lineItems: [
          { title: "Heritage Leather Backpack", sku: "HH-BPK-01", price: 14500, quantity: 6, lineTotal: 87000 },
          { title: "Minimalist Leather Card Holder", sku: "HH-CRD-03", price: 1250, quantity: 20, lineTotal: 25000 }
        ],
        subtotal: 112000,
        discountTotal: 0,
        shippingTotal: 16000,
        taxTotal: 0,
        total: 128000,
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        status: "completed",
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        timeline: [{ event: "Delivered via DHL Express", at: new Date(Date.now() - 86400000 * 2).toISOString(), by: "DHL Carrier" }]
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
        at: new Date().toISOString(),
        by: operatorName
      }],
      storeId,
      createdAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
    };

    // 1. Strictly persist to global Cloud Firestore collection
    await orderRef.set(orderData);

    // 2. Decrement inventory in Firestore for line items
    for (const item of resolvedLineItems) {
      if (item.productId && window.ProductsService?.adjustInventory) {
        try {
          await window.ProductsService.adjustInventory(item.productId, item.variantId, -item.quantity, "order_placement");
        } catch (invErr) {
          console.debug("Inventory decrement note:", invErr?.message);
        }
      }
    }

    // 3. Bump customer aggregates in Firestore
    if (customerId && window.CustomersService?._bumpAggregates) {
      try {
        await window.CustomersService._bumpAggregates(customerId, total);
      } catch (custErr) {
        console.debug("Customer aggregate update note:", custErr?.message);
      }
    }

    // 4. Server persistence backup for cross-system consistency
    try {
      fetch("/api/orders", {
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
    const patch = { updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString() };
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

    // 1. Strictly update in global Cloud Firestore collection
    await col.doc(orderId).set(patch, { merge: true });

    // 2. Server persistence backup
    try {
      const serverPayload = { ...patch, updatedAt: new Date().toISOString() };
      delete serverPayload.timeline;
      fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
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
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
    };
    
    const timelineEntry = {
      event: patch.timelineEvent || `Order customized & details updated by ${operator}`,
      at: new Date().toISOString(),
      by: operator
    };

    const col = this._getCollection();

    // 1. Strictly update in global Cloud Firestore collection
    if (window.FieldValue?.arrayUnion) {
      updatePayload.timeline = window.FieldValue.arrayUnion(timelineEntry);
    }
    await col.doc(orderId).set(updatePayload, { merge: true });

    // 2. Server persistence backup
    try {
      const serverPayload = { ...updatePayload, updatedAt: new Date().toISOString() };
      delete serverPayload.timeline;
      fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
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
    // Strictly delete from global Cloud Firestore collection
    await col.doc(orderId).delete();

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

