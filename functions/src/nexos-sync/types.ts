/**
 * NEXOS Sync Pipeline — Type Definitions
 * Unified multi-node catalog synchronization system for Bangladesh Export Ecosystem:
 * 1. admin.handsandhead.com (Firestore Master DB - federated_catalog)
 * 2. b2b.handsandhead.com (Hydrated React/Vite client)
 * 3. shop.handsandhead.com (Headless D2C node - Google Drive JSON)
 * 4. arutemika.com (D2C Leather storefront API/Webhook)
 */

export type CatalogOrigin = 'shop.handsandhead.com' | 'arutemika.com';

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK';

export interface WholesaleTier {
  tierNumber: 1 | 2 | 3;
  minQuantity: number;
  discountPercentage: number;
  unitPriceUsd: number;
  totalTierCostUsd: number;
}

export interface ProvenanceBadge {
  badgeId: string;
  badgeLabel: string;
  certificationAuthority: string;
  originRegion: string;
  traceabilityGrade: 'A_PLUS_ARTISANAL' | 'EXPORT_GRADE_CLASS_A' | 'FACTORY_DIRECT';
  materialCompliance: string[];
  ecoScore: number; // 0 - 100
}

export interface B2BProduct {
  id: string; // Composite key: {origin}_{sku}
  sku: string;
  title: string;
  handle: string;
  description: string;
  category: string;
  origin: CatalogOrigin;
  originDisplayName: string;
  status: ProductStatus;
  retailPriceUsd: number;
  currency: 'USD';
  moq: number;
  wholesalePriceLadder: [WholesaleTier, WholesaleTier, WholesaleTier]; // 500, 2000, 10000 units
  provenance: ProvenanceBadge;
  images: string[];
  thumbnailUrl: string;
  materials: string[];
  tags: string[];
  specifications: Record<string, string | number | boolean>;
  inventoryCount: number;
  inStock: boolean;
  leadTimeDays: number;
  hsCode?: string;
  syncVersion: number;
  redirectUrlPath: string; // /api/redirect/{id} - obfuscates internal D2C URL
  createdAt: FirebaseFirestore.Timestamp | string;
  updatedAt: FirebaseFirestore.Timestamp | string;
  lastSyncedAt: FirebaseFirestore.Timestamp | string;
  featuredScore: number;
}

export interface PrivateCatalogMetadata {
  catalogId: string;
  origin: CatalogOrigin;
  privateSourceUrl: string;
  supplierCostUsd?: number;
  factoryContactEmail?: string;
  rawPayloadSnapshot: Record<string, any>;
  updatedAt: FirebaseFirestore.Timestamp | string;
}

export interface RawProductEvent {
  eventId: string;
  origin: CatalogOrigin;
  sourceType: 'google_drive' | 'webhook';
  timestamp: string;
  fileId?: string;
  fileName?: string;
  rawPayload: Record<string, any>;
}

export interface DriveSyncState {
  startPageToken: string;
  lastSuccessfulSync: FirebaseFirestore.Timestamp | string;
  filesProcessedTotal: number;
  status: 'IDLE' | 'SYNCING' | 'ERROR';
  lastError?: string;
}

export interface RawDriveProductItem {
  id?: string;
  sku?: string;
  title?: string;
  name?: string;
  description?: string;
  price?: number | string;
  retailPrice?: number | string;
  compareAtPrice?: number | string;
  category?: string;
  tags?: string[] | string;
  materials?: string[] | string;
  images?: string[];
  imageUrl?: string;
  inStock?: boolean;
  stock?: number;
  inventory?: number;
  d2cUrl?: string;
  url?: string;
  specs?: Record<string, any>;
  specifications?: Record<string, any>;
}

export interface RawArutemikaProductPayload {
  product_id: string | number;
  article_number?: string;
  sku?: string;
  title: string;
  body_html?: string;
  description?: string;
  product_type?: string;
  category?: string;
  price: string | number;
  sale_price?: string | number;
  leather_type?: string;
  tannery_location?: string;
  leather_grade?: string;
  available_stock?: number;
  images?: Array<{ src: string; alt?: string } | string>;
  tags?: string[] | string;
  storefront_url?: string;
  permalink?: string;
  attributes?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
