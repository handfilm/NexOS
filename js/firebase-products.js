/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-products.js
   Products Service — Real Firestore Catalog & Inventory + Resilient Cache
   ═══════════════════════════════════════════════════════════════ */

window.ProductsService = {
  PAGE_SIZE: 50,
  _lastDoc: null,

  _getDefaultSeedProducts() {
    return [
      {
        id: "prod-wlt-01",
        title: "Full-Grain Leather Bi-Fold Wallet",
        handle: "full-grain-leather-bi-fold-wallet",
        status: "active",
        vendor: "Hands & Head",
        productType: "Leather Goods",
        description: "Handcrafted 100% full-grain vegetable-tanned cowhide wallet with 6 card slots and dual currency partitions.",
        tags: ["wallet", "leather", "bifold", "b2b"],
        pricing: { price: 2850, compareAtPrice: 3400, cost: 1600, currency: "BDT" },
        images: [{ url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80", alt: "Leather Wallet" }],
        variants: [{ id: "v-wlt-tan", title: "Tan Brown", sku: "HH-WLT-01", price: 2850, inventoryQty: 48, availableForSale: true }],
        totalInventory: 48,
        lowStockThreshold: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-brf-02",
        title: "Executive Leather Briefcase",
        handle: "executive-leather-briefcase",
        status: "active",
        vendor: "Hands & Head",
        productType: "Bags",
        description: "Premium oil-pull leather laptop briefcase with brass hardware and reinforced shoulder strap.",
        tags: ["briefcase", "executive", "office", "export"],
        pricing: { price: 18500, compareAtPrice: 22000, cost: 10500, currency: "BDT" },
        images: [{ url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80", alt: "Briefcase" }],
        variants: [{ id: "v-brf-blk", title: "Midnight Black", sku: "HH-BRF-02", price: 18500, inventoryQty: 14, availableForSale: true }],
        totalInventory: 14,
        lowStockThreshold: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-blt-01",
        title: "Classic Full-Grain Dress Belt",
        handle: "classic-full-grain-dress-belt",
        status: "active",
        vendor: "Hands & Head",
        productType: "Belts",
        description: "Single-piece full grain bridle leather belt with solid brushed steel buckle.",
        tags: ["belt", "classic", "formal"],
        pricing: { price: 2250, compareAtPrice: 2600, cost: 1100, currency: "BDT" },
        images: [{ url: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&auto=format&fit=crop&q=80", alt: "Leather Belt" }],
        variants: [{ id: "v-blt-choc", title: "Chocolate Brown / 34", sku: "HH-BLT-01", price: 2250, inventoryQty: 62, availableForSale: true }],
        totalInventory: 62,
        lowStockThreshold: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-crd-03",
        title: "Minimalist Leather Card Holder",
        handle: "minimalist-leather-card-holder",
        status: "active",
        vendor: "Hands & Head",
        productType: "Accessories",
        description: "Ultra-slim front pocket leather card sleeve with RFID protection.",
        tags: ["cardholder", "minimalist", "edc"],
        pricing: { price: 1250, compareAtPrice: 1500, cost: 600, currency: "BDT" },
        images: [{ url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80", alt: "Card Holder" }],
        variants: [{ id: "v-crd-hav", title: "Havana Brown", sku: "HH-CRD-03", price: 1250, inventoryQty: 95, availableForSale: true }],
        totalInventory: 95,
        lowStockThreshold: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-dfl-04",
        title: "Voyager Handcrafted Leather Duffel",
        handle: "voyager-handcrafted-leather-duffel",
        status: "active",
        vendor: "Hands & Head",
        productType: "Bags",
        description: "Full-grain weekend travel bag with antique brass fittings and detachable canvas-leather strap.",
        tags: ["duffel", "travel", "leather", "weekend"],
        pricing: { price: 21500, compareAtPrice: 24900, cost: 12500, currency: "BDT" },
        images: [{ url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80", alt: "Leather Duffel" }],
        variants: [{ id: "v-dfl-cognac", title: "Cognac Tan", sku: "HH-DFL-04", price: 21500, inventoryQty: 18, availableForSale: true }],
        totalInventory: 18,
        lowStockThreshold: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-oxf-05",
        title: "Artisanal Leather Oxford Brogues",
        handle: "artisanal-leather-oxford-brogues",
        status: "active",
        vendor: "Hands & Head",
        productType: "Footwear",
        description: "Goodyear welted cowhide dress shoes hand-burnished to a rich patina.",
        tags: ["shoes", "footwear", "oxford", "formal"],
        pricing: { price: 14200, compareAtPrice: 16500, cost: 8200, currency: "BDT" },
        images: [{ url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80", alt: "Leather Shoes" }],
        variants: [{ id: "v-oxf-42", title: "Burgundy / EU 42", sku: "HH-OXF-05", price: 14200, inventoryQty: 22, availableForSale: true }],
        totalInventory: 22,
        lowStockThreshold: 6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  },

  /* ── Query & List Products with Search, Filtering & Sorting ── */
  async list({ status = null, search = null, productType = null, vendor = null, sortBy = "updatedAt", sortDir = "desc" } = {}) {
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    let items = [];

    try {
      let q = window.Collections.products;

      if (status && status !== "all") {
        q = q.where("status", "==", status);
      }
      if (productType && productType !== "all") {
        q = q.where("productType", "==", productType);
      }
      if (vendor && vendor !== "all") {
        q = q.where("vendor", "==", vendor);
      }

      try {
        q = q.orderBy(sortBy, sortDir);
      } catch (e) {
        console.warn("Index warning, fallback to default order:", e);
      }

      const snap = await q.limit(this.PAGE_SIZE).get();
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._lastDoc = snap.docs[snap.docs.length - 1] || null;

      if (items.length) {
        try { localStorage.setItem("nx_products_cache", JSON.stringify(items)); } catch (e) {}
      }
    } catch (err) {
      console.warn("Firestore Products fetch notice (using cache):", err.message);
      try {
        const cached = JSON.parse(localStorage.getItem("nx_products_cache") || "[]");
        items = cached.length ? cached : this._getDefaultSeedProducts();
      } catch (e) {
        items = this._getDefaultSeedProducts();
      }

      if (status && status !== "all") {
        items = items.filter(p => p.status === status);
      }
      if (productType && productType !== "all") {
        items = items.filter(p => p.productType === productType);
      }
      if (vendor && vendor !== "all") {
        items = items.filter(p => p.vendor === vendor);
      }
    }

    if (!items.length && (!status || status === "all") && !search) {
      items = this._getDefaultSeedProducts();
    }

    // Client-side text search (title, SKU, vendor, tags, description)
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      items = items.filter(p =>
        (p.title || "").toLowerCase().includes(s) ||
        (p.handle || "").toLowerCase().includes(s) ||
        (p.vendor || "").toLowerCase().includes(s) ||
        (p.productType || "").toLowerCase().includes(s) ||
        (p.description || "").toLowerCase().includes(s) ||
        (p.tags || []).some(t => (t || "").toLowerCase().includes(s)) ||
        (p.variants || []).some(v =>
          (v.sku || "").toLowerCase().includes(s) ||
          (v.barcode || "").toLowerCase().includes(s) ||
          (v.title || "").toLowerCase().includes(s)
        )
      );
    }

    // Sort in memory if multi-field order is required
    if (sortBy === "price") {
      items.sort((a, b) => {
        const pa = a.pricing?.price || 0;
        const pb = b.pricing?.price || 0;
        return sortDir === "asc" ? pa - pb : pb - pa;
      });
    } else if (sortBy === "inventory") {
      items.sort((a, b) => {
        const ia = a.totalInventory || 0;
        const ib = b.totalInventory || 0;
        return sortDir === "asc" ? ia - ib : ib - ia;
      });
    } else if (sortBy === "title") {
      items.sort((a, b) => {
        const ta = (a.title || "").toLowerCase();
        const tb = (b.title || "").toLowerCase();
        return sortDir === "asc" ? ta.localeCompare(tb) : tb.localeCompare(ta);
      });
    }

    return { items, count: items.length };
  },

  async get(productId) {
    try {
      await window.NexAuth.ensureAuth();
      const doc = await window.Collections.products.doc(productId).get();
      if (doc.exists) return { id: doc.id, ...doc.data() };
    } catch (e) {
      console.warn("Firestore get product fallback:", e);
    }
    const cached = JSON.parse(localStorage.getItem("nx_products_cache") || "[]");
    const all = cached.length ? cached : this._getDefaultSeedProducts();
    return all.find(p => p.id === productId) || null;
  },

  /* ── Create Product ── */
  async create(data) {
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    
    // Process variants
    let variants = data.variants;
    if (!variants || !variants.length) {
      variants = [{
        id: "v-" + Date.now().toString(36),
        title: data.variantTitle || "Standard",
        sku: data.sku || ("HH-" + Math.floor(1000 + Math.random() * 9000)),
        barcode: data.barcode || "",
        price: Number(data.price) || 0,
        compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : null,
        cost: data.cost ? Number(data.cost) : null,
        inventoryQty: Number(data.stock !== undefined ? data.stock : (data.inventory || 0)),
        availableForSale: (data.status || "active") === "active"
      }];
    }

    const totalInventory = variants.reduce((sum, v) => sum + (Number(v.inventoryQty) || 0), 0);
    const primaryPrice = Number(data.price !== undefined ? data.price : variants[0]?.price) || 0;

    const payload = {
      title: (data.title || "Untitled Product").trim(),
      handle: this._slugify(data.title || "product"),
      description: data.description || "",
      status: data.status || "active", // "active" | "draft" | "archived"
      vendor: data.vendor || "Hands & Head",
      productType: data.productType || "Leather Goods",
      tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === "string" ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : []),
      collections: Array.isArray(data.collections) ? data.collections : [],
      seo: data.seo || { title: data.title || "", description: (data.description || "").slice(0, 150) },
      pricing: {
        price: primaryPrice,
        compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : null,
        cost: data.cost ? Number(data.cost) : null,
        currency: data.currency || "BDT"
      },
      images: Array.isArray(data.images) ? data.images.map((img, idx) => typeof img === "string" ? { url: img, alt: data.title || "", position: idx } : img) : [],
      variants,
      totalInventory,
      lowStockThreshold: Number(data.lowStockThreshold) || 5,
      storeId: data.storeId || "default",
      createdAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
    };

    let newId = "prod-" + Date.now().toString(36);
    try {
      const ref = await window.Collections.products.add(payload);
      newId = ref.id;
      await this._syncInventory(ref.id, totalInventory);
      await this._logActivity("product_created", ref.id, payload.title);
    } catch (e) {
      console.warn("Firestore product write note (cached locally):", e.message);
    }

    // Save to local cache
    try {
      const cached = JSON.parse(localStorage.getItem("nx_products_cache") || "[]");
      const localProd = { id: newId, ...payload, createdAt: new Date().toISOString() };
      cached.unshift(localProd);
      localStorage.setItem("nx_products_cache", JSON.stringify(cached));
    } catch (e) {}

    return newId;
  },

  /* ── Update Product ── */
  async update(productId, data) {
    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    const patch = { ...data, updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString() };

    if (data.title && !data.handle) {
      patch.handle = this._slugify(data.title);
    }
    if (data.price !== undefined) {
      patch.pricing = {
        price: Number(data.price) || 0,
        compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : null,
        cost: data.cost ? Number(data.cost) : null,
        currency: data.currency || "BDT"
      };
    }
    if (typeof data.tags === "string") {
      patch.tags = data.tags.split(",").map(t => t.trim()).filter(Boolean);
    }
    if (data.variants && data.variants.length) {
      patch.totalInventory = data.variants.reduce((s, v) => s + (Number(v.inventoryQty) || 0), 0);
    } else if (data.stock !== undefined) {
      patch.totalInventory = Number(data.stock) || 0;
    }

    try {
      await window.Collections.products.doc(productId).set(patch, { merge: true });
      if (patch.totalInventory !== undefined) {
        await this._syncInventory(productId, patch.totalInventory);
      }
      await this._logActivity("product_updated", productId, data.title || "");
    } catch (e) {
      console.warn("Firestore product update note:", e.message);
    }

    // Update local cache
    try {
      const cached = JSON.parse(localStorage.getItem("nx_products_cache") || "[]");
      const idx = cached.findIndex(p => p.id === productId);
      if (idx !== -1) {
        cached[idx] = { ...cached[idx], ...patch };
        localStorage.setItem("nx_products_cache", JSON.stringify(cached));
      }
    } catch (e) {}

    return true;
  },

  /* ── Archive Product ── */
  async archive(productId) {
    try {
      await window.NexAuth.ensureAuth();
      await window.Collections.products.doc(productId).update({
        status: "archived",
        updatedAt: window.serverTimestamp()
      });
      await this._logActivity("product_archived", productId);
    } catch (e) {}

    try {
      const cached = JSON.parse(localStorage.getItem("nx_products_cache") || "[]");
      const idx = cached.findIndex(p => p.id === productId);
      if (idx !== -1) {
        cached[idx].status = "archived";
        localStorage.setItem("nx_products_cache", JSON.stringify(cached));
      }
    } catch (e) {}

    return true;
  },

  /* ── Unarchive / Activate Product ── */
  async activate(productId) {
    try {
      await window.NexAuth.ensureAuth();
      await window.Collections.products.doc(productId).update({
        status: "active",
        updatedAt: window.serverTimestamp()
      });
      await this._logActivity("product_activated", productId);
    } catch (e) {}

    try {
      const cached = JSON.parse(localStorage.getItem("nx_products_cache") || "[]");
      const idx = cached.findIndex(p => p.id === productId);
      if (idx !== -1) {
        cached[idx].status = "active";
        localStorage.setItem("nx_products_cache", JSON.stringify(cached));
      }
    } catch (e) {}

    return true;
  },

  /* ── Delete Product ── */
  async delete(productId) {
    try {
      await window.NexAuth.ensureAuth();
      await window.Collections.products.doc(productId).delete();
      await this._logActivity("product_deleted", productId);
    } catch (e) {}

    try {
      const cached = JSON.parse(localStorage.getItem("nx_products_cache") || "[]");
      const filtered = cached.filter(p => p.id !== productId);
      localStorage.setItem("nx_products_cache", JSON.stringify(filtered));
    } catch (e) {}

    return true;
  },

  /* ── Duplicate Product ── */
  async duplicate(productId, customTitle = null) {
    const original = await this.get(productId);
    if (!original) throw new Error("Product not found");

    const copyTitle = customTitle || `${original.title} (Copy)`;
    const copyHandle = this._slugify(copyTitle) + "-" + Math.floor(100 + Math.random() * 900);

    // Duplicate variants with new SKUs/IDs
    const duplicatedVariants = (original.variants || []).map((v, i) => ({
      ...v,
      id: "v-" + Date.now().toString(36) + "-" + i,
      sku: v.sku ? `${v.sku}-COPY` : ("HH-" + Math.floor(1000 + Math.random() * 9000)),
      barcode: v.barcode ? `${v.barcode}-CP` : "",
      inventoryQty: v.inventoryQty !== undefined ? Number(v.inventoryQty) : 0,
      availableForSale: true
    }));

    const copyData = {
      title: copyTitle,
      handle: copyHandle,
      description: original.description || "",
      status: "active",
      vendor: original.vendor || "Hands & Head",
      productType: original.productType || "Leather Goods",
      tags: Array.isArray(original.tags) ? [...original.tags, "duplicate"] : ["duplicate"],
      collections: Array.isArray(original.collections) ? [...original.collections] : [],
      pricing: original.pricing ? { ...original.pricing } : { price: 0, currency: "BDT" },
      images: original.images ? JSON.parse(JSON.stringify(original.images)) : [],
      variants: duplicatedVariants.length ? duplicatedVariants : undefined,
      stock: original.totalInventory !== undefined ? original.totalInventory : 20,
      totalInventory: original.totalInventory !== undefined ? original.totalInventory : 20,
      lowStockThreshold: original.lowStockThreshold || 5,
      storeId: original.storeId || "default"
    };

    const newId = await this.create(copyData);
    await this._logActivity("product_duplicated", newId, copyTitle);
    return { id: newId, product: { id: newId, ...copyData } };
  },

  /* ── Inventory Adjustment with Ledger Movement ── */
  async adjustInventory(productId, variantId, delta, reason = "manual_adjustment") {
    try {
      await window.NexAuth.ensureAuth();
      const productRef = window.Collections.products.doc(productId);

      await window.db.runTransaction(async (tx) => {
        const doc = await tx.get(productRef);
        if (!doc.exists) throw new Error("Product not found");
        const p = doc.data();
        const variants = (p.variants || []).map(v =>
          (v.id === variantId || (!variantId && v.id === "default"))
            ? { ...v, inventoryQty: Math.max(0, (Number(v.inventoryQty) || 0) + Number(delta)) }
            : v
        );
        const totalInventory = variants.reduce((s, v) => s + (Number(v.inventoryQty) || 0), 0);
        tx.update(productRef, { variants, totalInventory, updatedAt: window.serverTimestamp() });
      });

      await window.Collections.inventoryMovements.add({
        productId,
        variantId: variantId || "default",
        delta: Number(delta),
        reason,
        createdAt: window.serverTimestamp(),
        by: window.NexAuth?.currentUser?.uid || "operator"
      });
    } catch (e) {
      console.warn("Firestore inventory adjust note (updating local):", e.message);
    }

    try {
      const cached = JSON.parse(localStorage.getItem("nx_products_cache") || "[]");
      const idx = cached.findIndex(p => p.id === productId);
      if (idx !== -1) {
        const p = cached[idx];
        const variants = (p.variants || []).map(v =>
          (v.id === variantId || (!variantId && v.id === "default"))
            ? { ...v, inventoryQty: Math.max(0, (Number(v.inventoryQty) || 0) + Number(delta)) }
            : v
        );
        cached[idx].variants = variants;
        cached[idx].totalInventory = variants.reduce((s, v) => s + (Number(v.inventoryQty) || 0), 0);
        localStorage.setItem("nx_products_cache", JSON.stringify(cached));
      }
    } catch (e) {}

    return true;
  },

  async _syncInventory(productId, qty) {
    try {
      await window.Collections.inventory.doc(productId).set({
        productId,
        available: qty,
        reserved: 0,
        updatedAt: window.serverTimestamp()
      }, { merge: true });
    } catch (e) {}
  },

  async _logActivity(type, productId, title = "") {
    try {
      await window.Collections.activities.add({
        type,
        entity: "product",
        entityId: productId,
        title,
        by: window.NexAuth?.currentUser?.uid || "operator",
        createdAt: window.serverTimestamp()
      });
    } catch (e) {}
  },

  _slugify(str) {
    return (str || "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "product-" + Date.now().toString(36);
  }
};

