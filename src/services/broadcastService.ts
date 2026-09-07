/**
 * Hands & Head Nexus — WhatsApp Broadcast Hub & Controlled Queue Runner
 * Implements throttled client-side queue dispatch with operator-configurable delay (2-4s).
 * Truth-based execution status: QUEUED, OPENED / INITIATED, FAILED.
 * Commits campaign records to `broadcast_campaigns` Firestore collection and REST API.
 */

import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';

export type BroadcastItemStatus = 'QUEUED' | 'OPENED / INITIATED' | 'FAILED';

export interface BroadcastRecipient {
  id: string;
  name: string;
  normalizedPhone: string;
  rawPhone?: string;
  status: BroadcastItemStatus;
  dispatchedAt?: string;
  errorMessage?: string;
}

export interface BroadcastCampaignRecord {
  id: string;
  name: string;
  audienceFilter: {
    cohortTag?: string;
    minSpend?: number;
    country?: string;
    category?: string;
  };
  recipientCount: number;
  initiatedCount: number;
  failedCount: number;
  messageTemplate: string;
  productReferences?: string[];
  promoCode?: string;
  attributionStatus: 'DETERMINISTIC_PROMO' | 'NOT TRACKED';
  timestamp: string;
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
}

export interface BroadcastRunnerOptions {
  campaignName: string;
  messageTemplate: string;
  recipients: Array<{ id: string; name: string; phone: string }>;
  delayMs?: number; // 2000 - 4000ms default 3000ms
  promoCode?: string;
  productReferences?: string[];
  audienceFilter?: { cohortTag?: string; minSpend?: number; country?: string; category?: string };
  onProgress?: (progress: {
    currentIndex: number;
    total: number;
    initiatedCount: number;
    failedCount: number;
    currentRecipient?: BroadcastRecipient;
    status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  }) => void;
}

export class BroadcastQueueRunner {
  private recipients: BroadcastRecipient[] = [];
  private currentIndex = 0;
  private isRunning = false;
  private isPaused = false;
  private isCancelled = false;
  private delayMs: number;
  private campaignRecord: BroadcastCampaignRecord;
  private onProgress?: BroadcastRunnerOptions['onProgress'];

  constructor(options: BroadcastRunnerOptions) {
    this.delayMs = Math.min(Math.max(options.delayMs || 3000, 2000), 4000);
    this.onProgress = options.onProgress;

    const campaignId = `camp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    this.recipients = options.recipients.map(r => ({
      id: r.id,
      name: r.name,
      normalizedPhone: r.phone,
      rawPhone: r.phone,
      status: 'QUEUED'
    }));

    this.campaignRecord = {
      id: campaignId,
      name: options.campaignName || 'WhatsApp Broadcast Drop',
      audienceFilter: options.audienceFilter || {},
      recipientCount: this.recipients.length,
      initiatedCount: 0,
      failedCount: 0,
      messageTemplate: options.messageTemplate,
      productReferences: options.productReferences || [],
      promoCode: options.promoCode || undefined,
      attributionStatus: options.promoCode ? 'DETERMINISTIC_PROMO' : 'NOT TRACKED',
      timestamp: new Date().toISOString(),
      status: 'QUEUED'
    };
  }

  public getCampaignRecord(): BroadcastCampaignRecord {
    return { ...this.campaignRecord };
  }

  public getRecipients(): BroadcastRecipient[] {
    return [...this.recipients];
  }

  public pause(): void {
    if (this.isRunning) {
      this.isPaused = true;
      this.campaignRecord.status = 'PAUSED';
      this.notifyProgress();
      this.commitCampaignRecord();
    }
  }

  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.campaignRecord.status = 'RUNNING';
      this.runNextItem();
    }
  }

  public cancel(): void {
    this.isCancelled = true;
    this.isRunning = false;
    this.campaignRecord.status = 'CANCELLED';
    this.notifyProgress();
    this.commitCampaignRecord();
  }

  public async start(): Promise<BroadcastCampaignRecord> {
    this.isRunning = true;
    this.isPaused = false;
    this.isCancelled = false;
    this.campaignRecord.status = 'RUNNING';

    await this.commitCampaignRecord();
    await this.runNextItem();
    return this.campaignRecord;
  }

  private async runNextItem(): Promise<void> {
    if (!this.isRunning || this.isCancelled) return;

    if (this.isPaused) {
      return;
    }

    if (this.currentIndex >= this.recipients.length) {
      this.isRunning = false;
      this.campaignRecord.status = 'COMPLETED';
      this.notifyProgress();
      await this.commitCampaignRecord();
      return;
    }

    const current = this.recipients[this.currentIndex];

    try {
      // Format dynamic greeting message
      const text = this.campaignRecord.messageTemplate
        .replace(/\{customer_name\}/g, current.name)
        .replace(/\{phone\}/g, current.normalizedPhone)
        .replace(/\{promoCode\}/g, this.campaignRecord.promoCode || 'NEXUS');

      const digits = current.normalizedPhone.replace(/[^0-9]/g, '');

      if (!digits || digits.length < 8) {
        current.status = 'FAILED';
        current.errorMessage = 'Malformed phone number format';
        this.campaignRecord.failedCount++;
      } else {
        const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;

        // Operator dispatch trigger (safely open tab or popup)
        if (typeof window !== 'undefined') {
          const popup = window.open(waUrl, '_blank', 'noopener,noreferrer');
          if (!popup) {
            console.warn('[BroadcastRunner] Popup blocker prevented direct tab open; link generated:', waUrl);
          }
        }

        // Truth-based state: client-side dispatch is INITIATED, never claim delivered
        current.status = 'OPENED / INITIATED';
        current.dispatchedAt = new Date().toISOString();
        this.campaignRecord.initiatedCount++;
      }
    } catch (err: any) {
      current.status = 'FAILED';
      current.errorMessage = err?.message || 'Dispatch error';
      this.campaignRecord.failedCount++;
    }

    this.currentIndex++;
    this.notifyProgress(current);

    // Controlled operator delay (2-4 seconds) before next dispatch
    setTimeout(() => {
      this.runNextItem();
    }, this.delayMs);
  }

  private notifyProgress(current?: BroadcastRecipient): void {
    if (this.onProgress) {
      this.onProgress({
        currentIndex: this.currentIndex,
        total: this.recipients.length,
        initiatedCount: this.campaignRecord.initiatedCount,
        failedCount: this.campaignRecord.failedCount,
        currentRecipient: current,
        status: this.campaignRecord.status
      });
    }
  }

  // Commits state to broadcast_campaigns collection and server REST
  public async commitCampaignRecord(): Promise<void> {
    try {
      const db = getFirestore();
      if (db) {
        const campRef = doc(db, 'broadcast_campaigns', this.campaignRecord.id);
        await setDoc(campRef, {
          ...this.campaignRecord,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (fsErr) {
      console.debug('[BroadcastRunner] Firestore commit fallback to REST:', fsErr);
    }

    try {
      await fetch('/api/broadcast_campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.campaignRecord)
      });
    } catch (apiErr) {
      // Local storage resilience fallback
      try {
        const saved = JSON.parse(localStorage.getItem('hh_broadcast_campaigns') || '[]');
        const updated = [this.campaignRecord, ...saved.filter((c: any) => c.id !== this.campaignRecord.id)];
        localStorage.setItem('hh_broadcast_campaigns', JSON.stringify(updated.slice(0, 50)));
      } catch (e) {}
    }
  }
}

// Global exposure
if (typeof window !== 'undefined') {
  (window as any).BroadcastQueueRunner = BroadcastQueueRunner;
}
