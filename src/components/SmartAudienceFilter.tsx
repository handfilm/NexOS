import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  getCountFromServer
} from 'firebase/firestore';

export interface AudienceFilterCriteria {
  minSpend: number;
  cohortTag: string;
  country: string;
  search: string;
  orderCountFilter: 'all' | '1' | '2plus' | '5plus' | 'dormant90';
}

export interface SmartAudienceFilterProps {
  criteria: AudienceFilterCriteria;
  onChange: (newCriteria: AudienceFilterCriteria) => void;
  onReset?: () => void;
  matchingCount?: number;
  totalDatabaseCount?: number;
  loadingCount?: boolean;
  onBroadcastToAudience?: (criteria: AudienceFilterCriteria, count: number) => void;
  className?: string;
}

export const COHORT_TAG_OPTIONS = [
  { value: 'all', label: 'All Cohorts', icon: '🌐', desc: 'Full active database' },
  { value: 'vip', label: 'VIP Patron (৳50K+)', icon: '👑', desc: 'Highest value patrons' },
  { value: 'wholesale', label: 'Wholesale & B2B', icon: '🏢', desc: 'Bulk volume accounts' },
  { value: 'atelier', label: 'Atelier Direct', icon: '🌿', desc: 'Bespoke leather commissions' },
  { value: 'leather', label: 'Leather Collectors', icon: '💼', desc: 'Full-grain & veg-tan buyers' },
  { value: 'repeat', label: 'Repeat Buyers (2+)', icon: '🔁', desc: 'Multi-order retainers' },
  { value: 'europe', label: 'EU & Export Importers', icon: '🇪🇺', desc: 'NL, DE, GB global buyers' },
  { value: 'corporate', label: 'Corporate Gifting', icon: '🎁', desc: 'Custom embossed gifts' },
  { value: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Domestic COD clients' },
  { value: 'dormant90', label: 'Dormant (90d+ No Order)', icon: '⏳', desc: 'Win-back candidates' }
];

export const MIN_SPEND_PRESETS = [
  { label: 'Any Spend', value: 0 },
  { label: '৳5,000+', value: 5000 },
  { label: '৳15,000+', value: 15000 },
  { label: '৳50,000+ (VIP)', value: 50000 },
  { label: '৳100,000+ (Wholesale)', value: 100000 }
];

export const ORDER_COUNT_OPTIONS = [
  { value: 'all', label: 'All Orders' },
  { value: '1', label: '1 Order (First Time)' },
  { value: '2plus', label: '2+ Orders (Repeat)' },
  { value: '5plus', label: '5+ Orders (Loyal)' },
  { value: 'dormant90', label: 'Dormant (90d+)' }
];

export const COUNTRY_OPTIONS = [
  { value: 'all', label: 'All Markets' },
  { value: 'BD', label: '🇧🇩 Bangladesh' },
  { value: 'NL', label: '🇳🇱 Netherlands' },
  { value: 'DE', label: '🇩🇪 Germany' },
  { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'US', label: '🇺🇸 United States' }
];

export const SmartAudienceFilter: React.FC<SmartAudienceFilterProps> = ({
  criteria,
  onChange,
  onReset,
  matchingCount: externalMatchingCount,
  totalDatabaseCount: externalTotalCount,
  loadingCount: externalLoadingCount,
  onBroadcastToAudience,
  className = ''
}) => {
  // Internal count management
  const [internalMatchingCount, setInternalMatchingCount] = useState<number>(externalMatchingCount ?? 0);
  const [internalTotalCount, setInternalTotalCount] = useState<number>(externalTotalCount ?? 16420);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [customSpendInput, setCustomSpendInput] = useState<string>(
    criteria.minSpend > 0 ? String(criteria.minSpend) : ''
  );
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const debounceTimerRef = useRef<any>(null);

  // Sync external counts if provided
  useEffect(() => {
    if (externalMatchingCount !== undefined) {
      setInternalMatchingCount(externalMatchingCount);
    }
  }, [externalMatchingCount]);

  useEffect(() => {
    if (externalTotalCount !== undefined) {
      setInternalTotalCount(externalTotalCount);
    }
  }, [externalTotalCount]);

  // Active filter count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (criteria.minSpend > 0) count++;
    if (criteria.cohortTag !== 'all') count++;
    if (criteria.country !== 'all') count++;
    if (criteria.orderCountFilter !== 'all') count++;
    if (criteria.search.trim()) count++;
    return count;
  }, [criteria]);

  // Live Dynamic Badge Count Evaluator with Debounce
  useEffect(() => {
    // If parent passed explicit count, we can skip or supplement
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsCalculating(true);
      try {
        // Query server count endpoint for authoritative 16K+ count
        const params = new URLSearchParams({
          country: criteria.country,
          cohortTag: criteria.cohortTag,
          minSpend: String(criteria.minSpend),
          orderCountFilter: criteria.orderCountFilter,
          search: criteria.search.trim()
        });

        const res = await fetch(`/api/customers/count?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok) {
            setInternalMatchingCount(data.totalCount ?? data.count ?? 0);
            if (data.databaseTotal) {
              setInternalTotalCount(data.databaseTotal);
            }
            setIsCalculating(false);
            return;
          }
        }

        // Firestore Fallback if offline or direct Firestore connection
        try {
          const db = getFirestore();
          let q = collection(db, 'customers');
          let firestoreQuery: any = q;

          if (criteria.country !== 'all') {
            firestoreQuery = query(firestoreQuery, where('country', '==', criteria.country));
          }
          if (criteria.minSpend > 0) {
            firestoreQuery = query(firestoreQuery, where('totalSpent', '>=', criteria.minSpend));
          }
          if (criteria.cohortTag !== 'all') {
            firestoreQuery = query(firestoreQuery, where('tags', 'array-contains', criteria.cohortTag));
          }

          const countSnap = await getCountFromServer(firestoreQuery);
          setInternalMatchingCount(countSnap.data().count);
        } catch (fErr) {
          // Approximate calculation based on in-memory / cache
          if (typeof window !== 'undefined' && (window as any).CustomersService?._memCache) {
            const mem = (window as any).CustomersService._memCache;
            let filtered = mem;
            if (criteria.minSpend > 0) {
              filtered = filtered.filter((c: any) => (Number(c.totalSpent) || 0) >= criteria.minSpend);
            }
            if (criteria.cohortTag !== 'all') {
              filtered = filtered.filter((c: any) => (c.tags || []).includes(criteria.cohortTag));
            }
            if (criteria.country !== 'all') {
              filtered = filtered.filter((c: any) => c.country === criteria.country);
            }
            setInternalMatchingCount(filtered.length);
          }
        }
      } catch (err) {
        console.debug('Error evaluating live audience count:', err);
      } finally {
        setIsCalculating(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [criteria.minSpend, criteria.cohortTag, criteria.country, criteria.orderCountFilter, criteria.search]);

  // Handler helpers
  const handleMinSpendPreset = (val: number) => {
    setCustomSpendInput(val > 0 ? String(val) : '');
    onChange({ ...criteria, minSpend: val });
  };

  const handleCustomSpendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setCustomSpendInput(raw);
    const num = raw ? parseInt(raw, 10) : 0;
    onChange({ ...criteria, minSpend: num });
  };

  const handleCohortTagChange = (tag: string) => {
    onChange({ ...criteria, cohortTag: tag });
  };

  const handleCountryChange = (country: string) => {
    onChange({ ...criteria, country });
  };

  const handleOrderCountChange = (orderCountFilter: any) => {
    onChange({ ...criteria, orderCountFilter });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...criteria, search: e.target.value });
  };

  const handleClearSearch = () => {
    onChange({ ...criteria, search: '' });
  };

  const handleResetFilters = () => {
    setCustomSpendInput('');
    if (onReset) {
      onReset();
    } else {
      onChange({
        minSpend: 0,
        cohortTag: 'all',
        country: 'all',
        search: '',
        orderCountFilter: 'all'
      });
    }
  };

  const handleBroadcastClick = () => {
    if (onBroadcastToAudience) {
      onBroadcastToAudience(criteria, internalMatchingCount);
    } else if (typeof window !== 'undefined' && (window as any).openWhatsAppCampaignStudio) {
      (window as any).openWhatsAppCampaignStudio({
        cohort: criteria.cohortTag !== 'all' ? criteria.cohortTag : 'all',
        minSpend: criteria.minSpend,
        country: criteria.country !== 'all' ? criteria.country : undefined,
        audienceCount: internalMatchingCount
      });
    }
  };

  // Percentage of total ledger
  const matchingPercentage = internalTotalCount > 0
    ? ((internalMatchingCount / internalTotalCount) * 100).toFixed(1)
    : '0.0';

  const isLoading = isCalculating || externalLoadingCount;

  return (
    <div
      id="smart-audience-filter-root"
      className={`w-full bg-[#121211] border border-zinc-800 rounded-xl p-3.5 sm:p-4 text-zinc-300 font-mono transition-all ${className}`}
    >
      {/* ── TOP LIVE DYNAMIC BADGE & ACTION ROW ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-850">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Dynamic Badge */}
          <div
            id="smart-audience-live-badge"
            className="inline-flex items-center gap-2 bg-[#191918] border border-amber-500/30 px-3 py-1.5 rounded-lg shadow-sm"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLoading ? 'bg-amber-400 animate-ping' : 'bg-[#10b981] animate-pulse'
              }`}
            />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {isLoading ? 'Counting…' : `${internalMatchingCount.toLocaleString()} Matching Patrons`}
              </span>
              <span className="text-[10px] text-zinc-500">
                ({matchingPercentage}% of {internalTotalCount.toLocaleString()} Ledger)
              </span>
            </div>
          </div>

          {/* Active Filter Chips Counter */}
          {activeFiltersCount > 0 ? (
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] px-2.5 py-1 rounded-md">
              <span>🎯 {activeFiltersCount} Active {activeFiltersCount === 1 ? 'Filter' : 'Filters'}</span>
              <button
                onClick={handleResetFilters}
                className="hover:text-white transition-colors ml-1 text-xs font-bold"
                title="Clear all filters"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-500 hidden sm:inline-block">
              Server-side cursor pagination · 16K+ Ledger
            </span>
          )}
        </div>

        {/* Right Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${
              showAdvanced
                ? 'bg-zinc-800 text-white border-zinc-700'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            {showAdvanced ? 'Simple View ▲' : 'Advanced Filters ▼'}
          </button>

          <button
            id="smart-audience-broadcast-btn"
            onClick={handleBroadcastClick}
            disabled={internalMatchingCount === 0}
            className="rounded bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow disabled:opacity-40 disabled:cursor-not-allowed"
            title="Launch WhatsApp Campaign Studio targeting this cohort"
          >
            <span>📲</span>
            <span>Broadcast to Segment</span>
          </button>
        </div>
      </div>

      {/* ── PRIMARY CONTROLS ROW: SEARCH & COHORT TAGS ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-3">
        {/* Real-time Search */}
        <div className="md:col-span-5 relative">
          <input
            type="text"
            placeholder="Search 16K+ buyers by name, phone, company, email…"
            value={criteria.search}
            onChange={handleSearchChange}
            className="w-full bg-[#161615] border border-zinc-800 focus:border-amber-500/60 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
          />
          <span className="absolute left-2.5 top-2 text-zinc-500 text-xs">🔍</span>
          {criteria.search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1.5 text-zinc-400 hover:text-white text-xs"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Cohort Tags Selector */}
        <div className="md:col-span-4">
          <select
            id="smart-audience-cohort-select"
            value={criteria.cohortTag}
            onChange={(e) => handleCohortTagChange(e.target.value)}
            className="w-full bg-[#161615] border border-zinc-800 focus:border-amber-500/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none transition-colors"
          >
            {COHORT_TAG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-200">
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Country / Market Selector */}
        <div className="md:col-span-3">
          <select
            value={criteria.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full bg-[#161615] border border-zinc-800 focus:border-amber-500/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none transition-colors"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── MIN SPEND PRESET PILLS & CUSTOM INPUT ── */}
      <div className="mt-2.5 pt-2.5 border-t border-zinc-850/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 font-semibold mr-1">Min Spend:</span>
          {MIN_SPEND_PRESETS.map((preset) => {
            const isSelected = criteria.minSpend === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => handleMinSpendPreset(preset.value)}
                className={`px-2 py-1 text-[10.5px] rounded transition-all border ${
                  isSelected
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm'
                    : 'bg-[#181817] text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Min Spend Field */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500">Custom:</span>
          <div className="relative inline-block w-24">
            <span className="absolute left-2 top-1 text-[11px] text-zinc-500">৳</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={customSpendInput}
              onChange={handleCustomSpendChange}
              className="w-full bg-[#161615] border border-zinc-800 focus:border-amber-500/60 rounded pl-5 pr-1.5 py-0.5 text-xs text-amber-400 font-bold focus:outline-none text-right"
            />
          </div>
        </div>
      </div>

      {/* ── EXPANDABLE ADVANCED FILTERS (Order Frequency & Dormancy) ── */}
      {showAdvanced && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-850/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-[#161615]/50 p-2.5 rounded-lg border border-zinc-850">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
              Purchase Frequency
            </label>
            <select
              value={criteria.orderCountFilter}
              onChange={(e) => handleOrderCountChange(e.target.value)}
              className="w-full bg-[#1c1c1b] border border-zinc-800 focus:border-amber-500/60 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
            >
              {ORDER_COUNT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
              Active Segment Cohort
            </label>
            <div className="text-[11px] text-zinc-300 bg-[#1c1c1b] border border-zinc-800 px-2.5 py-1 rounded truncate">
              {COHORT_TAG_OPTIONS.find((c) => c.value === criteria.cohortTag)?.desc || 'Dynamic criteria'}
            </div>
          </div>

          <div className="flex items-end justify-end gap-2">
            <button
              onClick={handleResetFilters}
              className="w-full sm:w-auto px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
            >
              ↺ Reset All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

if (typeof window !== 'undefined') {
  (window as any).SmartAudienceFilter = SmartAudienceFilter;
}
