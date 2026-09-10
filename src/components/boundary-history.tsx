"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { parseBoundary, type LngLat } from "@/lib/geo";import { SOURCE_LABELS, areaChangeText } from "@/lib/geo-policy";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => <div style={{ height: 260, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>Map loading…</div>,
});

export interface HistoryVersion {
  id: string;
  version: number;
  boundaryGeoJson: string | null;
  measuredAcres: number | null;
  perimeterM: number | null;
  prevAcres: number | null;
  areaFlagged: boolean;
  source: keyof typeof SOURCE_LABELS;
  actorName: string | null;
  captureId: string | null;
  restoredFromVersionId: string | null;
  createdAt: string;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Immutable boundary history: version list + current-vs-historical map
 * preview + authorized restore. Reads only; all writes go through the
 * restore endpoint (which itself versions).
 */
export function BoundaryHistory({
  entityType,
  entityId,
  canRestore,
  currentBoundary,
}: {
  entityType: "FARM" | "PLOT";
  entityId: string;
  canRestore: boolean;
  currentBoundary: string | null;
}) {
  const router = useRouter();
  const [versions, setVersions] = useState<HistoryVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const base = entityType === "FARM" ? `/api/farms/${entityId}/boundary-versions` : `/api/plots/${entityId}/boundary-versions`;
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(`${base}?limit=50`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`History unavailable (${r.status})`);
        const totalHeader = Number(r.headers.get("X-Total-Count"));
        const body: unknown = await r.json();
        const rows = Array.isArray(body) ? (body as HistoryVersion[]) : [];
        setVersions(rows);
        setTotal(Number.isFinite(totalHeader) ? totalHeader : rows.length);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "History unavailable."))
      .finally(() => setLoading(false));
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  const current = versions[0] ?? null;
  const preview = versions.find((v) => v.id === previewId) ?? null;
  const previewRing: LngLat[] | null = preview?.boundaryGeoJson ? (parseBoundary(preview.boundaryGeoJson) ?? null) : null;
  const currentRing: LngLat[] | null = parseBoundary(currentBoundary);

  async function restore(id: string, v: number) {
    if (!confirm(`Restore boundary v${v} as a new version? History is kept — nothing is erased.`)) return;
    setRestoringId(id);
    try {
      const res = await fetch(`/api/boundary-versions/${id}/restore`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error ?? "Restore failed.");
        return;
      }
      setPreviewId(null);
      load();
      router.refresh();
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <strong style={{ fontSize: 15 }}>Boundary History</strong>
        {current && (
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            Current: v{current.version} · {SOURCE_LABELS[current.source] ?? current.source} ·{" "}
            {current.measuredAcres === null ? "no fence" : `${current.measuredAcres.toFixed(2)} ac`} · {fmtDate(current.createdAt)}
          </span>
        )}
      </div>

      {loading && <p className="muted" style={{ fontSize: 13 }}>Loading history…</p>}
      {error && <div className="error" role="alert"><span>{error}</span></div>}
      {!loading && !error && versions.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>No fenced history yet — draw or walk the first boundary.</p>
      )}

      {versions.map((v) => {
        const isCurrent = current !== null && v.id === current.id;
        const delta = areaChangeText(v.prevAcres, v.measuredAcres);
        return (
          <div key={v.id}>
            <div className="list-row">
              <span style={{ flex: 1 }}>
                <b>v{v.version}</b> · {SOURCE_LABELS[v.source] ?? v.source} ·{" "}
                {v.measuredAcres === null ? "fence removed" : `${v.measuredAcres.toFixed(2)} ac`}
                {v.areaFlagged && delta ? <span style={{ color: "var(--amber)", fontWeight: 700 }}> · ⚠ {delta}</span> : delta ? <span style={{ color: "var(--muted)" }}> · {delta}</span> : null}
                <br />
                <small style={{ color: "var(--muted)" }}>
                  {fmtDate(v.createdAt)} · {v.actorName ?? "Unknown actor"}
                  {v.restoredFromVersionId ? " · restored from history" : ""}
                  {v.captureId ? ` · walk ${v.captureId.slice(0, 8)}…` : ""}
                </small>
              </span>
              {isCurrent && <span className="badge badge-green">current</span>}
              {!isCurrent && v.boundaryGeoJson && (
                <button type="button" className="btn btn-sm" onClick={() => setPreviewId(previewId === v.id ? null : v.id)}>
                  {previewId === v.id ? "Hide" : "Preview"}
                </button>
              )}
              {!isCurrent && canRestore && (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={restoringId === v.id}
                  title={v.boundaryGeoJson ? `Restore v${v.version} as a new version` : `Restore fence removal (v${v.version}) as a new version`}
                  onClick={() => restore(v.id, v.version)}
                >
                  {restoringId === v.id ? "Restoring…" : "Restore"}
                </button>
              )}
            </div>
            {previewId === v.id && previewRing && (
              <div style={{ margin: "8px 0 4px" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                  Solid = v{v.version} · dashed green = current fence
                </div>
                <GeoMap
                  center={[20.59, 78.96]}
                  polygon={previewRing}
                  onChange={() => undefined}
                  reference={currentRing}
                  interactive={false}
                  height={260}
                />
              </div>
            )}
          </div>
        );
      })}
      {!loading && !error && total > versions.length && (
        <p className="muted" style={{ fontSize: 12 }}>Showing {versions.length} of {total} — older versions via API pagination.</p>
      )}
      <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
        History is append-only: restores create new versions, never erase.
      </p>
    </div>
  );
}
