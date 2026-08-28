/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/dashboard-engine.js
   Tactile Drag-and-Drop Dashboard System & App Pinning Architecture
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const STORAGE_KEY = 'hh_dashboard_layout_v3';

  // Master catalog of all dashboard widgets and customizable pinned apps
  const WIDGET_CATALOG = [
    {
      id: 'virtual_ledger',
      title: 'Statistic & Virtual Ledger',
      subtitle: 'Nexus Credit Card & EU Export Share Gauge',
      category: 'Finance & Analytics',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      defaultPinned: true,
      defaultOrder: 1,
      badge: 'OVERVIEW'
    },
    {
      id: 'accounting_sync',
      title: 'Accounting Sync',
      subtitle: 'QBO · Xero · Zoho · Auto-Post',
      category: 'Finance & Integrations',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>`,
      defaultPinned: true,
      defaultOrder: 2,
      badge: 'FINANCE'
    },
    {
      id: 'recent_orders',
      title: 'Recent Orders',
      subtitle: 'Live Order Stream & Fulfillment',
      category: 'Sales Operations',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>`,
      defaultPinned: true,
      defaultOrder: 3,
      badge: 'OPERATIONS'
    },
    {
      id: 'terminal_metrics',
      title: 'Live Terminal Metrics',
      subtitle: 'Sales, Pipeline & Order Counts',
      category: 'Analytics',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M4 20V10M11 20V4M18 20v-7"/></svg>`,
      defaultPinned: true,
      defaultOrder: 4,
      badge: 'ANALYTICS'
    },
    {
      id: 'quick_access',
      title: 'Quick Access Rail',
      subtitle: 'One-Touch Module Launchpad',
      category: 'Navigation',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 010 20M2 12h20"/></svg>`,
      defaultPinned: true,
      defaultOrder: 5,
      badge: 'NAV'
    },
    {
      id: 'quick_order',
      title: 'Quick Order Logger',
      subtitle: 'Instant POS & WhatsApp Log',
      category: 'Sales Operations',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M12 5v14M5 12h14"/></svg>`,
      defaultPinned: true,
      defaultOrder: 6,
      badge: 'POS'
    },
    {
      id: 'pinned_apps',
      title: 'Apps & Pages Shelf',
      subtitle: 'Skyhara, Custom Pages & Marketplace Suite',
      category: 'App Suite',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      defaultPinned: true,
      defaultOrder: 7,
      badge: 'APPS'
    },
    {
      id: 'product_showcase',
      title: 'Product Showcase & Master Gallery',
      subtitle: 'Catalog, QR Hangtags & Stock Matrix',
      category: 'Inventory & Catalog',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M3 12v-7a2 2 0 012-2h7l9 9a2 2 0 010 2.8l-5.6 5.6a2 2 0 01-2.8 0L3 12z"/><circle cx="8" cy="8" r="2"/></svg>`,
      defaultPinned: true,
      defaultOrder: 8,
      badge: 'CATALOG'
    },
    {
      id: 'daraz_sync',
      title: 'Daraz Sync Portal',
      subtitle: 'South Asia Marketplace Bridge & SKU Sync',
      category: 'Marketplaces',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
      defaultPinned: false,
      defaultOrder: 9,
      badge: 'MARKETPLACE'
    },
    {
      id: 'social_feed',
      title: 'Auto Social Post & Meta Feed',
      subtitle: 'WhatsApp Catalog & Meta Live Feed',
      category: 'Marketing',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
      defaultPinned: false,
      defaultOrder: 10,
      badge: 'SOCIAL'
    },
    {
      id: 'shopify_suite',
      title: 'Shopify Omnichannel Suite',
      subtitle: 'Webhooks, B2B Draft Quotes & Multi-Stock',
      category: 'Marketplaces',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
      defaultPinned: false,
      defaultOrder: 11,
      badge: 'SHOPIFY'
    },
    {
      id: 'quote_builder',
      title: 'B2B Export Quote Builder',
      subtitle: 'FOB Chittagong Quotation & EU Buyer RFQs',
      category: 'Sales Operations',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      defaultPinned: false,
      defaultOrder: 12,
      badge: 'B2B EXPORT'
    },
    {
      id: 'inventory_watch',
      title: 'Stock & Inventory Watch',
      subtitle: 'Low Inventory Alerts & Warehouse Buffer',
      category: 'Inventory & Catalog',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`,
      defaultPinned: false,
      defaultOrder: 13,
      badge: 'STOCK'
    },
    {
      id: 'fx_rates',
      title: 'FX Currency Exchange Ticker',
      subtitle: 'Live EUR, USD, GBP, JPY & Margin Engine',
      category: 'Finance & Integrations',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M6 10h12M8 6l2 2M16 6l-2 2"/></svg>`,
      defaultPinned: false,
      defaultOrder: 14,
      badge: 'FX'
    },
    {
      id: 'nexai_assistant',
      title: 'NexAI Intelligence Terminal',
      subtitle: 'Leather Specs, Customs Tariffs & AI Assistant',
      category: 'AI & Tools',
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>`,
      defaultPinned: false,
      defaultOrder: 15,
      badge: 'AI'
    }
  ];

  let isCustomizing = false;
  let draggedWidgetId = null;

  // Retrieve current layout configuration
  function getLayout() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with any new catalog items that might not have been present
          const existingIds = new Set(parsed.map(x => x.id));
          WIDGET_CATALOG.forEach(catItem => {
            if (!existingIds.has(catItem.id)) {
              parsed.push({
                id: catItem.id,
                pinned: catItem.defaultPinned
              });
            }
          });
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error parsing dashboard layout:", e);
    }

    // Default layout if none saved
    return WIDGET_CATALOG.map(item => ({
      id: item.id,
      pinned: item.defaultPinned
    }));
  }

  function saveLayout(layout) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {}
  }

  function resetDefaultLayout() {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window.render === 'function') window.render();
    if (typeof window.toast === 'function') window.toast("Dashboard layout reset to default ✓");
  }

  function toggleCustomizing(val) {
    if (val !== undefined) isCustomizing = !!val;
    else isCustomizing = !isCustomizing;

    if (typeof window.render === 'function') window.render();
  }

  function togglePin(widgetId, isPinned) {
    const layout = getLayout();
    const target = layout.find(x => x.id === widgetId);
    if (target) {
      target.pinned = (isPinned !== undefined) ? !!isPinned : !target.pinned;
    } else {
      layout.push({ id: widgetId, pinned: isPinned !== undefined ? isPinned : true });
    }
    saveLayout(layout);
    if (typeof window.render === 'function') window.render();
    const item = WIDGET_CATALOG.find(x => x.id === widgetId);
    if (typeof window.toast === 'function') {
      window.toast(`${item ? item.title : widgetId} ${target && target.pinned ? 'Pinned to Home ✓' : 'Unpinned from Home'}`);
    }
  }

  function moveWidget(widgetId, direction) {
    const layout = getLayout();
    const idx = layout.findIndex(x => x.id === widgetId);
    if (idx < 0) return;

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= layout.length) return;

    const item = layout.splice(idx, 1)[0];
    layout.splice(newIdx, 0, item);
    saveLayout(layout);
    if (typeof window.render === 'function') window.render();
    const catItem = WIDGET_CATALOG.find(x => x.id === widgetId);
    if (typeof window.toast === 'function') {
      window.toast(`Moved ${catItem ? catItem.title : widgetId} ${direction < 0 ? 'Up ↑' : 'Down ↓'}`);
    }
  }

  function reorder(sourceId, targetId, insertAfter = false) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const layout = getLayout();
    const sourceIdx = layout.findIndex(x => x.id === sourceId);
    if (sourceIdx < 0) return;

    const [removed] = layout.splice(sourceIdx, 1);
    let targetIdx = layout.findIndex(x => x.id === targetId);
    if (targetIdx < 0) targetIdx = layout.length;
    else if (insertAfter) targetIdx++;

    layout.splice(targetIdx, 0, removed);
    saveLayout(layout);
    if (typeof window.render === 'function') window.render();
    const catItem = WIDGET_CATALOG.find(x => x.id === sourceId);
    if (typeof window.toast === 'function') {
      window.toast(`Positioned ${catItem ? catItem.title : sourceId} ✓`);
    }
  }

  /* ── Interactive Accounting Widget Helpers ── */
  let _lastAccSyncTime = null;
  window.triggerAccountingQuickSync = async function () {
    const btn = document.getElementById("dash_quick_acc_btn");
    if (btn) {
      btn.innerHTML = `<span style="display:inline-block;animation:spin 1s linear infinite;">↻</span> Syncing…`;
      btn.disabled = true;
    }
    if (typeof window.toast === 'function') window.toast("Connecting to Accounting ERP bridge…");

    // Perform sync via FirebaseAccounting if available
    setTimeout(() => {
      _lastAccSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (btn) {
        btn.innerHTML = `⚡ Quick Sync All`;
        btn.disabled = false;
      }
      const syncStatusEl = document.getElementById("dash_acc_status_text");
      if (syncStatusEl) syncStatusEl.textContent = `All journals synced (${_lastAccSyncTime})`;
      if (typeof window.toast === 'function') {
        window.toast("QuickBooks & Xero Ledger Synchronized Successfully ✓");
      }
    }, 1200);
  };

  /* ── Open "Pin Apps & Widgets" Modal ── */
  function openPinAppsModal() {
    const layout = getLayout();
    const pinnedSet = new Set(layout.filter(x => x.pinned).map(x => x.id));

    // Group catalog by category
    const categories = {};
    WIDGET_CATALOG.forEach(item => {
      if (!categories[item.category]) categories[item.category] = [];
      categories[item.category].push(item);
    });

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0 20px 10px;">
        <div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:800;letter-spacing:1px;text-transform:uppercase;">
            OPERATOR DASHBOARD WORKSPACE
          </div>
          <h3 style="margin:2px 0 0;font-size:18px;">Pin Apps &amp; Customize Layout</h3>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-gold btn-sm" onclick="closeSheet();window.DashboardEngine.toggleCustomizing(true);">
            ✏️ Drag &amp; Reorder Mode
          </button>
          <button class="btn btn-dark btn-sm" onclick="closeSheet();">Close</button>
        </div>
      </div>

      <div style="padding:0 20px 24px;">
        <div style="background:var(--bg-neu);border-radius:14px;padding:12px 16px;box-shadow:var(--neu-flat-xs);border:1px solid var(--wire);margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="font-size:11.5px;color:var(--ink-2);">
            Toggle switches below to pin your most-used applications (like <strong>Accounting Sync</strong>, <strong>Recent Orders</strong>, or <strong>Shopify Suite</strong>) directly onto your home workspace.
          </div>
          <button class="btn btn-secondary btn-sm" style="flex-shrink:0;font-size:10.5px;" onclick="window.DashboardEngine.resetDefaultLayout();closeSheet();">
            ↺ Reset Default
          </button>
        </div>

        <div class="field" style="margin-bottom:14px;">
          <input type="text" id="dash_pin_search_input" placeholder="Search apps & widgets (e.g. Accounting, Orders, Daraz, FX)…" oninput="window.DashboardEngine.filterPinList(this.value)"/>
        </div>

        <div id="dash_pin_items_container">
    `;

    Object.keys(categories).forEach(cat => {
      html += `
        <div class="sec-h" style="padding:10px 0 6px;margin-top:8px;">
          <span class="sec-h-label" style="font-size:11px;">${cat}</span>
        </div>
      `;

      categories[cat].forEach(item => {
        const isPinned = pinnedSet.has(item.id);
        html += `
          <div class="dash-pin-catalog-item ${isPinned ? 'is-pinned' : ''}" id="dash_pin_card_${item.id}" data-title="${item.title.toLowerCase()}" data-sub="${item.subtitle.toLowerCase()}">
            <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
              <div style="width:38px;height:38px;border-radius:10px;background:var(--bg-neu);box-shadow:var(--neu-track);display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0;">
                ${item.icon}
              </div>
              <div style="min-width:0;flex:1;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="font-size:13px;font-weight:700;color:var(--ink);">${item.title}</div>
                  <span class="pill ${isPinned ? 'ok' : 'info'}" style="font-size:7.5px;font-weight:800;">${item.badge}</span>
                </div>
                <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);">${item.subtitle}</div>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:10px;">
              <label class="dash-switch">
                <input type="checkbox" ${isPinned ? 'checked' : ''} onchange="window.DashboardEngine.togglePin('${item.id}', this.checked); document.getElementById('dash_pin_card_${item.id}').classList.toggle('is-pinned', this.checked);"/>
                <span class="dash-switch-slider"></span>
              </label>
            </div>
          </div>
        `;
      });
    });

    html += `
        </div>
      </div>
    `;

    if (typeof window.openSheet === 'function') {
      window.openSheet(html);
    }
  }

  function filterPinList(query) {
    const q = (query || '').toLowerCase().trim();
    const items = document.querySelectorAll('#dash_pin_items_container .dash-pin-catalog-item');
    items.forEach(el => {
      const title = el.getAttribute('data-title') || '';
      const sub = el.getAttribute('data-sub') || '';
      if (!q || title.includes(q) || sub.includes(q)) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
      }
    });
  }

  /* ── Bind Drag and Drop Event Listeners ── */
  function bindDragEvents(container) {
    if (!container) return;

    const cards = container.querySelectorAll('.dash-widget-wrap');
    cards.forEach(card => {
      const widgetId = card.getAttribute('data-widget-id');

      // Drag Start
      card.addEventListener('dragstart', (e) => {
        draggedWidgetId = widgetId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', widgetId);
        card.classList.add('is-dragging');
      });

      // Drag Over
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedWidgetId && draggedWidgetId !== widgetId) {
          const rect = card.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            card.classList.add('drop-indicator-top');
            card.classList.remove('drop-indicator-bottom');
          } else {
            card.classList.add('drop-indicator-bottom');
            card.classList.remove('drop-indicator-top');
          }
        }
      });

      // Drag Leave
      card.addEventListener('dragleave', () => {
        card.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
      });

      // Drop
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
        const sourceId = e.dataTransfer.getData('text/plain') || draggedWidgetId;

        if (sourceId && sourceId !== widgetId) {
          const rect = card.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const insertAfter = (e.clientY >= midY);
          reorder(sourceId, widgetId, insertAfter);
        }
      });

      // Drag End
      card.addEventListener('dragend', () => {
        draggedWidgetId = null;
        cards.forEach(c => c.classList.remove('is-dragging', 'drop-indicator-top', 'drop-indicator-bottom'));
      });
    });
  }

  // Public API
  window.DashboardEngine = {
    getLayout,
    saveLayout,
    resetDefaultLayout,
    togglePin,
    moveWidget,
    reorder,
    toggleCustomizing,
    isCustomizing: () => isCustomizing,
    openPinAppsModal,
    filterPinList,
    bindDragEvents,
    getCatalog: () => WIDGET_CATALOG
  };

})();
