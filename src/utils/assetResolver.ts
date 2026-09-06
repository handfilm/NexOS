/**
 * Hands & Head Nexus — Storage-Agnostic Asset Resolver
 * Normalizes product assets to support Google Drive links and seamless future Cloudflare R2 migration.
 * Eliminates synchronous Google Drive API calls during storefront request handling.
 */

export interface ProductAsset {
  id: string;
  driveUrl?: string | null;
  cdnUrl?: string | null; // Reserved for Cloudflare R2 migration
  storageType: 'drive' | 'r2' | 'local' | 'external';
  sequence: number;
  isPrimary: boolean;
  altText?: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

export interface StorageAgnosticProduct {
  id: string;
  title: string;
  sku: string;
  price: number;
  assets: ProductAsset[];
  primaryImageUrl: string;
  updatedAt?: string;
  trackInventory?: boolean;
}

const FALLBACK_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23141413"/><text x="50%" y="50%" font-family="monospace" font-size="14" fill="%23d4af37" text-anchor="middle" dy=".3em">HANDS %26 HEAD ATELIER</text></svg>';

/**
 * Extracts Google Drive File ID from various URL formats.
 */
export function extractDriveFileId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const str = String(urlOrId).trim();

  // Already a pure Drive file ID (usually 25-45 alphanumeric characters)
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(str)) {
    return str;
  }

  // /file/d/{id}/view
  const fileIdMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) return fileIdMatch[1];

  // ?id={id} or &id={id}
  const queryMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch && queryMatch[1]) return queryMatch[1];

  // drive.google.com/open?id={id}
  const openMatch = str.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) return openMatch[1];

  return null;
}

/**
 * Converts a Google Drive link or ID into an optimized cached thumbnail URL.
 * Avoids heavy synchronous full-folder or raw page scans.
 */
export function formatDriveThumbnailUrl(driveUrlOrId: string, size = 800): string {
  const fileId = extractDriveFileId(driveUrlOrId);
  if (!fileId) return driveUrlOrId || FALLBACK_PLACEHOLDER;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

/**
 * Resolves the optimal URL for an asset. Prefers CDN/R2 if present, then Drive, then fallback.
 */
export function resolveAssetUrl(asset?: Partial<ProductAsset> | null): string {
  if (!asset) return FALLBACK_PLACEHOLDER;

  // 1. Future-proof Cloudflare R2 / Custom CDN URL
  if (asset.cdnUrl && typeof asset.cdnUrl === 'string' && asset.cdnUrl.trim()) {
    return asset.cdnUrl.trim();
  }

  // 2. Google Drive Asset Link
  if (asset.driveUrl && typeof asset.driveUrl === 'string' && asset.driveUrl.trim()) {
    return formatDriveThumbnailUrl(asset.driveUrl);
  }

  return FALLBACK_PLACEHOLDER;
}

/**
 * Normalizes any legacy or inconsistent product asset array/object into canonical storage-agnostic ProductAsset[].
 */
export function normalizeProductAssets(rawProduct: any): ProductAsset[] {
  if (!rawProduct) return [];

  const rawAssets = rawProduct.assets || rawProduct.images || rawProduct.media || [];
  const normalized: ProductAsset[] = [];

  // If assets is already an array
  if (Array.isArray(rawAssets) && rawAssets.length > 0) {
    rawAssets.forEach((item: any, index: number) => {
      if (typeof item === 'string') {
        const fileId = extractDriveFileId(item);
        normalized.push({
          id: fileId ? `asset-${fileId}` : `asset-${index}`,
          driveUrl: item.includes('drive.google.com') ? item : null,
          cdnUrl: !item.includes('drive.google.com') ? item : null,
          storageType: item.includes('drive.google.com') ? 'drive' : 'external',
          sequence: index + 1,
          isPrimary: index === 0,
          altText: rawProduct.title || 'Product Asset'
        });
      } else if (item && typeof item === 'object') {
        normalized.push({
          id: item.id || `asset-${index}`,
          driveUrl: item.driveUrl || item.driveLink || (item.url?.includes('drive.google.com') ? item.url : null),
          cdnUrl: item.cdnUrl || item.r2Url || (!item.url?.includes('drive.google.com') ? item.url : null),
          storageType: item.storageType || (item.driveUrl || item.driveLink ? 'drive' : 'external'),
          sequence: item.sequence || index + 1,
          isPrimary: item.isPrimary !== undefined ? Boolean(item.isPrimary) : index === 0,
          altText: item.altText || rawProduct.title || 'Product Asset',
          width: item.width,
          height: item.height,
          mimeType: item.mimeType
        });
      }
    });
  }

  // Fallback if legacy single image field used (imageUrl, driveFolder, etc.)
  if (normalized.length === 0) {
    const singleUrl = rawProduct.imageUrl || rawProduct.primaryImage || rawProduct.image || rawProduct.driveUrl;
    if (singleUrl) {
      const fileId = extractDriveFileId(singleUrl);
      normalized.push({
        id: fileId ? `asset-${fileId}` : 'asset-primary',
        driveUrl: singleUrl.includes('drive.google.com') ? singleUrl : null,
        cdnUrl: !singleUrl.includes('drive.google.com') ? singleUrl : null,
        storageType: singleUrl.includes('drive.google.com') ? 'drive' : 'external',
        sequence: 1,
        isPrimary: true,
        altText: rawProduct.title || 'Product Asset'
      });
    }
  }

  return normalized;
}

/**
 * Transforms raw catalog records into storage-agnostic objects.
 */
export function createStorageAgnosticProduct(rawProduct: any): StorageAgnosticProduct {
  const assets = normalizeProductAssets(rawProduct);
  const primaryAsset = assets.find(a => a.isPrimary) || assets[0];
  const primaryImageUrl = resolveAssetUrl(primaryAsset);

  return {
    id: String(rawProduct.id || rawProduct._id || `hh-${Date.now()}`),
    title: rawProduct.title || rawProduct.name || 'Untitled Product',
    sku: rawProduct.sku || 'HH-SKU',
    price: Number(rawProduct.price || rawProduct.pricing?.price || 0),
    assets,
    primaryImageUrl,
    updatedAt: rawProduct.updatedAt || new Date().toISOString(),
    trackInventory: Boolean(rawProduct.trackInventory)
  };
}

// Global exposure for hybrid scripts
if (typeof window !== 'undefined') {
  (window as any).AssetResolver = {
    extractDriveFileId,
    formatDriveThumbnailUrl,
    resolveAssetUrl,
    normalizeProductAssets,
    createStorageAgnosticProduct
  };
}
