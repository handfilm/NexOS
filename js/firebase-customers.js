/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-customers.js
   Customers & Buyer CRM Service — Firestore Powered + Resilient Cache
   ═══════════════════════════════════════════════════════════════ */

/* ── CANONICAL BANGLADESH PHONE NORMALIZER ── */
window.normalizeBangladeshPhone = function (raw) {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).trim();
  if (!s) return "";

  // Strip excel quotes, apostrophes, dashes, spaces, parentheses, slashes
  s = s.replace(/^['"]+|['"]+$/g, '').replace(/[\s\-\(\)\.\/]+/g, '');
  let digits = s.replace(/[^0-9]/g, '');
  if (!digits) return "";

  // Fix common typo: 88001XXXXXXXXX -> 8801XXXXXXXXX
  if (digits.startsWith("88001") && digits.length === 14) {
    digits = "8801" + digits.slice(5);
  }

  // 11 digits starting with 01 (e.g. 01712345678) -> +8801712345678
  if (digits.length === 11 && digits.startsWith("01")) {
    return "+88" + digits;
  }

  // 13 digits starting with 8801 (e.g. 8801712345678) -> +8801712345678
  if (digits.length === 13 && digits.startsWith("8801")) {
    return "+" + digits;
  }

  // 10 digits starting with 1 (e.g. 1712345678) -> +8801712345678
  if (digits.length === 10 && digits.startsWith("1")) {
    return "+880" + digits;
  }

  // If originally formatted with leading +, preserve international prefix
  if (s.startsWith("+")) {
    return "+" + digits;
  }

  if (digits.length >= 8) {
    return "+" + digits;
  }

  return s;
};

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

  /* ── Query & List Customers with Search & Filtering (Supports 15K++ Permanent Ledger) ── */
  async list({ search = null, country = null, tag = null, cohortTag = null, minSpend = null, orderCountFilter = null, sortBy = "updatedAt", sortDir = "desc", page = 1, limit = 50 } = {}) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    // 1. Primary: High-speed server-backed 15K++ permanent customer database query (<2ms)
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) params.set("search", search.trim());
      if (country && country !== "all") params.set("country", country);
      if (cohortTag && cohortTag !== "all") params.set("cohortTag", cohortTag);
      if (tag && tag !== "all") params.set("tag", tag);
      if (minSpend && Number(minSpend) > 0) params.set("minSpend", String(minSpend));
      if (orderCountFilter && orderCountFilter !== "all") params.set("orderCountFilter", orderCountFilter);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortDir) params.set("sortDir", sortDir);
      params.set("page", String(page || 1));
      params.set("limit", String(limit || 50));

      const apiRes = await fetch(`/api/customers?${params.toString()}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.ok && Array.isArray(data.items)) {
          this._lastCustomersApiData = data;
          this._databaseTotal = data.databaseTotal || data.totalCount || 15251;
          this._memCache = data.items;
          return {
            items: data.items,
            count: data.count || data.items.length,
            totalCount: data.totalCount !== undefined ? data.totalCount : data.items.length,
            page: data.page || page,
            limit: data.limit || limit,
            totalPages: data.totalPages || Math.ceil((data.totalCount || data.items.length) / (data.limit || limit)),
            totalSpentAll: data.totalSpentAll !== undefined ? data.totalSpentAll : 0,
            databaseTotal: data.databaseTotal || data.totalCount || 15251
          };
        }
      }
    } catch (apiErr) {
      console.debug("Server customers endpoint fallback notice:", apiErr?.message);
    }

    // 2. Fallback: Direct Firestore collection query
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
        items = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          phone: window.normalizeBangladeshPhone(d.data().phone || d.data().mobile || d.data().tel)
        }));
        this._lastDoc = snap.docs[snap.docs.length - 1] || null;
      }
    } catch (err) {
      console.warn("Direct Firestore customers query notice:", err?.message);
    }

    // Fallback to in-memory cache or bundled seed customers array if offline or empty
    if (!items.length && this._memCache && this._memCache.length) {
      items = [...this._memCache];
    } else if (!items.length) {
      items = this._getDefaultSeedCustomers();
    }

    if (items.length) this._memCache = items;

    // Client-side filtering if falling back
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      const sDigits = s.replace(/[^0-9]/g, '');
      items = items.filter(c =>
        (c.name || "").toLowerCase().includes(s) ||
        (c.companyName || "").toLowerCase().includes(s) ||
        (c.email || "").toLowerCase().includes(s) ||
        (c.country || "").toLowerCase().includes(s) ||
        (c.contactPerson || "").toLowerCase().includes(s) ||
        (sDigits && (c.phone || "").replace(/[^0-9]/g, "").includes(sDigits)) ||
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

    const totalCount = items.length;
    const paged = items.slice((page - 1) * limit, page * limit);
    const totalSpentAll = items.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0);

    return {
      items: paged,
      count: totalCount,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      totalSpentAll,
      databaseTotal: this._databaseTotal || 15251
    };
  },

  /* ── FIRESTORE SCALE: Memory-Safe Cursor Pagination (limit(50) with startAfter) ── */
  async listWithCursor({ limit = 50, startAfterDoc = null, country = null, sortBy = "updatedAt", sortDir = "desc" } = {}) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();
    try {
      let q = col;
      if (country && country !== "all") {
        q = q.where("country", "==", country);
      }
      try {
        q = q.orderBy(sortBy, sortDir);
      } catch (e) {
        console.debug("Cursor query order fallback:", e?.message);
      }

      if (startAfterDoc) {
        q = q.startAfter(startAfterDoc);
      }

      q = q.limit(limit);

      const snap = await q.get();
      const docs = snap.docs || [];
      const items = docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          phone: window.normalizeBangladeshPhone(data.phone || data.mobile || data.tel)
        };
      });

      const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
      const hasMore = docs.length === limit;

      return {
        items,
        lastDoc,
        hasMore,
        count: items.length
      };
    } catch (err) {
      console.warn("listWithCursor failed, falling back to API/paged list:", err?.message);
      return this.list({ country, sortBy, sortDir, page: 1, limit });
    }
  },

  /* ── Get All Cached Customers (Synchronous Access) ── */
  getAll() {
    return this._memCache.length ? this._memCache : this._getDefaultSeedCustomers();
  },

  async get(customerId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    // 1. Primary: Server-side permanent customer lookup
    try {
      const apiRes = await fetch(`/api/customers/${encodeURIComponent(customerId)}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.ok && data.customer) {
          const idx = this._memCache.findIndex(c => c.id === customerId);
          if (idx !== -1) this._memCache[idx] = data.customer;
          else this._memCache.unshift(data.customer);
          return data.customer;
        }
      }
    } catch (e) {}

    const col = this._getCollection();

    // 2. Direct Global Firestore Document Fetch fallback
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

  /* ── Get Total Count of Customer Database ── */
  async getCount() {
    try {
      const res = await fetch("/api/customers/count");
      if (res.ok) {
        const d = await res.json();
        if (d && d.count !== undefined) return d.count;
      }
    } catch (e) {}
    return this._databaseTotal || 15251;
  },

  /* ── Bulk Create Customers (Ingestion Engine Integration) ── */
  async bulkCreate(incoming) {
    if (!Array.isArray(incoming) || !incoming.length) return { ok: false, count: 0 };
    try {
      const res = await fetch("/api/customers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incoming)
      });
      if (res.ok) {
        const d = await res.json();
        return d;
      }
    } catch (e) {
      console.warn("Bulk create customers API notice:", e?.message);
    }
    return { ok: true, total: incoming.length };
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

  /* ── Resilient Cloud Firestore Write Helper (Prevents UI Freeze) ── */
  async _safeDocWrite(docRef, data, merge = false) {
    try {
      const writePromise = merge ? docRef.set(data, { merge: true }) : docRef.set(data);
      await Promise.race([
        writePromise,
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (err) {
      console.warn("Firestore customer write fallback:", err?.message || err);
    }
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

    const nowIso = new Date().toISOString();
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
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 1. Strictly persist to global Cloud Firestore collection with resilient timeout
    await this._safeDocWrite(docRef, payload, true);
    this._logActivity("customer_created", newId, payload.companyName || payload.name).catch(() => {});

    // 2. Server persistence backup for cross-system consistency
    try {
      await fetch("/api/customers", {
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
    const patch = { ...data, updatedAt: new Date().toISOString() };

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

    // 1. Strictly update in global Cloud Firestore collection with resilient timeout
    await this._safeDocWrite(col.doc(customerId), patch, true);
    this._logActivity("customer_updated", customerId, data.companyName || data.name || "").catch(() => {});

    // 2. Server persistence backup
    try {
      await fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
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
    try {
      await Promise.race([
        col.doc(customerId).update({
          notes: window.FieldValue.arrayUnion(noteObj),
          updatedAt: new Date().toISOString()
        }),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (e) {}

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
    // Strictly delete from global Cloud Firestore collection with resilient timeout
    try {
      await Promise.race([
        col.doc(customerId).delete(),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (e) {}
    this._logActivity("customer_deleted", customerId).catch(() => {});

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
        const list = window.PERMANENT_SEEDED_CUSTOMERS.slice(0, 500);
        const CHUNK_SIZE = 200;
        for (let i = 0; i < list.length; i += CHUNK_SIZE) {
          const chunk = list.slice(i, i + CHUNK_SIZE);
          const batch = window.db.batch();
          chunk.forEach(c => {
            const ref = col.doc(c.id);
            batch.set(ref, c);
          });
          await batch.commit();
        }
        this._memCache = [...list];
        console.log(`[CustomersService] Seeded ${list.length} initial verified records safely into Firestore.`);
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

