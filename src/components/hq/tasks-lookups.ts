"use client";

import { useEffect, useState } from "react";

// Search-as-type officer lookup, capped at 6 rows. Never fetch-all.
// Farm/client lookups are reused from ./people-drawers (useFarmSearch hits
// /api/farms, useClientSearch hits /api/admin/clients).
export function useOfficerSearch(farmId?: string | null) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; email: string | null }[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams({ role: "FARM_OFFICER", search: q, limit: "6" });
      if (farmId) params.set("farmId", farmId);
      fetch(`/api/users?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: unknown) => {
          const arr = Array.isArray(data) ? data : [];
          setResults(
            (arr as { id: string; name: string; email?: string | null; active?: boolean }[])
              .filter((u) => u.active !== false)
              .map((u) => ({ id: u.id, name: u.name, email: u.email ?? null }))
          );
        })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, farmId]);

  return { query, setQuery, results, clear: () => { setQuery(""); setResults([]); } };
}

export function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

// Whole days past the due date (UTC). Positive means overdue.
export function overdueDays(dueIso: string): number | null {
  if (!dueIso) return null;
  const due = new Date(dueIso.length === 10 ? `${dueIso}T00:00:00Z` : dueIso);
  if (isNaN(due.getTime())) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((todayUtc - due.getTime()) / 86_400_000);
}

const OPEN_STATUSES = new Set(["DRAFT", "ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED"]);

export function isOpenStatus(status: string) {
  return OPEN_STATUSES.has(status);
}

export function dueLabel(dueIso: string) {
  if (!dueIso) return "—";
  return dueIso.slice(0, 10);
}
