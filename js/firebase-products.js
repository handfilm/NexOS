/* ═══════════════════════════════════════════════════════════════
   NexOS v5 — js/firebase-products.js
   ফেজ ২ — Products CRUD (Firestore ভিত্তিক, mock dCat এর replacement)
   ═══════════════════════════════════════════════════════════════ */

/*
  Firestore ডাটা মডেল — products/{productId}
  {
    title, handle, description, status: "active"|"draft"|"archived",
    vendor, productType, tags: [],
    collections: [collectionId, ...],
    seo: { title, description },
    pricing: { price, compareAtPrice, cost, currency },
    images: [{ url, alt, position }],
    variants: [{ id, title, sku, barcode, price, compareAtPrice, inventoryQty, availableForSale }],
    totalInventory,   // denormalized sum of variant qty — দ্রুত লিস্ট/সর্ট এর জন্য
    lowStockThreshold,
    storeId,
    createdAt, updatedAt
  }
*/

window.ProductsService = {
  PAGE_SIZE: 25,
  _lastDoc: null,

  /* ── লিস্ট + পেজিনেশন (বড় ক্যাটালগের জন্য পুরো কালেকশন একসাথে লোড করা হয় না) ── */
  async list({ status = null, search = null, sortBy = "updatedAt", sortDir = "desc", startAfterDoc = null } = {}) {
    let q = window.Collections.products.orderBy(sortBy, sortDir);
    if (status) q = q.where("status", "==", status);
    if (startAfterDoc) q = q.startAfter(startAfterDoc);
    q = q.limit(this.PAGE_SIZE);

    const snap = await q.get();
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // নোট: Firestore তে full-text search নেই। ছোট ক্যাটালগে client-side filter চলবে,
    // বড় হলে Algolia/Typesense এর মতো সার্চ ইনডেক্স যোগ করতে হবে (Cloud Function দিয়ে sync)।
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(p =>
        (p.title || "").toLowerCase().includes(s) ||
        (p.variants || []).some(v => (v.sku || "").toLowerCase().includes(s))
      );
    }

    this._lastDoc = snap.docs[snap.docs.length - 1] || null;
    return { items, lastDoc: this._lastDoc, hasMore: snap.docs.length === this.PAGE_SIZE };
  },

  async get(productId) {
    const doc = await window.Collections.products.doc(productId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async create(data) {
    const totalInventory = (data.variants || []).reduce((sum, v) => sum + (Number(v.inventoryQty) || 0), 0);
    const ref = await window.Collections.products.add({
      title: data.title || "Untitled Product",
      handle: this._slugify(data.title || "product"),
      description: data.description || "",
      status: data.status || "draft",
      vendor: data.vendor || "",
      productType: data.productType || "",
      tags: data.tags || [],
      collections: data.collections || [],
      seo: data.seo || { title: data.title || "", description: "" },
      pricing: {
        price: Number(data.price) || 0,
        compareAtPrice: Number(data.compareAtPrice) || null,
        cost: Number(data.cost) || null,
        currency: data.currency || "BDT"
      },
      images: data.images || [],
      variants: data.variants || [{
        id: "default", title: "Default", sku: data.sku || "",
        barcode: data.barcode || "", price: Number(data.price) || 0,
        compareAtPrice: Number(data.compareAtPrice) || null,
        inventoryQty: Number(data.stock) || 0, availableForSale: true
      }],
      totalInventory,
      lowStockThreshold: Number(data.lowStockThreshold) || 10,
      storeId: data.storeId || "default",
      createdAt: window.serverTimestamp(),
      updatedAt: window.serverTimestamp()
    });

    await this._logActivity("product_created", ref.id, data.title);
    await this._syncInventory(ref.id, totalInventory);
    return ref.id;
  },

  async update(productId, data) {
    const patch = { ...data, updatedAt: window.serverTimestamp() };
    if (data.variants) {
      patch.totalInventory = data.variants.reduce((s, v) => s + (Number(v.inventoryQty) || 0), 0);
    }
    await window.Collections.products.doc(productId).update(patch);
    await this._logActivity("product_updated", productId, data.title);
  },

  async archive(productId) {
    await window.Collections.products.doc(productId).update({ status: "archived", updatedAt: window.serverTimestamp() });
    await this._logActivity("product_archived", productId);
  },

  async delete(productId) {
    // সফট ডিলিট প্রেফারেবল — অর্ডার হিস্ট্রিতে productId রেফারেন্স থাকতে পারে।
    // দরকার হলে সরাসরি delete() ব্যবহার করুন, কিন্তু archive() সুপারিশ করা হচ্ছে।
    await window.Collections.products.doc(productId).delete();
    await this._logActivity("product_deleted", productId);
  },

  /* ── ইনভেন্টরি অ্যাডজাস্টমেন্ট (movement history সহ) ── */
  async adjustInventory(productId, variantId, delta, reason = "manual_adjustment") {
    const productRef = window.Collections.products.doc(productId);
    await window.db.runTransaction(async (tx) => {
      const doc = await tx.get(productRef);
      if (!doc.exists) throw new Error("Product not found");
      const p = doc.data();
      const variants = (p.variants || []).map(v =>
        v.id === variantId ? { ...v, inventoryQty: Math.max(0, (v.inventoryQty || 0) + delta) } : v
      );
      const totalInventory = variants.reduce((s, v) => s + (v.inventoryQty || 0), 0);
      tx.update(productRef, { variants, totalInventory, updatedAt: window.serverTimestamp() });
    });
    await window.Collections.inventoryMovements.add({
      productId, variantId, delta, reason,
      createdAt: window.serverTimestamp(),
      by: window.NexAuth?.currentUser?.uid || "system"
    });
  },

  async _syncInventory(productId, qty) {
    await window.Collections.inventory.doc(productId).set({
      productId, available: qty, reserved: 0,
      updatedAt: window.serverTimestamp()
    }, { merge: true });
  },

  async _logActivity(type, productId, title = "") {
    await window.Collections.activities.add({
      type, entity: "product", entityId: productId, title,
      by: window.NexAuth?.currentUser?.uid || "system",
      createdAt: window.serverTimestamp()
    });
  },

  _slugify(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  },

  /* ── ছবি আপলোড (Firebase Storage) ── */
  async uploadImage(productId, file) {
    const path = `products/${productId}/${Date.now()}_${file.name}`;
    const ref = window.storage.ref(path);
    const snap = await ref.put(file);
    const url = await snap.ref.getDownloadURL();
    return { url, path };
  }
};
