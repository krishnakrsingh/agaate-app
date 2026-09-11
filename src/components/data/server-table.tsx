"use client";

import { ReactNode } from "react";
import { Icons } from "@/components/icons";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
}

interface ServerTableProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  total: number | null;
  page: number;
  limit: number;
  loading: boolean;
  error: string;
  search: string;
  onSearch: (v: string) => void;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
  onRetry: () => void;
  searchPlaceholder?: string;
  emptyTitle: string;
  emptyHint: string;
  toolbar?: ReactNode;
  bulkBar?: ReactNode;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onTogglePage?: (ids: string[]) => void;
  selectAllOnPage?: boolean;
}

/**
 * One dense operational table for the whole product. Every directory answers
 * Where am I / What matters / What can I do / How do I find one entity /
 * How do I act on hundreds — with real counts ("showing X of Y"), never a
 * giant pile of cards. Handles loading / empty / error / large states.
 */
export function ServerTable<T extends { id: string }>(props: ServerTableProps<T>) {
  const { columns, rows, total, page, limit, loading, error, search, onSearch, onPage, onLimit, onRetry } = props;
  const totalPages = total != null ? Math.max(1, Math.ceil(total / limit)) : null;
  const from = rows.length ? (page - 1) * limit + 1 : 0;
  const to = (page - 1) * limit + rows.length;
  const pageIds = rows.map((r) => r.id);
  const allPageSelected = props.selectAllOnPage ?? (props.selected ? pageIds.length > 0 && pageIds.every((id) => props.selected!.has(id)) : false);

  return (
    <section className="compact-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ position: "relative", width: 280, maxWidth: "100%" }}>
          <input
            type="search"
            className="input-field"
            aria-label="Search records"
            placeholder={props.searchPlaceholder ?? "Search… (server-side)"}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
          />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
            <Icons.Search size={14} />
          </span>
        </div>
        {props.toolbar}
        <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }} role="status">
          {loading ? "LOADING…" : total != null ? `SHOWING ${from}–${to} OF ${total.toLocaleString()}` : `SHOWING ${rows.length}`}
        </span>
      </div>

      {props.bulkBar}

      {loading && <div style={{ padding: 16 }}><CardSkeleton /></div>}

      {!loading && error && (
        <div style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--red)", fontWeight: 600 }}>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={onRetry} style={{ marginTop: 12 }}>Retry</button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<Icons.Search size={24} />}
          title={props.emptyTitle}
          description={props.emptyHint}
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="ops-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {props.selected && (
                  <th style={{ width: 36, textAlign: "center" }}>
                    <input type="checkbox" aria-label="Select page" checked={allPageSelected} onChange={() => props.onTogglePage?.(pageIds)} />
                  </th>
                )}
                {columns.map((c) => (
                  <th key={c.key} style={{ textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)", padding: "10px 12px", borderBottom: "1px solid var(--line-strong)", whiteSpace: "nowrap", width: c.width }}>{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  {props.selected && (
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      <input type="checkbox" aria-label={`Select row`} checked={props.selected.has(row.id)} onChange={() => props.onToggleSelect?.(row.id)} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: "10px 12px", verticalAlign: "top" }}>{c.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages != null && totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} style={{ height: 30, fontSize: 12 }}>← Prev</button>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>PAGE {page} / {totalPages.toLocaleString()}</span>
          <button type="button" className="btn btn-secondary" disabled={totalPages != null && page >= totalPages} onClick={() => onPage(page + 1)} style={{ height: 30, fontSize: 12 }}>Next →</button>
          <select aria-label="Rows per page" value={limit} onChange={(e) => onLimit(Number(e.target.value))} style={{ marginLeft: "auto", height: 30, fontSize: 12 }}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      )}
    </section>
  );
}
