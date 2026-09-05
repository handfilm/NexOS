/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/invoice-engine.js
   Commercial PDF Invoice Generator for Order Management Module
   Utilizes real Firestore Order & Customer data
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const InvoiceEngine = {
    COMPANY_INFO: {
      name: "HANDS & HEAD",
      division: "Atelier & B2B Leather Export Division",
      headline: "Commercial Tax Invoice & Delivery Voucher",
      address: "House 09, Road 02, Park Road, Baridhara Diplomatic Zone",
      city: "Dhaka 1212",
      country: "Bangladesh",
      email: "export@handsandhead.com",
      concierge: "concierge@handsandhead.com",
      hotline: "+880 1711-002233",
      web: "handsandhead.com",
      vatBin: "BIN: 002948192-0101 · Customs Bond #DH-2024",
      tradeLicense: "TRAD/DNCC/049182/2022"
    },

    /* ── 1. Fetch & Hydrate Data from Firestore ── */
    async getInvoiceData(orderId) {
      if (!orderId) throw new Error("Order ID is required");

      // 1. Fetch Order from Firestore (via OrdersService)
      let order = null;
      if (window.OrdersService && typeof window.OrdersService.getInvoiceData === 'function') {
        const res = await window.OrdersService.getInvoiceData(orderId);
        if (res && res.order) {
          order = res.order;
          if (res.customer) {
            return { order, customer: res.customer };
          }
        }
      }

      if (!order && window.OrdersService) {
        order = await window.OrdersService.get(orderId);
      }

      if (!order) {
        // Fallback to local cache
        const cached = JSON.parse(localStorage.getItem("nx_orders_cache") || "[]");
        order = cached.find(o => o.id === orderId || o.orderNumber === orderId);
      }

      if (!order) {
        throw new Error(`Order #${orderId} could not be retrieved from Firestore.`);
      }

      // 2. Fetch Customer from Firestore (via CustomersService)
      let customer = null;
      const customerId = order.customerId;
      if (customerId && window.CustomersService) {
        try {
          customer = await window.CustomersService.get(customerId);
        } catch (err) {
          console.warn("[InvoiceEngine] Customer fetch error:", err);
        }
      }

      // 3. Fallback: Search customer by phone/email/name from customer service/cache
      if (!customer && window.CustomersService) {
        const snap = order.customerSnapshot || {};
        const ship = order.shippingAddress || {};
        const phoneToMatch = (snap.phone || ship.phone || order.phone || '').replace(/[^0-9]/g, '');
        const nameToMatch = (snap.name || ship.name || order.customerName || '').toLowerCase().trim();

        try {
          const cachedCustomers = JSON.parse(localStorage.getItem("nx_customers_cache") || "[]");
          customer = cachedCustomers.find(c => {
            const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
            const cName = (c.name || c.companyName || '').toLowerCase().trim();
            return (phoneToMatch && cPhone && phoneToMatch === cPhone) ||
                   (nameToMatch && cName && nameToMatch === cName);
          }) || null;
        } catch (e) {}
      }

      return { order, customer };
    },

    /* ── 2. Build Clean, High-Contrast Invoice HTML Template ── */
    buildInvoiceHTML(order, customer = null, options = {}) {
      const comp = this.COMPANY_INFO;
      const custSnap = order.customerSnapshot || {};
      const shipAddr = order.shippingAddress || {};
      const billAddr = order.billingAddress || {};

      // Buyer Identifiers
      const buyerName = customer?.name || customer?.companyName || custSnap.name || custSnap.companyName || order.customerName || 'Valued Client';
      const companyName = customer?.companyName || custSnap.companyName || buyerName;
      const contactPerson = customer?.contactPerson || buyerName;
      const buyerPhone = customer?.phone || custSnap.phone || shipAddr.phone || order.phone || 'N/A';
      const buyerEmail = customer?.email || custSnap.email || order.email || 'N/A';
      const paymentTerms = customer?.paymentTerms || order.paymentMethod || 'Cash on Delivery (COD)';
      const taxExempt = customer?.taxExempt === 'yes' || customer?.taxExempt === true;

      // Delivery Destination
      let streetAddress = shipAddr.line1 || custSnap.address || customer?.addressLine1 || customer?.addresses?.[0]?.line1 || order.address || 'Address pending verification';
      if (shipAddr.line2) streetAddress += `, ${shipAddr.line2}`;
      const city = shipAddr.city || custSnap.district || customer?.addresses?.[0]?.city || order.district || 'Dhaka';
      const country = shipAddr.country || custSnap.country || customer?.country || 'Bangladesh (BD)';
      const postalCode = shipAddr.postalCode || customer?.addresses?.[0]?.postalCode || '';

      // Financials
      const lineItems = order.lineItems && order.lineItems.length ? order.lineItems : [
        { title: "B2B Atelier Custom Commission", sku: "HH-COMM-01", price: Number(order.total || 0), quantity: 1, lineTotal: Number(order.total || 0) }
      ];
      const itemsCount = lineItems.reduce((s, i) => s + Number(i.quantity || 1), 0);
      const calculatedSubtotal = lineItems.reduce((s, i) => s + (Number(i.price || 0) * Number(i.quantity || 1)), 0);
      const subtotal = Number(order.subtotal !== undefined ? order.subtotal : calculatedSubtotal);
      const discount = Number(order.discountTotal || 0);

      let deliveryCharge = 0;
      if (order.deliveryCharge !== undefined && order.deliveryCharge !== null) {
        deliveryCharge = Number(order.deliveryCharge);
      } else if (order.shippingTotal !== undefined && order.shippingTotal !== null) {
        deliveryCharge = Number(order.shippingTotal);
      } else if (order.total !== undefined && (Number(order.total) - (subtotal - discount)) > 0) {
        deliveryCharge = Math.round(Number(order.total) - (subtotal - discount));
      }
      const grandTotal = Number(order.total !== undefined ? order.total : (subtotal - discount + deliveryCharge));

      const isPaid = (order.paymentStatus === 'paid');
      const isPartiallyPaid = (order.paymentStatus === 'partially_paid');
      const paidAmount = isPaid ? grandTotal : (isPartiallyPaid ? Number(order.paidAmount || 0) : 0);
      const balanceDue = isPaid ? 0 : Math.max(0, grandTotal - paidAmount);

      const courierName = order.courier || order.courierPartner || 'Steadfast Courier';
      const trackingNumber = order.trackingNumber || order.consignmentId || '';
      const notes = order.customization || order.notes || '';

      // Format Date
      let invoiceDate = new Date();
      if (order.createdAt) {
        invoiceDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      }
      const dateStr = invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = invoiceDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      // QR Code verification data URL
      let qrCodeDataUrl = '';
      if (window.HHQRCode && typeof window.HHQRCode.generateDataUrl === 'function') {
        try {
          const verifyPayload = `https://handsandhead.com/track?order=${encodeURIComponent(order.orderNumber || order.id)}&total=${grandTotal}&status=${order.paymentStatus || 'pending'}`;
          qrCodeDataUrl = window.HHQRCode.generateDataUrl(verifyPayload, { width: 90, height: 90, margin: 1 });
        } catch (e) {
          console.warn("[InvoiceEngine] QR generation failed:", e);
        }
      }

      return `
        <div id="hh_invoice_printable" class="hh-invoice-sheet">
          <!-- Top Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #0f172a;margin-bottom:24px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="background:#0f172a;color:#ffffff;font-family:'Anton',Impact,sans-serif;font-size:20px;letter-spacing:1.5px;padding:4px 10px;border-radius:2px;display:inline-block;">
                  H&amp;H
                </div>
                <div>
                  <h1 style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;line-height:1;">
                    ${comp.name}
                  </h1>
                  <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;margin-top:3px;">
                    ${comp.division}
                  </div>
                </div>
              </div>
              <div style="font-size:11px;color:#475569;margin-top:10px;line-height:1.45;">
                ${comp.address}, ${comp.city}, ${comp.country}<br/>
                Concierge: <strong>${comp.hotline}</strong> · Email: <strong>${comp.email}</strong><br/>
                <span style="font-family:monospace;font-size:10px;color:#64748b;">${comp.vatBin}</span>
              </div>
            </div>

            <!-- Invoice Meta Block (Right) -->
            <div style="text-align:right;">
              <div style="font-size:20px;font-weight:900;color:#0f172a;letter-spacing:0.5px;text-transform:uppercase;">
                COMMERCIAL INVOICE
              </div>
              <div style="font-size:14px;font-weight:800;font-family:monospace;color:#0f172a;margin-top:2px;">
                #INV-${order.orderNumber || order.id}
              </div>

              <div style="margin-top:10px;display:inline-flex;flex-direction:column;gap:3px;align-items:flex-end;">
                <div style="font-size:11.5px;color:#334155;">
                  <strong>Issue Date:</strong> ${dateStr} (${timeStr})
                </div>
                <div style="font-size:11.5px;color:#334155;">
                  <strong>Order ID:</strong> <span style="font-family:monospace;">${order.orderNumber || order.id}</span>
                </div>
                <div style="font-size:11.5px;color:#334155;">
                  <strong>Payment Terms:</strong> ${paymentTerms}
                </div>
              </div>

              <div style="margin-top:10px;display:flex;gap:6px;justify-content:flex-end;">
                <span class="hh-inv-badge ${isPaid ? 'paid' : 'cod'}">
                  ${isPaid ? '✓ PAID IN FULL' : '💵 CASH ON DELIVERY'}
                </span>
                <span class="hh-inv-badge shipped">
                  ${(order.fulfillmentStatus || 'unfulfilled').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <!-- Customer & Consignee Two-Column Details -->
          <div class="inv-meta-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
            <!-- Bill To -->
            <div>
              <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
                BILLED TO / CUSTOMER RECORD
              </div>
              <div style="font-size:15px;font-weight:800;color:#0f172a;">
                ${companyName !== buyerName ? `${companyName}` : buyerName}
              </div>
              ${companyName !== buyerName ? `<div style="font-size:12px;color:#334155;margin-top:1px;">Attn: <strong>${contactPerson}</strong></div>` : ''}
              <div style="font-size:12px;color:#475569;margin-top:4px;line-height:1.45;">
                📞 Phone: <strong>${buyerPhone}</strong><br/>
                ✉️ Email: <strong>${buyerEmail}</strong><br/>
                ${customer?.id ? `<span style="font-size:10px;color:#94a3b8;font-family:monospace;">Buyer UUID: ${customer.id}</span><br/>` : ''}
                <span style="font-size:11px;color:#059669;font-weight:700;">
                  ${taxExempt ? '✓ Tax Exempt Status Verified (Export Bond)' : 'VAT Status: Standard Retail VAT Included'}
                </span>
              </div>
            </div>

            <!-- Ship To / Courier Consignment -->
            <div>
              <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
                SHIP TO / DELIVERY DESTINATION
              </div>
              <div style="font-size:14px;font-weight:800;color:#0f172a;">
                ${shipAddr.name || buyerName}
              </div>
              <div style="font-size:12px;color:#334155;margin-top:4px;line-height:1.45;white-space:pre-wrap;">
                📍 ${streetAddress}<br/>
                <strong>${city} ${postalCode ? `· ${postalCode}` : ''}</strong>, ${country}
              </div>
              <div style="font-size:11.5px;color:#475569;margin-top:6px;padding-top:6px;border-top:1px dashed #cbd5e1;">
                Courier Partner: <strong>${courierName}</strong><br/>
                ${trackingNumber ? `Consignment / Tracking ID: <strong style="font-family:monospace;color:#0f172a;">${trackingNumber}</strong>` : `Delivery Status: <strong>Scheduled Dispatch</strong>`}
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="table-responsive">
            <table class="hh-inv-table">
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">#</th>
                  <th>Item Description &amp; Specifications</th>
                  <th style="width:110px;">SKU Code</th>
                  <th style="width:60px;text-align:center;">Qty</th>
                  <th style="width:100px;text-align:right;">Unit Price</th>
                  <th style="width:110px;text-align:right;">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody>
                ${lineItems.map((li, idx) => {
                  const itemTotal = Number(li.lineTotal || (Number(li.price || 0) * Number(li.quantity || 1)));
                  return `
                    <tr>
                      <td style="text-align:center;color:#64748b;font-weight:700;font-size:11px;">${idx + 1}</td>
                      <td>
                        <div style="font-weight:800;color:#0f172a;font-size:13px;">${li.title || 'Atelier Item'}</div>
                        ${li.variantTitle || li.color || li.size ? `
                          <div style="font-size:11px;color:#64748b;margin-top:1px;">
                            ${[li.variantTitle, li.color, li.size].filter(Boolean).join(' · ')}
                          </div>
                        ` : ''}
                      </td>
                      <td style="font-family:monospace;font-size:11px;color:#475569;">
                        ${li.sku || 'HH-ATELIER'}
                      </td>
                      <td style="text-align:center;font-weight:800;font-size:13px;color:#0f172a;">
                        ${li.quantity || 1}
                      </td>
                      <td style="text-align:right;font-family:monospace;font-size:12.5px;color:#334155;">
                        ৳${Number(li.price || 0).toLocaleString()}
                      </td>
                      <td style="text-align:right;font-family:monospace;font-weight:800;font-size:13px;color:#0f172a;">
                        ৳${itemTotal.toLocaleString()}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Special Customization & Financial Totals Breakdown -->
          <div class="inv-totals-grid" style="display:grid;grid-template-columns:1.2fr 1fr;gap:24px;margin-top:18px;">
            <!-- Left: Notes & Customization -->
            <div>
              ${notes ? `
                <div style="background:#fffbeb;border:1px solid #fef3c7;border-left:4px solid #d97706;padding:12px 14px;border-radius:4px;margin-bottom:14px;">
                  <div style="font-size:10.5px;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;">
                    Order Customization &amp; Special Handling Notes:
                  </div>
                  <div style="font-size:12px;color:#78350f;margin-top:4px;line-height:1.45;white-space:pre-wrap;">
                    ${notes}
                  </div>
                </div>
              ` : ''}

              <!-- Payment Instructions & Verification -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 14px;border-radius:6px;">
                <div style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">
                  Payment Instructions &amp; Bank Settlement
                </div>
                <div style="font-size:11.5px;color:#334155;line-height:1.45;">
                  ${isPaid ? `
                    <div style="color:#047857;font-weight:700;">
                      ✓ Payment received in full through authorized gateway / direct transfer.
                    </div>
                  ` : `
                    <div><strong>Cash on Delivery (COD):</strong> Pay exact amount of <strong>৳${balanceDue.toLocaleString()}</strong> to the courier rider upon parcel handover.</div>
                    <div style="margin-top:4px;"><strong>bKash Merchant:</strong> 01711-002233 (Reference: ${order.orderNumber})</div>
                  `}
                </div>
              </div>
            </div>

            <!-- Right: Financial Summary Box -->
            <div style="background:#ffffff;border:1.5px solid #0f172a;border-radius:6px;padding:16px;">
              <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12.5px;color:#475569;">
                <span>Items Subtotal (${itemsCount} items):</span>
                <span style="font-family:monospace;font-weight:700;color:#0f172a;">৳${subtotal.toLocaleString()}</span>
              </div>

              ${discount > 0 ? `
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12.5px;color:#dc2626;">
                  <span>Special Discount:</span>
                  <span style="font-family:monospace;font-weight:700;">-৳${discount.toLocaleString()}</span>
                </div>
              ` : ''}

              <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12.5px;color:#475569;">
                <span>Delivery Charge (${courierName}):</span>
                <span style="font-family:monospace;font-weight:700;color:#0f172a;">+৳${deliveryCharge.toLocaleString()}</span>
              </div>

              <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12.5px;color:#475569;">
                <span>Applicable VAT / Tax:</span>
                <span style="font-family:monospace;color:#64748b;">৳0.00 (Included)</span>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 6px;margin-top:8px;border-top:2px solid #0f172a;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:15px;font-weight:900;color:#0f172a;text-transform:uppercase;">Grand Total:</span>
                <span style="font-size:20px;font-weight:900;font-family:monospace;color:#0f172a;">৳${grandTotal.toLocaleString()}</span>
              </div>

              <!-- Balance Due Banner -->
              <div style="margin-top:8px;padding:10px;background:${isPaid ? '#ecfdf5' : '#fef2f2'};border:1.5px solid ${isPaid ? '#10b981' : '#ef4444'};border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:10px;font-weight:800;color:${isPaid ? '#065f46' : '#991b1b'};text-transform:uppercase;letter-spacing:0.5px;">
                    ${isPaid ? 'PAID IN FULL' : 'CASH TO COLLECT (COD)'}
                  </div>
                  <div style="font-size:18px;font-weight:900;font-family:monospace;color:${isPaid ? '#059669' : '#dc2626'};">
                    ${isPaid ? '৳0.00' : `৳${balanceDue.toLocaleString()}`}
                  </div>
                </div>
                <div style="font-size:10px;font-weight:700;color:${isPaid ? '#047857' : '#b91c1c'};text-align:right;">
                  ${isPaid ? 'Paid &amp; Cleared' : 'Handover on Collection'}
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Sign-off & Authenticity Seal -->
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:36px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <!-- QR Code Authenticator -->
            <div style="display:flex;align-items:center;gap:12px;">
              ${qrCodeDataUrl ? `
                <img src="${qrCodeDataUrl}" alt="Digital Order Verification QR" style="width:72px;height:72px;border:1px solid #e2e8f0;border-radius:4px;padding:2px;background:#fff;"/>
              ` : `
                <div style="width:72px;height:72px;background:#f1f5f9;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;text-align:center;">
                  QR Code
                </div>
              `}
              <div style="font-size:10.5px;color:#64748b;line-height:1.4;">
                <strong style="color:#0f172a;">Digital Commercial Verification</strong><br/>
                Scan QR code to verify order authenticity on the<br/>
                Hands &amp; Head Headless B2B Supply Chain Network.
              </div>
            </div>

            <!-- Signature & Seal -->
            <div style="text-align:right;min-width:220px;">
              <div style="font-size:13px;font-family:'Anton',Impact,sans-serif;color:#0f172a;letter-spacing:1px;margin-bottom:2px;">
                HANDS &amp; HEAD ATELIER
              </div>
              <div style="width:180px;height:1px;background:#0f172a;margin:28px 0 6px auto;"></div>
              <div style="font-size:10.5px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">
                Authorized Official Signatory
              </div>
              <div style="font-size:9.5px;color:#64748b;">
                Commercial Export &amp; Quality Audit Division
              </div>
            </div>
          </div>

          <!-- Final Legal Terms -->
          <div style="margin-top:24px;text-align:center;font-size:9.5px;color:#94a3b8;border-top:1px dashed #e2e8f0;padding-top:10px;">
            Hands &amp; Head Atelier · Registered under Dhaka North City Corporation · All products crafted from genuine full-grain leather.<br/>
            This is a computer-generated commercial document generated from the Firestore B2B Seller OS.
          </div>
        </div>
      `;
    },

    /* ── 3. Interactive Invoice Preview Modal ── */
    async openInvoiceModal(orderId) {
      if (typeof window.toast === 'function') window.toast("Loading Invoice Record…");

      let modal = document.getElementById('hhInvoiceModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'hhInvoiceModal';
        modal.className = 'fast-order-modal-wrap';
        document.body.appendChild(modal);
      }

      modal.classList.add('on');
      modal.innerHTML = `
        <div class="fast-order-overlay" onclick="window.InvoiceEngine.closeModal()"></div>
        <div class="fast-order-dialog invoice-modal-dialog">
          <div class="fo-header" style="background:var(--bg-2);border-bottom:1px solid var(--wire);">
            <div>
              <div style="font-size:11px;font-weight:800;color:var(--coral);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;">
                📄 Commercial PDF Invoice
              </div>
              <h3 style="margin:0;font-size:17px;font-weight:800;color:var(--ink);">
                Preparing Invoice #${orderId}…
              </h3>
            </div>
            <button class="fo-close-btn" onclick="window.InvoiceEngine.closeModal()">✕</button>
          </div>
          <div style="padding:40px;text-align:center;color:var(--ink-2);font-family:var(--mono);font-size:12px;">
            Loading Firestore order &amp; customer records…
          </div>
        </div>
      `;

      try {
        const { order, customer } = await this.getInvoiceData(orderId);
        const invoiceHTML = this.buildInvoiceHTML(order, customer);

        modal.innerHTML = `
          <div class="fast-order-overlay" onclick="window.InvoiceEngine.closeModal()"></div>
          <div class="fast-order-dialog invoice-modal-dialog">
            <!-- Modal Header & Quick Action Buttons -->
            <div class="fo-header" style="background:var(--bg-2);border-bottom:1px solid var(--wire);flex-wrap:wrap;gap:10px;">
              <div>
                <div style="font-size:10.5px;font-weight:800;color:var(--coral);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;">
                  📄 B2B &amp; Retail Invoice
                </div>
                <h3 style="margin:0;font-size:17px;font-weight:800;color:var(--ink);">
                  Invoice #${order.orderNumber || order.id}
                </h3>
              </div>

              <!-- Action Bar -->
              <div class="invoice-actions-bar" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <button class="btn btn-gold btn-sm" onclick="window.InvoiceEngine.downloadInvoicePdf('${order.id}')" style="display:inline-flex;align-items:center;gap:6px;font-weight:800;">
                  📥 Download PDF
                </button>
                <button class="btn btn-dark btn-sm" onclick="window.InvoiceEngine.printInvoice('${order.id}')" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;">
                  🖨️ Print / Save
                </button>
                <button class="btn btn-dark btn-sm" onclick="window.InvoiceEngine.copyInvoiceSummary('${order.id}')" style="display:inline-flex;align-items:center;gap:6px;">
                  📋 Copy Summary
                </button>
                <button class="fo-close-btn" onclick="window.InvoiceEngine.closeModal()" title="Close Preview">✕</button>
              </div>
            </div>

            <!-- Scrollable Invoice Preview Stage -->
            <div class="invoice-preview-container">
              ${invoiceHTML}
            </div>
          </div>
        `;
      } catch (err) {
        modal.innerHTML = `
          <div class="fast-order-overlay" onclick="window.InvoiceEngine.closeModal()"></div>
          <div class="fast-order-dialog invoice-modal-dialog">
            <div class="fo-header">
              <h3 style="margin:0;color:var(--warn);">Error Generating Invoice</h3>
              <button class="fo-close-btn" onclick="window.InvoiceEngine.closeModal()">✕</button>
            </div>
            <div style="padding:24px;color:var(--ink);">
              <p>${err.message}</p>
              <button class="btn btn-dark" onclick="window.InvoiceEngine.closeModal()">Close</button>
            </div>
          </div>
        `;
      }
    },

    closeModal() {
      const modal = document.getElementById('hhInvoiceModal');
      if (modal) modal.classList.remove('on');
    },

    /* ── 4. High-Resolution PDF Download via html2pdf.js ── */
    async downloadInvoicePdf(orderId) {
      if (typeof window.toast === 'function') window.toast("Generating High-Res PDF Invoice…");

      try {
        const { order, customer } = await this.getInvoiceData(orderId);

        // Check if html2pdf is available
        if (typeof window.html2pdf !== 'function') {
          // Fallback: If html2pdf is somehow not loaded, load it dynamically or trigger print
          console.warn("[InvoiceEngine] html2pdf not found on window, attempting fallback print");
          this.printInvoice(orderId);
          return;
        }

        // Create detached container for crisp rendering
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-10000px';
        container.style.left = '-10000px';
        container.style.width = '794px'; // standard A4 width at 96 DPI
        container.innerHTML = this.buildInvoiceHTML(order, customer);
        document.body.appendChild(container);

        const targetElement = container.querySelector('#hh_invoice_printable');

        const opt = {
          margin: [10, 10, 10, 10], // top, left, bottom, right in mm
          filename: `Invoice-${order.orderNumber || order.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
            backgroundColor: '#ffffff'
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await window.html2pdf().set(opt).from(targetElement).save();

        document.body.removeChild(container);
        if (typeof window.toast === 'function') {
          window.toast(`Invoice #${order.orderNumber || order.id} downloaded successfully ✓`);
        }
      } catch (err) {
        console.error("[InvoiceEngine] PDF Generation Error:", err);
        if (typeof window.toast === 'function') {
          window.toast(`PDF download error: ${err.message}. Triggering print view instead…`);
        }
        this.printInvoice(orderId);
      }
    },

    /* ── 5. Clean Print / Save as PDF Function ── */
    async printInvoice(orderId) {
      try {
        const { order, customer } = await this.getInvoiceData(orderId);
        const invoiceHTML = this.buildInvoiceHTML(order, customer);

        // Create an isolated hidden print iframe for pristine printing without UI leaks
        let printIframe = document.getElementById('hhInvoicePrintIframe');
        if (!printIframe) {
          printIframe = document.createElement('iframe');
          printIframe.id = 'hhInvoicePrintIframe';
          printIframe.style.position = 'fixed';
          printIframe.style.right = '0';
          printIframe.style.bottom = '0';
          printIframe.style.width = '0';
          printIframe.style.height = '0';
          printIframe.style.border = '0';
          document.body.appendChild(printIframe);
        }

        const iframeDoc = printIframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8"/>
              <title>Invoice - ${order.orderNumber || order.id}</title>
              <style>
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }
                * {
                  box-sizing: border-box;
                }
                body {
                  margin: 0;
                  padding: 0;
                  background: #fff;
                  color: #0f172a;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .hh-invoice-sheet {
                  width: 100%;
                  max-width: 100%;
                  padding: 10px;
                  background: #fff;
                }
                .hh-inv-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 16px 0;
                  font-size: 13px;
                }
                .hh-inv-table th {
                  background: #f8fafc;
                  color: #334155;
                  font-weight: 700;
                  text-align: left;
                  padding: 8px 10px;
                  border-top: 1.5px solid #0f172a;
                  border-bottom: 1.5px solid #0f172a;
                  font-size: 11px;
                  text-transform: uppercase;
                }
                .hh-inv-table td {
                  padding: 10px;
                  border-bottom: 1px solid #e2e8f0;
                  color: #1e293b;
                }
                .hh-inv-badge {
                  display: inline-block;
                  padding: 3px 8px;
                  border-radius: 4px;
                  font-size: 10px;
                  font-weight: 800;
                  text-transform: uppercase;
                }
                .hh-inv-badge.paid { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
                .hh-inv-badge.cod { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
                .hh-inv-badge.shipped { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
              </style>
            </head>
            <body>
              ${invoiceHTML}
            </body>
          </html>
        `);
        iframeDoc.close();

        // Allow styles to apply before triggering print
        setTimeout(() => {
          try {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
          } catch (e) {
            window.print();
          }
        }, 300);

      } catch (err) {
        if (typeof window.toast === 'function') window.toast("Error printing: " + err.message);
      }
    },

    /* ── 6. Copy Invoice Plaintext Summary ── */
    async copyInvoiceSummary(orderId) {
      try {
        const { order, customer } = await this.getInvoiceData(orderId);
        const buyerName = customer?.name || order.customerSnapshot?.name || order.customerName || 'Customer';
        const phone = customer?.phone || order.customerSnapshot?.phone || order.phone || '';
        const address = order.shippingAddress?.line1 || order.customerSnapshot?.address || customer?.addressLine1 || order.address || '';
        const total = Number(order.total || 0);
        const isPaid = (order.paymentStatus === 'paid');
        const due = isPaid ? 0 : (order.dueAmount !== undefined ? Number(order.dueAmount) : total);

        const summary = [
          `📄 HANDS & HEAD COMMERCIAL INVOICE`,
          `Invoice #: INV-${order.orderNumber || order.id}`,
          `Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB')}`,
          `Buyer: ${buyerName}`,
          phone ? `Phone: ${phone}` : null,
          address ? `Delivery: ${address}` : null,
          `Items: ${(order.lineItems || []).map(li => `${li.title} (x${li.quantity || 1}) - ৳${(li.lineTotal || (li.price * (li.quantity || 1))).toLocaleString()}`).join(', ')}`,
          `Grand Total: ৳${total.toLocaleString()}`,
          `Status: ${isPaid ? 'PAID IN FULL ✓' : `CASH ON DELIVERY — COLLECT ৳${due.toLocaleString()}`}`,
          order.trackingNumber ? `Courier Consignment: ${order.trackingNumber} (${order.courier || 'Steadfast'})` : null,
          `Atelier Hotline: +880 1711-002233 · concierge@handsandhead.com`
        ].filter(Boolean).join('\n');

        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(summary);
          if (typeof window.toast === 'function') window.toast("Invoice summary copied to clipboard ✓");
        } else {
          prompt("Copy invoice summary:", summary);
        }
      } catch (err) {
        if (typeof window.toast === 'function') window.toast("Error copying: " + err.message);
      }
    }
  };

  // Expose to window
  window.InvoiceEngine = InvoiceEngine;
  window.openOrderInvoice = (orderId) => InvoiceEngine.openInvoiceModal(orderId);
  window.downloadOrderInvoicePdf = (orderId) => InvoiceEngine.downloadInvoicePdf(orderId);
  window.printOrderInvoice = (orderId) => InvoiceEngine.printInvoice(orderId);

})();
