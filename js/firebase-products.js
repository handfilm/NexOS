/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-products.js
   Products Service — Real Firestore Catalog & Inventory + Resilient Cache
   ═══════════════════════════════════════════════════════════════ */

window.ProductsService = {
  PAGE_SIZE: 50,
  _lastDoc: null,
  _memCache: [],
  _initPromise: null,

  _getCollection() {
    return window.Collections?.products || window.db.collection("products");
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
          }, err => console.debug("Products snapshot notice:", err?.message));
        }
      } catch (e) {}
    })();
    return this._initPromise;
  },

  _getDefaultSeedProducts() {
    return [
      {
        id: "prod-tee-01",
        title: "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
        handle: "heavyweight-boxy-graphic-tee-dhaka-cyber",
        status: "active",
        vendor: "Hands & Head",
        productType: "Tees & Apparel",
        description: "260 GSM combed cotton vintage acid-washed oversized streetwear tee with high-density screenprint and reinforced ribbed collar.",
        tags: ["tee", "tshirt", "oversized", "streetwear", "acid-wash", "apparel"],
        pricing: { price: 1850, compareAtPrice: 2400, cost: 750, currency: "BDT" },
        images: [
          { url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80", alt: "Heavyweight Boxy Graphic Tee" },
          { url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80", alt: "Tee Back View" }
        ],
        variants: [
          { id: "v-tee-m", title: "Vintage Washed Black / M", sku: "HH-TEE-01-M", price: 1850, inventoryQty: 45, availableForSale: true },
          { id: "v-tee-l", title: "Vintage Washed Black / L", sku: "HH-TEE-01-L", price: 1850, inventoryQty: 60, availableForSale: true },
          { id: "v-tee-xl", title: "Vintage Washed Black / XL", sku: "HH-TEE-01-XL", price: 1850, inventoryQty: 30, availableForSale: true }
        ],
        totalInventory: 135,
        lowStockThreshold: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-tee-02",
        title: "Artisanal Raw-Hem Oversized Drop Tee",
        handle: "artisanal-raw-hem-oversized-drop-tee",
        status: "active",
        vendor: "Hands & Head",
        productType: "Tees & Apparel",
        description: "240 GSM organic slub cotton drop-shoulder silhouette with raw-cut distressed hems and tonal embroidered chest emblem.",
        tags: ["tee", "tshirt", "raw-hem", "streetwear", "apparel", "minimalist"],
        pricing: { price: 1650, compareAtPrice: 2100, cost: 680, currency: "BDT" },
        images: [
          { url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80", alt: "Raw-Hem Drop Tee" }
        ],
        variants: [
          { id: "v-tee-raw-l", title: "Bone White / L", sku: "HH-TEE-02-L", price: 1650, inventoryQty: 50, availableForSale: true },
          { id: "v-tee-raw-xl", title: "Bone White / XL", sku: "HH-TEE-02-XL", price: 1650, inventoryQty: 38, availableForSale: true }
        ],
        totalInventory: 88,
        lowStockThreshold: 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-tee-03",
        title: "Architectural Cutout Leather-Pocket Tee",
        handle: "architectural-cutout-leather-pocket-tee",
        status: "active",
        vendor: "Hands & Head",
        productType: "Tees & Apparel",
        description: "Heavy 280 GSM French terry tee featuring genuine vegetable-tanned leather utility patch pocket with antique brass rivet.",
        tags: ["tee", "leather-trim", "luxury", "apparel", "streetwear"],
        pricing: { price: 2450, compareAtPrice: 2950, cost: 950, currency: "BDT" },
        images: [
          { url: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80", alt: "Leather Pocket Tee" }
        ],
        variants: [
          { id: "v-tee-pock-m", title: "Charcoal Slate / M", sku: "HH-TEE-03-M", price: 2450, inventoryQty: 32, availableForSale: true },
          { id: "v-tee-pock-l", title: "Charcoal Slate / L", sku: "HH-TEE-03-L", price: 2450, inventoryQty: 40, availableForSale: true }
        ],
        totalInventory: 72,
        lowStockThreshold: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
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
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    let items = [];
    const col = this._getCollection();

    try {
      let q = col;

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
        console.debug("Firestore product order fallback:", e?.message);
      }

      const snap = await q.limit(this.PAGE_SIZE).get();
      if (snap && !snap.empty) {
        items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        this._lastDoc = snap.docs[snap.docs.length - 1] || null;
      }
    } catch (err) {
      console.warn("Firestore products fetch notice:", err?.message);
    }

    // Auto-seed cloud Firestore collection if empty on first boot so data is globally available across all devices
    if (!items.length && (!status || status === "all") && !search && !productType && !vendor) {
      if (this._memCache && this._memCache.length) {
        items = [...this._memCache];
      } else {
        const seedProducts = this._getDefaultSeedProducts();
        try {
          const batch = window.db.batch();
          seedProducts.forEach(p => {
            const ref = col.doc(p.id);
            batch.set(ref, p);
          });
          await batch.commit();
          items = seedProducts;
          this._memCache = [...seedProducts];
        } catch (seedErr) {
          console.debug("Firestore product seeding note:", seedErr?.message);
          items = seedProducts;
          this._memCache = [...seedProducts];
        }
      }
    } else if (items.length) {
      this._memCache = items;
    } else if (this._memCache && this._memCache.length) {
      items = [...this._memCache];
      if (status && status !== "all") items = items.filter(p => p.status === status);
      if (productType && productType !== "all") items = items.filter(p => p.productType === productType);
      if (vendor && vendor !== "all") items = items.filter(p => p.vendor === vendor);
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

    // Sync cloud backup endpoint in background
    try {
      fetch("/api/products?limit=100").catch(() => {});
    } catch (e) {}

    return { items, count: items.length };
  },

  /* ── Get All Cached Products (Synchronous Access) ── */
  getAll() {
    return this._memCache.length ? this._memCache : this._getDefaultSeedProducts();
  },

  async get(productId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();

    // 1. Direct Global Firestore Document Fetch
    try {
      const doc = await col.doc(productId).get();
      if (doc.exists) {
        const data = { id: doc.id, ...doc.data() };
        const idx = this._memCache.findIndex(p => p.id === productId);
        if (idx !== -1) this._memCache[idx] = data;
        else this._memCache.unshift(data);
        return data;
      }
    } catch (e) {
      console.warn("Firestore get product notice:", e?.message);
    }

    // 2. Query Firestore by Handle if not found by doc id
    try {
      const snap = await col.where("handle", "==", productId).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = { id: doc.id, ...doc.data() };
        return data;
      }
    } catch (e) {}

    // 3. In-memory cache fallback
    return this._memCache.find(p => p.id === productId || p.handle === productId) || null;
  },

  /* ── Create Product ── */
  async create(data) {
    await this._ensureInit();
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

    const col = this._getCollection();
    const docRef = data.id ? col.doc(data.id) : col.doc();
    const newId = docRef.id;

    const payload = {
      id: newId,
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

    // 1. Strictly persist to global Cloud Firestore collection
    await docRef.set(payload);
    await this._syncInventory(newId, totalInventory);
    await this._logActivity("product_created", newId, payload.title);

    // 2. Server persistence backup for cross-system consistency
    try {
      fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (apiErr) {}

    // Update in-memory cache
    const existingIdx = this._memCache.findIndex(p => p.id === newId);
    if (existingIdx !== -1) {
      this._memCache[existingIdx] = payload;
    } else {
      this._memCache.unshift(payload);
    }

    if (window.NexEvents) {
      window.NexEvents.emit("PRODUCTS_CHANGED", payload);
      window.NexEvents.emit("DATA_SYNC", { type: "product_created", product: payload });
    }

    return newId;
  },

  /* ── Update Product ── */
  async update(productId, data) {
    await this._ensureInit();
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

    const col = this._getCollection();

    // 1. Strictly update in global Cloud Firestore collection
    await col.doc(productId).set(patch, { merge: true });
    if (patch.totalInventory !== undefined) {
      await this._syncInventory(productId, patch.totalInventory);
    }
    await this._logActivity("product_updated", productId, data.title || "");

    // 2. Server persistence backup
    try {
      fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      }).catch(() => {});
    } catch (apiErr) {}

    // Update in-memory cache
    const idx = this._memCache.findIndex(p => p.id === productId);
    if (idx !== -1) {
      this._memCache[idx] = { ...this._memCache[idx], ...patch };
    }

    if (window.NexEvents) {
      window.NexEvents.emit("PRODUCTS_CHANGED", { id: productId, ...patch });
    }

    return true;
  },

  /* ── Archive Product ── */
  async archive(productId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();
    await col.doc(productId).update({
      status: "archived",
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
    });
    await this._logActivity("product_archived", productId);

    try {
      fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" })
      }).catch(() => {});
    } catch (e) {}

    const idx = this._memCache.findIndex(p => p.id === productId);
    if (idx !== -1) {
      this._memCache[idx].status = "archived";
    }

    if (window.NexEvents) {
      window.NexEvents.emit("PRODUCTS_CHANGED", { id: productId, status: "archived" });
    }

    return true;
  },

  /* ── Unarchive / Activate Product ── */
  async activate(productId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();
    await col.doc(productId).update({
      status: "active",
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
    });
    await this._logActivity("product_activated", productId);

    try {
      fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" })
      }).catch(() => {});
    } catch (e) {}

    const idx = this._memCache.findIndex(p => p.id === productId);
    if (idx !== -1) {
      this._memCache[idx].status = "active";
    }

    if (window.NexEvents) {
      window.NexEvents.emit("PRODUCTS_CHANGED", { id: productId, status: "active" });
    }

    return true;
  },

  /* ── Delete Product ── */
  async delete(productId) {
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();
    // Strictly delete from global Cloud Firestore collection
    await col.doc(productId).delete();
    await this._logActivity("product_deleted", productId);

    try {
      fetch(`/api/products/${encodeURIComponent(productId)}`, { method: "DELETE" }).catch(() => {});
    } catch (e) {}

    this._memCache = this._memCache.filter(p => p.id !== productId);

    if (window.NexEvents) {
      window.NexEvents.emit("PRODUCTS_CHANGED", { id: productId, deleted: true });
    }

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
      images: Array.isArray(original.images) ? original.images.map(img => (typeof img === 'object' && img !== null ? { ...img } : img)) : [],
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
    await this._ensureInit();
    try { await window.NexAuth.ensureAuth(); } catch (e) {}

    const col = this._getCollection();
    const productRef = col.doc(productId);

    try {
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
        tx.update(productRef, {
          variants,
          totalInventory,
          updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
        });
      });

      const invMovCol = window.Collections?.inventoryMovements || window.db.collection("inventory_movements");
      await invMovCol.add({
        productId,
        variantId: variantId || "default",
        delta: Number(delta),
        reason,
        createdAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
        by: window.NexAuth?.currentUser?.uid || "operator"
      });
    } catch (e) {
      console.warn("Firestore inventory adjust notice:", e.message);
    }

    // Refresh memory cache for this product
    const updated = await this.get(productId);
    if (updated && window.NexEvents) {
      window.NexEvents.emit("PRODUCTS_CHANGED", updated);
    }

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

/* ═══════════════════════════════════════════════════════════════
   Hands & Head — Asset Source Service
   Syncs & manages lookbook photos from handfilm.handsandhead.com
   and Google Drive Asset repositories for Tees, Apparel & Leather
   ═══════════════════════════════════════════════════════════════ */
window.AssetSourceService = {
  DEFAULT_SOURCE_URL: "https://handfilm.handsandhead.com/pages/handsandhead",
  
  _sourceUrl: null,

  getSourceUrl() {
    return this._sourceUrl || this.DEFAULT_SOURCE_URL;
  },

  setSourceUrl(url) {
    if (!url || !url.trim()) url = this.DEFAULT_SOURCE_URL;
    this._sourceUrl = url.trim();
    return this._sourceUrl;
  },

  /* Curated High-Definition Lookbook Asset Feed */
  getCuratedAssets() {
    return [
      {
        id: "ast-tee-01",
        title: "Vintage Acid Wash Cyber Tee",
        collection: "Tees & Streetwear",
        category: "Tees & Apparel",
        gsm: "260 GSM",
        fabric: "Combed Organic Cotton",
        price: 1850,
        url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=900&auto=format&fit=crop&q=85",
        driveRef: "Drive://H&H-2026/Tees/AcidWash_01.jpg"
      },
      {
        id: "ast-tee-02",
        title: "Artisanal Raw-Hem Boxy Silhouette",
        collection: "Tees & Streetwear",
        category: "Tees & Apparel",
        gsm: "240 GSM",
        fabric: "Slub Cotton Distressed",
        price: 1650,
        url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900&auto=format&fit=crop&q=85",
        driveRef: "Drive://H&H-2026/Tees/RawHem_Drop.jpg"
      },
      {
        id: "ast-tee-03",
        title: "Leather Pocket Heavyweight Tee",
        collection: "Tees & Streetwear",
        category: "Tees & Apparel",
        gsm: "280 GSM",
        fabric: "French Terry + Veg-Tan Leather",
        price: 2450,
        url: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=900&auto=format&fit=crop&q=85",
        driveRef: "Drive://H&H-2026/Tees/LeatherPocket_Slate.jpg"
      },
      {
        id: "ast-tee-04",
        title: "Minimalist Typography Dhaka Editorial Tee",
        collection: "Tees & Streetwear",
        category: "Tees & Apparel",
        gsm: "250 GSM",
        fabric: "Compact Ring-Spun Cotton",
        price: 1750,
        url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900&auto=format&fit=crop&q=85",
        driveRef: "Drive://H&H-2026/Tees/Editorial_Typography.jpg"
      },
      {
        id: "ast-tee-05",
        title: "Oversized Street Hoodie — Obsidian Black",
        collection: "Tees & Streetwear",
        category: "Tees & Apparel",
        gsm: "420 GSM",
        fabric: "Loopback Heavy Cotton",
        price: 3850,
        url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=900&auto=format&fit=crop&q=85",
        driveRef: "Drive://H&H-2026/Apparel/Obsidian_Hoodie.jpg"
      },
      {
        id: "ast-lea-01",
        title: "Full-Grain Leather Bi-Fold Wallet",
        collection: "Leather Goods",
        category: "Leather Goods",
        gsm: "1.4mm Cowhide",
        fabric: "Veg-Tanned Leather",
        price: 2850,
        url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=900&auto=format&fit=crop&q=85",
        driveRef: "Drive://H&H-2026/Leather/BiFold_Tan.jpg"
      },
      {
        id: "ast-lea-02",
        title: "Executive Brass-Hardware Briefcase",
        collection: "Leather Goods",
        category: "Bags",
        gsm: "2.0mm Bridle Leather",
        fabric: "Full-Grain Oil-Pull",
        price: 18500,
        url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&auto=format&fit=crop&q=85",
        driveRef: "Drive://H&H-2026/Leather/Briefcase_Midnight.jpg"
      },
      {
        id: "ast-lea-03",
        title: "Artisanal Oxford Brogues Patina",
        collection: "Footwear",
        category: "Footwear",
        gsm: "Welted Sole",
        fabric: "Hand-Burnished Calfskin",
        price: 14200,
        url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=900&auto=format&fit=crop&q=85",
        driveRef: "Drive://H&H-2026/Footwear/Oxford_Burgundy.jpg"
      }
    ];
  },

  /* 1-Click Import Asset to Product Catalog */
  async importAssetAsProduct(assetId) {
    const asset = this.getCuratedAssets().find(a => a.id === assetId);
    if (!asset) throw new Error("Asset not found");

    const newProd = {
      title: asset.title,
      productType: asset.category,
      description: `${asset.gsm} · ${asset.fabric}. Sourced from Hands & Head Drive Master Asset repository (${this.getSourceUrl()}).`,
      tags: ["asset-import", "tees", "fashion", "lookbook", "drive-sync"],
      price: asset.price,
      compareAtPrice: Math.round(asset.price * 1.25),
      stock: 35,
      images: [{ url: asset.url, alt: asset.title }],
      status: "active"
    };

    return await window.ProductsService.create(newProd);
  }
};

window.ProductsService.createProduct = window.ProductsService.create.bind(window.ProductsService);
window.ProductsService.updateProduct = window.ProductsService.update.bind(window.ProductsService);


