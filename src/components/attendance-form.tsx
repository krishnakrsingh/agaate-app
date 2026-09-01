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
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setGpsLoading(false);
        const err = new Error("GPS not supported on device.");
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
          const msg = err.code === 1 ? "GPS access denied." : "Unable to get GPS location.";
          setGpsError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

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
    setPending(true);
    try {
      const loc = coords ?? (await getGPS());
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: selfie.type || "image/jpeg", fileName: selfie.name }),
      });
      if (!presignRes.ok) throw new Error("Failed to prepare selfie upload.");
      const { uploadUrl, mediaId } = await presignRes.json();
      await fetch(uploadUrl, { method: "PUT", body: selfie, headers: { "Content-Type": selfie.type || "image/jpeg" } });
      await fetch(`/api/uploads/${mediaId}/complete`, { method: "POST" });

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
        toast.error((await attRes.json().catch(() => ({}))).error ?? "Clock-in failed.");
        return;
      }

      toast.success("Shift started successfully!");
      setSelfie(null);
      setSelfiePreview(null);
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
      const loc = coords ?? (await getGPS().catch(() => ({ lat: 0, lng: 0 })));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "END", latitude: loc.lat || undefined, longitude: loc.lng || undefined }),
      });
      setPending(false);
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error ?? "Clock-out failed.");
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

  // ACTIVE SHIFT BANNER
  if (attendance && !attendance.endAt) {
    return (
      <article className="card" style={{ padding: 18, background: "var(--primary-light)", border: "1px solid var(--primary-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--primary)", animation: "pulse 1.5s infinite" }} />
            <div>
              <strong style={{ fontSize: "1rem", color: "var(--primary-active)" }}>Shift Active &bull; {attendance.farm.name}</strong>
              <div className="muted" style={{ fontSize: "0.82rem" }}>Elapsed Time: <strong style={{ color: "var(--primary)" }}>{elapsed || "0h 0m 0s"}</strong></div>
            </div>
          </div>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setShowEndModal(true)}>
            <Icons.LogOut size={14} /><span>End Shift / Clock Out</span>
          </button>
        </div>

        {showEndModal && (
          <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, display: "grid", gap: 16 }}>
              <h3 style={{ margin: 0 }}>Clock Out Confirmation</h3>
              <p className="muted" style={{ margin: 0 }}>End your active shift at <strong>{attendance.farm.name}</strong>? Your total shift duration will be logged.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEndModal(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleClockOut} disabled={pending}>
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
      <article className="card" style={{ padding: 16, background: "var(--card-muted)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "var(--text-main)" }}>Shift Completed Today ({attendance.farm.name})</strong>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>Clocked out on {new Date(attendance.endAt).toLocaleTimeString()}.</p>
          </div>
          <span className="status completed">Shift Finished</span>
        </div>
      </article>
    );
  }

  // CLOCK IN COCKPIT
  return (
    <article className="card" style={{ padding: 22, display: "grid", gap: 16 }}>
      <div className="card-header" style={{ margin: 0 }}>
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" />PRESENCE VERIFICATION</div>
          <h3 style={{ margin: "2px 0 0" }}>Start Daily Shift</h3>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void getGPS()} disabled={gpsLoading}>
          <Icons.MapPin size={14} /><span>{gpsLoading ? "Acquiring GPS…" : "Refresh GPS"}</span>
        </button>
      </div>

      <form onSubmit={handleClockIn} style={{ display: "grid", gap: 14 }}>
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Assigned Estate</label>
            <select value={farmId} onChange={(e) => setFarmId(e.target.value)} required>
              {farms.map((f) => (<option key={f.id} value={f.id}>{f.name} ({f.location})</option>))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>GPS Geofence Radar</label>
            <div style={{ padding: "8px 12px", background: "var(--card-muted)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: "0.85rem" }}>
              {radar ? (
                <span style={{ color: radar.isInside ? "var(--success-text)" : "var(--danger-text)", fontWeight: 600 }}>
                  {radar.isInside ? `✓ Within boundary (${radar.dist}m / ${radar.radius}m)` : `⚠ Outside fence (${radar.dist}m / ${radar.radius}m)`}
                </span>
              ) : (
                <span className="muted">Click &ldquo;Refresh GPS&rdquo; to test proximity</span>
              )}
            </div>
          </div>
        </div>

        {radar && !radar.isInside && (
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ color: "var(--danger-text)" }}>Reason for Out-of-Bounds Clock In</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Gate road blocked, parking at East entrance" required />
          </div>
        )}

        {/* Selfie Capture Box */}
        <div style={{ background: "var(--card-muted)", padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {selfiePreview ? (
              <img src={selfiePreview} alt="Selfie preview" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary)" }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--card)", display: "grid", placeItems: "center", border: "1px solid var(--border)" }}>
                <Icons.Camera size={20} style={{ color: "var(--text-muted)" }} />
              </div>
            )}
            <div>
              <strong style={{ fontSize: "0.9rem" }}>{selfie ? "Presence Selfie Ready" : "Selfie Verification Required"}</strong>
              <div className="muted" style={{ fontSize: "0.78rem" }}>{selfie ? "Photo captured & verified" : "Take live photo with front camera"}</div>
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCamera(true)}>
            <Icons.Camera size={14} /><span>{selfie ? "Retake Selfie" : "Take Selfie"}</span>
          </button>
        </div>

        {showCamera && (
          <div className="modal-overlay" onClick={() => setShowCamera(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, padding: 0, overflow: "hidden" }}>
              <CameraCapture onCapture={(file, url) => { setSelfie(file); setSelfiePreview(url); setShowCamera(false); }} onCancel={() => setShowCamera(false)} />
            </div>
          </div>
        )}

        {gpsError && <div className="error" role="alert"><Icons.AlertCircle size={15} /><span>{gpsError}</span></div>}

        <button type="submit" className="btn btn-primary btn-lg" disabled={pending || !farmId}>
          <Icons.Check size={16} /><span>{pending ? "Starting Shift…" : "Clock In & Start Shift"}</span>
        </button>
      </form>
    </article>
  );
}
