"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useServerList } from "@/components/data/use-server-list";
import { ServerTable } from "@/components/data/server-table";
import { useToast } from "@/components/ui/toast";

type Farm = {
  id: string;
  name: string;
  location: string;
  ownerName: string;
  status: string;
  setupStage: string;
  setupProgress: number;
  state?: string | null;
  district?: string | null;
  client?: { id: string; name: string; code: string | null } | null;
  _count?: { plots: number; access: number };
};

const VIEWS_KEY = "agaate_farm_views_v1";

/**
 * Farms directory — answers "show me all farms in Haryana that are active,
 * growing X, missing docs, needing attention" via server-side faceted search.
 * Saved views (localStorage), bulk status/stage, export of the current
 * selection. Never renders more than one page of rows.
 */
export function FarmsDirectory() {
  const toast = useToast();
  const [status, setStatus] = useState("ALL");
  const [stage, setStage] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | { label: string; action: "STATUS" | "STAGE"; value: string }>(null);
  const extraParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (status !== "ALL") p.status = status;
    if (stage !== "ALL") p.setupStage = stage;
    return p;
  }, [status, stage]);
  const list = useServerList<Farm>("/api/farms", { initialLimit: 25, extraParams });

  function saveView() {
    try {
      const raw = localStorage.getItem(VIEWS_KEY);
      const views = raw ? JSON.parse(raw) : [];
      views.push({ name: `Status=${status} Stage=${stage} "${list.search}"`, status, stage, search: list.search, at: new Date().toISOString() });
      localStorage.setItem(VIEWS_KEY, JSON.stringify(views.slice(-10)));
      toast.success("View saved on this device.");
    } catch {
      toast.error("Could not save view.");
    }
  }

  async function runBulk() {
    if (!confirm) return;
    const ids = [...list.selected];
    setBusy(true);
    try {
      const body: any = { farmIds: ids, action: confirm.action, expectedCount: ids.length };
      if (confirm.action === "STATUS") body.status = confirm.value;
      else body.setupStage = confirm.value;
      const r = await fetch("/api/farms/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error ?? "Bulk update failed.");
      toast.success(`${data.updated} farm(s) updated.`);
      setConfirm(null);
      list.reload();
    } catch (e: any) {
      toast.error(e.message ?? "Bulk update failed.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const rows = list.rows.filter((f) => list.selected.has(f.id));
    const csv = ["id,name,location,status,stage,progress", ...rows.map((f) => [f.id, `"${f.name}"`, `"${f.location}"`, f.status, f.setupStage, f.setupProgress].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "farms-selection.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ServerTable<Farm>
        columns={[
          { key: "farm", header: "Farm", render: (f) => (
            <div style={{ minWidth: 220 }}>
              <Link href={`/farms/${f.id}`} style={{ fontWeight: 650 }}>{f.name}</Link>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{f.location} • {f.ownerName}</div>
              {f.client && <div style={{ fontSize: 11, color: "var(--muted)" }}>Client: {f.client.name}</div>}
            </div>
          ) },
          { key: "status", header: "Status", render: (f) => <span className="badge badge-muted font-mono" style={{ fontSize: 10 }}>{f.status}</span> },
          { key: "stage", header: "Stage", render: (f) => <span style={{ fontSize: 12 }}>{f.setupStage} ({f.setupProgress}%)</span> },
          { key: "plots", header: "Plots", render: (f) => <span className="font-mono" style={{ fontSize: 12 }}>{f._count?.plots ?? "—"}</span> },
        ]}
        rows={list.rows}
        total={list.total}
        page={list.page}
        limit={list.limit}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearch={list.setSearch}
        onPage={list.setPage}
        onLimit={list.setLimit}
        onRetry={list.reload}
        searchPlaceholder="Search name, location, owner, client… (server-side)"
        emptyTitle="No farms match"
        emptyHint="Adjust filters or search. Directories page server-side — the full portfolio is never loaded into the browser."
        toolbar={
          <>
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} style={{ height: 36, fontSize: 12 }}>
              {["ALL", "SETUP", "ACTIVE", "INACTIVE", "COMPLETED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select aria-label="Setup stage" value={stage} onChange={(e) => setStage(e.target.value)} style={{ height: 36, fontSize: 12 }}>
              {["ALL", "SURVEY_SOIL_TEST", "PLOT_DEMARCATION", "BED_SOIL_PREP", "IRRIGATION_LAYOUT", "HANDED_OVER"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" className="btn btn-secondary" onClick={saveView} style={{ height: 36, fontSize: 12 }}>Save view</button>
          </>
        }
        bulkBar={
          list.selected.size > 0 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", background: "var(--amber-light)", borderBottom: "1px solid var(--amber-light)", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 12 }}>{list.selected.size} selected</strong>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirm({ label: "activate", action: "STATUS", value: "ACTIVE" })} style={{ height: 30, fontSize: 12 }}>Activate</button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirm({ label: "mark inactive", action: "STATUS", value: "INACTIVE" })} style={{ height: 30, fontSize: 12 }}>Deactivate</button>
              <button type="button" className="btn btn-secondary" onClick={exportCsv} style={{ height: 30, fontSize: 12 }}>Export CSV</button>
              <button type="button" className="btn btn-secondary" onClick={list.clearSelection} style={{ height: 30, fontSize: 12 }}>Clear</button>
            </div>
          ) : undefined
        }
        selected={list.selected}
        onToggleSelect={list.toggleSelect}
        onTogglePage={list.toggleSelectPage}
      />
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: 20 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{confirm.label} {list.selected.size} farm(s)?</h3>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Bulk change with selection-count check and audit trail. Re-run the search if the portfolio changed underneath you.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void runBulk()}>{busy ? "Working…" : `Confirm (${list.selected.size})`}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
