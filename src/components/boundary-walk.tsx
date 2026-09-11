"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Icons } from "./icons";
import {
  decideSample,
  cleanSamples,
  trackPerimeterM,
  closureGapM,
  assessTrack,
  nearStart,
  TRACK,
  type GpsSample,
} from "@/lib/track";
import { ringAcres, parseBoundary, type LngLat } from "@/lib/geo";
import {
  enqueueWalk,
  markWalk,
  removeWalk,
  loadQueue,
  saveActiveWalk,
  loadActiveWalk,
  newCaptureId,
  WALK_QUEUE_KEY,
  type QueuedWalk,
  type WalkTarget,
  type WalkStatus,
} from "@/lib/walk-queue";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => <div style={{ height: 280, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>Map loading…</div>,
});

const INDIA_CENTER: [number, number] = [20.59, 78.96];

export interface WalkTargetInput {
  kind: "FARM" | "PLOT_NEW" | "PLOT_EXISTING";
  farmId: string;
  farmName?: string;
  plotId?: string;
  plotName?: string;
}

function fmtElapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function statusLabel(s: WalkStatus) {
  switch (s) {
    case "QUEUED": return "Queued — waiting for connection";
    case "SYNCING": return "Syncing…";
    case "ACCEPTED": return "Accepted by server ✓";
    case "FAILED_RETRYABLE": return "Failed — will retry";
    case "FAILED_AUTH": return "Failed — access revoked (retry after re-grant)";
    case "FAILED_VALIDATION": return "Failed — server rejected geometry";
  }
}

/** Offline-safe ring preview (pure SVG — needs zero network, unlike tiles). */
function RingPreview({ ring }: { ring: LngLat[] }) {
  const vs = useMemo(() => {
    const open = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
    const xs = open.map((p) => p[0]);
    const ys = open.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const W = 320;
    const H = 220;
    const pad = 12;
    const sx = (maxX - minX || 1e-9);
    const sy = (maxY - minY || 1e-9);
    const k = Math.min((W - pad * 2) / sx, (H - pad * 2) / sy);
    const ox = pad + ((W - pad * 2) - sx * k) / 2;
    const oy = pad + ((H - pad * 2) - sy * k) / 2;
    const pts = open.map(([x, y]) => `${(ox + (x - minX) * k).toFixed(1)},${(oy + (maxY - y) * k).toFixed(1)}`).join(" ");
    return { pts };
  }, [ring]);
  return (
    <svg viewBox="0 0 320 220" style={{ width: "100%", maxWidth: 420, background: "var(--canvas)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)" }} role="img" aria-label="Captured boundary preview">
      <polygon points={vs.pts} fill="none" stroke="var(--green)" strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
}

export function BoundaryWalk({
  target,
  center,
  farmBoundary,
}: {
  target: WalkTargetInput;
  center?: [number, number] | null;
  farmBoundary?: string | null;
}) {
  const [capturing, setCapturing] = useState(false);
  const [samples, setSamples] = useState<GpsSample[]>([]);
  const [dropped, setDropped] = useState(0);
  const [gpsState, setGpsState] = useState<"idle" | "seeking" | "tracking" | "denied" | "unavailable">("idle");
  const [gpsError, setGpsError] = useState("");
  const [lastAcc, setLastAcc] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [review, setReview] = useState(false);
  const [plotName, setPlotName] = useState(target.plotName ?? "");
  const [queue, setQueue] = useState<QueuedWalk[]>(() => loadQueue());
  const [resumed, setResumed] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastKept = useRef<GpsSample | null>(null);
  const samplesRef = useRef<GpsSample[]>([]);
  const targetRef = useRef(target);
  targetRef.current = target;

  const reference = useMemo(() => parseBoundary(farmBoundary ?? null), [farmBoundary]);
  const mapCenter = useMemo<[number, number]>(() => {
    if (samples.length > 0) {
      const p = samples[samples.length - 1];
      return [p.lat, p.lng];
    }
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) return center;
    return INDIA_CENTER;
  }, [samples, center]);

  // Elapsed ticker while capturing.
  useEffect(() => {
    if (!capturing) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [capturing]);

  const persistActive = useCallback((pts: GpsSample[]) => {
    saveActiveWalk({ target: targetRef.current as WalkTarget, samples: pts, startedAt: startedAt ?? Date.now() });
  }, [startedAt]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
  }, []);

  useEffect(() => stopWatch, [stopWatch]);

  // Offer resume of an interrupted walk for the same target.
  const pendingResume = useMemo(() => {
    if (resumed || samples.length > 0) return null;
    const a = loadActiveWalk();
    if (!a || a.samples.length === 0) return null;
    const t = a.target as WalkTargetInput;
    if (t.farmId !== target.farmId || t.kind !== target.kind || (t as { plotId?: string }).plotId !== target.plotId) return null;
    return a;
  }, [resumed, samples.length, target]);

  const startCapture = useCallback(() => {
    setGpsError("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsState("unavailable");
      setGpsError("This device does not provide geolocation. Boundary walking needs a GPS-capable device.");
      return;
    }
    // Guard: never run two watchers (would interleave fixes).
    if (watchId.current !== null) stopWatch();
    setCapturing(true);
    setReview(false);
    setGpsState("seeking");
    if (startedAt === null) setStartedAt(Date.now());
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const fix: GpsSample = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : 999,
          t: pos.timestamp || Date.now(),
        };
        setLastAcc(fix.acc);
        setGpsState("tracking");
        const d = decideSample(lastKept.current, fix);
        if (!d.keep) {
          setDropped((n) => n + 1);
          return;
        }
        lastKept.current = fix;
        samplesRef.current = [...samplesRef.current, fix];
        setSamples(samplesRef.current);
        persistActive(samplesRef.current);
      },
      (err) => {
        if (err.code === 1) {
          setGpsState("denied");
          setGpsError("Location permission was denied. Enable location for this site to walk the boundary.");
          setCapturing(false);
          stopWatch();
        } else if (err.code === 3) {
          setGpsError("Location timed out — still watching, keep the sky visible.");
        } else {
          setGpsError("Location unavailable — still watching.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    watchId.current = id;
  }, [persistActive, startedAt, stopWatch]);

  const finishCapture = useCallback(() => {
    stopWatch();
    setCapturing(false);
    setReview(true);
  }, [stopWatch]);

  const discardAll = useCallback(() => {
    stopWatch();
    setCapturing(false);
    setReview(false);
    setSamples([]);
    samplesRef.current = [];
    lastKept.current = null;
    setDropped(0);
    setStartedAt(null);
    setGpsState("idle");
    setGpsError("");
    saveActiveWalk(null);
  }, [stopWatch]);

  const cleaned = useMemo(() => cleanSamples(samples), [samples]);
  // Full geometric assessment is O(n²): run it ONLY in review (once per
  // finished walk), never per-GPS-fix. Live capture stats below stay O(n).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const report = useMemo(() => (review ? assessTrack(cleanSamples(samples)) : null), [review, samples]);
  const trackRing: LngLat[] | null = useMemo(
    () => (samples.length > 1 ? samples.map((p) => [p.lng, p.lat] as LngLat) : null),
    [samples]
  );
  const showNudge = capturing && nearStart(samples);

  const payloadTarget = (): WalkTarget => {
    if (target.kind === "PLOT_NEW") return { kind: "PLOT_NEW", farmId: target.farmId, name: plotName.trim() };
    if (target.kind === "PLOT_EXISTING") return { kind: "PLOT_EXISTING", farmId: target.farmId, plotId: target.plotId! };
    return { kind: "FARM", farmId: target.farmId };
  };

  const syncOne = useCallback(async (w: QueuedWalk) => {
    setQueue(markWalk(w.captureId, "SYNCING"));
    try {
      const res = await fetch("/api/geo/captures/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captureId: w.captureId, target: w.target, samples: w.samples }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setQueue(markWalk(w.captureId, "ACCEPTED"));
      } else if (res.status === 401 || res.status === 403) {
        setQueue(markWalk(w.captureId, "FAILED_AUTH", body.error ?? "Access denied at sync time."));
      } else if (res.status === 422) {
        setQueue(markWalk(w.captureId, "FAILED_VALIDATION", body.error ?? "Server rejected geometry."));
      } else {
        setQueue(markWalk(w.captureId, "FAILED_RETRYABLE", body.error ?? `Server error ${res.status}.`));
      }
    } catch {
      setQueue(markWalk(w.captureId, "FAILED_RETRYABLE", "No connection — kept locally, will retry.", true));
    }
  }, []);

  const confirmAndQueue = useCallback(() => {
    if (target.kind === "PLOT_NEW" && !plotName.trim()) return;
    const captureId = newCaptureId();
    const next = enqueueWalk({ captureId, target: payloadTarget(), samples });
    setQueue(next);
    discardAll();
    const queued = next.find((w) => w.captureId === captureId);
    if (queued && typeof navigator !== "undefined" && navigator.onLine !== false) {
      void syncOne(queued);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.kind, target.farmId, target.plotId, plotName, samples, discardAll, syncOne]);

  // Auto-sync retryable captures when connectivity returns.
  // Also refresh from storage events so a second tab's syncs show up here
  // (last-write-wins per captureId; server dedupe makes races harmless).
  useEffect(() => {
    const pump = () => {
      const q = loadQueue();
      setQueue(q);
      const due = q.filter((w) => w.status === "QUEUED" || w.status === "FAILED_RETRYABLE" || w.status === "FAILED_AUTH");
      due.forEach((w) => void syncOne(w));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === WALK_QUEUE_KEY) setQueue(loadQueue());
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", pump);
      window.addEventListener("storage", onStorage);
      if (navigator.onLine !== false) pump();
      return () => {
        window.removeEventListener("online", pump);
        window.removeEventListener("storage", onStorage);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elapsed = startedAt ? now - startedAt : 0;
  const walkedM = trackPerimeterM(samples);
  const liveAcres = samples.length > 2 ? ringAcresSafe(samples) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {pendingResume && (
        <div className="success-banner" role="status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span>Unfinished walk found ({pendingResume.samples.length} points). Resume it?</span>
          <span style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-green"
              onClick={() => {
                samplesRef.current = pendingResume.samples;
                lastKept.current = pendingResume.samples[pendingResume.samples.length - 1] ?? null;
                setSamples(pendingResume.samples);
                setStartedAt(pendingResume.startedAt);
                setResumed(true);
              }}
            >
              Resume
            </button>
            <button type="button" className="btn btn-sm" onClick={() => { saveActiveWalk(null); setResumed(true); }}>
              Discard
            </button>
          </span>
        </div>
      )}

      {!review ? (
        <>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, fontSize: 13 }}>
              <Stat label="GPS" value={gpsState === "tracking" ? "● Tracking" : gpsState === "seeking" ? "… Seeking" : gpsState === "denied" ? "✕ Denied" : gpsState === "unavailable" ? "✕ Unavailable" : "○ Idle"} />
              <Stat label="Accuracy" value={lastAcc === null ? "—" : `±${Math.round(lastAcc)}m`} />
              <Stat label="Walked" value={`${Math.round(walkedM)}m`} />
              <Stat label="Time" value={fmtElapsed(elapsed)} />
              <Stat label="Points" value={`${samples.length}`} />
              <Stat label="Est. area" value={samples.length > 2 ? `~${liveAcres.toFixed(2)} ac` : "—"} />
            </div>
            {gpsError && <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--red)" }}>{gpsError}</div>}
            {showNudge && (
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "var(--green)" }}>
                Near starting point — finish boundary?
              </div>
            )}
            {dropped > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                {dropped} noisy fix{dropped === 1 ? "" : "es"} filtered (jumps/duplicates/poor accuracy).
              </div>
            )}
          </div>

          <GeoMap center={mapCenter} polygon={null} onChange={() => undefined} reference={reference} track={trackRing} height={300} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!capturing ? (
              <button type="button" className="btn btn-green" onClick={startCapture}>
                {samples.length > 0 ? "Resume Capture" : "Start Capture"}
              </button>
            ) : (
              <button type="button" className="btn btn-green" onClick={finishCapture} disabled={samples.length < 2}>
                Finish Capture
              </button>
            )}
            {(samples.length > 0 || capturing) && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (samples.length > 0 && !confirm(`Discard this walk (${samples.length} GPS points)? This cannot be undone.`)) return;
                  discardAll();
                }}
              >
                Discard
              </button>
            )}
          </div>
        </>
      ) : report ? (
        <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <strong style={{ fontSize: 15 }}>Review Walk</strong>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {report.ring && <RingPreview ring={report.ring} />}
            <dl className="kv" style={{ margin: 0 }}>
              <div style={{ display: "contents" }}><dt>Measured</dt><dd>{report.acres.toFixed(2)} ac (server recomputes on sync)</dd></div>
              <div style={{ display: "contents" }}><dt>Walked</dt><dd>{Math.round(report.perimeterM)}m · {report.samples} points</dd></div>
              <div style={{ display: "contents" }}><dt>Quality</dt><dd><QualityChip quality={report.quality} /></dd></div>
            </dl>
          </div>
          {report.reasons.map((r, i) => (
            <div key={i} className={report.quality === "INVALID" ? "error" : "success-banner"} role={report.quality === "INVALID" ? "alert" : "status"}>
              <span>{r}</span>
            </div>
          ))}
          {target.kind === "PLOT_NEW" && (
            <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4, maxWidth: 320 }}>
              Plot name (required)
              <input value={plotName} onChange={(e) => setPlotName(e.target.value)} placeholder="e.g. Walked North Block" maxLength={120} />
            </label>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-green"
              disabled={report.quality === "INVALID" || (target.kind === "PLOT_NEW" && !plotName.trim())}
              onClick={confirmAndQueue}
              title={report.quality === "INVALID" ? "Fix the walk first — see reasons above" : "Queue for sync"}
            >
              Confirm & Queue Sync
            </button>
            <button type="button" className="btn" onClick={() => setReview(false)}>
              Back to Capture
            </button>
          </div>
        </div>
      ) : null}

      <QueueList
        queue={queue}
        onRetry={(w) => void syncOne({ ...w })}
        onDiscard={(id) => setQueue(removeWalk(id))}
      />
    </div>
  );
}

function ringAcresSafe(samples: GpsSample[]): number {
  try {
    if (samples.length < 3) return 0;
    return ringAcres(samples.map((p) => [p.lng, p.lat] as LngLat));
  } catch {
    return 0;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function QualityChip({ quality }: { quality: "GOOD" | "WARNING" | "INVALID" }) {
  const style =
    quality === "GOOD"
      ? { background: "var(--green-tint)", color: "var(--green-ink)" }
      : quality === "WARNING"
        ? { background: "var(--amber-light)", color: "var(--amber)" }
        : { background: "var(--red-light)", color: "var(--red)" };
  return (
    <span className="badge" style={style}>
      {quality}
    </span>
  );
}

function QueueList({
  queue,
  onRetry,
  onDiscard,
}: {
  queue: QueuedWalk[];
  onRetry: (w: QueuedWalk) => void;
  onDiscard: (id: string) => void;
}) {
  if (queue.length === 0) return null;
  const targetLabel = (w: QueuedWalk) =>
    w.target.kind === "FARM"
      ? "Farm fence"
      : w.target.kind === "PLOT_NEW"
        ? `New plot “${w.target.name}”`
        : "Plot re-fence";
  return (
    <div className="card" style={{ padding: 14 }}>
      <strong style={{ fontSize: 14 }}>Sync Queue ({queue.length})</strong>
      <p className="muted" style={{ fontSize: 12, margin: "4px 0 8px" }}>
        Local captures are not authoritative until the server accepts them.
      </p>
      {queue.map((w) => (
        <div className="list-row" key={w.captureId}>
          <span style={{ flex: 1 }}>
            <b>{targetLabel(w)}</b> · {w.samples.length} pts<br />
            <small style={{ color: "var(--muted)" }}>{statusLabel(w.status)}{w.lastError ? ` — ${w.lastError}` : ""}{w.attempts > 0 ? ` · tried ${w.attempts}×` : ""}</small>
          </span>
          {(w.status === "QUEUED" || w.status.startsWith("FAILED")) && (
            <button type="button" className="btn btn-sm" onClick={() => onRetry(w)}>
              Retry
            </button>
          )}
          <button type="button" className="btn btn-sm btn-danger" onClick={() => onDiscard(w.captureId)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
