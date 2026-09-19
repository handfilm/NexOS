"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProductEvent = void 0;
exports.calculateWholesaleTiers = calculateWholesaleTiers;
exports.deriveProvenanceAndMoq = deriveProvenanceAndMoq;
exports.transformToB2BProduct = transformToB2BProduct;
const pubsub_1 = require("firebase-functions/v2/pubsub");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("./logger");
const logger = new logger_1.NexosLogger('ProductNormalizer');
function getDb() {
    return admin.firestore();
}
/**
 * Parses numeric price from flexible string/number inputs (e.g. "$120.00", "120", 120.50).
 */
function parsePrice(val) {
    if (typeof val === 'number' && !isNaN(val))
        return Math.max(0, val);
    if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : Math.max(0, num);
    }
    return 0;
}
/**
 * Normalizes strings into valid, clean slugs and handles.
 */
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '')
        .replace(/-+/g, '-');
}
/**
 * Calculates a 3-tier wholesale volume price ladder from retail price.
 * Tiers: 500 units, 2,000 units, 10,000 units.
 * Percentages read from environment variables:
 * - TIER1_DISCOUNT_PCT (default: 12%)
 * - TIER2_DISCOUNT_PCT (default: 22%)
 * - TIER3_DISCOUNT_PCT (default: 35%)
 */
function calculateWholesaleTiers(retailPrice) {
    const discount1 = Math.min(90, Math.max(1, Number(process.env.TIER1_DISCOUNT_PCT || 12)));
    const discount2 = Math.min(90, Math.max(discount1 + 1, Number(process.env.TIER2_DISCOUNT_PCT || 22)));
    const discount3 = Math.min(95, Math.max(discount2 + 1, Number(process.env.TIER3_DISCOUNT_PCT || 35)));
    const unit1 = Math.round(retailPrice * (1 - discount1 / 100) * 100) / 100;
    const unit2 = Math.round(retailPrice * (1 - discount2 / 100) * 100) / 100;
    const unit3 = Math.round(retailPrice * (1 - discount3 / 100) * 100) / 100;
    const tier1 = {
        tierNumber: 1,
        minQuantity: 500,
        discountPercentage: discount1,
        unitPriceUsd: unit1,
        totalTierCostUsd: Math.round(unit1 * 500 * 100) / 100,
    };
    const tier2 = {
        tierNumber: 2,
        minQuantity: 2000,
        discountPercentage: discount2,
        unitPriceUsd: unit2,
        totalTierCostUsd: Math.round(unit2 * 2000 * 100) / 100,
    };
    const tier3 = {
        tierNumber: 3,
        minQuantity: 10000,
        discountPercentage: discount3,
        unitPriceUsd: unit3,
        totalTierCostUsd: Math.round(unit3 * 10000 * 100) / 100,
    };
    return [tier1, tier2, tier3];
}
/**
 * Derives Minimum Order Quantity (MOQ) and Bangladesh Provenance Certification Badge
 * based on the node origin and material/composition indicators.
 */
function deriveProvenanceAndMoq(origin, materials, category, retailPrice) {
    const isLeather = origin === 'arutemika.com' ||
        materials.some((m) => /leather|cowhide|calfskin|hide|suede|tannery/i.test(m)) ||
        /leather|bag|wallet|footwear|jacket/i.test(category);
    if (isLeather) {
        // High-ticket artisanal leather goods from Savar / Hazaribagh cluster
        const moq = retailPrice > 100 ? 100 : 250;
        const provenance = {
            badgeId: 'PROV-BD-LEATHER-SAVAR',
            badgeLabel: 'Artisanal Tannery Certified • Hazaribagh & Savar Traceable Leather',
            certificationAuthority: 'Dhaka Leather Goods Guild & BSTI Export Standard',
            originRegion: 'Savar Tannery Estate, Dhaka Division, Bangladesh',
            traceabilityGrade: 'A_PLUS_ARTISANAL',
            materialCompliance: [
                'LWG Audited Tannery Raw Sourcing',
                'REACH Annex XVII Certified',
                'Zero Chromium IV Discharge Standard',
                'Full-Grain Buffalo/Cowhide Authenticated',
            ],
            ecoScore: 94,
        };
        return { provenance, moq, leadTimeDays: 28, hsCode: '4202.21.00' };
    }
    // Ready-Made Garments & Textiles (shop.handsandhead.com / BayXBengal cluster)
    const moq = 500;
    const provenance = {
        badgeId: 'PROV-BD-RMG-BAYXBENGAL',
        badgeLabel: 'BayXBengal Export Standard • OEKO-TEX Cotton & Jute Certified',
        certificationAuthority: 'BGMEA & Accord Bangladesh Safety Inspection Directive',
        originRegion: 'Dhaka & Chittagong Industrial Export Processing Zones, Bangladesh',
        traceabilityGrade: 'EXPORT_GRADE_CLASS_A',
        materialCompliance: [
            'OEKO-TEX Standard 100 Certified',
            'GOTS Organic Cotton Blend Standard',
            'Fair Trade Sourced Bangladesh Jute',
            'Structural Accord Inspection Compliant',
        ],
        ecoScore: 91,
    };
    return { provenance, moq, leadTimeDays: 21, hsCode: '6109.10.00' };
}
/**
 * Transforms raw D2C payload from either node into canonical B2BProduct.
 */
function transformToB2BProduct(origin, raw, existingSyncVersion = 0) {
    let sku = '';
    let title = '';
    let description = '';
    let category = 'Uncategorized';
    let retailPrice = 0;
    let images = [];
    let materials = [];
    let tags = [];
    let rawSourceUrl = '';
    let inventory = 0;
    let inStock = true;
    const specifications = {};
    if (origin === 'arutemika.com') {
        sku = String(raw.sku || raw.article_number || raw.product_id || '').trim();
        title = String(raw.title || raw.name || 'Arutemika Leather Product').trim();
        description = String(raw.description || raw.body_html || '').replace(/<[^>]*>?/gm, '').trim();
        category = String(raw.category || raw.product_type || 'Leather Goods').trim();
        retailPrice = parsePrice(raw.sale_price || raw.price);
        rawSourceUrl = String(raw.storefront_url || raw.permalink || (sku ? `https://arutemika.com/products/${sku}` : 'https://arutemika.com')).trim();
        if (Array.isArray(raw.images)) {
            images = raw.images.map((img) => (typeof img === 'string' ? img : img.src)).filter(Boolean);
        }
        if (raw.leather_type) {
            materials.push(String(raw.leather_type));
            specifications['leatherType'] = raw.leather_type;
        }
        if (raw.tannery_location) {
            specifications['tanneryLocation'] = raw.tannery_location;
        }
        if (raw.leather_grade) {
            specifications['leatherGrade'] = raw.leather_grade;
        }
        if (raw.tags) {
            tags = Array.isArray(raw.tags) ? raw.tags : String(raw.tags).split(',').map((t) => t.trim());
        }
        inventory = Number(raw.available_stock ?? raw.stock ?? 100);
        inStock = inventory > 0;
    }
    else {
        // shop.handsandhead.com (Google Drive JSON)
        sku = String(raw.sku || raw.id || raw.itemCode || '').trim();
        title = String(raw.title || raw.name || 'Hands & Head Export Item').trim();
        description = String(raw.description || '').trim();
        category = String(raw.category || raw.type || 'Apparel & Textiles').trim();
        retailPrice = parsePrice(raw.price || raw.retailPrice);
        rawSourceUrl = String(raw.d2cUrl || raw.url || (sku ? `https://shop.handsandhead.com/products/${sku}` : 'https://shop.handsandhead.com')).trim();
        if (Array.isArray(raw.images)) {
            images = raw.images.filter(Boolean);
        }
        else if (raw.imageUrl) {
            images = [raw.imageUrl];
        }
        if (raw.materials) {
            materials = Array.isArray(raw.materials) ? raw.materials : String(raw.materials).split(',').map((m) => m.trim());
        }
        if (raw.tags) {
            tags = Array.isArray(raw.tags) ? raw.tags : String(raw.tags).split(',').map((t) => t.trim());
        }
        if (raw.specs || raw.specifications) {
            Object.assign(specifications, raw.specs || raw.specifications);
        }
        inventory = Number(raw.inventory ?? raw.stock ?? 250);
        inStock = raw.inStock !== false && inventory > 0;
    }
    // Fallback fallback SKU generation if not provided
    if (!sku) {
        sku = `AUTO-${slugify(title).slice(0, 16)}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const cleanOriginPrefix = origin.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanSkuSuffix = sku.replace(/[^a-zA-Z0-9_-]/g, '_');
    const catalogId = `${cleanOriginPrefix}_${cleanSkuSuffix}`;
    const wholesaleLadder = calculateWholesaleTiers(retailPrice);
    const { provenance, moq, leadTimeDays, hsCode } = deriveProvenanceAndMoq(origin, materials, category, retailPrice);
    const thumbnailUrl = images[0] || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
    const handle = slugify(`${sku}-${title}`);
    const originDisplayName = origin === 'arutemika.com'
        ? 'Arutemika Leather Studio'
        : 'Hands & Head Headless Atelier';
    const product = {
        id: catalogId,
        sku,
        title,
        handle,
        description: description || `${title} — Export grade manufacturing and wholesale distribution by Hands & Head.`,
        category,
        origin,
        originDisplayName,
        status: inStock ? 'ACTIVE' : 'OUT_OF_STOCK',
        retailPriceUsd: retailPrice,
        currency: 'USD',
        moq,
        wholesalePriceLadder: wholesaleLadder,
        provenance,
        images: images.length > 0 ? images : [thumbnailUrl],
        thumbnailUrl,
        materials: materials.length > 0 ? materials : ['Cotton/Leather Composite'],
        tags,
        specifications,
        inventoryCount: inventory,
        inStock,
        leadTimeDays,
        hsCode,
        syncVersion: existingSyncVersion + 1,
        redirectUrlPath: `/api/redirect/${catalogId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        featuredScore: Math.round(retailPrice * (provenance.ecoScore / 100)),
    };
    const privateMetadata = {
        catalogId,
        origin,
        privateSourceUrl: rawSourceUrl,
        supplierCostUsd: Math.round(wholesaleLadder[2].unitPriceUsd * 0.7 * 100) / 100, // Est. factory cost baseline
        rawPayloadSnapshot: raw,
        updatedAt: new Date().toISOString(),
    };
    return { product, privateMetadata };
}
/**
 * Pub/Sub Triggered 2nd-Gen Cloud Function:
 * Consumes raw events from `raw-product-events`.
 * Transforms and executes idempotent atomic writes into Firestore `federated_catalog`
 * while strictly segregating private D2C URLs into `federated_catalog_private`.
 */
exports.normalizeProductEvent = (0, pubsub_1.onMessagePublished)({
    topic: process.env.RAW_PRODUCT_EVENTS_TOPIC || 'raw-product-events',
    region: 'asia-east1',
    maxInstances: 20,
    secrets: [
        'TIER1_DISCOUNT_PCT',
        'TIER2_DISCOUNT_PCT',
        'TIER3_DISCOUNT_PCT',
    ],
}, async (event) => {
    const rawMessageData = event.data.message.data
        ? Buffer.from(event.data.message.data, 'base64').toString('utf-8')
        : '{}';
    let productEvent;
    try {
        productEvent = JSON.parse(rawMessageData);
    }
    catch (parseErr) {
        logger.error('Failed to parse Pub/Sub raw message data as JSON', parseErr, {
            action: 'MESSAGE_PARSE_FAILED',
            metadata: { rawData: rawMessageData },
        });
        return;
    }
    const { origin, rawPayload, eventId } = productEvent;
    if (!origin || !rawPayload) {
        logger.warn('Pub/Sub event missing required origin or rawPayload attributes. Skipping.', {
            action: 'INVALID_EVENT_DROPPED',
            eventId,
        });
        return;
    }
    logger.info(`Starting normalization for event ${eventId} from ${origin}`, {
        action: 'NORMALIZE_START',
        eventId,
        origin,
    });
    const db = getDb();
    try {
        // Step 1: Pre-calculate candidate catalog ID
        const tentativeSku = String(rawPayload.sku ||
            rawPayload.id ||
            rawPayload.article_number ||
            rawPayload.product_id ||
            '').trim();
        const cleanOrigin = origin.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanTentativeSku = tentativeSku.replace(/[^a-zA-Z0-9_-]/g, '_') || `tmp_${Date.now()}`;
        const catalogId = `${cleanOrigin}_${cleanTentativeSku}`;
        const publicDocRef = db.collection('federated_catalog').doc(catalogId);
        const privateDocRef = db.collection('federated_catalog_private').doc(catalogId);
        // Step 2: Idempotent Atomic Commit via Transaction
        const committedProduct = await db.runTransaction(async (transaction) => {
            const existingSnap = await transaction.get(publicDocRef);
            let existingVersion = 0;
            let originalCreatedAt = admin.firestore.FieldValue.serverTimestamp();
            if (existingSnap.exists) {
                const existingData = existingSnap.data() || {};
                existingVersion = Number(existingData.syncVersion || 0);
                originalCreatedAt = existingData.createdAt || originalCreatedAt;
            }
            const { product, privateMetadata } = transformToB2BProduct(origin, rawPayload, existingVersion);
            // Ensure real catalog ID aligns
            const finalPublicRef = db.collection('federated_catalog').doc(product.id);
            const finalPrivateRef = db.collection('federated_catalog_private').doc(product.id);
            const serverTs = admin.firestore.FieldValue.serverTimestamp();
            // Write Public B2B Catalog Document (Safe for hydration, no raw internal D2C URL)
            transaction.set(finalPublicRef, {
                ...product,
                createdAt: existingSnap.exists ? originalCreatedAt : serverTs,
                updatedAt: serverTs,
                lastSyncedAt: serverTs,
            });
            // Write Private Metadata Document (Internal server only, zero client access)
            transaction.set(finalPrivateRef, {
                ...privateMetadata,
                updatedAt: serverTs,
            });
            return product;
        });
        logger.info(`Successfully normalized & synced product: ${committedProduct.id} (v${committedProduct.syncVersion})`, {
            action: 'NORMALIZE_COMMITTED',
            catalogId: committedProduct.id,
            origin: committedProduct.origin,
            metadata: {
                retailPrice: committedProduct.retailPriceUsd,
                ladder: committedProduct.wholesalePriceLadder,
                moq: committedProduct.moq,
                badge: committedProduct.provenance.badgeLabel,
                syncVersion: committedProduct.syncVersion,
            },
        });
    }
    catch (err) {
        logger.critical(`Transaction failed while normalizing product event ${eventId}`, err, {
            action: 'NORMALIZE_TRANSACTION_FAILED',
            eventId,
            origin,
        });
        // Throwing error allows Pub/Sub to retry, or dead-letter queue routing if retries expire
        throw err;
    }
});
//# sourceMappingURL=normalizer.js.map