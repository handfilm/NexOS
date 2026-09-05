/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-customers.js
   Customers & Buyer CRM Service — Firestore Powered + Resilient Cache
   ═══════════════════════════════════════════════════════════════ */

window.CustomersService = {
  PAGE_SIZE: 1000,
  _lastDoc: null,
  _memCache: [],
  _initPromise: null,

  _getCollection() {
    return window.Collections?.customers || window.db.collection("customers");
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
          }, err => console.debug("Customers snapshot notice:", err?.message));
        }
      } catch (e) {}
    })();
    return this._initPromise;
  },

  _getDefaultSeedCustomers() {
    if (window.PERMANENT_SEEDED_CUSTOMERS && Array.isArray(window.PERMANENT_SEEDED_CUSTOMERS) && window.PERMANENT_SEEDED_CUSTOMERS.length > 0) {
      return window.PERMANENT_SEEDED_CUSTOMERS;
    }
    return [
      {
        id: "cust-amsterdam",
        name: "Lars Van Der Berg",
        companyName: "Amsterdam Leather Atelier",
        contactPerson: "Lars Van Der Berg",
        email: "procurement@leather-amsterdam.nl",
        phone: "+31 20 555 0192",
        country: "NL",
        flag: "🇳🇱",
        currency: "EUR",
        tags: ["wholesale", "net-30", "europe"],
        moq: 50,
        paymentTerms: "Net 30",
        totalOrders: 4,
        totalSpent: 185000,
        lastOrderAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        addresses: [{ type: "shipping", line1: "Keizersgracht 421", city: "Amsterdam", country: "NL", postalCode: "1016 EK", isDefault: true }],
        notes: [{ text: "Interested in vegetable tanned calfskin leather wallets and bags.", createdAt: new Date().toISOString(), by: "System" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "cust-berlin",
        name: "Hanna Richter",
        companyName: "Berlin Concept Store",
        contactPerson: "Hanna Richter",
        email: "hamburg@nordicfashion.de",
        phone: "+49 30 892 1104",
        country: "DE",
        flag: "🇩🇪",
        currency: "EUR",
        tags: ["boutique", "b2b", "europe"],
        moq: 25,
        paymentTerms: "LC at sight",
        totalOrders: 2,
        totalSpent: 96000,
        lastOrderAt: new Date(Date.now() - 86400000).toISOString(),
        addresses: [{ type: "shipping", line1: "Torstraße 177", city: "Berlin", country: "DE", postalCode: "10115", isDefault: true }],
        notes: [{ text: "High interest in full-grain executive briefcases.", createdAt: new Date().toISOString(), by: "System" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "cust-london",
        name: "Arthur Pendelton",
        companyName: "London Retail Group",
        contactPerson: "Arthur Pendelton",
        email: "orders@londonretail.co.uk",
        phone: "+44 20 7946 0912",
        country: "GB",
        flag: "🇬🇧",
        currency: "GBP",
        tags: ["department-store", "high-volume"],
        moq: 100,
        paymentTerms: "Net 60",
        totalOrders: 8,
        totalSpent: 420000,
        lastOrderAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        addresses: [{ type: "shipping", line1: "18 Oxford Street", city: "London", country: "GB", postalCode: "W1D 1BS", isDefault: true }],
        notes: [{ text: "Prefers DHL air freight express shipments.", createdAt: new Date().toISOString(), by: "System" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  },

  /* ── Query & List Customers with Search & Filtering ── */
  async list({ search = null, country = null, tag = null, sortBy = "updatedAt", sortDir = "desc" } = {}) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    let items = [];
    const col = this._getCollection();

    try {
      let q = col;

      if (country && country !== "all") {
        q = q.where("country", "==", country);
      }

      try {
        q = q.orderBy(sortBy, sortDir);
      } catch (e) {
        console.debug("Customers query order fallback:", e?.message);
      }

      const snap = await q.limit(this.PAGE_SIZE).get();
      if (snap && !snap.empty) {
        items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        this._lastDoc = snap.docs[snap.docs.length - 1] || null;
      }
    } catch (err) {
      console.warn("Firestore customers fetch notice:", err?.message);
    }

    // Auto-seed global Firestore collection if empty on first boot so buyer data persists in cloud across all devices
    if (!items.length && (!country || country === "all") && !search && !tag) {
      if (this._memCache && this._memCache.length) {
        items = [...this._memCache];
      } else {
        const seedCustomers = this._getDefaultSeedCustomers();
        try {
          const batch = window.db.batch();
          seedCustomers.forEach(c => {
            const ref = col.doc(c.id);
            batch.set(ref, c);
          });
          await batch.commit();
          items = seedCustomers;
          this._memCache = [...seedCustomers];
        } catch (seedErr) {
          console.debug("Firestore customer seeding note:", seedErr?.message);
          items = seedCustomers;
          this._memCache = [...seedCustomers];
        }
      }
    } else if (items.length) {
      this._memCache = items;
    } else if (this._memCache && this._memCache.length) {
      items = [...this._memCache];
      if (country && country !== "all") items = items.filter(c => c.country === country);
    }

    // Client-side text search (Company, Name, Email, Phone, Country, Tags)
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      items = items.filter(c =>
        (c.name || "").toLowerCase().includes(s) ||
        (c.companyName || "").toLowerCase().includes(s) ||
        (c.email || "").toLowerCase().includes(s) ||
        (c.phone || "").toLowerCase().includes(s) ||
        (c.country || "").toLowerCase().includes(s) ||
        (c.contactPerson || "").toLowerCase().includes(s) ||
        (c.tags || []).some(t => (t || "").toLowerCase().includes(s))
      );
    }

    if (tag && tag !== "all") {
      items = items.filter(c => (c.tags || []).includes(tag));
    }

    if (sortBy === "totalSpent") {
      items.sort((a, b) => (sortDir === "asc" ? (a.totalSpent || 0) - (b.totalSpent || 0) : (b.totalSpent || 0) - (a.totalSpent || 0)));
    } else if (sortBy === "totalOrders") {
      items.sort((a, b) => (sortDir === "asc" ? (a.totalOrders || 0) - (b.totalOrders || 0) : (b.totalOrders || 0) - (a.totalOrders || 0)));
    } else if (sortBy === "name") {
      items.sort((a, b) => (a.companyName || a.name || "").localeCompare(b.companyName || b.name || ""));
    }

    // Sync cloud backup endpoint in background
    try {
      fetch("/api/customers?limit=100").catch(() => {});
    } catch (e) {}

    return { items, count: items.length };
  },

  /* ── Get All Cached Customers (Synchronous Access) ── */
  getAll() {
    return this._memCache.length ? this._memCache : this._getDefaultSeedCustomers();
  },

  async get(customerId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();

    // 1. Direct Global Firestore Document Fetch
    try {
      const doc = await col.doc(customerId).get();
      if (doc.exists) {
        const data = { id: doc.id, ...doc.data() };
        const idx = this._memCache.findIndex(c => c.id === customerId);
        if (idx !== -1) this._memCache[idx] = data;
        else this._memCache.unshift(data);
        return data;
      }
    } catch (e) {
      console.warn("Firestore get customer notice:", e?.message);
    }

    return this._memCache.find(c => c.id === customerId) || null;
  },

  /* ── Get Customer Details along with their Real Historical Orders ── */
  async getWithOrders(customerId, limit = 20) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const customer = await this.get(customerId);
    if (!customer) return { customer: null, orders: [] };

    let orders = [];
    try {
      const ordersCol = window.Collections?.orders || window.db.collection("orders");
      const ordersSnap = await ordersCol
        .where("customerId", "==", customerId)
        .limit(limit)
        .get();
      orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      orders.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (new Date(a.createdAt || 0)).getTime();
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (new Date(b.createdAt || 0)).getTime();
        return tb - ta;
      });
    } catch (e) {
      console.debug("Orders subquery notice:", e?.message);
      try {
        const allOrders = (await window.OrdersService.list()).items || [];
        orders = allOrders.filter(o => o.customerId === customerId || o.customerSnapshot?.companyName === customer.companyName);
      } catch (err) {}
    }

    return { customer, orders };
  },

  /* ── Create Customer / Buyer Profile ── */
  async create(data) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const flags = {
      NL: "🇳🇱", DE: "🇩🇪", GB: "🇬🇧", ES: "🇪🇸", FR: "🇫🇷",
      IT: "🇮🇹", JP: "🇯🇵", US: "🇺🇸", CA: "🇨🇦", BD: "🇧🇩",
      AE: "🇦🇪", SA: "🇸🇦", AU: "🇦🇺", SG: "🇸🇬"
    };

    const countryCode = (data.country || "NL").toUpperCase();
    const flag = data.flag || flags[countryCode] || "🏢";

    const addresses = Array.isArray(data.addresses) && data.addresses.length ? data.addresses : [{
      type: "shipping",
      line1: data.addressLine1 || data.street || "",
      line2: data.addressLine2 || "",
      city: data.city || "",
      country: countryCode,
      postalCode: data.postalCode || data.zip || "",
      isDefault: true
    }];

    const initialNotes = data.note ? [{
      text: data.note,
      createdAt: new Date().toISOString(),
      by: window.NexAuth?.profile?.name || "Operator"
    }] : [];

    const col = this._getCollection();
    const docRef = data.id ? col.doc(data.id) : col.doc();
    const newId = docRef.id;

    const payload = {
      id: newId,
      name: (data.name || data.contactPerson || data.companyName || "Unnamed Buyer").trim(),
      companyName: (data.companyName || data.name || "Company").trim(),
      email: (data.email || "").trim(),
      phone: (data.phone || "").trim(),
      country: countryCode,
      currency: data.currency || (countryCode === "US" ? "USD" : countryCode === "GB" ? "GBP" : countryCode === "BD" ? "BDT" : "EUR"),
      flag,
      contactPerson: (data.contactPerson || data.name || "").trim(),
      addresses,
      tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === "string" ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : []),
      notes: initialNotes,
      moq: Number(data.moq) || 100,
      paymentTerms: data.paymentTerms || "Net 30",
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      storeId: data.storeId || "default",
      createdAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
    };

    // 1. Strictly persist to global Cloud Firestore collection
    await docRef.set(payload);
    await this._logActivity("customer_created", newId, payload.companyName || payload.name);

    // 2. Server persistence backup for cross-system consistency
    try {
      fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (apiErr) {}

    // Update in-memory cache
    const existingIdx = this._memCache.findIndex(c => c.id === newId);
    if (existingIdx !== -1) {
      this._memCache[existingIdx] = payload;
    } else {
      this._memCache.unshift(payload);
    }

    if (window.NexEvents) {
      window.NexEvents.emit("CUSTOMERS_CHANGED", payload);
      window.NexEvents.emit("DATA_SYNC", { type: "customer_created", customer: payload });
    }

    return newId;
  },

  /* ── Update Customer ── */
  async update(customerId, data) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const patch = { ...data, updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString() };

    if (data.country) {
      const flags = { NL: "🇳🇱", DE: "🇩🇪", GB: "🇬🇧", ES: "🇪🇸", FR: "🇫🇷", IT: "🇮🇹", JP: "🇯🇵", US: "🇺🇸", CA: "🇨🇦", BD: "🇧🇩", AE: "🇦🇪" };
      patch.country = data.country.toUpperCase();
      patch.flag = data.flag || flags[patch.country] || "🏢";
    }

    if (typeof data.tags === "string") {
      patch.tags = data.tags.split(",").map(t => t.trim()).filter(Boolean);
    }

    if (data.addressLine1 || data.city) {
      patch.addresses = [{
        type: "shipping",
        line1: data.addressLine1 || "",
        line2: data.addressLine2 || "",
        city: data.city || "",
        country: patch.country || data.country || "NL",
        postalCode: data.postalCode || "",
        isDefault: true
      }];
    }

    const col = this._getCollection();

    // 1. Strictly update in global Cloud Firestore collection
    await col.doc(customerId).set(patch, { merge: true });
    await this._logActivity("customer_updated", customerId, data.companyName || data.name || "");

    // 2. Server persistence backup
    try {
      fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      }).catch(() => {});
    } catch (apiErr) {}

    // Update in-memory cache
    const idx = this._memCache.findIndex(c => c.id === customerId);
    if (idx !== -1) {
      this._memCache[idx] = { ...this._memCache[idx], ...patch };
    }

    if (window.NexEvents) {
      window.NexEvents.emit("CUSTOMERS_CHANGED", { id: customerId, ...patch });
    }

    return true;
  },

  /* ── Add Note to Customer ── */
  async addNote(customerId, text) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    if (!text || !text.trim()) return;

    const noteObj = {
      text: text.trim(),
      createdAt: new Date().toISOString(),
      by: window.NexAuth?.profile?.name || window.NexAuth?.currentUser?.email || "Operator"
    };

    const col = this._getCollection();
    await col.doc(customerId).update({
      notes: window.FieldValue.arrayUnion(noteObj),
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
    });

    const idx = this._memCache.findIndex(c => c.id === customerId);
    if (idx !== -1) {
      this._memCache[idx].notes = [...(this._memCache[idx].notes || []), noteObj];
    }

    if (window.NexEvents) {
      window.NexEvents.emit("CUSTOMERS_CHANGED", { id: customerId, noteAdded: noteObj });
    }

    return noteObj;
  },

  /* ── Delete Customer ── */
  async delete(customerId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();
    // Strictly delete from global Cloud Firestore collection
    await col.doc(customerId).delete();
    await this._logActivity("customer_deleted", customerId);

    try {
      fetch(`/api/customers/${encodeURIComponent(customerId)}`, { method: "DELETE" }).catch(() => {});
    } catch (e) {}

    this._memCache = this._memCache.filter(c => c.id !== customerId);

    if (window.NexEvents) {
      window.NexEvents.emit("CUSTOMERS_CHANGED", { id: customerId, deleted: true });
    }

    return true;
  },

  /* ── Bump Aggregates on Order Creation ── */
  async _bumpAggregates(customerId, orderTotal, tx = null) {
    try {
      const col = this._getCollection();
      const ref = col.doc(customerId);
      const patch = {
        totalOrders: window.FieldValue.increment(1),
        totalSpent: window.FieldValue.increment(Number(orderTotal) || 0),
        lastOrderAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
        updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
      };
      if (tx) tx.update(ref, patch);
      else await ref.update(patch);
    } catch (e) {}
  },

  async _logActivity(type, customerId, name = "") {
    try {
      const actCol = window.Collections?.activities || window.db.collection("activities");
      await actCol.add({
        type,
        entity: "customer",
        entityId: customerId,
        title: name,
        by: window.NexAuth?.currentUser?.uid || "operator",
        createdAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
      });
    } catch (e) {}
  },

  async seedPermanentData() {
    try {
      if (!window.PERMANENT_SEEDED_CUSTOMERS || !window.PERMANENT_SEEDED_CUSTOMERS.length) return;
      const col = this._getCollection();
      const snap = await col.limit(1).get();
      if (snap.empty) {
        const batch = window.db.batch();
        window.PERMANENT_SEEDED_CUSTOMERS.forEach(c => {
          const ref = col.doc(c.id);
          batch.set(ref, c);
        });
        await batch.commit();
        this._memCache = [...window.PERMANENT_SEEDED_CUSTOMERS];
        console.log(`[CustomersService] Seeded ${window.PERMANENT_SEEDED_CUSTOMERS.length} records into Firestore.`);
      }
    } catch (e) {
      console.debug("Seed permanent customer data note:", e?.message);
    }
  }
};

if (typeof window !== "undefined") {
  setTimeout(() => {
    if (window.CustomersService && typeof window.CustomersService.seedPermanentData === "function") {
      window.CustomersService.seedPermanentData();
    }
    if (window.CustomersService) {
      window.CustomersService.createCustomer = window.CustomersService.create.bind(window.CustomersService);
      window.CustomersService.updateCustomer = window.CustomersService.update.bind(window.CustomersService);
    }
  }, 50);
}

