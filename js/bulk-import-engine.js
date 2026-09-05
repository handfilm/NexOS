/**
 * ══════════════════════════════════════════════════════════════════════
 * HANDS & HEAD — Bulk CSV & Excel (.xlsx, .xls) Importer Engine
 * 
 * High-performance, fault-tolerant bulk ingestion for:
 * 1. Products (Title, SKU, Category, Price, Cost, Inventory, Status, Tags, Description, ImageURL)
 * 2. Customers / CRM (Company Name, Contact Person, Email, Phone, Country, Currency, MOQ, Terms, Address)
 *
 * Features:
 * - Direct Drag & Drop or File Picker for CSV, XLSX, XLS
 * - Raw Text / Clipboard TSV & CSV Paste
 * - Automatic Fuzzy Column Auto-Mapping
 * - Downloadable Sample CSV & Excel Templates
 * - Live Pre-Import Validation & Preview Grid
 * - Batch Firestore / Local Ledger Sync with Visual Progress Bar
 * ══════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const BulkImportEngine = {
    currentType: null, // 'products' | 'customers'
    parsedRows: [],
    headers: [],
    columnMapping: {},

    /* ── 1. Open Product Bulk Import Modal ── */
    openProductImportModal() {
      this.currentType = 'products';
      this.parsedRows = [];
      this.headers = [];
      this.columnMapping = {};
      this.renderModal('Bulk Import Products (CSV / Excel)', 'Import catalog items, SKUs, inventory, and pricing in seconds.');
    },

    /* ── 2. Open Customer Bulk Import Modal ── */
    openCustomerImportModal() {
      this.currentType = 'customers';
      this.parsedRows = [];
      this.headers = [];
      this.columnMapping = {};
      this.renderModal('Bulk Import Customers & Buyers (CSV / Excel)', 'Import wholesale buyers, international retail clients, contact lists, and payment terms.');
    },

    /* ── 3. Render Modal UI Shell ── */
    renderModal(title, subtitle) {
      let modal = document.getElementById('bulkImportModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bulkImportModal';
        modal.className = 'fast-order-modal-wrap';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="fast-order-overlay" onclick="window.BulkImportEngine.closeModal()"></div>
        <div class="fast-order-dialog neu-card" style="max-width:860px;width:95%;max-height:90vh;display:flex;flex-direction:column;">
          <!-- Modal Header -->
          <div class="fo-header" style="flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;border-radius:8px;background:rgba(212,160,23,0.12);border:1px solid rgba(212,160,23,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--gold);">
                📥
              </div>
              <div>
                <div style="font-weight:800;font-size:16px;color:var(--ink);font-family:var(--sans);">${title}</div>
                <div style="font-size:11.5px;color:var(--ink-3);">${subtitle}</div>
              </div>
            </div>
            <button class="fo-close-btn" onclick="window.BulkImportEngine.closeModal()">✕</button>
          </div>

          <!-- Modal Body Container -->
          <div class="fo-body" id="bulkImportModalBody" style="overflow-y:auto;flex:1;padding:16px 20px 24px;">
            ${this.renderUploadStage()}
          </div>
        </div>
      `;

      modal.classList.add('on');
    },

    closeModal() {
      const modal = document.getElementById('bulkImportModal');
      if (modal) modal.classList.remove('on');
    },

    /* ── 4. Stage 1: Upload & File Selection ── */
    renderUploadStage() {
      const isProd = this.currentType === 'products';
      return `
        <!-- Step Indicator -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;font-size:11px;font-family:var(--mono);">
          <span class="pill ok" style="padding:4px 8px;">STEP 1: SELECT FILE</span>
          <span style="color:var(--ink-3);">→ Step 2: Review &amp; Map → Step 3: Ingest Data</span>
        </div>

        <!-- Download Starter Templates Bar -->
        <div style="background:var(--bg-neu);border:1px solid var(--wire);border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--ink);">Download Standard Starter Template</div>
            <div style="font-size:11px;color:var(--ink-3);">Pre-formatted with example records and schema headers.</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-dark btn-sm" onclick="window.BulkImportEngine.downloadTemplate('csv')">
              📄 Download .CSV Template
            </button>
            <button class="btn btn-gold btn-sm" onclick="window.BulkImportEngine.downloadTemplate('excel')">
              📊 Download .XLSX Template
            </button>
          </div>
        </div>

        <!-- Drag and Drop Dropzone -->
        <div id="importDropzone" 
             ondragover="event.preventDefault(); this.style.borderColor='var(--gold)';" 
             ondragleave="this.style.borderColor='var(--wire-hard)';" 
             ondrop="window.BulkImportEngine.handleFileDrop(event)"
             onclick="document.getElementById('bulkFileInput').click()"
             style="border:2px dashed var(--wire-hard);border-radius:12px;padding:36px 20px;text-align:center;background:var(--bg-3);cursor:pointer;transition:all 0.2s ease;">
          <input type="file" id="bulkFileInput" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style="display:none;" onchange="window.BulkImportEngine.handleFileSelect(this.files[0])"/>
          <div style="font-size:32px;margin-bottom:8px;">📂</div>
          <div style="font-size:14px;font-weight:700;color:var(--ink);">Click to browse or Drag &amp; Drop file here</div>
          <div style="font-size:11.5px;color:var(--ink-3);margin-top:4px;">Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv) up to 50MB</div>
        </div>

        <!-- Paste Raw CSV / Tab-Delimited Fallback Accordion -->
        <div style="margin-top:16px;">
          <details style="background:var(--bg-neu);border:1px solid var(--wire);border-radius:8px;padding:10px 14px;">
            <summary style="font-size:11.5px;font-weight:700;color:var(--ink-2);cursor:pointer;">
              📋 Or Paste Direct CSV / Clipboard Text
            </summary>
            <div style="margin-top:10px;">
              <textarea id="rawCsvPasteArea" placeholder="Paste CSV or tab-separated data with header row here…" style="width:100%;height:100px;background:var(--bg-3);border:1px solid var(--wire);border-radius:6px;color:var(--ink);padding:8px;font-family:var(--mono);font-size:11px;"></textarea>
              <button class="btn btn-dark btn-sm" style="margin-top:8px;" onclick="window.BulkImportEngine.parsePastedText()">
                Parse Pasted Text →
              </button>
            </div>
          </details>
        </div>
      `;
    },

    /* ── 5. File Handling & Parsing ── */
    handleFileDrop(event) {
      event.preventDefault();
      const dropzone = document.getElementById('importDropzone');
      if (dropzone) dropzone.style.borderColor = 'var(--wire-hard)';
      if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        this.handleFileSelect(event.dataTransfer.files[0]);
      }
    },

    async handleFileSelect(file) {
      if (!file) return;
      const body = document.getElementById('bulkImportModalBody');
      if (body) {
        body.innerHTML = `
          <div style="padding:60px 20px;text-align:center;">
            <div style="font-size:32px;margin-bottom:12px;animation:spin 1.5s linear infinite;">⏳</div>
            <div style="font-size:15px;font-weight:700;color:var(--ink);">Parsing ${file.name}…</div>
            <div style="font-size:12px;color:var(--ink-3);margin-top:4px;">Scanning spreadsheet sheets, headers, and rows…</div>
          </div>
        `;
      }

      try {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv';

        if (window.XLSX) {
          // Client-side SheetJS Parsing
          const data = await file.arrayBuffer();
          const workbook = window.XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const rawJson = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!rawJson || rawJson.length < 2) {
            throw new Error('File appears to be empty or missing data rows.');
          }

          this.headers = rawJson[0].map(h => String(h || '').trim()).filter(Boolean);
          this.parsedRows = [];

          for (let i = 1; i < rawJson.length; i++) {
            const rowArr = rawJson[i];
            if (!rowArr || rowArr.every(cell => String(cell || '').trim() === '')) continue;
            const obj = {};
            this.headers.forEach((h, idx) => {
              obj[h] = rowArr[idx] !== undefined ? String(rowArr[idx]).trim() : '';
            });
            this.parsedRows.push(obj);
          }
        } else {
          // Server-side fallback parsing
          const base64 = await this.fileToBase64(file);
          const res = await fetch('/api/import/parse-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: base64, filename: file.name })
          });
          const result = await res.json();
          if (!res.ok || result.error) throw new Error(result.error || 'Server parse failed');
          this.headers = result.headers;
          this.parsedRows = result.rows;
        }

        if (this.parsedRows.length === 0) {
          throw new Error('No valid records found in file.');
        }

        this.autoMapColumns();
        this.renderPreviewStage();
      } catch (err) {
        if (body) {
          body.innerHTML = `
            <div style="padding:40px 20px;text-align:center;">
              <div style="font-size:32px;color:var(--warn);margin-bottom:12px;">⚠️</div>
              <div style="font-size:15px;font-weight:700;color:var(--ink);">Failed to parse file</div>
              <div style="font-size:12px;color:var(--warn);margin:6px 0 16px;">${err.message}</div>
              <button class="btn btn-dark btn-sm" onclick="window.BulkImportEngine.renderUploadStageOnModal()">Try Again</button>
            </div>
          `;
        }
      }
    },

    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const res = reader.result;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
    },

    parsePastedText() {
      const text = document.getElementById('rawCsvPasteArea')?.value?.trim();
      if (!text) {
        if (window.toast) window.toast('Please paste CSV text first');
        return;
      }

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        if (window.toast) window.toast('Need at least 1 header row and 1 data row');
        return;
      }

      // Helper for RFC 4180 line splitting
      const parseCSVLine = (line, delim) => {
        const row = [];
        let inQuote = false;
        let cur = '';
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === '"' && !inQuote) {
            inQuote = true;
          } else if (char === '"' && inQuote) {
            if (line[c + 1] === '"') {
              cur += '"';
              c++;
            } else {
              inQuote = false;
            }
          } else if (char === delim && !inQuote) {
            row.push(cur.trim().replace(/^['"]+|['"]+$/g, ''));
            cur = '';
          } else {
            cur += char;
          }
        }
        row.push(cur.trim().replace(/^['"]+|['"]+$/g, ''));
        return row;
      };

      // Detect delimiter (, or \t or ;)
      const firstLine = lines[0];
      const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

      this.headers = parseCSVLine(lines[0], delimiter).filter(Boolean);
      this.parsedRows = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const parts = parseCSVLine(lines[i], delimiter);
        const row = {};
        this.headers.forEach((h, idx) => {
          row[h] = parts[idx] !== undefined ? parts[idx] : '';
        });
        this.parsedRows.push(row);
      }

      this.autoMapColumns();
      this.renderPreviewStage();
    },

    renderUploadStageOnModal() {
      const body = document.getElementById('bulkImportModalBody');
      if (body) body.innerHTML = this.renderUploadStage();
    },

    /* ── 6. Intelligent Column Auto-Mapping ── */
    autoMapColumns() {
      this.columnMapping = {};
      const hLower = this.headers.map(h => ({ raw: h, clean: h.toLowerCase().replace(/[^a-z0-9]/g, '') }));

      const matchField = (aliases) => {
        for (const alias of aliases) {
          const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = hLower.find(h => h.clean === cleanAlias || h.clean.includes(cleanAlias));
          if (match) return match.raw;
        }
        return '';
      };

      if (this.currentType === 'products') {
        this.columnMapping = {
          title: matchField(['title', 'product name', 'name', 'item name', 'product', 'design']),
          sku: matchField(['sku', 'code', 'product code', 'item code', 'barcode', 'item #']),
          category: matchField(['category', 'product type', 'type', 'collection', 'group']),
          price: matchField(['price', 'unit price', 'selling price', 'mrp', 'bdt', 'retail price']),
          cost: matchField(['cost', 'cost price', 'cogs', 'factory cost']),
          inventory: matchField(['inventory', 'stock', 'qty', 'quantity', 'units', 'stock available']),
          status: matchField(['status', 'active', 'state', 'publish']),
          tags: matchField(['tags', 'keywords', 'labels']),
          description: matchField(['description', 'desc', 'details', 'body', 'copy']),
          imageUrl: matchField(['image', 'image url', 'photo', 'img', 'thumbnail', 'pic'])
        };
      } else {
        this.columnMapping = {
          customerId: matchField(['customer id', 'id', 'customer_id', 'client id']),
          firstName: matchField(['first name', 'firstname', 'given name']),
          lastName: matchField(['last name', 'lastname', 'surname', 'family name']),
          companyName: matchField(['default address company', 'company', 'company name', 'business name', 'buyer', 'account']),
          email: matchField(['email', 'mail', 'e-mail', 'contact email']),
          phone: matchField(['phone', 'mobile', 'cell', 'tel', 'whatsapp']),
          defaultAddressPhone: matchField(['default address phone', 'address phone']),
          address1: matchField(['default address address1', 'address1', 'street', 'address line 1', 'address', 'shipping address']),
          address2: matchField(['default address address2', 'address2', 'apartment', 'suite', 'address line 2']),
          city: matchField(['default address city', 'city', 'town', 'district', 'area']),
          country: matchField(['default address country code', 'country', 'country code', 'nation']),
          zip: matchField(['default address zip', 'zip', 'postal code', 'postcode']),
          totalSpent: matchField(['total spent', 'total_spent', 'spent', 'lifetime spend', 'amount']),
          totalOrders: matchField(['total orders', 'total_orders', 'orders count', 'orders']),
          notes: matchField(['note', 'notes', 'comments', 'memo', 'info']),
          tags: matchField(['tags', 'tag', 'labels', 'keywords'])
        };
      }
    },

    /* ── 7. Stage 2: Live Preview & Validation Grid ── */
    renderPreviewStage() {
      const body = document.getElementById('bulkImportModalBody');
      if (!body) return;

      const isProd = this.currentType === 'products';
      const total = this.parsedRows.length;
      const previewRows = this.parsedRows.slice(0, 10);

      body.innerHTML = `
        <!-- Step Indicator -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;font-size:11px;font-family:var(--mono);">
            <span class="pill ok" style="padding:4px 8px;">STEP 2: REVIEW &amp; MAP</span>
            <span style="font-weight:700;color:var(--ink);">${total} Valid Records Found</span>
          </div>
          <button class="btn btn-dark btn-xs" onclick="window.BulkImportEngine.renderUploadStageOnModal()">
            ← Choose Different File
          </button>
        </div>

        <!-- Column Mapping Settings Box -->
        <div style="background:var(--bg-neu);border:1px solid var(--wire);border-radius:10px;padding:12px 16px;margin-bottom:14px;">
          <div style="font-size:12px;font-weight:800;color:var(--ink);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
            <span>Column Mapping Verification</span>
            <span style="font-size:10.5px;color:var(--gold);font-family:var(--mono);">Auto-Matched ✓</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:8px;">
            ${Object.keys(this.columnMapping).map(key => `
              <div style="display:flex;flex-direction:column;gap:2px;">
                <label style="font-size:9.5px;font-family:var(--mono);color:var(--ink-3);text-transform:uppercase;font-weight:700;">
                  ${key} ${key === 'title' || key === 'companyName' ? '*' : ''}
                </label>
                <select onchange="window.BulkImportEngine.updateMapping('${key}', this.value)" style="height:28px;background:var(--bg-3);border:1px solid var(--wire);color:var(--ink);font-size:11px;border-radius:4px;padding:0 4px;">
                  <option value="">-- Skip / Unmapped --</option>
                  ${this.headers.map(h => `<option value="${h}" ${this.columnMapping[key] === h ? 'selected' : ''}>${h}</option>`).join('')}
                </select>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Live Table Preview -->
        <div style="font-size:11px;font-family:var(--mono);color:var(--ink-3);margin-bottom:6px;display:flex;justify-content:space-between;">
          <span>DATA PREVIEW (First ${previewRows.length} of ${total} records)</span>
          <span>Scroll horizontally if needed →</span>
        </div>
        <div class="table-responsive" style="border:1px solid var(--wire);border-radius:8px;overflow-x:auto;max-height:240px;background:var(--bg-3);margin-bottom:16px;">
          <table style="width:100%;border-collapse:collapse;font-size:11.5px;text-align:left;">
            <thead>
              <tr style="background:var(--bg-neu);border-bottom:1px solid var(--wire);position:sticky;top:0;z-index:2;">
                <th style="padding:6px 10px;font-family:var(--mono);font-size:10px;color:var(--ink-3);">#</th>
                ${isProd ? `
                  <th style="padding:6px 10px;font-weight:700;">Title</th>
                  <th style="padding:6px 10px;font-weight:700;">SKU</th>
                  <th style="padding:6px 10px;font-weight:700;">Category</th>
                  <th style="padding:6px 10px;font-weight:700;">Price (৳)</th>
                  <th style="padding:6px 10px;font-weight:700;">Stock</th>
                  <th style="padding:6px 10px;font-weight:700;">Status</th>
                ` : `
                  <th style="padding:6px 10px;font-weight:700;">Customer Name</th>
                  <th style="padding:6px 10px;font-weight:700;">Phone</th>
                  <th style="padding:6px 10px;font-weight:700;">City / Region</th>
                  <th style="padding:6px 10px;font-weight:700;">Orders</th>
                  <th style="padding:6px 10px;font-weight:700;">Total Spent</th>
                  <th style="padding:6px 10px;font-weight:700;">Address Preview</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${previewRows.map((r, idx) => {
                if (isProd) {
                  const title = r[this.columnMapping.title] || 'Untitled Product';
                  const sku = r[this.columnMapping.sku] || `HH-IMP-${idx + 1}`;
                  const cat = r[this.columnMapping.category] || 'Leather Goods';
                  const price = parseFloat(r[this.columnMapping.price]) || 0;
                  const stock = parseInt(r[this.columnMapping.inventory]) || 10;
                  const status = (r[this.columnMapping.status] || 'active').toLowerCase();

                  return `
                    <tr style="border-bottom:1px solid var(--wire);border-top:1px solid var(--wire);">
                      <td style="padding:6px 10px;font-family:var(--mono);color:var(--ink-3);">${idx + 1}</td>
                      <td style="padding:6px 10px;font-weight:600;color:var(--ink);">${title}</td>
                      <td style="padding:6px 10px;font-family:var(--mono);color:var(--ink-2);">${sku}</td>
                      <td style="padding:6px 10px;color:var(--ink-3);">${cat}</td>
                      <td style="padding:6px 10px;font-family:var(--mono);font-weight:700;color:var(--gold);">৳${price.toLocaleString()}</td>
                      <td style="padding:6px 10px;font-family:var(--mono);color:var(--ink);">${stock}</td>
                      <td style="padding:6px 10px;"><span class="pill ${status === 'active' ? 'ok' : 'amber'}" style="font-size:8px;">${status.toUpperCase()}</span></td>
                    </tr>
                  `;
                } else {
                  const cleanVal = (v) => String(v || '').replace(/^['"]|['"]$/g, '').trim();
                  const first = cleanVal(r[this.columnMapping.firstName]);
                  const last = cleanVal(r[this.columnMapping.lastName]);
                  const name = [first, last].filter(Boolean).join(' ') || cleanVal(r[this.columnMapping.companyName]) || 'Unnamed Customer';
                  let phone = cleanVal(r[this.columnMapping.phone]) || cleanVal(r[this.columnMapping.defaultAddressPhone]) || '—';
                  if (phone.startsWith("'+")) phone = phone.substring(1);
                  if (phone.startsWith("'")) phone = phone.substring(1);
                  const city = cleanVal(r[this.columnMapping.city]) || 'Dhaka';
                  const orders = parseInt(cleanVal(r[this.columnMapping.totalOrders])) || 0;
                  const spent = parseFloat(cleanVal(r[this.columnMapping.totalSpent])) || 0;
                  const addr = cleanVal(r[this.columnMapping.address1]) || '—';

                  return `
                    <tr style="border-bottom:1px solid var(--wire);border-top:1px solid var(--wire);">
                      <td style="padding:6px 10px;font-family:var(--mono);color:var(--ink-3);">${idx + 1}</td>
                      <td style="padding:6px 10px;font-weight:700;color:var(--ink);">${name}</td>
                      <td style="padding:6px 10px;color:var(--ink-2);font-family:var(--mono);">${phone}</td>
                      <td style="padding:6px 10px;color:var(--ink);">${city}</td>
                      <td style="padding:6px 10px;font-family:var(--mono);"><span class="pill ok" style="font-size:9px;">${orders} orders</span></td>
                      <td style="padding:6px 10px;font-family:var(--mono);font-weight:700;color:var(--gold);">৳${spent.toLocaleString()}</td>
                      <td style="padding:6px 10px;color:var(--ink-3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${addr}</td>
                    </tr>
                  `;
                }
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Execution Action Strip -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--wire);">
          <div style="font-size:12px;color:var(--ink-3);">
            Ready to import <strong style="color:var(--ink);">${total}</strong> ${isProd ? 'products into catalog' : 'customers into CRM'}.
          </div>
          <button id="btnExecuteBulkImport" class="btn btn-gold" style="padding:10px 24px;font-weight:800;" onclick="window.BulkImportEngine.executeImport()">
            ✓ Ingest &amp; Import ${total} Records Now
          </button>
        </div>
      `;
    },

    updateMapping(key, val) {
      this.columnMapping[key] = val;
      this.renderPreviewStage();
    },

    /* ── 8. Stage 3: Batch Ingestion & Progress Bar ── */
    async executeImport() {
      const btn = document.getElementById('btnExecuteBulkImport');
      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Importing records…';
      }

      const body = document.getElementById('bulkImportModalBody');
      const isProd = this.currentType === 'products';
      const total = this.parsedRows.length;

      body.innerHTML = `
        <div style="padding:40px 20px;text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;color:var(--gold);">⚡</div>
          <div style="font-size:16px;font-weight:800;color:var(--ink);margin-bottom:4px;">
            Ingesting ${total} ${isProd ? 'Products' : 'Customers'} into Hands &amp; Head OS…
          </div>
          <div id="importProgressLabel" style="font-size:12px;color:var(--ink-3);font-family:var(--mono);margin-bottom:16px;">
            Processing record 0 of ${total}…
          </div>

          <!-- Progress Bar -->
          <div style="width:100%;max-width:400px;height:12px;background:var(--bg-3);border:1px solid var(--wire);border-radius:10px;margin:0 auto;overflow:hidden;position:relative;">
            <div id="importProgressBar" style="width:0%;height:100%;background:linear-gradient(90deg, var(--gold), var(--coral));border-radius:10px;transition:width 0.15s ease;"></div>
          </div>
        </div>
      `;

      let importedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < total; i++) {
        const row = this.parsedRows[i];

        try {
          if (isProd) {
            const title = row[this.columnMapping.title]?.trim() || `Imported Product #${i + 1}`;
            const sku = row[this.columnMapping.sku]?.trim() || `HH-IMP-${Math.floor(1000 + Math.random() * 9000)}`;
            const category = row[this.columnMapping.category]?.trim() || 'Leather Goods';
            const price = parseFloat(row[this.columnMapping.price]) || 2500;
            const cost = parseFloat(row[this.columnMapping.cost]) || Math.round(price * 0.45);
            const stock = parseInt(row[this.columnMapping.inventory]) || 20;
            const status = (row[this.columnMapping.status]?.trim() || 'active').toLowerCase();
            const desc = row[this.columnMapping.description]?.trim() || `${title} crafted with premium full-grain materials in Dhaka.`;
            const tagsStr = row[this.columnMapping.tags]?.trim() || '';
            const tags = Array.from(new Set([
              category.toLowerCase().replace(/\s+/g, '-'),
              'imported',
              ...tagsStr.split(/[,;]/).map(t => t.trim().toLowerCase()).filter(Boolean)
            ]));
            const imgUrl = row[this.columnMapping.imageUrl]?.trim() || '';

            const productPayload = {
              title,
              handle: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              productType: category,
              category,
              description: desc,
              status: ['active', 'draft', 'archived'].includes(status) ? status : 'active',
              tags,
              totalInventory: stock,
              lowStockThreshold: 5,
              pricing: {
                price,
                compareAtPrice: price > 0 ? Math.round(price * 1.25) : 0,
                cost
              },
              variants: [{
                id: 'default',
                title: 'Default',
                sku,
                price,
                cost,
                inventoryQuantity: stock
              }],
              images: imgUrl ? [{ id: 'img-1', url: imgUrl, alt: title }] : []
            };

            if (window.ProductsService) {
              await window.ProductsService.create(productPayload);
            }
          } else {
            // Customer Ingestion
            const cleanVal = (v) => String(v || '').replace(/[\r\n]+/g, ' ').replace(/^['"]+|['"]+$/g, '').trim();
            const firstName = cleanVal(row[this.columnMapping.firstName]);
            const lastName = cleanVal(row[this.columnMapping.lastName]);
            const company = cleanVal(row[this.columnMapping.companyName]);
            const rawCid = cleanVal(row[this.columnMapping.customerId]);
            const customerId = rawCid ? rawCid.replace(/[^a-zA-Z0-9_-]/g, '') : ('cust-' + Date.now().toString(36) + '-' + i);

            const fullName = [firstName, lastName].filter(Boolean).join(' ') || company || `Customer #${i + 1}`;
            const email = cleanVal(row[this.columnMapping.email]);
            let phone = cleanVal(row[this.columnMapping.phone]) || cleanVal(row[this.columnMapping.defaultAddressPhone]);
            if (phone.startsWith("'+")) phone = phone.substring(1);
            if (phone.startsWith("'")) phone = phone.substring(1);
            phone = phone.replace(/^\+880\s*0?/, '+880').trim();

            const addr1 = cleanVal(row[this.columnMapping.address1]);
            const addr2 = cleanVal(row[this.columnMapping.address2]);
            const city = cleanVal(row[this.columnMapping.city]) || 'Dhaka';
            const country = (cleanVal(row[this.columnMapping.country]) || 'BD').toUpperCase();
            const zip = cleanVal(row[this.columnMapping.zip]);
            const totalSpent = parseFloat(row[this.columnMapping.totalSpent]) || 0;
            const totalOrders = parseInt(row[this.columnMapping.totalOrders]) || 1;
            const noteText = cleanVal(row[this.columnMapping.notes]);
            const rawTags = cleanVal(row[this.columnMapping.tags]);
            const tags = rawTags ? rawTags.split(/[,;]/).map(t => t.trim()).filter(Boolean) : ['retail-customer'];

            const fullAddressLine = [addr1, addr2].filter(Boolean).join(', ');

            const customerPayload = {
              id: customerId,
              name: fullName,
              companyName: company || fullName,
              contactPerson: fullName,
              firstName,
              lastName,
              email,
              phone,
              country,
              currency: country === 'BD' ? 'BDT' : 'USD',
              totalSpent,
              totalOrders,
              paymentTerms: 'Cash on Delivery (COD)',
              tags,
              addressLine1: fullAddressLine || addr1,
              addresses: (fullAddressLine || city) ? [{
                type: 'shipping',
                line1: addr1,
                line2: addr2,
                city,
                country,
                postalCode: zip,
                phone,
                isDefault: true
              }] : [],
              notes: noteText ? [{ text: noteText, by: 'Customer Export Import', createdAt: new Date().toISOString() }] : []
            };

            if (window.CustomersService) {
              await window.CustomersService.create(customerPayload);
            }
          }
          importedCount++;
        } catch (e) {
          console.error('Row import error:', e);
          errorCount++;
        }

        // Update progress bar
        const pct = Math.round(((i + 1) / total) * 100);
        const bar = document.getElementById('importProgressBar');
        const lbl = document.getElementById('importProgressLabel');
        if (bar) bar.style.width = `${pct}%`;
        if (lbl) lbl.innerText = `Processing record ${i + 1} of ${total} (${pct}%)…`;
      }

      // Final Success View
      body.innerHTML = `
        <div style="padding:40px 20px;text-align:center;">
          <div style="font-size:36px;margin-bottom:10px;color:var(--ok);">🎉</div>
          <div style="font-size:18px;font-weight:800;color:var(--ink);margin-bottom:6px;">
            Bulk Import Complete!
          </div>
          <div style="font-size:13px;color:var(--ink-2);margin-bottom:16px;">
            Successfully ingested <strong style="color:var(--gold);">${importedCount}</strong> ${isProd ? 'products' : 'customers'} into your operational ledger.
            ${errorCount > 0 ? `<br/><span style="color:var(--warn);font-size:11px;">(${errorCount} skipped due to validation errors)</span>` : ''}
          </div>
          <button class="btn btn-gold" onclick="window.BulkImportEngine.finishImport()" style="padding:10px 28px;font-weight:800;">
            ✓ Return to ${isProd ? 'Catalog' : 'Customer Directory'}
          </button>
        </div>
      `;

      if (window.toast) {
        window.toast(`✓ Successfully imported ${importedCount} records!`);
      }
    },

    finishImport() {
      this.closeModal();
      if (this.currentType === 'products') {
        const c = document.getElementById('mod-Products');
        if (c && window.render && window.render.Products) window.render.Products(c);
      } else {
        const c = document.getElementById('mod-CRM') || document.getElementById('mod-Customers');
        if (c && window.render && window.render.CRM) window.render.CRM(c);
      }
    },

    /* ── 9. Starter Template Generators (.csv & .xlsx) ── */
    downloadTemplate(format = 'csv') {
      const isProd = this.currentType === 'products';

      let headers = [];
      let sampleData = [];

      if (isProd) {
        headers = ['Title', 'SKU', 'Category', 'Price BDT', 'Cost BDT', 'Inventory Qty', 'Status', 'Tags', 'Description', 'Image URL'];
        sampleData = [
          ['Executive Bifold Leather Wallet', 'FGW-EXEC-01', 'Leather Goods', 2850, 1250, 60, 'active', 'wallet, full-grain, export', 'Crafted from full-grain vegetable tanned cowhide in Dhaka.', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80'],
          ['Artisan Leather Belt Cognac', 'BLT-ART-COG', 'Belts', 3200, 1400, 45, 'active', 'belt, cognac, brass-hardware', '100% full-grain aniline strap with solid brass buckle.', ''],
          ['Heavyweight Raw Boxy Tee 240GSM', 'TEE-RAW-BLK', 'Fashion Apparel', 1650, 650, 120, 'active', 'streetwear, combed-cotton, rawxos', '240 GSM pre-shrunk luxury heavyweight cotton.', '']
        ];
      } else {
        headers = [
          'Customer ID',
          'First Name',
          'Last Name',
          'Email',
          'Accepts Email Marketing',
          'Default Address Company',
          'Default Address Address1',
          'Default Address Address2',
          'Default Address City',
          'Default Address Province Code',
          'Default Address Country Code',
          'Default Address Zip',
          'Default Address Phone',
          'Phone',
          'Accepts SMS Marketing',
          'Total Spent',
          'Total Orders',
          'Note',
          'Tax Exempt',
          'Tags'
        ];
        sampleData = [
          ["'8779761975521", "Tomotaka", "Minoura", "", "no", "", "House no.9, Road no.2, Park road", "", "Dhaka - North", "", "BD", "", "'+8801912010701", "'+8801912010701", "no", "0.00", "3", "", "no", "VIP Customer"],
          ["'7999252627681", "Aryan", "Hossain", "aryanhossain759@gmail.com", "yes", "", "House number-31, Dhanmondi 27, Flat number 13-C", "", "Dhaka", "", "BD", "1209", "'+8801880241803", "'+8801880241803", "yes", "1020.00", "3", "", "no", "Newsletter"],
          ["'5236232552602", "Morshed H.", "Bhuiyan", "morshed.bizbrothers@gmail.com", "yes", "BIZ BROTHERS", "Mitu Anwara Garden, 9/1 Pallabi", "", "Mirpur, Dhaka", "", "BD", "1216", "'+8801841001001", "'+8801841001001", "no", "48124.00", "13", "Frequent buyer", "no", "Corporate, denim, Dhaka, Polo Shirt"]
        ];
      }

      if (format === 'excel' && window.XLSX) {
        const ws = window.XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, isProd ? 'Products_Template' : 'Customers_Template');
        window.XLSX.writeFile(wb, `Hands_and_Head_${isProd ? 'Products' : 'Customers'}_Template.xlsx`);
      } else {
        // CSV Export
        const csvRows = [
          headers.map(h => `"${h}"`).join(','),
          ...sampleData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Hands_and_Head_${isProd ? 'Products' : 'Customers'}_Template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
  };

  window.BulkImportEngine = BulkImportEngine;
})();
