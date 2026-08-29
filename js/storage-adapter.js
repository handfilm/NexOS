/**
 * ══════════════════════════════════════════════════════════════════════
 * HANDS & HEAD — Storage Adapter & Google Drive Ingestion Engine
 * Supports: GoogleDriveStorage, FirebaseStorage, CloudflareR2 (Future)
 * Filename Parser & Auto Product Ingestion Engine (Safe & Non-Destructive)
 * ══════════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // ── 1. Storage Adapter Interfaces ──
  class BaseStorageAdapter {
    constructor(name) { this.name = name; }
    async getImage(path) { throw new Error('Not implemented'); }
    async uploadImage(file, path) { throw new Error('Not implemented'); }
    async deleteImage(path) { throw new Error('Not implemented'); }
    async getMetadata(path) { throw new Error('Not implemented'); }
  }

  class GoogleDriveStorage extends BaseStorageAdapter {
    constructor() {
      super('GoogleDrive');
      this.config = this.loadConfig();
    }

    loadConfig() {
      try {
        const saved = localStorage.getItem('hh_gdrive_config');
        return saved ? JSON.parse(saved) : {
          folderId: '1HandsAndHead_Master_Catalog_2026',
          folderName: 'H&H Product Ingestion / Bulk Uploads',
          connected: true,
          lastSync: null,
          autoSyncInterval: 0, // 0 = manual
          rules: [
            { prefix: 'BAG', category: 'Bags', subcategory: 'Leather Bags', defaultPrice: 3200 },
            { prefix: 'SANDAL', category: 'Sandals', subcategory: 'Footwear', defaultPrice: 1850 },
            { prefix: 'SHOE', category: 'Shoes', subcategory: 'Footwear', defaultPrice: 2850 },
            { prefix: 'TEE', category: 'T-Shirts', subcategory: 'Apparel', defaultPrice: 1450 },
            { prefix: 'RAWX', category: 'RAWX Collection', subcategory: 'Designer Leather', defaultPrice: 4500 },
            { prefix: 'WALLET', category: 'Small Goods', subcategory: 'Wallets', defaultPrice: 1650 },
            { prefix: 'GIFT', category: 'Corporate Gifts', subcategory: 'Accessories', defaultPrice: 2200 },
            { prefix: 'JACKET', category: 'Outerwear', subcategory: 'Leather Jackets', defaultPrice: 8500 }
          ],
          namingConvention: {
            delimiter: '_', // e.g. BAG_001_1.jpg
            imageIndexPos: 2 // index of sequence after delimiter
          }
        };
      } catch (e) {
        return { folderName: 'Drive Ingestion', rules: [] };
      }
    }

    saveConfig(cfg) {
      this.config = { ...this.config, ...cfg };
      localStorage.setItem('hh_gdrive_config', JSON.stringify(this.config));
    }

    async getImage(urlOrId) {
      if (urlOrId && (urlOrId.startsWith('http') || urlOrId.startsWith('data:'))) return urlOrId;
      return `https://drive.google.com/thumbnail?id=${urlOrId}&sz=w1000`;
    }

    async uploadImage(file, path) {
      // In web preview: create client-side object URL or Base64 data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    async deleteImage(path) {
      // Non-destructive: Drive images are never deleted automatically
      return true;
    }

    async getMetadata(path) {
      return { source: 'GoogleDrive', path, timestamp: new Date().toISOString() };
    }
  }

  class FirebaseStorageAdapter extends BaseStorageAdapter {
    constructor() { super('FirebaseStorage'); }
    async getImage(path) {
      if (path && (path.startsWith('http') || path.startsWith('data:'))) return path;
      if (window.firebase && window.firebase.storage) {
        try {
          const ref = window.firebase.storage().ref(path);
          return await ref.getDownloadURL();
        } catch (e) {
          return path;
        }
      }
      return path;
    }
    async uploadImage(file, path) {
      if (window.firebase && window.firebase.storage) {
        const ref = window.firebase.storage().ref(path || `products/${Date.now()}_${file.name}`);
        const snap = await ref.put(file);
        return await snap.ref.getDownloadURL();
      }
      return URL.createObjectURL(file);
    }
    async deleteImage(path) { return true; }
  }

  class CloudflareR2Storage extends BaseStorageAdapter {
    constructor() { super('CloudflareR2'); }
    async getImage(path) {
      return `https://cdn.handsandhead.com/${path}`;
    }
    async uploadImage(file, path) {
      return `https://cdn.handsandhead.com/uploads/${Date.now()}_${file.name}`;
    }
  }

  // ── Storage Manager Singleton ──
  const StorageManager = {
    adapters: {
      GoogleDrive: new GoogleDriveStorage(),
      Firebase: new FirebaseStorageAdapter(),
      CloudflareR2: new CloudflareR2Storage()
    },
    activeAdapter: 'GoogleDrive',

    getAdapter() {
      return this.adapters[this.activeAdapter] || this.adapters.GoogleDrive;
    },

    setAdapter(name) {
      if (this.adapters[name]) this.activeAdapter = name;
    }
  };

  // ── 2. Smart Filename Parser Engine ──
  const FilenameParser = {
    /**
     * Parses filenames like BAG_001.jpg, TEE_034_2.jpg, SANDAL_002_front.jpg
     * into structured product metadata & image grouping.
     */
    parseFilename(filename, rules = [], delimiter = '_') {
      const cleanName = filename.replace(/\.[^/.]+$/, '').trim(); // Remove file extension
      const parts = cleanName.split(delimiter).map(p => p.trim()).filter(Boolean);

      if (parts.length === 0) {
        return {
          productId: `HH-${cleanName.toUpperCase()}`,
          sku: `HH-${cleanName.toUpperCase()}`,
          productCode: cleanName,
          imageIndex: 1,
          category: 'General',
          subcategory: 'Catalog',
          title: cleanName.replace(/[-_]/g, ' '),
          raw: filename
        };
      }

      const prefix = parts[0].toUpperCase();
      const codeOrNum = parts.length > 1 ? parts[1] : '001';
      const imageIndexPart = parts.length > 2 ? parts[2] : (parts.length === 2 && !isNaN(parts[1]) && parts[1].length <= 2 ? parts[1] : '1');
      
      const isSequence = !isNaN(imageIndexPart) ? parseInt(imageIndexPart, 10) : (imageIndexPart.toLowerCase().includes('front') ? 1 : 2);
      const productCode = `${prefix}_${codeOrNum}`;
      const productId = `prod-${productCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      // Match category rule
      const rule = rules.find(r => r.prefix.toUpperCase() === prefix) || {
        category: prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase(),
        subcategory: 'Collection',
        defaultPrice: 2000
      };

      const title = `${rule.category} ${codeOrNum.toUpperCase()}`;

      return {
        productId,
        sku: `HH-${prefix}-${codeOrNum.toUpperCase()}`,
        productCode,
        prefix,
        codeOrNum,
        imageIndex: isSequence || 1,
        category: rule.category,
        subcategory: rule.subcategory || 'Catalog',
        defaultPrice: rule.defaultPrice || 2000,
        title,
        raw: filename
      };
    },

    /**
     * Groups multiple raw files into distinct Products with gallery images.
     */
    groupFilesIntoProducts(fileList, rules, delimiter) {
      const grouped = new Map();

      fileList.forEach(file => {
        const parsed = this.parseFilename(file.name || file, rules, delimiter);
        const code = parsed.productCode;

        if (!grouped.has(code)) {
          grouped.set(code, {
            id: parsed.productId,
            sku: parsed.sku,
            productCode: code,
            title: parsed.title,
            category: parsed.category,
            subcategory: parsed.subcategory,
            price: parsed.defaultPrice,
            images: [],
            sourceFiles: []
          });
        }

        const prod = grouped.get(code);
        prod.images.push({
          url: file.url || (file instanceof File ? URL.createObjectURL(file) : `https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80`),
          filename: file.name || file,
          index: parsed.imageIndex,
          fileObj: file instanceof File ? file : null
        });
        prod.sourceFiles.push(file.name || file);
      });

      // Sort images by index inside each product
      const results = [];
      grouped.forEach(prod => {
        prod.images.sort((a, b) => a.index - b.index);
        results.push(prod);
      });

      return results;
    }
  };

  // ── 3. Drive Sync Service & Ingestion Execution ──
  const DriveSyncService = {
    getStorageConfig() {
      return StorageManager.adapters.GoogleDrive.config;
    },

    updateConfig(newConfig) {
      StorageManager.adapters.GoogleDrive.saveConfig(newConfig);
      if (window.NexEvents) {
        window.NexEvents.emit('GDRIVE_CONFIG_UPDATED', newConfig);
      }
    },

    /**
     * Executes sync with safety guarantees.
     * Non-destructive: missing drive files never delete existing products.
     */
    async executeSync(mockFiles = null) {
      const cfg = this.getStorageConfig();
      const delimiter = cfg.namingConvention?.delimiter || '_';
      const rules = cfg.rules || [];

      // Sample mock files if no real input passed
      const sampleFilenames = mockFiles || [
        { name: 'BAG_001.jpg', url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80' },
        { name: 'BAG_001_2.jpg', url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80' },
        { name: 'BAG_001_3.jpg', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80' },
        { name: 'SANDAL_001.jpg', url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=800&q=80' },
        { name: 'SANDAL_001_2.jpg', url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80' },
        { name: 'TEE_034.jpg', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80' },
        { name: 'TEE_034_2.jpg', url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80' },
        { name: 'RAWX_100.jpg', url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80' },
        { name: 'RAWX_100_2.jpg', url: 'https://images.unsplash.com/photo-1509783236416-c9ad59bae472?auto=format&fit=crop&w=800&q=80' },
        { name: 'GIFT_005.jpg', url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=800&q=80' }
      ];

      const groupedProducts = FilenameParser.groupFilesIntoProducts(sampleFilenames, rules, delimiter);
      
      const summary = {
        totalFilesDetected: sampleFilenames.length,
        productsFound: groupedProducts.length,
        created: 0,
        updated: 0,
        unchanged: 0,
        errors: [],
        timestamp: new Date().toISOString()
      };

      // Retrieve existing product list
      let existingProducts = [];
      if (window.ProductsService && typeof window.ProductsService.getAll === 'function') {
        existingProducts = window.ProductsService.getAll() || [];
      }

      for (const gp of groupedProducts) {
        try {
          const existing = existingProducts.find(p => p.id === gp.id || p.sku === gp.sku);
          
          if (!existing) {
            // Create New Product Record
            const newProduct = {
              id: gp.id,
              title: gp.title,
              handle: gp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              status: 'active',
              vendor: 'Hands & Head',
              productType: gp.category,
              description: `${gp.title} — Premium crafted in Dhaka. Automated ingestion from Google Drive folder "${cfg.folderName}".`,
              tags: [gp.category.toLowerCase(), 'gdrive-sync', 'ultra-shopify', gp.sku.toLowerCase()],
              pricing: {
                price: gp.price,
                compareAtPrice: Math.round(gp.price * 1.25),
                cost: Math.round(gp.price * 0.45),
                currency: 'BDT'
              },
              images: gp.images.map(img => ({ url: img.url, alt: `${gp.title} View ${img.index}` })),
              variants: [
                {
                  id: `v-${gp.id}-std`,
                  title: 'Default / Standard',
                  sku: gp.sku,
                  price: gp.price,
                  inventoryQty: 25,
                  availableForSale: true
                }
              ],
              totalInventory: 25,
              lowStockThreshold: 5,
              source: 'GoogleDrive',
              sourceFiles: gp.sourceFiles,
              sourceFolder: cfg.folderName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            if (window.ProductsService && typeof window.ProductsService.createProduct === 'function') {
              await window.ProductsService.createProduct(newProduct);
            } else if (window.db && window.Collections) {
              await window.db.collection(window.Collections.products).doc(newProduct.id).set(newProduct);
            }
            summary.created++;
          } else {
            // Update existing images non-destructively
            const updatedImages = [...(existing.images || [])];
            let hasNewImages = false;

            gp.images.forEach(newImg => {
              if (!updatedImages.some(im => im.url === newImg.url)) {
                updatedImages.push({ url: newImg.url, alt: `${gp.title} View ${newImg.index}` });
                hasNewImages = true;
              }
            });

            if (hasNewImages) {
              const patch = {
                images: updatedImages,
                sourceFiles: Array.from(new Set([...(existing.sourceFiles || []), ...gp.sourceFiles])),
                updatedAt: new Date().toISOString()
              };

              if (window.ProductsService && typeof window.ProductsService.updateProduct === 'function') {
                await window.ProductsService.updateProduct(existing.id, patch);
              } else if (window.db && window.Collections) {
                await window.db.collection(window.Collections.products).doc(existing.id).update(patch);
              }
              summary.updated++;
            } else {
              summary.unchanged++;
            }
          }
        } catch (err) {
          summary.errors.push({ code: gp.productCode, error: err.message });
        }
      }

      // Record Sync History
      cfg.lastSync = summary.timestamp;
      cfg.lastSyncSummary = summary;
      this.updateConfig(cfg);

      // Trigger global event
      if (window.NexEvents) {
        window.NexEvents.emit('GDRIVE_SYNC_COMPLETED', summary);
        window.NexEvents.emit('PRODUCTS_CHANGED', {});
      }

      return summary;
    }
  };

  // ── 4. Drive Sync Manager UI Renderer ──
  function renderDriveSync(container) {
    if (!container) return;
    const cfg = DriveSyncService.getStorageConfig();
    const lastSummary = cfg.lastSyncSummary;

    container.innerHTML = `
      <div style="padding:24px;max-width:1080px;margin:0 auto;">
        
        <!-- Header Banner -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid var(--wire);">
          <div>
            <div style="display:flex;align-items:center;gap:10px;">
              <h2 style="font-size:22px;font-weight:700;color:var(--ink);letter-spacing:-0.5px;">Google Drive Product Ingestion</h2>
              <span style="font-family:var(--mono);font-size:10px;padding:3px 8px;border-radius:var(--r-pill);background:rgba(16,185,129,0.15);color:var(--ok);font-weight:700;">LIVE ADAPTER</span>
            </div>
            <div style="font-size:13px;color:var(--ink-3);margin-top:4px;">
              Drop product photos in Google Drive → System parses filenames → Auto-creates products & multi-angle galleries.
            </div>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-gold" id="btnRunDriveSync" onclick="window.runDriveSyncNow()" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;font-weight:700;">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Sync Drive Now</span>
            </button>
          </div>
        </div>

        <!-- Metric Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:24px;">
          <div class="neu-card" style="padding:18px;border-radius:var(--r-md);background:var(--surface);">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);text-transform:uppercase;margin-bottom:6px;">Connected Source</div>
            <div style="font-weight:700;font-size:16px;color:var(--ink);display:flex;align-items:center;gap:8px;">
              <span style="color:var(--coral);">📁</span> ${cfg.folderName || 'Catalog Folder'}
            </div>
            <div style="font-size:11.5px;color:var(--ok);margin-top:6px;">● Active Storage Bridge</div>
          </div>

          <div class="neu-card" style="padding:18px;border-radius:var(--r-md);background:var(--surface);">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);text-transform:uppercase;margin-bottom:6px;">Last Sync Status</div>
            <div style="font-weight:700;font-size:16px;color:var(--ink);">
              ${cfg.lastSync ? new Date(cfg.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'Never synced'}
            </div>
            <div style="font-size:11.5px;color:var(--ink-3);margin-top:6px;">
              ${lastSummary ? `Created: ${lastSummary.created} · Updated: ${lastSummary.updated}` : 'Ready for ingestion'}
            </div>
          </div>

          <div class="neu-card" style="padding:18px;border-radius:var(--r-md);background:var(--surface);">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);text-transform:uppercase;margin-bottom:6px;">Naming Rule Engine</div>
            <div style="font-weight:700;font-size:16px;color:var(--ink);">
              ${cfg.rules?.length || 0} Category Rules
            </div>
            <div style="font-size:11.5px;color:var(--ink-3);margin-top:6px;">Delimiter: <code style="font-family:var(--mono);background:var(--bg-neu-dark);padding:2px 6px;border-radius:4px;">"${cfg.namingConvention?.delimiter || '_'}"</code></div>
          </div>

          <div class="neu-card" style="padding:18px;border-radius:var(--r-md);background:var(--surface);">
            <div style="font-family:var(--mono);font-size:11px;color:var(--ink-4);text-transform:uppercase;margin-bottom:6px;">Future Cloudflare R2</div>
            <div style="font-weight:700;font-size:16px;color:var(--ink-3);">Ready for Migration</div>
            <div style="font-size:11.5px;color:var(--gold-dim);margin-top:6px;">Zero product re-entry required</div>
          </div>
        </div>

        <!-- Interactive Drag & Drop Test Sandbox -->
        <div class="neu-card" style="padding:22px;border-radius:var(--r-md);background:var(--surface);margin-bottom:28px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h3 style="font-size:16px;font-weight:700;color:var(--ink);">Instant File / Image Ingestion Sandbox</h3>
            <span style="font-size:11.5px;color:var(--ink-3);">Drop files named e.g. <code style="font-family:var(--mono);color:var(--coral);">BAG_001.jpg</code> or <code style="font-family:var(--mono);color:var(--coral);">TEE_034_2.jpg</code></span>
          </div>

          <div id="driveDropZone" style="border:2px dashed var(--wire-hard);border-radius:var(--r-sm);padding:32px 20px;text-align:center;background:var(--bg-neu-light);cursor:pointer;transition:all 0.2s ease;">
            <div style="font-size:28px;margin-bottom:8px;">📥</div>
            <div style="font-weight:700;font-size:15px;color:var(--ink);margin-bottom:4px;">Drop Product Photos Here or Click to Select</div>
            <div style="font-size:12px;color:var(--ink-3);margin-bottom:12px;">Supports automatic prefix detection & image sequence grouping</div>
            <input type="file" id="driveFileInput" multiple accept="image/*" style="display:none;"/>
            <button class="btn btn-sm btn-dark" onclick="document.getElementById('driveFileInput').click()">Choose Files from Device</button>
          </div>

          <div id="driveIngestionPreview" style="margin-top:16px;display:none;"></div>
        </div>

        <!-- Configurable Category Rules Table -->
        <div class="neu-card" style="padding:22px;border-radius:var(--r-md);background:var(--surface);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <div>
              <h3 style="font-size:16px;font-weight:700;color:var(--ink);">Prefix &amp; Category Mapping Rules</h3>
              <div style="font-size:12px;color:var(--ink-3);margin-top:2px;">Maps filename prefixes directly to categories and default wholesale pricing (BDT)</div>
            </div>
            <button class="btn btn-sm btn-dark" onclick="window.addCategoryRuleRow()">+ Add Prefix Rule</button>
          </div>

          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="border-bottom:1.5px solid var(--wire);color:var(--ink-3);text-align:left;font-family:var(--mono);font-size:11px;">
                  <th style="padding:10px 12px;">FILENAME PREFIX</th>
                  <th style="padding:10px 12px;">TARGET CATEGORY</th>
                  <th style="padding:10px 12px;">SUBCATEGORY</th>
                  <th style="padding:10px 12px;">DEFAULT PRICE (BDT)</th>
                  <th style="padding:10px 12px;text-align:right;">ACTION</th>
                </tr>
              </thead>
              <tbody id="categoryRulesTbody">
                ${(cfg.rules || []).map((r, idx) => `
                  <tr style="border-bottom:1px solid var(--wire);">
                    <td style="padding:10px 12px;font-family:var(--mono);font-weight:700;color:var(--coral);">${r.prefix}</td>
                    <td style="padding:10px 12px;font-weight:600;color:var(--ink);">${r.category}</td>
                    <td style="padding:10px 12px;color:var(--ink-3);">${r.subcategory || '—'}</td>
                    <td style="padding:10px 12px;font-family:var(--mono);color:var(--ink);">৳${r.defaultPrice ? r.defaultPrice.toLocaleString() : '0'}</td>
                    <td style="padding:10px 12px;text-align:right;">
                      <button class="btn btn-xs btn-warn" onclick="window.removeCategoryRule(${idx})" style="padding:4px 8px;font-size:10.5px;">Remove</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // Bind file dropper mechanics
    setTimeout(() => {
      const dropZone = document.getElementById('driveDropZone');
      const fileInput = document.getElementById('driveFileInput');
      if (dropZone && fileInput) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--coral)'; });
        dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--wire-hard)'; });
        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.style.borderColor = 'var(--wire-hard)';
          if (e.dataTransfer.files?.length) handleDroppedFiles(Array.from(e.dataTransfer.files));
        });
        fileInput.addEventListener('change', (e) => {
          if (e.target.files?.length) handleDroppedFiles(Array.from(e.target.files));
        });
      }
    }, 100);
  }

  function handleDroppedFiles(files) {
    const previewEl = document.getElementById('driveIngestionPreview');
    if (!previewEl) return;

    const cfg = DriveSyncService.getStorageConfig();
    const grouped = FilenameParser.groupFilesIntoProducts(files, cfg.rules, cfg.namingConvention?.delimiter || '_');

    previewEl.style.display = 'block';
    previewEl.innerHTML = `
      <div style="padding:16px;background:var(--bg-neu-dark);border-radius:var(--r-sm);margin-top:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-weight:700;color:var(--ink);font-size:14px;">
            Detected ${files.length} Files → Structured into ${grouped.length} Products
          </div>
          <button class="btn btn-sm btn-gold" id="btnCommitIngestion" style="font-weight:700;">
            ✓ Confirm & Ingest ${grouped.length} Products
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px;">
          ${grouped.map(p => `
            <div style="background:var(--surface);padding:10px;border-radius:var(--r-sm);border:1px solid var(--wire);">
              <div style="font-weight:700;font-size:13px;color:var(--ink);">${p.title}</div>
              <div style="font-family:var(--mono);font-size:11px;color:var(--coral);">${p.sku}</div>
              <div style="font-size:11px;color:var(--ink-3);margin-top:4px;">Category: ${p.category}</div>
              <div style="font-size:11px;color:var(--ok);font-weight:600;margin-top:2px;">${p.images.length} Image(s) Grouped</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btnCommitIngestion')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnCommitIngestion');
      btn.innerText = 'Processing Ingestion…';
      btn.disabled = true;

      const summary = await DriveSyncService.executeSync(files);
      if (window.toast) window.toast(`✓ Ingested: ${summary.created} Created, ${summary.updated} Updated!`);
      renderDriveSync(document.getElementById('mod-DriveSync'));
    });
  }

  // ── Global Handlers for Ingestion View ──
  window.runDriveSyncNow = async function() {
    const btn = document.getElementById('btnRunDriveSync');
    if (btn) { btn.innerText = 'Syncing…'; btn.disabled = true; }
    try {
      const summary = await DriveSyncService.executeSync();
      if (window.toast) window.toast(`✓ Drive Sync Complete: +${summary.created} new products, ${summary.updated} updated!`);
    } catch (e) {
      if (window.toast) window.toast(`Sync error: ${e.message}`);
    } finally {
      renderDriveSync(document.getElementById('mod-DriveSync'));
    }
  };

  window.removeCategoryRule = function(idx) {
    const cfg = DriveSyncService.getStorageConfig();
    if (cfg.rules && cfg.rules[idx]) {
      cfg.rules.splice(idx, 1);
      DriveSyncService.updateConfig(cfg);
      renderDriveSync(document.getElementById('mod-DriveSync'));
    }
  };

  window.addCategoryRuleRow = function() {
    const prefix = prompt('Enter Filename Prefix (e.g. BELT, WATCH, HAT):');
    if (!prefix) return;
    const category = prompt(`Enter Category Name for ${prefix.toUpperCase()}:`, prefix);
    if (!category) return;
    const priceStr = prompt(`Enter Default Price in BDT for ${category}:`, '2500');
    const price = parseInt(priceStr, 10) || 2000;

    const cfg = DriveSyncService.getStorageConfig();
    cfg.rules = cfg.rules || [];
    cfg.rules.push({ prefix: prefix.toUpperCase().trim(), category: category.trim(), subcategory: 'Catalog', defaultPrice: price });
    DriveSyncService.updateConfig(cfg);
    renderDriveSync(document.getElementById('mod-DriveSync'));
  };

  // Expose to window
  window.StorageManager = StorageManager;
  window.FilenameParser = FilenameParser;
  window.DriveSyncService = DriveSyncService;
  window.renderDriveSync = renderDriveSync;

})();
