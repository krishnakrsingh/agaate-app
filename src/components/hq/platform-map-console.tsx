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
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "grid",
          placeItems: "center",
          background: "var(--canvas)",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        Loading platform map…
      </div>
    ),
  }
);

interface MissingFarm {
  id: string;
  name: string;
  status: string;
  clientName: string | null;
  href: string;
}

interface QaFlag {
  farmId: string;
  farmName: string;
  clientName: string | null;
  recordedAcres: number;
  computedAcres: number;
  deltaPct: number;
  compareHref: string;
}

interface SearchHit {
  id: string;
  name?: string;
  title?: string;
  type?: string;
  href: string;
  client?: { name: string };
}

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
    farms: true,
    plots: false,
    tasks: false,
    incidents: false,
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
  const abortRef = useRef<AbortController | null>(null);

  const onViewport = useCallback((v: Viewport, z: number) => {
    setViewport(v);
    setZoom(z);
  }, []);

  const activeLayers = useMemo(() => LAYERS.filter((l) => layers[l]).join(","), [layers]);

  useEffect(() => {
    if (!viewport) return;
    if (zoom < MIN_FETCH_ZOOM) return;
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
        const res = await fetch(`/api/hq/map/farms?${params.toString()}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("Failed to load farms for this view.");
        const data = await res.json();
        if (data.refused) {
          setRefused(data.message);
          setFarms([]);
          setPlots([]);
          setIncidents([]);
          setTaskCounts({});
          setMissingCoords([]);
          setInvalidCount(0);
          setTotal(data.total ?? 0);
        } else {
          setRefused(null);
          setFarms(data.farms ?? []);
          setPlots(data.plots ?? []);
          setIncidents(data.incidents ?? []);
          setTaskCounts(data.taskCounts ?? {});
          setMissingCoords(data.missingCoords ?? []);
          setInvalidCount(data.invalidBoundaryCount ?? 0);
          setTotal(data.total ?? 0);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "Failed to load map data.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [viewport, zoom, activeLayers, client]);

  // Client lookup (one at a time) via the shared search API.
  useEffect(() => {
    const q = clientQuery.trim();
    if (q.length < 2) {
      setClientOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
        if (!res.ok) return;
        const data = await res.json();
        setClientOptions((data.clients ?? []).map((c: any) => ({ id: c.id, name: c.name })));
      } catch {
        /* search is best-effort */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  // Search-to-fly via the shared search API.
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
        if (!res.ok) return;
        const data = await res.json();
        setSearchResults(data.farms ?? []);
      } catch {
        /* search is best-effort */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const flyToFarm = useCallback(async (farmId: string) => {
    setSearchResults([]);
    setSearch("");
    const known = farms.find((f) => f.id === farmId);
    if (known) {
      setFlyTo({ lat: known.lat, lng: known.lng, key: Date.now() });
      return;
    }
    try {
      const res = await fetch(`/api/hq/map/farms?ids=${encodeURIComponent(farmId)}&layers=farms`);
      if (!res.ok) return;
      const data = await res.json();
      const f = (data.farms ?? [])[0];
      if (f) setFlyTo({ lat: f.lat, lng: f.lng, key: Date.now() });
    } catch {
      /* fly is best-effort */
    }
  }, [farms]);

  const loadQa = useCallback(async () => {
    setQaLoading(true);
    try {
      const params = new URLSearchParams({ tolerance: "0.05", limit: "100" });
      if (client) params.set("clientId", client.id);
      const res = await fetch(`/api/hq/map/qa?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load boundary QA flags.");
      const data = await res.json();
      setQaFlags(data.flags ?? []);
      setQaMeta({ scanned: data.scanned ?? 0, invalidCount: data.invalidCount ?? 0, tolerance: data.tolerance ?? 0.05 });
    } catch (e: any) {
      setQaFlags([]);
      setQaMeta(null);
    } finally {
      setQaLoading(false);
    }
  }, [client]);

  const toggleQa = useCallback(() => {
    setQaMode((prev) => {
      if (!prev) loadQa();
      return !prev;
    });
  }, [loadQa]);

  const visibleFarms = useMemo(
    () => (missingOnly ? farms.filter((f) => !f.hasBoundary) : farms),
    [farms, missingOnly]
  );

  const zoomGated = zoom < MIN_FETCH_ZOOM;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "calc(100vh - 120px)" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginRight: 8 }}>Platform Map</h1>
        <div style={{ position: "relative" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farms to fly…"
            aria-label="Search farms to fly"
            style={inputStyle}
          />
          {searchResults.length > 0 ? (
            <div style={dropStyle}>
              {searchResults.map((r) => (
                <button key={r.id} type="button" onClick={() => flyToFarm(r.id)} style={dropItemStyle}>
                  {r.name} {r.client?.name ? `· ${r.client.name}` : ""}
                </button>
              ))}
            </div>
          ) : null}
          {searching ? <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 6 }}>Searching…</span> : null}
        </div>
        <div style={{ position: "relative" }}>
          <input
            value={client ? client.name : clientQuery}
            onChange={(e) => {
              setClient(null);
              setClientQuery(e.target.value);
            }}
            placeholder="Filter by client…"
            aria-label="Filter by client"
            style={inputStyle}
          />
          {client ? (
            <button type="button" onClick={() => { setClient(null); setClientQuery(""); }} style={miniBtnStyle}>
              Clear
            </button>
          ) : null}
          {!client && clientOptions.length > 0 ? (
            <div style={dropStyle}>
              {clientOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setClient(c); setClientQuery(""); setClientOptions([]); }}
                  style={dropItemStyle}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>LAYERS</span>
        {LAYERS.map((l) => (
          <label key={l} style={{ fontSize: 13, display: "inline-flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={layers[l]}
              onChange={() => setLayers((prev) => ({ ...prev, [l]: !prev[l] }))}
            />
            {l}
          </label>
        ))}
        <label style={{ fontSize: 13, display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" checked={missingOnly} onChange={() => setMissingOnly((v) => !v)} />
          missing-boundary only
        </label>
        <button type="button" onClick={toggleQa} style={qaMode ? primaryBtnStyle : miniBtnStyle}>
          {qaMode ? "Exit boundary QA" : "Boundary QA"}
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => setBase("sat")} style={base === "sat" ? primaryBtnStyle : miniBtnStyle}>
          Satellite
        </button>
        <button type="button" onClick={() => setBase("osm")} style={base === "osm" ? primaryBtnStyle : miniBtnStyle}>
          Map
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 420, position: "relative", border: "1px solid var(--hairline)" }}>
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
          {zoomGated ? (
            <div style={overlayStyle}>Zoom in (zoom 5+) to load farms. At platform scale the map never loads everything at once.</div>
          ) : null}
          {refused ? <div style={overlayStyle}>{refused}</div> : null}
          {loading ? (
            <div style={{ ...overlayStyle, top: "auto", bottom: 10 }}>Loading viewport…</div>
          ) : null}
        </div>

        <aside
          style={{
            width: 320,
            flexShrink: 0,
            border: "1px solid var(--hairline)",
            background: "var(--surface-card)",
            overflowY: "auto",
            padding: 12,
            fontSize: 13,
          }}
        >
          {error ? <div style={{ color: "var(--semantic-error, #dc2626)", marginBottom: 8 }}>{error}</div> : null}
          <div style={{ marginBottom: 8, color: "var(--muted)", fontSize: 12 }}>
            Showing {visibleFarms.length} of {total} farms in view
            {invalidCount > 0 ? ` · ${invalidCount} invalid boundaries skipped` : ""}
          </div>

          {qaMode ? (
            <section style={{ marginBottom: 16 }}>
              <h2 style={h2Style}>Boundary QA flags</h2>
              {qaLoading ? <div>Checking boundaries…</div> : null}
              {qaMeta ? (
                <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 6 }}>
                  Scanned {qaMeta.scanned} boundaries · tolerance {(qaMeta.tolerance * 100).toFixed(0)}%
                  {qaMeta.invalidCount > 0 ? ` · ${qaMeta.invalidCount} invalid skipped` : ""}
                </div>
              ) : null}
              {qaFlags.length === 0 && !qaLoading ? <div>No area-delta flags.</div> : null}
              {qaFlags.map((f) => (
                <div key={f.farmId} style={rowStyle}>
                  <div style={{ fontWeight: 600 }}>{f.farmName}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {f.clientName ?? "—"} · recorded {f.recordedAcres} ac · computed {f.computedAcres} ac · delta {f.deltaPct}%
                  </div>
                  <Link href={f.compareHref}>Compare</Link>
                </div>
              ))}
            </section>
          ) : null}

          <section style={{ marginBottom: 16 }}>
            <h2 style={h2Style}>Without coordinates ({missingCoords.length})</h2>
            {missingCoords.length === 0 ? <div style={{ color: "var(--muted)" }}>None in this view.</div> : null}
            {missingCoords.map((f) => (
              <div key={f.id} style={rowStyle}>
                <div style={{ fontWeight: 600 }}>{f.name}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{f.clientName ?? "—"} · {f.status}</div>
                <Link href={f.href}>Open Farm 360</Link>
              </div>
            ))}
          </section>

          <section>
            <h2 style={h2Style}>Farms in view ({visibleFarms.length})</h2>
            {visibleFarms.slice(0, 100).map((f) => (
              <div key={f.id} style={rowStyle}>
                <div style={{ fontWeight: 600 }}>{f.name}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {f.clientName ?? "—"} · {f.status}
                  {layers.tasks && (taskCounts[f.id] ?? 0) > 0 ? ` · ${taskCounts[f.id]} open tasks` : ""}
                  {!f.hasBoundary ? " · no boundary" : ""}
                </div>
                <Link href={f.href}>Open Farm 360</Link>
              </div>
            ))}
            {visibleFarms.length > 100 ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>List trimmed to first 100 — zoom in for detail.</div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--hairline)",
  background: "var(--surface-card)",
  color: "var(--ink)",
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 4,
  minWidth: 200,
};

const dropStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  zIndex: 1000,
  background: "var(--surface-card)",
  border: "1px solid var(--hairline)",
  minWidth: 220,
  maxHeight: 240,
  overflowY: "auto",
};

const dropItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  padding: "8px 10px",
  fontSize: 13,
  cursor: "pointer",
  color: "var(--ink)",
};

const miniBtnStyle: React.CSSProperties = {
  border: "1px solid var(--hairline)",
  background: "var(--surface-card)",
  color: "var(--ink)",
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 10px",
  borderRadius: 4,
  cursor: "pointer",
  marginLeft: 4,
};

const primaryBtnStyle: React.CSSProperties = {
  ...miniBtnStyle,
  border: "1px solid transparent",
  background: "var(--primary)",
  color: "#ffffff",
};

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 10,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1000,
  background: "rgba(12, 10, 9, 0.88)",
  color: "#ffffff",
  padding: "8px 14px",
  borderRadius: 6,
  fontSize: 12,
  maxWidth: "90%",
  textAlign: "center",
};

const h2Style: React.CSSProperties = { fontSize: 13, fontWeight: 700, margin: "0 0 6px 0" };

const rowStyle: React.CSSProperties = {
  borderTop: "1px solid var(--hairline)",
  padding: "6px 0",
  lineHeight: 1.5,
};
