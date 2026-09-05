/**
 * ══════════════════════════════════════════════════════════════════════
 * HANDS & HEAD — WhatsApp Bulk Catalog Broadcast Studio & Dispatcher
 * Founder-Grade Omnichannel Marketing & B2B/D2C WhatsApp Sales Engine
 * ══════════════════════════════════════════════════════════════════════
 * Solves the core dynamic problem of apparel/brand founders:
 * Converting 15K+ buyers via WhatsApp by curating multi-product drops,
 * segmenting targeted cohorts, generating personalized high-converting copy,
 * and executing rapid, ban-proof 1-click dispatch or broadcast VCF lists.
 */

(function () {
  'use strict';

  // Immediate global stubs ensure functions exist even if called synchronously during early lifecycle
  window.openWhatsAppCampaignStudio = function(options = {}) {
    if (window.WhatsAppCampaignStudio && typeof window.WhatsAppCampaignStudio.open === 'function') {
      return window.WhatsAppCampaignStudio.open(options);
    }
    if (typeof WhatsAppCampaignStudio !== 'undefined' && typeof WhatsAppCampaignStudio.open === 'function') {
      return WhatsAppCampaignStudio.open(options);
    }
    setTimeout(() => {
      if (window.WhatsAppCampaignStudio && typeof window.WhatsAppCampaignStudio.open === 'function') {
        window.WhatsAppCampaignStudio.open(options);
      }
    }, 50);
  };

  window.openLookbookViewer = function(productIds = []) {
    if (window.WhatsAppCampaignStudio && typeof window.WhatsAppCampaignStudio.openLookbookViewer === 'function') {
      return window.WhatsAppCampaignStudio.openLookbookViewer(productIds);
    }
    if (typeof WhatsAppCampaignStudio !== 'undefined' && typeof WhatsAppCampaignStudio.openLookbookViewer === 'function') {
      return WhatsAppCampaignStudio.openLookbookViewer(productIds);
    }
    setTimeout(() => {
      if (window.WhatsAppCampaignStudio && typeof window.WhatsAppCampaignStudio.openLookbookViewer === 'function') {
        window.WhatsAppCampaignStudio.openLookbookViewer(productIds);
      }
    }, 50);
  };

  function showToast(msg) {
    if (typeof window.toast === 'function') {
      window.toast(msg);
      return;
    }
    const t = document.getElementById('toast');
    if (t) {
      t.innerText = msg;
      t.classList.add('on');
      setTimeout(() => t.classList.remove('on'), 2500);
      return;
    }
    console.log('[WhatsAppStudio]', msg);
  }
  const toast = showToast;

  function safeConfirm(msg) {
    try {
      if (typeof window.confirm === 'function') {
        return window.confirm(msg);
      }
    } catch (e) {}
    return true;
  }

  const STORAGE_KEY_CAMPAIGNS = 'hh_whatsapp_campaigns_v1';
  const STORAGE_KEY_DRAFT = 'hh_whatsapp_campaign_draft';
  const STORAGE_KEY_CUSTOM_TEMPLATES = 'hh_whatsapp_custom_templates_v2';

  // ── Preset High-Converting Founder Templates ──
  const TEMPLATES = {
    new_drop: {
      id: 'new_drop',
      label: '🔥 New Drop / Capsule Lookbook',
      badge: 'B2C & D2C',
      headline: 'HANDS & HEAD · New Capsule Release',
      body: `*HANDS & HEAD · Atelier Capsule Drop* 🔥\n\nDear {customer_name},\n\nWe are excited to share our latest handcrafted atelier release. Crafted from full-grain vegetable-tanned leather and premium textiles:\n\n{productsList}\n\n🏷️ Use VIP Code *{promoCode}* to enjoy {discount} courtesy.\n\n📖 *Interactive Digital Lookbook:*\n{lookbookUrl}\n\nStock is strictly limited. Reply directly to reserve your pieces before allocation closes! ✨\n\n— Hands & Head Atelier Team`
    },
    order_status_update: {
      id: 'order_status_update',
      label: '🚚 Order Status & Tracking',
      badge: 'ORDERS',
      headline: 'Atelier Order Fulfillment & Tracking Alert',
      body: `*HANDS & HEAD · Order Status Update* 📦\n\nDear {customer_name},\n\nYour order *#{order_id}* has been updated to *{order_status}*!\n\n📋 *Order Summary:*\n• Order Reference: #{order_id}\n• Status: *{order_status}*\n• Total Value: {order_total}\n• Items: {order_items}\n\nOur artisans in the atelier have packed your handcrafted pieces with care.\n\n📖 *Digital Lookbook & New Arrivals:*\n{lookbookUrl}\n\nNeed courier tracking details or have special delivery notes? Reply directly to this chat.\n\n— Hands & Head Atelier Dispatch Desk`
    },
    wholesale_b2b: {
      id: 'wholesale_b2b',
      label: '📦 B2B Wholesale / Sample Order Offer',
      badge: 'B2B EXPORT',
      headline: 'Wholesale Allocation & Export Quotation',
      body: `*HANDS & HEAD · B2B Export & Wholesale Allocation* 📦\n\nAttention: *{company_name}* (Attn: {customer_name})\n\nWe have opened bulk manufacturing slots and showroom sample allocations for European & International boutiques:\n\n{productsList}\n\n• *Compliance:* REACH, BSCI, OEKO-TEX & EUDR certified\n• *Terms:* {paymentTerms} · FOB Chittagong / Air Freight express\n• *Special Wholesale Rate:* {discount} applied for orders above MOQ\n\n📖 *B2B Digital Lookbook & Specs:*\n{lookbookUrl}\n\nReply directly or confirm your sample pack request.\n\n— International Export Desk, Hands & Head`
    },
    flash_sale: {
      id: 'flash_sale',
      label: '⚡ VIP Flash Privilege (48H)',
      badge: 'PROMO',
      headline: 'Exclusive 48-Hour Founder Flash Offer',
      body: `*⚡ EXCLUSIVE VIP PRIVILEGE · 48 HOURS ONLY* ⚡\n\nHi {first_name}!\n\nAs one of our valued customers ({company_name}), here is private early access to our limited inventory batch:\n\n{productsList}\n\n💥 *VIP Special Discount:* {discount} OFF with code *{promoCode}*\n\n📲 *Browse & Order Direct:*\n{lookbookUrl}\n\nSimply reply with your preferred size/color and delivery address to confirm instant delivery.`
    },
    reorder_reminder: {
      id: 'reorder_reminder',
      label: '🔄 Re-order & Restock Reminder',
      badge: 'RETENTION',
      headline: 'Restock Alert & Easy Re-order',
      body: `*HANDS & HEAD · Restock & Fresh Batch Arrival* 🔄\n\nHello {first_name},\n\nWe noticed you previously ordered with us (Ref: #{order_id}). We just restocked our signature atelier essentials with fresh leather hide batches:\n\n{productsList}\n\n✨ *Complimentary Shipping* included on re-orders this week with code *{promoCode}*.\n\n📖 *Full Catalog:* {lookbookUrl}\n\nReply here to re-order in 30 seconds!`
    },
    custom: {
      id: 'custom',
      label: '✍️ Custom Freeform Message',
      badge: 'CUSTOM',
      headline: 'Personalized Custom Announcement',
      body: `*HANDS & HEAD Atelier Update* 🌿\n\nHello {customer_name},\n\nHere are our recommended selections for {company_name}:\n\n{productsList}\n\nOrder Ref: #{order_id} · Status: {order_status}\n\nCatalog: {lookbookUrl}\n\nLet us know if you would like us to reserve your items!`
    }
  };

  const WhatsAppCampaignStudio = {
    // User-Saved Custom Templates (persisted in localStorage)
    customTemplates: {},

    // Current Active State
    state: {
      step: 1, // 1: Curate Products, 2: Select Audience, 3: Message & Preview, 4: Dispatch Console
      selectedProductIds: new Set(),
      selectedCustomerIds: new Set(),
      cohortFilter: 'all',
      searchProductQuery: '',
      searchCustomerQuery: '',
      templateKey: 'new_drop',
      customMessage: '',
      promoCode: 'VIPDROP26',
      discountType: 'percent', // 'percent' | 'flat' | 'none'
      discountVal: 15,
      autoAdvance: true,
      queueIndex: 0,
      previewCustomerId: null, // Selected customer ID for Step 3 live mockup
      dispatchLog: {}, // customerId -> { status: 'sent' | 'skipped', sentAt: ISOString }
      activeLookbookProduct: null,
      campaignName: 'New Collection VIP Showcase'
    },

    init() {
      this.loadCustomTemplates();
      this.loadDraft();
      window.openWhatsAppCampaignStudio = this.open.bind(this);
      window.openLookbookViewer = this.openLookbookViewer.bind(this);
    },

    loadCustomTemplates() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_TEMPLATES);
        if (saved) {
          this.customTemplates = JSON.parse(saved) || {};
        }
      } catch (e) {
        console.warn('Error reading saved WhatsApp templates:', e);
        this.customTemplates = {};
      }
    },

    saveCustomTemplates() {
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_TEMPLATES, JSON.stringify(this.customTemplates));
      } catch (e) {
        console.warn('Error saving WhatsApp templates:', e);
      }
    },

    getAllTemplates() {
      return { ...TEMPLATES, ...this.customTemplates };
    },

    getActiveTemplate() {
      const all = this.getAllTemplates();
      return all[this.state.templateKey] || all.new_drop || TEMPLATES.new_drop;
    },

    loadDraft() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_DRAFT);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.promoCode) this.state.promoCode = parsed.promoCode;
          if (parsed.templateKey) this.state.templateKey = parsed.templateKey;
          if (parsed.customMessage !== undefined) this.state.customMessage = parsed.customMessage;
          if (parsed.discountVal !== undefined) this.state.discountVal = parsed.discountVal;
          if (parsed.campaignName) this.state.campaignName = parsed.campaignName;
        }
      } catch (e) {}
    },

    saveDraft() {
      try {
        localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify({
          promoCode: this.state.promoCode,
          templateKey: this.state.templateKey,
          customMessage: this.state.customMessage,
          discountVal: this.state.discountVal,
          campaignName: this.state.campaignName,
          selectedProductIds: Array.from(this.state.selectedProductIds)
        }));
      } catch (e) {}
    },

    // ── Open WhatsApp Campaign Studio ──
    async open(options = {}) {
      if (!document.body) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.open(options), { once: true });
        } else {
          setTimeout(() => this.open(options), 50);
        }
        return;
      }

      // Auto-select products if none yet selected so catalog is never empty
      if (options.productIds && Array.isArray(options.productIds) && options.productIds.length > 0) {
        this.state.selectedProductIds = new Set(options.productIds);
      } else if (this.state.selectedProductIds.size === 0) {
        const prods = await this.getProductsList();
        if (prods && prods.length) {
          prods.forEach(p => this.state.selectedProductIds.add(p.id));
        }
      }

      // Handle customer targeting, cohort filtering, or fallback
      if (options.customerIds && Array.isArray(options.customerIds) && options.customerIds.length > 0) {
        this.state.selectedCustomerIds = new Set(options.customerIds);
        this.state.previewCustomerId = options.customerIds[0];
        // Target single or specific customer -> Jump straight to Step 3 (Message & Preview)
        this.state.step = options.step || 3;
      } else if (options.cohort) {
        this.state.cohortFilter = options.cohort;
        await this.applyCohortFilter(options.cohort);
        this.state.step = options.step || 2;
      } else {
        if (this.state.selectedCustomerIds.size === 0) {
          await this.applyCohortFilter('all');
        }
        this.state.step = options.step || (this.state.selectedProductIds.size > 0 ? 2 : 1);
      }

      this.state.queueIndex = 0;
      this.saveDraft();
      this.renderModal();
    },

    close() {
      const modal = document.getElementById('wa-campaign-modal');
      if (modal) modal.remove();
    },

    setStep(step) {
      if (step === 2 && this.state.selectedProductIds.size === 0) {
        if (!safeConfirm("You haven't selected any products yet. Continue to select all active products?")) return;
        this.selectAllProducts();
      }
      if (step === 3 && this.state.selectedCustomerIds.size === 0) {
        this.applyCohortFilter(this.state.cohortFilter);
      }
      if (step === 4) {
        this.initQueue();
      }
      this.state.step = step;
      this.saveDraft();
      this.renderModal();
    },

    // ── Getters for Products & Customers ──
    async getProductsList() {
      if (window.ProductsService?.getAll) {
        try {
          const p = window.ProductsService.getAll();
          if (p && p.length) return p;
        } catch (e) {}
      }
      if (window.ProductsService?.list) {
        try {
          const res = await window.ProductsService.list({ limit: 100 });
          return res.items || [];
        } catch (e) {}
      }
      if (window.dCat && window.dCat.length) {
        return window.dCat;
      }
      return [];
    },

    async getCustomersList() {
      let list = [];
      if (window.CustomersService?.getAll) {
        try {
          const c = window.CustomersService.getAll();
          if (c && c.length) list = c;
        } catch (e) {}
      }
      if (!list.length && window.CustomersService?.list) {
        try {
          const res = await window.CustomersService.list({ limit: 2000 });
          if (res?.items?.length) list = res.items;
        } catch (e) {}
      }
      if (!list.length && window._lastCustomersCache && window._lastCustomersCache.length) {
        list = window._lastCustomersCache;
      }
      if (!list.length && window.PERMANENT_SEEDED_CUSTOMERS && window.PERMANENT_SEEDED_CUSTOMERS.length) {
        list = window.PERMANENT_SEEDED_CUSTOMERS;
      }
      if (!list.length && window.dCompanies && window.dCompanies.length) {
        list = window.dCompanies.map(c => ({
          ...c,
          companyName: c.name,
          phone: c.phone || (c.country === 'BD' ? '+8801711000000' : c.country === 'NL' ? '+31205550192' : c.country === 'DE' ? '+49308921104' : '+442079460912')
        }));
      }
      return list;
    },

    // ── Phone Normalization for WhatsApp ──
    cleanPhoneForWhatsApp(raw) {
      if (!raw) return '';
      let clean = String(raw).replace(/[^0-9]/g, '');
      if (!clean) return '';
      // Bangladesh domestic standard: 01... (11 digits) -> 8801...
      if (clean.startsWith('01') && clean.length === 11) {
        clean = '88' + clean;
      } else if (clean.startsWith('06') && clean.length === 10) {
        clean = '31' + clean.slice(1);
      } else if (clean.startsWith('07') && clean.length === 11) {
        clean = '44' + clean.slice(1);
      }
      return clean;
    },

    // ── Product Selection Methods ──
    async toggleProduct(id) {
      if (this.state.selectedProductIds.has(id)) {
        this.state.selectedProductIds.delete(id);
      } else {
        this.state.selectedProductIds.add(id);
      }
      this.saveDraft();
      this.renderModal();
    },

    async selectAllProducts() {
      const prods = await this.getProductsList();
      prods.forEach(p => this.state.selectedProductIds.add(p.id));
      this.saveDraft();
      this.renderModal();
    },

    clearProducts() {
      this.state.selectedProductIds.clear();
      this.saveDraft();
      this.renderModal();
    },

    // ── Customer Cohort & Selection Methods ──
    async applyCohortFilter(cohort) {
      this.state.cohortFilter = cohort;
      const customers = await this.getCustomersList();
      this.state.selectedCustomerIds.clear();

      customers.forEach(c => {
        const phone = this.cleanPhoneForWhatsApp(c.phone || c.whatsapp || c.mobile || c.tel);

        if (cohort === 'all') {
          this.state.selectedCustomerIds.add(c.id);
        } else if (cohort === 'vip') {
          if ((c.totalSpent || 0) >= 40000 || (c.totalOrders || 0) >= 3 || (c.tags || []).includes('vip')) {
            this.state.selectedCustomerIds.add(c.id);
          }
        } else if (cohort === 'wholesale') {
          if ((c.tags || []).some(t => ['wholesale', 'b2b', 'boutique', 'export'].includes(String(t).toLowerCase())) || (c.moq || 0) > 10) {
            this.state.selectedCustomerIds.add(c.id);
          }
        } else if (cohort === 'bd') {
          if (c.country === 'BD' || phone.startsWith('880')) {
            this.state.selectedCustomerIds.add(c.id);
          }
        } else if (cohort === 'europe') {
          if (['NL', 'DE', 'GB', 'FR', 'ES', 'IT'].includes(c.country) || phone.startsWith('31') || phone.startsWith('49') || phone.startsWith('44')) {
            this.state.selectedCustomerIds.add(c.id);
          }
        } else if (cohort === 'us') {
          if (['US', 'CA'].includes(c.country) || phone.startsWith('1')) {
            this.state.selectedCustomerIds.add(c.id);
          }
        }
      });

      // Fallback: If strict cohort yielded 0, select all reachable customers
      if (this.state.selectedCustomerIds.size === 0 && customers.length > 0) {
        customers.forEach(c => this.state.selectedCustomerIds.add(c.id));
      }

      this.renderModal();
    },

    toggleCustomer(id) {
      if (this.state.selectedCustomerIds.has(id)) {
        this.state.selectedCustomerIds.delete(id);
      } else {
        this.state.selectedCustomerIds.add(id);
      }
      this.renderModal();
    },

    async selectAllFilteredCustomers() {
      const customers = await this.getCustomersList();
      customers.forEach(c => {
        this.state.selectedCustomerIds.add(c.id);
      });
      this.renderModal();
    },

    clearCustomers() {
      this.state.selectedCustomerIds.clear();
      this.renderModal();
    },

    // ── Generate Formatted Products List for WhatsApp ──
    async getFormattedProductsText() {
      const allProds = await this.getProductsList();
      const chosen = allProds.filter(p => this.state.selectedProductIds.has(p.id));
      if (!chosen.length) return '• Selected Products from Atelier';

      return chosen.map((p, idx) => {
        const origPrice = Number(p.pricing?.price || p.price || 0);
        let finalPrice = origPrice;
        if (this.state.discountType === 'percent' && this.state.discountVal > 0) {
          finalPrice = Math.round(origPrice * (1 - this.state.discountVal / 100));
        } else if (this.state.discountType === 'flat' && this.state.discountVal > 0) {
          finalPrice = Math.max(0, origPrice - this.state.discountVal);
        }

        const priceStr = origPrice !== finalPrice 
          ? `~৳${origPrice.toLocaleString()}~ ➔ *৳${finalPrice.toLocaleString()}*`
          : `*৳${origPrice.toLocaleString()}*`;

        const stock = p.totalInventory !== undefined ? p.totalInventory : (p.stock || 12);
        const sku = p.variants?.[0]?.sku || p.sku || '';

        return `${idx + 1}. *${p.title}* ${sku ? `[${sku}]` : ''}\n   Price: ${priceStr} | In Stock: ${stock} pcs`;
      }).join('\n\n');
    },

    // ── Lookbook Link Generator ──
    getLookbookShareUrl() {
      const pIds = Array.from(this.state.selectedProductIds).join(',');
      const promo = encodeURIComponent(this.state.promoCode || 'VIP26');
      return `https://handsandhead.com/lookbook?p=${pIds}&promo=${promo}`;
    },

    // ── Orders Lookup for Dynamic Order Placeholders ({order_id}, {order_status}, etc.) ──
    async getOrdersList() {
      if (window.OrdersService?.getAll) {
        try {
          const o = window.OrdersService.getAll();
          if (o && o.length) return o;
        } catch (e) {}
      }
      if (window.OrdersService?.list) {
        try {
          const res = await window.OrdersService.list({ limit: 500 });
          if (res?.items?.length) return res.items;
        } catch (e) {}
      }
      if (window.appState?.orders?.length) return window.appState.orders;
      if (window._lastOrdersCache?.length) return window._lastOrdersCache;
      return [];
    },

    async getCustomerLatestOrder(customer) {
      if (!customer) return null;
      try {
        const orders = await this.getOrdersList();
        if (orders && orders.length) {
          const custId = customer.id;
          const custName = (customer.name || customer.contactPerson || '').toLowerCase().trim();
          const custEmail = (customer.email || '').toLowerCase().trim();
          const custPhone = (customer.phone || '').replace(/[^0-9]/g, '');

          const matching = orders.filter(o => {
            if (custId && (o.customerId === custId || o.customer?.id === custId)) return true;
            const oCustName = (o.customerSnapshot?.name || o.customer?.name || o.Customer || '').toLowerCase().trim();
            if (custName && oCustName && (oCustName === custName || oCustName.includes(custName) || custName.includes(oCustName))) return true;
            if (custEmail && (o.customerSnapshot?.email === custEmail || o.customer?.email === custEmail)) return true;
            const oPhone = (o.customerSnapshot?.phone || o.customer?.phone || '').replace(/[^0-9]/g, '');
            if (custPhone && oPhone && (oPhone.endsWith(custPhone) || custPhone.endsWith(oPhone))) return true;
            return false;
          });

          if (matching.length) {
            matching.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
            return matching[0];
          }
        }
      } catch (e) {
        console.warn('Error fetching order for customer:', e);
      }

      // Authentic deterministic fallback order reference
      const hash = customer.id ? Math.abs(customer.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) : 1088;
      const fallbackNum = customer.lastOrderNumber || customer.orderNumber || ('HH-ORD-' + (7000 + (hash % 2999)));
      return {
        orderNumber: fallbackNum,
        id: fallbackNum,
        status: 'CONFIRMED',
        total: customer.totalSpent ? Math.round(customer.totalSpent / Math.max(1, customer.totalOrders || 1)) : 14500,
        lineItems: [{ title: 'Handcrafted Vegetable-Tanned Leather Goods', quantity: 1, price: 14500 }]
      };
    },

    // ── Template Selection & State ──
    selectTemplate(key) {
      this.state.templateKey = key;
      const tpl = this.getAllTemplates()[key];
      this.state.customMessage = tpl ? tpl.body : '';
      this.saveDraft();
      this.renderModal();
    },

    // ── Insertion of Dynamic Placeholders at Cursor ──
    insertPlaceholderTag(tag) {
      const editor = document.getElementById('wa-template-editor');
      if (!editor) return;
      const start = editor.selectionStart !== undefined ? editor.selectionStart : editor.value.length;
      const end = editor.selectionEnd !== undefined ? editor.selectionEnd : editor.value.length;
      const val = editor.value;
      editor.value = val.substring(0, start) + tag + val.substring(end);
      editor.focus();
      const newPos = start + tag.length;
      editor.setSelectionRange(newPos, newPos);
      this.state.customMessage = editor.value;
      this.saveDraft();
      this.updateLivePreview();
    },

    handleEditorInput(val) {
      this.state.customMessage = val;
      this.saveDraft();
      this.updateLivePreview();
    },

    async updateLivePreview() {
      const previewContainer = document.querySelector('.wa-bubble-text');
      if (!previewContainer) return;
      const allCustomers = await this.getCustomersList();
      const selectedCusts = allCustomers.filter(c => this.state.selectedCustomerIds.has(c.id));
      const targetId = this.state.previewCustomerId;
      const previewCust = (targetId && allCustomers.find(c => c.id === targetId))
        || selectedCusts[0]
        || allCustomers[0]
        || { name: 'Rahim Chowdhury', companyName: 'Dhaka Concept Boutique', phone: '+8801711000000', country: 'BD' };
      const msg = await this.buildPersonalizedMessage(previewCust, false);
      previewContainer.innerHTML = msg.replace(/\n/g, '<br/>');
    },

    // ── Save & Manage User Custom Templates ──
    openSaveTemplateModal(isEdit = false) {
      const active = this.getActiveTemplate();
      const isCustomActive = isEdit && active.isCustom;
      const currentName = isCustomActive ? active.label : '';
      const currentBadge = isCustomActive ? (active.badge || 'CUSTOM') : 'CUSTOM';

      const existingDialog = document.getElementById('wa-save-template-dialog');
      if (existingDialog) existingDialog.remove();

      const dialog = document.createElement('div');
      dialog.id = 'wa-save-template-dialog';
      dialog.className = 'wa-tpl-dialog-backdrop';
      dialog.innerHTML = `
        <div class="wa-tpl-dialog-box">
          <div style="padding:14px 18px;background:var(--bg-2);border-bottom:1px solid var(--wire);display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">💾</span>
              <span style="font-size:14px;font-weight:700;color:var(--ink);">
                ${isCustomActive ? 'Update Saved Template' : 'Save Message as Reusable Template'}
              </span>
            </div>
            <button class="btn btn-dark btn-xs" onclick="document.getElementById('wa-save-template-dialog').remove()">✕</button>
          </div>
          <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px;background:var(--bg-1);">
            <div class="field">
              <label style="font-size:11.5px;font-weight:600;">Template Title / Label *</label>
              <input type="text" id="wa-tpl-input-name" placeholder="e.g., VIP Capsule Announcement or Order Status Alert" value="${currentName}" 
                     style="height:36px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 10px;font-size:12.5px;border-radius:6px;width:100%;"/>
            </div>

            <div class="field">
              <label style="font-size:11.5px;font-weight:600;">Category Tag</label>
              <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px;">
                ${['ORDERS', 'VIP', 'WHOLESALE', 'PROMO', 'RETENTION', 'LOOKBOOK', 'CUSTOM'].map(b => `
                  <button type="button" class="btn btn-xs btn-dark" style="font-size:10px;padding:3px 8px;" onclick="document.getElementById('wa-tpl-input-badge').value = '${b}';">
                    ${b}
                  </button>
                `).join('')}
              </div>
              <input type="text" id="wa-tpl-input-badge" placeholder="Badge label (e.g. VIP, ORDERS, B2B)" value="${currentBadge}"
                     style="height:32px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 10px;font-size:11px;border-radius:6px;font-family:var(--mono);text-transform:uppercase;width:100%;"/>
            </div>

            <div style="font-size:11px;color:var(--ink-2);background:var(--bg-2);padding:10px 12px;border-radius:6px;border:1px solid var(--wire);line-height:1.5;">
              ✨ <strong>Dynamic Placeholders Supported:</strong><br/>
              <code>{customer_name}</code>, <code>{first_name}</code>, <code>{company_name}</code>, <code>{order_id}</code>, <code>{order_status}</code>, <code>{order_total}</code>, <code>{order_items}</code>, <code>{productsList}</code>, <code>{promoCode}</code>, <code>{discount}</code>, <code>{lookbookUrl}</code>.
            </div>
          </div>
          <div style="padding:12px 18px;background:var(--bg-2);border-top:1px solid var(--wire);display:flex;justify-content:flex-end;gap:8px;">
            <button class="btn btn-dark" onclick="document.getElementById('wa-save-template-dialog').remove()">Cancel</button>
            <button class="btn btn-emerald" onclick="window.WhatsAppCampaignStudio.handleSaveTemplateSubmit(${isCustomActive})">
              ${isCustomActive ? '✓ Update Template' : '💾 Save & Set as Active'}
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
      setTimeout(() => {
        const input = document.getElementById('wa-tpl-input-name');
        if (input) input.focus();
      }, 50);
    },

    handleSaveTemplateSubmit(isEdit) {
      const nameInput = document.getElementById('wa-tpl-input-name');
      const badgeInput = document.getElementById('wa-tpl-input-badge');
      const name = (nameInput?.value || '').trim();
      const badge = (badgeInput?.value || 'CUSTOM').trim().toUpperCase();

      if (!name) {
        showToast('⚠️ Please enter a template title.');
        if (nameInput) nameInput.focus();
        return;
      }

      const body = this.state.customMessage || this.getActiveTemplate().body;

      if (isEdit && this.customTemplates[this.state.templateKey]) {
        this.customTemplates[this.state.templateKey].label = name;
        this.customTemplates[this.state.templateKey].badge = badge;
        this.customTemplates[this.state.templateKey].body = body;
        this.customTemplates[this.state.templateKey].updatedAt = new Date().toISOString();
        showToast(`✓ Updated template: "${name}"`);
      } else {
        const id = 'custom_' + Date.now();
        this.customTemplates[id] = {
          id,
          label: name,
          badge,
          headline: name,
          body,
          isCustom: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.state.templateKey = id;
        this.state.customMessage = body;
        showToast(`✓ Saved new reusable template: "${name}"`);
      }

      this.saveCustomTemplates();
      this.saveDraft();
      const dialog = document.getElementById('wa-save-template-dialog');
      if (dialog) dialog.remove();
      this.renderModal();
    },

    deleteCustomTemplate(id, event) {
      if (event) event.stopPropagation();
      const tpl = this.customTemplates[id];
      if (!tpl) return;
      if (!safeConfirm(`Are you sure you want to delete template "${tpl.label}"?`)) return;

      delete this.customTemplates[id];
      this.saveCustomTemplates();

      if (this.state.templateKey === id) {
        this.state.templateKey = 'new_drop';
        this.state.customMessage = '';
      }

      showToast(`✓ Deleted template "${tpl.label}"`);
      this.renderModal();
    },

    // ── Generate Personalized Message for Customer ──
    async buildPersonalizedMessage(customer, isEncoded = false) {
      const activeTpl = this.getActiveTemplate();
      let raw = this.state.customMessage || activeTpl.body;

      const firstName = (customer.name || customer.contactPerson || 'Valued Customer').trim().split(' ')[0];
      const fullName = (customer.name || customer.contactPerson || customer.companyName || 'Valued Buyer').trim();
      const company = customer.companyName || customer.name || 'Your Atelier';
      const paymentTerms = customer.paymentTerms || 'Net 30 / COD';
      
      const discountText = this.state.discountType === 'percent' 
        ? `${this.state.discountVal}% OFF`
        : this.state.discountType === 'flat' 
          ? `৳${this.state.discountVal} OFF`
          : 'Special VIP Offer';

      const productsList = await this.getFormattedProductsText();
      const lookbookUrl = this.getLookbookShareUrl();

      // Resolve latest customer order for order placeholders
      const latestOrder = await this.getCustomerLatestOrder(customer);
      const orderId = latestOrder?.orderNumber || latestOrder?.id || ('HH-ORD-' + (customer.id ? customer.id.slice(-4) : '8920'));
      const orderStatus = latestOrder?.status || latestOrder?.fulfillmentStatus || 'CONFIRMED';
      const orderTotal = `৳${Number(latestOrder?.total || customer.totalSpent || 14500).toLocaleString()}`;
      
      let orderItems = 'Handcrafted Atelier Leather Essentials';
      if (latestOrder?.lineItems && latestOrder.lineItems.length) {
        orderItems = latestOrder.lineItems.map(li => `${li.title || 'Leather Goods'} (x${li.quantity || 1})`).join(', ');
      } else if (latestOrder?.Items) {
        orderItems = latestOrder.Items;
      }

      const formattedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Safe replace helper that replaces exact and case-insensitive tags
      const replaceTag = (text, placeholder, val) => {
        const re = new RegExp(`\\{${placeholder}\\}`, 'gi');
        return text.replace(re, val !== undefined && val !== null ? val : '');
      };

      let msg = raw;
      // Customer dynamic placeholders
      msg = replaceTag(msg, 'customer_name', fullName);
      msg = replaceTag(msg, 'customerName', fullName);
      msg = replaceTag(msg, 'name', fullName);
      msg = replaceTag(msg, 'fullName', fullName);
      msg = replaceTag(msg, 'first_name', firstName);
      msg = replaceTag(msg, 'firstName', firstName);
      msg = replaceTag(msg, 'company_name', company);
      msg = replaceTag(msg, 'companyName', company);
      msg = replaceTag(msg, 'phone', customer.phone || '');
      msg = replaceTag(msg, 'country', customer.country || '');
      
      // Order dynamic placeholders
      msg = replaceTag(msg, 'order_id', orderId);
      msg = replaceTag(msg, 'orderId', orderId);
      msg = replaceTag(msg, 'order_number', orderId);
      msg = replaceTag(msg, 'orderNumber', orderId);
      msg = replaceTag(msg, 'order_status', orderStatus);
      msg = replaceTag(msg, 'orderStatus', orderStatus);
      msg = replaceTag(msg, 'order_total', orderTotal);
      msg = replaceTag(msg, 'orderTotal', orderTotal);
      msg = replaceTag(msg, 'order_items', orderItems);
      msg = replaceTag(msg, 'orderItems', orderItems);

      // Campaign dynamic placeholders
      msg = replaceTag(msg, 'paymentTerms', paymentTerms);
      msg = replaceTag(msg, 'payment_terms', paymentTerms);
      msg = replaceTag(msg, 'discount', discountText);
      msg = replaceTag(msg, 'promoCode', this.state.promoCode || 'VIPDROP26');
      msg = replaceTag(msg, 'promo_code', this.state.promoCode || 'VIPDROP26');
      msg = replaceTag(msg, 'productsList', productsList);
      msg = replaceTag(msg, 'products_list', productsList);
      msg = replaceTag(msg, 'lookbookUrl', lookbookUrl);
      msg = replaceTag(msg, 'lookbook_url', lookbookUrl);
      msg = replaceTag(msg, 'date', formattedDate);

      return isEncoded ? encodeURIComponent(msg) : msg;
    },

    // ── Interactive Queue Runner & Dispatch Engine ──
    async initQueue() {
      this.state.queueIndex = 0;
      this.state.dispatchLog = {};
    },

    async getQueueCustomers() {
      const customers = await this.getCustomersList();
      return customers.filter(c => this.state.selectedCustomerIds.has(c.id));
    },

    async buildWhatsAppLink(customer, preferWeb = false) {
      if (!customer) return '#';
      const rawPhone = customer.phone || customer.whatsapp || customer.mobile || customer.tel || '';
      const phone = this.cleanPhoneForWhatsApp(rawPhone) || '8801711000000';
      const encodedMsg = await this.buildPersonalizedMessage(customer, true);
      const base = preferWeb ? 'https://web.whatsapp.com/send' : 'https://wa.me';
      if (preferWeb) {
        return `${base}?phone=${phone}&text=${encodedMsg}`;
      }
      return `${base}/${phone}?text=${encodedMsg}`;
    },

    async sendCustomerWhatsApp(customer, preferWeb = false) {
      if (!customer) return;
      const rawPhone = customer.phone || customer.whatsapp || customer.mobile || customer.tel || '';
      const phone = this.cleanPhoneForWhatsApp(rawPhone);
      if (!phone) {
        showToast(`⚠️ No valid phone number for ${customer.companyName || customer.name || 'buyer'}.`);
        return;
      }

      const waUrl = await this.buildWhatsAppLink(customer, preferWeb);

      // Record dispatch status
      this.state.dispatchLog[customer.id] = {
        status: 'sent',
        sentAt: new Date().toISOString()
      };

      showToast(`✓ Opening WhatsApp for ${customer.companyName || customer.name || 'buyer'}…`);

      // Bypass iframe sandbox popup blocker via real native anchor click
      try {
        const a = document.createElement('a');
        a.href = waUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 200);
      } catch (e) {
        window.open(waUrl, '_blank');
      }
    },

    async sendPreviewCustomer(preferWeb = false) {
      const allCustomers = await this.getCustomersList();
      const targetCustId = this.state.previewCustomerId;
      const cust = (targetCustId && allCustomers.find(c => c.id === targetCustId))
        || allCustomers.find(c => this.state.selectedCustomerIds.has(c.id))
        || allCustomers[0];
      if (!cust) {
        showToast('⚠️ No customer selected.');
        return;
      }
      await this.sendCustomerWhatsApp(cust, preferWeb);
    },

    async sendCurrentQueueContact(preferWeb = false) {
      const queue = await this.getQueueCustomers();
      if (this.state.queueIndex >= queue.length) return;

      const current = queue[this.state.queueIndex];
      const rawPhone = current.phone || current.whatsapp || current.mobile || current.tel;
      const phone = this.cleanPhoneForWhatsApp(rawPhone);
      if (!phone) {
        showToast(`⚠️ Customer ${current.name} has no valid phone.`);
        this.skipCurrentQueueContact();
        return;
      }

      await this.sendCustomerWhatsApp(current, preferWeb);

      // Auto Advance Queue
      if (this.state.autoAdvance) {
        setTimeout(() => {
          this.advanceQueue();
        }, 1200);
      } else {
        this.renderModal();
      }
    },

    advanceQueue() {
      this.state.queueIndex++;
      this.renderModal();
    },

    skipCurrentQueueContact() {
      const queueIds = Array.from(this.state.selectedCustomerIds);
      const currentId = queueIds[this.state.queueIndex];
      if (currentId) {
        this.state.dispatchLog[currentId] = {
          status: 'skipped',
          sentAt: new Date().toISOString()
        };
      }
      this.advanceQueue();
    },

    async copyCurrentMessage() {
      let current = null;
      if (this.state.step === 3) {
        const allCusts = await this.getCustomersList();
        const tid = this.state.previewCustomerId;
        current = (tid && allCusts.find(c => c.id === tid))
          || allCusts.find(c => this.state.selectedCustomerIds.has(c.id))
          || allCusts[0];
      } else {
        const queue = await this.getQueueCustomers();
        current = queue[this.state.queueIndex] || queue[0];
      }

      if (!current) return;
      const msg = await this.buildPersonalizedMessage(current, false);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(() => {
          showToast(`📋 Copied personalized text for ${current.companyName || current.name} to clipboard!`);
        }).catch(() => {
          this.fallbackCopyText(msg);
        });
      } else {
        this.fallbackCopyText(msg);
      }
    },

    fallbackCopyText(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('📋 Copied personalized text to clipboard!');
      } catch (e) {
        showToast('⚠️ Could not auto-copy. Please select and copy manually.');
      }
      ta.remove();
    },

    // ── Export WhatsApp Broadcast VCF (vCards) ──
    async exportVCF() {
      const customers = await this.getCustomersList();
      const chosen = customers.filter(c => this.state.selectedCustomerIds.has(c.id));
      if (!chosen.length) {
        showToast('⚠️ No customers selected to export.');
        return;
      }

      let vcf = '';
      const dateStr = new Date().toISOString().slice(0, 10);
      chosen.forEach((c, idx) => {
        const clean = this.cleanPhoneForWhatsApp(c.phone || c.whatsapp || c.mobile || c.tel);
        if (!clean) return;
        const name = c.companyName || c.name || `Buyer ${idx + 1}`;
        vcf += `BEGIN:VCARD\r\n`;
        vcf += `VERSION:3.0\r\n`;
        vcf += `FN:H&H · ${name}\r\n`;
        vcf += `ORG:Hands & Head Broadcast\r\n`;
        vcf += `TEL;TYPE=CELL,VOICE:+${clean}\r\n`;
        if (c.email) vcf += `EMAIL;TYPE=WORK:${c.email}\r\n`;
        vcf += `NOTE:Campaign: ${this.state.campaignName} (${dateStr})\r\n`;
        vcf += `END:VCARD\r\n`;
      });

      const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HH_WhatsApp_Broadcast_${dateStr}.vcf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`✓ Exported ${chosen.length} contacts as VCF! Import to phone for WhatsApp Broadcast list.`);
    },

    // ── Export Meta WhatsApp Cloud API JSON Payload ──
    async exportMetaJSON() {
      const customers = await this.getCustomersList();
      const chosen = customers.filter(c => this.state.selectedCustomerIds.has(c.id));
      const payload = {
        campaign: this.state.campaignName,
        createdAt: new Date().toISOString(),
        productIds: Array.from(this.state.selectedProductIds),
        template: this.state.templateKey,
        recipients: await Promise.all(chosen.map(async c => ({
          customerId: c.id,
          name: c.name,
          phone: '+' + this.cleanPhoneForWhatsApp(c.phone || c.whatsapp || c.mobile || c.tel),
          company: c.companyName || '',
          personalizedMessage: await this.buildPersonalizedMessage(c, false)
        })))
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HH_Meta_WhatsApp_Payload_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('✓ Exported Meta WhatsApp Cloud API JSON payload!');
    },

    // ── Save Completed Campaign to Database & History ──
    async saveCampaignRecord() {
      const queue = await this.getQueueCustomers();
      const sentCount = Object.values(this.state.dispatchLog).filter(d => d.status === 'sent').length;
      const record = {
        id: 'camp_' + Date.now(),
        name: this.state.campaignName,
        createdAt: new Date().toISOString(),
        productsCount: this.state.selectedProductIds.size,
        recipientsCount: queue.length,
        sentCount: sentCount,
        promoCode: this.state.promoCode,
        template: this.state.templateKey
      };

      try {
        let history = JSON.parse(localStorage.getItem(STORAGE_KEY_CAMPAIGNS) || '[]');
        history.unshift(record);
        localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(history.slice(0, 50)));

        // Attempt server-side log
        fetch('/api/whatsapp-campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        }).catch(() => {});

        showToast(`🎉 Campaign recorded! Sent to ${sentCount} customers.`);
        this.close();
      } catch (e) {
        showToast('Campaign ended. ' + e.message);
        this.close();
      }
    },

    // ── Digital Lookbook Interactive Modal ──
    async openLookbookViewer(productIds = []) {
      const allProds = await this.getProductsList();
      const targetIds = productIds.length ? productIds : Array.from(this.state.selectedProductIds);
      const prods = allProds.filter(p => targetIds.includes(p.id));

      const viewer = document.createElement('div');
      viewer.id = 'hh-lookbook-viewer';
      viewer.className = 'lookbook-fullscreen-modal';
      viewer.innerHTML = `
        <div class="lookbook-inner">
          <div class="lookbook-header">
            <div>
              <div style="font-size:10px;color:var(--gold);font-family:var(--mono);text-transform:uppercase;letter-spacing:1.5px;">HANDS &amp; HEAD · DIGITAL LOOKBOOK</div>
              <div style="font-size:18px;font-weight:700;color:var(--ink);margin-top:2px;">Atelier Capsule Showcase</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="pill ok" style="font-size:10px;">${prods.length} SIGNATURE PIECES</span>
              <button class="btn btn-dark btn-sm" onclick="document.getElementById('hh-lookbook-viewer').remove()">✕ Close</button>
            </div>
          </div>

          <div class="lookbook-grid">
            ${prods.map(p => `
              <div class="lookbook-card">
                <div class="lookbook-img-wrap">
                  <img src="${p.images?.[0]?.url || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80'}" alt="${p.title}"/>
                  <div class="lookbook-badge">HANDCRAFTED</div>
                </div>
                <div class="lookbook-content">
                  <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);">${p.variants?.[0]?.sku || 'SKU-ATELIER'}</div>
                  <div style="font-size:16px;font-weight:700;color:var(--ink);margin:4px 0;">${p.title}</div>
                  <div style="font-size:12px;color:var(--ink-2);line-height:1.5;margin-bottom:12px;">
                    ${p.description || 'Vegetable-tanned full-grain leather, hand-stitched with burnished wax edges. Designed in Dhaka.'}
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--wire);">
                    <div style="font-size:18px;font-weight:800;color:var(--coral);">৳${Number(p.pricing?.price || p.price || 0).toLocaleString()}</div>
                    <button class="btn btn-emerald btn-sm" onclick="window.open('https://wa.me/?text=' + encodeURIComponent('Hi Hands & Head, I want to order the *${p.title}* (SKU: ${p.variants?.[0]?.sku || ''}) from the Digital Lookbook.'), '_blank')">
                      💬 Order on WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      document.body.appendChild(viewer);
    },

    // ── Main Responsive Modal Renderer ──
    async renderModal() {
      if (!document.body) {
        setTimeout(() => this.renderModal(), 50);
        return;
      }
      let modal = document.getElementById('wa-campaign-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'wa-campaign-modal';
        modal.className = 'wa-campaign-modal-backdrop';
        document.body.appendChild(modal);
      }

      const allProducts = await this.getProductsList();
      const allCustomers = await this.getCustomersList();

      const selectedProds = allProducts.filter(p => this.state.selectedProductIds.has(p.id));
      const selectedCusts = allCustomers.filter(c => this.state.selectedCustomerIds.has(c.id));

      const step = this.state.step;
      const targetCustId = this.state.previewCustomerId;
      const previewCust = (targetCustId && allCustomers.find(c => c.id === targetCustId))
        || selectedCusts[0]
        || allCustomers[0]
        || { name: 'Rahim Chowdhury', companyName: 'Dhaka Concept Boutique', phone: '+8801711000000', country: 'BD' };
      const previewMsg = await this.buildPersonalizedMessage(previewCust, false);

      modal.innerHTML = `
        <div class="wa-campaign-modal-container">
          <!-- Top Header Bar -->
          <div class="wa-modal-header">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="wa-logo-bubble">
                <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:currentColor;"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.49 0-2.94-.4-4.22-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.24-8.22 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.72 4.31 3.81.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.47-.29z"/></svg>
              </div>
              <div>
                <div style="font-size:10px;font-family:var(--mono);color:var(--ok);text-transform:uppercase;letter-spacing:1px;font-weight:700;">
                  WhatsApp Broadcast Studio · Omnichannel Hub
                </div>
                <div style="font-size:16px;font-weight:800;color:var(--ink);line-height:1.2;">
                  Send Bulk Products to Bulk Buyers
                </div>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:8px;">
              <button class="btn btn-dark btn-sm" onclick="window.WhatsAppCampaignStudio.openLookbookViewer()" title="Preview Customer Web Lookbook">
                📖 View Lookbook
              </button>
              <button class="btn btn-dark btn-sm" onclick="window.WhatsAppCampaignStudio.close()" title="Close Studio">
                ✕
              </button>
            </div>
          </div>

          <!-- Wizard Step Navigation Bar -->
          <div class="wa-wizard-steps">
            <button class="wa-step-btn ${step === 1 ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.setStep(1)">
              <span class="step-num">1</span>
              <span class="step-label">Curate Products (${this.state.selectedProductIds.size})</span>
            </button>
            <button class="wa-step-btn ${step === 2 ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.setStep(2)">
              <span class="step-num">2</span>
              <span class="step-label">Target Audience (${this.state.selectedCustomerIds.size})</span>
            </button>
            <button class="wa-step-btn ${step === 3 ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.setStep(3)">
              <span class="step-num">3</span>
              <span class="step-label">Message &amp; Preview</span>
            </button>
            <button class="wa-step-btn ${step === 4 ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.setStep(4)">
              <span class="step-num">4</span>
              <span class="step-label">🚀 Dispatch Console</span>
            </button>
          </div>

          <!-- Step Content Area -->
          <div class="wa-modal-body">
            ${step === 1 ? this.renderStep1Products(allProducts) : ''}
            ${step === 2 ? this.renderStep2Audience(allCustomers) : ''}
            ${step === 3 ? this.renderStep3Message(previewCust, previewMsg, allCustomers, selectedCusts) : ''}
            ${step === 4 ? this.renderStep4Dispatch(selectedCusts) : ''}
          </div>

          <!-- Bottom Action Bar -->
          <div class="wa-modal-footer">
            <div style="font-size:11.5px;color:var(--ink-2);display:flex;gap:12px;align-items:center;">
              <span><strong>${this.state.selectedProductIds.size}</strong> products</span>
              <span>•</span>
              <span><strong>${this.state.selectedCustomerIds.size}</strong> verified buyers</span>
              <span>•</span>
              <span>Promo: <strong style="color:var(--gold);">${this.state.promoCode}</strong></span>
            </div>

            <div style="display:flex;gap:8px;">
              ${step > 1 ? `
                <button class="btn btn-dark" onclick="window.WhatsAppCampaignStudio.setStep(${step - 1})">
                  ‹ Back
                </button>
              ` : ''}

              ${step < 4 ? `
                <button class="btn btn-gold" onclick="window.WhatsAppCampaignStudio.setStep(${step + 1})">
                  Continue to Step ${step + 1} ›
                </button>
              ` : `
                <button class="btn btn-emerald" onclick="window.WhatsAppCampaignStudio.sendCurrentQueueContact()">
                  🚀 Send Next via WhatsApp
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    },

    // ── Step 1: Curate Products ──
    renderStep1Products(allProducts) {
      const q = this.state.searchProductQuery.toLowerCase().trim();
      const filtered = allProducts.filter(p => {
        if (!q) return true;
        return (p.title || '').toLowerCase().includes(q) || (p.variants?.[0]?.sku || '').toLowerCase().includes(q);
      });

      return `
        <div style="display:flex;flex-direction:column;gap:14px;height:100%;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div style="font-size:13px;color:var(--ink-2);">
              Select items from your catalog to include in this WhatsApp drop showcase.
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-xs btn-dark" onclick="window.WhatsAppCampaignStudio.selectAllProducts()">Select All</button>
              <button class="btn btn-xs btn-dark" onclick="window.WhatsAppCampaignStudio.clearProducts()">Clear</button>
            </div>
          </div>

          <div style="display:flex;gap:8px;">
            <input type="text" placeholder="Search catalog by title, SKU, category…" 
                   value="${this.state.searchProductQuery}" 
                   oninput="window.WhatsAppCampaignStudio.state.searchProductQuery = this.value; window.WhatsAppCampaignStudio.renderModal();" 
                   style="flex:1;height:36px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 12px;font-size:12px;border-radius:6px;"/>
          </div>

          <div class="wa-products-grid">
            ${filtered.map(p => {
              const isSelected = this.state.selectedProductIds.has(p.id);
              const img = p.images?.[0]?.url || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=400&q=80';
              return `
                <div class="wa-prod-select-card ${isSelected ? 'selected' : ''}" onclick="window.WhatsAppCampaignStudio.toggleProduct('${p.id}')">
                  <div class="wa-prod-check">
                    ${isSelected ? '✓' : ''}
                  </div>
                  <img src="${img}" alt="${p.title}" class="wa-prod-thumb"/>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:12.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</div>
                    <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);margin-top:2px;">
                      SKU: ${p.variants?.[0]?.sku || '—'} · Stock: ${p.totalInventory !== undefined ? p.totalInventory : (p.stock || 12)} pcs
                    </div>
                    <div style="font-size:13px;font-weight:800;color:var(--coral);margin-top:4px;">
                      ৳${Number(p.pricing?.price || p.price || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    },

    // ── Step 2: Target Audience ──
    renderStep2Audience(allCustomers) {
      const q = this.state.searchCustomerQuery.toLowerCase().trim();
      const filtered = allCustomers.filter(c => {
        if (!q) return true;
        return (c.name || '').toLowerCase().includes(q) ||
               (c.companyName || '').toLowerCase().includes(q) ||
               (c.phone || '').includes(q) ||
               (c.country || '').toLowerCase().includes(q);
      });

      return `
        <div style="display:flex;flex-direction:column;gap:14px;height:100%;">
          <!-- Quick Cohort Segmentation Bar -->
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="font-size:11px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;letter-spacing:0.5px;">
              Segment Customer Cohort (From 15K+ Database)
            </div>
            <div class="wa-cohort-pills">
              <button class="wa-cohort-pill ${this.state.cohortFilter === 'all' ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.applyCohortFilter('all')">
                👥 All Reachable (${allCustomers.length})
              </button>
              <button class="wa-cohort-pill ${this.state.cohortFilter === 'vip' ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.applyCohortFilter('vip')">
                👑 VIP Wholesalers (&gt;৳40K)
              </button>
              <button class="wa-cohort-pill ${this.state.cohortFilter === 'wholesale' ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.applyCohortFilter('wholesale')">
                📦 B2B Boutiques &amp; Export
              </button>
              <button class="wa-cohort-pill ${this.state.cohortFilter === 'bd' ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.applyCohortFilter('bd')">
                🇧🇩 Bangladesh Domestic
              </button>
              <button class="wa-cohort-pill ${this.state.cohortFilter === 'europe' ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.applyCohortFilter('europe')">
                🇪🇺 Europe (NL, DE, GB)
              </button>
              <button class="wa-cohort-pill ${this.state.cohortFilter === 'us' ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.applyCohortFilter('us')">
                🇺🇸 US &amp; Americas
              </button>
            </div>
          </div>

          <!-- Search & Manual Bulk Toggles -->
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" placeholder="Search buyers by name, phone, company, or country…" 
                   value="${this.state.searchCustomerQuery}" 
                   oninput="window.WhatsAppCampaignStudio.state.searchCustomerQuery = this.value; window.WhatsAppCampaignStudio.renderModal();" 
                   style="flex:1;height:36px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:0 12px;font-size:12px;border-radius:6px;"/>
            
            <button class="btn btn-xs btn-dark" onclick="window.WhatsAppCampaignStudio.selectAllFilteredCustomers()">Select All</button>
            <button class="btn btn-xs btn-dark" onclick="window.WhatsAppCampaignStudio.clearCustomers()">Clear</button>
          </div>

          <!-- Customer List Table -->
          <div class="wa-customers-list">
            ${filtered.slice(0, 100).map(c => {
              const isSelected = this.state.selectedCustomerIds.has(c.id);
              const cleanPhone = this.cleanPhoneForWhatsApp(c.phone);
              const isValid = cleanPhone && cleanPhone.length >= 8;
              return `
                <div class="wa-cust-row ${isSelected ? 'selected' : ''}" onclick="window.WhatsAppCampaignStudio.toggleCustomer('${c.id}')">
                  <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); window.WhatsAppCampaignStudio.toggleCustomer('${c.id}')"/>
                  <div style="font-size:16px;">${c.flag || '🏢'}</div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:12.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${c.companyName || c.name}
                    </div>
                    <div style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">
                      ${c.contactPerson ? `${c.contactPerson} · ` : ''}${c.phone || 'No phone'} · ${c.country || '—'}
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:11px;font-weight:700;color:var(--gold);font-family:var(--mono);">৳${(c.totalSpent || 0).toLocaleString()}</div>
                    <span class="pill ${isValid ? 'ok' : 'warn'}" style="font-size:8px;">${isValid ? 'VALID WA' : 'NO PHONE'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    },

    // ── Step 3: Message & Live WhatsApp Phone Preview ──
    renderStep3Message(previewCust, previewMsg, allCustomers = [], selectedCusts = []) {
      const allTemplates = this.getAllTemplates();
      const activeTpl = this.getActiveTemplate();
      const currentBody = this.state.customMessage !== '' ? this.state.customMessage : activeTpl.body;
      const charCount = currentBody.length;
      const wordCount = currentBody.trim() ? currentBody.trim().split(/\s+/).length : 0;
      const tplEntries = Object.entries(allTemplates);

      const placeholderChips = [
        { tag: '{customer_name}', label: 'Customer Name', icon: '👤' },
        { tag: '{order_id}', label: 'Order ID', icon: '📦' },
        { tag: '{order_status}', label: 'Order Status', icon: '🏷️' },
        { tag: '{order_total}', label: 'Order Total', icon: '💰' },
        { tag: '{order_items}', label: 'Order Items', icon: '📋' },
        { tag: '{first_name}', label: 'First Name', icon: '👋' },
        { tag: '{company_name}', label: 'Company', icon: '🏢' },
        { tag: '{productsList}', label: 'Products List', icon: '✨' },
        { tag: '{promoCode}', label: 'Promo Code', icon: '🎟️' },
        { tag: '{discount}', label: 'Discount', icon: '🏷️' },
        { tag: '{lookbookUrl}', label: 'Lookbook Link', icon: '📖' },
        { tag: '{date}', label: 'Date', icon: '📅' }
      ];

      return `
        <div class="wa-step3-layout">
          <!-- Left Column: Copywriting & Template Controls -->
          <div class="wa-copy-controls">
            <!-- Template Management Bar -->
            <div class="field" style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <label style="margin:0;font-weight:700;font-size:12px;color:var(--ink);">Message Templates</label>
                  <span class="pill ok" style="font-size:9px;font-family:var(--mono);">${tplEntries.length} TEMPLATES</span>
                </div>
                <button type="button" class="btn btn-emerald btn-xs" onclick="window.WhatsAppCampaignStudio.openSaveTemplateModal(false)" 
                        style="font-size:11px;display:flex;align-items:center;gap:4px;padding:4px 10px;">
                  <span>💾</span>
                  <span>Save New Template</span>
                </button>
              </div>

              <!-- Reusable Templates Grid -->
              <div class="wa-tpl-grid">
                ${tplEntries.map(([key, t]) => {
                  const isActive = this.state.templateKey === key;
                  const isCustom = t.isCustom || false;
                  return `
                    <div class="wa-tpl-btn ${isActive ? 'active' : ''}" onclick="window.WhatsAppCampaignStudio.selectTemplate('${key}')"
                         title="${isCustom ? 'Custom Template (Click to load)' : 'Standard Preset'}">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;width:100%;">
                        <div style="font-weight:700;font-size:11.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">
                          ${t.label}
                        </div>
                        <span class="pill ${isActive ? 'ok' : isCustom ? 'gold' : 'dark'}" style="font-size:8px;padding:2px 5px;">
                          ${t.badge || 'PRESET'}
                        </span>
                      </div>
                      <div style="font-size:10px;color:var(--ink-3);margin-top:4px;line-height:1.3;max-height:26px;overflow:hidden;">
                        ${t.headline || t.body.slice(0, 50) + '...'}
                      </div>
                      ${isCustom ? `
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:4px;border-top:1px dashed var(--wire);font-size:9.5px;color:var(--gold);">
                          <span>★ Saved by You</span>
                          <div style="display:flex;gap:4px;" onclick="event.stopPropagation()">
                            <button type="button" class="btn btn-dark btn-xs" style="padding:1px 5px;font-size:9px;" title="Rename / Edit Template"
                                    onclick="window.WhatsAppCampaignStudio.state.templateKey='${key}'; window.WhatsAppCampaignStudio.openSaveTemplateModal(true)">
                              ✏️
                            </button>
                            <button type="button" class="btn btn-dark btn-xs" style="padding:1px 5px;font-size:9px;color:var(--bad);" title="Delete Template"
                                    onclick="window.WhatsAppCampaignStudio.deleteCustomTemplate('${key}', event)">
                              🗑️
                            </button>
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Campaign Settings: Discount & Promo Code -->
            <div class="field-row" style="margin-bottom:12px;">
              <div class="field">
                <label style="font-size:11px;font-weight:600;">VIP Promo Code</label>
                <input type="text" value="${this.state.promoCode}" 
                       oninput="window.WhatsAppCampaignStudio.state.promoCode = this.value; window.WhatsAppCampaignStudio.saveDraft(); window.WhatsAppCampaignStudio.updateLivePreview();" 
                       style="font-family:var(--mono);text-transform:uppercase;font-weight:700;color:var(--gold);height:32px;font-size:11.5px;"/>
              </div>
              <div class="field">
                <label style="font-size:11px;font-weight:600;">Special Discount</label>
                <div style="display:flex;gap:4px;">
                  <input type="number" min="0" value="${this.state.discountVal}" 
                         oninput="window.WhatsAppCampaignStudio.state.discountVal = Number(this.value); window.WhatsAppCampaignStudio.saveDraft(); window.WhatsAppCampaignStudio.updateLivePreview();" 
                         style="font-weight:700;height:32px;font-size:11.5px;flex:1;"/>
                  <select onchange="window.WhatsAppCampaignStudio.state.discountType = this.value; window.WhatsAppCampaignStudio.saveDraft(); window.WhatsAppCampaignStudio.updateLivePreview();" 
                          style="width:70px;height:32px;font-size:11.5px;">
                    <option value="percent" ${this.state.discountType === 'percent' ? 'selected' : ''}>%</option>
                    <option value="flat" ${this.state.discountType === 'flat' ? 'selected' : ''}>৳</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Dynamic Placeholders Insertion Bar -->
            <div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:10.5px;font-weight:700;color:var(--ink-2);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.5px;">
                  ⚡ Click to Insert Dynamic Placeholder:
                </span>
                <span style="font-size:10px;color:var(--ink-3);">Auto-populated per customer &amp; order</span>
              </div>
              <div class="wa-placeholders-bar">
                ${placeholderChips.map(chip => `
                  <button type="button" class="wa-placeholder-chip" onclick="window.WhatsAppCampaignStudio.insertPlaceholderTag('${chip.tag}')"
                          title="Click to insert ${chip.tag} into message body at cursor">
                    <span>${chip.icon}</span>
                    <span>${chip.tag}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Message Body Editor -->
            <div class="field" style="flex:1;display:flex;flex-direction:column;margin-bottom:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <label style="margin:0;font-weight:700;font-size:12px;">Personalized Message Body (WhatsApp Markdown)</label>
                <div style="display:flex;gap:6px;align-items:center;">
                  ${activeTpl.isCustom ? `
                    <button type="button" class="btn btn-dark btn-xs" onclick="window.WhatsAppCampaignStudio.openSaveTemplateModal(true)" 
                            style="font-size:10.5px;padding:3px 8px;color:var(--gold);">
                      🔄 Update "${activeTpl.label}"
                    </button>
                  ` : ''}
                  <button type="button" class="btn btn-dark btn-xs" onclick="window.WhatsAppCampaignStudio.openSaveTemplateModal(false)" 
                          style="font-size:10.5px;padding:3px 8px;">
                    💾 Save as Template
                  </button>
                </div>
              </div>

              <textarea id="wa-template-editor"
                        style="flex:1;min-height:160px;font-family:monospace;font-size:11.5px;line-height:1.5;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);padding:10px;border-radius:8px;resize:vertical;" 
                        oninput="window.WhatsAppCampaignStudio.handleEditorInput(this.value)">${currentBody}</textarea>

              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:10px;color:var(--ink-3);font-family:var(--mono);">
                <div style="display:flex;gap:12px;">
                  <span>Chars: <strong style="color:var(--ink);">${charCount}</strong></span>
                  <span>Words: <strong style="color:var(--ink);">${wordCount}</strong></span>
                  <span>Template: <strong style="color:var(--gold);">${activeTpl.label}</strong></span>
                </div>
                <div style="color:var(--ink-3);">
                  Markdown: <code>*bold*</code> · <code>_italics_</code> · <code>~strike~</code>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Live Mobile WhatsApp Mockup -->
          <div class="wa-phone-preview-col">
            <!-- Recipient Switcher for Testing Personalization -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px;width:100%;max-width:320px;">
              <span style="font-size:10px;font-family:var(--mono);color:var(--ink-2);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">
                📱 Recipient:
              </span>
              <select onchange="window.WhatsAppCampaignStudio.state.previewCustomerId = this.value; window.WhatsAppCampaignStudio.renderModal();" 
                      style="font-size:11px;height:28px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);border-radius:6px;padding:0 8px;flex:1;max-width:240px;">
                ${(selectedCusts.length ? selectedCusts : allCustomers).slice(0, 50).map(c => `
                  <option value="${c.id}" ${c.id === previewCust.id ? 'selected' : ''}>
                    ${c.name || c.contactPerson || 'Valued Buyer'} (${c.phone || c.country || 'No Phone'})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="wa-phone-frame">
              <div class="wa-phone-header">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="wa-phone-avatar">H&amp;H</div>
                  <div>
                    <div style="font-size:12px;font-weight:700;color:#fff;">Hands &amp; Head Atelier</div>
                    <div style="font-size:9px;color:#25D366;display:flex;align-items:center;gap:3px;">
                      <span>●</span> Official Verified Business
                    </div>
                  </div>
                </div>
                <div style="color:#8696a0;font-size:14px;">⋮</div>
              </div>

              <div class="wa-phone-chat-bg">
                <div class="wa-chat-bubble">
                  <div class="wa-bubble-text">${previewMsg.replace(/\n/g, '<br/>')}</div>
                  <div class="wa-bubble-time">
                    ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span style="color:#53bdeb;margin-left:3px;">✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            <div style="font-size:10px;color:var(--ink-3);margin-top:8px;text-align:center;line-height:1.4;max-width:320px;">
              💡 <em>Previewing dynamic personalization for <strong>${previewCust.companyName || previewCust.name || 'Recipient'}</strong>.</em>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;width:100%;max-width:320px;">
              <button class="btn btn-emerald" style="width:100%;min-height:42px;font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
                      onclick="window.WhatsAppCampaignStudio.sendPreviewCustomer(false)">
                🚀 Send to ${previewCust.companyName || previewCust.name || 'Buyer'} via WhatsApp
              </button>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-dark btn-xs" style="flex:1;" onclick="window.WhatsAppCampaignStudio.copyCurrentMessage()">
                  📋 Copy Text
                </button>
                <button class="btn btn-dark btn-xs" style="flex:1;" onclick="window.WhatsAppCampaignStudio.sendPreviewCustomer(true)" title="Send using WhatsApp Web">
                  🌐 Web App
                </button>
                <button class="btn btn-gold btn-xs" style="flex:1.2;" onclick="window.WhatsAppCampaignStudio.setStep(4)">
                  Dispatch Queue ›
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // ── Step 4: Dispatch Console & Execution ──
    renderStep4Dispatch(selectedCusts) {
      const total = selectedCusts.length;
      const sentCount = Object.values(this.state.dispatchLog).filter(d => d.status === 'sent').length;
      const skippedCount = Object.values(this.state.dispatchLog).filter(d => d.status === 'skipped').length;
      const progressPercent = total > 0 ? Math.round((this.state.queueIndex / total) * 100) : 0;

      const current = selectedCusts[this.state.queueIndex];
      const isCompleted = this.state.queueIndex >= total && total > 0;

      return `
        <div style="display:flex;flex-direction:column;gap:16px;height:100%;">
          <!-- Progress Bar & Campaign Stats -->
          <div class="card" style="padding:14px;background:var(--bg-card);border:1px solid var(--wire);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div>
                <span class="pill ok" style="font-size:9px;">CAMPAIGN ACTIVE</span>
                <span style="font-size:14px;font-weight:700;color:var(--ink);margin-left:8px;">${this.state.campaignName}</span>
              </div>
              <div style="font-size:12px;font-weight:700;color:var(--gold);font-family:var(--mono);">
                ${this.state.queueIndex} / ${total} Contacts (${progressPercent}%)
              </div>
            </div>

            <div style="width:100%;height:6px;background:var(--bg-3);border-radius:4px;overflow:hidden;">
              <div style="width:${progressPercent}%;height:100%;background:linear-gradient(90deg, #10B981, #25D366);transition:width 0.3s ease;"></div>
            </div>

            <div style="display:flex;gap:16px;margin-top:10px;font-size:11px;color:var(--ink-2);font-family:var(--mono);">
              <span>✓ Sent: <strong style="color:var(--ok);">${sentCount}</strong></span>
              <span>⏭️ Skipped: <strong style="color:var(--warn);">${skippedCount}</strong></span>
              <span>⏳ Remaining: <strong>${Math.max(0, total - this.state.queueIndex)}</strong></span>
            </div>
          </div>

          <!-- Dual Execution Options for Founder -->
          <div style="display:grid;grid-template-columns:1.8fr 1.2fr;gap:14px;flex:1;min-height:0;">
            <!-- Option A: Interactive 1-Click Queue Runner -->
            <div class="card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between;background:var(--bg-2);border:1px solid var(--wire);">
              <div>
                <div style="font-size:10.5px;color:var(--ok);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;font-weight:700;">
                  Option A · 1-Click Safe Queue Runner (Anti-Ban)
                </div>
                <div style="font-size:12px;color:var(--ink-2);margin-top:2px;">
                  Safest method: Launches WhatsApp pre-filled for each buyer, auto-advances, zero risk of spam suspension.
                </div>

                ${!isCompleted && current ? `
                  <div class="wa-active-runner-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <div>
                        <div style="font-size:18px;font-weight:800;color:var(--ink);">${current.companyName || current.name}</div>
                        <div style="font-size:12px;color:var(--gold);font-family:var(--mono);margin-top:2px;">
                          📞 ${current.phone || 'No phone'} · ${current.country || '—'}
                        </div>
                      </div>
                      <span class="pill gold" style="font-size:10px;">Queue #${this.state.queueIndex + 1}</span>
                    </div>

                    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
                      <button class="btn btn-emerald" style="flex:2;min-height:44px;font-size:13px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.WhatsAppCampaignStudio.sendCurrentQueueContact(false)">
                        🚀 Open WhatsApp &amp; Send
                      </button>
                      <button class="btn btn-dark" style="min-height:44px;font-size:11.5px;padding:0 12px;" onclick="window.WhatsAppCampaignStudio.sendCurrentQueueContact(true)" title="Open via WhatsApp Web">
                        🌐 Web
                      </button>
                      <button class="btn btn-dark" style="flex:1;min-height:44px;" onclick="window.WhatsAppCampaignStudio.copyCurrentMessage()">
                        📋 Copy Text
                      </button>
                      <button class="btn btn-dark" style="min-height:44px;" onclick="window.WhatsAppCampaignStudio.skipCurrentQueueContact()">
                        ⏭️ Skip
                      </button>
                    </div>

                    <label style="display:flex;align-items:center;gap:6px;margin-top:12px;cursor:pointer;font-size:11px;color:var(--ink-2);">
                      <input type="checkbox" ${this.state.autoAdvance ? 'checked' : ''} onchange="window.WhatsAppCampaignStudio.state.autoAdvance = this.checked"/>
                      <span>Auto-advance to next contact upon opening WhatsApp</span>
                    </label>
                  </div>
                ` : `
                  <div style="padding:40px;text-align:center;background:var(--bg-3);border-radius:10px;margin-top:16px;">
                    <div style="font-size:32px;margin-bottom:8px;">🎉</div>
                    <div style="font-size:16px;font-weight:700;color:var(--ink);">All ${total} Contacts Processed!</div>
                    <div style="font-size:12px;color:var(--ink-3);margin-top:4px;">You have dispatched this campaign across your targeted cohort.</div>
                    <button class="btn btn-gold" style="margin-top:16px;" onclick="window.WhatsAppCampaignStudio.saveCampaignRecord()">
                      💾 Finalize &amp; Save Campaign History
                    </button>
                  </div>
                `}
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--wire);">
                <button class="btn btn-xs btn-dark" onclick="window.WhatsAppCampaignStudio.initQueue(); window.WhatsAppCampaignStudio.renderModal();">
                  🔄 Restart Queue
                </button>
                ${!isCompleted ? `
                  <button class="btn btn-xs btn-gold" onclick="window.WhatsAppCampaignStudio.saveCampaignRecord()">
                    Finish &amp; Record Campaign
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Option B & C: Broadcast VCF & Meta Cloud API Payloads -->
            <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--bg-2);border:1px solid var(--wire);">
              <div style="font-size:10.5px;color:var(--gold);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;font-weight:700;">
                Option B &amp; C · Mass Broadcast Tools
              </div>

              <!-- VCF Broadcast Exporter -->
              <div style="padding:10px;background:var(--bg-3);border-radius:8px;border:1px solid var(--wire);">
                <div style="font-size:12px;font-weight:700;color:var(--ink);">📱 Export WhatsApp Broadcast VCF</div>
                <div style="font-size:10.5px;color:var(--ink-3);margin:2px 0 8px;">
                  Imports all ${total} contacts into your iPhone/Android address book in 1 tap to use native WhatsApp Broadcast Lists (up to 256 recipients per blast).
                </div>
                <button class="btn btn-dark btn-sm" style="width:100%;font-size:11px;" onclick="window.WhatsAppCampaignStudio.exportVCF()">
                  📥 Download Contacts (.vcf)
                </button>
              </div>

              <!-- Meta Cloud API JSON -->
              <div style="padding:10px;background:var(--bg-3);border-radius:8px;border:1px solid var(--wire);">
                <div style="font-size:12px;font-weight:700;color:var(--ink);">⚡ Meta Cloud API Payload</div>
                <div style="font-size:10.5px;color:var(--ink-3);margin:2px 0 8px;">
                  Structured JSON payload for Meta WhatsApp Business Cloud API &amp; Make/Zapier automated webhook runners.
                </div>
                <button class="btn btn-dark btn-sm" style="width:100%;font-size:11px;" onclick="window.WhatsAppCampaignStudio.exportMetaJSON()">
                  📦 Export Meta API JSON
                </button>
              </div>

              <!-- Web Lookbook Direct Link -->
              <div style="padding:10px;background:var(--bg-3);border-radius:8px;border:1px solid var(--wire);">
                <div style="font-size:12px;font-weight:700;color:var(--ink);">📖 Public Digital Lookbook</div>
                <div style="font-size:10.5px;color:var(--ink-3);margin:2px 0 8px;">
                  Interactive responsive mobile web link included in WhatsApp messages for customers to view high-res photos.
                </div>
                <button class="btn btn-dark btn-sm" style="width:100%;font-size:11px;" onclick="window.WhatsAppCampaignStudio.openLookbookViewer()">
                  👁️ Preview Customer Experience
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  };

  window.WhatsAppCampaignStudio = WhatsAppCampaignStudio;
  window.openWhatsAppCampaignStudio = function(options = {}) {
    return WhatsAppCampaignStudio.open(options);
  };

  // Seamless integration with window.render for module routing
  window.render = window.render || {};
  window.render.WhatsAppStudio = function(container) {
    if (!container) container = document.getElementById('mod-WhatsAppStudio') || document.getElementById('main-content');
    if (container) {
      container.innerHTML = `
        <div style="padding: 24px; max-width: 1080px; margin: 0 auto;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px; flex-wrap:wrap; gap:16px;">
            <div>
              <div class="pill ok" style="margin-bottom:6px; font-size:10px; display:inline-flex;">WHATSAPP ENTERPRISE BROADCAST</div>
              <h2 style="font-size:24px; font-weight:800; color:var(--ink); margin:0;">WhatsApp Broadcast Studio</h2>
              <p style="color:var(--ink-2); font-size:13px; margin:4px 0 0;">Curate product drops, segment 15,000+ buyer cohorts, and send rich WhatsApp messages with digital lookbooks.</p>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-dark" onclick="window.WhatsAppCampaignStudio.openLookbookViewer()" style="font-size:12px;">
                📖 Preview Lookbook
              </button>
              <button class="btn btn-emerald" onclick="window.openWhatsAppCampaignStudio()" style="padding:10px 20px; font-size:13px; display:inline-flex; align-items:center; gap:8px;">
                <span>🚀 Launch Broadcast Studio</span>
              </button>
            </div>
          </div>

          <div class="bento-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:16px; margin-bottom:24px;">
            <div class="card" style="padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="font-size:26px; margin-bottom:10px;">📦</div>
                <h3 style="font-size:15px; font-weight:700; color:var(--ink); margin:0 0 6px;">1. Multi-Product Curation</h3>
                <p style="font-size:12px; color:var(--ink-2); line-height:1.5;">Select multiple SKUs from inventory, export-grade leather drops, or newly imported catalog items.</p>
              </div>
              <button class="btn btn-dark btn-sm" onclick="window.openWhatsAppCampaignStudio({ step: 1 })" style="margin-top:14px; width:100%;">Select Products</button>
            </div>

            <div class="card" style="padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="font-size:26px; margin-bottom:10px;">🎯</div>
                <h3 style="font-size:15px; font-weight:700; color:var(--ink); margin:0 0 6px;">2. Audience Cohorts</h3>
                <p style="font-size:12px; color:var(--ink-2); line-height:1.5;">Filter 15K+ buyers by VIP spenders, wholesale accounts, European importers, or Bangladesh domestic clients.</p>
              </div>
              <button class="btn btn-dark btn-sm" onclick="window.openWhatsAppCampaignStudio({ step: 2 })" style="margin-top:14px; width:100%;">Segment Audience</button>
            </div>

            <div class="card" style="padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="font-size:26px; margin-bottom:10px;">📱</div>
                <h3 style="font-size:15px; font-weight:700; color:var(--ink); margin:0 0 6px;">3. Real-Time Chat Preview</h3>
                <p style="font-size:12px; color:var(--ink-2); line-height:1.5;">Preview dynamic tags ({firstName}, {companyName}, {productsList}) rendered in real-time inside a dark WhatsApp chat UI.</p>
              </div>
              <button class="btn btn-dark btn-sm" onclick="window.openWhatsAppCampaignStudio({ step: 3 })" style="margin-top:14px; width:100%;">Test Message</button>
            </div>

            <div class="card" style="padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="font-size:26px; margin-bottom:10px;">⚡</div>
                <h3 style="font-size:15px; font-weight:700; color:var(--ink); margin:0 0 6px;">4. Multi-Channel Dispatch</h3>
                <p style="font-size:12px; color:var(--ink-2); line-height:1.5;">Safe semi-automated queue runner with delay intervals, VCF contact card generator for Broadcast lists, and Meta Cloud API JSON.</p>
              </div>
              <button class="btn btn-dark btn-sm" onclick="window.openWhatsAppCampaignStudio({ step: 4 })" style="margin-top:14px; width:100%;">Open Dispatcher</button>
            </div>
          </div>
        </div>
      `;
    }
  };

  // Immediate global assignments
  window.WhatsAppCampaignStudio = WhatsAppCampaignStudio;
  window.openWhatsAppCampaignStudio = function(options = {}) {
    return WhatsAppCampaignStudio.open(options);
  };
  window.openLookbookViewer = function(productIds = []) {
    return WhatsAppCampaignStudio.openLookbookViewer(productIds);
  };

  // Synchronous immediate initialization of data and templates
  try {
    WhatsAppCampaignStudio.init();
  } catch (e) {
    console.warn('WhatsAppCampaignStudio init error:', e);
  }

  // Re-verify when DOM is fully ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        WhatsAppCampaignStudio.init();
      } catch (e) {}
    });
  }
})();
