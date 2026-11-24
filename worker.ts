/**
 * HANDS & HEAD (NexOS) — Dual-Site Cloudflare Worker API Gateway
 * Synchronizes Primary (admin.handsandhead.com) & Backup Mirror (handsandhead.ai.studio)
 * Multi-Subdomain CORS Whitelist, D1 Ledger Endpoints & 1-Click R2 Backup Vault
 */

export interface D1Meta {
  readonly duration?: number;
  readonly changes?: number;
  readonly last_row_id?: number;
}

export interface D1Result<T = Record<string, unknown>> {
  readonly results: T[];
  readonly success: boolean;
  readonly meta?: D1Meta;
}

export interface D1PreparedStatement {
  bind(...values: ReadonlyArray<string | number | null>): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result<Record<string, unknown>>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<Array<D1Result<T>>>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface R2HTTPMetadata {
  readonly contentType?: string;
  readonly contentEncoding?: string;
  readonly cacheControl?: string;
}

export interface R2Object {
  readonly key: string;
  readonly version: string;
  readonly size: number;
  readonly etag: string;
  readonly uploaded: Date;
  readonly customMetadata?: Record<string, string>;
  readonly httpMetadata?: R2HTTPMetadata;
}

export interface R2ObjectBody extends R2Object {
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2Objects {
  readonly objects: R2Object[];
  readonly truncated: boolean;
  readonly cursor?: string;
}

export interface R2PutOptions {
  readonly httpMetadata?: R2HTTPMetadata;
  readonly customMetadata?: Record<string, string>;
}

export interface R2ListOptions {
  readonly prefix?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: string | ArrayBuffer | Uint8Array, options?: R2PutOptions): Promise<R2Object>;
  list(options?: R2ListOptions): Promise<R2Objects>;
  delete(keys: string | string[]): Promise<void>;
}

export interface WorkerEnv {
  readonly DB: D1Database;
  readonly R2_BUCKET: R2Bucket;
  readonly NEXOS_BACKUP_TOKEN?: string;
  readonly ADMIN_API_TOKEN?: string;
  readonly ENVIRONMENT?: string;
  readonly NODE_SITE_ID?: string;
}

export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface D1OrderRow {
  readonly id: string;
  readonly order_number: string;
  readonly customer_name: string;
  readonly customer_phone: string;
  readonly customer_email: string;
  readonly subdomain_source: string;
  readonly status: string;
  readonly payment_status: string;
  readonly fulfillment_status: string;
  readonly total: number;
  readonly amount_paid: number;
  readonly currency: string;
  readonly items_json: string;
  readonly shipping_address: string;
  readonly clip_id: string;
  readonly utm_campaign: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface D1FunnelEventRow {
  readonly id: string;
  readonly clip_id: string;
  readonly clip_title: string;
  readonly subdomain: string;
  readonly event_type: string;
  readonly session_id: string;
  readonly order_id: string;
  readonly revenue_bdt: number;
  readonly metadata_json: string;
  readonly created_at: string;
}

export interface D1AdSpendDailyRow {
  readonly id: string;
  readonly spend_date: string;
  readonly clip_id: string;
  readonly clip_title: string;
  readonly channel: string;
  readonly spend_bdt: number;
  readonly impressions: number;
  readonly clicks: number;
  readonly purchases: number;
  readonly attributed_revenue_bdt: number;
  readonly updated_at: string;
}

export interface D1ProductRow {
  readonly id: string;
  readonly sku: string;
  readonly title: string;
  readonly handle: string;
  readonly category: string;
  readonly brand: string;
  readonly status: string;
  readonly retail_price: number;
  readonly wholesale_price: number;
  readonly currency: string;
  readonly stock_qty: number;
  readonly images_json: string;
  readonly drive_file_id: string;
  readonly source_subdomain: string;
  readonly updated_at: string;
}

export interface R2MediaManifestItem {
  readonly key: string;
  readonly size: number;
  readonly etag: string;
  readonly uploaded: string;
  readonly contentType: string;
}

export interface R2BackupSnapshotSummary {
  readonly key: string;
  readonly fileName: string;
  readonly size: number;
  readonly uploaded: string;
  readonly etag: string;
  readonly recordCounts?: Record<string, number>;
}

export interface NexosCloudBackupSnapshot {
  readonly schemaVersion: 'nexos-backup-v2';
  readonly generatedAt: string;
  readonly sourceNode: string;
  readonly tables: {
    readonly orders: D1OrderRow[];
    readonly funnel_events: D1FunnelEventRow[];
    readonly ad_spend_daily: D1AdSpendDailyRow[];
    readonly products: D1ProductRow[];
  };
  readonly r2MediaManifest: R2MediaManifestItem[];
  readonly counts: {
    readonly orders: number;
    readonly funnel_events: number;
    readonly ad_spend_daily: number;
    readonly products: number;
    readonly r2Media: number;
  };
}

export interface ClipRoasSummary {
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

// ── 1. Multi-Origin CORS Whitelist ──

const EXACT_ALLOWED_ORIGINS: ReadonlySet<string> = new Set<string>([
  'https://admin.handsandhead.com',
  'https://handsandhead.ai.studio',
  'https://handsandhead.com',
  'https://www.handsandhead.com',
  'https://storyboard.handsandhead.com',
  'https://d2c.handsandhead.com',
  'https://b2b.handsandhead.com',
]);

const ALLOWED_HTTPS_SUFFIXES: ReadonlyArray<string> = [
  '.handsandhead.com',
  '.aistudio.google.com',
  '.github.io',
  '.pages.dev',
];

export function isOriginAllowed(originHeader: string | null): boolean {
  if (!originHeader) {
    return false;
  }
  const normalized = originHeader.trim();
  if (EXACT_ALLOWED_ORIGINS.has(normalized)) {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return true;
    }
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  return ALLOWED_HTTPS_SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length);
}

export function buildCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-NexOS-Source, X-NexOS-Mirror',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...buildCorsHeaders(request),
    ...(extraHeaders ?? {}),
  };
  return new Response(JSON.stringify(body), { status, headers });
}

// ── 2. Constant-Time Bearer Authentication ──

function constantTimeEquals(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i += 1) {
    const av = i < aBytes.length ? aBytes[i] : 0;
    const bv = i < bBytes.length ? bBytes[i] : 0;
    diff |= av ^ bv;
  }
  return diff === 0;
}

function verifyBackupBearerToken(request: Request, env: WorkerEnv): { ok: true } | { ok: false; status: number; error: string } {
  const expectedToken = (env.NEXOS_BACKUP_TOKEN ?? env.ADMIN_API_TOKEN ?? '').trim();
  if (!expectedToken) {
    return {
      ok: false,
      status: 503,
      error: 'Backup vault token is not configured in Worker secrets (NEXOS_BACKUP_TOKEN).',
    };
  }
  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing Authorization: Bearer token.' };
  }
  const providedToken = authHeader.slice('Bearer '.length).trim();
  if (!providedToken || !constantTimeEquals(providedToken, expectedToken)) {
    return { ok: false, status: 401, error: 'Invalid Bearer token for Backup Vault.' };
  }
  return { ok: true };
}

// ── 3. Non-Destructive Schema Initialization ──

async function ensureD1TablesExist(db: D1Database): Promise<void> {
  const statements: D1PreparedStatement[] = [
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      subdomain_source TEXT NOT NULL DEFAULT 'admin.handsandhead.com',
      status TEXT NOT NULL DEFAULT 'open',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
      total REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'BDT',
      items_json TEXT NOT NULL DEFAULT '[]',
      shipping_address TEXT NOT NULL DEFAULT '',
      clip_id TEXT NOT NULL DEFAULT '',
      utm_campaign TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS funnel_events (
      id TEXT PRIMARY KEY,
      clip_id TEXT NOT NULL DEFAULT '',
      clip_title TEXT NOT NULL DEFAULT '',
      subdomain TEXT NOT NULL DEFAULT 'd2c.handsandhead.com',
      event_type TEXT NOT NULL DEFAULT 'view',
      session_id TEXT NOT NULL DEFAULT '',
      order_id TEXT NOT NULL DEFAULT '',
      revenue_bdt REAL NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ad_spend_daily (
      id TEXT PRIMARY KEY,
      spend_date TEXT NOT NULL,
      clip_id TEXT NOT NULL,
      clip_title TEXT NOT NULL DEFAULT '',
      channel TEXT NOT NULL DEFAULT 'Meta Reels',
      spend_bdt REAL NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      purchases INTEGER NOT NULL DEFAULT 0,
      attributed_revenue_bdt REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      title TEXT NOT NULL,
      handle TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      brand TEXT NOT NULL DEFAULT 'HANDS & HEAD',
      status TEXT NOT NULL DEFAULT 'active',
      retail_price REAL NOT NULL DEFAULT 0,
      wholesale_price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'BDT',
      stock_qty INTEGER NOT NULL DEFAULT 0,
      images_json TEXT NOT NULL DEFAULT '[]',
      drive_file_id TEXT NOT NULL DEFAULT '',
      source_subdomain TEXT NOT NULL DEFAULT 'admin.handsandhead.com',
      updated_at TEXT NOT NULL
    )`),
  ];

  await db.batch(statements);
}

// ── 4. Safe Value Parsing Helpers ──

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asJsonString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return fallback;
    }
  }
  if (value !== undefined && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function formatBackupTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  return `${yyyy}-${mm}-${dd}-${hh}${min}`;
}

const VALID_R2_BACKUP_KEY_RE = /^backups\/nexos-backup-\d{4}-\d{2}-\d{2}-\d{4}(?:-[a-zA-Z0-9]{1,8})?\.json$/;

// ── 5. Backup Export & Idempotent Restore Logic ──

async function buildCloudBackupSnapshot(env: WorkerEnv): Promise<NexosCloudBackupSnapshot> {
  await ensureD1TablesExist(env.DB);

  const [ordersRes, funnelRes, adSpendRes, productsRes] = await Promise.all([
    env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all<D1OrderRow>(),
    env.DB.prepare('SELECT * FROM funnel_events ORDER BY created_at DESC').all<D1FunnelEventRow>(),
    env.DB.prepare('SELECT * FROM ad_spend_daily ORDER BY spend_date DESC').all<D1AdSpendDailyRow>(),
    env.DB.prepare('SELECT * FROM products ORDER BY updated_at DESC').all<D1ProductRow>(),
  ]);

  const r2MediaManifest: R2MediaManifestItem[] = [];
  if (env.R2_BUCKET) {
    let cursor: string | undefined;
    let guard = 0;
    do {
      const listed = await env.R2_BUCKET.list({ limit: 500, cursor });
      for (const obj of listed.objects) {
        if (!obj.key.startsWith('backups/')) {
          r2MediaManifest.push({
            key: obj.key,
            size: obj.size,
            etag: obj.etag,
            uploaded: obj.uploaded instanceof Date ? obj.uploaded.toISOString() : String(obj.uploaded),
            contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream',
          });
        }
      }
      cursor = listed.truncated ? listed.cursor : undefined;
      guard += 1;
    } while (cursor && guard < 20);
  }

  return {
    schemaVersion: 'nexos-backup-v2',
    generatedAt: new Date().toISOString(),
    sourceNode: env.NODE_SITE_ID ?? 'admin.handsandhead.com',
    tables: {
      orders: ordersRes.results ?? [],
      funnel_events: funnelRes.results ?? [],
      ad_spend_daily: adSpendRes.results ?? [],
      products: productsRes.results ?? [],
    },
    r2MediaManifest,
    counts: {
      orders: (ordersRes.results ?? []).length,
      funnel_events: (funnelRes.results ?? []).length,
      ad_spend_daily: (adSpendRes.results ?? []).length,
      products: (productsRes.results ?? []).length,
      r2Media: r2MediaManifest.length,
    },
  };
}

async function listR2BackupSnapshots(env: WorkerEnv): Promise<R2BackupSnapshotSummary[]> {
  if (!env.R2_BUCKET) {
    return [];
  }
  const listed = await env.R2_BUCKET.list({ prefix: 'backups/nexos-backup-', limit: 100 });
  const summaries: R2BackupSnapshotSummary[] = listed.objects
    .filter((obj) => VALID_R2_BACKUP_KEY_RE.test(obj.key))
    .map((obj) => {
      const fileName = obj.key.slice('backups/'.length);
      let recordCounts: Record<string, number> | undefined;
      if (obj.customMetadata?.counts) {
        try {
          const parsed: unknown = JSON.parse(obj.customMetadata.counts);
          if (isRecord(parsed)) {
            const cleanCounts: Record<string, number> = {};
            for (const [k, v] of Object.entries(parsed)) {
              cleanCounts[k] = asNumber(v, 0);
            }
            recordCounts = cleanCounts;
          }
        } catch {
          recordCounts = undefined;
        }
      }
      return {
        key: obj.key,
        fileName,
        size: obj.size,
        uploaded: obj.uploaded instanceof Date ? obj.uploaded.toISOString() : String(obj.uploaded),
        etag: obj.etag,
        recordCounts,
      };
    });

  summaries.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
  return summaries;
}

interface RestoreCounts {
  readonly orders: number;
  readonly funnel_events: number;
  readonly ad_spend_daily: number;
  readonly products: number;
}

async function restoreBackupIntoD1(env: WorkerEnv, payload: unknown): Promise<RestoreCounts> {
  await ensureD1TablesExist(env.DB);

  if (!isRecord(payload)) {
    throw new Error('Backup payload must be a valid JSON object.');
  }

  const tablesNode = isRecord(payload.tables) ? payload.tables : payload;
  const nowIso = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];

  const rawOrders = Array.isArray(tablesNode.orders) ? tablesNode.orders : [];
  let ordersCount = 0;
  for (const item of rawOrders) {
    if (!isRecord(item)) continue;
    const id = asString(item.id).trim();
    if (!id) continue;
    const orderNumber = asString(item.order_number ?? item.orderNumber, id);
    statements.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO orders (
          id, order_number, customer_name, customer_phone, customer_email,
          subdomain_source, status, payment_status, fulfillment_status,
          total, amount_paid, currency, items_json, shipping_address,
          clip_id, utm_campaign, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        orderNumber,
        asString(item.customer_name ?? item.customerName),
        asString(item.customer_phone ?? item.customerPhone ?? item.phone),
        asString(item.customer_email ?? item.customerEmail),
        asString(item.subdomain_source ?? item.subdomainSource, 'admin.handsandhead.com'),
        asString(item.status, 'open'),
        asString(item.payment_status ?? item.paymentStatus, 'pending'),
        asString(item.fulfillment_status ?? item.fulfillmentStatus, 'unfulfilled'),
        asNumber(item.total, 0),
        asNumber(item.amount_paid ?? item.amountPaid, 0),
        asString(item.currency, 'BDT'),
        asJsonString(item.items_json ?? item.items ?? item.lineItems, '[]'),
        asString(item.shipping_address ?? item.shippingAddress),
        asString(item.clip_id ?? item.clipId),
        asString(item.utm_campaign ?? item.utmCampaign),
        asString(item.created_at ?? item.createdAt, nowIso),
        asString(item.updated_at ?? item.updatedAt, nowIso)
      )
    );
    ordersCount += 1;
  }

  const rawFunnel = Array.isArray(tablesNode.funnel_events) ? tablesNode.funnel_events : [];
  let funnelCount = 0;
  for (const item of rawFunnel) {
    if (!isRecord(item)) continue;
    const id = asString(item.id).trim();
    if (!id) continue;
    statements.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO funnel_events (
          id, clip_id, clip_title, subdomain, event_type,
          session_id, order_id, revenue_bdt, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        asString(item.clip_id ?? item.clipId),
        asString(item.clip_title ?? item.clipTitle),
        asString(item.subdomain, 'd2c.handsandhead.com'),
        asString(item.event_type ?? item.eventType, 'view'),
        asString(item.session_id ?? item.sessionId),
        asString(item.order_id ?? item.orderId),
        asNumber(item.revenue_bdt ?? item.revenueBdt, 0),
        asJsonString(item.metadata_json ?? item.metadata, '{}'),
        asString(item.created_at ?? item.createdAt, nowIso)
      )
    );
    funnelCount += 1;
  }

  const rawAdSpend = Array.isArray(tablesNode.ad_spend_daily) ? tablesNode.ad_spend_daily : [];
  let adSpendCount = 0;
  for (const item of rawAdSpend) {
    if (!isRecord(item)) continue;
    const id = asString(item.id).trim();
    if (!id) continue;
    statements.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO ad_spend_daily (
          id, spend_date, clip_id, clip_title, channel,
          spend_bdt, impressions, clicks, purchases, attributed_revenue_bdt, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        asString(item.spend_date ?? item.spendDate, nowIso.slice(0, 10)),
        asString(item.clip_id ?? item.clipId, 'CLIP-01'),
        asString(item.clip_title ?? item.clipTitle),
        asString(item.channel, 'Meta Reels'),
        asNumber(item.spend_bdt ?? item.spendBdt, 0),
        Math.round(asNumber(item.impressions, 0)),
        Math.round(asNumber(item.clicks, 0)),
        Math.round(asNumber(item.purchases, 0)),
        asNumber(item.attributed_revenue_bdt ?? item.attributedRevenueBdt, 0),
        asString(item.updated_at ?? item.updatedAt, nowIso)
      )
    );
    adSpendCount += 1;
  }

  const rawProducts = Array.isArray(tablesNode.products) ? tablesNode.products : [];
  let productsCount = 0;
  for (const item of rawProducts) {
    if (!isRecord(item)) continue;
    const id = asString(item.id).trim();
    if (!id) continue;
    statements.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO products (
          id, sku, title, handle, category, brand, status,
          retail_price, wholesale_price, currency, stock_qty,
          images_json, drive_file_id, source_subdomain, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        asString(item.sku, id.toUpperCase()),
        asString(item.title, 'Hands & Head Item'),
        asString(item.handle),
        asString(item.category, 'General'),
        asString(item.brand, 'HANDS & HEAD'),
        asString(item.status, 'active'),
        asNumber(item.retail_price ?? item.retailPrice, 0),
        asNumber(item.wholesale_price ?? item.wholesalePrice, 0),
        asString(item.currency, 'BDT'),
        Math.round(asNumber(item.stock_qty ?? item.stockQty, 0)),
        asJsonString(item.images_json ?? item.images, '[]'),
        asString(item.drive_file_id ?? item.driveFileId),
        asString(item.source_subdomain ?? item.sourceSubdomain, 'admin.handsandhead.com'),
        asString(item.updated_at ?? item.updatedAt, nowIso)
      )
    );
    productsCount += 1;
  }

  // Execute in safe D1 batch chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < statements.length; i += chunkSize) {
    await env.DB.batch(statements.slice(i, i + chunkSize));
  }

  return {
    orders: ordersCount,
    funnel_events: funnelCount,
    ad_spend_daily: adSpendCount,
    products: productsCount,
  };
}

// ── 6. 10-Clip Ad ROAS Aggregator ──

function computeTenClipRoas(
  adSpendRows: ReadonlyArray<D1AdSpendDailyRow>,
  funnelRows: ReadonlyArray<D1FunnelEventRow>
): { clips: ClipRoasSummary[]; totalSpendBdt: number; totalRevenueBdt: number; blendedRoas: number } {
  const byClip = new Map<
    string,
    {
      clipId: string;
      clipTitle: string;
      channel: string;
      spendBdt: number;
      attributedRevenueBdt: number;
      impressions: number;
      clicks: number;
      purchases: number;
      funnelViews: number;
      funnelCheckouts: number;
    }
  >();

  for (const row of adSpendRows) {
    const key = row.clip_id || 'CLIP-01';
    const existing = byClip.get(key) ?? {
      clipId: key,
      clipTitle: row.clip_title || key,
      channel: row.channel || 'Meta Reels',
      spendBdt: 0,
      attributedRevenueBdt: 0,
      impressions: 0,
      clicks: 0,
      purchases: 0,
      funnelViews: 0,
      funnelCheckouts: 0,
    };
    existing.spendBdt += asNumber(row.spend_bdt, 0);
    existing.attributedRevenueBdt += asNumber(row.attributed_revenue_bdt, 0);
    existing.impressions += asNumber(row.impressions, 0);
    existing.clicks += asNumber(row.clicks, 0);
    existing.purchases += asNumber(row.purchases, 0);
    byClip.set(key, existing);
  }

  for (const evt of funnelRows) {
    if (!evt.clip_id) continue;
    const key = evt.clip_id;
    const existing = byClip.get(key) ?? {
      clipId: key,
      clipTitle: evt.clip_title || key,
      channel: evt.subdomain || 'd2c.handsandhead.com',
      spendBdt: 0,
      attributedRevenueBdt: 0,
      impressions: 0,
      clicks: 0,
      purchases: 0,
      funnelViews: 0,
      funnelCheckouts: 0,
    };
    if (evt.event_type === 'view' || evt.event_type === 'clip_play') {
      existing.funnelViews += 1;
    } else if (evt.event_type === 'checkout' || evt.event_type === 'purchase') {
      existing.funnelCheckouts += 1;
    }
    byClip.set(key, existing);
  }

  const clips: ClipRoasSummary[] = Array.from(byClip.values())
    .map((entry) => ({
      ...entry,
      roas: entry.spendBdt > 0 ? Number((entry.attributedRevenueBdt / entry.spendBdt).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 10);

  const totalSpendBdt = clips.reduce((sum, c) => sum + c.spendBdt, 0);
  const totalRevenueBdt = clips.reduce((sum, c) => sum + c.attributedRevenueBdt, 0);
  const blendedRoas = totalSpendBdt > 0 ? Number((totalRevenueBdt / totalSpendBdt).toFixed(2)) : 0;

  return { clips, totalSpendBdt, totalRevenueBdt, blendedRoas };
}

// ── 7. Main Worker Fetch Handler ──

const worker = {
  async fetch(request: Request, env: WorkerEnv, _ctx: WorkerExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request) });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    try {
      // GET /api/health
      if (request.method === 'GET' && (pathname === '/api/health' || pathname === '/health')) {
        return jsonResponse(request, {
          ok: true,
          status: 'healthy',
          node: env.NODE_SITE_ID ?? url.hostname,
          mirrorTopology: {
            primary: 'https://admin.handsandhead.com',
            backup: 'https://handsandhead.ai.studio',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // GET /api/dashboard/summary
      if (request.method === 'GET' && pathname === '/api/dashboard/summary') {
        await ensureD1TablesExist(env.DB);
        const [ordersRes, funnelRes, adSpendRes, productsRes] = await Promise.all([
          env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 250').all<D1OrderRow>(),
          env.DB.prepare('SELECT * FROM funnel_events ORDER BY created_at DESC LIMIT 500').all<D1FunnelEventRow>(),
          env.DB.prepare('SELECT * FROM ad_spend_daily ORDER BY spend_date DESC LIMIT 200').all<D1AdSpendDailyRow>(),
          env.DB.prepare('SELECT COUNT(*) AS total FROM products').first<{ total: number }>(),
        ]);

        const orders = ordersRes.results ?? [];
        const todayIso = new Date().toISOString().slice(0, 10);
        const salesToday = orders
          .filter((o) => o.created_at.startsWith(todayIso))
          .reduce((sum, o) => sum + asNumber(o.total, 0), 0);
        const totalRevenue = orders.reduce((sum, o) => sum + asNumber(o.total, 0), 0);
        const pendingOrders = orders.filter(
          (o) => o.status !== 'completed' && o.status !== 'cancelled' && o.fulfillment_status !== 'fulfilled'
        ).length;
        const completedToday = orders.filter(
          (o) => o.created_at.startsWith(todayIso) && (o.status === 'completed' || o.fulfillment_status === 'fulfilled')
        ).length;

        const tenClipAdRoas = computeTenClipRoas(adSpendRes.results ?? [], funnelRes.results ?? []);

        return jsonResponse(request, {
          ok: true,
          node: env.NODE_SITE_ID ?? url.hostname,
          generatedAt: new Date().toISOString(),
          metrics: {
            salesToday,
            totalRevenue,
            totalOrders: orders.length,
            pendingOrders,
            completedToday,
            activeProducts: asNumber(productsRes?.total, 0),
          },
          tenClipAdRoas,
          recentOrders: orders.slice(0, 25),
        });
      }

      // GET /api/catalog/public
      if (request.method === 'GET' && pathname === '/api/catalog/public') {
        await ensureD1TablesExist(env.DB);
        const category = url.searchParams.get('category')?.trim() ?? '';
        const limitParam = Math.min(200, Math.max(1, asNumber(url.searchParams.get('limit'), 100)));

        const result = category
          ? await env.DB.prepare(
              'SELECT * FROM products WHERE status = ? AND category = ? ORDER BY updated_at DESC LIMIT ?'
            )
              .bind('active', category, limitParam)
              .all<D1ProductRow>()
          : await env.DB.prepare('SELECT * FROM products WHERE status = ? ORDER BY updated_at DESC LIMIT ?')
              .bind('active', limitParam)
              .all<D1ProductRow>();

        return jsonResponse(request, {
          ok: true,
          node: env.NODE_SITE_ID ?? url.hostname,
          count: (result.results ?? []).length,
          items: result.results ?? [],
        });
      }

      // POST /api/orders/pre-create
      if (request.method === 'POST' && pathname === '/api/orders/pre-create') {
        await ensureD1TablesExist(env.DB);
        const body: unknown = await request.json();
        if (!isRecord(body)) {
          return jsonResponse(request, { ok: false, error: 'Invalid order payload.' }, 400);
        }

        const nowIso = new Date().toISOString();
        const id = asString(body.id).trim() || `ord-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;
        const orderNumber =
          asString(body.order_number ?? body.orderNumber).trim() ||
          `NX-${Math.floor(1000 + Math.random() * 9000)}`;

        await env.DB.prepare(
          `INSERT OR REPLACE INTO orders (
            id, order_number, customer_name, customer_phone, customer_email,
            subdomain_source, status, payment_status, fulfillment_status,
            total, amount_paid, currency, items_json, shipping_address,
            clip_id, utm_campaign, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            orderNumber,
            asString(body.customer_name ?? body.customerName, 'Direct Buyer'),
            asString(body.customer_phone ?? body.customerPhone ?? body.phone),
            asString(body.customer_email ?? body.customerEmail),
            asString(body.subdomain_source ?? body.subdomainSource, request.headers.get('Origin') ?? 'admin.handsandhead.com'),
            asString(body.status, 'open'),
            asString(body.payment_status ?? body.paymentStatus, 'pending'),
            asString(body.fulfillment_status ?? body.fulfillmentStatus, 'unfulfilled'),
            asNumber(body.total, 0),
            asNumber(body.amount_paid ?? body.amountPaid, 0),
            asString(body.currency, 'BDT'),
            asJsonString(body.items_json ?? body.items ?? body.lineItems, '[]'),
            asString(body.shipping_address ?? body.shippingAddress),
            asString(body.clip_id ?? body.clipId),
            asString(body.utm_campaign ?? body.utmCampaign),
            asString(body.created_at ?? body.createdAt, nowIso),
            nowIso
          )
          .run();

        const created = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<D1OrderRow>();
        return jsonResponse(request, { ok: true, node: env.NODE_SITE_ID ?? url.hostname, item: created }, 201);
      }

      // PATCH /api/orders/:id/status
      const orderStatusMatch = pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
      if (request.method === 'PATCH' && orderStatusMatch) {
        await ensureD1TablesExist(env.DB);
        const orderId = decodeURIComponent(orderStatusMatch[1]);
        const body: unknown = await request.json();
        if (!isRecord(body)) {
          return jsonResponse(request, { ok: false, error: 'Invalid status patch payload.' }, 400);
        }

        const existing = await env.DB.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?')
          .bind(orderId, orderId)
          .first<D1OrderRow>();

        if (!existing) {
          return jsonResponse(request, { ok: false, error: `Order not found: ${orderId}` }, 404);
        }

        const nextStatus = asString(body.status, existing.status);
        const nextPayment = asString(body.payment_status ?? body.paymentStatus, existing.payment_status);
        const nextFulfillment = asString(body.fulfillment_status ?? body.fulfillmentStatus, existing.fulfillment_status);
        const nextPaid = body.amount_paid !== undefined || body.amountPaid !== undefined
          ? asNumber(body.amount_paid ?? body.amountPaid, existing.amount_paid)
          : existing.amount_paid;
        const nowIso = new Date().toISOString();

        await env.DB.prepare(
          `UPDATE orders
           SET status = ?, payment_status = ?, fulfillment_status = ?, amount_paid = ?, updated_at = ?
           WHERE id = ?`
        )
          .bind(nextStatus, nextPayment, nextFulfillment, nextPaid, nowIso, existing.id)
          .run();

        const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(existing.id).first<D1OrderRow>();
        return jsonResponse(request, { ok: true, node: env.NODE_SITE_ID ?? url.hostname, item: updated });
      }

      // POST /api/sync/drive-product
      if (request.method === 'POST' && pathname === '/api/sync/drive-product') {
        await ensureD1TablesExist(env.DB);
        const body: unknown = await request.json();
        if (!isRecord(body)) {
          return jsonResponse(request, { ok: false, error: 'Invalid drive product payload.' }, 400);
        }

        const nowIso = new Date().toISOString();
        const id = asString(body.id).trim() || `prod-${Date.now().toString(36)}`;
        const sku = asString(body.sku).trim() || id.toUpperCase();
        const title = asString(body.title).trim();
        if (!title) {
          return jsonResponse(request, { ok: false, error: 'Product title is required.' }, 400);
        }

        await env.DB.prepare(
          `INSERT OR REPLACE INTO products (
            id, sku, title, handle, category, brand, status,
            retail_price, wholesale_price, currency, stock_qty,
            images_json, drive_file_id, source_subdomain, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            sku,
            title,
            asString(body.handle, title.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
            asString(body.category, 'General'),
            asString(body.brand, 'HANDS & HEAD'),
            asString(body.status, 'active'),
            asNumber(body.retail_price ?? body.retailPrice, 0),
            asNumber(body.wholesale_price ?? body.wholesalePrice, 0),
            asString(body.currency, 'BDT'),
            Math.round(asNumber(body.stock_qty ?? body.stockQty, 0)),
            asJsonString(body.images_json ?? body.images, '[]'),
            asString(body.drive_file_id ?? body.driveFileId),
            asString(body.source_subdomain ?? body.sourceSubdomain, 'admin.handsandhead.com'),
            nowIso
          )
          .run();

        const synced = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<D1ProductRow>();
        return jsonResponse(request, { ok: true, node: env.NODE_SITE_ID ?? url.hostname, item: synced });
      }

      // ── BEARER-PROTECTED BACKUP & RESTORE VAULT ENDPOINTS ──

      // GET /api/backup/export
      if (request.method === 'GET' && pathname === '/api/backup/export') {
        const auth = verifyBackupBearerToken(request, env);
        if (!auth.ok) {
          return jsonResponse(request, { ok: false, error: auth.error }, auth.status);
        }
        const snapshot = await buildCloudBackupSnapshot(env);
        const fileStamp = formatBackupTimestamp(new Date());
        return jsonResponse(request, { ok: true, snapshot }, 200, {
          'Content-Disposition': `attachment; filename="nexos-backup-${fileStamp}.json"`,
        });
      }

      // POST /api/backup/restore
      if (request.method === 'POST' && pathname === '/api/backup/restore') {
        const auth = verifyBackupBearerToken(request, env);
        if (!auth.ok) {
          return jsonResponse(request, { ok: false, error: auth.error }, auth.status);
        }
        const body: unknown = await request.json();
        const candidate = isRecord(body) && isRecord(body.snapshot) ? body.snapshot : body;
        const restored = await restoreBackupIntoD1(env, candidate);
        return jsonResponse(request, {
          ok: true,
          restoredAt: new Date().toISOString(),
          node: env.NODE_SITE_ID ?? url.hostname,
          restored,
        });
      }

      // POST /api/backup/snapshot-r2
      if (request.method === 'POST' && pathname === '/api/backup/snapshot-r2') {
        const auth = verifyBackupBearerToken(request, env);
        if (!auth.ok) {
          return jsonResponse(request, { ok: false, error: auth.error }, auth.status);
        }
        if (!env.R2_BUCKET) {
          return jsonResponse(request, { ok: false, error: 'R2_BUCKET binding is not configured.' }, 503);
        }

        const now = new Date();
        const snapshot = await buildCloudBackupSnapshot(env);
        const key = `backups/nexos-backup-${formatBackupTimestamp(now)}.json`;
        const serialized = JSON.stringify(snapshot);

        const putResult = await env.R2_BUCKET.put(key, serialized, {
          httpMetadata: {
            contentType: 'application/json; charset=utf-8',
            cacheControl: 'no-store',
          },
          customMetadata: {
            schemaVersion: snapshot.schemaVersion,
            sourceNode: snapshot.sourceNode,
            counts: JSON.stringify(snapshot.counts),
          },
        });

        const snapshots = await listR2BackupSnapshots(env);
        return jsonResponse(request, {
          ok: true,
          savedKey: putResult.key,
          size: putResult.size,
          uploaded: putResult.uploaded instanceof Date ? putResult.uploaded.toISOString() : now.toISOString(),
          counts: snapshot.counts,
          snapshots,
        });
      }

      // GET /api/backup/snapshots
      if (request.method === 'GET' && pathname === '/api/backup/snapshots') {
        const auth = verifyBackupBearerToken(request, env);
        if (!auth.ok) {
          return jsonResponse(request, { ok: false, error: auth.error }, auth.status);
        }
        const snapshots = await listR2BackupSnapshots(env);
        return jsonResponse(request, { ok: true, snapshots });
      }

      // POST /api/backup/restore-r2
      if (request.method === 'POST' && pathname === '/api/backup/restore-r2') {
        const auth = verifyBackupBearerToken(request, env);
        if (!auth.ok) {
          return jsonResponse(request, { ok: false, error: auth.error }, auth.status);
        }
        if (!env.R2_BUCKET) {
          return jsonResponse(request, { ok: false, error: 'R2_BUCKET binding is not configured.' }, 503);
        }
        const body: unknown = await request.json();
        const key = isRecord(body) ? asString(body.key).trim() : '';
        if (!VALID_R2_BACKUP_KEY_RE.test(key)) {
          return jsonResponse(request, { ok: false, error: 'Invalid R2 backup snapshot key.' }, 400);
        }

        const objectBody = await env.R2_BUCKET.get(key);
        if (!objectBody) {
          return jsonResponse(request, { ok: false, error: `R2 backup not found: ${key}` }, 404);
        }

        const parsedPayload: unknown = await objectBody.json();
        const restored = await restoreBackupIntoD1(env, parsedPayload);
        return jsonResponse(request, {
          ok: true,
          restoredKey: key,
          restoredAt: new Date().toISOString(),
          restored,
        });
      }

      return jsonResponse(request, { ok: false, error: `Route not found: ${pathname}` }, 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal Worker error';
      return jsonResponse(request, { ok: false, error: message }, 500);
    }
  },
};

export default worker;
// END OF FILE: worker.ts
