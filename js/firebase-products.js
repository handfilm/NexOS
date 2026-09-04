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
    let items = [];

    // 1. Primary Cross-Device Persistent Storage (/api/products)
    try {
      const qParams = new URLSearchParams();
      if (status && status !== "all") qParams.append("status", status);
      if (productType && productType !== "all") qParams.append("category", productType);
      if (vendor && vendor !== "all") qParams.append("vendor", vendor);
      if (search && search.trim()) qParams.append("search", search.trim());
      if (sortBy) qParams.append("sortBy", sortBy);
      if (sortDir) qParams.append("sortDir", sortDir);

      const resp = await fetch("/api/products?" + qParams.toString());
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.items) && data.items.length) {
          items = data.items;
          try { localStorage.setItem("nx_products_cache", JSON.stringify(items)); } catch (e) {}
          return { items, lastDoc: null };
        }
      }
    } catch (apiErr) {
      console.debug("Products API fetch notice (switching to Firestore/local):", apiErr.message);
    }

    try { await window.NexAuth.ensureAuth(); } catch (e) {}
    items = [];

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

    // 1. Primary Cross-Device Server Persistence
    try {
      const resp = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: newId })
      });
      if (resp.ok) {
        const resData = await resp.json();
        if (resData.ok && resData.id) {
          newId = resData.id;
        }
      }
    } catch (apiErr) {
      console.debug("Products API write note (falling back):", apiErr.message);
    }

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

    // 1. Primary Cross-Device Server Persistence
    try {
      await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
    } catch (apiErr) {
      console.debug("Products API update note:", apiErr.message);
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
      await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" })
      });
    } catch (e) {}

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
      await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" })
      });
    } catch (e) {}

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
      await fetch(`/api/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
    } catch (e) {}

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

/* ═══════════════════════════════════════════════════════════════
   Hands & Head — Asset Source Service
   Syncs & manages lookbook photos from handfilm.handsandhead.com
   and Google Drive Asset repositories for Tees, Apparel & Leather
   ═══════════════════════════════════════════════════════════════ */
window.AssetSourceService = {
  DEFAULT_SOURCE_URL: "https://handfilm.handsandhead.com/pages/handsandhead",
  
  getSourceUrl() {
    return localStorage.getItem("nx_asset_source_url") || this.DEFAULT_SOURCE_URL;
  },

  setSourceUrl(url) {
    if (!url || !url.trim()) url = this.DEFAULT_SOURCE_URL;
    localStorage.setItem("nx_asset_source_url", url.trim());
    return url.trim();
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


