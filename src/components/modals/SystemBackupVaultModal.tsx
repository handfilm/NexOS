import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Unlock,
  Server,
  Globe,
  Database,
  HardDrive,
  Activity,
  RotateCcw,
  FileJson,
  TrendingUp,
} from 'lucide-react';
import {
  nexusSyncClient,
  DualSiteHealthState,
  R2BackupSnapshotItem,
  SubdomainProbeResult,
  DashboardSummaryResponse,
  VaultAuthStatus,
  NodeHealthStatus,
} from '../../services/api/nexusSyncClient';

export interface SystemBackupVaultModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialTab?: 'vault' | 'endpoints' | 'roas';
}

interface ParsedBackupPreview {
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly schemaVersion: string;
  readonly exportedAt: string;
  readonly ordersCount: number;
  readonly funnelEventsCount: number;
  readonly adSpendCount: number;
  readonly productsCount: number;
  readonly localStoresCount: number;
  readonly rawPayload: unknown;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatFileStamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}-${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}`;
}

function getStatusDotClass(status: NodeHealthStatus): string {
  if (status === 'online') return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
  if (status === 'degraded') return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
  if (status === 'checking') return 'bg-sky-400 animate-pulse';
  return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]';
}

function getStatusBadgeClass(status: NodeHealthStatus): string {
  if (status === 'online') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (status === 'degraded') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (status === 'checking') return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseUploadedBackupJson(fileName: string, fileSizeBytes: number, rawText: string): ParsedBackupPreview {
  const parsed: unknown = JSON.parse(rawText);
  if (!isRecord(parsed)) {
    throw new Error('Backup JSON must contain a root object.');
  }

  const cloudRoot = isRecord(parsed.cloudD1) ? parsed.cloudD1 : parsed;
  const tablesRoot = isRecord(cloudRoot.tables) ? cloudRoot.tables : cloudRoot;

  const ordersCount = Array.isArray(tablesRoot.orders) ? tablesRoot.orders.length : 0;
  const funnelEventsCount = Array.isArray(tablesRoot.funnel_events) ? tablesRoot.funnel_events.length : 0;
  const adSpendCount = Array.isArray(tablesRoot.ad_spend_daily) ? tablesRoot.ad_spend_daily.length : 0;
  const productsCount = Array.isArray(tablesRoot.products) ? tablesRoot.products.length : 0;
  const localStoresCount = Array.isArray(parsed.localIndexedDb) ? parsed.localIndexedDb.length : 0;

  if (ordersCount === 0 && funnelEventsCount === 0 && adSpendCount === 0 && productsCount === 0 && localStoresCount === 0) {
    throw new Error('No recognizable NexOS D1 tables or IndexedDB stores found in this JSON file.');
  }

  const schemaVersion =
    typeof parsed.schemaVersion === 'string'
      ? parsed.schemaVersion
      : typeof cloudRoot.schemaVersion === 'string'
      ? cloudRoot.schemaVersion
      : 'nexos-backup-legacy';

  const exportedAt =
    typeof parsed.exportedAt === 'string'
      ? parsed.exportedAt
      : typeof cloudRoot.generatedAt === 'string'
      ? cloudRoot.generatedAt
      : new Date().toISOString();

  return {
    fileName,
    fileSizeBytes,
    schemaVersion,
    exportedAt,
    ordersCount,
    funnelEventsCount,
    adSpendCount,
    productsCount,
    localStoresCount,
    rawPayload: parsed,
  };
}

export const SystemBackupVaultModal: React.FC<SystemBackupVaultModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'vault',
}) => {
  const [activeTab, setActiveTab] = useState<'vault' | 'endpoints' | 'roas'>(initialTab);
  const [health, setHealth] = useState<DualSiteHealthState>(() => nexusSyncClient.getHealthState());
  const [authStatus, setAuthStatus] = useState<VaultAuthStatus>({
    configuredViaEnv: false,
    claimed: false,
    requiresFirstRunClaim: false,
    authenticated: nexusSyncClient.hasVaultBearerToken(),
  });
  const [vaultSecretInput, setVaultSecretInput] = useState<string>('');
  const [authBusy, setAuthBusy] = useState<boolean>(false);

  const [snapshots, setSnapshots] = useState<R2BackupSnapshotItem[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState<boolean>(false);
  const [exportBusy, setExportBusy] = useState<boolean>(false);
  const [snapshotBusy, setSnapshotBusy] = useState<boolean>(false);
  const [restoreBusyKey, setRestoreBusyKey] = useState<string | null>(null);
  const [confirmRestoreKey, setConfirmRestoreKey] = useState<string | null>(null);

  const [uploadPreview, setUploadPreview] = useState<ParsedBackupPreview | null>(null);
  const [uploadRestoreBusy, setUploadRestoreBusy] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  const [endpointProbes, setEndpointProbes] = useState<SubdomainProbeResult[]>([]);
  const [probingEndpoints, setProbingEndpoints] = useState<boolean>(false);

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  const [banner, setBanner] = useState<{ readonly type: 'ok' | 'error' | 'info'; readonly text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const unsub = nexusSyncClient.subscribeHealth((next) => {
      setHealth(next);
    });
    return unsub;
  }, []);

  const loadSnapshots = useCallback(async () => {
    if (!nexusSyncClient.hasVaultBearerToken()) {
      return;
    }
    setLoadingSnapshots(true);
    try {
      const list = await nexusSyncClient.listR2Snapshots();
      setSnapshots(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load R2 snapshots.';
      setBanner({ type: 'error', text: msg });
    } finally {
      setLoadingSnapshots(false);
    }
  }, []);

  const runEndpointTester = useCallback(async () => {
    setProbingEndpoints(true);
    try {
      const [results] = await Promise.all([
        nexusSyncClient.testAllEcosystemEndpoints(),
        nexusSyncClient.refreshDualSiteHealth(),
      ]);
      setEndpointProbes(results);
    } finally {
      setProbingEndpoints(false);
    }
  }, []);

  const loadDashboardRoas = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const summary = await nexusSyncClient.getDashboardSummary();
      setDashboardSummary(summary);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setBanner(null);
    let active = true;

    const initModal = async (): Promise<void> => {
      const status = await nexusSyncClient.getVaultAuthStatus();
      if (!active) return;
      setAuthStatus(status);
      if (status.authenticated && nexusSyncClient.hasVaultBearerToken()) {
        await loadSnapshots();
      }
      await Promise.all([runEndpointTester(), loadDashboardRoas()]);
    };

    void initModal();
    return () => {
      active = false;
    };
  }, [isOpen, loadSnapshots, runEndpointTester, loadDashboardRoas]);

  if (!isOpen) {
    return null;
  }

  const handleUnlockOrClaim = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const secret = vaultSecretInput.trim();
    if (secret.length < 6) {
      setBanner({ type: 'error', text: 'Enter a Vault Passphrase or Bearer Token (minimum 6 characters).' });
      return;
    }
    setAuthBusy(true);
    setBanner(null);
    try {
      const result = await nexusSyncClient.claimOrUnlockVault(secret);
      if (!result.ok) {
        setBanner({ type: 'error', text: result.error ?? 'Vault authorization failed.' });
        return;
      }
      setVaultSecretInput('');
      const refreshed = await nexusSyncClient.getVaultAuthStatus();
      setAuthStatus({ ...refreshed, authenticated: true });
      setBanner({
        type: 'ok',
        text:
          result.mode === 'claimed'
            ? 'Vault admin passphrase claimed securely on server. In-memory Bearer session active.'
            : 'Backup Vault unlocked with verified in-memory Bearer token.',
      });
      await loadSnapshots();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLockVault = (): void => {
    nexusSyncClient.clearVaultBearerToken();
    setAuthStatus((prev) => ({ ...prev, authenticated: false }));
    setSnapshots([]);
    setConfirmRestoreKey(null);
    setBanner({ type: 'info', text: 'Vault session locked and Bearer token cleared from memory.' });
  };

  const handleDownloadFullBackup = async (): Promise<void> => {
    if (!authStatus.authenticated || !nexusSyncClient.hasVaultBearerToken()) {
      setBanner({ type: 'error', text: 'Unlock the Backup Vault above before exporting D1 + IndexedDB snapshots.' });
      return;
    }
    setExportBusy(true);
    setBanner(null);
    try {
      const bundle = await nexusSyncClient.exportFullBackup();
      const serialized = JSON.stringify(bundle, null, 2);
      const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `nexos-full-backup-${formatFileStamp(new Date())}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);

      setBanner({
        type: 'ok',
        text: `Downloaded full backup (${bundle.cloudD1.counts.orders} orders, ${bundle.cloudD1.counts.products} products, ${bundle.cloudD1.counts.funnel_events} funnel events, ${bundle.cloudD1.counts.ad_spend_daily} ad spend rows + ${bundle.localIndexedDb.length} local IndexedDB stores).`,
      });
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to export full backup.',
      });
    } finally {
      setExportBusy(false);
    }
  };

  const handleSaveSnapshotToR2 = async (): Promise<void> => {
    if (!authStatus.authenticated || !nexusSyncClient.hasVaultBearerToken()) {
      setBanner({ type: 'error', text: 'Unlock the Backup Vault above before writing a Cloudflare R2 snapshot.' });
      return;
    }
    setSnapshotBusy(true);
    setBanner(null);
    try {
      const res = await nexusSyncClient.saveSnapshotToR2();
      setSnapshots(res.snapshots);
      setBanner({
        type: 'ok',
        text: `Saved R2 snapshot ${res.savedKey} (${formatBytes(res.size)}). ${res.snapshots.length} restore point(s) available.`,
      });
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save snapshot to Cloudflare R2.',
      });
    } finally {
      setSnapshotBusy(false);
    }
  };

  const handleRestoreR2Snapshot = async (key: string): Promise<void> => {
    if (!authStatus.authenticated || !nexusSyncClient.hasVaultBearerToken()) {
      setBanner({ type: 'error', text: 'Unlock the Backup Vault above before restoring an R2 snapshot.' });
      return;
    }
    setRestoreBusyKey(key);
    setBanner(null);
    try {
      const res = await nexusSyncClient.restoreFromR2Snapshot(key);
      setConfirmRestoreKey(null);
      const summary = Object.entries(res.restored)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
      setBanner({
        type: 'ok',
        text: `Idempotently restored ${res.restoredKey} into D1 (${summary}). Existing schemas preserved.`,
      });
      await loadDashboardRoas();
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to restore R2 snapshot.',
      });
    } finally {
      setRestoreBusyKey(null);
    }
  };

  const processSelectedFile = async (file: File): Promise<void> => {
    setBanner(null);
    if (!file.name.toLowerCase().endsWith('.json')) {
      setBanner({ type: 'error', text: 'Please select a valid NexOS .json backup file.' });
      return;
    }
    try {
      const text = await file.text();
      const preview = parseUploadedBackupJson(file.name, file.size, text);
      setUploadPreview(preview);
      setBanner({
        type: 'info',
        text: `Validated ${file.name} (${preview.schemaVersion}). Review counts below and confirm restore.`,
      });
    } catch (err: unknown) {
      setUploadPreview(null);
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Invalid JSON backup file.',
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      void processSelectedFile(file);
    }
    e.target.value = '';
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processSelectedFile(file);
    }
  };

  const handleConfirmLocalRestore = async (): Promise<void> => {
    if (!uploadPreview) return;
    if (!authStatus.authenticated || !nexusSyncClient.hasVaultBearerToken()) {
      setBanner({ type: 'error', text: 'Unlock the Backup Vault above before restoring from a local JSON file.' });
      return;
    }
    setUploadRestoreBusy(true);
    setBanner(null);
    try {
      const res = await nexusSyncClient.restoreFromBackupPayload(uploadPreview.rawPayload);
      const cloudSummary = Object.entries(res.restoredCloud)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
      setBanner({
        type: 'ok',
        text: `Restored ${uploadPreview.fileName} — D1 (${cloudSummary}) + ${res.restoredLocalRecords} local IndexedDB mirror records.`,
      });
      setUploadPreview(null);
      await loadDashboardRoas();
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Restore failed.',
      });
    } finally {
      setUploadRestoreBusy(false);
    }
  };

  const handleFlushOfflineQueue = async (): Promise<void> => {
    const flushed = await nexusSyncClient.flushOfflineQueue();
    setBanner({
      type: 'ok',
      text: flushed > 0 ? `Replayed ${flushed} queued offline write(s) to mirror.` : 'Offline write queue is clean (0 pending).',
    });
  };

  return (
    <div
      className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-vault-modal-title"
    >
      <div
        className="relative w-full max-w-5xl bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col my-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-slate-900/95 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="backup-vault-modal-title" className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Backup &amp; Mirror Vault
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                  DUAL-SITE SYNC
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                  ACTIVE: {health.activeNode.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                PRIMARY: admin.handsandhead.com · BACKUP: handsandhead.ai.studio · D1 + Cloudflare R2 + IndexedDB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void runEndpointTester()}
              disabled={probingEndpoints}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probingEndpoints ? 'animate-spin' : ''}`} />
              <span>Ping Mirrors</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Close Backup & Mirror Vault"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Dual-Site Health Strip */}
        <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-slate-200">
              <span className={`w-2 h-2 rounded-full ${getStatusDotClass(health.primary.status)}`} />
              <span className="text-slate-400">PRIMARY:</span>
              <span className="font-semibold">admin.handsandhead.com</span>
              {health.primary.latencyMs !== null && (
                <span className="text-slate-400">({health.primary.latencyMs}ms)</span>
              )}
            </span>
            <span className="text-slate-700">|</span>
            <span className="inline-flex items-center gap-1.5 text-slate-200">
              <span className={`w-2 h-2 rounded-full ${getStatusDotClass(health.backup.status)}`} />
              <span className="text-slate-400">BACKUP:</span>
              <span className="font-semibold">handsandhead.ai.studio</span>
              {health.backup.latencyMs !== null && (
                <span className="text-slate-400">({health.backup.latencyMs}ms)</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Failover Threshold: <span className="text-amber-400 font-bold">3500ms</span>
            </span>
            {health.pendingOfflineWrites > 0 && (
              <button
                type="button"
                onClick={() => void handleFlushOfflineQueue()}
                className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
              >
                Flush {health.pendingOfflineWrites} Offline Write(s)
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'vault'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>1-Click Backup &amp; R2 Vault</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('endpoints')}
            className={`px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'endpoints'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Live Mirror &amp; 6-Subdomain Tester</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roas')}
            className={`px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'roas'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>10-Clip Ad ROAS &amp; D1 Sync</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Status Banner */}
          {banner && (
            <div
              className={`px-4 py-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                banner.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                  : banner.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/35 text-rose-200'
                  : 'bg-sky-500/10 border-sky-500/35 text-sky-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {banner.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : banner.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <Activity className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{banner.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: 1-CLICK BACKUP & R2 VAULT */}
          {activeTab === 'vault' && (
            <div className="space-y-5">
              {/* Vault Bearer Token Gate */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {authStatus.authenticated ? (
                      <Unlock className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-400" />
                    )}
                    <div>
                      <div className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                        {authStatus.authenticated
                          ? 'Backup Vault Authorized (In-Memory Bearer Active)'
                          : authStatus.requiresFirstRunClaim
                          ? 'First-Run Vault Passphrase Setup'
                          : 'Bearer Token Required for Export, R2 Snapshot & Restore'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {authStatus.authenticated
                          ? 'Protected D1 & Cloudflare R2 backup routes are unlocked for this session only (never written to localStorage).'
                          : authStatus.requiresFirstRunClaim
                          ? 'NEXOS_BACKUP_TOKEN is unset on this preview server. Claim a server-hashed Vault Passphrase once to unlock backups.'
                          : 'Enter your NEXOS_BACKUP_TOKEN or claimed Vault Passphrase to authorize backup and restore operations.'}
                      </div>
                    </div>
                  </div>

                  {authStatus.authenticated && (
                    <button
                      type="button"
                      onClick={handleLockVault}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-300 cursor-pointer"
                    >
                      Lock Vault
                    </button>
                  )}
                </div>

                {!authStatus.authenticated && (
                  <form onSubmit={handleUnlockOrClaim} className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={vaultSecretInput}
                      onChange={(e) => setVaultSecretInput(e.target.value)}
                      placeholder={
                        authStatus.requiresFirstRunClaim
                          ? 'Choose first-run Vault Passphrase (min 6 chars)…'
                          : 'Enter Vault Passphrase or NEXOS_BACKUP_TOKEN…'
                      }
                      autoComplete="current-password"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={authBusy}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-60"
                    >
                      {authBusy
                        ? 'Verifying…'
                        : authStatus.requiresFirstRunClaim
                        ? 'Claim & Unlock Vault'
                        : 'Unlock Vault'}
                    </button>
                  </form>
                )}
              </div>

              {/* Primary Action Cards: Download Full Backup + Save Snapshot to R2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>1-Click Download Full Backup (.JSON)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                        D1 + IDB
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Exports all Cloudflare D1 tables (<code className="text-slate-200">orders</code>,{' '}
                      <code className="text-slate-200">funnel_events</code>,{' '}
                      <code className="text-slate-200">ad_spend_daily</code>,{' '}
                      <code className="text-slate-200">products</code>), R2 media manifest, and local browser IndexedDB
                      NexOS stores into a single portable archive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDownloadFullBackup()}
                    disabled={exportBusy || !authStatus.authenticated}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>{exportBusy ? 'Generating Full Backup…' : 'Download Full Backup (.JSON)'}</span>
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                        <CloudUpload className="w-4 h-4 text-amber-400" />
                        <span>1-Click Save Snapshot to Cloudflare R2</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px]">
                        R2 BUCKET
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Writes a timestamped snapshot directly to{' '}
                      <code className="text-slate-200">backups/nexos-backup-YYYY-MM-DD-HHmm.json</code> in{' '}
                      <code className="text-slate-200">R2_BUCKET</code> with instant 1-click point-in-time restore.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveSnapshotToR2()}
                    disabled={snapshotBusy || !authStatus.authenticated}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>{snapshotBusy ? 'Writing Snapshot to R2…' : 'Save Snapshot to Cloudflare R2'}</span>
                  </button>
                </div>
              </div>

              {/* Recent R2 Restore Points */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                      Cloudflare R2 Restore Points ({snapshots.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadSnapshots()}
                    disabled={loadingSnapshots || !authStatus.authenticated}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingSnapshots ? 'animate-spin' : ''}`} />
                    <span>Refresh List</span>
                  </button>
                </div>

                {!authStatus.authenticated ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-mono">
                    Unlock the Vault above to view and restore Cloudflare R2 snapshots.
                  </div>
                ) : snapshots.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No R2 snapshots stored yet. Click <strong>Save Snapshot to Cloudflare R2</strong> to create your
                    first restore point.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
                    {snapshots.map((snap) => {
                      const isConfirming = confirmRestoreKey === snap.key;
                      const isRestoring = restoreBusyKey === snap.key;
                      return (
                        <div
                          key={snap.key}
                          className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-800/35 transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <FileJson className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="text-xs font-mono font-semibold text-white truncate">
                                {snap.fileName}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>{formatTimestamp(snap.uploaded)}</span>
                              <span>{formatBytes(snap.size)}</span>
                              {snap.recordCounts && (
                                <span className="text-slate-300">
                                  Orders: {snap.recordCounts.orders ?? 0} · Products: {snap.recordCounts.products ?? 0}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isConfirming ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleRestoreR2Snapshot(snap.key)}
                                  disabled={isRestoring}
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-[11px] font-mono font-bold cursor-pointer disabled:opacity-60"
                                >
                                  {isRestoring ? 'Restoring…' : 'Confirm Restore'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRestoreKey(null)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRestoreKey(snap.key)}
                                disabled={restoreBusyKey !== null}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600/20 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 1-Click Restore from Local .JSON File */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                      1-Click Restore from Local .JSON File
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Idempotent INSERT OR REPLACE · Zero Schema Drop
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleDropFile}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-xl border-2 border-dashed p-5 text-center transition cursor-pointer ${
                    isDraggingFile
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-950/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-200">
                    Drop a NexOS Backup (.json) here or click to select from device
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Restores D1 tables (orders, funnel_events, ad_spend_daily, products) and local IndexedDB caches
                    non-destructively.
                  </div>
                </div>

                {uploadPreview && (
                  <div className="rounded-xl border border-sky-500/35 bg-sky-950/25 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-mono font-bold text-white">{uploadPreview.fileName}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {uploadPreview.schemaVersion} · {formatBytes(uploadPreview.fileSizeBytes)} · Exported{' '}
                          {formatTimestamp(uploadPreview.exportedAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadPreview(null)}
                        className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                      <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                        <div className="text-[10px] text-slate-400">ORDERS</div>
                        <div className="text-sm font-bold text-white">{uploadPreview.ordersCount}</div>
                      </div>
                      <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                        <div className="text-[10px] text-slate-400">FUNNEL</div>
                        <div className="text-sm font-bold text-white">{uploadPreview.funnelEventsCount}</div>
                      </div>
                      <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                        <div className="text-[10px] text-slate-400">AD SPEND</div>
                        <div className="text-sm font-bold text-white">{uploadPreview.adSpendCount}</div>
                      </div>
                      <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                        <div className="text-[10px] text-slate-400">PRODUCTS</div>
                        <div className="text-sm font-bold text-white">{uploadPreview.productsCount}</div>
                      </div>
                      <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                        <div className="text-[10px] text-slate-400">IDB STORES</div>
                        <div className="text-sm font-bold text-white">{uploadPreview.localStoresCount}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleConfirmLocalRestore()}
                      disabled={uploadRestoreBusy || !authStatus.authenticated}
                      className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      {uploadRestoreBusy ? 'Restoring Records to D1 + IndexedDB…' : 'Confirm 1-Click Idempotent Restore'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE MIRROR STATUS & 6-SUBDOMAIN ENDPOINT TESTER */}
          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Live Mirror Status &amp; Multi-Subdomain CORS Matrix
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verifies real-time reachability across Primary, Backup Mirror, Storyboard, D2C, B2B, and RAWx.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void runEndpointTester()}
                  disabled={probingEndpoints}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${probingEndpoints ? 'animate-spin' : ''}`} />
                  <span>{probingEndpoints ? 'Testing 6 Endpoints…' : 'Run Live Endpoint Test'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {endpointProbes.map((probe) => (
                  <div
                    key={probe.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusDotClass(probe.status)}`} />
                        <span className="text-xs font-bold text-white truncate">{probe.label}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase ${getStatusBadgeClass(
                          probe.status
                        )}`}
                      >
                        {probe.status}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-amber-300 truncate">{probe.domain}</div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>
                        Latency:{' '}
                        <strong className="text-slate-200">
                          {probe.latencyMs !== null ? `${probe.latencyMs}ms` : 'N/A'}
                        </strong>
                      </span>
                      <span>
                        HTTP: <strong className="text-slate-200">{probe.httpStatus ?? '—'}</strong>
                      </span>
                      <span>{probe.note}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-300 space-y-1.5">
                <div className="font-mono text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  <span>CORS Whitelist Active in worker.ts &amp; Express Mirror</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Dynamic origin verification allows{' '}
                  <code className="text-slate-200">admin.handsandhead.com</code>,{' '}
                  <code className="text-slate-200">handsandhead.ai.studio</code>,{' '}
                  <code className="text-slate-200">handsandhead.com</code>,{' '}
                  <code className="text-slate-200">storyboard.handsandhead.com</code>,{' '}
                  <code className="text-slate-200">d2c.handsandhead.com</code>,{' '}
                  <code className="text-slate-200">b2b.handsandhead.com</code>, plus{' '}
                  <code className="text-slate-200">*.handsandhead.com</code>,{' '}
                  <code className="text-slate-200">*.aistudio.google.com</code>,{' '}
                  <code className="text-slate-200">*.github.io</code> (RAWx),{' '}
                  <code className="text-slate-200">*.pages.dev</code>, and <code className="text-slate-200">localhost</code>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: 10-CLIP AD ROAS & D1 SYNC SUMMARY */}
          {activeTab === 'roas' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">10-Clip Ad ROAS &amp; Dual-Site D1 Telemetry</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live feed from <code className="text-slate-200">GET /api/dashboard/summary</code> with 3500ms
                    automatic failover and IndexedDB mirror caching.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadDashboardRoas()}
                  disabled={loadingSummary}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
                  <span>Refresh ROAS</span>
                </button>
              </div>

              {dashboardSummary && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                      <div className="text-[10px] uppercase text-slate-400">Blended ROAS</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">
                        {dashboardSummary.tenClipAdRoas.blendedRoas.toFixed(2)}x
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                      <div className="text-[10px] uppercase text-slate-400">Ad Spend (BDT)</div>
                      <div className="text-xl font-bold text-white mt-1">
                        ৳{dashboardSummary.tenClipAdRoas.totalSpendBdt.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                      <div className="text-[10px] uppercase text-slate-400">Attributed Rev</div>
                      <div className="text-xl font-bold text-amber-400 mt-1">
                        ৳{dashboardSummary.tenClipAdRoas.totalRevenueBdt.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                      <div className="text-[10px] uppercase text-slate-400">Served By Node</div>
                      <div className="text-sm font-bold text-sky-300 mt-2 truncate">
                        {dashboardSummary.fromOfflineCache ? 'IndexedDB Offline' : dashboardSummary.node}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 bg-slate-900/90">
                          <th className="py-2.5 px-3">Clip ID</th>
                          <th className="py-2.5 px-3">Creative Title</th>
                          <th className="py-2.5 px-3">Channel</th>
                          <th className="py-2.5 px-3 text-right">Spend</th>
                          <th className="py-2.5 px-3 text-right">Revenue</th>
                          <th className="py-2.5 px-3 text-right">ROAS</th>
                          <th className="py-2.5 px-3 text-right">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {dashboardSummary.tenClipAdRoas.clips.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 px-4 text-center text-slate-400">
                              No ad_spend_daily or funnel_events rows recorded yet.
                            </td>
                          </tr>
                        ) : (
                          dashboardSummary.tenClipAdRoas.clips.map((clip) => (
                            <tr key={clip.clipId} className="hover:bg-slate-800/35">
                              <td className="py-2.5 px-3 font-bold text-amber-300">{clip.clipId}</td>
                              <td
                                className="py-2.5 px-3 text-slate-200 font-sans"
                                style={{ letterSpacing: 0, fontKerning: 'normal', fontVariantLigatures: 'normal' }}
                              >
                                {clip.clipTitle}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{clip.channel}</td>
                              <td className="py-2.5 px-3 text-right text-slate-300">
                                ৳{clip.spendBdt.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-300 font-semibold">
                                ৳{clip.attributedRevenueBdt.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    clip.roas >= 3
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : clip.roas >= 1.5
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {clip.roas.toFixed(2)}x
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-200">{clip.purchases}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemBackupVaultModal;
// END OF FILE: src/components/modals/SystemBackupVaultModal.tsx
