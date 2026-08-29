/**
 * ══════════════════════════════════════════════════════════════════════
 * HANDS & HEAD — Unified Master Admin Control Center (/admin/)
 * Features:
 * 1. Global Omni-Search (Products, Orders, Customers, Apps, Projects)
 * 2. Real-Time Operational Dashboard Metrics (0-safe, zero fake stats)
 * 3. Activity Audit Timeline Logger
 * 4. Multi-Store & Theme Configuration
 * ══════════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // ── 1. Audit Log & Activity Service ──
  const AuditService = {
    loadLogs() {
      try {
        const saved = localStorage.getItem('hh_audit_logs_v1');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    },

    log(action, details = {}, user = 'Operator') {
      const logs = this.loadLogs();
      const entry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        action,
        details,
        user,
        timestamp: new Date().toISOString()
      };
      logs.unshift(entry);
      // Keep last 150 entries
      if (logs.length > 150) logs.pop();
      localStorage.setItem('hh_audit_logs_v1', JSON.stringify(logs));

      if (window.NexEvents) {
        window.NexEvents.emit('AUDIT_LOG_ADDED', entry);
      }
      return entry;
    }
  };

  // Listen to system events to record audit logs automatically
  if (window.NexEvents) {
    window.NexEvents.on('ORDER_CREATED', (order) => {
      AuditService.log('Order Created', { orderNumber: order.orderNumber, total: order.total, source: order.source });
    });
    window.NexEvents.on('GDRIVE_SYNC_COMPLETED', (sum) => {
      AuditService.log('Google Drive Synced', { created: sum.created, updated: sum.updated });
    });
    window.NexEvents.on('PRODUCT_CREATED', (p) => {
      AuditService.log('Product Created', { id: p.id, title: p.title });
    });
  }

  // ── 2. Global Omni-Search Engine ──
  const GlobalSearchEngine = {
    search(query) {
      if (!query || query.trim().length < 2) return { products: [], orders: [], customers: [], apps: [] };
      const q = query.trim().toLowerCase();

      // 1. Search Products
      let products = [];
      if (window.ProductsService && typeof window.ProductsService.getAll === 'function') {
        products = (window.ProductsService.getAll() || []).filter(p => 
          (p.title || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.productType || '').toLowerCase().includes(q) ||
          (p.tags || []).some(t => t.toLowerCase().includes(q))
        ).slice(0, 5);
      }

      // 2. Search Orders
      let orders = [];
      if (window.OrdersService && typeof window.OrdersService.getAll === 'function') {
        orders = (window.OrdersService.getAll() || []).filter(o =>
          (o.orderNumber || '').toLowerCase().includes(q) ||
          (o.customerSnapshot?.name || '').toLowerCase().includes(q) ||
          (o.customerSnapshot?.phone || '').includes(q)
        ).slice(0, 5);
      }

      // 3. Search Customers
      let customers = [];
      if (window.CustomersService && typeof window.CustomersService.getAll === 'function') {
        customers = (window.CustomersService.getAll() || []).filter(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.district || '').toLowerCase().includes(q)
        ).slice(0, 5);
      }

      // 4. Search Apps & Modules
      const modules = [
        { name: 'Products & Inventory Matrix', app: 'Products', desc: 'Catalog, stock & variants' },
        { name: 'Fast Facebook / WhatsApp Order', app: 'Orders', desc: 'Manual order creator' },
        { name: 'Google Drive Ingestion', app: 'DriveSync', desc: 'Automated bulk product sync' },
        { name: 'Accounting Sync (account.handsandhead.com)', app: 'Accounting', desc: 'General ledger & ERP sync' },
        { name: 'Master Homepage CMS', app: 'MasterCMS', desc: 'Slider and showcase CMS' },
        { name: 'Shopify Suite', app: 'ShopifySuite', desc: 'Webhooks & 2-way sync' },
        { name: 'EU Buyer Portal (Arutemika)', app: 'EUPortal', desc: 'Wholesale leather export' },
        { name: 'RMG Apparel Portal', app: 'PortalRMG', desc: 'Cut & sew apparel manufacturing' },
        { name: 'Custom Apps Studio', app: 'CustomApps', desc: 'Launcher & external tools' }
      ];
      const apps = modules.filter(m => m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q));

      return { products, orders, customers, apps };
    }
  };

  // ── 3. Unified /admin/ Master Control Center Renderer ──
  function renderAdminCenter(container) {
    if (!container) return;

    // Pull Real Data
    const products = (window.ProductsService && typeof window.ProductsService.getAll === 'function') ? window.ProductsService.getAll() : [];
    const orders = (window.OrdersService && typeof window.OrdersService.getAll === 'function') ? window.OrdersService.getAll() : [];
    const customers = (window.CustomersService && typeof window.CustomersService.getAll === 'function') ? window.CustomersService.getAll() : [];

    // Calculate Real Metrics (No Fake Stats)
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => (o.createdAt || '').startsWith(todayStr));
    const todaySales = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const pendingOrders = orders.filter(o => o.fulfillmentStatus !== 'fulfilled' && o.status !== 'cancelled').length;
    const unpaidOrders = orders.filter(o => o.paymentStatus === 'unpaid').length;
    const lowStockCount = products.filter(p => (p.totalInventory || 0) <= (p.lowStockThreshold || 10)).length;

    const recentLogs = AuditService.loadLogs().slice(0, 8);

    container.innerHTML = `
      <div style="padding:20px 24px 40px;max-width:1200px;margin:0 auto;">
        
        <!-- Top Title Bar -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--wire);">
          <div>
            <div style="display:flex;align-items:center;gap:10px;">
              <h2 style="font-size:22px;font-weight:700;color:var(--ink);letter-spacing:-0.5px;">Master Control Center</h2>
              <span style="font-family:var(--mono);font-size:10.5px;padding:3px 9px;border-radius:var(--r-pill);background:rgba(255,91,53,0.14);color:var(--coral);font-weight:700;">ADMIN / OS</span>
            </div>
            <div style="font-size:13px;color:var(--ink-3);margin-top:4px;">
              Unified operations command: Orders, Google Drive ingestion, AI product enrichment, and multi-channel ecosystem.
            </div>
          </div>
          
          <div style="display:flex;gap:10px;align-items:center;">
            <button class="btn btn-gold" onclick="window.openFastOrderModal()" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;padding:10px 18px;">
              <span>⚡ Fast FB/WA Order</span>
            </button>
            <button class="btn btn-dark" onclick="openAppModule('DriveSync')" style="font-size:12px;padding:9px 14px;">
              📥 Drive Ingestion
            </button>
          </div>
        </div>

        <!-- Global Omni-Search Input -->
        <div class="neu-card" style="padding:14px 18px;border-radius:var(--r-md);background:var(--surface);margin-bottom:24px;">
          <div style="position:relative;">
            <div style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--coral);font-size:16px;">🔍</div>
            <input type="text" id="adminOmniSearch" class="fo-input" placeholder="Universal search: Type product name, SKU, customer phone, order #, or module…" style="padding-left:42px;height:46px;font-size:15px;" oninput="window.onAdminSearchInput(this.value)"/>
          </div>
          <div id="adminSearchResults" style="display:none;margin-top:14px;border-top:1px solid var(--wire);padding-top:14px;"></div>
        </div>

        <!-- Real-Time Metrics Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;margin-bottom:28px;">
          <div class="neu-card" style="padding:16px;border-radius:var(--r-md);background:var(--surface);">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);text-transform:uppercase;">Today's Sales</div>
            <div style="font-family:var(--display);font-size:24px;font-weight:800;color:var(--coral);margin-top:4px;">
              ৳${todaySales.toLocaleString()}
            </div>
            <div style="font-size:11.5px;color:var(--ink-3);margin-top:4px;">${todayOrders.length} order(s) today</div>
          </div>

          <div class="neu-card" style="padding:16px;border-radius:var(--r-md);background:var(--surface);">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);text-transform:uppercase;">Pending Orders</div>
            <div style="font-family:var(--display);font-size:24px;font-weight:800;color:var(--ink);margin-top:4px;">
              ${pendingOrders}
            </div>
            <div style="font-size:11.5px;color:var(--gold-dim);margin-top:4px;">Requires packing/shipping</div>
          </div>

          <div class="neu-card" style="padding:16px;border-radius:var(--r-md);background:var(--surface);">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);text-transform:uppercase;">Unpaid Balances</div>
            <div style="font-family:var(--display);font-size:24px;font-weight:800;color:var(--ink);margin-top:4px;">
              ${unpaidOrders}
            </div>
            <div style="font-size:11.5px;color:var(--ink-3);margin-top:4px;">Cash on Delivery dues</div>
          </div>

          <div class="neu-card" style="padding:16px;border-radius:var(--r-md);background:var(--surface);">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);text-transform:uppercase;">Low Stock SKUs</div>
            <div style="font-family:var(--display);font-size:24px;font-weight:800;color:${lowStockCount > 0 ? 'var(--warn)' : 'var(--ok)'};margin-top:4px;">
              ${lowStockCount}
            </div>
            <div style="font-size:11.5px;color:var(--ink-3);margin-top:4px;">Inventory below threshold</div>
          </div>

          <div class="neu-card" style="padding:16px;border-radius:var(--r-md);background:var(--surface);">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);text-transform:uppercase;">Customer Profiles</div>
            <div style="font-family:var(--display);font-size:24px;font-weight:800;color:var(--ink);margin-top:4px;">
              ${customers.length}
            </div>
            <div style="font-size:11.5px;color:var(--ok);margin-top:4px;">Active wholesale & D2C</div>
          </div>
        </div>

        <!-- Quick Access Control Matrix -->
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:start;">
          
          <!-- Fast Navigation Modules -->
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:12px;">Core Operator Terminals</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px;">
              
              <div class="neu-card" onclick="window.openFastOrderModal()" style="padding:16px;border-radius:var(--r-md);background:var(--surface);cursor:pointer;">
                <div style="font-size:22px;margin-bottom:6px;">⚡</div>
                <div style="font-weight:700;font-size:14px;color:var(--ink);">Fast Manual Order</div>
                <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px;">Enter WhatsApp / FB sale in &lt;10s</div>
              </div>

              <div class="neu-card" onclick="openAppModule('DriveSync')" style="padding:16px;border-radius:var(--r-md);background:var(--surface);cursor:pointer;">
                <div style="font-size:22px;margin-bottom:6px;">📥</div>
                <div style="font-weight:700;font-size:14px;color:var(--ink);">Google Drive Ingestion</div>
                <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px;">Auto-parse photo filenames</div>
              </div>

              <div class="neu-card" onclick="openAppModule('Products')" style="padding:16px;border-radius:var(--r-md);background:var(--surface);cursor:pointer;">
                <div style="font-size:22px;margin-bottom:6px;">🏷️</div>
                <div style="font-weight:700;font-size:14px;color:var(--ink);">Products &amp; AI Enrich</div>
                <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px;">Bulk edit, pricing &amp; AI copy</div>
              </div>

              <div class="neu-card" onclick="openAppModule('MasterCMS')" style="padding:16px;border-radius:var(--r-md);background:var(--surface);cursor:pointer;">
                <div style="font-size:22px;margin-bottom:6px;">🖼️</div>
                <div style="font-weight:700;font-size:14px;color:var(--ink);">Master Homepage CMS</div>
                <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px;">Manage ecosystem slider &amp; hub</div>
              </div>

              <div class="neu-card" onclick="openAppModule('Accounting')" style="padding:16px;border-radius:var(--r-md);background:var(--surface);cursor:pointer;">
                <div style="font-size:22px;margin-bottom:6px;">📊</div>
                <div style="font-weight:700;font-size:14px;color:var(--ink);">Accounting Sync</div>
                <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px;">account.handsandhead.com</div>
              </div>

              <div class="neu-card" onclick="openAppModule('ShopifySuite')" style="padding:16px;border-radius:var(--r-md);background:var(--surface);cursor:pointer;">
                <div style="font-size:22px;margin-bottom:6px;">🛍️</div>
                <div style="font-weight:700;font-size:14px;color:var(--ink);">Shopify Omnichannel</div>
                <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px;">Webhooks &amp; 2-way stock sync</div>
              </div>

            </div>
          </div>

          <!-- Activity Audit Log -->
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h3 style="font-size:16px;font-weight:700;color:var(--ink);">Audit Timeline</h3>
              <span style="font-family:var(--mono);font-size:10px;color:var(--ink-4);">REAL-TIME</span>
            </div>
            
            <div class="neu-card" style="padding:14px;border-radius:var(--r-md);background:var(--surface);">
              ${recentLogs.length === 0 ? `
                <div style="font-size:12px;color:var(--ink-4);text-align:center;padding:18px;">No audit events recorded yet.</div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${recentLogs.map(log => `
                    <div style="border-bottom:1px solid var(--wire);padding-bottom:8px;">
                      <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-weight:700;font-size:12px;color:var(--ink);">${log.action}</span>
                        <span style="font-family:var(--mono);font-size:10px;color:var(--ink-4);">
                          ${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style="font-size:11px;color:var(--ink-3);margin-top:2px;">
                        ${log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Completed'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>

        </div>

      </div>
    `;
  }

  // ── Global Search Handler ──
  window.onAdminSearchInput = function(query) {
    const resBox = document.getElementById('adminSearchResults');
    if (!resBox) return;

    if (!query || query.trim().length < 2) {
      resBox.style.display = 'none';
      return;
    }

    const { products, orders, customers, apps } = GlobalSearchEngine.search(query);
    const totalFound = products.length + orders.length + customers.length + apps.length;

    resBox.style.display = 'block';
    if (totalFound === 0) {
      resBox.innerHTML = `<div style="font-size:12px;color:var(--ink-3);text-align:center;padding:12px;">No matching records found for "${query}"</div>`;
      return;
    }

    let html = `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:14px;">`;

    if (products.length > 0) {
      html += `
        <div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--coral);font-weight:700;margin-bottom:6px;">PRODUCTS (${products.length})</div>
          ${products.map(p => `
            <div style="padding:6px 8px;background:var(--bg-neu-dark);border-radius:6px;margin-bottom:4px;cursor:pointer;" onclick="openAppModule('Products')">
              <div style="font-weight:700;font-size:12.5px;color:var(--ink);">${p.title}</div>
              <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);">${p.sku || ''} · ৳${(p.pricing?.price || 0).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (orders.length > 0) {
      html += `
        <div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--gold-dim);font-weight:700;margin-bottom:6px;">ORDERS (${orders.length})</div>
          ${orders.map(o => `
            <div style="padding:6px 8px;background:var(--bg-neu-dark);border-radius:6px;margin-bottom:4px;cursor:pointer;" onclick="openAppModule('Orders')">
              <div style="font-weight:700;font-size:12.5px;color:var(--ink);">${o.orderNumber}</div>
              <div style="font-size:11px;color:var(--ink-3);">${o.customerSnapshot?.name || 'Customer'} · ৳${(o.total || 0).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (customers.length > 0) {
      html += `
        <div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--ok);font-weight:700;margin-bottom:6px;">CUSTOMERS (${customers.length})</div>
          ${customers.map(c => `
            <div style="padding:6px 8px;background:var(--bg-neu-dark);border-radius:6px;margin-bottom:4px;cursor:pointer;" onclick="openAppModule('CRM')">
              <div style="font-weight:700;font-size:12.5px;color:var(--ink);">${c.name}</div>
              <div style="font-size:11px;color:var(--ink-3);font-family:var(--mono);">${c.phone} · ${c.district || 'Dhaka'}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (apps.length > 0) {
      html += `
        <div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--purple);font-weight:700;margin-bottom:6px;">APPS &amp; OS (${apps.length})</div>
          ${apps.map(a => `
            <div style="padding:6px 8px;background:var(--bg-neu-dark);border-radius:6px;margin-bottom:4px;cursor:pointer;" onclick="openAppModule('${a.app}')">
              <div style="font-weight:700;font-size:12.5px;color:var(--ink);">${a.name}</div>
              <div style="font-size:11px;color:var(--ink-3);">${a.desc}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    html += `</div>`;
    resBox.innerHTML = html;
  };

  // Expose
  window.AuditService = AuditService;
  window.GlobalSearchEngine = GlobalSearchEngine;
  window.renderAdminCenter = renderAdminCenter;

})();
