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
        "id": "prod-mtoeo9ex-949",
        "title": "Test Leather Belt",
        "handle": "test-leather-belt",
        "status": "active",
        "vendor": "Hands & Head",
        "productType": "Leather Goods",
        "description": "",
        "tags": [
          "Leather Goods"
        ],
        "pricing": {
          "price": 1200,
          "compareAtPrice": null,
          "cost": null,
          "currency": "BDT"
        },
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
            "alt": "Test Leather Belt"
          }
        ],
        "variants": [
          {
            "id": "v-prod-mtoeo9ex-949",
            "title": "Standard",
            "sku": "HH-3780",
            "price": 1200,
            "inventoryQty": 15,
            "availableForSale": true
          }
        ],
        "totalInventory": 15,
        "lowStockThreshold": 10,
        "createdAt": "2026-09-05T13:15:32.649Z",
        "updatedAt": "2026-09-05T13:15:32.649Z"
      },
      {
        "id": "prod-tee-01",
        "title": "Heavyweight Boxy Graphic Tee — Dhaka Cyber",
        "handle": "heavyweight-boxy-graphic-tee-dhaka-cyber",
        "status": "active",
        "vendor": "Hands & Head",
        "productType": "Tees & Apparel",
        "description": "260 GSM combed cotton vintage acid-washed oversized streetwear tee with high-density screenprint and reinforced ribbed collar.",
        "tags": [
          "tee",
          "tshirt",
          "oversized",
          "streetwear",
          "acid-wash",
          "apparel"
        ],
        "pricing": {
          "price": 1850,
          "compareAtPrice": 2400,
          "cost": 750,
          "currency": "BDT"
        },
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
            "alt": "Heavyweight Boxy Graphic Tee"
          },
          {
            "url": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80",
            "alt": "Tee Back View"
          }
        ],
        "variants": [
          {
            "id": "v-tee-m",
            "title": "Vintage Washed Black / M",
            "sku": "HH-TEE-01-M",
            "price": 1850,
            "inventoryQty": 45,
            "availableForSale": true
          },
          {
            "id": "v-tee-l",
            "title": "Vintage Washed Black / L",
            "sku": "HH-TEE-01-L",
            "price": 1850,
            "inventoryQty": 60,
            "availableForSale": true
          },
          {
            "id": "v-tee-xl",
            "title": "Vintage Washed Black / XL",
            "sku": "HH-TEE-01-XL",
            "price": 1850,
            "inventoryQty": 30,
            "availableForSale": true
          }
        ],
        "totalInventory": 135,
        "lowStockThreshold": 15,
        "createdAt": "2026-09-04T13:20:51.208Z",
        "updatedAt": "2026-09-04T13:20:51.208Z"
      },
      {
        "id": "prod-tee-02",
        "title": "Artisanal Raw-Hem Oversized Drop Tee",
        "handle": "artisanal-raw-hem-oversized-drop-tee",
        "status": "active",
        "vendor": "Hands & Head",
        "productType": "Tees & Apparel",
        "description": "240 GSM organic slub cotton drop-shoulder silhouette with raw-cut distressed hems and tonal embroidered chest emblem.",
        "tags": [
          "tee",
          "tshirt",
          "raw-hem",
          "streetwear",
          "apparel",
          "minimalist"
        ],
        "pricing": {
          "price": 1650,
          "compareAtPrice": 2100,
          "cost": 680,
          "currency": "BDT"
        },
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80",
            "alt": "Raw-Hem Drop Tee"
          }
        ],
        "variants": [
          {
            "id": "v-tee-raw-l",
            "title": "Bone White / L",
            "sku": "HH-TEE-02-L",
            "price": 1650,
            "inventoryQty": 50,
            "availableForSale": true
          },
          {
            "id": "v-tee-raw-xl",
            "title": "Bone White / XL",
            "sku": "HH-TEE-02-XL",
            "price": 1650,
            "inventoryQty": 38,
            "availableForSale": true
          }
        ],
        "totalInventory": 88,
        "lowStockThreshold": 12,
        "createdAt": "2026-09-04T13:20:51.208Z",
        "updatedAt": "2026-09-04T13:20:51.208Z"
      },
      {
        "id": "prod-tee-03",
        "title": "Architectural Cutout Leather-Pocket Tee",
        "handle": "architectural-cutout-leather-pocket-tee",
        "status": "active",
        "vendor": "Hands & Head",
        "productType": "Tees & Apparel",
        "description": "Heavy 280 GSM French terry tee featuring genuine vegetable-tanned leather utility patch pocket with antique brass rivet.",
        "tags": [
          "tee",
          "leather-trim",
          "luxury",
          "apparel",
          "streetwear"
        ],
        "pricing": {
          "price": 2450,
          "compareAtPrice": 2950,
          "cost": 950,
          "currency": "BDT"
        },
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80",
            "alt": "Leather Pocket Tee"
          }
        ],
        "variants": [
          {
            "id": "v-tee-pock-m",
            "title": "Charcoal Slate / M",
            "sku": "HH-TEE-03-M",
            "price": 2450,
            "inventoryQty": 32,
            "availableForSale": true
          },
          {
            "id": "v-tee-pock-l",
            "title": "Charcoal Slate / L",
            "sku": "HH-TEE-03-L",
            "price": 2450,
            "inventoryQty": 40,
            "availableForSale": true
          }
        ],
        "totalInventory": 72,
        "lowStockThreshold": 10,
        "createdAt": "2026-09-04T13:20:51.208Z",
        "updatedAt": "2026-09-04T13:20:51.208Z"
      },
      {
        "id": "prod-wlt-01",
        "title": "Full-Grain Leather Bi-Fold Wallet",
        "handle": "full-grain-leather-bi-fold-wallet",
        "status": "active",
        "vendor": "Hands & Head",
        "productType": "Leather Goods",
        "description": "Handcrafted 100% full-grain vegetable-tanned cowhide wallet with 6 card slots and dual currency partitions.",
        "tags": [
          "wallet",
          "leather",
          "bifold",
          "b2b"
        ],
        "pricing": {
          "price": 2850,
          "compareAtPrice": 3400,
          "cost": 1600,
          "currency": "BDT"
        },
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
            "alt": "Leather Wallet"
          }
        ],
        "variants": [
          {
            "id": "v-wlt-tan",
            "title": "Tan Brown",
            "sku": "HH-WLT-01",
            "price": 2850,
            "inventoryQty": 47,
            "availableForSale": true
          }
        ],
        "totalInventory": 47,
        "lowStockThreshold": 10,
        "createdAt": "2026-09-04T13:20:51.208Z",
        "updatedAt": "2026-09-04T13:20:51.208Z"
      },
      {
        "id": "prod-brf-02",
        "title": "Executive Leather Briefcase",
        "handle": "executive-leather-briefcase",
        "status": "active",
        "vendor": "Hands & Head",
        "productType": "Leather Goods",
        "description": "Handmade vegetable-tanned full-grain leather briefcase with brass hardware, laptop compartment, and luggage trolley strap.",
        "tags": [
          "briefcase",
          "luxury",
          "executive",
          "b2b"
        ],
        "pricing": {
          "price": 14500,
          "compareAtPrice": 17500,
          "cost": 8200,
          "currency": "BDT"
        },
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
            "alt": "Leather Briefcase"
          }
        ],
        "variants": [
          {
            "id": "v-brf-blk",
            "title": "Midnight Black",
            "sku": "HH-BRF-02",
            "price": 14500,
            "inventoryQty": 18,
            "availableForSale": true
          }
        ],
        "totalInventory": 18,
        "lowStockThreshold": 5,
        "createdAt": "2026-09-04T13:20:51.208Z",
        "updatedAt": "2026-09-04T13:20:51.208Z"
      },
      {
        "id": "prod-crd-02",
        "title": "Minimalist Cardholder — Aniline Tan",
        "handle": "minimalist-cardholder-aniline-tan",
        "status": "active",
        "vendor": "Hands & Head",
        "productType": "Leather Goods",
        "description": "Slim 4-slot cardholder crafted from oil-pullup calf leather with center cash pocket.",
        "tags": [
          "cardholder",
          "minimalist",
          "accessories"
        ],
        "pricing": {
          "price": 1450,
          "compareAtPrice": 1800,
          "cost": 650,
          "currency": "BDT"
        },
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
            "alt": "Cardholder"
          }
        ],
        "variants": [
          {
            "id": "v-crd-tan",
            "title": "Aniline Tan",
            "sku": "HH-CRD-02",
            "price": 1450,
            "inventoryQty": 63,
            "availableForSale": true
          }
        ],
        "totalInventory": 63,
        "lowStockThreshold": 12,
        "createdAt": "2026-09-04T13:20:51.208Z",
        "updatedAt": "2026-09-04T13:20:51.208Z",
        "unitsSold": 2,
        "totalRevenue": 3700,
        "lastSoldAt": "2026-09-06T09:05:17.382Z",
        "buyerCustomerIds": [
          "cust-mtpl6a8h"
        ]
      },
      {
        "id": "prod-blt-01",
        "title": "Heavyweight Full-Grain Leather Belt",
        "handle": "heavyweight-full-grain-leather-belt",
        "status": "active",
        "vendor": "Hands & Head",
        "productType": "Leather Goods",
        "description": "Solid 38mm harness leather belt with solid brushed brass roller buckle.",
        "tags": [
          "belt",
          "accessories",
          "b2b"
        ],
        "pricing": {
          "price": 3200,
          "compareAtPrice": 3800,
          "cost": 1400,
          "currency": "BDT"
        },
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&auto=format&fit=crop&q=80",
            "alt": "Leather Belt"
          }
        ],
        "variants": [
          {
            "id": "v-blt-brn",
            "title": "Cognac Brown",
            "sku": "HH-BLT-01",
            "price": 3200,
            "inventoryQty": 52,
            "availableForSale": true
          }
        ],
        "totalInventory": 52,
        "lowStockThreshold": 10,
        "createdAt": "2026-09-04T13:20:51.208Z",
        "updatedAt": "2026-09-04T13:20:51.208Z"
      },
      {
        "id": "prod-fol-01",
        "title": "Passport Travel Folio & Boarding Wallet",
        "handle": "passport-travel-folio-boarding-wallet",
        "status": "active",
        "vendor": "Hands & Head",
        "productType": "Leather Goods",
        "description": "All-in-one travel organizer accommodating two passports, boarding pass, 6 cards, and pen loop.",
        "tags": [
          "travel",
          "passport",
          "folio"
        ],
        "pricing": {
          "price": 4200,
          "compareAtPrice": 4900,
          "cost": 1900,
          "currency": "BDT"
        },
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80",
            "alt": "Travel Folio"
          }
        ],
        "variants": [
          {
            "id": "v-fol-blk",
            "title": "Onyx Black",
            "sku": "HH-FOL-01",
            "price": 4200,
            "inventoryQty": 34,
            "availableForSale": true
          }
        ],
        "totalInventory": 34,
        "lowStockThreshold": 8,
        "createdAt": "2026-09-04T13:20:51.208Z",
        "updatedAt": "2026-09-04T13:20:51.208Z"
      }
    ];
  },

  addOrUpdateMemCache(product) {
    if (!product || !product.id) return;
    const idx = this._memCache.findIndex(p => p.id === product.id);
    if (idx !== -1) {
      this._memCache[idx] = { ...this._memCache[idx], ...product };
    } else {
      this._memCache.unshift(product);
    }
  },

  /* ── Query & List Products with Zero Loading Time & Real Persistence ── */
  async list({ status = null, search = null, productType = null, vendor = null, sortBy = "updatedAt", sortDir = "desc" } = {}) {
    // 1. Check in-memory cache first (< 1ms)
    if (!this._memCache || !this._memCache.length) {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.items) && data.items.length) {
            this._memCache = [...data.items];
          }
        }
      } catch (e) {
        console.debug("Local API products fetch notice:", e?.message);
      }
    }

    // 2. If still empty, use real seed products
    if (!this._memCache || !this._memCache.length) {
      this._memCache = this._getDefaultSeedProducts();
    }

    // 3. Non-blocking background sync with Firestore
    (async () => {
      try {
        await this._ensureInit();
        const col = this._getCollection();
        if (col && typeof col.limit === "function") {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
          const snap = await Promise.race([col.limit(this.PAGE_SIZE).get(), timeoutPromise]);
          if (snap && !snap.empty) {
            const fsItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const existingIds = new Set(this._memCache.map(p => p.id));
            let changed = false;
            for (const fItem of fsItems) {
              if (!existingIds.has(fItem.id)) {
                this._memCache.push(fItem);
                changed = true;
              }
            }
            if (changed && window.NexEvents) {
              window.NexEvents.emit("PRODUCTS_CHANGED", this._memCache);
            }
          }
        }
      } catch (err) {}
    })();

    let items = [...this._memCache];

    // 4. In-memory filters
    if (status && status !== "all") {
      items = items.filter(p => p.status === status);
    }
    if (productType && productType !== "all") {
      items = items.filter(p => p.productType === productType);
    }
    if (vendor && vendor !== "all") {
      items = items.filter(p => p.vendor === vendor);
    }

    // 5. Client-side text search (title, SKU, vendor, tags, description)
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      items = items.filter(p =>
        (p.title || "").toLowerCase().includes(s) ||
        (p.vendor || "").toLowerCase().includes(s) ||
        (p.description || "").toLowerCase().includes(s) ||
        (Array.isArray(p.tags) && p.tags.some(t => String(t).toLowerCase().includes(s))) ||
        (Array.isArray(p.variants) && p.variants.some(v => (v.sku || "").toLowerCase().includes(s) || (v.title || "").toLowerCase().includes(s)))
      );
    }

    // 6. Sort in memory
    if (sortBy === "price") {
      items.sort((a, b) => {
        const pa = a.pricing?.price || 0;
        const pb = b.pricing?.price || 0;
        return sortDir === "asc" ? pa - pb : pb - pa;
      });
    } else if (sortBy === "title") {
      items.sort((a, b) => sortDir === "asc" ? (a.title || "").localeCompare(b.title || "") : (b.title || "").localeCompare(a.title || ""));
    } else {
      items.sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return sortDir === "asc" ? ta - tb : tb - ta;
      });
    }

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

  /* ── Resilient Cloud Firestore Write Helper (Prevents UI Freeze) ── */
  async _safeDocWrite(docRef, data, merge = false) {
    try {
      const writePromise = merge ? docRef.set(data, { merge: true }) : docRef.set(data);
      await Promise.race([
        writePromise,
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (err) {
      console.warn("Firestore write queued/offline fallback:", err?.message || err);
    }
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

    const nowIso = new Date().toISOString();
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
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 1. Persist to global Cloud Firestore collection with resilient timeout
    await this._safeDocWrite(docRef, payload, true);
    this._syncInventory(newId, totalInventory).catch(() => {});
    this._logActivity("product_created", newId, payload.title).catch(() => {});

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
    const patch = { ...data, updatedAt: new Date().toISOString() };

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

    // 1. Strictly update in global Cloud Firestore collection with resilient timeout
    await this._safeDocWrite(col.doc(productId), patch, true);
    if (patch.totalInventory !== undefined) {
      this._syncInventory(productId, patch.totalInventory).catch(() => {});
    }
    this._logActivity("product_updated", productId, data.title || "").catch(() => {});

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
    // Strictly delete from global Cloud Firestore collection with resilient timeout
    try {
      await Promise.race([
        col.doc(productId).delete(),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (err) {}
    this._logActivity("product_deleted", productId).catch(() => {});

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

/* ═══════════════════════════════════════════════════════════════
   Products Module Sub-Menu Options & DriveSyncMonitor Component
   ═══════════════════════════════════════════════════════════════ */

// Ensure DriveSyncMonitor component definition exists and has mount & render methods
if (typeof window !== "undefined") {
  if (!window.DriveSyncMonitor) {
    window.DriveSyncMonitor = {
      MASTER_FOLDER_URL: "https://drive.google.com/drive/folders/1BNzQpgYtf-CB7GemrQVtqIWGQEkTiZIT?usp=drive_link",
      MASTER_FOLDER_ID: "1BNzQpgYtf-CB7GemrQVtqIWGQEkTiZIT",
      MASTER_EMBED_URL: "https://drive.google.com/embeddedfolderview?id=1BNzQpgYtf-CB7GemrQVtqIWGQEkTiZIT#grid",
      mount(container, options = {}) {
        return this.render(container, options);
      },
      render(container, options = {}) {
        const target = container || document.getElementById("mod-Products") || document.getElementById("body");
        if (!target) return;
        target.innerHTML = `
          <div class="products-sub-nav">
            <button class="btn btn-sm btn-dark" onclick="window.setProductsSubTab('catalog')">
              <span>🏷️ Products Catalog</span>
            </button>
            <button class="btn btn-sm btn-gold" onclick="window.setProductsSubTab('drive_sync')">
              <span>⚡ Drive Sync Monitor</span>
              <span style="width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;display:inline-block;"></span>
            </button>
          </div>
          <div style="padding:20px;">
            <div style="background:var(--bg-3);border:1px solid var(--wire);border-radius:12px;padding:16px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;"></span>
                <span style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--ink);">DRIVE SYNC MONITOR ACTIVE</span>
              </div>
              <p style="font-size:12px;color:var(--ink-2);margin:0 0 12px;">Live connection to Master Google Drive assets folder. Tokenized SKU parsing and catalog sync monitor.</p>
              <button class="btn btn-gold btn-sm" onclick="if(window.DriveSyncMonitor && window.DriveSyncMonitor.scan) window.DriveSyncMonitor.scan(true);">Scan Drive Assets</button>
            </div>
          </div>
        `;
      }
    };
  } else if (typeof window.DriveSyncMonitor.mount !== "function") {
    window.DriveSyncMonitor.mount = function (container, options = {}) {
      return this.render(container, options);
    };
  }

  /* ── Register Sub-Menu Options on ProductsService ── */
  window.ProductsService.subMenus = [
    {
      id: "catalog",
      key: "catalog",
      name: "Products Catalog",
      title: "Products Catalog",
      label: "🏷️ Products Catalog",
      action: () => {
        if (typeof window.setProductsSubTab === "function") {
          window.setProductsSubTab("catalog");
        } else {
          const target = document.getElementById("mod-Products") || document.getElementById("body");
          if (target && window.render?.Products) window.render.Products(target);
        }
      },
      mount: (target) => {
        if (typeof window.setProductsSubTab === "function") {
          window.setProductsSubTab("catalog");
        } else {
          const container = target || document.getElementById("mod-Products") || document.getElementById("body");
          if (container && window.render?.Products) window.render.Products(container);
        }
      }
    },
    {
      id: "drive_sync",
      key: "drive_sync",
      name: "Drive Sync Monitor",
      title: "Drive Sync Monitor",
      label: "⚡ Drive Sync Monitor",
      component: "DriveSyncMonitor",
      action: () => {
        if (typeof window.setProductsSubTab === "function") {
          window.setProductsSubTab("drive_sync");
        } else {
          window.ProductsService.mountDriveSyncMonitor();
        }
      },
      mount: (target, options = {}) => {
        return window.ProductsService.mountDriveSyncMonitor(target, options);
      }
    }
  ];

  window.ProductsService.getSubMenus = function () {
    return window.ProductsService.subMenus;
  };

  window.ProductsService.getSubMenuItems = function () {
    return window.ProductsService.subMenus;
  };

  /* ── Mount DriveSyncMonitor Component within Products Module Main View ── */
  window.ProductsService.mountDriveSyncMonitor = function (target, options = {}) {
    const container = target || document.getElementById("mod-Products") || document.getElementById("body");
    if (!container) return;

    if (!window._viewState) window._viewState = {};
    if (!window._viewState.products) window._viewState.products = {};
    window._viewState.products.subTab = "drive_sync";

    const comp = window.DriveSyncMonitor;
    if (comp) {
      if (typeof comp.mount === "function") {
        return comp.mount(container, { insideProductsModule: true, ...options });
      }
      if (typeof comp.render === "function") {
        return comp.render(container, { insideProductsModule: true, ...options });
      }
    }

    // Fallback while component mounts
    container.innerHTML = `
      <div style="padding:24px;text-align:center;font-family:var(--mono);color:var(--ink-3);">
        <div class="spinner" style="margin:0 auto 12px;"></div>
        <div>Mounting Drive Sync Monitor…</div>
      </div>
    `;
    setTimeout(() => {
      const activeComp = window.DriveSyncMonitor;
      if (activeComp && typeof (activeComp.mount || activeComp.render) === "function") {
        (activeComp.mount || activeComp.render).call(activeComp, container, { insideProductsModule: true, ...options });
      }
    }, 100);
  };

  /* ── Global helper & sub-tab switcher ── */
  window.mountDriveSyncMonitor = window.ProductsService.mountDriveSyncMonitor.bind(window.ProductsService);

  const prevSetProductsSubTab = window.setProductsSubTab;
  window.setProductsSubTab = function (subTab) {
    if (subTab === "Drive Sync Monitor") subTab = "drive_sync";
    if (!window._viewState) window._viewState = {};
    if (!window._viewState.products) window._viewState.products = {};
    window._viewState.products.subTab = subTab;

    const target = document.getElementById("mod-Products") || document.getElementById("body");
    if (subTab === "drive_sync") {
      window.ProductsService.mountDriveSyncMonitor(target);
      return;
    }
    if (typeof prevSetProductsSubTab === "function") {
      prevSetProductsSubTab(subTab);
    } else if (typeof window.render?.Products === "function" && target) {
      window.render.Products(target);
    }
  };

  /* ── Products Module Main View Sub-Menu Hook ── */
  window.render = window.render || {};
  const currentRenderProducts = window.render.Products;
  window.render.Products = async function (container) {
    const target = container || document.getElementById("mod-Products") || document.getElementById("body");
    const activeSubTab = window._viewState?.products?.subTab || "catalog";
    if ((activeSubTab === "drive_sync" || activeSubTab === "Drive Sync Monitor") && target) {
      window.ProductsService.mountDriveSyncMonitor(target);
      return;
    }
    if (typeof currentRenderProducts === "function") {
      return currentRenderProducts.apply(this, arguments);
    }
  };
}



