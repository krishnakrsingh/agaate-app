"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";

export interface ServerListState<T> {
  rows: T[];
  total: number | null;
  page: number;
  limit: number;
  loading: boolean;
  error: string;
  search: string;
  setSearch: (v: string) => void;
  setPage: (p: number) => void;
  setLimit: (l: number) => void;
  reload: () => void;
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectPage: (ids: string[]) => void;
  clearSelection: () => void;
}

/**
 * Single shared hook for every server-driven directory/queue in the product.
 * Replaces the broken pattern of `fetch(first 100) + useMemo client filter`
 * that silently dropped 99.9% of records at scale. Debounced search,
 * AbortController cancellation, X-Total-Count header ("showing X of Y").
 */
export function useServerList<T extends { id: string }>(
  endpoint: string,
  opts: { initialLimit?: number; extraParams?: Record<string, string>; debounceMs?: number } = {}
): ServerListState<T> {
  const { initialLimit = 25, extraParams = {}, debounceMs = 300 } = opts;
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearchState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [nonce, setNonce] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [search, debounceMs]);

  const reload = useCallback(() => {
    setNonce((n) => n + 1);
    setSelected(new Set());
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
      ...extraParams,
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`${endpoint}?${params.toString()}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Unable to load records.");
        const totalHeader = r.headers.get("X-Total-Count");
        if (totalHeader != null) setTotal(Number(totalHeader));
        const body = await r.json();
        // Envelope-tolerant: plain arrays (standard) or legacy {items/data/rows} shapes.
        const list: T[] = Array.isArray(body) ? body : body.items ?? body.data ?? body.rows ?? body.expenses ?? body.clients ?? body.farms ?? [];
        if (!Array.isArray(body) && typeof body.total === "number") setTotal(body.total);
        if (!Array.isArray(body) && typeof body.totalCount === "number") setTotal(body.totalCount);
        setRows(list);
        setLoading(false);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e.message ?? "Unable to load records.");
        setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, limit, debouncedSearch, nonce, JSON.stringify(extraParams)]);

  const setSearch = useCallback((v: string) => setSearchState(v), []);
  const setLimit = useCallback((l: number) => {
    setLimitState(l);
    setPage(1);
  }, []);
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleSelectPage = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return { rows, total, page, limit, loading, error, search, setSearch, setPage, setLimit, reload, selected, toggleSelect, toggleSelectPage, clearSelection };
}
