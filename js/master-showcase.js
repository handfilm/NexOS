/**
 * ══════════════════════════════════════════════════════════════════════
 * HANDS & HEAD — Master Digital Ecosystem Showcase & Slider CMS
 * For handsandhead.com homepage: Visual launcher, interactive slider,
 * multi-project ecosystem hub (RAWX, HAND FILM, TEE HUB, FOOD, APPS, ARTICLES)
 * ══════════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // ── 1. Showcase CMS Data Engine ──
  const MasterShowcaseService = {
    loadData() {
      try {
        const saved = localStorage.getItem('hh_master_showcase_v1');
        if (saved) return JSON.parse(saved);
      } catch (e) {}

      // Default curated ecosystem nodes
      return {
        slides: [
          {
            id: 'slide-rawx',
            tag: 'DESIGNER LEATHER',
            title: 'RAWX · Structural Luxury',
            subtitle: 'Raw-edge architectural leathercraft with custom aerospace-grade anodized hardware. Engineered in Dhaka.',
            image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1600&q=80',
            ctaText: 'Explore RAWX OS',
            ctaUrl: 'https://handfilm.handsandhead.com/pages/rawx-master-os-slider-1',
            appAction: 'PortalArutemika',
            status: 'active',
            order: 1
          },
          {
            id: 'slide-handfilm',
            tag: 'CINEMATIC LOOKBOOK',
            title: 'HAND FILM · Visual Media',
            subtitle: 'Visual storytelling, filmic lookbooks, and high-contrast editorial photography celebrating contemporary South Asian craft.',
            image: 'https://images.unsplash.com/photo-1509783236416-c9ad59bae472?auto=format&fit=crop&w=1600&q=80',
            ctaText: 'View Media Hub',
            ctaUrl: 'https://handfilm.handsandhead.com',
            appAction: 'SocialPost',
            status: 'active',
            order: 2
          },
          {
            id: 'slide-teehub',
            tag: 'STREETWEAR ATELIER',
            title: 'TEE HUB · 260 GSM Heavyweights',
            subtitle: 'Acid-washed vintage drop tees and custom cut-and-sew heavyweight combed cotton blanks for global streetwear labels.',
            image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1600&q=80',
            ctaText: 'Launch Apparel Studio',
            ctaUrl: 'https://shop.handsandhead.com',
            appAction: 'PortalRMG',
            status: 'active',
            order: 3
          },
          {
            id: 'slide-nexus',
            tag: 'OPERATING SYSTEM',
            title: 'H&H Nexus · Ultra Shopify Engine',
            subtitle: 'Headless B2B commerce network, automated Google Drive ingestion, and lightning-fast Facebook/WhatsApp order terminal.',
            image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1600&q=80',
            ctaText: 'Open Operator Terminal',
            ctaUrl: '#',
            appAction: 'Home',
            status: 'active',
            order: 4
          }
        ],
        sections: [
          { id: 'sec-ecommerce', name: 'E-COMMERCE', desc: 'Shop curated leather collections & apparel', icon: '🛍️', app: 'Products', count: '300+ SKUs' },
          { id: 'sec-rawx', name: 'RAWX', desc: 'Ergonomic luxury leather & hardware', icon: '📐', app: 'PortalArutemika', count: 'Atelier' },
          { id: 'sec-handfilm', name: 'HAND FILM', desc: 'Visual media, films & lookbooks', icon: '🎬', app: 'JapanStore', count: 'Cinema' },
          { id: 'sec-teehub', name: 'TEE HUB', desc: 'Custom streetwear & RMG export', icon: '👕', app: 'PortalRMG', count: 'Manufacturing' },
          { id: 'sec-apps', name: 'APPS & OS', desc: 'NexOS, Custom Studio & ERP', icon: '⚡', app: 'CustomApps', count: '12 Apps' },
          { id: 'sec-accounting', name: 'ERP FINANCE', desc: 'account.handsandhead.com sync', icon: '📊', app: 'Accounting', count: 'Ledger' },
          { id: 'sec-articles', name: 'ARTICLES', desc: 'Stories on leathercraft & ethics', icon: '📖', app: 'EUPortal', count: 'Editorial' },
          { id: 'sec-food', name: 'FOOD & CAFE', desc: 'Culinary concepts & hospitality', icon: '☕', app: 'FrontEnd', count: 'Concept' }
        ]
      };
    },

    saveData(data) {
      localStorage.setItem('hh_master_showcase_v1', JSON.stringify(data));
      if (window.NexEvents) {
        window.NexEvents.emit('MASTER_SHOWCASE_UPDATED', data);
      }
    },

    getSlides() {
      return this.loadData().slides.filter(s => s.status === 'active').sort((a, b) => a.order - b.order);
    },

    getSections() {
      return this.loadData().sections;
    }
  };

  // ── 2. Interactive Showcase Slider & Homepage UI ──
  let _currentSlideIndex = 0;
  let _slideInterval = null;

  function renderMasterShowcase(container) {
    if (!container) return;
    const slides = MasterShowcaseService.getSlides();
    const sections = MasterShowcaseService.getSections();

    if (_currentSlideIndex >= slides.length) _currentSlideIndex = 0;

    container.innerHTML = `
      <div class="master-hub-wrap" style="padding:16px 20px 40px;max-width:1200px;margin:0 auto;">
        
        <!-- Hero Slider Canvas -->
        <div class="neu-card master-slider-card" style="position:relative;overflow:hidden;border-radius:var(--r-lg);background:#0F172A;color:#FFF;margin-bottom:28px;min-height:380px;display:flex;flex-direction:column;justify-content:flex-end;">
          
          <!-- Background Image with Ambient Vignette -->
          <div id="masterSlideBg" style="position:absolute;inset:0;background-size:cover;background-position:center;transition:all 0.6s cubic-bezier(0.16, 1, 0.3, 1);opacity:0.65;background-image:url('${slides[_currentSlideIndex]?.image || ''}');"></div>
          <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.85) 60%, #0F172A 100%);"></div>

          <!-- Slide Content Overlay -->
          <div id="masterSlideContent" style="position:relative;z-index:2;padding:32px 36px;">
            <div style="display:inline-block;font-family:var(--mono);font-size:11px;letter-spacing:1.8px;color:var(--coral);font-weight:700;margin-bottom:8px;background:rgba(255,91,53,0.18);padding:4px 10px;border-radius:var(--r-pill);border:1px solid rgba(255,91,53,0.4);">
              ${slides[_currentSlideIndex]?.tag || 'ECOSYSTEM'}
            </div>
            <h1 style="font-family:var(--display);font-size:clamp(28px, 4vw, 48px);line-height:1.1;color:#FFFFFF;margin-bottom:10px;letter-spacing:0.5px;">
              ${slides[_currentSlideIndex]?.title || 'HANDS & HEAD'}
            </h1>
            <p style="font-size:14.5px;color:rgba(255,255,255,0.85);max-width:600px;line-height:1.55;margin-bottom:20px;">
              ${slides[_currentSlideIndex]?.subtitle || ''}
            </p>
            
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <button class="btn btn-gold" onclick="window.triggerSlideCTA(${_currentSlideIndex})" style="padding:11px 24px;font-weight:700;font-size:13.5px;">
                ${slides[_currentSlideIndex]?.ctaText || 'Open Project'} →
              </button>
              <button class="btn btn-dark" onclick="openAppModule('MasterCMS')" style="font-size:11.5px;padding:9px 14px;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);">
                ⚙️ Manage Slider CMS
              </button>
            </div>
          </div>

          <!-- Slider Controls -->
          <div style="position:absolute;bottom:24px;right:32px;z-index:3;display:flex;align-items:center;gap:8px;">
            <button class="btn btn-xs btn-dark" onclick="window.prevMasterSlide()" style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.15);color:#FFF;">‹</button>
            <div style="display:flex;gap:6px;">
              ${slides.map((s, idx) => `
                <button onclick="window.setMasterSlide(${idx})" style="width:${idx === _currentSlideIndex ? '20px' : '8px'};height:8px;border-radius:var(--r-pill);background:${idx === _currentSlideIndex ? 'var(--coral)' : 'rgba(255,255,255,0.3)'};transition:all 0.3s ease;"></button>
              `).join('')}
            </div>
            <button class="btn btn-xs btn-dark" onclick="window.nextMasterSlide()" style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.15);color:#FFF;">›</button>
          </div>
        </div>

        <!-- Ecosystem Section Grid -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div>
            <h2 style="font-size:18px;font-weight:700;color:var(--ink);">Ecosystem Hub &amp; Digital Launchpad</h2>
            <div style="font-size:12px;color:var(--ink-3);">Seamless cross-app gateways, direct D2C commerce, and media archives</div>
          </div>
          <button class="btn btn-xs btn-dark" onclick="openAppModule('CustomApps')">+ Add Digital Node</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:14px;">
          ${sections.map(sec => `
            <div class="neu-card hub-node-card" onclick="openAppModule('${sec.app}')" style="padding:18px;border-radius:var(--r-md);background:var(--surface);cursor:pointer;transition:all 0.2s ease;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <span style="font-size:24px;">${sec.icon}</span>
                <span style="font-family:var(--mono);font-size:10.5px;padding:2px 7px;border-radius:var(--r-pill);background:var(--bg-neu-dark);color:var(--ink-3);font-weight:600;">${sec.count}</span>
              </div>
              <div style="font-weight:700;font-size:15px;color:var(--ink);margin-bottom:4px;">${sec.name}</div>
              <div style="font-size:12px;color:var(--ink-3);line-height:1.4;">${sec.desc}</div>
              <div style="margin-top:12px;font-size:11px;font-weight:700;color:var(--coral);display:flex;align-items:center;gap:4px;">
                <span>Launch Channel</span> →
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;

    // Start subtle autoplay
    if (!_slideInterval) {
      _slideInterval = setInterval(() => {
        window.nextMasterSlide(true);
      }, 7000);
    }
  }

  // ── Slider Navigation Methods ──
  window.setMasterSlide = function(idx) {
    _currentSlideIndex = idx;
    const c = document.getElementById('mod-Home') || document.getElementById('body');
    renderMasterShowcase(c);
  };

  window.nextMasterSlide = function(auto = false) {
    const slides = MasterShowcaseService.getSlides();
    _currentSlideIndex = (_currentSlideIndex + 1) % (slides.length || 1);
    const bg = document.getElementById('masterSlideBg');
    if (bg && slides[_currentSlideIndex]) {
      const c = document.getElementById('mod-Home') || document.getElementById('body');
      renderMasterShowcase(c);
    }
  };

  window.prevMasterSlide = function() {
    const slides = MasterShowcaseService.getSlides();
    _currentSlideIndex = (_currentSlideIndex - 1 + slides.length) % (slides.length || 1);
    const c = document.getElementById('mod-Home') || document.getElementById('body');
    renderMasterShowcase(c);
  };

  window.triggerSlideCTA = function(idx) {
    const slides = MasterShowcaseService.getSlides();
    const slide = slides[idx];
    if (!slide) return;
    if (slide.appAction && typeof window.openAppModule === 'function') {
      window.openAppModule(slide.appAction);
    } else if (slide.ctaUrl && slide.ctaUrl.startsWith('http')) {
      window.open(slide.ctaUrl, '_blank');
    }
  };

  // ── 3. Master CMS Manager Admin View ──
  function renderMasterCMS(container) {
    if (!container) return;
    const data = MasterShowcaseService.loadData();

    container.innerHTML = `
      <div style="padding:24px;max-width:1000px;margin:0 auto;">
        
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--wire);">
          <div>
            <h2 style="font-size:20px;font-weight:700;color:var(--ink);">Master Homepage CMS &amp; Slider System</h2>
            <div style="font-size:12.5px;color:var(--ink-3);">Manage showcase slides, media assets, and digital hub sections for handsandhead.com</div>
          </div>
          <button class="btn btn-gold" onclick="window.addNewMasterSlide()" style="font-weight:700;">+ Add New Slide</button>
        </div>

        <!-- Slides List -->
        <div style="margin-bottom:32px;">
          <h3 style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:12px;">Active Homepage Hero Slides (${data.slides.length})</h3>
          
          <div style="display:flex;flex-direction:column;gap:14px;">
            ${data.slides.map((s, idx) => `
              <div class="neu-card" style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:var(--r-md);background:var(--surface);flex-wrap:wrap;">
                <img src="${s.image}" style="width:90px;height:60px;object-fit:cover;border-radius:var(--r-sm);background:#000;"/>
                <div style="flex:1;min-width:240px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-family:var(--mono);font-size:10px;color:var(--coral);font-weight:700;">${s.tag}</span>
                    <span style="font-size:10px;color:var(--ok);font-weight:600;">● ${s.status.toUpperCase()}</span>
                  </div>
                  <div style="font-weight:700;font-size:15px;color:var(--ink);">${s.title}</div>
                  <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px;">${s.subtitle}</div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                  <button class="btn btn-xs btn-dark" onclick="window.editMasterSlide(${idx})">Edit</button>
                  <button class="btn btn-xs btn-dark" onclick="window.moveSlideOrder(${idx}, -1)">▲</button>
                  <button class="btn btn-xs btn-dark" onclick="window.moveSlideOrder(${idx}, 1)">▼</button>
                  <button class="btn btn-xs btn-warn" onclick="window.deleteMasterSlide(${idx})">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  // ── Helper window bindings for CMS ──
  window.renderMasterShowcase = renderMasterShowcase;
  window.renderMasterCMS = renderMasterCMS;
  window.MasterShowcaseService = MasterShowcaseService;

  window.addNewMasterSlide = function() {
    const title = prompt('Enter Slide Heading Title (e.g. RAWX · Architectural Leather):');
    if (!title) return;
    const tag = prompt('Enter Category Tag (e.g. DESIGNER LEATHER, APPAREL):', 'NEW DROP');
    const subtitle = prompt('Enter Short Subtitle / Description:');
    const image = prompt('Enter Image URL:', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1600&q=80');
    const ctaText = prompt('Enter CTA Button Label:', 'Explore Collection');

    const data = MasterShowcaseService.loadData();
    data.slides.push({
      id: `slide-${Date.now()}`,
      tag: tag || 'PROJECT',
      title,
      subtitle: subtitle || '',
      image: image || '',
      ctaText: ctaText || 'View',
      status: 'active',
      order: data.slides.length + 1
    });
    MasterShowcaseService.saveData(data);
    renderMasterCMS(document.getElementById('mod-MasterCMS'));
  };

  window.deleteMasterSlide = function(idx) {
    if (!confirm('Are you sure you want to remove this slide?')) return;
    const data = MasterShowcaseService.loadData();
    data.slides.splice(idx, 1);
    MasterShowcaseService.saveData(data);
    renderMasterCMS(document.getElementById('mod-MasterCMS'));
  };

  window.moveSlideOrder = function(idx, delta) {
    const data = MasterShowcaseService.loadData();
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= data.slides.length) return;
    const temp = data.slides[idx];
    data.slides[idx] = data.slides[targetIdx];
    data.slides[targetIdx] = temp;
    MasterShowcaseService.saveData(data);
    renderMasterCMS(document.getElementById('mod-MasterCMS'));
  };

  window.editMasterSlide = function(idx) {
    const data = MasterShowcaseService.loadData();
    const slide = data.slides[idx];
    if (!slide) return;
    const newTitle = prompt('Edit Slide Title:', slide.title);
    if (newTitle) slide.title = newTitle;
    const newSub = prompt('Edit Subtitle:', slide.subtitle);
    if (newSub !== null) slide.subtitle = newSub;
    const newImg = prompt('Edit Image URL:', slide.image);
    if (newImg) slide.image = newImg;
    MasterShowcaseService.saveData(data);
    renderMasterCMS(document.getElementById('mod-MasterCMS'));
  };

})();
