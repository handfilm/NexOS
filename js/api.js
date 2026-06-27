/* ═══════════════════════════════════════════════════════════════
   NexOS v4 — js/api.js
   API Layer: Spine Bridge · Shopify Storefront · Exchange Rates
   ═══════════════════════════════════════════════════════════════ */

/* ── 1. SPINE BRIDGE (Google Apps Script → Shopify Core) ── */
window.callSpine = async function(action, payload = null) {
  const SPINE_URL = "https://script.google.com/macros/s/AKfycbyqTLd51rCc37NZeRS5sYpR2ax3VpAOKRpHRSoN9ssDiRuojhifKZwefIWlBWqTWslvaQ/exec";
  try {
    const res = await fetch(SPINE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload })
    });
    return (await res.json()) || [];
  } catch (err) {
    console.error("Spine Error:", err);
    return { status: "failed", error: err };
  }
};

/* ── 2. SHOPIFY STOREFRONT API ── */
window.ShopifyAPI = {
  STORE_DOMAIN: "handfilm.myshopify.com",
  // Add your Storefront API token here after generating from Shopify Admin
  // Admin → Settings → Apps → Develop apps → Create app → Storefront API
  STOREFRONT_TOKEN: "YOUR_STOREFRONT_API_TOKEN_HERE",

  async query(gql) {
    try {
      const res = await fetch(`https://${this.STORE_DOMAIN}/api/2024-10/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.STOREFRONT_TOKEN
        },
        body: JSON.stringify({ query: gql })
      });
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("Shopify API Error:", err);
      return null;
    }
  },

  async getProducts(first = 20) {
    if (this.STOREFRONT_TOKEN === "YOUR_STOREFRONT_API_TOKEN_HERE") return null;
    return this.query(`{
      products(first: ${first}) {
        edges { node {
          id title handle
          priceRange { minVariantPrice { amount currencyCode } }
          totalInventory
          featuredImage { url }
          variants(first: 5) { edges { node {
            id title price { amount } availableForSale quantityAvailable sku
          }}}
        }}
      }
    }`);
  },

  async getOrders() {
    // Orders require Admin API — use Spine bridge for this
    return null;
  },

  async getInventory(productId) {
    if (this.STOREFRONT_TOKEN === "YOUR_STOREFRONT_API_TOKEN_HERE") return null;
    return this.query(`{
      product(id: "${productId}") {
        title totalInventory
        variants(first: 10) { edges { node {
          title sku quantityAvailable availableForSale
        }}}
      }
    }`);
  }
};

/* ── 3. EXCHANGE RATES (no key needed — open API) ── */
window.FXRates = {
  _cache: null,
  _fetchedAt: 0,
  BASE: "BDT",
  CURRENCIES: ["EUR", "GBP", "USD", "JPY", "AED"],

  async getRates() {
    const now = Date.now();
    // Cache for 1 hour
    if (this._cache && (now - this._fetchedAt) < 3600000) return this._cache;
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${this.BASE}`);
      const data = await res.json();
      if (data.rates) {
        this._cache = data.rates;
        this._fetchedAt = now;
        return data.rates;
      }
    } catch (e) {
      console.warn("FX fetch failed, using fallback rates");
    }
    // Fallback static rates (approximate, update periodically)
    return { EUR: 0.0083, GBP: 0.0072, USD: 0.0091, JPY: 1.37, AED: 0.033 };
  },

  async convert(amountBDT, toCurrency) {
    const rates = await this.getRates();
    const rate = rates[toCurrency] || 1;
    return (amountBDT * rate).toFixed(2);
  },

  async formatAll(amountBDT) {
    const rates = await this.getRates();
    const symbols = { EUR: "€", GBP: "£", USD: "$", JPY: "¥", AED: "د.إ" };
    return Object.entries(symbols).map(([cur, sym]) => ({
      currency: cur,
      symbol: sym,
      amount: (amountBDT * (rates[cur] || 1)).toFixed(cur === "JPY" ? 0 : 2)
    }));
  }
};

/* ── 4. COURIER TRACKING (DHL placeholder) ── */
window.CourierAPI = {
  // DHL API: https://developer.dhl.com/
  DHL_API_KEY: "YOUR_DHL_API_KEY_HERE",

  async track(trackingNumber, carrier = "dhl") {
    if (this.DHL_API_KEY === "YOUR_DHL_API_KEY_HERE") {
      // Return demo data until key is added
      return this._demoTrack(trackingNumber);
    }
    try {
      const res = await fetch(`https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingNumber}`, {
        headers: { "DHL-API-Key": this.DHL_API_KEY }
      });
      return await res.json();
    } catch (e) {
      return this._demoTrack(trackingNumber);
    }
  },

  _demoTrack(num) {
    return {
      trackingNumber: num,
      status: "IN_TRANSIT",
      events: [
        { timestamp: new Date(Date.now() - 86400000).toISOString(), location: "Dhaka, BD", description: "Shipment picked up" },
        { timestamp: new Date(Date.now() - 43200000).toISOString(), location: "Dubai Hub, AE", description: "In transit — hub processing" },
        { timestamp: new Date().toISOString(), location: "Amsterdam, NL", description: "Out for delivery" }
      ],
      estimatedDelivery: new Date(Date.now() + 86400000).toISOString()
    };
  }
};

/* ── 5. PUSH NOTIFICATIONS ── */
window.PushEngine = {
  _sw: null,

  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      this._sw = await navigator.serviceWorker.register('/sw.js');
      return true;
    } catch (e) {
      console.warn("SW registration failed:", e);
      return false;
    }
  },

  async requestPermission() {
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  async notify(title, body, icon = '/favicon.ico') {
    if (Notification.permission !== 'granted') return;
    if (this._sw) {
      this._sw.showNotification(title, { body, icon, badge: '/favicon.ico', vibrate: [100, 50, 100] });
    } else {
      new Notification(title, { body, icon });
    }
  },

  notifyNewOrder(order) {
    this.notify('⚡ New Order', `${order.t} — ${order.s}`, '/favicon.ico');
  }
};
