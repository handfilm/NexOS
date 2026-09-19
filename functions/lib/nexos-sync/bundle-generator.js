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
exports.serveCatalogBundleHttp = exports.generateCatalogBundle = void 0;
exports.buildCatalogBundleBuffer = buildCatalogBundleBuffer;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("./logger");
const logger = new logger_1.NexosLogger('BundleGenerator');
function getDb() {
    return admin.firestore();
}
/**
 * Generates a Firestore Data Bundle containing active catalog products.
 * Returns the raw binary bundle Buffer.
 */
async function buildCatalogBundleBuffer() {
    const db = getDb();
    const bundle = db.bundle('catalog-active-v1');
    // Query top active export products ordered by featuredScore
    const query = db
        .collection('federated_catalog')
        .where('status', '==', 'ACTIVE')
        .orderBy('featuredScore', 'desc')
        .limit(100);
    const querySnap = await query.get();
    logger.info(`Building bundle with ${querySnap.size} active catalog documents`, {
        action: 'BUILD_BUNDLE_QUERY',
        metadata: { docCount: querySnap.size },
    });
    const bundleBuffer = bundle
        .add('top-active-catalog', querySnap)
        .build();
    return bundleBuffer;
}
/**
 * Scheduled Cloud Function (2nd-Gen): Runs every 10 minutes.
 * Assembles the Firestore Bundle and persists it to Google Cloud Storage
 * with public CDN cache headers (Cache-Control: public, max-age=300, s-maxage=600).
 *
 * Saves 15,000 concurrent buyers from issuing per-user Firestore read requests on page load.
 */
exports.generateCatalogBundle = (0, scheduler_1.onSchedule)({
    schedule: 'every 10 minutes',
    timeZone: 'Asia/Dhaka',
    region: 'asia-east1',
    memory: '512MiB',
    timeoutSeconds: 300,
}, async () => {
    logger.info('Scheduled catalog bundle generation triggered', {
        action: 'BUNDLE_GEN_START',
    });
    try {
        const bundleBuffer = await buildCatalogBundleBuffer();
        // Cloud Storage bucket designation
        const projectId = process.env.GCLOUD_PROJECT ||
            (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : '') ||
            'handsandhead-nexus';
        const bucketName = process.env.CATALOG_CDN_BUCKET || `${projectId}.firebasestorage.app`;
        const bucket = admin.storage().bucket(bucketName);
        const destinationPath = 'bundles/latest-catalog.bundle';
        const file = bucket.file(destinationPath);
        await file.save(bundleBuffer, {
            contentType: 'application/octet-stream',
            public: true,
            metadata: {
                cacheControl: 'public, max-age=300, s-maxage=600',
                metadata: {
                    generatedAt: new Date().toISOString(),
                    generator: 'nexos-sync-pipeline-bundle-generator',
                },
            },
        });
        logger.info('Successfully wrote Firestore bundle to Cloud Storage / CDN', {
            action: 'BUNDLE_GEN_SUCCESS',
            metadata: {
                bucketName,
                destinationPath,
                sizeBytes: bundleBuffer.length,
            },
        });
    }
    catch (err) {
        logger.critical('Failed to generate and store catalog bundle', err, {
            action: 'BUNDLE_GEN_FAILED',
        });
        throw err;
    }
});
/**
 * On-demand HTTP Endpoint for the Firestore Bundle:
 * Serves the bundle directly over HTTPS with HTTP cache headers,
 * serving as a direct fallback if client cannot access Cloud Storage bucket directly.
 */
exports.serveCatalogBundleHttp = (0, https_1.onRequest)({
    region: 'asia-east1',
    cors: true,
    maxInstances: 20,
}, async (req, res) => {
    try {
        const bundleBuffer = await buildCatalogBundleBuffer();
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
        res.setHeader('Content-Length', bundleBuffer.length.toString());
        res.status(200).send(bundleBuffer);
    }
    catch (err) {
        logger.error('Error serving catalog bundle over HTTP', err);
        res.status(500).send('Bundle Generation Error');
    }
});
//# sourceMappingURL=bundle-generator.js.map