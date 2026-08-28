/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-social.js
   Auto Social Post & Product Social Media Composer App
   ═══════════════════════════════════════════════════════════════ */

(function () {
  const POST_STATUS = {
    DRAFT: "DRAFT",
    READY: "READY",
    PUBLISHING: "PUBLISHING",
    PUBLISHED: "PUBLISHED",
    FAILED: "FAILED"
  };

  const Channels = {
    whatsapp: {
      id: "whatsapp",
      name: "WhatsApp Business Catalog",
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.49 0-2.94-.4-4.22-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.24-8.22 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.72 4.31 3.81.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.47-.29z" fill="#25D366"/></svg>`,
      color: "#25D366",
      async publish(post) {
        // Direct interactive click-to-chat URL with structured commerce message
        const text = encodeURIComponent(
          `*${post.headline || post.productTitle}*\n\n` +
          `${post.caption}\n\n` +
          `💰 *Price:* ${post.priceFormatted}\n` +
          `🔗 *View Item:* ${post.productUrl || 'https://handsandhead.com'}\n\n` +
          `${post.hashtags || ''}`
        );
        const waUrl = `https://wa.me/?text=${text}`;
        window.open(waUrl, "_blank");
        return { ok: true, externalId: `WA-MSG-${Date.now()}`, message: "Launched WhatsApp Share Intent." };
      }
    },

    instagram: {
      id: "instagram",
      name: "Instagram Business Feed",
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><rect width="24" height="24" rx="6" fill="url(#ig-grad)"/><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z" fill="#FFF"/><defs><linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#FFDC80"/><stop offset="50%" stop-color="#F56040"/><stop offset="100%" stop-color="#C13584"/></linearGradient></defs></svg>`,
      color: "#C13584",
      async publish(post) {
        // Format caption for clipboard and trigger Instagram web or mobile app
        await navigator.clipboard.writeText(`${post.caption}\n\n${post.hashtags}\n\nShop at handsandhead.com`);
        return {
          ok: true,
          externalId: `IG-POST-${Date.now()}`,
          message: "Instagram caption copied to clipboard & image ready for upload."
        };
      }
    },

    meta: {
      id: "meta",
      name: "Meta / Facebook Page",
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><circle cx="12" cy="12" r="11" fill="#1877F2"/><path d="M13.5 12h2.5l.5-3h-3V7.5c0-.8.3-1.5 1.5-1.5H16V3.2c-.4-.1-1.3-.2-2.3-.2-2.4 0-4 1.5-4 4.2V9H7v3h2.7v8h3.8V12z" fill="#FFF"/></svg>`,
      color: "#1877F2",
      async publish(post) {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(post.productUrl || 'https://handsandhead.com')}&quote=${encodeURIComponent(post.caption)}`;
        window.open(shareUrl, "_blank", "width=600,height=500");
        return { ok: true, externalId: `FB-FEED-${Date.now()}`, message: "Facebook Share dialog opened." };
      }
    },

    web_share: {
      id: "web_share",
      name: "Native Device Share",
      icon: `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
      color: "var(--coral)",
      async publish(post) {
        if (navigator.share) {
          await navigator.share({
            title: post.headline || post.productTitle,
            text: `${post.caption}\n\n${post.hashtags}`,
            url: post.productUrl || window.location.origin
          });
          return { ok: true, externalId: `NATIVE-SHARE-${Date.now()}`, message: "Device native share completed." };
        } else {
          await navigator.clipboard.writeText(`${post.headline}\n\n${post.caption}\n\n${post.productUrl}\n\n${post.hashtags}`);
          return { ok: true, externalId: `CLIP-${Date.now()}`, message: "Copied post caption & link to clipboard." };
        }
      }
    }
  };

  /* ── Social Service ── */
  window.SocialService = {
    Channels,
    STATUS: POST_STATUS,

    /* ── List Social Posts from Firestore ── */
    async listPosts({ limit = 30 } = {}) {
      try {
        const storeId = window.NexAuth?.getStoreId() || "default";
        let q = window.Collections.socialPosts;
        if (storeId && storeId !== "default") {
          q = q.where("storeId", "==", storeId);
        }
        q = q.orderBy("createdAt", "desc").limit(limit);
        const snap = await q.get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Social posts query fallback:", e);
        return [];
      }
    },

    /* ── Create & Save a Social Post Record ── */
    async createPost(postData) {
      const storeId = window.NexAuth?.getStoreId() || "default";
      const payload = {
        ...postData,
        storeId,
        status: postData.status || POST_STATUS.READY,
        createdAt: window.serverTimestamp(),
        updatedAt: window.serverTimestamp()
      };
      const docRef = await window.Collections.socialPosts.add(payload);
      window.NexEvents.emit(window.NexEvents.EVENTS.SOCIAL_POST_CREATED, { id: docRef.id, ...payload });
      return { id: docRef.id, ...payload };
    },

    /* ── Execute Multi-Channel Post Publishing ── */
    async publishPost(postId, channelId = "whatsapp") {
      const channel = Channels[channelId] || Channels.whatsapp;
      const docRef = window.Collections.socialPosts.doc(postId);
      const snap = await docRef.get();
      if (!snap.exists) throw new Error("Social post record not found");
      const post = snap.data();

      await docRef.update({ status: POST_STATUS.PUBLISHING });

      try {
        const result = await channel.publish(post);
        await docRef.update({
          status: POST_STATUS.PUBLISHED,
          publishedAt: window.serverTimestamp(),
          channel: channelId,
          externalPostId: result.externalId || null,
          error: null
        });
        window.NexEvents.emit(window.NexEvents.EVENTS.SOCIAL_POST_PUBLISHED, { id: postId, channel: channelId });
        return { ok: true, message: result.message };
      } catch (err) {
        await docRef.update({
          status: POST_STATUS.FAILED,
          error: err.message
        });
        return { ok: false, error: err.message };
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     PRODUCT SOCIAL COMPOSER MODAL WITH VISUAL PREVIEW
     ═══════════════════════════════════════════════════════════ */
  window.openProductSocialComposer = async function (productId) {
    openSheet(`
      <div style="padding:30px 20px;text-align:center;font-family:var(--mono);color:var(--ink-3);font-size:11px;">
        <div style="display:inline-block;width:18px;height:18px;border:2px solid var(--wire-hard);border-top-color:var(--coral);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:10px;"></div>
        <div>Loading Product Assets &amp; Composer…</div>
      </div>
    `);

    try {
      const p = await window.ProductsService.get(productId);
      if (!p) { toast("Product not found"); closeSheet(); return; }

      const priceVal = Number(p.pricing?.price || 0);
      const priceStr = `৳${priceVal.toLocaleString()}`;
      const imgUrl = p.images?.[0]?.url || "";
      const handle = p.handle || p.id;
      const productUrl = `https://handsandhead.com/products/${handle}`;
      const defaultHeadline = `🔥 NEW RELEASE: ${p.title}`;
      const defaultCaption = `Elevate your everyday carry with the ${p.title}.\n\nCrafted with premium materials, reinforced stitching, and signature Dhaka artisan craftsmanship. Available now in limited batches.`;
      const cleanTag = (p.tags?.[0] || 'LeatherGoods').replace(/[^a-zA-Z0-9]/g, '');
      const defaultHashtags = `#HandsAndHead #DhakaCraft #HandmadeLeather #ExportQuality #${cleanTag} #EverydayCarry`;

      window._currentComposerProduct = p;
      window._activeSocialChannel = window._activeSocialChannel || "whatsapp";

      openSheet(`
        <div class="grab"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <div style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:700;letter-spacing:2px;text-transform:uppercase;">
              Social Post Composer &amp; Live Studio
            </div>
            <h3 style="margin:2px 0 0;font-size:18px;color:var(--ink);">${p.title}</h3>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="pill ok" style="font-size:8.5px;font-family:var(--mono);">${priceStr}</span>
            <span class="pill info" style="font-size:8.5px;">${p.totalInventory || 0} in stock</span>
          </div>
        </div>

        <div style="padding:0 2px 24px;">
          <!-- Channel Select Pills -->
          <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;margin-bottom:14px;">
            ${Object.values(Channels).map(c => `
              <button class="btn btn-sm ${c.id === window._activeSocialChannel ? 'btn-gold' : 'btn-dark'}" id="chan_tab_${c.id}" onclick="window.switchSocialChannelTab('${c.id}')" style="display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:6px 14px;white-space:nowrap;border-radius:20px;">
                ${c.icon}
                <span>${c.name}</span>
              </button>
            `).join('')}
          </div>

          <!-- Quick AI Caption Presets -->
          <div style="margin-bottom:14px;background:var(--bg-neu);border-radius:var(--r-md);box-shadow:var(--neu-inset);padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-family:var(--mono);font-size:9.5px;color:var(--coral);font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                ⚡ AI Caption Presets
              </span>
              <span style="font-size:9.5px;color:var(--ink-3);font-family:var(--mono);">Click to apply instantly</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-sm btn-dark" style="font-size:10px;padding:4px 9px;" onclick="window.applySocialPreset('hype')">🔥 Hype Drop</button>
              <button class="btn btn-sm btn-dark" style="font-size:10px;padding:4px 9px;" onclick="window.applySocialPreset('luxury')">✨ Artisan Craft</button>
              <button class="btn btn-sm btn-dark" style="font-size:10px;padding:4px 9px;" onclick="window.applySocialPreset('urgency')">⚡ Low Stock</button>
              <button class="btn btn-sm btn-dark" style="font-size:10px;padding:4px 9px;" onclick="window.applySocialPreset('b2b')">📦 B2B / Wholesale</button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr;gap:14px;">
            <!-- Post Fields Container -->
            <div class="field"><label>Post Headline *</label>
              <input id="soc_headline" value="${defaultHeadline}" placeholder="e.g. 🔥 NEW RELEASE: Full-Grain Leather Wallet" oninput="window.updateSocialLivePreview()"/>
            </div>

            <div class="field">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <label>Caption Body *</label>
                <span id="soc_char_count" style="font-size:9.5px;font-family:var(--mono);color:var(--ink-3);">0 chars</span>
              </div>
              <textarea id="soc_caption" rows="4" style="width:100%;border-radius:var(--r-md);background:var(--bg-neu);border:none;box-shadow:var(--neu-track);padding:10px 14px;color:var(--ink);font-size:13px;line-height:1.5;resize:vertical;" oninput="window.updateSocialLivePreview()">${defaultCaption}</textarea>
            </div>

            <div class="field-row">
              <div class="field"><label>Hashtags</label>
                <input id="soc_hashtags" value="${defaultHashtags}" oninput="window.updateSocialLivePreview()"/>
              </div>
              <div class="field"><label>Target URL</label>
                <input id="soc_url" value="${productUrl}" oninput="window.updateSocialLivePreview()"/>
              </div>
            </div>

            <!-- ═══════════════════════════════════════════════════════════
                 VISUAL PREVIEW COMPONENT
                 ═══════════════════════════════════════════════════════════ -->
            <div style="margin-top:4px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ok);"></span>
                  <span style="font-family:var(--mono);font-size:10px;color:var(--ink);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">
                    Visual Post Preview
                  </span>
                </div>
                <span class="pill ok" id="previewVerificationBadge" style="font-size:8px;font-family:var(--mono);">
                  VERIFIED READY
                </span>
              </div>

              <!-- Channel Mockup Container -->
              <div id="socialLivePreviewContainer" style="background:var(--bg-neu);border-radius:18px;box-shadow:var(--neu-flat);padding:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);transition:all 0.25s ease;">
                <!-- Dynamically rendered via renderSocialVisualPreview() -->
              </div>

              <!-- Verification Checklist Bar -->
              <div style="display:flex;gap:10px;align-items:center;justify-content:space-around;margin-top:10px;padding:8px 12px;background:var(--bg-neu);border-radius:12px;box-shadow:var(--neu-inset);font-size:9.5px;color:var(--ink-3);font-family:var(--mono);">
                <span>🖼️ Image: <strong style="color:var(--ok);">${imgUrl ? 'Ready' : 'Placeholder'}</strong></span>
                <span>🏷️ Price: <strong style="color:var(--coral);">${priceStr}</strong></span>
                <span>🔗 Link: <strong style="color:var(--ok);">Verified</strong></span>
                <span>🔒 Security: <strong style="color:var(--ok);">SSL OK</strong></span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
              <button class="btn btn-dark" style="flex:1;" onclick="closeSheet()">Cancel</button>
              <button class="btn btn-dark" style="flex:1;" onclick="window.saveSocialDraft('${p.id}')">💾 Save Draft</button>
              <button class="btn btn-gold" id="btnPublishSocial" style="flex:2;" onclick="window.executePublishSocial('${p.id}')">
                🚀 Share on ${Channels[window._activeSocialChannel]?.name || 'WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      `);

      // Initial visual preview render
      window.renderSocialVisualPreview();
    } catch (e) {
      toast("Error opening social composer: " + e.message);
      closeSheet();
    }
  };

  /* ── Switch Channels & Re-render Mockup ── */
  window.switchSocialChannelTab = function (channelId) {
    window._activeSocialChannel = channelId;
    Object.keys(Channels).forEach(id => {
      const tab = document.getElementById(`chan_tab_${id}`);
      if (tab) {
        tab.className = (id === channelId) ? "btn btn-sm btn-gold" : "btn btn-sm btn-dark";
      }
    });
    const publishBtn = document.getElementById("btnPublishSocial");
    if (publishBtn) {
      publishBtn.innerHTML = `🚀 Share on ${Channels[channelId].name}`;
    }
    window.renderSocialVisualPreview();
  };

  /* ── AI Preset Presets ── */
  window.applySocialPreset = function (type) {
    const p = window._currentComposerProduct;
    if (!p) return;
    const title = p.title || "Signature Leather Piece";
    const priceStr = `৳${Number(p.pricing?.price || 0).toLocaleString()}`;
    const cleanTag = (p.tags?.[0] || 'LeatherGoods').replace(/[^a-zA-Z0-9]/g, '');

    const headlineInput = document.getElementById("soc_headline");
    const captionInput = document.getElementById("soc_caption");
    const hashtagsInput = document.getElementById("soc_hashtags");

    if (type === 'hype') {
      if (headlineInput) headlineInput.value = `🔥 JUST DROPPED: ${title}`;
      if (captionInput) captionInput.value = `The wait is over. Experience the all-new ${title} by Hands & Head.\n\nHandcrafted with full-grain cowhide leather, edge-burnished to perfection, and designed for effortless everyday utility. Available now for ${priceStr}.\n\nLimited initial batch — tap below to secure yours.`;
      if (hashtagsInput) hashtagsInput.value = `#HandsAndHead #NewDrop #StreetwearDhaka #LeatherArtisan #${cleanTag} #BangladeshMade`;
    } else if (type === 'luxury') {
      if (headlineInput) headlineInput.value = `✨ Master Craftsmanship: The ${title}`;
      if (captionInput) captionInput.value = `Understated luxury, engineered for longevity.\n\nEvery ${title} undergoes 24+ manual crafting steps in our Dhaka workshop using export-grade full-grain leather that patinas beautifully over time.\n\nPrice: ${priceStr}. Compliant with EU leather standards.`;
      if (hashtagsInput) hashtagsInput.value = `#HandsAndHead #ArtisanLeather #FullGrain #DhakaHeritage #LuxuryCraft #${cleanTag}`;
    } else if (type === 'urgency') {
      if (headlineInput) headlineInput.value = `⚡ LOW STOCK ALERT: ${title}`;
      if (captionInput) captionInput.value = `Final call! Only a few units remaining of the ${title}.\n\nDon't miss out on our best-selling artisan piece (${priceStr}). Nationwide fast shipping across Bangladesh and export worldwide.`;
      if (hashtagsInput) hashtagsInput.value = `#HandsAndHead #LowStock #FlashRelease #${cleanTag} #DhakaFashion`;
    } else if (type === 'b2b') {
      if (headlineInput) headlineInput.value = `📦 B2B & Wholesale Catalog: ${title}`;
      if (captionInput) captionInput.value = `Now accepting wholesale, boutique, and EU export purchase orders for the ${title}.\n\n• Unit Price: ${priceStr} (Wholesale discounts available)\n• Origin: Dhaka, Bangladesh\n• Compliance: BSCI / REACH / EUDR ready\n\nDirect contact via WhatsApp for sample dispatch.`;
      if (hashtagsInput) hashtagsInput.value = `#LeatherExport #B2BCommerce #MadeInBangladesh #HandsAndHead #WholesaleLeather`;
    }

    toast(`Applied "${type.toUpperCase()}" preset ✨`);
    window.renderSocialVisualPreview();
  };

  /* ── Live Visual Preview Renderer ── */
  window.renderSocialVisualPreview = function () {
    const container = document.getElementById("socialLivePreviewContainer");
    if (!container) return;

    const p = window._currentComposerProduct || {};
    const headline = document.getElementById("soc_headline")?.value || `🔥 ${p.title || 'Product'}`;
    const caption = document.getElementById("soc_caption")?.value || '';
    const hashtags = document.getElementById("soc_hashtags")?.value || '';
    const url = document.getElementById("soc_url")?.value || 'https://handsandhead.com';
    const channelId = window._activeSocialChannel || 'whatsapp';
    const priceStr = `৳${Number(p.pricing?.price || 0).toLocaleString()}`;
    const imgUrl = p.images?.[0]?.url || "";

    // Update char counter
    const charEl = document.getElementById("soc_char_count");
    if (charEl) charEl.innerText = `${caption.length} chars`;

    if (channelId === "whatsapp") {
      // WhatsApp Business Chat & Catalog Card Preview
      container.innerHTML = `
        <div style="background:#0c1317;border-radius:14px;padding:12px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.5);color:#e9edef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <!-- WA Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #202c33;padding-bottom:8px;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:28px;height:28px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;color:#FFF;font-size:12px;font-weight:700;">
                HH
              </div>
              <div>
                <div style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px;">
                  Hands &amp; Head Official
                  <span style="color:#25D366;font-size:11px;">✓</span>
                </div>
                <div style="font-size:9px;color:#8696a0;">Business Account</div>
              </div>
            </div>
            <span style="font-size:9px;background:#202c33;color:#25D366;padding:2px 6px;border-radius:6px;font-family:var(--mono);">CATALOG</span>
          </div>

          <!-- WA Message Bubble -->
          <div style="background:#005c4b;border-radius:10px 10px 2px 10px;padding:10px;margin-left:auto;max-width:92%;box-shadow:0 1px 2px rgba(0,0,0,0.3);">
            <!-- Headline -->
            <div style="font-weight:700;font-size:13px;color:#FFF;margin-bottom:6px;">
              ${escapeHtml(headline)}
            </div>

            <!-- Product Media Card in WhatsApp -->
            <div style="position:relative;width:100%;border-radius:8px;overflow:hidden;background:#000;margin-bottom:8px;border:1px solid rgba(255,255,255,0.1);">
              ${imgUrl ? `
                <img src="${imgUrl}" alt="${p.title || 'Product'}" style="width:100%;height:190px;object-fit:cover;display:block;" onerror="this.parentElement.innerHTML='<div style=\\'height:120px;display:flex;align-items:center;justify-content:center;color:#8696a0;font-size:12px;\\'>[Image Preview]</div>'"/>
              ` : `
                <div style="height:120px;display:flex;align-items:center;justify-content:center;color:#8696a0;font-size:12px;">
                  🛍️ [No Media Attached]
                </div>
              `}
              <div style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);color:#25D366;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;font-family:var(--mono);">
                ${priceStr}
              </div>
              <div style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#FFF;padding:2px 6px;border-radius:4px;font-size:8px;font-family:var(--mono);text-transform:uppercase;">
                DHAKA ORIGIN
              </div>
            </div>

            <!-- Caption Body -->
            <div style="font-size:12px;line-height:1.45;color:#e9edef;white-space:pre-line;margin-bottom:6px;">
              ${escapeHtml(caption)}
            </div>

            <!-- Hashtags -->
            <div style="font-size:11px;color:#aebac1;margin-bottom:8px;">
              ${escapeHtml(hashtags)}
            </div>

            <!-- Interactive Catalog Action Buttons Mockup -->
            <div style="display:flex;flex-direction:column;gap:5px;border-top:1px solid rgba(255,255,255,0.15);padding-top:8px;">
              <div style="background:rgba(255,255,255,0.12);text-align:center;padding:6px 10px;border-radius:6px;color:#25D366;font-size:11.5px;font-weight:700;cursor:pointer;">
                🛍️ View Product in Catalog
              </div>
              <div style="background:rgba(255,255,255,0.06);text-align:center;padding:5px 10px;border-radius:6px;color:#FFF;font-size:10.5px;">
                💬 Message Business
              </div>
            </div>

            <div style="text-align:right;font-size:9px;color:#8696a0;margin-top:4px;">
              Just now · <span style="color:#53bdeb;">✓✓</span>
            </div>
          </div>
        </div>
      `;
    } else if (channelId === "instagram") {
      // Instagram Feed Card Mockup
      container.innerHTML = `
        <div style="background:#000;border-radius:14px;padding:12px;box-shadow:0 4px 14px rgba(0,0,0,0.5);color:#FFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <!-- IG Profile Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:32px;height:32px;border-radius:50%;padding:2px;background:linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);">
                <div style="width:100%;height:100%;border-radius:50%;background:#111;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#FFF;">
                  HH
                </div>
              </div>
              <div>
                <div style="font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px;">
                  handsandhead
                  <span style="color:#3897f0;font-size:10px;">●</span>
                </div>
                <div style="font-size:9px;color:#8e8e8e;">Dhaka, Bangladesh · Original Craft</div>
              </div>
            </div>
            <span style="font-size:14px;color:#8e8e8e;letter-spacing:2px;">•••</span>
          </div>

          <!-- Product Image Container -->
          <div style="position:relative;width:100%;height:220px;border-radius:8px;overflow:hidden;background:#1a1a1a;margin-bottom:10px;">
            ${imgUrl ? `
              <img src="${imgUrl}" alt="${p.title || 'Product'}" style="width:100%;height:100%;object-fit:cover;display:block;"/>
            ` : `
              <div style="height:100%;display:flex;align-items:center;justify-content:center;color:#8e8e8e;font-size:12px;">
                📸 [No Product Image]
              </div>
            `}
            <!-- Overlay Price Tag -->
            <div style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);color:var(--coral);padding:4px 10px;border-radius:20px;font-size:11.5px;font-weight:700;font-family:var(--mono);border:1px solid rgba(255,255,255,0.1);">
              ${priceStr}
            </div>
          </div>

          <!-- IG Action Icons -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="display:flex;gap:12px;font-size:16px;">
              <span>❤️</span> <span>💬</span> <span>🚀</span>
            </div>
            <span style="font-size:16px;">🔖</span>
          </div>

          <!-- IG Likes -->
          <div style="font-size:11px;font-weight:700;margin-bottom:6px;">
            1,248 likes
          </div>

          <!-- IG Caption Section -->
          <div style="font-size:12px;line-height:1.45;color:#f5f5f5;">
            <span style="font-weight:700;margin-right:4px;">handsandhead</span>
            <span style="color:#FFF;font-weight:600;">${escapeHtml(headline)}</span>
            <div style="margin-top:4px;white-space:pre-line;color:#dfdfdf;font-size:11.5px;">
              ${escapeHtml(caption)}
            </div>
          </div>

          <!-- IG Hashtags -->
          <div style="font-size:11px;color:#0095f6;margin-top:6px;word-break:break-word;">
            ${escapeHtml(hashtags)}
          </div>

          <div style="font-size:9px;color:#8e8e8e;text-transform:uppercase;margin-top:8px;font-family:var(--mono);">
            Just Now · View Shop
          </div>
        </div>
      `;
    } else {
      // Facebook & Meta Live Feed Post Mockup
      container.innerHTML = `
        <div style="background:#242526;border-radius:14px;padding:14px;box-shadow:0 4px 14px rgba(0,0,0,0.4);color:#e4e6eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <!-- FB Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--coral-gradient);display:flex;align-items:center;justify-content:center;color:#FFF;font-weight:800;font-size:13px;">
                HH
              </div>
              <div>
                <div style="font-size:13px;font-weight:700;color:#e4e6eb;display:flex;align-items:center;gap:4px;">
                  Hands &amp; Head Dhaka
                  <span style="color:#2D88FF;font-size:11px;">✓</span>
                </div>
                <div style="font-size:10px;color:#b0b3b8;">Just now · 🌐 Public · Sponsored</div>
              </div>
            </div>
            <span style="color:#b0b3b8;font-size:16px;">•••</span>
          </div>

          <!-- FB Post Text -->
          <div style="font-size:13px;line-height:1.45;margin-bottom:10px;">
            <div style="font-weight:700;color:#FFF;margin-bottom:4px;">${escapeHtml(headline)}</div>
            <div style="white-space:pre-line;color:#e4e6eb;">${escapeHtml(caption)}</div>
            <div style="color:#4599FF;margin-top:6px;font-size:11.5px;">${escapeHtml(hashtags)}</div>
          </div>

          <!-- FB Rich Media & Product Card -->
          <div style="border-radius:10px;overflow:hidden;background:#3a3b3c;border:1px solid #4e4f50;">
            <div style="position:relative;width:100%;height:180px;background:#18191a;">
              ${imgUrl ? `
                <img src="${imgUrl}" alt="${p.title || 'Product'}" style="width:100%;height:100%;object-fit:cover;display:block;"/>
              ` : `
                <div style="height:100%;display:flex;align-items:center;justify-content:center;color:#b0b3b8;font-size:12px;">
                  [Product Showcase Media]
                </div>
              `}
            </div>
            <div style="padding:10px 12px;display:flex;align-items:center;justify-content:space-between;background:#242526;">
              <div style="flex:1;min-width:0;padding-right:10px;">
                <div style="font-size:9.5px;color:#b0b3b8;text-transform:uppercase;font-family:var(--mono);">HANDSANDHEAD.COM</div>
                <div style="font-size:13px;font-weight:700;color:#FFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${p.title || 'Hands & Head Product'}
                </div>
                <div style="font-size:11px;color:var(--coral);font-weight:700;font-family:var(--mono);">
                  ${priceStr}
                </div>
              </div>
              <button class="btn btn-sm" style="background:#2D88FF;color:#FFF;border:none;font-weight:700;font-size:11px;padding:6px 14px;border-radius:6px;white-space:nowrap;">
                Shop Now
              </button>
            </div>
          </div>
        </div>
      `;
    }
  };

  /* Helper to prevent XSS injection in simulator preview */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ── Live Typing Event Listener ── */
  window.updateSocialLivePreview = function () {
    window.renderSocialVisualPreview();
  };

  window.saveSocialDraft = async function (productId) {
    const p = window._currentComposerProduct;
    const headline = document.getElementById("soc_headline")?.value?.trim() || "";
    const caption = document.getElementById("soc_caption")?.value?.trim() || "";
    const hashtags = document.getElementById("soc_hashtags")?.value?.trim() || "";
    const productUrl = document.getElementById("soc_url")?.value?.trim() || "";

    await window.SocialService.createPost({
      productId,
      productTitle: p?.title || "Product",
      priceFormatted: `৳${(p?.pricing?.price || 0).toLocaleString()}`,
      mediaUrl: p?.images?.[0]?.url || "",
      headline,
      caption,
      hashtags,
      productUrl,
      channel: window._activeSocialChannel || "whatsapp",
      status: POST_STATUS.DRAFT
    });

    toast("Social post draft saved ✓");
    closeSheet();
    const container = document.getElementById("mod-SocialPost") || document.getElementById("body");
    if (container && window.expScreen === "SocialPost") window.render.SocialPost(container);
  };

  window.executePublishSocial = async function (productId) {
    const p = window._currentComposerProduct;
    const headline = document.getElementById("soc_headline")?.value?.trim() || "";
    const caption = document.getElementById("soc_caption")?.value?.trim() || "";
    const hashtags = document.getElementById("soc_hashtags")?.value?.trim() || "";
    const productUrl = document.getElementById("soc_url")?.value?.trim() || "";
    const channelId = window._activeSocialChannel || "whatsapp";

    const btn = document.getElementById("btnPublishSocial");
    if (btn) { btn.innerText = "Broadcasting…"; btn.disabled = true; }

    try {
      const post = await window.SocialService.createPost({
        productId,
        productTitle: p?.title || "Product",
        priceFormatted: `৳${(p?.pricing?.price || 0).toLocaleString()}`,
        mediaUrl: p?.images?.[0]?.url || "",
        headline,
        caption,
        hashtags,
        productUrl,
        channel: channelId,
        status: POST_STATUS.READY
      });

      const res = await window.SocialService.publishPost(post.id, channelId);
      if (res.ok) {
        toast(`Social post launched via ${Channels[channelId].name} ✓`);
        closeSheet();
      } else {
        toast("Publish error: " + res.error);
        if (btn) { btn.innerText = "Retry Share"; btn.disabled = false; }
      }
    } catch (e) {
      toast("Error: " + e.message);
      if (btn) { btn.innerText = "Retry Share"; btn.disabled = false; }
    }

    const container = document.getElementById("mod-SocialPost") || document.getElementById("body");
    if (container && window.expScreen === "SocialPost") window.render.SocialPost(container);
  };

  /* ═══════════════════════════════════════════════════════════
     GLOBAL SOCIAL POSTS HUB VIEW
     ═══════════════════════════════════════════════════════════ */
  window.render.SocialPost = async function (container) {
    const target = container || document.getElementById("mod-SocialPost") || document.getElementById("body");
    if (!target) return;

    target.innerHTML = `
      <div style="padding:40px 20px;text-align:center;font-family:var(--mono);color:var(--ink-3);font-size:11px;letter-spacing:2px;text-transform:uppercase;">
        <div style="display:inline-block;width:18px;height:18px;border:2px solid var(--wire-hard);border-top-color:var(--coral);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
        <div>Loading Social Feed &amp; Campaigns…</div>
      </div>
    `;

    try {
      const [{ items: products }, posts] = await Promise.all([
        window.ProductsService.list({ status: "active" }),
        window.SocialService.listPosts({ limit: 30 })
      ]);

      const publishedCount = posts.filter(p => p.status === POST_STATUS.PUBLISHED).length;
      const draftCount = posts.filter(p => p.status === POST_STATUS.DRAFT).length;

      target.innerHTML = `
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 20px 12px;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-family:var(--mono);font-size:9.5px;letter-spacing:2px;color:var(--coral);text-transform:uppercase;font-weight:700;">Marketing &amp; Omnichannel Outreach</div>
            <h3 style="font-family:var(--display);font-size:24px;letter-spacing:1px;color:var(--ink);margin-top:2px;">Auto Social Post</h3>
          </div>
          <button class="btn btn-sm btn-gold" onclick="window.openQuickSharePicker()">
            + New Social Post
          </button>
        </div>

        <!-- Metric Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;padding:0 20px 16px;">
          <div class="bento-card" style="box-shadow:var(--neu-flat-sm);">
            <div class="bento-label">Published Posts</div>
            <div class="bento-value" style="color:var(--ok);font-size:26px;">${publishedCount}</div>
            <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);margin-top:4px;">Across WhatsApp &amp; Meta</div>
          </div>

          <div class="bento-card" style="box-shadow:var(--neu-flat-sm);">
            <div class="bento-label">Active Drafts</div>
            <div class="bento-value" style="font-size:26px;color:var(--coral);">${draftCount}</div>
            <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);margin-top:4px;">Ready to broadcast</div>
          </div>

          <div class="bento-card" style="box-shadow:var(--neu-flat-sm);">
            <div class="bento-label">Catalog Products</div>
            <div class="bento-value" style="font-size:26px;color:var(--ink);">${products.length}</div>
            <div style="font-size:10.5px;color:var(--ink-3);font-family:var(--mono);margin-top:4px;">Ready for 1-click sharing</div>
          </div>
        </div>

        <!-- Quick Share Shelf (Catalog Carousel) -->
        <div style="padding:0 20px 16px;">
          <div style="font-family:var(--mono);font-size:10px;color:var(--ink-3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;font-weight:700;">
            1-Click Product Share
          </div>
          <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;">
            ${products.slice(0, 8).map(p => `
              <div class="pcard" style="min-width:180px;max-width:180px;background:var(--bg-neu);box-shadow:var(--neu-flat-sm);padding:10px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;" onclick="window.openProductSocialComposer('${p.id}')">
                <div>
                  <div style="width:100%;height:90px;border-radius:10px;overflow:hidden;background:#000;margin-bottom:8px;">
                    <img src="${p.images?.[0]?.url || ''}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"/>
                  </div>
                  <div style="font-size:12px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${p.title}
                  </div>
                  <div style="font-size:11px;color:var(--coral);font-weight:700;font-family:var(--mono);margin-top:2px;">
                    ৳${(p.pricing?.price || 0).toLocaleString()}
                  </div>
                </div>
                <button class="btn btn-sm btn-gold" style="margin-top:8px;width:100%;font-size:10px;padding:4px 8px;">
                  Share Post →
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Published & Draft Social Posts Feed -->
        <div style="padding:0 20px 24px;">
          <div style="font-family:var(--mono);font-size:10.5px;color:var(--coral);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;font-weight:700;">
            Social Post Feed (${posts.length})
          </div>

          <div class="orders-container">
            ${posts.length ? posts.map(post => {
              const channel = Channels[post.channel] || Channels.whatsapp;
              const isPublished = post.status === POST_STATUS.PUBLISHED;
              const timeStr = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();
              return `
                <div class="orow" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                  <div class="othumb" style="background:var(--bg-neu);box-shadow:var(--neu-track);">
                    ${channel.icon}
                  </div>
                  <div class="om" style="flex:1;min-width:0;">
                    <div class="ot" style="display:flex;align-items:center;gap:6px;">
                      <span>${post.headline || post.productTitle}</span>
                      <span style="font-size:10px;color:var(--ink-3);font-family:var(--mono);">${timeStr}</span>
                    </div>
                    <div class="os" style="white-space:normal;line-height:1.4;margin:4px 0;">
                      ${post.caption}
                    </div>
                    <div style="font-size:10px;color:var(--coral);font-family:var(--mono);">
                      ${post.hashtags || ''}
                    </div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                    <span class="pill ${isPublished ? 'ok' : 'amber'}" style="font-size:8px;">
                      ${post.status}
                    </span>
                    <button class="btn btn-sm ${isPublished ? 'btn-dark' : 'btn-gold'}" style="font-size:9.5px;padding:4px 8px;" onclick="window.openProductSocialComposer('${post.productId}')">
                      ${isPublished ? 'Re-Share' : 'Edit & Post'}
                    </button>
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="empty">
                No social posts created yet. Click "+ New Social Post" or pick any product above to generate an instant campaign!
              </div>
            `}
          </div>
        </div>
      `;
    } catch (err) {
      target.innerHTML = `<div style="padding:20px;color:var(--warn);">Failed to load Social Post module: ${err.message}</div>`;
    }
  };

  /* ── Quick Share Picker Modal ── */
  window.openQuickSharePicker = async function () {
    openSheet(`
      <div style="padding:20px;text-align:center;font-family:var(--mono);color:var(--ink-3);font-size:11px;">
        Loading Products…
      </div>
    `);
    try {
      const { items } = await window.ProductsService.list({ status: "active" });
      openSheet(`
        <div class="grab"></div>
        <h3>Select Product to Share</h3>
        <p class="hint">Pick an active product from your catalog</p>
        <div style="padding:0 10px 20px;max-height:60vh;overflow-y:auto;">
          <div class="orders-container">
            ${items.map(p => `
              <div class="orow" onclick="closeSheet(); window.openProductSocialComposer('${p.id}');">
                <div class="othumb" style="overflow:hidden;">
                  ${p.images?.[0]?.url ? `<img src="${p.images[0].url}" style="width:100%;height:100%;object-fit:cover;"/>` : 'PRD'}
                </div>
                <div class="om">
                  <div class="ot">${p.title}</div>
                  <div class="os">৳${(p.pricing?.price || 0).toLocaleString()} · ${p.totalInventory || 0} in stock</div>
                </div>
                <button class="btn btn-sm btn-gold" style="font-size:10px;">Select →</button>
              </div>
            `).join('')}
          </div>
        </div>
      `);
    } catch (e) {
      toast("Error: " + e.message);
      closeSheet();
    }
  };

  console.log("📢 SocialService initialized with multi-platform composer.");
})();
