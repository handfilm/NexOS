/* ═══════════════════════════════════════════════════════════════
   NexOS v5 — js/firebase-orders.js
   ফেজ ৪ — Orders (Firestore ভিত্তিক, dOrders এর replacement)
   Products ও Customers এর সাথে সঠিকভাবে সংযুক্ত + atomic inventory deduction
   ═══════════════════════════════════════════════════════════════ */

/*
  Firestore ডাটা মডেল — orders/{orderId}
  {
    orderNumber,           // মানুষের পড়ার জন্য: "NX-1045"
    customerId,
    customerSnapshot: { name, email, phone, country },   // ← historical snapshot, কাস্টমার পরে বদলালেও অর্ডার অপরিবর্তিত থাকে
    lineItems: [{ productId, variantId, title, sku, price, quantity, lineTotal }],
    subtotal, discountTotal, shippingTotal, taxTotal, total, currency,
    paymentStatus: "pending"|"paid"|"partially_paid"|"refunded",
    fulfillmentStatus: "unfulfilled"|"partial"|"fulfilled"|"shipped"|"delivered",
    status: "open"|"completed"|"cancelled",
    shippingAddress, billingAddress, notes,
    timeline: [{ event, at, by }],
    storeId, createdAt, updatedAt
  }
*/

window.OrdersService = {
  PAGE_SIZE: 25,
  _lastDoc: null,

  async list({ status = null, paymentStatus = null, startAfterDoc = null } = {}) {
    let q = window.Collections.orders.orderBy("createdAt", "desc");
    if (status) q = q.where("status", "==", status);
    if (paymentStatus) q = q.where("paymentStatus", "==", paymentStatus);
    if (startAfterDoc) q = q.startAfter(startAfterDoc);
    q = q.limit(this.PAGE_SIZE);

    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    this._lastDoc = snap.docs[snap.docs.length - 1] || null;
    return { items, lastDoc: this._lastDoc, hasMore: snap.docs.length === this.PAGE_SIZE };
  },

  async get(orderId) {
    const doc = await window.Collections.orders.doc(orderId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  /* ── অর্ডার তৈরি — একটাই transaction এ:
     ১) স্টক আছে কিনা যাচাই
     ২) প্রতিটা lineItem এর জন্য product variant থেকে stock কমানো
     ৩) অর্ডার ডকুমেন্ট লেখা
     ৪) কাস্টমার aggregate (totalOrders/totalSpent) বাড়ানো
     এভাবে race condition এ দুইজন অপারেটর একসাথে অর্ডার করলেও stock ভুল হবে না। ── */
  async create({ customerId, customer, lineItems, discountTotal = 0, shippingTotal = 0, taxTotal = 0, notes = "", storeId = "default" }) {
    if (!lineItems || !lineItems.length) throw new Error("অন্তত একটা প্রোডাক্ট লাগবে");

    const orderRef = window.Collections.orders.doc();
    const orderNumber = "NX-" + Date.now().toString().slice(-6);

    const result = await window.db.runTransaction(async (tx) => {
      // ১. সব প্রোডাক্ট একসাথে পড়া
      const productRefs = [...new Set(lineItems.map(li => li.productId))]
        .map(id => window.Collections.products.doc(id));
      const productDocs = await Promise.all(productRefs.map(ref => tx.get(ref)));
      const productMap = {};
      productDocs.forEach(doc => { if (doc.exists) productMap[doc.id] = { ref: doc.ref, data: doc.data() }; });

      // ২. স্টক যাচাই + আপডেটেড ভ্যারিয়েন্ট বানানো
      const productUpdates = {}; // productId -> variants[]
      for (const li of lineItems) {
        const p = productMap[li.productId];
        if (!p) throw new Error(`প্রোডাক্ট পাওয়া যায়নি: ${li.title || li.productId}`);
        const variants = productUpdates[li.productId] || [...p.data.variants];
        const vIdx = variants.findIndex(v => v.id === (li.variantId || "default"));
        if (vIdx === -1) throw new Error(`ভ্যারিয়েন্ট পাওয়া যায়নি: ${li.title}`);
        if ((variants[vIdx].inventoryQty || 0) < li.quantity) {
          throw new Error(`স্টক নেই: ${li.title} — মাত্র ${variants[vIdx].inventoryQty} আছে, ${li.quantity} চাওয়া হয়েছে`);
        }
        variants[vIdx] = { ...variants[vIdx], inventoryQty: variants[vIdx].inventoryQty - li.quantity };
        productUpdates[li.productId] = variants;
      }

      // ৩. প্রোডাক্ট স্টক কমানো
      for (const productId in productUpdates) {
        const variants = productUpdates[productId];
        const totalInventory = variants.reduce((s, v) => s + (v.inventoryQty || 0), 0);
        tx.update(productMap[productId].ref, { variants, totalInventory, updatedAt: window.serverTimestamp() });
      }

      // ৪. মোট হিসাব
      const subtotal = lineItems.reduce((s, li) => s + (li.price * li.quantity), 0);
      const total = subtotal - discountTotal + shippingTotal + taxTotal;

      // ৫. অর্ডার ডকুমেন্ট লেখা (কাস্টমারের স্ন্যাপশট সহ — historical record অপরিবর্তনীয়)
      const orderData = {
        orderNumber, customerId: customerId || null,
        customerSnapshot: {
          name: customer?.name || "Walk-in",
          email: customer?.email || "",
          phone: customer?.phone || "",
          country: customer?.country || ""
        },
        lineItems: lineItems.map(li => ({
          productId: li.productId, variantId: li.variantId || "default",
          title: li.title, sku: li.sku || "", price: li.price,
          quantity: li.quantity, lineTotal: li.price * li.quantity
        })),
        subtotal, discountTotal, shippingTotal, taxTotal, total,
        currency: customer?.currency || "BDT",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        status: "open",
        notes,
        timeline: [{ event: "Order created", at: new Date().toISOString(), by: window.NexAuth?.currentUser?.uid || "system" }],
        storeId,
        createdAt: window.serverTimestamp(),
        updatedAt: window.serverTimestamp()
      };
      tx.set(orderRef, orderData);

      // ৬. কাস্টমার aggregate আপডেট (থাকলে)
      if (customerId) {
        tx.update(window.Collections.customers.doc(customerId), {
          totalOrders: window.FieldValue.increment(1),
          totalSpent: window.FieldValue.increment(total),
          lastOrderAt: window.serverTimestamp(),
          updatedAt: window.serverTimestamp()
        });
      }

      return { orderId: orderRef.id, total, productUpdates };
    });

    // ৭. Transaction এর বাইরে — audit trail লেখা (এগুলো fail হলেও অর্ডার ঠিক থাকবে)
    for (const productId in result.productUpdates) {
      const li = lineItems.find(x => x.productId === productId);
      await window.Collections.inventoryMovements.add({
        productId, variantId: li.variantId || "default",
        delta: -li.quantity, reason: "order_" + orderRef.id,
        createdAt: window.serverTimestamp(),
        by: window.NexAuth?.currentUser?.uid || "system"
      });
    }
    await window.Collections.activities.add({
      type: "order_created", entity: "order", entityId: orderRef.id,
      title: `${orderNumber} · ৳${result.total}`,
      by: window.NexAuth?.currentUser?.uid || "system",
      createdAt: window.serverTimestamp()
    });
    if (window.PushEngine) window.PushEngine.notifyNewOrder({ t: orderNumber, s: `৳${result.total}` });

    return { id: orderRef.id, orderNumber, total: result.total };
  },

  async updateStatus(orderId, { status, paymentStatus, fulfillmentStatus }) {
    const patch = { updatedAt: window.serverTimestamp() };
    const events = [];
    if (status)             { patch.status = status; events.push(`Status → ${status}`); }
    if (paymentStatus)      { patch.paymentStatus = paymentStatus; events.push(`Payment → ${paymentStatus}`); }
    if (fulfillmentStatus)  { patch.fulfillmentStatus = fulfillmentStatus; events.push(`Fulfillment → ${fulfillmentStatus}`); }
    if (events.length) {
      patch.timeline = window.FieldValue.arrayUnion(
        ...events.map(e => ({ event: e, at: new Date().toISOString(), by: window.NexAuth?.currentUser?.uid || "system" }))
      );
    }
    await window.Collections.orders.doc(orderId).update(patch);
  },

  /* ── অর্ডার বাতিল হলে স্টক ফেরত দেওয়া ── */
  async cancel(orderId) {
    const order = await this.get(orderId);
    if (!order) throw new Error("অর্ডার পাওয়া যায়নি");
    if (order.status === "cancelled") return;

    await window.db.runTransaction(async (tx) => {
      for (const li of order.lineItems) {
        const ref = window.Collections.products.doc(li.productId);
        const doc = await tx.get(ref);
        if (!doc.exists) continue;
        const variants = doc.data().variants.map(v =>
          v.id === li.variantId ? { ...v, inventoryQty: (v.inventoryQty || 0) + li.quantity } : v
        );
        const totalInventory = variants.reduce((s, v) => s + (v.inventoryQty || 0), 0);
        tx.update(ref, { variants, totalInventory, updatedAt: window.serverTimestamp() });
      }
      tx.update(window.Collections.orders.doc(orderId), {
        status: "cancelled", updatedAt: window.serverTimestamp(),
        timeline: window.FieldValue.arrayUnion({ event: "Order cancelled — stock restored", at: new Date().toISOString(), by: window.NexAuth?.currentUser?.uid || "system" })
      });
    });
  }
};
