"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
import { FormEvent, useEffect, useState, useCallback } from "react";
import { Icons } from "./icons";
import { useToast } from "./ui/toast";
import { CameraCapture } from "./camera-capture";
import { distanceMeters } from "@/lib/business";

type Farm = {
  id: string;
  name: string;
  location: string;
  latitude?: string;
  longitude?: string;
  geofenceRadiusMeters?: number;
};

type AttendanceRecord = {
  id: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  exceptionReason?: string | null;
  farm: { id: string; name: string; location: string };
};

export function AttendanceForm({ onShiftChange }: { onShiftChange?: () => void }) {
  const toast = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [farmId, setFarmId] = useState("");
  const [showEndModal, setShowEndModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [simulatedMode, setSimulatedMode] = useState<"device" | "outside" | "inside">("device");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [elapsed, setElapsed] = useState("");

  const load = useCallback(async () => {
    try {
      const [fRes, aRes] = await Promise.all([fetch("/api/farms"), fetch("/api/attendance")]);
      if (fRes.ok) {
        const list = await fRes.json();
        setFarms(list);
        if (list.length > 0) setFarmId((prev) => prev || list[0].id);
      }
      if (aRes.ok) {
        setAttendance((await aRes.json()).attendance ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!attendance?.startAt || attendance?.endAt) return;
    const startMs = new Date(attendance.startAt).getTime();
    const update = () => {
      const s = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsed(`${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [attendance]);

  const selectedFarm = farms.find((f) => f.id === farmId);

  const getGPS = useCallback(async (): Promise<{ lat: number; lng: number }> => {
    setGpsLoading(true);
    setGpsError("");
    setSimulatedMode("device");
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setGpsLoading(false);
        const err = new Error("GPS not supported on this device.");
        setGpsError(err.message);
        reject(err);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const c = { lat: p.coords.latitude, lng: p.coords.longitude };
          setCoords(c);
          setGpsLoading(false);
          resolve(c);
        },
        (err) => {
          setGpsLoading(false);
          const msg = err.code === 1 ? "GPS access denied by browser." : "Unable to acquire GPS fix.";
          setGpsError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }, []);

  // Auto-acquire GPS on mount if not yet clocked in
  useEffect(() => {
    if (!attendance && !coords) {
      void getGPS().catch(() => {});
    }
  }, [attendance, coords, getGPS]);

  // Demo Location Simulation Helpers
  const simulateLocation = (type: "inside" | "outside") => {
    if (!selectedFarm?.latitude || !selectedFarm?.longitude) return;
    const fLat = Number(selectedFarm.latitude);
    const fLng = Number(selectedFarm.longitude);
    if (isNaN(fLat) || isNaN(fLng)) return;

    if (type === "inside") {
      // ~45 meters from farm center (well within geofence radius)
      setCoords({ lat: fLat + 0.0003, lng: fLng + 0.0002 });
      setSimulatedMode("inside");
      toast.info("Simulated location: At Farm Gate (45m inside boundary)");
    } else {
      // ~2.5 kilometers away from farm center (flagged as out-of-bounds exception)
      setCoords({ lat: fLat + 0.022, lng: fLng + 0.015 });
      setSimulatedMode("outside");
      toast.info("Simulated location: 2.5km Away (Outside Geofence Exception)");
    }
  };

  const radar = (() => {
    if (!coords || !selectedFarm?.latitude || !selectedFarm?.longitude) return null;
    const fLat = Number(selectedFarm.latitude);
    const fLng = Number(selectedFarm.longitude);
    if (isNaN(fLat) || isNaN(fLng)) return null;
    const dist = Math.round(distanceMeters({ latitude: coords.lat, longitude: coords.lng }, { latitude: fLat, longitude: fLng }));
    const radius = selectedFarm.geofenceRadiusMeters ?? 500;
    return { dist, radius, isInside: dist <= radius };
  })();

  async function handleClockIn(e: FormEvent) {
    e.preventDefault();
    if (!selfie) {
      toast.error("Please capture a presence selfie first.");
      setShowCamera(true);
      return;
    }

    if (radar && !radar.isInside && (!reason || reason.trim().length < 5)) {
      toast.error("Please provide an operational reason (min 5 characters) for out-of-bounds clock-in.");
      return;
    }

    setPending(true);
    try {
      const loc = coords ?? (await getGPS());

      // 1. Presign upload URL for selfie
      const mimeType = selfie.type === "image/png" ? "image/png" : selfie.type === "image/webp" ? "image/webp" : "image/jpeg";
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          kind: "SELFIE",
          mimeType,
          sizeBytes: selfie.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to prepare selfie upload.");
      }
      const { uploadUrl, mediaId } = await presignRes.json();

      // 2. Upload image to S3/MinIO
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        body: selfie,
        headers: { "Content-Type": mimeType },
      });
      if (!s3Res.ok) throw new Error("Could not upload selfie to storage.");

      // 3. Complete and verify upload
      const completeRes = await fetch(`/api/uploads/${mediaId}/complete`, { method: "POST" });
      if (!completeRes.ok) throw new Error("Could not verify selfie upload.");

      // 4. Submit attendance record
      const attRes = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START",
          farmId,
          latitude: loc.lat,
          longitude: loc.lng,
          selfieMediaId: mediaId,
          ...(reason ? { reason } : {}),
        }),
      });

      setPending(false);
      if (!attRes.ok) {
        const errorData = await attRes.json().catch(() => ({}));
        toast.error(errorData.error ?? "Clock-in failed.");
        return;
      }

      const resData = await attRes.json();
      if (resData.attendance?.status === "EXCEPTION_PENDING") {
        toast.info("Shift started with OUT-OF-BOUNDS EXCEPTION! Sent to Farm Admin for authorization.");
      } else {
        toast.success("Shift started successfully!");
      }

      setSelfie(null);
      setSelfiePreview(null);
      setReason("");
      void load();
      onShiftChange?.();
    } catch (err: any) {
      setPending(false);
      toast.error(err.message ?? "Network error during clock-in.");
    }
  }

  async function handleClockOut() {
    setPending(true);
    try {
      const loc = coords ?? (await getGPS().catch(() => null));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "END",
          farmId: attendance?.farm?.id,
          latitude: loc?.lat ?? undefined,
          longitude: loc?.lng ?? undefined,
        }),
      });
      setPending(false);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error ?? "Clock-out failed.");
        return;
      }
      toast.success("Shift ended successfully.");
      setShowEndModal(false);
      void load();
      onShiftChange?.();
    } catch {
      setPending(false);
      toast.error("Network error during clock-out.");
    }
  }

  async function handleResetShift() {
    if (!confirm("Reset today's shift to test clocking in again?")) return;
    setPending(true);
    try {
      const res = await fetch("/api/attendance", { method: "DELETE" });
      if (!res.ok) throw new Error("Could not reset shift.");
      toast.success("Shift reset! You can now test clock-in.");
      setAttendance(null);
      setSelfie(null);
      setSelfiePreview(null);
      setReason("");
      void load();
      onShiftChange?.();
    } catch {
      toast.error("Failed to reset shift.");
    } finally {
      setPending(false);
    }
  }

  // ACTIVE SHIFT BANNER
  if (attendance && !attendance.endAt) {
    const isException = attendance.status === "EXCEPTION_PENDING";

    return (
      <article
        className="compact-card"
        style={{
          padding: 22,
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
          backgroundColor: "var(--canvas)",
          border: isException ? "1px solid var(--amber)" : "1px solid var(--green)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: isException ? "var(--amber-light)" : "var(--green-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isException ? (
                <Icons.AlertTriangle size={20} style={{ color: "var(--amber)" }} />
              ) : (
                <Icons.Sun size={20} style={{ color: "var(--green)" }} />
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: "16px", color: "var(--ink)" }}>
                  {isException ? "Shift Active • Out-of-Bounds" : "Shift Active"}
                </strong>
                {isException ? (
                  <span className="badge badge-amber">EXCEPTION PENDING</span>
                ) : (
                  <span className="badge badge-green">ON DUTY</span>
                )}
              </div>
              <div className="muted" style={{ fontSize: "13px", marginTop: 2 }}>
                {attendance.farm.name} &bull; Elapsed:{" "}
                <strong style={{ color: isException ? "var(--amber)" : "var(--green)" }}>
                  {elapsed || "0h 0m 0s"}
                </strong>
                {isException && (
                  <span style={{ display: "block", color: "var(--amber)", fontSize: "12px", marginTop: 2 }}>
                    ⚠ Awaiting Farm Admin / Super Admin authorization in Action Center
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetShift}
              disabled={pending}
              title="Reset shift so you can demonstrate clocking in again"
              style={{ borderRadius: "var(--radius-pill)", padding: "8px 14px", fontSize: "12px" }}
            >
              <Icons.Refresh size={14} />
              <span>Reset Shift (Demo)</span>
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowEndModal(true)}
              style={{ borderRadius: "var(--radius-pill)", padding: "8px 18px" }}
            >
              <Icons.LogOut size={15} />
              <span>End Shift / Clock Out</span>
            </button>
          </div>
        </div>

        {showEndModal && (
          <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 16, borderRadius: "var(--radius-lg)", padding: 24 }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Clock Out Confirmation</h3>
              <p className="muted" style={{ margin: 0, fontSize: "14px", lineHeight: 1.5 }}>
                End your active shift at <strong>{attendance.farm.name}</strong>? Your total shift duration will be logged.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEndModal(false)} style={{ borderRadius: "var(--radius-pill)" }}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleClockOut} disabled={pending} style={{ borderRadius: "var(--radius-pill)" }}>
                  {pending ? "Ending…" : "Confirm Clock Out"}
                </button>
              </div>
            </div>
          </div>
        )}
      </article>
    );
  }

  // COMPLETED SHIFT BANNER
  if (attendance?.endAt) {
    return (
      <article
        className="compact-card"
        style={{
          padding: 20,
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
          backgroundColor: "var(--stone)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <strong style={{ color: "var(--ink)", fontSize: "15px" }}>Shift Completed Today &bull; {attendance.farm.name}</strong>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "13px" }}>
              Clocked out on {new Date(attendance.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge badge-green">SHIFT FINISHED</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetShift}
              disabled={pending}
              title="Reset shift to test clocking in again"
              style={{ borderRadius: "var(--radius-pill)" }}
            >
              <Icons.Refresh size={13} />
              <span>Reset (Demo)</span>
            </button>
          </div>
        </div>
      </article>
    );
  }

  // CLOCK IN COCKPIT
  return (
    <article className="compact-card" style={{ padding: 22, gap: 16 }}>
      <div className="page-header" style={{ margin: 0, paddingBottom: 10 }}>
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /><span>PRESENCE VERIFICATION</span></div>
          <h3 className="section-title">Start Daily Shift</h3>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
            Capture a verified presence selfie and confirm geofence boundary coordinates to begin field operations.
          </p>
        </div>
      </div>

      <form onSubmit={handleClockIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Assigned Estate</label>
            <select value={farmId} onChange={(e) => setFarmId(e.target.value)} required>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.location}) — Radius: {f.geofenceRadiusMeters ?? 500}m
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ margin: 0 }}>GPS Geofence Radar</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void getGPS()}
                disabled={gpsLoading}
                style={{ fontSize: "11px", padding: "4px 8px" }}
              >
                <Icons.MapPin size={12} />
                <span>{gpsLoading ? "Acquiring…" : "Device GPS"}</span>
              </button>
            </div>

            <div
              style={{
                padding: "10px 14px",
                background: radar?.isInside ? "var(--green-light)" : radar ? "var(--red-light)" : "var(--stone)",
                borderRadius: "var(--radius-xs)",
                border: radar?.isInside ? "1px solid var(--green)" : radar ? "1px solid var(--red)" : "1px solid var(--line)",
                fontSize: "13px",
                minHeight: 44,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 4,
              }}
            >
              {radar ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <span style={{ color: radar.isInside ? "var(--green)" : "var(--red)", fontWeight: 650 }}>
                    {radar.isInside
                      ? `✓ Within boundary (${radar.dist}m / ${radar.radius}m radius)`
                      : `⚠ Outside fence (${radar.dist >= 1000 ? `${(radar.dist / 1000).toFixed(1)}km` : `${radar.dist}m`} / ${radar.radius}m radius)`}
                  </span>
                  <span className="muted" style={{ fontSize: "11px" }}>
                    {simulatedMode === "inside" ? "🎯 At Farm Gate" : simulatedMode === "outside" ? "🚶 2.5km Away" : "📍 Real Device"}
                  </span>
                </div>
              ) : (
                <span className="muted">Acquiring GPS fix…</span>
              )}
            </div>

            {/* Quick Demo Location Simulation Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span className="muted" style={{ fontSize: "11px" }}>Demo Simulation:</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => simulateLocation("inside")}
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: simulatedMode === "inside" ? "var(--green-light)" : undefined,
                  color: simulatedMode === "inside" ? "var(--green)" : undefined,
                  borderColor: simulatedMode === "inside" ? "var(--green)" : undefined,
                }}
              >
                🎯 At Farm Gate (Within Fence)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => simulateLocation("outside")}
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: simulatedMode === "outside" ? "var(--amber-light)" : undefined,
                  color: simulatedMode === "outside" ? "var(--red)" : undefined,
                  borderColor: simulatedMode === "outside" ? "var(--red)" : undefined,
                }}
              >
                🚶 2.5km Away (Outside Fence)
              </button>
            </div>
          </div>
        </div>

        {/* OUT OF BOUNDS WARNING & REASON INPUT */}
        {radar && !radar.isInside && (
          <div
            style={{
              backgroundColor: "var(--amber-light)",
              border: "1px solid var(--amber)",
              borderRadius: "var(--radius-sm)",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--red)", fontWeight: 650, fontSize: "13px" }}>
              <Icons.AlertTriangle size={17} />
              <span>Out-of-Bounds Location Flagged ({radar.dist >= 1000 ? `${(radar.dist / 1000).toFixed(1)}km` : `${radar.dist}m`} from {selectedFarm?.name || "farm"})</span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink)", lineHeight: 1.45 }}>
              You are currently outside the {radar.radius}m estate geofence. You must state an operational reason below. This shift will be recorded as <strong>EXCEPTION PENDING</strong> and immediately routed to the Farm Admin Action Center for formal authorization.
            </p>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
                Reason for Out-of-Bounds Clock In <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Attending machinery supplier in Hosur / Approach road flooded"
                required
                minLength={5}
                style={{ width: "100%", background: "var(--canvas)", borderColor: "var(--amber)" }}
              />
            </div>
          </div>
        )}

        {/* Selfie Capture Box */}
        <div style={{ background: "var(--stone)", padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {selfiePreview ? (
              <img
                src={selfiePreview}
                alt="Selfie preview"
                style={{ width: 50, height: 50, borderRadius: "var(--radius-sm)", objectFit: "cover", border: "2px solid var(--green)" }}
              />
            ) : (
              <div style={{ width: 50, height: 50, borderRadius: "var(--radius-sm)", background: "var(--canvas)", display: "grid", placeItems: "center", border: "1px dashed var(--line)" }}>
                <Icons.Camera size={22} color="var(--muted)" />
              </div>
            )}
            <div>
              <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                {selfie ? "✓ Presence Selfie Verified" : "Presence Selfie Required"}
              </strong>
              <div className="muted" style={{ fontSize: "12px", marginTop: 2 }}>
                {selfie ? `${selfie.name} (${Math.round(selfie.size / 1024)} KB)` : "Take live photo with webcam or front camera"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`btn ${selfie ? "btn-secondary" : "btn-green"}`}
            onClick={() => setShowCamera(true)}
            style={{ borderRadius: "var(--radius-pill)", padding: "8px 18px" }}
          >
            <Icons.Camera size={15} />
            <span>{selfie ? "Retake Selfie" : "Take Live Selfie"}</span>
          </button>
        </div>

        {showCamera && (
          <div className="modal-overlay" onClick={() => setShowCamera(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, padding: 0, overflow: "hidden", borderRadius: "var(--radius-lg)" }}>
              <CameraCapture
                onCapture={(file, url) => {
                  setSelfie(file);
                  setSelfiePreview(url);
                  setShowCamera(false);
                  toast.success("Selfie captured!");
                }}
                onCancel={() => setShowCamera(false)}
              />
            </div>
          </div>
        )}

        {gpsError && (
          <div className="error" role="alert" style={{ fontSize: "12px" }}>
            <Icons.AlertCircle size={15} />
            <span>{gpsError} (You can use the simulation pills above for demo testing)</span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-green btn-lg"
          disabled={pending || !farmId || !selfie}
          style={{ marginTop: 6, borderRadius: "var(--radius-sm)" }}
        >
          <Icons.Check size={16} />
          <span>
            {pending
              ? "Starting Shift…"
              : radar && !radar.isInside
              ? "Submit Out-of-Bounds Shift for Authorization"
              : "Clock In & Start Shift"}
          </span>
        </button>
      </form>
    </article>
  );
}
