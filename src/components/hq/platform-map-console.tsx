"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type {
  PlatformFarm,
  PlatformPlot,
  PlatformIncident,
  Viewport,
} from "@/components/hq/platform-map-leaflet";

const PlatformMapLeaflet = dynamic(
  () => import("@/components/hq/platform-map-leaflet").then((m) => m.PlatformMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: "100%", width: "100%", display: "grid", placeItems: "center", background: "#0f172a", color: "#94a3b8", fontSize: 13 }}>
        Loading map…
      </div>
    ),
  }
);

interface MissingFarm { id: string; name: string; status: string; clientName: string | null; href: string; }
interface QaFlag { farmId: string; farmName: string; clientName: string | null; recordedAcres: number; computedAcres: number; deltaPct: number; compareHref: string; }
interface SearchHit { id: string; name?: string; title?: string; type?: string; href: string; client?: { name: string }; }

const MIN_FETCH_ZOOM = 5;
const LAYERS = ["farms", "plots", "tasks", "incidents"] as const;

export function PlatformMapConsole() {
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [zoom, setZoom] = useState(MIN_FETCH_ZOOM);
  const [farms, setFarms] = useState<PlatformFarm[]>([]);
  const [plots, setPlots] = useState<PlatformPlot[]>([]);
  const [incidents, setIncidents] = useState<PlatformIncident[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [missingCoords, setMissingCoords] = useState<MissingFarm[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [layers, setLayers] = useState<Record<(typeof LAYERS)[number], boolean>>({
    farms: true, plots: false, tasks: false, incidents: false,
  });
  const [missingOnly, setMissingOnly] = useState(false);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([]);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; key: number } | null>(null);

  const [qaMode, setQaMode] = useState(false);
  const [qaFlags, setQaFlags] = useState<QaFlag[]>([]);
  const [qaMeta, setQaMeta] = useState<{ scanned: number; invalidCount: number; tolerance: number } | null>(null);
  const [qaLoading, setQaLoading] = useState(false);

  const [base, setBase] = useState<"sat" | "osm">("sat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const onViewport = useCallback((v: Viewport, z: number) => { setViewport(v); setZoom(z); }, []);
  const activeLayers = useMemo(() => LAYERS.filter((l) => layers[l]).join(","), [layers]);

  // Load farms when viewport changes OR when client filter is set (client bypass viewport cap)
  useEffect(() => {
    if (!viewport) return;
    if (zoom < MIN_FETCH_ZOOM && !client) return;
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          minLat: String(viewport.minLat),
          maxLat: String(viewport.maxLat),
          minLng: String(viewport.minLng),
          maxLng: String(viewport.maxLng),
          layers: activeLayers || "farms",
        });
        if (client) params.set("clientId", client.id);
        const res = await fetch(`/api/hq/map/farms?${params}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("Failed to load farms for this view.");
        const data = await res.json();
        if (data.refused && !client) {
          setRefused(data.message);
          setFarms([]); setPlots([]); setIncidents([]); setTaskCounts({}); setMissingCoords([]); setInvalidCount(0);
          setTotal(data.total ?? 0);
        } else {
          setRefused(null);
          setFarms(data.farms ?? []); setPlots(data.plots ?? []); setIncidents(data.incidents ?? []);
          setTaskCounts(data.taskCounts ?? {}); setMissingCoords(data.missingCoords ?? []);
          setInvalidCount(data.invalidBoundaryCount ?? 0); setTotal(data.total ?? 0);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "Failed to load map data.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [viewport, zoom, activeLayers, client]);

  // Client autocomplete
  useEffect(() => {
    const q = clientQuery.trim();
    if (q.length < 2) { setClientOptions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
        if (!res.ok) return;
        const data = await res.json();
        setClientOptions((data.clients ?? []).map((c: any) => ({ id: c.id, name: c.name })));
      } catch { /* best-effort */ }
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  // Search-to-fly
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
        if (!res.ok) return;
        const data = await res.json();
        setSearchResults(data.farms ?? []);
      } catch { /* best-effort */ } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const flyToFarm = useCallback(async (farmId: string) => {
    setSearchResults([]); setSearch("");
    const known = farms.find((f) => f.id === farmId);
    if (known) { setFlyTo({ lat: known.lat, lng: known.lng, key: Date.now() }); return; }
    try {
      const res = await fetch(`/api/hq/map/farms?ids=${encodeURIComponent(farmId)}&layers=farms`);
      if (!res.ok) return;
      const data = await res.json();
      const f = (data.farms ?? [])[0];
      if (f) setFlyTo({ lat: f.lat, lng: f.lng, key: Date.now() });
    } catch { /* best-effort */ }
  }, [farms]);

  const loadQa = useCallback(async () => {
    setQaLoading(true);
    try {
      const params = new URLSearchParams({ tolerance: "0.05", limit: "100" });
      if (client) params.set("clientId", client.id);
      const res = await fetch(`/api/hq/map/qa?${params}`);
      if (!res.ok) throw new Error("Failed to load boundary QA flags.");
      const data = await res.json();
      setQaFlags(data.flags ?? []);
      setQaMeta({ scanned: data.scanned ?? 0, invalidCount: data.invalidCount ?? 0, tolerance: data.tolerance ?? 0.05 });
    } catch { setQaFlags([]); setQaMeta(null); } finally { setQaLoading(false); }
  }, [client]);

  const toggleQa = useCallback(() => { setQaMode((p) => { if (!p) loadQa(); return !p; }); }, [loadQa]);

  const visibleFarms = useMemo(() => missingOnly ? farms.filter((f) => !f.hasBoundary) : farms, [farms, missingOnly]);
  const zoomGated = zoom < MIN_FETCH_ZOOM && !client;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", position: "relative", background: "#0f172a" }}>

      {/* ── Map (full bleed) ── */}
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <PlatformMapLeaflet
          farms={visibleFarms}
          plots={plots}
          incidents={incidents}
          taskCounts={taskCounts}
          showPlots={layers.plots}
          showIncidents={layers.incidents}
          showTasks={layers.tasks}
          base={base}
          flyTo={flyTo}
          onViewport={onViewport}
        />

        {/* ── Floating toolbar ── */}
        <div style={{
          position: "absolute", top: 12, left: 12, right: sidebarOpen ? 344 : 60, zIndex: 900,
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farms to fly…"
              style={floatInput}
            />
            {searchResults.length > 0 && (
              <div style={dropStyle}>
                {searchResults.map((r) => (
                  <button key={r.id} type="button" onClick={() => flyToFarm(r.id)} style={dropItem}>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    {r.client?.name && <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 6 }}>{r.client.name}</span>}
                  </button>
                ))}
              </div>
            )}
            {searching && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#94a3b8" }}>…</span>}
          </div>

          {/* Client filter */}
          <div style={{ position: "relative" }}>
            <input
              value={client ? client.name : clientQuery}
              onChange={(e) => { setClient(null); setClientQuery(e.target.value); }}
              placeholder="Filter by client…"
              style={{ ...floatInput, background: client ? "rgba(99,102,241,0.18)" : "rgba(15,23,42,0.85)", borderColor: client ? "#818cf8" : "rgba(255,255,255,0.15)" }}
            />
            {client && (
              <button type="button" onClick={() => { setClient(null); setClientQuery(""); }}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 0, fontSize: 14 }}>
                ×
              </button>
            )}
            {!client && clientOptions.length > 0 && (
              <div style={dropStyle}>
                {clientOptions.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setClient(c); setClientQuery(""); setClientOptions([]); }} style={dropItem}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layer toggles */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "4px 10px", backdropFilter: "blur(8px)" }}>
            {LAYERS.map((l) => (
              <label key={l} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: layers[l] ? "#e2e8f0" : "#64748b", cursor: "pointer", padding: "2px 6px", userSelect: "none" }}>
                <input type="checkbox" checked={layers[l]} onChange={() => setLayers((p) => ({ ...p, [l]: !p[l] }))} style={{ accentColor: "#818cf8" }} />
                {l}
              </label>
            ))}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: missingOnly ? "#fb923c" : "#64748b", cursor: "pointer", padding: "2px 6px", userSelect: "none" }}>
              <input type="checkbox" checked={missingOnly} onChange={() => setMissingOnly((v) => !v)} style={{ accentColor: "#fb923c" }} />
              no boundary
            </label>
          </div>

          {/* Base map + QA */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: 4, backdropFilter: "blur(8px)" }}>
            {(["sat", "osm"] as const).map((b) => (
              <button key={b} type="button" onClick={() => setBase(b)}
                style={{ border: "none", cursor: "pointer", borderRadius: 5, padding: "4px 10px", fontSize: 12, fontWeight: 600, background: base === b ? "#6366f1" : "transparent", color: base === b ? "#fff" : "#94a3b8" }}>
                {b === "sat" ? "Satellite" : "Map"}
              </button>
            ))}
          </div>

          <button type="button" onClick={toggleQa}
            style={{ border: "none", cursor: "pointer", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, background: qaMode ? "#f59e0b" : "rgba(15,23,42,0.85)", color: qaMode ? "#000" : "#94a3b8", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
            {qaMode ? "Exit QA" : "Boundary QA"}
          </button>

          {/* Status pill */}
          {loading && (
            <span style={{ background: "rgba(15,23,42,0.85)", color: "#94a3b8", fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }}>
              Loading…
            </span>
          )}
          {!loading && !refused && total > 0 && (
            <span style={{ background: "rgba(15,23,42,0.85)", color: "#64748b", fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }}>
              {visibleFarms.length}/{total} farms
            </span>
          )}
        </div>

        {/* ── Overlay messages ── */}
        {zoomGated && (
          <div style={overlayMsg}>Zoom in to load farms — or filter by client to bypass the viewport cap.</div>
        )}
        {refused && !client && (
          <div style={{ ...overlayMsg, background: "rgba(234,88,12,0.9)" }}>{refused}</div>
        )}
        {error && (
          <div style={{ ...overlayMsg, background: "rgba(220,38,38,0.9)" }}>{error}</div>
        )}

        {/* ── Sidebar toggle (always visible) ── */}
        <button type="button" onClick={() => setSidebarOpen((p) => !p)}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 1000, width: 36, height: 36, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, background: "rgba(15,23,42,0.9)", color: "#e2e8f0", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
          {sidebarOpen ? "›" : "‹"}
        </button>
      </div>

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <aside style={{
          width: 320, flexShrink: 0, background: "var(--surface-card)", borderLeft: "1px solid var(--hairline)",
          overflowY: "auto", display: "flex", flexDirection: "column", fontSize: 13,
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--hairline)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
              {client ? `Filtered · ${client.name}` : "Spatial Console"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {refused && !client ? (
                <span style={{ color: "#f97316" }}>Too many farms — filter by client or zoom in</span>
              ) : (
                <>{visibleFarms.length} of {total} farms in view{invalidCount > 0 ? ` · ${invalidCount} invalid boundaries` : ""}</>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {qaMode && (
              <section style={{ padding: "12px 16px", borderBottom: "1px solid var(--hairline)" }}>
                <div style={sectionHead}>Boundary QA {qaLoading ? "— checking…" : ""}</div>
                {qaMeta && (
                  <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 8 }}>
                    Scanned {qaMeta.scanned} · tolerance {(qaMeta.tolerance * 100).toFixed(0)}%
                    {qaMeta.invalidCount > 0 ? ` · ${qaMeta.invalidCount} invalid` : ""}
                  </div>
                )}
                {qaFlags.length === 0 && !qaLoading ? <div style={{ color: "var(--muted)", fontSize: 12 }}>No area-delta flags.</div> : null}
                {qaFlags.map((f) => (
                  <div key={f.farmId} style={sideRow}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{f.farmName}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>
                      {f.clientName ?? "—"} · {f.recordedAcres} ac → {f.computedAcres} ac ({f.deltaPct > 0 ? "+" : ""}{f.deltaPct}%)
                    </div>
                    <Link href={f.compareHref} style={{ fontSize: 11, color: "#6366f1" }}>Compare →</Link>
                  </div>
                ))}
              </section>
            )}

            {missingCoords.length > 0 && (
              <section style={{ padding: "12px 16px", borderBottom: "1px solid var(--hairline)" }}>
                <div style={sectionHead}>Missing coordinates ({missingCoords.length})</div>
                {missingCoords.map((f) => (
                  <div key={f.id} style={sideRow}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{f.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>{f.clientName ?? "—"} · {f.status}</div>
                    <Link href={f.href} style={{ fontSize: 11, color: "#6366f1" }}>Open →</Link>
                  </div>
                ))}
              </section>
            )}

            <section style={{ padding: "12px 16px" }}>
              <div style={sectionHead}>Farms in view ({visibleFarms.length})</div>
              {visibleFarms.length === 0 && !loading && (
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {refused && !client ? "Filter by client to load farms." : "No farms in this viewport."}
                </div>
              )}
              {visibleFarms.slice(0, 100).map((f) => (
                <div key={f.id} style={sideRow}>
                  <div style={{ fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.status === "ACTIVE" ? "#22c55e" : f.status === "SETUP" ? "#f59e0b" : "#94a3b8", display: "inline-block", flexShrink: 0 }} />
                    {f.name}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 11 }}>
                    {f.clientName ?? "—"}
                    {!f.hasBoundary ? " · no boundary" : ""}
                    {layers.tasks && (taskCounts[f.id] ?? 0) > 0 ? ` · ${taskCounts[f.id]} tasks` : ""}
                  </div>
                  <Link href={f.href} style={{ fontSize: 11, color: "#6366f1" }}>Open →</Link>
                </div>
              ))}
              {visibleFarms.length > 100 && (
                <div style={{ color: "var(--muted)", fontSize: 11, padding: "6px 0" }}>Showing first 100 — zoom in for detail.</div>
              )}
            </section>
          </div>
        </aside>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────

const floatInput: React.CSSProperties = {
  background: "rgba(15,23,42,0.85)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#e2e8f0",
  fontSize: 13,
  padding: "6px 12px",
  borderRadius: 8,
  minWidth: 200,
  backdropFilter: "blur(8px)",
  outline: "none",
};

const dropStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  zIndex: 1100,
  background: "var(--surface-card)",
  border: "1px solid var(--hairline)",
  borderRadius: 8,
  minWidth: 240,
  maxHeight: 240,
  overflowY: "auto",
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
};

const dropItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  padding: "8px 12px",
  fontSize: 13,
  cursor: "pointer",
  color: "var(--ink)",
};

const overlayMsg: React.CSSProperties = {
  position: "absolute",
  top: 64,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 900,
  background: "rgba(12,10,9,0.88)",
  color: "#fff",
  padding: "8px 16px",
  borderRadius: 8,
  fontSize: 12,
  maxWidth: "80%",
  textAlign: "center",
  backdropFilter: "blur(4px)",
  pointerEvents: "none",
};

const sectionHead: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
  color: "var(--muted)", marginBottom: 8,
};

const sideRow: React.CSSProperties = {
  borderTop: "1px solid var(--hairline)",
  padding: "7px 0",
  lineHeight: 1.5,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};
