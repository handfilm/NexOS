/**
 * Hands & Head Nexus — Server-Side Firestore Cursor Pagination Hook
 * Enforces strict limit(50), startAfter cursor pagination, and deterministic composite ordering.
 * Includes dark-terminal UI status states and seamless REST API fallback.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentSnapshot,
  QueryConstraint,
  where,
  OrderByDirection
} from 'firebase/firestore';

export interface UsePaginatedQueryOptions {
  collectionName: string;
  pageSize?: number; // Strict upper bound: 50
  orderField?: string;
  orderDirection?: OrderByDirection;
  additionalConstraints?: QueryConstraint[];
  apiFallbackUrl?: string;
  enabled?: boolean;
}

export interface UsePaginatedQueryResult<T> {
  data: T[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  isFetchingPrevPage: boolean;
  isEmpty: boolean;
  isError: boolean;
  error: Error | null;
  pageNumber: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalCount?: number;
  loadFirstPage: () => Promise<void>;
  loadNextPage: () => Promise<void>;
  loadPrevPage: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePaginatedQuery<T = any>({
  collectionName,
  pageSize = 50,
  orderField = 'updatedAt',
  orderDirection = 'desc',
  additionalConstraints = [],
  apiFallbackUrl,
  enabled = true
}: UsePaginatedQueryOptions): UsePaginatedQueryResult<T> {
  const safePageSize = Math.min(Math.max(1, pageSize), 50);

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState<boolean>(false);
  const [isFetchingPrevPage, setIsFetchingPrevPage] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  // Cursor navigation stack: array of last document snapshots per page
  // stack[0] = end of page 1, stack[1] = end of page 2, etc.
  const cursorStackRef = useRef<DocumentSnapshot[]>([]);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch via REST API fallback
  const fetchFromRestApi = async (page: number, cursor?: string): Promise<{ items: T[]; hasMore: boolean; total?: number }> => {
    const fallbackEndpoint = apiFallbackUrl || `/api/${collectionName}`;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(safePageSize)
    });
    if (cursor) params.append('cursor', cursor);

    const res = await fetch(`${fallbackEndpoint}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`REST fallback HTTP ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    const items = json.data || json.customers || json.products || json.orders || json.items || [];
    const hasMore = json.hasMore !== undefined ? json.hasMore : items.length === safePageSize;
    return {
      items,
      hasMore,
      total: json.total || json.totalCount
    };
  };

  // Primary loader function
  const loadPage = useCallback(
    async (
      targetPage: number,
      direction: 'first' | 'next' | 'prev' = 'first'
    ) => {
      if (!enabled) return;

      if (direction === 'first') {
        setIsLoading(true);
        cursorStackRef.current = [];
      } else if (direction === 'next') {
        setIsFetchingNextPage(true);
      } else if (direction === 'prev') {
        setIsFetchingPrevPage(true);
      }

      setIsError(false);
      setError(null);

      try {
        let items: T[] = [];
        let hasMore = false;
        let lastDoc: DocumentSnapshot | null = null;

        let firestoreAttemptSuccess = false;

        // Try Firestore SDK first
        try {
          const db = getFirestore();
          if (db) {
            const collectionRef = collection(db, collectionName);

            // Construct deterministic query with primary order and __name__ tie breaker
            const queryClauses: QueryConstraint[] = [
              ...additionalConstraints,
              orderBy(orderField, orderDirection),
              orderBy('__name__', orderDirection),
              limit(safePageSize + 1) // +1 to check for next page deterministically
            ];

            // If navigating next or specific page, apply cursor
            if (targetPage > 1 && cursorStackRef.current[targetPage - 2]) {
              const startCursor = cursorStackRef.current[targetPage - 2];
              queryClauses.splice(queryClauses.length - 1, 0, startAfter(startCursor));
            }

            const q = query(collectionRef, ...queryClauses);
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
              const docs = snapshot.docs;
              hasMore = docs.length > safePageSize;
              const pageDocs = hasMore ? docs.slice(0, safePageSize) : docs;

              items = pageDocs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data()
              })) as T[];

              lastDoc = pageDocs[pageDocs.length - 1] || null;

              if (lastDoc) {
                cursorStackRef.current[targetPage - 1] = lastDoc;
              }

              firestoreAttemptSuccess = true;
            } else {
              // Collection might be empty in Firestore or populated in REST
              firestoreAttemptSuccess = true;
              items = [];
              hasMore = false;
            }
          }
        } catch (firestoreErr: any) {
          console.debug(`[usePaginatedQuery] Firestore query error, falling back to REST:`, firestoreErr?.message);
          firestoreAttemptSuccess = false;
        }

        // If Firestore was empty or failed, fallback gracefully to REST backend
        if (!firestoreAttemptSuccess || items.length === 0) {
          const restResult = await fetchFromRestApi(targetPage);
          items = restResult.items;
          hasMore = restResult.hasMore;
          if (restResult.total !== undefined) {
            setTotalCount(restResult.total);
          }
        }

        if (isMountedRef.current) {
          setData(items);
          setPageNumber(targetPage);
          setHasNextPage(hasMore);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          console.error(`[usePaginatedQuery] Failed to load page ${targetPage}:`, err);
          setIsError(true);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsFetchingNextPage(false);
          setIsFetchingPrevPage(false);
        }
      }
    },
    [
      collectionName,
      safePageSize,
      orderField,
      orderDirection,
      JSON.stringify(additionalConstraints),
      apiFallbackUrl,
      enabled
    ]
  );

  const loadFirstPage = useCallback(async () => {
    await loadPage(1, 'first');
  }, [loadPage]);

  const loadNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return;
    await loadPage(pageNumber + 1, 'next');
  }, [hasNextPage, isFetchingNextPage, isLoading, pageNumber, loadPage]);

  const loadPrevPage = useCallback(async () => {
    if (pageNumber <= 1 || isFetchingPrevPage || isLoading) return;
    await loadPage(pageNumber - 1, 'prev');
  }, [pageNumber, isFetchingPrevPage, isLoading, loadPage]);

  const refresh = useCallback(async () => {
    await loadPage(pageNumber, 'first');
  }, [pageNumber, loadPage]);

  // Initial load
  useEffect(() => {
    if (enabled) {
      loadFirstPage();
    }
  }, [enabled, loadFirstPage]);

  return {
    data,
    isLoading,
    isFetchingNextPage,
    isFetchingPrevPage,
    isEmpty: !isLoading && !isError && data.length === 0,
    isError,
    error,
    pageNumber,
    hasNextPage,
    hasPrevPage: pageNumber > 1,
    totalCount,
    loadFirstPage,
    loadNextPage,
    loadPrevPage,
    refresh
  };
}
