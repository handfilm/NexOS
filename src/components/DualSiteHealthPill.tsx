import React, { useEffect, useState } from 'react';
import {
  nexusSyncClient,
  DualSiteHealthState,
  NodeHealthStatus,
} from '../services/api/nexusSyncClient';

export interface DualSiteHealthPillProps {
  readonly onOpenVault: () => void;
  readonly variant?: 'topbar' | 'dark-nav';
}

function dotColorHex(status: NodeHealthStatus): string {
  if (status === 'online') return '#10B981';
  if (status === 'degraded') return '#F59E0B';
  if (status === 'checking') return '#38BDF8';
  return '#EF4444';
}

export const DualSiteHealthPill: React.FC<DualSiteHealthPillProps> = ({
  onOpenVault,
  variant = 'dark-nav',
}) => {
  const [health, setHealth] = useState<DualSiteHealthState>(() => nexusSyncClient.getHealthState());

  useEffect(() => {
    nexusSyncClient.startHealthMonitor(30000);
    const unsub = nexusSyncClient.subscribeHealth((next) => {
      setHealth(next);
    });
    return unsub;
  }, []);

  const primaryDot = dotColorHex(health.primary.status);
  const backupDot = dotColorHex(health.backup.status);

  if (variant === 'topbar') {
    return (
      <button
        type="button"
        onClick={onOpenVault}
        className="dual-site-health-pill"
        title="Open Dual-Site Backup & Mirror Vault (3500ms auto-failover)"
      >
        <span className="dshp-seg">
          <span className="dshp-k">PRIMARY:</span>
          <span className="dshp-h">admin.handsandhead.com</span>
          <span className="dshp-dot" style={{ backgroundColor: primaryDot }} />
        </span>
        <span className="dshp-sep">|</span>
        <span className="dshp-seg">
          <span className="dshp-k">BACKUP:</span>
          <span className="dshp-h">handsandhead.ai.studio</span>
          <span className="dshp-dot" style={{ backgroundColor: backupDot }} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenVault}
      className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-900/85 hover:bg-neutral-800 border border-white/10 hover:border-amber-500/40 text-[10px] font-mono text-neutral-300 transition cursor-pointer shrink-0"
      title="Open Dual-Site Backup & Mirror Vault"
    >
      <span className="inline-flex items-center gap-1">
        <span className="text-neutral-500">PRIMARY:</span>
        <span className="font-semibold text-neutral-200">admin.handsandhead.com</span>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryDot }} />
      </span>
      <span className="text-neutral-600">|</span>
      <span className="inline-flex items-center gap-1">
        <span className="text-neutral-500">BACKUP:</span>
        <span className="font-semibold text-neutral-200">handsandhead.ai.studio</span>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: backupDot }} />
      </span>
    </button>
  );
};

export default DualSiteHealthPill;
// END OF FILE: src/components/DualSiteHealthPill.tsx
