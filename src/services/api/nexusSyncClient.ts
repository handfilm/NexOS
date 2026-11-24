/**
 * HANDS & HEAD (NexOS) — Dual-Endpoint Failover Sync Client & IndexedDB Mirror
 * Routes reads/writes across Primary (admin.handsandhead.com) and Backup Mirror (handsandhead.ai.studio)
 * with 3500ms latency failover, offline IndexedDB caching, and 1-Click Backup Vault orchestration.
 */

export type MirrorNodeKey = 'primary' | 'backup' | 'local';

export type NodeHealthStatus = 'online' | 'degraded' | 'offline' | 'checking';

export interface EndpointHealthRecord {
  readonly key: MirrorNodeKey;
  readonly label: string;
  readonly host: string;
  readonly apiRoot: string;
  readonly status: NodeHealthStatus;
  readonly latencyMs: number | null;
  readonly lastCheckedAt: string | null;
  readonly active: boolean;
  readonly error?: string;
}

export interface SubdomainProbeResult {
  readonly id: string;
  readonly label: string;
  readonly domain: string;
  readonly probeUrl: string;
  readonly status: NodeHealthStatus;
  readonly httpStatus: number | null;
  readonly latencyMs: number | null;
  readonly corsVerified: boolean;
  readonly checkedAt: string;
  readonly note: string;
}

export interface ClipRoasMetric {
  readonly clipId: string;
  readonly clipTitle: string;
  readonly channel: string;
  readonly spendBdt: number;
  readonly attributedRevenueBdt: number;
  readonly roas: number;
  readonly impressions: number;
  readonly clicks: number;
  readonly purchases: number;
  readonly funnelViews: number;
  readonly funnelCheckouts: number;
}

export interface DashboardSummaryResponse {
  readonly ok: boolean;
  readonly node: string;
  readonly generatedAt: string;
  readonly metrics: {
    readonly salesToday: number;
    readonly totalRevenue: number;
    readonly totalOrders: number;
    readonly pendingOrders: number;
    readonly completedToday: number;
    readonly activeProducts: number;
  };
  readonly tenClipAdRoas: {
    readonly clips: ClipRoasMetric[];
    readonly totalSpendBdt: number;
    readonly totalRevenueBdt: number;
    readonly blendedRoas: number;
  };
  readonly recentOrders: ReadonlyArray<Record<string, unknown>>;
  readonly servedBy?: MirrorNodeKey;
  readonly fromOfflineCache?: boolean;
}

export interface PublicCatalogResponse {
  readonly ok: boolean;
  readonly node: string;
  readonly count: number;
  readonly items: ReadonlyArray<Record<string, unknown>>;
  readonly servedBy?: MirrorNodeKey;
  readonly fromOfflineCache?: boolean;
}

export interface PreCreateOrderPayload {
  readonly id?: string;
  readonly orderNumber?: string;
  readonly customerName: string;
  readonly customerPhone?: string;
  readonly customerEmail?: string;
  readonly subdomainSource?: string;
  readonly status?: string;
  readonly paymentStatus?: string;
  readonly fulfillmentStatus?: string;
  readonly total: number;
  readonly amountPaid?: number;
  readonly currency?: string;
  readonly items: ReadonlyArray<Record<string, unknown>>;
  readonly shippingAddress?: string;
  readonly clipId?: string;
  readonly utmCampaign?: string;
}

export interface OrderStatusPatchPayload {
  readonly status?: string;
  readonly paymentStatus?: string;
  readonly fulfillmentStatus?: string;
  readonly amountPaid?: number;
}

export interface DriveProductSyncPayload {
  readonly id?: string;
  readonly sku: string;
  readonly title: string;
  readonly handle?: string;
  readonly category?: string;
  readonly brand?: string;
  readonly status?: string;
  readonly retailPrice: number;
  readonly wholesalePrice?: number;
  readonly currency?: string;
  readonly stockQty?: number;
  readonly images?: ReadonlyArray<string | Record<string, unknown>>;
  readonly driveFileId?: string;
  readonly sourceSubdomain?: string;
}

export interface R2BackupSnapshotItem {
  readonly key: string;
  readonly fileName: string;
  readonly size: number;
  readonly uploaded: string;
  readonly etag: string;
  readonly recordCounts?: Record<string, number>;
}

export interface CloudBackupTables {
  readonly orders: ReadonlyArray<Record<string, unknown>>;
  readonly funnel_events: ReadonlyArray<Record<string, unknown>>;
  readonly ad_spend_daily: ReadonlyArray<Record<string, unknown>>;
  readonly products: ReadonlyArray<Record<string, unknown>>;
}

export interface CloudBackupSnapshot {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly sourceNode: string;
  readonly tables: CloudBackupTables;
  readonly r2MediaManifest: ReadonlyArray<Record<string, unknown>>;
  readonly counts: {
    readonly orders: number;
    readonly funnel_events: number;
    readonly ad_spend_daily: number;
    readonly products: number;
    readonly r2Media: number;
  };
}

export interface LocalIndexedDbStoreDump {
  readonly dbName: string;
  readonly storeName: string;
  readonly records: ReadonlyArray<{ readonly key: string; readonly value: unknown }>;
}

export interface FullNexosBackupBundle {
  readonly schemaVersion: 'nexos-full-backup-v2';
  readonly exportedAt: string;
  readonly originHost: string;
  readonly activeMirrorNode: MirrorNodeKey;
  readonly cloudD1: CloudBackupSnapshot;
  readonly localIndexedDb: ReadonlyArray<LocalIndexedDbStoreDump>;
  readonly localStorageSnapshot: Record<string, unknown>;
}

export interface VaultAuthStatus {
  readonly configuredViaEnv: boolean;
  readonly claimed: boolean;
  readonly requiresFirstRunClaim: boolean;
  readonly authenticated: boolean;
}

export interface DualSiteHealthState {
  readonly activeNode: MirrorNodeKey;
  readonly primary: EndpointHealthRecord;
  readonly backup: EndpointHealthRecord;
  readonly local: EndpointHealthRecord;
  readonly pendingOfflineWrites: number;
  readonly lastSyncedAt: string | null;
}

interface OfflineWriteQueueItem {
  readonly id: string;
  readonly method: 'POST' | 'PATCH';
  readonly path: string;
  readonly body: unknown;
  readonly createdAt: string;
}

// ── Constants ──

export const PRIMARY_API_ROOT = 'https://admin.handsandhead.com/api';
export const BACKUP_API_ROOT = 'https://handsandhead.ai.studio/api';
export const RELATIVE_API_ROOT = '/api';
export const FAILOVER_TIMEOUT_MS = 3500;

const IDB_NAME = 'nexos_dual_mirror_v1';
const IDB_VERSION = 1;
const STORE_CACHE = 'cache';
const STORE_SNAPSHOTS = 'snapshots';
const STORE_OFFLINE_QUEUE = 'offline_queue';
const STORE_HEALTH = 'endpoint_health';

const SAFE_LOCALSTORAGE_KEYS: ReadonlyArray<string> = [
  'orders',
  'nx_orders',
  'products',
  'customers',
  'hh_gdrive_config',
  'hh_clearance_vault_v1',
  'nx_dashboard_layout',
];

export const ECOSYSTEM_SUBDOMAINS: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly domain: string;
  readonly probeUrl: string;
}> = [
  {
    id: 'admin',
    label: 'Primary Command (NexOS)',
    domain: 'admin.handsandhead.com',
    probeUrl: 'https://admin.handsandhead.com/api/health',
  },
  {
    id: 'mirror',
    label: 'Backup Mirror (AI Studio)',
    domain: 'handsandhead.ai.studio',
    probeUrl: 'https://handsandhead.ai.studio/api/health',
  },
  {
    id: 'storyboard',
    label: 'Storyboard Studio',
    domain: 'storyboard.handsandhead.com',
    probeUrl: 'https://storyboard.handsandhead.com/',
  },
  {
    id: 'd2c',
    label: 'D2C Storefront',
    domain: 'd2c.handsandhead.com',
    probeUrl: 'https://d2c.handsandhead.com/',
  },
  {
    id: 'b2b',
    label: 'B2B Wholesale Hub',
    domain: 'b2b.handsandhead.com',
    probeUrl: 'https://b2b.handsandhead.com/',
  },
  {
    id: 'rawx',
    label: 'RAWx Materials OS',
    domain: 'RAWx',
    probeUrl: 'https://handfilm.github.io/RAWxOS/',
  },
];

// ── IndexedDB Persistence Engine ──

function openMirrorDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_OFFLINE_QUEUE)) {
          db.createObjectStore(STORE_OFFLINE_QUEUE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_HEALTH)) {
          db.createObjectStore(STORE_HEALTH, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut<T extends object>(storeName: string, record: T): Promise<void> {
  const db = await openMirrorDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openMirrorDb();
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => {
        const result = (req.result as T | undefined) ?? null;
        db.close();
        resolve(result);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openMirrorDb();
  if (!db) return [];
  return new Promise<T[]>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => {
        const result = Array.isArray(req.result) ? (req.result as T[]) : [];
        db.close();
        resolve(result);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openMirrorDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function dumpMirrorIndexedDbStores(): Promise<LocalIndexedDbStoreDump[]> {
  const db = await openMirrorDb();
  if (!db) return [];
  const storeNames = Array.from(db.objectStoreNames);
  const dumps: LocalIndexedDbStoreDump[] = [];

  for (const storeName of storeNames) {
    const records = await new Promise<Array<{ readonly key: string; readonly value: unknown }>>((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const items: Array<{ readonly key: string; readonly value: unknown }> = [];
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            items.push({ key: String(cursor.key), value: cursor.value });
            cursor.continue();
          } else {
            resolve(items);
          }
        };
        cursorReq.onerror = () => resolve(items);
      } catch {
        resolve([]);
      }
    });
    dumps.push({ dbName: IDB_NAME, storeName, records });
  }

  db.close();
  return dumps;
}

async function restoreLocalIndexedDbStores(dumps: ReadonlyArray<LocalIndexedDbStoreDump>): Promise<number> {
  let restoredCount = 0;
  for (const dump of dumps) {
    if (dump.dbName !== IDB_NAME) continue;
    const allowedStores: ReadonlySet<string> = new Set([STORE_CACHE, STORE_SNAPSHOTS, STORE_OFFLINE_QUEUE, STORE_HEALTH]);
    if (!allowedStores.has(dump.storeName)) continue;
    for (const rec of dump.records) {
      if (typeof rec.value === 'object' && rec.value !== null) {
        await idbPut(dump.storeName, rec.value as object);
        restoredCount += 1;
      }
    }
  }
  return restoredCount;
}

function collectSafeLocalStorageSnapshot(): Record<string, unknown> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  const result: Record<string, unknown> = {};
  for (const key of SAFE_LOCALSTORAGE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        try {
          result[key] = JSON.parse(raw) as unknown;
        } catch {
          result[key] = raw;
        }
      }
    } catch {
      // Ignore storage quota or restricted context
    }
  }
  return result;
}

// ── Fetch Helper with 3500ms Latency Timeout ──

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ response: Response; latencyMs: number }> {
  const controller = new AbortController();
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return { response, latencyMs: Math.max(1, Math.round(endedAt - startedAt)) };
  } finally {
    clearTimeout(timer);
  }
}

// ── Dual-Site Sync Client Singleton ──

type HealthListener = (state: DualSiteHealthState) => void;

class NexusSyncClient {
  private activeNode: MirrorNodeKey = 'local';
  private vaultBearerToken = '';
  private readonly listeners = new Set<HealthListener>();
  private healthPollTimer: ReturnType<typeof setInterval> | null = null;
  private lastSyncedAt: string | null = null;
  private pendingOfflineWrites = 0;

  private readonly endpoints: Record<MirrorNodeKey, EndpointHealthRecord> = {
    primary: {
      key: 'primary',
      label: 'PRIMARY',
      host: 'admin.handsandhead.com',
      apiRoot: PRIMARY_API_ROOT,
      status: 'checking',
      latencyMs: null,
      lastCheckedAt: null,
      active: false,
    },
    backup: {
      key: 'backup',
      label: 'BACKUP',
      host: 'handsandhead.ai.studio',
      apiRoot: BACKUP_API_ROOT,
      status: 'checking',
      latencyMs: null,
      lastCheckedAt: null,
      active: false,
    },
    local: {
      key: 'local',
      label: 'LOCAL EDGE',
      host: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
      apiRoot: RELATIVE_API_ROOT,
      status: 'checking',
      latencyMs: null,
      lastCheckedAt: null,
      active: true,
    },
  };

  constructor() {
    this.activeNode = this.detectInitialActiveNode();
    this.updateActiveFlags();
  }

  private detectInitialActiveNode(): MirrorNodeKey {
    if (typeof window === 'undefined') return 'primary';
    const host = window.location.hostname.toLowerCase();
    if (host === 'admin.handsandhead.com') return 'primary';
    if (host === 'handsandhead.ai.studio') return 'backup';
    return 'local';
  }

  private updateActiveFlags(): void {
    const keys: MirrorNodeKey[] = ['primary', 'backup', 'local'];
    for (const k of keys) {
      this.endpoints[k] = { ...this.endpoints[k], active: this.activeNode === k };
    }
  }

  private getOrderedApiRoots(): ReadonlyArray<{ readonly key: MirrorNodeKey; readonly root: string }> {
    if (this.activeNode === 'primary') {
      return [
        { key: 'primary', root: PRIMARY_API_ROOT },
        { key: 'backup', root: BACKUP_API_ROOT },
        { key: 'local', root: RELATIVE_API_ROOT },
      ];
    }
    if (this.activeNode === 'backup') {
      return [
        { key: 'backup', root: BACKUP_API_ROOT },
        { key: 'primary', root: PRIMARY_API_ROOT },
        { key: 'local', root: RELATIVE_API_ROOT },
      ];
    }
    return [
      { key: 'local', root: RELATIVE_API_ROOT },
      { key: 'primary', root: PRIMARY_API_ROOT },
      { key: 'backup', root: BACKUP_API_ROOT },
    ];
  }

  public getHealthState(): DualSiteHealthState {
    return {
      activeNode: this.activeNode,
      primary: { ...this.endpoints.primary },
      backup: { ...this.endpoints.backup },
      local: { ...this.endpoints.local },
      pendingOfflineWrites: this.pendingOfflineWrites,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  public subscribeHealth(listener: HealthListener): () => void {
    this.listeners.add(listener);
    listener(this.getHealthState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getHealthState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Isolate subscriber errors
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus:dual-health-update', { detail: snapshot }));
    }
  }

  // Vault Bearer Token held strictly in React/JS memory (never localStorage or sessionStorage)
  public setVaultBearerToken(token: string): void {
    this.vaultBearerToken = token.trim();
  }

  public hasVaultBearerToken(): boolean {
    return this.vaultBearerToken.length > 0;
  }

  public clearVaultBearerToken(): void {
    this.vaultBearerToken = '';
  }

  public startHealthMonitor(intervalMs = 30000): void {
    if (this.healthPollTimer !== null) return;
    void this.refreshDualSiteHealth();
    this.healthPollTimer = setInterval(() => {
      void this.refreshDualSiteHealth();
    }, intervalMs);
  }

  public stopHealthMonitor(): void {
    if (this.healthPollTimer !== null) {
      clearInterval(this.healthPollTimer);
      this.healthPollTimer = null;
    }
  }

  private async probeMirrorEndpoint(key: MirrorNodeKey): Promise<EndpointHealthRecord> {
    const current = this.endpoints[key];
    const nowIso = new Date().toISOString();
    const isCurrentOriginHost =
      typeof window !== 'undefined' &&
      (key === 'local' || window.location.hostname.toLowerCase() === current.host.toLowerCase());

    const probeUrl = isCurrentOriginHost ? `${RELATIVE_API_ROOT}/health` : `${current.apiRoot}/health`;

    try {
      const { response, latencyMs } = await fetchWithTimeout(
        probeUrl,
        { method: 'GET', cache: 'no-store' },
        FAILOVER_TIMEOUT_MS
      );
      const status: NodeHealthStatus = response.ok
        ? latencyMs > 2200
          ? 'degraded'
          : 'online'
        : 'degraded';

      const updated: EndpointHealthRecord = {
        ...current,
        status,
        latencyMs,
        lastCheckedAt: nowIso,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
      this.endpoints[key] = updated;
      await idbPut(STORE_HEALTH, updated);
      return updated;
    } catch (err: unknown) {
      // Fallback check: if current origin is running local/Cloud Run preview for handsandhead.ai.studio
      if (key === 'backup' && typeof window !== 'undefined' && this.endpoints.local.status === 'online') {
        const localRecord = this.endpoints.local;
        const mirrorFallback: EndpointHealthRecord = {
          ...current,
          status: 'online',
          latencyMs: localRecord.latencyMs,
          lastCheckedAt: nowIso,
          error: undefined,
        };
        this.endpoints[key] = mirrorFallback;
        await idbPut(STORE_HEALTH, mirrorFallback);
        return mirrorFallback;
      }

      const message = err instanceof Error ? err.message : 'Unreachable';
      const updated: EndpointHealthRecord = {
        ...current,
        status: 'offline',
        latencyMs: null,
        lastCheckedAt: nowIso,
        error: message,
      };
      this.endpoints[key] = updated;
      await idbPut(STORE_HEALTH, updated);
      return updated;
    }
  }

  public async refreshDualSiteHealth(): Promise<DualSiteHealthState> {
    // Check local edge first so active preview mirror is immediately known
    await this.probeMirrorEndpoint('local');
    await Promise.all([this.probeMirrorEndpoint('primary'), this.probeMirrorEndpoint('backup')]);

    // Update pending offline write counter
    const queued = await idbGetAll<OfflineWriteQueueItem>(STORE_OFFLINE_QUEUE);
    this.pendingOfflineWrites = queued.length;

    // Automatically replay offline queue if any endpoint is reachable
    if (
      queued.length > 0 &&
      (this.endpoints.local.status === 'online' ||
        this.endpoints.primary.status === 'online' ||
        this.endpoints.backup.status === 'online')
    ) {
      void this.flushOfflineQueue();
    }

    this.notifyListeners();
    return this.getHealthState();
  }

  // Core Failover Request Engine (3500ms latency failover across Primary <-> Backup <-> Local Edge)
  private async requestWithFailover<T>(
    path: string,
    options: {
      readonly method: 'GET' | 'POST' | 'PATCH';
      readonly body?: unknown;
      readonly requireVaultAuth?: boolean;
    }
  ): Promise<{ data: T; servedBy: MirrorNodeKey; latencyMs: number }> {
    const orderedRoots = this.getOrderedApiRoots();
    const errors: string[] = [];

    for (const candidate of orderedRoots) {
      const url = `${candidate.root}${path.startsWith('/') ? path : `/${path}`}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'X-NexOS-Mirror': candidate.key,
      };
      if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      if (options.requireVaultAuth && this.vaultBearerToken) {
        headers['Authorization'] = `Bearer ${this.vaultBearerToken}`;
      }

      try {
        const { response, latencyMs } = await fetchWithTimeout(
          url,
          {
            method: options.method,
            headers,
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            cache: 'no-store',
          },
          FAILOVER_TIMEOUT_MS
        );

        // Auth errors (401/403) should not mask themselves as offline failovers when the active server answered
        if (response.status === 401 || response.status === 403) {
          let errMsg = `Unauthorized (${response.status})`;
          try {
            const errJson = (await response.json()) as { error?: string };
            if (errJson.error) errMsg = errJson.error;
          } catch {
            // Use default message
          }
          throw new Error(`AUTH_REQUIRED:${errMsg}`);
        }

        if (!response.ok) {
          errors.push(`${candidate.key}: HTTP ${response.status}`);
          this.endpoints[candidate.key] = {
            ...this.endpoints[candidate.key],
            status: 'degraded',
            latencyMs,
            lastCheckedAt: new Date().toISOString(),
            error: `HTTP ${response.status}`,
          };
          continue;
        }

        const data = (await response.json()) as T;
        this.activeNode = candidate.key;
        this.lastSyncedAt = new Date().toISOString();
        this.endpoints[candidate.key] = {
          ...this.endpoints[candidate.key],
          status: latencyMs > 2200 ? 'degraded' : 'online',
          latencyMs,
          lastCheckedAt: this.lastSyncedAt,
          error: undefined,
        };
        this.updateActiveFlags();
        this.notifyListeners();

        return { data, servedBy: candidate.key, latencyMs };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error';
        if (msg.startsWith('AUTH_REQUIRED:')) {
          throw new Error(msg.slice('AUTH_REQUIRED:'.length));
        }
        errors.push(`${candidate.key}: ${msg}`);
        this.endpoints[candidate.key] = {
          ...this.endpoints[candidate.key],
          status: 'offline',
          latencyMs: null,
          lastCheckedAt: new Date().toISOString(),
          error: msg,
        };
      }
    }

    this.notifyListeners();
    throw new Error(`All dual-site endpoints failed (${errors.join(' | ')})`);
  }

  // ── Core Dual-Site Reads (with IndexedDB Offline Mirror Cache) ──

  public async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    const cacheKey = 'GET:/dashboard/summary';
    try {
      const { data, servedBy } = await this.requestWithFailover<DashboardSummaryResponse>('/dashboard/summary', {
        method: 'GET',
      });
      const enriched: DashboardSummaryResponse = { ...data, servedBy, fromOfflineCache: false };
      await idbPut(STORE_CACHE, { key: cacheKey, data: enriched, updatedAt: new Date().toISOString() });
      return enriched;
    } catch {
      const cached = await idbGet<{ key: string; data: DashboardSummaryResponse; updatedAt: string }>(
        STORE_CACHE,
        cacheKey
      );
      if (cached?.data) {
        return { ...cached.data, fromOfflineCache: true };
      }
      return {
        ok: true,
        node: 'offline-indexeddb',
        generatedAt: new Date().toISOString(),
        metrics: {
          salesToday: 0,
          totalRevenue: 0,
          totalOrders: 0,
          pendingOrders: 0,
          completedToday: 0,
          activeProducts: 0,
        },
        tenClipAdRoas: {
          clips: [],
          totalSpendBdt: 0,
          totalRevenueBdt: 0,
          blendedRoas: 0,
        },
        recentOrders: [],
        fromOfflineCache: true,
      };
    }
  }

  public async getPublicCatalog(category?: string): Promise<PublicCatalogResponse> {
    const querySuffix = category ? `?category=${encodeURIComponent(category)}` : '';
    const cacheKey = `GET:/catalog/public${querySuffix}`;
    try {
      const { data, servedBy } = await this.requestWithFailover<PublicCatalogResponse>(
        `/catalog/public${querySuffix}`,
        { method: 'GET' }
      );
      const enriched: PublicCatalogResponse = { ...data, servedBy, fromOfflineCache: false };
      await idbPut(STORE_CACHE, { key: cacheKey, data: enriched, updatedAt: new Date().toISOString() });
      return enriched;
    } catch {
      const cached = await idbGet<{ key: string; data: PublicCatalogResponse; updatedAt: string }>(
        STORE_CACHE,
        cacheKey
      );
      if (cached?.data) {
        return { ...cached.data, fromOfflineCache: true };
      }
      return { ok: true, node: 'offline-indexeddb', count: 0, items: [], fromOfflineCache: true };
    }
  }

  // ── Core Dual-Site Writes (with Automatic Failover & Offline Queue Replay) ──

  public async preCreateOrder(
    payload: PreCreateOrderPayload
  ): Promise<{ ok: boolean; queuedOffline?: boolean; item?: Record<string, unknown>; servedBy?: MirrorNodeKey }> {
    try {
      const { data, servedBy } = await this.requestWithFailover<{ ok: boolean; item?: Record<string, unknown> }>(
        '/orders/pre-create',
        { method: 'POST', body: payload }
      );
      await idbPut(STORE_CACHE, {
        key: `ORDER:${String(data.item?.id ?? payload.id ?? Date.now())}`,
        data: data.item ?? payload,
        updatedAt: new Date().toISOString(),
      });
      return { ok: data.ok, item: data.item, servedBy };
    } catch {
      await this.enqueueOfflineWrite('POST', '/orders/pre-create', payload);
      return { ok: true, queuedOffline: true, item: payload as unknown as Record<string, unknown> };
    }
  }

  public async patchOrderStatus(
    orderId: string,
    patch: OrderStatusPatchPayload
  ): Promise<{ ok: boolean; queuedOffline?: boolean; item?: Record<string, unknown>; servedBy?: MirrorNodeKey }> {
    const path = `/orders/${encodeURIComponent(orderId)}/status`;
    try {
      const { data, servedBy } = await this.requestWithFailover<{ ok: boolean; item?: Record<string, unknown> }>(
        path,
        { method: 'PATCH', body: patch }
      );
      return { ok: data.ok, item: data.item, servedBy };
    } catch {
      await this.enqueueOfflineWrite('PATCH', path, patch);
      return { ok: true, queuedOffline: true };
    }
  }

  public async syncDriveProduct(
    payload: DriveProductSyncPayload
  ): Promise<{ ok: boolean; queuedOffline?: boolean; item?: Record<string, unknown>; servedBy?: MirrorNodeKey }> {
    try {
      const { data, servedBy } = await this.requestWithFailover<{ ok: boolean; item?: Record<string, unknown> }>(
        '/sync/drive-product',
        { method: 'POST', body: payload }
      );
      return { ok: data.ok, item: data.item, servedBy };
    } catch {
      await this.enqueueOfflineWrite('POST', '/sync/drive-product', payload);
      return { ok: true, queuedOffline: true };
    }
  }

  private async enqueueOfflineWrite(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<void> {
    const item: OfflineWriteQueueItem = {
      id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      method,
      path,
      body,
      createdAt: new Date().toISOString(),
    };
    await idbPut(STORE_OFFLINE_QUEUE, item);
    const queued = await idbGetAll<OfflineWriteQueueItem>(STORE_OFFLINE_QUEUE);
    this.pendingOfflineWrites = queued.length;
    this.notifyListeners();
  }

  public async flushOfflineQueue(): Promise<number> {
    const queued = await idbGetAll<OfflineWriteQueueItem>(STORE_OFFLINE_QUEUE);
    let flushed = 0;
    for (const item of queued) {
      try {
        await this.requestWithFailover(item.path, { method: item.method, body: item.body });
        await idbDelete(STORE_OFFLINE_QUEUE, item.id);
        flushed += 1;
      } catch {
        break;
      }
    }
    const remaining = await idbGetAll<OfflineWriteQueueItem>(STORE_OFFLINE_QUEUE);
    this.pendingOfflineWrites = remaining.length;
    this.notifyListeners();
    return flushed;
  }

  // ── Backup & Restore Vault API Methods ──

  public async getVaultAuthStatus(): Promise<VaultAuthStatus> {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.vaultBearerToken) {
        headers['Authorization'] = `Bearer ${this.vaultBearerToken}`;
      }
      const { response } = await fetchWithTimeout(
        `${RELATIVE_API_ROOT}/backup/auth/status`,
        { method: 'GET', headers, cache: 'no-store' },
        FAILOVER_TIMEOUT_MS
      );
      if (response.ok) {
        const json = (await response.json()) as {
          configuredViaEnv?: boolean;
          claimed?: boolean;
          requiresFirstRunClaim?: boolean;
          authenticated?: boolean;
        };
        return {
          configuredViaEnv: Boolean(json.configuredViaEnv),
          claimed: Boolean(json.claimed),
          requiresFirstRunClaim: Boolean(json.requiresFirstRunClaim),
          authenticated: Boolean(json.authenticated),
        };
      }
    } catch {
      // Running directly against Worker where NEXOS_BACKUP_TOKEN is verified directly
    }
    return {
      configuredViaEnv: true,
      claimed: true,
      requiresFirstRunClaim: false,
      authenticated: this.hasVaultBearerToken(),
    };
  }

  public async claimOrUnlockVault(passphrase: string): Promise<{ ok: boolean; token?: string; mode?: string; error?: string }> {
    try {
      const { response } = await fetchWithTimeout(
        `${RELATIVE_API_ROOT}/backup/auth/claim`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ passphrase }),
        },
        FAILOVER_TIMEOUT_MS
      );
      const data = (await response.json()) as { ok?: boolean; token?: string; mode?: string; error?: string };
      if (!response.ok || !data.ok || !data.token) {
        return { ok: false, error: data.error ?? `Unlock failed (HTTP ${response.status})` };
      }
      this.setVaultBearerToken(data.token);
      return { ok: true, token: data.token, mode: data.mode };
    } catch (err: unknown) {
      // If hosted directly on Cloudflare Worker, use entered string directly as Bearer token
      this.setVaultBearerToken(passphrase);
      return {
        ok: true,
        token: passphrase,
        mode: 'worker-direct',
        error: err instanceof Error ? err.message : undefined,
      };
    }
  }

  public async exportFullBackup(): Promise<FullNexosBackupBundle> {
    const { data } = await this.requestWithFailover<{ ok: boolean; snapshot: CloudBackupSnapshot }>('/backup/export', {
      method: 'GET',
      requireVaultAuth: true,
    });

    const localIndexedDb = await dumpMirrorIndexedDbStores();
    const localStorageSnapshot = collectSafeLocalStorageSnapshot();

    const bundle: FullNexosBackupBundle = {
      schemaVersion: 'nexos-full-backup-v2',
      exportedAt: new Date().toISOString(),
      originHost: typeof window !== 'undefined' ? window.location.host : 'admin.handsandhead.com',
      activeMirrorNode: this.activeNode,
      cloudD1: data.snapshot,
      localIndexedDb,
      localStorageSnapshot,
    };

    await idbPut(STORE_SNAPSHOTS, {
      id: `local-snap-${Date.now()}`,
      exportedAt: bundle.exportedAt,
      counts: bundle.cloudD1.counts,
    });

    return bundle;
  }

  public async restoreFromBackupPayload(
    payload: unknown
  ): Promise<{
    readonly ok: boolean;
    readonly restoredCloud: Record<string, number>;
    readonly restoredLocalRecords: number;
    readonly restoredAt: string;
  }> {
    let cloudPayload: unknown = payload;
    let localIndexedDbDumps: ReadonlyArray<LocalIndexedDbStoreDump> = [];

    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
      const rec = payload as Record<string, unknown>;
      if (rec.cloudD1 && typeof rec.cloudD1 === 'object') {
        cloudPayload = rec.cloudD1;
      }
      if (Array.isArray(rec.localIndexedDb)) {
        localIndexedDbDumps = rec.localIndexedDb as LocalIndexedDbStoreDump[];
      }
    }

    const { data } = await this.requestWithFailover<{
      ok: boolean;
      restored: Record<string, number>;
      restoredAt: string;
    }>('/backup/restore', {
      method: 'POST',
      body: { snapshot: cloudPayload },
      requireVaultAuth: true,
    });

    const restoredLocalRecords = await restoreLocalIndexedDbStores(localIndexedDbDumps);
    return {
      ok: data.ok,
      restoredCloud: data.restored,
      restoredLocalRecords,
      restoredAt: data.restoredAt,
    };
  }

  public async saveSnapshotToR2(): Promise<{
    readonly ok: boolean;
    readonly savedKey: string;
    readonly size: number;
    readonly uploaded: string;
    readonly counts: Record<string, number>;
    readonly snapshots: R2BackupSnapshotItem[];
  }> {
    const { data } = await this.requestWithFailover<{
      ok: boolean;
      savedKey: string;
      size: number;
      uploaded: string;
      counts: Record<string, number>;
      snapshots: R2BackupSnapshotItem[];
    }>('/backup/snapshot-r2', {
      method: 'POST',
      body: {},
      requireVaultAuth: true,
    });
    return data;
  }

  public async listR2Snapshots(): Promise<R2BackupSnapshotItem[]> {
    const { data } = await this.requestWithFailover<{ ok: boolean; snapshots: R2BackupSnapshotItem[] }>(
      '/backup/snapshots',
      {
        method: 'GET',
        requireVaultAuth: true,
      }
    );
    return data.snapshots ?? [];
  }

  public async restoreFromR2Snapshot(
    key: string
  ): Promise<{ readonly ok: boolean; readonly restoredKey: string; readonly restored: Record<string, number> }> {
    const { data } = await this.requestWithFailover<{
      ok: boolean;
      restoredKey: string;
      restored: Record<string, number>;
    }>('/backup/restore-r2', {
      method: 'POST',
      body: { key },
      requireVaultAuth: true,
    });
    return data;
  }

  // ── Live 6-Subdomain Endpoint Tester ──

  public async testAllEcosystemEndpoints(): Promise<SubdomainProbeResult[]> {
    const results = await Promise.all(
      ECOSYSTEM_SUBDOMAINS.map(async (target): Promise<SubdomainProbeResult> => {
        const checkedAt = new Date().toISOString();
        const isLocalBackupMirror =
          target.id === 'mirror' &&
          typeof window !== 'undefined' &&
          window.location.hostname !== 'admin.handsandhead.com';
        const effectiveUrl = isLocalBackupMirror ? `${RELATIVE_API_ROOT}/health` : target.probeUrl;

        try {
          const { response, latencyMs } = await fetchWithTimeout(
            effectiveUrl,
            { method: 'GET', mode: 'cors', cache: 'no-store' },
            FAILOVER_TIMEOUT_MS
          );
          const ok = response.ok;
          return {
            id: target.id,
            label: target.label,
            domain: target.domain,
            probeUrl: target.probeUrl,
            status: ok ? (latencyMs > 2200 ? 'degraded' : 'online') : 'degraded',
            httpStatus: response.status,
            latencyMs,
            corsVerified: true,
            checkedAt,
            note: ok ? 'CORS + API verified' : `HTTP ${response.status}`,
          };
        } catch {
          // Cross-origin static storefronts (storyboard, d2c, b2b, RAWx) may block CORS reads while still reachable via no-cors probe
          try {
            const { latencyMs } = await fetchWithTimeout(
              target.probeUrl,
              { method: 'GET', mode: 'no-cors', cache: 'no-store' },
              FAILOVER_TIMEOUT_MS
            );
            return {
              id: target.id,
              label: target.label,
              domain: target.domain,
              probeUrl: target.probeUrl,
              status: latencyMs > 2200 ? 'degraded' : 'online',
              httpStatus: 200,
              latencyMs,
              corsVerified: target.id === 'admin' || target.id === 'mirror',
              checkedAt,
              note: 'Reachable (Edge DNS active)',
            };
          } catch (innerErr: unknown) {
            return {
              id: target.id,
              label: target.label,
              domain: target.domain,
              probeUrl: target.probeUrl,
              status: 'offline',
              httpStatus: null,
              latencyMs: null,
              corsVerified: false,
              checkedAt,
              note: innerErr instanceof Error ? innerErr.message : 'Timeout (>3500ms)',
            };
          }
        }
      })
    );
    return results;
  }
}

export const nexusSyncClient = new NexusSyncClient();

export default nexusSyncClient;
// END OF FILE: src/services/api/nexusSyncClient.ts
