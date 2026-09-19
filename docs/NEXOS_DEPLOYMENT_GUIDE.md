# NEXOS Automated Sync Pipeline: Deployment & Operations Guide
**Architecture Version:** 2.4.0 • **Target Ecosystem:** Bangladesh Export Trade Matrix (15,000 Buyers, 3,000 Suppliers)

---

## 1. System Topology Overview

The NEXOS Sync Pipeline synchronizes raw D2C catalogs into a canonical B2B wholesale exchange across four distributed nodes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           4-NODE TOPOLOGY MATRIX                            │
└─────────────────────────────────────────────────────────────────────────────┘

  [Node 3: shop.handsandhead.com]                  [Node 4: arutemika.com]
    (Headless D2C • Google Drive JSON)               (Artisanal Leather Storefront)
                     │                                              │
       Changes API   │ (Every 10 min)                 HTTP Webhook  │ (Real-time POST)
       Cloud Scheduler                                x-api-key Auth│
                     ▼                                              ▼
          [pollShopDriveChanges]                         [arutemikaWebhook]
                     │                                              │
                     └──────────────────────┬───────────────────────┘
                                            ▼
                           Pub/Sub: `raw-product-events`
                           (Dead-Letter: `raw-product-events-dlq`)
                                            │
                                            ▼
                               [normalizeProductEvent]
                                 (Pub/Sub Triggered)
                         - Calculates 3-tier wholesale ladder
                         - Derives Bangladesh Provenance & MOQ
                         - Idempotent write: {origin}_{sku}
                         - syncVersion increment
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
     [federated_catalog] (Public)                   [federated_catalog_private]
     - B2B Wholesale specs                          - Raw D2C Source URLs
     - Wholesale price ladder                       - Factory Cost Structures
     - Bangladesh Provenance Badges                 - ZERO client access (rules: false)
     - Safe redirect: /api/redirect/:id
                    │
                    ▼
     [generateCatalogBundle] (Every 10 min)
     - Builds Firestore binary bundle
     - Writes to Cloud Storage CDN bucket
                    │
                    ▼
  [Node 2: b2b.handsandhead.com]
    (React/Vite Frontend Hydrated from CDN Bundle + Scoped Cursor Queries)
```

---

## 2. Prerequisites

Ensure your development environment contains:
- **Google Cloud SDK (`gcloud`)** v460.0.0+
- **Firebase CLI (`firebase-tools`)** v13.0.0+
- **Node.js** v20.x LTS & **npm** v10.x
- Permissions: GCP `Project Owner` or `Security Admin` + `Cloud Functions Admin`

Authenticate CLIs:
```bash
gcloud auth login
gcloud config set project handsandhead-nexus
firebase login
firebase use handsandhead-nexus
```

---

## 3. Google Cloud Project Setup & API Activation

Run the following command to enable all required GCP APIs for the 2nd-gen Cloud Functions, Eventarc, Pub/Sub, Firestore, and Drive integration:

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudscheduler.googleapis.com \
  drive.googleapis.com \
  eventarc.googleapis.com \
  firestore.googleapis.com \
  logging.googleapis.com \
  pubsub.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com
```

---

## 4. Pub/Sub Topics & Dead-Letter Queue (DLQ) Setup

Create the primary message exchange topic and the dead-letter topic:

```bash
# 1. Create Dead-Letter Topic
gcloud pubsub topics create raw-product-events-dlq

# 2. Create Dead-Letter Subscription (for monitoring and replay)
gcloud pubsub subscriptions create raw-product-events-dlq-sub \
  --topic=raw-product-events-dlq \
  --message-retention-duration=7d

# 3. Create Main Product Ingestion Topic
gcloud pubsub topics create raw-product-events

# 4. Create Normalization Subscription with Dead-Letter Policy
gcloud pubsub subscriptions create raw-product-events-sub \
  --topic=raw-product-events \
  --dead-letter-topic=raw-product-events-dlq \
  --max-delivery-attempts=5 \
  --ack-deadline=60
```

Grant Pub/Sub service identity permission to publish to the dead-letter topic:
```bash
PUBSUB_SERVICE_ACCOUNT="service-$(gcloud projects describe handsandhead-nexus --format='value(projectNumber)')@gcp-sa-pubsub.iam.gserviceaccount.com"

gcloud pubsub topics add-iam-policy-binding raw-product-events-dlq \
  --member="serviceAccount:${PUBSUB_SERVICE_ACCOUNT}" \
  --role="roles/pubsub.publisher"

gcloud pubsub subscriptions add-iam-policy-binding raw-product-events-sub \
  --member="serviceAccount:${PUBSUB_SERVICE_ACCOUNT}" \
  --role="roles/pubsub.subscriber"
```

---

## 5. IAM Service Accounts & Role Bindings

### 5.1 Create Dedicated Pipeline Service Account
```bash
gcloud iam service-accounts create nexos-sync-sa \
  --display-name="NEXOS Sync Pipeline Runtime Service Account" \
  --description="Authoritative identity executing Drive polling, webhook validation, product normalization, and bundle caching"
```

### 5.2 Grant Least-Privilege Roles
```bash
PROJECT_ID="handsandhead-nexus"
SA_EMAIL="nexos-sync-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Firestore database access
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/datastore.user"

# Pub/Sub Publisher (for Drive poller and Webhook)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/pubsub.publisher"

# Cloud Storage Object Admin (for writing CDN Firestore binary bundles)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

# Secret Manager Access (reading API keys and discount ladder variables)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Cloud Logging Writer (structured JSON logs)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter"
```

---

## 6. Google Drive API Access Configuration

The Drive poller (`pollShopDriveChanges`) requires read access to `shop.handsandhead.com`'s product assets folder.

### Option A: Direct Service Account Folder Share (Recommended)
1. Copy the Service Account email:
   ```bash
   echo "nexos-sync-sa@${PROJECT_ID}.iam.gserviceaccount.com"
   ```
2. Open Google Drive in the browser as the folder owner of `shop.handsandhead.com`.
3. Right-click the Product Files Folder -> **Share** -> Add `nexos-sync-sa@${PROJECT_ID}.iam.gserviceaccount.com` as **Viewer**.
4. Note the Folder ID from the URL (`https://drive.google.com/drive/folders/<DRIVE_FOLDER_ID>`).

### Option B: Google Workspace Domain-Wide Delegation (Enterprise)
If products live across an entire Google Workspace domain:
1. Go to Google Cloud Console -> **IAM & Admin** -> **Service Accounts** -> `nexos-sync-sa` -> **Details** -> **Show Domain-Wide Delegation** -> Check **Enable Google Workspace Domain-wide Delegation**.
2. Go to Google Workspace Admin Console (`admin.google.com`) -> **Security** -> **Access and data control** -> **API Controls** -> **Manage Domain-Wide Delegation**.
3. Add a new Client ID matching `nexos-sync-sa`'s Client ID, with OAuth Scope:
   ```
   https://www.googleapis.com/auth/drive.readonly
   ```

---

## 7. Secret Manager Configuration via Firebase CLI

Set all runtime configuration secrets securely. Values are encrypted at rest and automatically mounted to the 2nd-gen Cloud Functions:

```bash
# 1. Drive Polling Folder & Optional Credentials
firebase functions:secrets:set DRIVE_FOLDER_ID
# Enter folder ID: (e.g., 1A2B3C4D5E6F7G8H9I0J)

# Optional: Dedicated Service Account JSON if running cross-cloud
firebase functions:secrets:set DRIVE_SERVICE_ACCOUNT_KEY
# Enter raw JSON string or press Enter to use default ADC credentials

# 2. Arutemika Webhook Shared Secret
firebase functions:secrets:set ARUTEMIKA_WEBHOOK_SECRET
# Enter secure 64-character token (e.g., nexos_whsec_98f4a1329c0d8b2e1f4a...)

# 3. Wholesale Volume Ladder Percentage Discounts (Configurable without redeploy)
firebase functions:secrets:set TIER1_DISCOUNT_PCT
# Enter Tier 1 discount percentage (Default: 12)

firebase functions:secrets:set TIER2_DISCOUNT_PCT
# Enter Tier 2 discount percentage (Default: 22)

firebase functions:secrets:set TIER3_DISCOUNT_PCT
# Enter Tier 3 discount percentage (Default: 35)

# 4. Storage Bucket Name for CDN Bundles
firebase functions:secrets:set CATALOG_CDN_BUCKET
# Enter bucket name (e.g., handsandhead-nexus.firebasestorage.app)
```

---

## 8. Deployment Sequence

### Step 8.1: Deploy Firestore Rules and Indexes
```bash
# Deploy hardened security rules and composite indexes first
firebase deploy --only firestore:rules,firestore:indexes
```

### Step 8.2: Build and Deploy Cloud Functions (2nd Gen)
```bash
# Build TypeScript functions
npm --prefix functions run build

# Deploy all 2nd-gen Cloud Functions to asia-east1
firebase deploy --only functions
```

Functions deployed:
1. `pollShopDriveChanges`: Cloud Scheduler (every 10 min) -> Drive v3 Poller
2. `arutemikaWebhook`: HTTPS 2nd-gen endpoint -> Auth guard -> Pub/Sub
3. `normalizeProductEvent`: Pub/Sub listener -> Wholesale ladder calculation -> Idempotent Firestore write
4. `catalogRedirect`: HTTPS origin redirector -> Resolves private D2C URL -> 302 with `?ref=b2b`
5. `generateCatalogBundle`: Cloud Scheduler (every 10 min) -> Assembles Firestore binary bundle -> Cloud Storage CDN
6. `serveCatalogBundleHttp`: HTTPS bundle fallback endpoint

### Step 8.3: Build and Deploy React Frontend & Hosting Rewrites
```bash
# Build React bundle
npm run build

# Deploy Hosting with API rewrites and bundle caching headers
firebase deploy --only hosting
```

---

## 9. Verification & Smoke Testing Checklist

### 9.1 Test Arutemika Webhook Ingestion
Execute a test POST request with the authentication header:

```bash
curl -X POST https://asia-east1-handsandhead-nexus.cloudfunctions.net/arutemikaWebhook \
  -H "Content-Type: application/json" \
  -H "x-arutemika-api-key: YOUR_ARUTEMIKA_WEBHOOK_SECRET" \
  -d '{
    "sku": "ARU-TEST-001",
    "title": "Vintage Tanned Messenger Bag",
    "category": "Leather Bags",
    "price": 180.00,
    "storefront_url": "https://arutemika.com/products/vintage-tanned-messenger-bag",
    "leather_type": "Full-Grain Cowhide",
    "tannery_location": "Savar Industrial Park",
    "tags": ["Vintage", "Artisanal", "Messenger"],
    "stock": 150
  }'
```
**Expected Response:** HTTP 202 Accepted with Pub/Sub message ID.

### 9.2 Verify Firestore Idempotent Ingestion
Query Firestore document `federated_catalog/arutemika_com_ARU-TEST-001`:
- `syncVersion`: 1
- `wholesalePriceLadder[0].unitPriceUsd`: 158.40 (-12%)
- `wholesalePriceLadder[1].unitPriceUsd`: 140.40 (-22%)
- `wholesalePriceLadder[2].unitPriceUsd`: 117.00 (-35%)
- `provenance.badgeId`: `PROV-BD-LEATHER-SAVAR`
- `redirectUrlPath`: `/api/redirect/arutemika_com_ARU-TEST-001`

Query Firestore document `federated_catalog_private/arutemika_com_ARU-TEST-001`:
- `privateSourceUrl`: `https://arutemika.com/products/vintage-tanned-messenger-bag`

### 9.3 Verify Secure Origin Redirect (302)
```bash
curl -I https://b2b.handsandhead.com/api/redirect/arutemika_com_ARU-TEST-001
```
**Expected Response:**
```http
HTTP/2 302
Location: https://arutemika.com/products/vintage-tanned-messenger-bag?ref=b2b&source=nexos_federated&utm_source=b2b.handsandhead.com&utm_medium=wholesale_federated_referral
Cache-Control: no-store, no-cache, must-revalidate
```

### 9.4 Verify CDN Bundle Generation
```bash
curl -I https://b2b.handsandhead.com/bundles/latest-catalog.bundle
```
**Expected Response:**
```http
HTTP/2 200
Content-Type: application/octet-stream
Cache-Control: public, max-age=300, s-maxage=600
```

---

## 10. Incident Response & Monitoring

- **Cloud Logging Dashboard:**
  Filter logs by `jsonPayload.component="ProductNormalizer"` or `severity>=ERROR`.
- **Dead-Letter Queue Drain:**
  If messages land in `raw-product-events-dlq`, pull and inspect via:
  ```bash
  gcloud pubsub subscriptions pull raw-product-events-dlq-sub --limit=10 --auto-ack
  ```
- **Tuning Discount Percentages:**
  Update secret without redeployment:
  ```bash
  firebase functions:secrets:set TIER3_DISCOUNT_PCT
  ```
  New messages immediately inherit updated volume discount percentages.
