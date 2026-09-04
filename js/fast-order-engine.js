/**
 * ══════════════════════════════════════════════════════════════════════
 * HANDS & HEAD — Fast Order Engine (Facebook, WhatsApp & Phone Manual POS)
 * Bangladesh-First: Phone lookup, auto-customer, COD, bKash, Dhaka delivery
 * Target: Complete Facebook/WhatsApp order in under 10 seconds.
 * ══════════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  const FastOrderEngine = {
    // Current Draft State
    draft: {
      source: 'WhatsApp',
      customer: {
        id: null,
        phone: '',
        name: '',
        address: '',
        district: 'Dhaka',
        area: '',
        notes: ''
      },
      items: [],
      deliveryLocation: 'inside_dhaka', // 'inside_dhaka' | 'outside_dhaka' | 'free' | 'custom'
      deliveryCharge: 80,
      discount: 0,
      paymentMethod: 'COD',
      paymentStatus: 'unpaid', // 'unpaid' | 'paid' | 'partial'
      paidAmount: 0,
      notes: ''
    },

    resetDraft() {
      this.draft = {
        source: 'WhatsApp',
        customer: { id: null, phone: '', name: '', address: '', district: 'Dhaka', area: '', notes: '' },
        items: [],
        deliveryLocation: 'inside_dhaka',
        deliveryCharge: 80,
        discount: 0,
        paymentMethod: 'COD',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        notes: ''
      };
    },

    /**
     * Search customer by phone or name
     */
    searchCustomer(query) {
      if (!query || query.trim().length < 3) return [];
      const cleanQ = query.trim().toLowerCase();
      let allCustomers = [];
      if (window.CustomersService && typeof window.CustomersService.getAll === 'function') {
        allCustomers = window.CustomersService.getAll() || [];
      }

      return allCustomers.filter(c => {
        const phone = (c.phone || '').replace(/[^0-9]/g, '');
        const name = (c.name || '').toLowerCase();
        return phone.includes(cleanQ.replace(/[^0-9]/g, '')) || name.includes(cleanQ);
      });
    },

    /**
     * Calculate Subtotal, Total, and Due
     */
    calculateTotals() {
      const subtotal = this.draft.items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
      const delivery = Number(this.draft.deliveryCharge) || 0;
      const discount = Number(this.draft.discount) || 0;
      const grandTotal = Math.max(0, subtotal + delivery - discount);
      const paid = this.draft.paymentStatus === 'paid' ? grandTotal : (Number(this.draft.paidAmount) || 0);
      const dueAmount = Math.max(0, grandTotal - paid);

      return { subtotal, delivery, discount, grandTotal, paid, dueAmount };
    },

    /**
     * Set delivery location preset
     */
    setDeliveryPreset(preset) {
      this.draft.deliveryLocation = preset;
      if (preset === 'inside_dhaka') this.draft.deliveryCharge = 80;
      else if (preset === 'outside_dhaka') this.draft.deliveryCharge = 150;
      else if (preset === 'free') this.draft.deliveryCharge = 0;
    },

    /**
     * Save order directly to Firestore & OrdersService
     */
    async submitOrder() {
      const { customer, items, source, paymentMethod, paymentStatus, notes } = this.draft;
      const totals = this.calculateTotals();

      if (!customer.phone || customer.phone.trim().length < 8) {
        throw new Error('Customer phone number is required');
      }
      if (!customer.name || customer.name.trim().length < 2) {
        throw new Error('Customer name is required');
      }
      if (items.length === 0) {
        throw new Error('Please add at least one product item');
      }

      const orderNumber = `HH-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderId = `ord-${Date.now()}`;

      // 1. Auto-create or update Customer in Customer Engine
      let customerId = customer.id;
      if (window.CustomersService) {
        if (!customerId) {
          const newCust = {
            id: `cust-${Date.now()}`,
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            address: customer.address.trim(),
            district: customer.district || 'Dhaka',
            area: customer.area || '',
            totalOrders: 1,
            totalSpent: totals.grandTotal,
            lastOrderDate: new Date().toISOString(),
            source,
            createdAt: new Date().toISOString()
          };
          if (typeof window.CustomersService.createCustomer === 'function') {
            await window.CustomersService.createCustomer(newCust);
            customerId = newCust.id;
          }
        }
      }

      // 2. Build Structured Order Record
      const orderRecord = {
        id: orderId,
        orderNumber,
        source: source || 'WhatsApp',
        customerSnapshot: {
          id: customerId,
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          district: customer.district || 'Dhaka',
          area: customer.area || ''
        },
        lineItems: items.map(it => ({
          productId: it.productId,
          variantId: it.variantId || null,
          title: it.title,
          sku: it.sku || 'SKU-GEN',
          price: it.price,
          quantity: it.quantity,
          lineTotal: it.price * it.quantity,
          image: it.image || null
        })),
        subtotal: totals.subtotal,
        deliveryCharge: totals.delivery,
        discountTotal: totals.discount,
        total: totals.grandTotal,
        paymentMethod: paymentMethod || 'COD',
        paymentStatus: paymentStatus || 'unpaid',
        paidAmount: totals.paid,
        dueAmount: totals.dueAmount,
        fulfillmentStatus: 'unfulfilled',
        status: 'open',
        notes: notes || '',
        timeline: [
          {
            event: `Fast Order created via ${source}`,
            at: new Date().toISOString(),
            by: 'Operator'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 3. Save into Orders Service & Firestore
      if (window.OrdersService && typeof window.OrdersService.createOrder === 'function') {
        await window.OrdersService.createOrder(orderRecord);
      } else if (window.Collections && window.Collections.orders) {
        await window.Collections.orders.doc(orderRecord.id).set(orderRecord);
      }

      // 4. Emit global event
      if (window.NexEvents) {
        window.NexEvents.emit('ORDER_CREATED', orderRecord);
        window.NexEvents.emit('ORDERS_CHANGED', {});
      }

      return orderRecord;
    },

    /**
     * Generate structured WhatsApp / Facebook message for customer
     */
    generateConfirmationMessage(order) {
      const itemsList = order.lineItems.map((it, i) => `${i + 1}. ${it.title} (x${it.quantity}) — ৳${(it.price * it.quantity).toLocaleString()}`).join('\n');
      
      return `*HANDS & HEAD — Order Confirmation*\n` +
             `Order ID: *${order.orderNumber}*\n` +
             `--------------------------------\n` +
             `Customer: ${order.customerSnapshot.name}\n` +
             `Phone: ${order.customerSnapshot.phone}\n` +
             `Address: ${order.customerSnapshot.address}, ${order.customerSnapshot.district}\n` +
             `--------------------------------\n` +
             `*Items:*\n${itemsList}\n` +
             `--------------------------------\n` +
             `Subtotal: ৳${order.subtotal.toLocaleString()}\n` +
             `Delivery (${order.customerSnapshot.district === 'Dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}): ৳${order.deliveryCharge.toLocaleString()}\n` +
             (order.discountTotal > 0 ? `Discount: -৳${order.discountTotal.toLocaleString()}\n` : '') +
             `*Total Payable: ৳${order.total.toLocaleString()}*\n` +
             `Payment Method: *${order.paymentMethod}* (${order.paymentStatus.toUpperCase()})\n` +
             `--------------------------------\n` +
             `Thank you for shopping with HANDS & HEAD! Your order is being packed.`;
    }
  };

  // ── 2. Modal Controller & View ──
  function openFastOrderModal() {
    FastOrderEngine.resetDraft();
    let modal = document.getElementById('fastOrderModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fastOrderModal';
      modal.className = 'fast-order-modal-wrap';
      document.body.appendChild(modal);
    }

    renderFastOrderModalContent(modal);
    modal.classList.add('on');
    setTimeout(() => {
      document.getElementById('foCustomerPhone')?.focus();
    }, 150);
  }

  function closeFastOrderModal() {
    const modal = document.getElementById('fastOrderModal');
    if (modal) modal.classList.remove('on');
  }

  function renderFastOrderModalContent(modal) {
    const draft = FastOrderEngine.draft;
    const totals = FastOrderEngine.calculateTotals();
    const allProducts = (window.ProductsService && typeof window.ProductsService.getAll === 'function') ? window.ProductsService.getAll() : [];

    modal.innerHTML = `
      <div class="fast-order-overlay" onclick="window.closeFastOrderModal()"></div>
      <div class="fast-order-dialog neu-card">
        
        <!-- Header -->
        <div class="fo-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:20px;">⚡</span>
            <div>
              <div style="font-weight:700;font-size:16px;color:var(--ink);">Fast Manual Order Creator</div>
              <div style="font-size:11px;color:var(--ink-3);">Facebook · WhatsApp · Phone in &lt;10 Seconds</div>
            </div>
          </div>
          <button class="fo-close-btn" onclick="window.closeFastOrderModal()">✕</button>
        </div>

        <!-- Body Form -->
        <div class="fo-body">
          
          <!-- Source & Channel Selection -->
          <div style="margin-bottom:14px;">
            <label class="fo-label">ORDER SOURCE / CHANNEL</label>
            <div class="fo-pill-group">
              ${['WhatsApp', 'Facebook', 'Messenger', 'Phone', 'Storefront'].map(s => `
                <button type="button" class="fo-pill ${draft.source === s ? 'active' : ''}" onclick="window.setFOSource('${s}')">
                  ${s === 'WhatsApp' ? '💬 WhatsApp' : s === 'Facebook' ? '📘 Facebook' : s === 'Messenger' ? '⚡ Messenger' : s === 'Phone' ? '📞 Phone' : '🏪 In-Store'}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Customer Phone & Instant Auto-lookup -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div>
              <label class="fo-label">CUSTOMER PHONE NUMBER *</label>
              <div style="position:relative;">
                <input type="tel" id="foCustomerPhone" class="fo-input" placeholder="017XXXXXXXX" value="${draft.customer.phone}" oninput="window.onFOCustomerPhoneInput(this.value)"/>
                <div id="foCustomerSuggestions" class="fo-dropdown" style="display:none;"></div>
              </div>
            </div>
            <div>
              <label class="fo-label">CUSTOMER FULL NAME *</label>
              <input type="text" id="foCustomerName" class="fo-input" placeholder="e.g. Tanvir Ahmed" value="${draft.customer.name}" oninput="FastOrderEngine.draft.customer.name = this.value"/>
            </div>
          </div>

          <!-- Delivery Address & District -->
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
              <label class="fo-label">DELIVERY ADDRESS *</label>
              <input type="text" id="foCustomerAddress" class="fo-input" placeholder="House, Road, Area, Thana" value="${draft.customer.address}" oninput="FastOrderEngine.draft.customer.address = this.value"/>
            </div>
            <div>
              <label class="fo-label">DISTRICT</label>
              <select id="foCustomerDistrict" class="fo-input" onchange="window.onFODistrictChange(this.value)">
                <option value="Dhaka" ${draft.customer.district === 'Dhaka' ? 'selected' : ''}>Dhaka</option>
                <option value="Chittagong" ${draft.customer.district === 'Chittagong' ? 'selected' : ''}>Chittagong</option>
                <option value="Sylhet" ${draft.customer.district === 'Sylhet' ? 'selected' : ''}>Sylhet</option>
                <option value="Rajshahi" ${draft.customer.district === 'Rajshahi' ? 'selected' : ''}>Rajshahi</option>
                <option value="Khulna" ${draft.customer.district === 'Khulna' ? 'selected' : ''}>Khulna</option>
                <option value="Barisal" ${draft.customer.district === 'Barisal' ? 'selected' : ''}>Barisal</option>
                <option value="Rangpur" ${draft.customer.district === 'Rangpur' ? 'selected' : ''}>Rangpur</option>
                <option value="Mymensingh" ${draft.customer.district === 'Mymensingh' ? 'selected' : ''}>Mymensingh</option>
                <option value="Other" ${draft.customer.district === 'Other' ? 'selected' : ''}>Other District</option>
              </select>
            </div>
          </div>

          <!-- Product Selection Section -->
          <div style="margin-bottom:14px;padding:12px;background:var(--bg-neu-dark);border-radius:var(--r-sm);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <label class="fo-label" style="margin:0;">ORDER ITEMS</label>
              <span style="font-size:11px;color:var(--ink-3);">${draft.items.length} item(s) selected</span>
            </div>

            <!-- Fast Product Picker Dropdown -->
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <select id="foProductSelector" class="fo-input" style="flex:1;">
                <option value="">-- Choose Product to Add --</option>
                ${allProducts.map(p => `
                  <option value="${p.id}" data-title="${p.title}" data-price="${p.pricing?.price || 0}" data-sku="${p.sku || ''}" data-img="${p.images?.[0]?.url || ''}">
                    ${p.title} — ৳${(p.pricing?.price || 0).toLocaleString()} (Stock: ${p.totalInventory || 20})
                  </option>
                `).join('')}
              </select>
              <button type="button" class="btn btn-sm btn-gold" onclick="window.addFOSelectedItem()" style="font-weight:700;">+ Add</button>
            </div>

            <!-- Items List -->
            <div id="foItemsList">
              ${draft.items.length === 0 ? `
                <div style="font-size:12px;color:var(--ink-4);text-align:center;padding:12px;">No products added yet. Select from the dropdown above.</div>
              ` : draft.items.map((it, idx) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:var(--surface);border-radius:6px;margin-bottom:6px;border:1px solid var(--wire);">
                  <div style="flex:1;">
                    <div style="font-weight:700;font-size:12.5px;color:var(--ink);">${it.title}</div>
                    <div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);">৳${it.price.toLocaleString()} each</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <button class="btn btn-xs btn-dark" onclick="window.adjustFOItemQty(${idx}, -1)">-</button>
                    <span style="font-family:var(--mono);font-weight:700;font-size:12px;min-width:18px;text-align:center;">${it.quantity}</span>
                    <button class="btn btn-xs btn-dark" onclick="window.adjustFOItemQty(${idx}, 1)">+</button>
                    <span style="font-family:var(--mono);font-weight:700;font-size:12px;min-width:55px;text-align:right;color:var(--coral);">৳${(it.price * it.quantity).toLocaleString()}</span>
                    <button class="btn btn-xs btn-warn" onclick="window.removeFOItem(${idx})" style="padding:2px 6px;">✕</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Delivery Charge & Payment Options -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
              <label class="fo-label">DELIVERY CHARGE (BDT)</label>
              <div style="display:flex;gap:6px;margin-bottom:6px;">
                <button type="button" class="fo-chip ${draft.deliveryLocation === 'inside_dhaka' ? 'active' : ''}" onclick="window.setFODelivery('inside_dhaka')">Dhaka (৳80)</button>
                <button type="button" class="fo-chip ${draft.deliveryLocation === 'outside_dhaka' ? 'active' : ''}" onclick="window.setFODelivery('outside_dhaka')">Outside (৳150)</button>
                <button type="button" class="fo-chip ${draft.deliveryLocation === 'free' ? 'active' : ''}" onclick="window.setFODelivery('free')">Free (৳0)</button>
              </div>
              <input type="number" class="fo-input" value="${draft.deliveryCharge}" oninput="window.setFOCustomDelivery(this.value)"/>
            </div>

            <div>
              <label class="fo-label">PAYMENT METHOD</label>
              <div style="display:flex;gap:6px;margin-bottom:6px;">
                <button type="button" class="fo-chip ${draft.paymentMethod === 'COD' ? 'active' : ''}" onclick="window.setFOPayment('COD')">COD</button>
                <button type="button" class="fo-chip ${draft.paymentMethod === 'bKash' ? 'active' : ''}" onclick="window.setFOPayment('bKash')">bKash</button>
                <button type="button" class="fo-chip ${draft.paymentMethod === 'Nagad' ? 'active' : ''}" onclick="window.setFOPayment('Nagad')">Nagad</button>
                <button type="button" class="fo-chip ${draft.paymentMethod === 'Bank' ? 'active' : ''}" onclick="window.setFOPayment('Bank')">Bank</button>
              </div>
              <select class="fo-input" onchange="FastOrderEngine.draft.paymentStatus = this.value; window.refreshFOMiniTotals();">
                <option value="unpaid" ${draft.paymentStatus === 'unpaid' ? 'selected' : ''}>Payment Status: Unpaid (Due on Delivery)</option>
                <option value="paid" ${draft.paymentStatus === 'paid' ? 'selected' : ''}>Payment Status: Paid in Full</option>
                <option value="partial" ${draft.paymentStatus === 'partial' ? 'selected' : ''}>Payment Status: Partial Advance</option>
              </select>
            </div>
          </div>

          <!-- Total Summary & Submit -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--bg-neu-dark);border-radius:var(--r-md);margin-top:14px;">
            <div>
              <div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;font-family:var(--mono);">Grand Total Payable</div>
              <div id="foGrandTotalDisplay" style="font-size:22px;font-weight:800;color:var(--coral);font-family:var(--display);letter-spacing:0.5px;">
                ৳${totals.grandTotal.toLocaleString()}
              </div>
              <div style="font-size:11px;color:var(--ink-3);">Subtotal: ৳${totals.subtotal.toLocaleString()} + Delivery: ৳${totals.delivery}</div>
            </div>

            <div style="display:flex;gap:10px;">
              <button class="btn btn-dark" onclick="window.closeFastOrderModal()">Cancel</button>
              <button class="btn btn-gold" id="btnSaveFastOrder" onclick="window.submitFastOrderNow()" style="padding:10px 22px;font-weight:700;font-size:14px;">
                ⚡ Create Order
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // ── Helper window methods for fast order ──
  window.openFastOrderModal = openFastOrderModal;
  window.closeFastOrderModal = closeFastOrderModal;

  window.setFOSource = function(source) {
    FastOrderEngine.draft.source = source;
    const modal = document.getElementById('fastOrderModal');
    if (modal) renderFastOrderModalContent(modal);
  };

  window.onFOCustomerPhoneInput = function(phone) {
    FastOrderEngine.draft.customer.phone = phone;
    const sugBox = document.getElementById('foCustomerSuggestions');
    if (!sugBox) return;

    const matches = FastOrderEngine.searchCustomer(phone);
    if (matches.length > 0) {
      sugBox.style.display = 'block';
      sugBox.innerHTML = matches.slice(0, 4).map(c => `
        <div class="fo-sug-item" onclick="window.selectFOCustomer('${c.id}')">
          <div style="font-weight:700;font-size:12px;color:var(--ink);">${c.name}</div>
          <div style="font-size:11px;color:var(--coral);font-family:var(--mono);">${c.phone} · ${c.district || 'Dhaka'}</div>
          <div style="font-size:10.5px;color:var(--ink-3);">${c.address || 'No address saved'}</div>
        </div>
      `).join('');
    } else {
      sugBox.style.display = 'none';
    }
  };

  window.selectFOCustomer = function(custId) {
    let allCust = [];
    if (window.CustomersService) allCust = window.CustomersService.getAll() || [];
    const cust = allCust.find(c => c.id === custId);
    if (cust) {
      FastOrderEngine.draft.customer = {
        id: cust.id,
        phone: cust.phone,
        name: cust.name,
        address: cust.address || '',
        district: cust.district || 'Dhaka',
        area: cust.area || '',
        notes: cust.notes || ''
      };
      if (cust.district && cust.district !== 'Dhaka') {
        FastOrderEngine.setDeliveryPreset('outside_dhaka');
      } else {
        FastOrderEngine.setDeliveryPreset('inside_dhaka');
      }
    }
    const modal = document.getElementById('fastOrderModal');
    if (modal) renderFastOrderModalContent(modal);
  };

  window.onFODistrictChange = function(district) {
    FastOrderEngine.draft.customer.district = district;
    if (district === 'Dhaka') {
      FastOrderEngine.setDeliveryPreset('inside_dhaka');
    } else {
      FastOrderEngine.setDeliveryPreset('outside_dhaka');
    }
    const modal = document.getElementById('fastOrderModal');
    if (modal) renderFastOrderModalContent(modal);
  };

  window.addFOSelectedItem = function() {
    const sel = document.getElementById('foProductSelector');
    if (!sel || !sel.value) return;

    const opt = sel.options[sel.selectedIndex];
    const productId = sel.value;
    const title = opt.getAttribute('data-title') || 'Product';
    const price = parseInt(opt.getAttribute('data-price'), 10) || 0;
    const sku = opt.getAttribute('data-sku') || '';
    const img = opt.getAttribute('data-img') || '';

    const existingIndex = FastOrderEngine.draft.items.findIndex(it => it.productId === productId);
    if (existingIndex >= 0) {
      FastOrderEngine.draft.items[existingIndex].quantity += 1;
    } else {
      FastOrderEngine.draft.items.push({ productId, title, price, sku, image: img, quantity: 1 });
    }

    const modal = document.getElementById('fastOrderModal');
    if (modal) renderFastOrderModalContent(modal);
  };

  window.adjustFOItemQty = function(idx, delta) {
    if (FastOrderEngine.draft.items[idx]) {
      FastOrderEngine.draft.items[idx].quantity += delta;
      if (FastOrderEngine.draft.items[idx].quantity <= 0) {
        FastOrderEngine.draft.items.splice(idx, 1);
      }
    }
    const modal = document.getElementById('fastOrderModal');
    if (modal) renderFastOrderModalContent(modal);
  };

  window.removeFOItem = function(idx) {
    if (FastOrderEngine.draft.items[idx]) {
      FastOrderEngine.draft.items.splice(idx, 1);
    }
    const modal = document.getElementById('fastOrderModal');
    if (modal) renderFastOrderModalContent(modal);
  };

  window.setFODelivery = function(preset) {
    FastOrderEngine.setDeliveryPreset(preset);
    const modal = document.getElementById('fastOrderModal');
    if (modal) renderFastOrderModalContent(modal);
  };

  window.setFOCustomDelivery = function(val) {
    FastOrderEngine.draft.deliveryCharge = Number(val) || 0;
    FastOrderEngine.draft.deliveryLocation = 'custom';
    window.refreshFOMiniTotals();
  };

  window.setFOPayment = function(method) {
    FastOrderEngine.draft.paymentMethod = method;
    const modal = document.getElementById('fastOrderModal');
    if (modal) renderFastOrderModalContent(modal);
  };

  window.refreshFOMiniTotals = function() {
    const totals = FastOrderEngine.calculateTotals();
    const display = document.getElementById('foGrandTotalDisplay');
    if (display) display.innerText = `৳${totals.grandTotal.toLocaleString()}`;
  };

  window.submitFastOrderNow = async function() {
    const btn = document.getElementById('btnSaveFastOrder');
    if (btn) { btn.innerText = 'Creating…'; btn.disabled = true; }

    try {
      const order = await FastOrderEngine.submitOrder();
      closeFastOrderModal();
      showFastOrderSuccessModal(order);
    } catch (err) {
      alert(`Could not create order: ${err.message}`);
      if (btn) { btn.innerText = '⚡ Create Order'; btn.disabled = false; }
    }
  };

  function showFastOrderSuccessModal(order) {
    const msg = FastOrderEngine.generateConfirmationMessage(order);
    const phoneClean = (order.customerSnapshot.phone || '').replace(/[^0-9]/g, '');
    const intlPhone = phoneClean.startsWith('88') ? phoneClean : `88${phoneClean}`;
    const waUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;

    const wrap = document.createElement('div');
    wrap.className = 'fast-order-modal-wrap on';
    wrap.innerHTML = `
      <div class="fast-order-overlay" onclick="this.parentElement.remove()"></div>
      <div class="fast-order-dialog neu-card" style="max-width:540px;">
        <div class="fo-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:22px;color:var(--ok);">✓</span>
            <div>
              <div style="font-weight:700;font-size:16px;color:var(--ink);">Order ${order.orderNumber} Created!</div>
              <div style="font-size:11.5px;color:var(--ink-3);">Saved to Orders &amp; Synced to Customer Profile</div>
            </div>
          </div>
          <button class="fo-close-btn" onclick="this.closest('.fast-order-modal-wrap').remove()">✕</button>
        </div>
        <div class="fo-body">
          <div style="margin-bottom:12px;font-size:12.5px;color:var(--ink-2);font-weight:600;">
            WhatsApp / Facebook Messenger Receipt Preview:
          </div>
          <textarea id="foMsgText" readonly class="fo-input" style="height:150px;font-family:var(--mono);font-size:11.5px;line-height:1.4;background:var(--bg-neu-dark);">${msg}</textarea>
          
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button class="btn btn-sm btn-dark" onclick="navigator.clipboard.writeText(document.getElementById('foMsgText').value); alert('Copied to clipboard!');" style="flex:1;">
              📋 Copy Receipt
            </button>
            <a href="${waUrl}" target="_blank" class="btn btn-sm btn-gold" style="flex:1;text-align:center;display:flex;align-items:center;justify-content:center;font-weight:700;">
              💬 Open in WhatsApp
            </a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  // Expose
  window.FastOrderEngine = FastOrderEngine;

})();
