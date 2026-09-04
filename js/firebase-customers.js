/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-customers.js
   Customers & Buyer CRM Service — Firestore Powered + Resilient Cache
   ═══════════════════════════════════════════════════════════════ */

window.CustomersService = {
  PAGE_SIZE: 1000,
  _lastDoc: null,

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
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    let items = [];

    try {
      let q = window.Collections.customers;

      if (country && country !== "all") {
        q = q.where("country", "==", country);
      }

      try {
        q = q.orderBy(sortBy, sortDir);
      } catch (e) {
        console.warn("Customers query order fallback:", e);
      }

      const snap = await q.limit(this.PAGE_SIZE).get();
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._lastDoc = snap.docs[snap.docs.length - 1] || null;

      if (items.length) {
        try { localStorage.setItem("nx_customers_cache", JSON.stringify(items)); } catch (e) {}
      }
    } catch (err) {
      console.warn("Firestore Customers fetch notice (using cache):", err.message);
      try {
        const cached = JSON.parse(localStorage.getItem("nx_customers_cache") || "[]");
        items = cached.length ? cached : this._getDefaultSeedCustomers();
      } catch (e) {
        items = this._getDefaultSeedCustomers();
      }

      if (country && country !== "all") {
        items = items.filter(c => c.country === country);
      }
    }

    if (!items.length && (!country || country === "all") && !search) {
      items = this._getDefaultSeedCustomers();
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

    return { items, count: items.length };
  },

  async get(customerId) {
    try {
      await window.NexAuth.ensureAuth();
      const doc = await window.Collections.customers.doc(customerId).get();
      if (doc.exists) return { id: doc.id, ...doc.data() };
    } catch (e) {
      console.warn("Firestore get customer fallback:", e);
    }
    const cached = JSON.parse(localStorage.getItem("nx_customers_cache") || "[]");
    const all = cached.length ? cached : this._getDefaultSeedCustomers();
    return all.find(c => c.id === customerId) || null;
  },

  /* ── Get Customer Details along with their Real Historical Orders ── */
  async getWithOrders(customerId, limit = 20) {
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const customer = await this.get(customerId);
    if (!customer) return { customer: null, orders: [] };

    let orders = [];
    try {
      const ordersSnap = await window.Collections.orders
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
      console.warn("Orders subquery note:", e);
      try {
        const allOrders = (await window.OrdersService.list()).items || [];
        orders = allOrders.filter(o => o.customerId === customerId || o.customerSnapshot?.companyName === customer.companyName);
      } catch (err) {}
    }

    return { customer, orders };
  },

  /* ── Create Customer / Buyer Profile ── */
  async create(data) {
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

    const payload = {
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

    let newId = "cust-" + Date.now().toString(36);
    try {
      const ref = await window.Collections.customers.add(payload);
      newId = ref.id;
      await this._logActivity("customer_created", ref.id, payload.companyName || payload.name);
    } catch (e) {
      console.warn("Firestore customer add note (saved locally):", e.message);
    }

    try {
      const cached = JSON.parse(localStorage.getItem("nx_customers_cache") || "[]");
      const localCust = { id: newId, ...payload, createdAt: new Date().toISOString() };
      cached.unshift(localCust);
      localStorage.setItem("nx_customers_cache", JSON.stringify(cached));
    } catch (e) {}

    return newId;
  },

  /* ── Update Customer ── */
  async update(customerId, data) {
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

    try {
      await window.Collections.customers.doc(customerId).set(patch, { merge: true });
      await this._logActivity("customer_updated", customerId, data.companyName || data.name || "");
    } catch (e) {
      console.warn("Firestore customer update fallback:", e.message);
    }

    try {
      const cached = JSON.parse(localStorage.getItem("nx_customers_cache") || "[]");
      const idx = cached.findIndex(c => c.id === customerId);
      if (idx !== -1) {
        cached[idx] = { ...cached[idx], ...patch };
        localStorage.setItem("nx_customers_cache", JSON.stringify(cached));
      }
    } catch (e) {}

    return true;
  },

  /* ── Add Note to Customer ── */
  async addNote(customerId, text) {
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    if (!text || !text.trim()) return;

    const noteObj = {
      text: text.trim(),
      createdAt: new Date().toISOString(),
      by: window.NexAuth?.profile?.name || window.NexAuth?.currentUser?.email || "Operator"
    };

    try {
      await window.Collections.customers.doc(customerId).update({
        notes: window.FieldValue.arrayUnion(noteObj),
        updatedAt: window.serverTimestamp()
      });
    } catch (e) {}

    try {
      const cached = JSON.parse(localStorage.getItem("nx_customers_cache") || "[]");
      const idx = cached.findIndex(c => c.id === customerId);
      if (idx !== -1) {
        cached[idx].notes = [...(cached[idx].notes || []), noteObj];
        localStorage.setItem("nx_customers_cache", JSON.stringify(cached));
      }
    } catch (e) {}

    return noteObj;
  },

  /* ── Delete Customer ── */
  async delete(customerId) {
    try {
      await window.NexAuth.ensureAuth();
      await window.Collections.customers.doc(customerId).delete();
      await this._logActivity("customer_deleted", customerId);
    } catch (e) {}

    try {
      const cached = JSON.parse(localStorage.getItem("nx_customers_cache") || "[]");
      const filtered = cached.filter(c => c.id !== customerId);
      localStorage.setItem("nx_customers_cache", JSON.stringify(filtered));
    } catch (e) {}

    return true;
  },

  /* ── Bump Aggregates on Order Creation ── */
  async _bumpAggregates(customerId, orderTotal, tx = null) {
    try {
      const ref = window.Collections.customers.doc(customerId);
      const patch = {
        totalOrders: window.FieldValue.increment(1),
        totalSpent: window.FieldValue.increment(Number(orderTotal) || 0),
        lastOrderAt: window.serverTimestamp(),
        updatedAt: window.serverTimestamp()
      };
      if (tx) tx.update(ref, patch);
      else await ref.update(patch);
    } catch (e) {}
  },

  async _logActivity(type, customerId, name = "") {
    try {
      await window.Collections.activities.add({
        type,
        entity: "customer",
        entityId: customerId,
        title: name,
        by: window.NexAuth?.currentUser?.uid || "operator",
        createdAt: window.serverTimestamp()
      });
    } catch (e) {}
  },

  async seedPermanentData() {
    try {
      if (!window.PERMANENT_SEEDED_CUSTOMERS || !window.PERMANENT_SEEDED_CUSTOMERS.length) return;
      const ver = localStorage.getItem("nx_customers_version_v2");
      if (ver !== "2.0") {
        localStorage.setItem("nx_customers_cache", JSON.stringify(window.PERMANENT_SEEDED_CUSTOMERS));
        localStorage.setItem("nx_customers_version_v2", "2.0");
        console.log(`[CustomersService] Updated clean sanitized customer dataset (${window.PERMANENT_SEEDED_CUSTOMERS.length} records)`);
        return;
      }
      const cached = JSON.parse(localStorage.getItem("nx_customers_cache") || "[]");
      if (cached.length < window.PERMANENT_SEEDED_CUSTOMERS.length) {
        localStorage.setItem("nx_customers_cache", JSON.stringify(window.PERMANENT_SEEDED_CUSTOMERS));
      }
    } catch (e) {
      console.warn("Error seeding permanent customer data:", e);
    }
  }
};

if (typeof window !== "undefined") {
  setTimeout(() => {
    if (window.CustomersService && typeof window.CustomersService.seedPermanentData === "function") {
      window.CustomersService.seedPermanentData();
    }
  }, 50);
}

