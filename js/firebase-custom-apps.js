/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-custom-apps.js
   Custom App & Page Builder Engine + Flagship "Skyhara" App
   URL: https://handsandhead.com/pages/skyhara & Custom Pages Studio
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const DEFAULT_SKYHARA_APP = {
    id: "skyhara",
    slug: "skyhara",
    name: "Skyhara",
    subtitle: "Artisanal Botanical Leather & Heritage Minimalism",
    url: "https://handsandhead.com/pages/skyhara",
    category: "Signature Boutique",
    icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>`,
    theme: {
      id: "skyhara_luxury",
      bg: "#0B0E14",
      cardBg: "#141923",
      accent: "#E2B866",
      accentRgb: "226, 184, 102",
      text: "#F8FAFC",
      textDim: "#94A3B8",
      fontDisplay: "'Anton', 'Space Grotesk', sans-serif",
      fontBody: "'Space Grotesk', sans-serif"
    },
    hero: {
      headline: "SKYHARA",
      tagline: "HANDCRAFTED IN DHAKA · REFINED FOR THE WORLD",
      story: "Born at the intersection of Japanese architectural reduction and Dhaka's master leathercraft tradition. Every Skyhara piece is cut from certified full-grain vegetable-tanned hides, hand-waxed with organic beeswax, and fitted with custom solid brass hardware built to age with unmatched patina.",
      badge: "Flagship Boutique",
      bannerImage: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop"
    },
    features: {
      enable360: true,
      enableWhatsApp: true,
      enableDirectCart: true,
      enableCurrencyToggle: true,
      enableSpecsSheet: true,
      enableStorySection: true,
      enableQrModal: true
    },
    products: [
      {
        id: "sky_01",
        title: "Skyhara Artisan Tokyo Duffle 48H",
        subtitle: "Full-Grain Saddle Tan · Solid Brass Luggage",
        price: 18500,
        priceEur: 165,
        priceUsd: 180,
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop",
        category: "Luggage",
        badge: "BESTSELLER",
        stock: 14,
        sku: "SKY-DUF-48",
        colors: ["Saddle Tan", "Midnight Kuro", "Tuscan Cognac"],
        materials: "2.2mm Full-Grain Veg-Tan Leather, Japanese YKK Excella Zippers, Solid Sand-Cast Brass",
        dimensions: "52cm x 28cm x 26cm (42 Liters)"
      },
      {
        id: "sky_02",
        title: "Skyhara Kyoto Minimalist Slim Bifold",
        subtitle: "Zero-Bulk Edge Painted · 8 Card Architecture",
        price: 3450,
        priceEur: 32,
        priceUsd: 35,
        image: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop",
        category: "Wallets",
        badge: "ICONIC",
        stock: 38,
        sku: "SKY-WLT-08",
        colors: ["Cognac Brown", "Obsidian Black", "Olive Moss"],
        materials: "1.1mm French Chèvre Lining, Vegetable-Tanned Cowhide, Hand-Stitched Linen Thread",
        dimensions: "10.5cm x 8.5cm x 0.6cm"
      },
      {
        id: "sky_03",
        title: "Skyhara Atelier Everyday Leather Tote",
        subtitle: "Structured Base · Laptop Sleeve & Key Leash",
        price: 9800,
        priceEur: 88,
        priceUsd: 95,
        image: "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800&auto=format&fit=crop",
        category: "Bags",
        badge: "NEW DROP",
        stock: 22,
        sku: "SKY-TOT-20",
        colors: ["Natural Veg-Tan", "Deep Espresso", "Black Onyx"],
        materials: "Heavy-Weight Full Grain Leather, Raw Suede Interior, Riveted Bridle Leather Handles",
        dimensions: "40cm x 34cm x 14cm"
      },
      {
        id: "sky_04",
        title: "Skyhara Heritage Bespoke Derby Shoes",
        subtitle: "Goodyear Welted · Vibram Commando Half-Sole",
        price: 14500,
        priceEur: 130,
        priceUsd: 140,
        image: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop",
        category: "Footwear",
        badge: "LIMITED",
        stock: 9,
        sku: "SKY-SH-DRB",
        colors: ["Oxblood Cordovan", "Black Grain", "Walnut Tan"],
        materials: "Aniline Hand-Finished Pull-Up Leather, Stacked Leather Heel, Cork Bed Filler",
        dimensions: "EU 40 - 45 (Bespoke Last)"
      }
    ],
    publishedToDrawer: true,
    publishedToHomeShelf: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    isOfficial: true
  };

  /* ── Custom Apps Management Service ── */
  window.CustomAppsService = {
    STORAGE_KEY: "hh_custom_apps_registry",

    /* Get all registered apps (Builtin Skyhara + Custom Created) */
    async list() {
      const storeId = window.NexAuth?.getStoreId() || "default";
      let localApps = [];
      try {
        localApps = JSON.parse(localStorage.getItem(`${this.STORAGE_KEY}_${storeId}`) || "[]");
      } catch (e) {
        console.warn("Error reading local custom apps:", e);
      }

      // Check if Firestore collections are available
      if (window.Collections?.customApps) {
        try {
          const snap = await window.Collections.customApps.where("storeId", "==", storeId).get();
          if (!snap.empty) {
            const fireApps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Merge deduplicated
            const map = new Map();
            [DEFAULT_SKYHARA_APP, ...localApps, ...fireApps].forEach(a => map.set(a.id || a.slug, a));
            return Array.from(map.values());
          }
        } catch (e) {
          console.warn("Firestore customApps load fallback:", e);
        }
      }

      const map = new Map();
      [DEFAULT_SKYHARA_APP, ...localApps].forEach(a => map.set(a.id || a.slug, a));
      return Array.from(map.values());
    },

    /* Get Single App by ID or Slug */
    async get(idOrSlug) {
      const all = await this.list();
      return all.find(a => a.id === idOrSlug || a.slug === idOrSlug) || DEFAULT_SKYHARA_APP;
    },

    /* Save or Update an App */
    async save(appData) {
      const storeId = window.NexAuth?.getStoreId() || "default";
      const slug = (appData.slug || appData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/^-+|-+$/g, '');
      const id = appData.id || `app_${slug}_${Date.now().toString().slice(-4)}`;

      const fullApp = {
        ...appData,
        id,
        slug,
        storeId,
        url: `https://handsandhead.com/pages/${slug}`,
        updatedAt: new Date().toISOString()
      };

      // 1. Update LocalStorage
      const current = (await this.list()).filter(a => a.id !== id && !a.isOfficial);
      current.push(fullApp);
      localStorage.setItem(`${this.STORAGE_KEY}_${storeId}`, JSON.stringify(current));

      // 2. Persist to Firestore if online
      if (window.Collections?.customApps) {
        try {
          await window.Collections.customApps.doc(id).set(fullApp, { merge: true });
        } catch (e) {
          console.warn("Firestore custom app sync error:", e);
        }
      }

      // 3. Emit notification
      if (window.NexEvents) {
        window.NexEvents.emit("CUSTOM_APP_SAVED", fullApp);
      }
      toast(`App "${fullApp.name}" saved & published ✓`);
      return fullApp;
    },

    /* Delete an App */
    async delete(appId) {
      if (appId === "skyhara") {
        toast("Flagship Skyhara app cannot be deleted (Read-only master).");
        return false;
      }
      const storeId = window.NexAuth?.getStoreId() || "default";
      const current = (await this.list()).filter(a => a.id !== appId && !a.isOfficial);
      localStorage.setItem(`${this.STORAGE_KEY}_${storeId}`, JSON.stringify(current));

      if (window.Collections?.customApps) {
        try {
          await window.Collections.customApps.doc(appId).delete();
        } catch (e) {}
      }

      toast("Custom app removed.");
      return true;
    }
  };

  /* ── Skyhara Active State Controller ── */
  window.SkyharaApp = {
    activeCurrency: "BDT",
    activeCategory: "ALL",
    activeRotationAngle: 0,
    cart: [],

    setCurrency(curr) {
      this.activeCurrency = curr;
      const appContainer = document.getElementById("skyhara-mount");
      if (appContainer) {
        this.renderApp(window._currentSkyharaData || DEFAULT_SKYHARA_APP, appContainer);
      }
    },

    formatPrice(item) {
      if (this.activeCurrency === "EUR") return `€${(item.priceEur || Math.round(item.price / 112)).toLocaleString()}`;
      if (this.activeCurrency === "USD") return `$${(item.priceUsd || Math.round(item.price / 102)).toLocaleString()}`;
      return `৳${(item.price || 0).toLocaleString()}`;
    },

    /* Place direct WhatsApp or Firestore Order from Skyhara */
    async placeOrder(item, color = null) {
      const selectedColor = color || (item.colors ? item.colors[0] : "Default");
      const orderPrice = item.price || 0;

      // 1. Log in Hands & Head Order OS
      if (window.OrdersService) {
        try {
          await window.OrdersService.create({
            customer: {
              name: "Skyhara Boutique Buyer",
              country: this.activeCurrency === "EUR" ? "NL" : this.activeCurrency === "USD" ? "US" : "BD"
            },
            lineItems: [{
              productId: item.id,
              variantId: selectedColor,
              title: `${item.title} (${selectedColor})`,
              sku: item.sku || "SKYHARA",
              price: orderPrice,
              quantity: 1
            }],
            notes: `Placed via Skyhara Boutique Page (https://handsandhead.com/pages/skyhara)`
          });
        } catch (e) {
          console.warn("Order auto-log note:", e);
        }
      }

      // 2. Generate WhatsApp Concierge Message
      const waMsg = encodeURIComponent(
        `✨ *SKYHARA BOUTIQUE ORDER ENQUIRY*\n\n` +
        `Product: ${item.title}\n` +
        `Colorway: ${selectedColor}\n` +
        `SKU: ${item.sku}\n` +
        `Price: ${this.formatPrice(item)}\n` +
        `Reference: https://handsandhead.com/pages/skyhara\n\n` +
        `Hello Hands & Head Team, I would like to reserve this piece.`
      );
      const waUrl = `https://wa.me/8801974518600?text=${waMsg}`;
      window.open(waUrl, "_blank");
      toast(`Reserved "${item.title}" — Opening Concierge WhatsApp ✓`);
    },

    /* 360 Rotation Simulation */
    rotate360(step) {
      this.activeRotationAngle = (this.activeRotationAngle + step + 360) % 360;
      const el = document.getElementById("skyhara-360-preview");
      if (el) {
        el.style.transform = `perspective(800px) rotateY(${this.activeRotationAngle}deg)`;
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     RENDERER: SKYHARA FLAGSHIP & CUSTOM APP VIEWER
     ═══════════════════════════════════════════════════════════ */
  window.render.Skyhara = async function (container, customSlug = "skyhara") {
    container.innerHTML = `
      <div style="padding:40px 20px;text-align:center;font-family:var(--mono);color:var(--ink-3);font-size:11px;letter-spacing:2px;text-transform:uppercase;">
        <div style="display:inline-block;width:20px;height:20px;border:2px solid var(--wire-hard);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
        <div>Loading Skyhara Boutique Experience…</div>
      </div>
    `;

    const appData = await window.CustomAppsService.get(customSlug);
    window._currentSkyharaData = appData;

    container.innerHTML = `<div id="skyhara-mount"></div>`;
    const mount = document.getElementById("skyhara-mount");
    window.SkyharaApp.renderApp(appData, mount);
  };

  /* Skyhara App DOM Builder */
  window.SkyharaApp.renderApp = function (app, target) {
    const t = app.theme || DEFAULT_SKYHARA_APP.theme;
    const h = app.hero || DEFAULT_SKYHARA_APP.hero;
    const prods = app.products || DEFAULT_SKYHARA_APP.products;
    const curr = window.SkyharaApp.activeCurrency;

    target.innerHTML = `
      <div style="background:${t.bg};color:${t.text};min-height:100vh;font-family:${t.fontBody};padding-bottom:50px;">
        
        <!-- Luxury Top Navigation & Channel Bar -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(11,14,20,0.85);backdrop-filter:blur(12px);position:sticky;top:0;z-index:40;">
          <div style="display:flex;align-items:center;gap:12px;">
            <button onclick="navTo('Home')" class="btn btn-sm btn-dark" style="padding:4px 10px;font-size:11px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:${t.text};">
              ← OS
            </button>
            <div>
              <div style="font-family:${t.fontDisplay};font-size:18px;letter-spacing:3px;color:${t.accent};line-height:1;">${app.name}</div>
              <div style="font-family:var(--mono);font-size:8.5px;color:${t.textDim};letter-spacing:1.5px;text-transform:uppercase;">${app.url.replace('https://','')}</div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;">
            <!-- Currency Switcher -->
            <div style="display:flex;border:1px solid rgba(255,255,255,0.15);border-radius:20px;overflow:hidden;background:rgba(0,0,0,0.3);">
              ${['BDT', 'EUR', 'USD'].map(c => `
                <button onclick="window.SkyharaApp.setCurrency('${c}')" style="padding:4px 8px;font-size:9.5px;font-family:var(--mono);background:${curr === c ? t.accent : 'transparent'};color:${curr === c ? '#000' : t.textDim};border:none;cursor:pointer;font-weight:700;">${c}</button>
              `).join('')}
            </div>

            <!-- Share & QR -->
            <button onclick="window.openSkyharaShareModal('${app.slug}')" class="btn btn-sm" style="padding:5px 10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:${t.text};border-radius:20px;font-size:11px;" title="Share & QR Code">
              🔗 Share
            </button>

            <!-- Customizer / Edit -->
            <button onclick="window.openAppCustomizerModal('${app.id}')" class="btn btn-sm" style="padding:5px 10px;background:${t.accent};color:#000;border:none;border-radius:20px;font-weight:700;font-size:11px;" title="Edit App Settings">
              ⚙️ Studio
            </button>
          </div>
        </div>

        <!-- Hero Section & Visual Banner -->
        <div style="position:relative;overflow:hidden;padding:40px 20px 32px;text-align:center;background:linear-gradient(180deg, rgba(226,184,102,0.08) 0%, rgba(11,14,20,0) 100%);">
          <div style="display:inline-block;padding:4px 12px;border:1px solid rgba(${t.accentRgb || '226,184,102'},0.4);border-radius:30px;font-family:var(--mono);font-size:9px;color:${t.accent};letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;background:rgba(${t.accentRgb || '226,184,102'},0.1);">
            ${h.badge || 'Artisanal Release'}
          </div>
          <h1 style="font-family:${t.fontDisplay};font-size:clamp(36px, 9vw, 56px);letter-spacing:6px;color:${t.text};margin:0;line-height:1;text-transform:uppercase;">
            ${h.headline}
          </h1>
          <div style="font-family:var(--mono);font-size:10.5px;letter-spacing:3px;color:${t.accent};text-transform:uppercase;margin-top:10px;font-weight:600;">
            ${h.tagline}
          </div>
          
          <p style="max-width:560px;margin:18px auto 0;font-size:13.5px;line-height:1.7;color:${t.textDim};padding:0 10px;">
            ${h.story}
          </p>

          <div style="display:flex;justify-content:center;gap:12px;margin-top:24px;flex-wrap:wrap;">
            <button onclick="document.getElementById('skyhara-catalog').scrollIntoView({behavior:'smooth'})" class="btn" style="background:${t.accent};color:#000;font-weight:700;padding:10px 22px;border-radius:30px;font-size:12px;letter-spacing:1px;">
              Explore Collection ↓
            </button>
            <button onclick="window.openSkyharaConciergeModal()" class="btn btn-dark" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.2);color:${t.text};padding:10px 20px;border-radius:30px;font-size:12px;">
              💬 Bespoke Concierge
            </button>
          </div>
        </div>

        <!-- 360 Product & Material Craft Section -->
        <div style="margin:20px;padding:24px;border-radius:20px;background:${t.cardBg};border:1px solid rgba(255,255,255,0.08);box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <div style="font-family:var(--mono);font-size:9.5px;letter-spacing:2px;color:${t.accent};text-transform:uppercase;font-weight:700;">Interactive 360° Material Viewer</div>
              <h3 style="font-family:${t.fontDisplay};font-size:22px;color:${t.text};margin:2px 0 0;">Anatomy of Botanical Leather</h3>
            </div>
            <div style="display:flex;gap:6px;">
              <button onclick="window.SkyharaApp.rotate360(-45)" class="btn btn-sm btn-dark" style="background:rgba(255,255,255,0.1);color:${t.text};padding:4px 10px;">↺</button>
              <button onclick="window.SkyharaApp.rotate360(45)" class="btn btn-sm btn-dark" style="background:rgba(255,255,255,0.1);color:${t.text};padding:4px 10px;">↻</button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:20px;align-items:center;">
            <div style="text-align:center;position:relative;perspective:800px;">
              <img id="skyhara-360-preview" src="${prods[0]?.image}" style="width:100%;max-width:320px;border-radius:16px;box-shadow:0 15px 30px rgba(0,0,0,0.6);transition:transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);display:inline-block;" alt="Skyhara 360"/>
              <div style="margin-top:10px;font-family:var(--mono);font-size:9.5px;color:${t.textDim};letter-spacing:1.5px;">
                Drag or use arrows to inspect craft finish
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:12px;">
              <div style="padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:12px;font-weight:700;color:${t.accent};margin-bottom:2px;">🌿 Certified Vegetable Tanning</div>
                <div style="font-size:11px;color:${t.textDim};line-height:1.5;">Tanned with natural chestnut and mimosa bark extracts for 45 days. Chrome-free, non-toxic, and biodegradable.</div>
              </div>
              <div style="padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:12px;font-weight:700;color:${t.accent};margin-bottom:2px;">🔨 Hand-Burnished Saddle Stitched</div>
                <div style="font-size:11px;color:${t.textDim};line-height:1.5;">Edges beveled, painted, and heat-creased with beeswax. Double-needle hand saddle stitch that will never unravel.</div>
              </div>
              <div style="padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:12px;font-weight:700;color:${t.accent};margin-bottom:2px;">✨ Solid Sand-Cast Brass Hardware</div>
                <div style="font-size:11px;color:${t.textDim};line-height:1.5;">Custom engraved buckles, snaps, and Japanese YKK Excella polished metal teeth for lifelong resilience.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Curated Product Catalog Grid -->
        <div id="skyhara-catalog" style="padding:10px 20px 30px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;">
            <div>
              <div style="font-family:var(--mono);font-size:9.5px;letter-spacing:2px;color:${t.accent};text-transform:uppercase;font-weight:700;">Curated Catalog</div>
              <h2 style="font-family:${t.fontDisplay};font-size:26px;color:${t.text};margin:2px 0 0;letter-spacing:1px;">The Collection</h2>
            </div>
            <div style="font-family:var(--mono);font-size:11px;color:${t.textDim};">
              ${prods.length} Pieces
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:16px;">
            ${prods.map(p => `
              <div style="border-radius:16px;background:${t.cardBg};border:1px solid rgba(255,255,255,0.08);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.3);transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='none'">
                <div style="position:relative;height:200px;background:#000;overflow:hidden;">
                  <img src="${p.image}" style="width:100%;height:100%;object-fit:cover;" alt="${p.title}"/>
                  <div style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);padding:3px 8px;border-radius:6px;font-family:var(--mono);font-size:8.5px;letter-spacing:1.5px;color:${t.accent};font-weight:700;">
                    ${p.badge || p.category}
                  </div>
                  <div style="position:absolute;bottom:10px;right:10px;background:${t.accent};color:#000;padding:4px 10px;border-radius:20px;font-family:var(--mono);font-size:11.5px;font-weight:800;">
                    ${window.SkyharaApp.formatPrice(p)}
                  </div>
                </div>

                <div style="padding:14px 16px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                  <div>
                    <h3 style="font-size:15px;font-weight:700;color:${t.text};margin:0 0 4px;line-height:1.3;">${p.title}</h3>
                    <div style="font-size:11px;color:${t.textDim};line-height:1.4;margin-bottom:8px;">${p.subtitle || ''}</div>
                    
                    <!-- Colorways chips -->
                    ${p.colors ? `
                      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">
                        ${p.colors.map(c => `
                          <span style="font-size:9px;font-family:var(--mono);padding:2px 7px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:${t.textDim};">${c}</span>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>

                  <div style="display:flex;gap:6px;margin-top:10px;">
                    <button onclick="window.openProductDetailModal('${p.id}')" class="btn btn-sm btn-dark" style="flex:1;padding:8px;font-size:11px;background:rgba(255,255,255,0.08);color:${t.text};border:1px solid rgba(255,255,255,0.15);">
                      Specs
                    </button>
                    <button onclick="window.SkyharaApp.placeOrder(${JSON.stringify(p).replace(/"/g, '&quot;')})" class="btn btn-sm" style="flex:2;padding:8px;font-size:11px;background:${t.accent};color:#000;font-weight:700;border:none;">
                      Reserve / Buy
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Footer & Direct Link Bar -->
        <div style="margin:20px;padding:20px;border-radius:16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);text-align:center;">
          <div style="font-family:${t.fontDisplay};font-size:20px;color:${t.accent};letter-spacing:2px;margin-bottom:4px;">HANDS &amp; HEAD · ${app.name.toUpperCase()}</div>
          <div style="font-family:var(--mono);font-size:10px;color:${t.textDim};margin-bottom:12px;">Live App Slug: <span style="color:${t.accent};">${app.url}</span></div>
          <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
            <button onclick="navigator.clipboard.writeText('${app.url}'); toast('App URL copied: ${app.url} ✓');" class="btn btn-sm btn-dark" style="font-size:11px;">
              📋 Copy Link
            </button>
            <button onclick="window.open('${app.url}', '_blank')" class="btn btn-sm btn-gold" style="font-size:11px;">
              Launch Live Browser ↗
            </button>
          </div>
        </div>

      </div>
    `;
  };

  /* ═══════════════════════════════════════════════════════════
     MODULE: CUSTOM APPS & PAGES STUDIO ("Create Own App")
     ═══════════════════════════════════════════════════════════ */
  window.render.CustomApps = async function (container) {
    container.innerHTML = `
      <div style="padding:40px 20px;text-align:center;font-family:var(--mono);color:var(--ink-3);font-size:11px;letter-spacing:2px;text-transform:uppercase;">
        <div style="display:inline-block;width:18px;height:18px;border:2px solid var(--wire-hard);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
        <div>Loading Custom Apps &amp; Page Studio…</div>
      </div>
    `;

    const apps = await window.CustomAppsService.list();

    container.innerHTML = `
      <!-- Top Title & Controls -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 20px 12px;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;letter-spacing:2px;color:var(--coral);text-transform:uppercase;font-weight:700;">Custom Page &amp; Brand Apps Hub</div>
          <h3 style="font-family:var(--display);font-size:24px;letter-spacing:1px;color:var(--ink);margin-top:2px;">Custom Apps &amp; Pages</h3>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-sm btn-gold" onclick="window.openCreateOwnAppModal()" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;">
            <span>+ Create Own App</span>
          </button>
        </div>
      </div>

      <!-- Hero Introduction Banner -->
      <div style="margin:0 20px 16px;padding:18px 20px;border-radius:var(--r-lg);background:linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(226,184,102,0.02) 100%);border:1px solid var(--gold-dim);box-shadow:var(--neu-flat-sm);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <span class="pill gold" style="font-size:8px;margin-bottom:6px;display:inline-block;">STANDALONE APP BUILDER</span>
            <div style="font-size:16px;font-weight:700;color:var(--ink);">Build Your Own Boutique Apps like Skyhara</div>
            <div style="font-size:12px;color:var(--ink-2);margin-top:4px;max-width:540px;">
              Publish signature storefronts, private lookbooks, and B2B catalogs at custom URLs like <code style="font-family:var(--mono);color:var(--coral);">handsandhead.com/pages/[slug]</code> with automated App Drawer &amp; Home Shelf integration.
            </div>
          </div>
          <button class="btn btn-gold" onclick="openAppModule('Skyhara')" style="font-size:11px;">
            ✨ Preview Flagship Skyhara
          </button>
        </div>
      </div>

      <!-- Active Apps Shelf -->
      <div style="padding:0 20px 24px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--ink-3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;font-weight:700;">
          Published Apps &amp; Boutique Pages (${apps.length})
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px;">
          ${apps.map(app => `
            <div class="pcard" style="padding:16px;border-radius:18px;background:var(--bg-neu);box-shadow:var(--neu-flat-sm);display:flex;flex-direction:column;justify-content:space-between;border:1px solid ${app.isOfficial ? 'var(--gold)' : 'var(--wire)'};">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:40px;height:40px;border-radius:12px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:${app.theme?.accent || 'var(--gold)'};flex-shrink:0;">
                      ${app.icon || '✨'}
                    </div>
                    <div>
                      <div style="font-size:15px;font-weight:700;color:var(--ink);">${app.name}</div>
                      <div style="font-size:10px;color:var(--coral);font-family:var(--mono);">${app.url}</div>
                    </div>
                  </div>
                  <span class="pill ${app.isOfficial ? 'gold' : 'ok'}" style="font-size:8px;">${app.isOfficial ? 'FLAGSHIP' : 'CUSTOM'}</span>
                </div>

                <p style="font-size:12px;color:var(--ink-2);line-height:1.4;margin:8px 0 12px;">
                  ${app.subtitle || app.hero?.tagline || 'Custom luxury brand page and interactive product showcase.'}
                </p>

                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                  <span class="pill info" style="font-size:8px;">${(app.products || []).length} Products</span>
                  <span class="pill ${app.publishedToDrawer ? 'ok' : 'dark'}" style="font-size:8px;">App Drawer: ${app.publishedToDrawer ? 'ON' : 'OFF'}</span>
                  <span class="pill ${app.publishedToHomeShelf ? 'ok' : 'dark'}" style="font-size:8px;">Home Shelf: ${app.publishedToHomeShelf ? 'ON' : 'OFF'}</span>
                </div>
              </div>

              <div style="display:flex;gap:6px;margin-top:10px;">
                <button class="btn btn-sm btn-dark" style="flex:1;" onclick="window.render.Skyhara(document.getElementById('body'), '${app.slug}')">
                  👁️ Launch
                </button>
                <button class="btn btn-sm btn-dark" style="flex:1;" onclick="window.openSkyharaShareModal('${app.slug}')">
                  🔗 Share
                </button>
                <button class="btn btn-sm btn-gold" style="flex:1;" onclick="window.openAppCustomizerModal('${app.id}')">
                  ⚙️ Edit
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  /* Aliases for routing */
  window.render.EnterpriseApps = window.render.CustomApps;

  /* ═══════════════════════════════════════════════════════════
     MODAL: CREATE OWN APP (JUST LIKE SKYHARA)
     ═══════════════════════════════════════════════════════════ */
  window.openCreateOwnAppModal = function () {
    openSheet(`
      <div class="grab"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--gold);">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        <div>
          <h3 style="margin:0;font-size:18px;">Create Own App &amp; Page</h3>
          <p class="hint" style="margin:0;">Publish a luxury boutique app like Skyhara</p>
        </div>
      </div>

      <div style="padding:0 4px 24px;">
        <div class="field"><label>App / Brand Name *</label>
          <input id="new_app_name" placeholder="e.g. Skyhara Bespoke or Artisan Drop" oninput="window.onCustomAppNameInput(this.value)"/>
        </div>

        <div class="field"><label>Page URL Slug *</label>
          <div style="display:flex;align-items:center;gap:4px;">
            <span style="font-family:var(--mono);font-size:11px;color:var(--ink-3);">https://handsandhead.com/pages/</span>
            <input id="new_app_slug" placeholder="my-app" style="flex:1;font-family:var(--mono);font-size:12px;color:var(--coral);"/>
          </div>
        </div>

        <div class="field"><label>Brand Tagline &amp; Headline</label>
          <input id="new_app_tagline" placeholder="e.g. HANDCRAFTED IN DHAKA · CURATED FOR EUROPE"/>
        </div>

        <div class="field"><label>Brand Story / Manifesto</label>
          <textarea id="new_app_story" rows="3" placeholder="Tell the story of the artisan craftsmanship, vegetable tanning, and heritage design…">Bespoke collection crafted from certified full-grain leather, solid brass fittings, and timeless architectural aesthetics.</textarea>
        </div>

        <div class="field"><label>Theme Palette Preset</label>
          <select id="new_app_theme">
            <option value="skyhara_luxury">Skyhara Luxury (Midnight Indigo &amp; Gold Brass)</option>
            <option value="obsidian_noir">Obsidian Noir (Monochrome Stealth Black)</option>
            <option value="artisan_terracotta">Artisan Terracotta (Warm Tuscan Leather)</option>
            <option value="nordic_slate">Nordic Slate (Minimalist Tokyo Grey)</option>
            <option value="emerald_luxe">Emerald Luxe (Heritage Forest Green)</option>
          </select>
        </div>

        <div class="field"><label>Hero Banner Image URL</label>
          <input id="new_app_banner" value="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop"/>
        </div>

        <div style="margin:12px 0;display:flex;flex-direction:column;gap:8px;">
          <label style="font-size:11px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;">Publish Channels</label>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:var(--r-md);background:var(--bg-neu);box-shadow:var(--neu-inset);">
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--ink);">Add to App Drawer</div>
              <div style="font-size:10px;color:var(--ink-3);">Show in H&amp;H OS Command Menu</div>
            </div>
            <input type="checkbox" id="new_app_in_drawer" checked style="width:18px;height:18px;accent-color:var(--gold);cursor:pointer;"/>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:var(--r-md);background:var(--bg-neu);box-shadow:var(--neu-inset);">
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--ink);">Feature on Home Apps Shelf</div>
              <div style="font-size:10px;color:var(--ink-3);">Display card alongside Accounting &amp; Social</div>
            </div>
            <input type="checkbox" id="new_app_in_home" checked style="width:18px;height:18px;accent-color:var(--gold);cursor:pointer;"/>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-dark" style="flex:1;" onclick="closeSheet()">Cancel</button>
          <button class="btn btn-gold" style="flex:2;" onclick="window.submitNewCustomApp()">
            🚀 Publish App &amp; Page
          </button>
        </div>
      </div>
    `);
  };

  window.onCustomAppNameInput = function (val) {
    const slugInput = document.getElementById("new_app_slug");
    if (slugInput && val) {
      slugInput.value = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
  };

  window.submitNewCustomApp = async function () {
    const name = document.getElementById("new_app_name")?.value?.trim();
    if (!name) { toast("Please enter an App / Brand name"); return; }

    const slug = document.getElementById("new_app_slug")?.value?.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tagline = document.getElementById("new_app_tagline")?.value?.trim() || "HANDCRAFTED IN DHAKA · CURATED FOR THE WORLD";
    const story = document.getElementById("new_app_story")?.value?.trim() || "";
    const banner = document.getElementById("new_app_banner")?.value?.trim() || "";
    const themeKey = document.getElementById("new_app_theme")?.value || "skyhara_luxury";
    const inDrawer = document.getElementById("new_app_in_drawer")?.checked !== false;
    const inHome = document.getElementById("new_app_in_home")?.checked !== false;

    // Fetch existing products to populate as defaults
    let products = DEFAULT_SKYHARA_APP.products;
    if (window.ProductsService) {
      try {
        const { items } = await window.ProductsService.list({ limit: 4 });
        if (items && items.length) {
          products = items.map(p => ({
            id: p.id,
            title: p.title,
            subtitle: p.sku || "Full-Grain Leather",
            price: p.pricing?.price || 5000,
            priceEur: Math.round((p.pricing?.price || 5000) / 112),
            priceUsd: Math.round((p.pricing?.price || 5000) / 102),
            image: p.media?.[0]?.url || "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop",
            category: p.category || "Leather Goods",
            badge: "FEATURED",
            sku: p.variants?.[0]?.sku || "SKU",
            colors: ["Cognac", "Black", "Tan"]
          }));
        }
      } catch (e) {}
    }

    const appData = {
      name,
      slug,
      subtitle: tagline,
      url: `https://handsandhead.com/pages/${slug}`,
      hero: {
        headline: name.toUpperCase(),
        tagline: tagline,
        story: story,
        badge: "Bespoke Release",
        bannerImage: banner
      },
      theme: {
        id: themeKey,
        bg: themeKey === 'obsidian_noir' ? '#050505' : themeKey === 'artisan_terracotta' ? '#1A0F0D' : '#0B0E14',
        cardBg: themeKey === 'obsidian_noir' ? '#121212' : themeKey === 'artisan_terracotta' ? '#261714' : '#141923',
        accent: themeKey === 'artisan_terracotta' ? '#E07A5F' : '#E2B866',
        text: '#F8FAFC',
        textDim: '#94A3B8',
        fontDisplay: "'Anton', 'Space Grotesk', sans-serif",
        fontBody: "'Space Grotesk', sans-serif"
      },
      products,
      publishedToDrawer: inDrawer,
      publishedToHomeShelf: inHome
    };

    await window.CustomAppsService.save(appData);
    closeSheet();

    // Re-render Custom Apps Hub or Launch the new App
    const container = document.getElementById("body");
    if (container) {
      window.render.Skyhara(container, slug);
    }
  };

  /* ── Share Modal & QR Code Generator ── */
  window.openSkyharaShareModal = async function (slug = "skyhara") {
    const app = await window.CustomAppsService.get(slug);
    const url = app.url || `https://handsandhead.com/pages/${slug}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

    openSheet(`
      <div class="grab"></div>
      <div style="text-align:center;padding:0 10px 20px;">
        <span class="pill gold" style="font-size:8.5px;letter-spacing:1px;margin-bottom:6px;">LIVE APP URL</span>
        <h3 style="margin:4px 0 2px;font-size:20px;">${app.name}</h3>
        <p class="hint" style="margin:0 0 16px;">${url}</p>

        <div style="display:inline-block;padding:16px;background:#FFF;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.4);margin-bottom:16px;">
          <img src="${qrUrl}" alt="QR Code" style="width:160px;height:160px;display:block;"/>
        </div>
        <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);margin-bottom:16px;">Scan to open boutique page on mobile or print on hangtags</div>

        <div style="display:flex;gap:8px;">
          <button class="btn btn-dark" style="flex:1;" onclick="navigator.clipboard.writeText('${url}'); toast('App URL copied to clipboard ✓');">
            📋 Copy URL
          </button>
          <button class="btn btn-gold" style="flex:1;" onclick="window.open('${url}', '_blank')">
            Open in Browser ↗
          </button>
        </div>
      </div>
    `);
  };

  /* ── Concierge Modal ── */
  window.openSkyharaConciergeModal = function () {
    openSheet(`
      <div class="grab"></div>
      <div style="padding:0 10px 20px;text-align:center;">
        <div style="font-size:28px;margin-bottom:8px;">✨</div>
        <h3 style="margin:0;font-size:20px;">Skyhara Bespoke Concierge</h3>
        <p class="hint" style="margin:4px 0 16px;">Direct line to Hands &amp; Head Master Leather Artisans</p>

        <div class="card" style="text-align:left;margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:4px;">Custom Leather &amp; Monogramming</div>
          <div style="font-size:11.5px;color:var(--ink-2);line-height:1.5;">
            We offer custom gold-foil initials, corporate gifting batches, bespoke shoe lasts, and private colorway dyeing.
          </div>
        </div>

        <button class="btn btn-gold" style="width:100%;margin-bottom:8px;" onclick="window.open('https://wa.me/8801974518600?text=Hello%20Skyhara%20Concierge,%20I%20would%20like%20to%20discuss%20a%20bespoke%20leather%20order.','_blank')">
          💬 Connect on WhatsApp (+880 1974-518600)
        </button>
        <button class="btn btn-dark" style="width:100%;" onclick="closeSheet()">Close</button>
      </div>
    `);
  };

  /* ── App Customizer Modal ── */
  window.openAppCustomizerModal = async function (appId) {
    const app = await window.CustomAppsService.get(appId);
    openSheet(`
      <div class="grab"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div>
          <h3 style="margin:0;font-size:18px;">Customize: ${app.name}</h3>
          <p class="hint" style="margin:0;">Manage page configuration &amp; publishing</p>
        </div>
      </div>

      <div style="padding:0 4px 20px;">
        <div class="field"><label>App Name</label>
          <input id="edit_app_name" value="${app.name || ''}"/>
        </div>
        <div class="field"><label>Headline</label>
          <input id="edit_app_headline" value="${app.hero?.headline || ''}"/>
        </div>
        <div class="field"><label>Tagline</label>
          <input id="edit_app_tagline" value="${app.hero?.tagline || ''}"/>
        </div>
        <div class="field"><label>Story</label>
          <textarea id="edit_app_story" rows="3">${app.hero?.story || ''}</textarea>
        </div>

        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-dark" style="flex:1;" onclick="closeSheet()">Cancel</button>
          ${!app.isOfficial ? `
            <button class="btn btn-dark" style="color:var(--warn);" onclick="window.CustomAppsService.delete('${app.id}'); closeSheet(); window.render.CustomApps(document.getElementById('body'));">
              Delete App
            </button>
          ` : ''}
          <button class="btn btn-gold" style="flex:2;" onclick="window.saveAppCustomization('${app.id}')">
            Save Changes
          </button>
        </div>
      </div>
    `);
  };

  window.saveAppCustomization = async function (appId) {
    const app = await window.CustomAppsService.get(appId);
    app.name = document.getElementById("edit_app_name")?.value || app.name;
    app.hero = app.hero || {};
    app.hero.headline = document.getElementById("edit_app_headline")?.value || app.hero.headline;
    app.hero.tagline = document.getElementById("edit_app_tagline")?.value || app.hero.tagline;
    app.hero.story = document.getElementById("edit_app_story")?.value || app.hero.story;

    await window.CustomAppsService.save(app);
    closeSheet();
    const container = document.getElementById("body");
    if (container) window.render.Skyhara(container, app.slug);
  };

  console.log("✨ Custom Apps & Skyhara Page Builder engine initialized.");
})();
