/**
 * Hands & Head Nexus — Pagination Status Banner
 * Dark techno-brutalist status display (#0d0d0c, #161615, accents #c81d11, status #10b981).
 * Displays loading skeletons, clean empty states, and error alerts.
 */

import React from 'react';

interface PaginationStatusBannerProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  error?: Error | null;
  entityName?: string;
  onRetry?: () => void;
  searchTerm?: string;
}

export const PaginationStatusBanner: React.FC<PaginationStatusBannerProps> = ({
  isLoading = false,
  isEmpty = false,
  isError = false,
  error = null,
  entityName = 'records',
  onRetry,
  searchTerm
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-12 px-4 flex flex-col items-center justify-center gap-3 bg-[#111110] border border-zinc-800/80 rounded-lg my-4 font-mono">
        <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-400 tracking-wider uppercase">
          Fetching {entityName} stream (Cursor Indexed)...
        </span>
        <div className="w-48 h-1 bg-zinc-800 rounded overflow-hidden">
          <div className="h-full bg-amber-500 animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full py-8 px-6 bg-[#161211] border border-[#c81d11]/40 rounded-lg my-4 font-mono text-left">
        <div className="flex items-start gap-3">
          <span className="text-[#c81d11] text-base font-bold">⚠️</span>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-[#c81d11] font-bold mb-1">
              Data Stream Error // Query Interrupted
            </div>
            <p className="text-xs text-zinc-300 mb-3">
              {error?.message || `Unable to hydrate ${entityName} from Firestore or REST endpoint.`}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition-colors"
              >
                ↻ Retry Request
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="w-full py-12 px-4 flex flex-col items-center justify-center text-center bg-[#111110] border border-zinc-800/60 rounded-lg my-4 font-mono">
        <div className="text-2xl mb-2">∅</div>
        <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">
          Zero {entityName} Identified
        </div>
        <p className="text-xs text-zinc-500 max-w-sm">
          {searchTerm
            ? `No records matching query "${searchTerm}" within indexed index.`
            : `No ${entityName} currently active in this partition.`}
        </p>
      </div>
    );
  }

  return null;
};
