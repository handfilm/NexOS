/* ═══════════════════════════════════════════════════════════════
   NexOS v5 — js/firebase-customers.js
   ফেজ ৩ — Customers / Buyer CRM (Firestore ভিত্তিক, dCompanies এর replacement)
   ═══════════════════════════════════════════════════════════════ */

/*
  Firestore ডাটা মডেল — customers/{customerId}
  {
    name, companyName, email, phone,
    country, currency, flag,
    addresses: [{ type:"shipping"|"billing", line1, line2, city, country, postalCode, isDefault }],
    tags: [], notes: [{ text, createdAt, by }],
    moq, paymentTerms, contactPerson,
    totalOrders, totalSpent, lastOrderAt,   // ← denormalized, orders তৈরি হলে আপডেট হয়
    storeId, createdAt, updatedAt
  }
*/

window.CustomersService = {
  PAGE_SIZE: 25,
  _lastDoc: null,

  async list({ search = null, country = null, startAfterDoc = null } = {}) {
    let q = window.Collections.customers.orderBy("updatedAt", "desc");
    if (country) q = q.where("country", "==", country);
    if (startAfterDoc) q = q.startAfter(startAfterDoc);
    q = q.limit(this.PAGE_SIZE);

    const snap = await q.get();
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(c =>
        (c.name || "").toLowerCase().includes(s) ||
        (c.companyName || "").toLowerCase().includes(s) ||
        (c.email || "").toLowerCase().includes(s)
      );
    }

    this._lastDoc = snap.docs[snap.docs.length - 1] || null;
    return { items, lastDoc: this._lastDoc, hasMore: snap.docs.length === this.PAGE_SIZE };
  },

  async get(customerId) {
    const doc = await window.Collections.customers.doc(customerId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  /* ── কাস্টমার প্রোফাইল + অর্ডার হিস্ট্রি একসাথে (কোম্পানি ডিটেইল শীটের জন্য) ── */
  async getWithOrders(customerId, limit = 10) {
    const [customer, ordersSnap] = await Promise.all([
      this.get(customerId),
      window.Collections.orders
        .where("customerId", "==", customerId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get()
    ]);
    const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { customer, orders };
  },

  async create(data) {
    const ref = await window.Collections.customers.add({
      name: data.name || data.companyName || "Unnamed Buyer",
      companyName: data.companyName || data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      country: data.country || "",
      currency: data.currency || "EUR",
      flag: data.flag || "",
      addresses: data.addresses || [],
      tags: data.tags || [],
      notes: [],
      moq: Number(data.moq) || 0,
      paymentTerms: data.paymentTerms || "Net 30",
      contactPerson: data.contactPerson || "",
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      storeId: data.storeId || "default",
      createdAt: window.serverTimestamp(),
      updatedAt: window.serverTimestamp()
    });
    await this._logActivity("customer_created", ref.id, data.name || data.companyName);
    return ref.id;
  },

  async update(customerId, data) {
    await window.Collections.customers.doc(customerId).update({
      ...data, updatedAt: window.serverTimestamp()
    });
    await this._logActivity("customer_updated", customerId, data.name);
  },

  async addNote(customerId, text) {
    await window.Collections.customers.doc(customerId).update({
      notes: window.FieldValue.arrayUnion({
        text, createdAt: new Date().toISOString(),
        by: window.NexAuth?.currentUser?.uid || "system"
      }),
      updatedAt: window.serverTimestamp()
    });
  },

  async delete(customerId) {
    await window.Collections.customers.doc(customerId).delete();
    await this._logActivity("customer_deleted", customerId);
  },

  /* ── অর্ডার তৈরি হওয়ার পর OrdersService থেকে কল হয় — নিজে সরাসরি কল করার দরকার নেই ── */
  async _bumpAggregates(customerId, orderTotal, tx = null) {
    const ref = window.Collections.customers.doc(customerId);
    const patch = {
      totalOrders: window.FieldValue.increment(1),
      totalSpent: window.FieldValue.increment(orderTotal),
      lastOrderAt: window.serverTimestamp(),
      updatedAt: window.serverTimestamp()
    };
    if (tx) tx.update(ref, patch);
    else await ref.update(patch);
  },

  async _logActivity(type, customerId, name = "") {
    await window.Collections.activities.add({
      type, entity: "customer", entityId: customerId, title: name,
      by: window.NexAuth?.currentUser?.uid || "system",
      createdAt: window.serverTimestamp()
    });
  }
};
