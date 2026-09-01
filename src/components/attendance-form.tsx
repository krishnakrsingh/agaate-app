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
  startLatitude: string | null;
  startLongitude: string | null;
  endLatitude: string | null;
  endLongitude: string | null;
  farm: { id: string; name: string; location: string };
};

export function AttendanceForm({ onShiftChange }: { onShiftChange?: () => void }) {
  const toast = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [showEndDrawer, setShowEndDrawer] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [capturedSelfieFile, setCapturedSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [pending, setPending] = useState(false);
  const [shiftElapsed, setShiftElapsed] = useState("");

  const loadAttendance = useCallback(async () => {
    try {
      const [fRes, aRes] = await Promise.all([fetch("/api/farms"), fetch("/api/attendance")]);
      if (fRes.ok) {
        const fList = await fRes.json();
        setFarms(fList);
        if (fList.length > 0) setSelectedFarmId((prev) => prev || fList[0].id);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setCurrentAttendance(aData.attendance ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  // Live timer for active shifts
  useEffect(() => {
    if (!currentAttendance?.startAt || currentAttendance?.endAt) return;
    const startMs = new Date(currentAttendance.startAt).getTime();

    const updateTimer = () => {
      const diffSecs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      setShiftElapsed(`${hours}h ${mins}m ${secs}s`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [currentAttendance]);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

  // Acquire high accuracy GPS fix
  const acquireLocation = useCallback(async (): Promise<{ lat: number; lng: number }> => {
    setAcquiringGps(true);
    setGpsError("");
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = new Error("Device does not support GPS location.");
        setGpsError(err.message);
        setAcquiringGps(false);
        reject(err);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setAcquiringGps(false);
          resolve(c);
        },
        (err) => {
          setAcquiringGps(false);
          const msg =
            err.code === 1
              ? "Location permission denied. Please enable GPS in browser settings."
              : "Unable to acquire accurate GPS fix. Please move to an open area.";
          setGpsError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });
  }, []);

  // Compute live proximity distance
  const proximityInfo = (() => {
    if (!coords || !selectedFarm || !selectedFarm.latitude || !selectedFarm.longitude) {
      return null;
    }
    const farmLat = Number(selectedFarm.latitude);
    const farmLng = Number(selectedFarm.longitude);
    if (isNaN(farmLat) || isNaN(farmLng)) return null;

    const distance = Math.round(
      distanceMeters(
        { latitude: coords.lat, longitude: coords.lng },
        { latitude: farmLat, longitude: farmLng }
      )
    );
    const maxRadius = selectedFarm.geofenceRadiusMeters ?? 500;
    const isWithin = distance <= maxRadius;

    return { distance, maxRadius, isWithin };
  })();

  async function handleClockIn(e: FormEvent) {
    e.preventDefault();
    if (!selectedFarmId) {
      toast.error("Please select your assigned farm.");
      return;
    }
    if (!capturedSelfieFile) {
      toast.error("A live presence selfie is required to clock in.");
      setShowScanner(true);
      return;
    }

    setPending(true);
    setGpsError("");

    try {
      let location = coords;
      if (!location) {
        location = await acquireLocation();
      }

      const presign = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          kind: "SELFIE",
          mimeType: capturedSelfieFile.type,
          sizeBytes: capturedSelfieFile.size,
        }),
      });

      if (!presign.ok) {
        const b = await presign.json().catch(() => ({}));
        throw new Error(b.error ?? "Failed to initiate selfie upload.");
      }

      const upload = await presign.json();
      const s3Res = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": capturedSelfieFile.type },
        body: capturedSelfieFile,
      });

      if (!s3Res.ok) throw new Error("Selfie upload failed. Check connection.");

      await fetch(`/api/uploads/${upload.mediaId}/complete`, { method: "POST" });

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          action: "START",
          latitude: location.lat,
          longitude: location.lng,
          selfieMediaId: upload.mediaId,
          reason: exceptionReason.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Clock-in failed.");

      toast.success("Shift started successfully! Ready for field tasks.");
      setCapturedSelfieFile(null);
      setSelfiePreview(null);
      setExceptionReason("");
      await loadAttendance();
      if (onShiftChange) onShiftChange();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Attendance operation failed.";
      toast.error(errMsg);
    } finally {
      setPending(false);
    }
  }

  async function handleClockOut(e: FormEvent) {
    e.preventDefault();
    if (!currentAttendance) return;
    if (!capturedSelfieFile) {
      toast.error("Please take a live selfie to clock out.");
      setShowScanner(true);
      return;
    }

    setPending(true);
    setGpsError("");

    try {
      let location = coords;
      if (!location) {
        location = await acquireLocation();
      }

      const presign = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: currentAttendance.farm.id,
          kind: "SELFIE",
          mimeType: capturedSelfieFile.type,
          sizeBytes: capturedSelfieFile.size,
        }),
      });

      if (!presign.ok) {
        const b = await presign.json().catch(() => ({}));
        throw new Error(b.error ?? "Failed to prepare upload.");
      }

      const upload = await presign.json();
      const s3Res = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": capturedSelfieFile.type },
        body: capturedSelfieFile,
      });

      if (!s3Res.ok) throw new Error("Selfie upload failed.");

      await fetch(`/api/uploads/${upload.mediaId}/complete`, { method: "POST" });

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: currentAttendance.farm.id,
          action: "END",
          latitude: location.lat,
          longitude: location.lng,
          selfieMediaId: upload.mediaId,
          reason: exceptionReason.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Clock-out failed.");

      toast.success("Shift ended successfully. Great job today!");
      setCapturedSelfieFile(null);
      setSelfiePreview(null);
      setExceptionReason("");
      setShowEndDrawer(false);
      await loadAttendance();
      if (onShiftChange) onShiftChange();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Clock-out failed.";
      toast.error(errMsg);
    } finally {
      setPending(false);
    }
  }

  const isShiftActive = Boolean(currentAttendance?.startAt && !currentAttendance?.endAt);
  const isShiftCompleted = Boolean(currentAttendance?.endAt);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* ── ACTIVE SHIFT HEADER CARD ── */}
      {isShiftActive && (
        <article
          style={{
            background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)",
            color: "#ffffff",
            borderRadius: "var(--radius-md)",
            padding: 24,
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255, 255, 255, 0.85)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                <span>SHIFT ACTIVE &bull; {currentAttendance?.farm.name}</span>
              </div>
              <h2 style={{ color: "#ffffff", fontSize: "2rem", margin: "8px 0 4px", fontWeight: 800 }}>
                {shiftElapsed || "0h 0m 0s"}
              </h2>
              <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "0.88rem", margin: 0 }}>
                Clocked in at {new Date(currentAttendance!.startAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} &bull; Live Presence & GPS Verified
              </p>
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => {
                setShowEndDrawer(true);
                setShowScanner(true);
              }}
              style={{
                background: "#ffffff",
                color: "var(--primary-hover)",
                border: "none",
                fontWeight: 700,
                padding: "10px 20px",
              }}
            >
              <Icons.Clock size={16} />
              <span>End Shift</span>
            </button>
          </div>
        </article>
      )}

      {/* ── SHIFT COMPLETED CARD ── */}
      {isShiftCompleted && (
        <article style={{ background: "var(--success-light)", border: "1px solid var(--success-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "var(--success)", color: "#ffffff", display: "grid", placeItems: "center" }}>
              <Icons.CheckCircle size={22} />
            </div>
            <div>
              <strong style={{ fontSize: "1.05rem", color: "var(--success-text)", display: "block" }}>Today&apos;s Shift Completed</strong>
              <p style={{ margin: "2px 0 0", fontSize: "0.88rem", color: "var(--success-text)" }}>
                {currentAttendance?.farm.name} &bull; {new Date(currentAttendance!.startAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to {new Date(currentAttendance!.endAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} &bull; Verified
              </p>
            </div>
          </div>
        </article>
      )}

      {/* ── START SHIFT CARD (WHEN NOT CLOCKED IN) ── */}
      {!isShiftActive && !isShiftCompleted && (
        <article className="card" style={{ padding: 24 }}>
          <div className="card-header">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot"></span>
                FIELD PRESENCE &bull; BRD §17
              </div>
              <h2 style={{ margin: "2px 0 0" }}>Start Day Shift</h2>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Verify your presence on-site with live camera selfie and GPS geofence radar.
              </p>
            </div>
          </div>

          <form onSubmit={handleClockIn} style={{ display: "grid", gap: 18 }}>
            {/* Assigned Farm Select */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="farm-select">Assigned Farm Location</label>
              <select
                id="farm-select"
                value={selectedFarmId}
                onChange={(e) => {
                  setSelectedFarmId(e.target.value);
                  setCoords(null);
                }}
                required
              >
                <option value="">Choose farm…</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Presence Selfie Section */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Live Front-Camera Presence Selfie</label>
                {selfiePreview && (
                  <span className="status-badge badge-active">
                    <Icons.Check size={12} />
                    <span>Presence Verified</span>
                  </span>
                )}
              </div>

              {showScanner ? (
                <div style={{ margin: "6px 0" }}>
                  <CameraCapture
                    onCapture={(file, previewUrl) => {
                      setCapturedSelfieFile(file);
                      setSelfiePreview(previewUrl);
                      setShowScanner(false);
                    }}
                    onCancel={() => setShowScanner(false)}
                  />
                </div>
              ) : selfiePreview ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--card-muted)", border: "1px solid var(--border)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                  <img
                    src={selfiePreview}
                    alt="Selfie preview"
                    style={{ width: 52, height: 52, borderRadius: "var(--radius-full)", objectFit: "cover", border: "2px solid var(--primary)" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.92rem" }}>
                      Live Snapshot Captured
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      High-resolution front frame attached
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowScanner(true)}
                  >
                    Retake
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScanner(true)}
                  style={{ width: "100%", minHeight: 44, justifyContent: "center" }}
                >
                  <Icons.Camera size={16} />
                  <span>Launch Live Camera & Take Selfie</span>
                </button>
              )}
            </div>

            {/* Real-time Geofence Proximity Radar */}
            <div
              style={{
                background: proximityInfo?.isWithin ? "var(--success-light)" : coords ? "var(--warning-light)" : "var(--card-muted)",
                border: `1px solid ${proximityInfo?.isWithin ? "var(--success-border)" : coords ? "var(--warning-border)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                padding: 16,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.MapPin size={16} style={{ color: proximityInfo?.isWithin ? "var(--success-text)" : coords ? "var(--warning-text)" : "var(--text-muted)" }} />
                  <span className="mono-label" style={{ color: "var(--text-main)", fontWeight: 700 }}>
                    GPS Geofence Proximity Radar
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => acquireLocation()}
                  disabled={acquiringGps}
                  style={{ fontSize: "0.78rem", padding: "2px 8px" }}
                >
                  <span>{acquiringGps ? "Acquiring GPS…" : "Refresh Location"}</span>
                </button>
              </div>

              {coords ? (
                <div>
                  {proximityInfo ? (
                    <div style={{ fontSize: "0.88rem" }}>
                      {proximityInfo.isWithin ? (
                        <div style={{ color: "var(--success-text)", fontWeight: 600 }}>
                          ✓ Within Geofence ({proximityInfo.distance}m from Farm HQ &bull; Max {proximityInfo.maxRadius}m)
                        </div>
                      ) : (
                        <div style={{ color: "var(--warning-text)", fontWeight: 600 }}>
                          ⚠️ Outside Geofence ({proximityInfo.distance}m from Farm HQ &bull; Max {proximityInfo.maxRadius}m)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                      GPS Fix: ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                  Location will be checked automatically upon clock-in.
                </div>
              )}

              {/* Mandatory exception reason when outside geofence */}
              {proximityInfo && !proximityInfo.isWithin && (
                <div style={{ marginTop: 6 }}>
                  <label htmlFor="start-reason" style={{ fontSize: "0.8rem", color: "var(--warning-text)", fontWeight: 600 }}>
                    Exception Reason (Mandatory when outside {proximityInfo.maxRadius}m)
                  </label>
                  <input
                    id="start-reason"
                    type="text"
                    placeholder="e.g., Attending agro machinery workshop / off-site nursery"
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    required
                    style={{ marginTop: 4 }}
                  />
                </div>
              )}

              {gpsError && <div className="error" style={{ margin: "4px 0 0" }}>{gpsError}</div>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={pending || !selectedFarmId || !capturedSelfieFile}
              style={{ width: "100%" }}
            >
              <span>{pending ? "Clocking In…" : "Start Day & Clock In"}</span>
              <Icons.ArrowRight size={16} />
            </button>
          </form>
        </article>
      )}

      {/* ── END SHIFT MODAL DRAWER ── */}
      {showEndDrawer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <h3 style={{ margin: 0 }}>End Day Shift</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowEndDrawer(false);
                  setShowScanner(false);
                }}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleClockOut} style={{ display: "grid", gap: 16 }}>
              <p className="muted" style={{ margin: 0 }}>
                Clocking out of <strong>{currentAttendance?.farm.name}</strong>. Please capture a live front-camera selfie to verify end of shift.
              </p>

              {showScanner ? (
                <CameraCapture
                  onCapture={(file, previewUrl) => {
                    setCapturedSelfieFile(file);
                    setSelfiePreview(previewUrl);
                    setShowScanner(false);
                  }}
                  onCancel={() => setShowScanner(false)}
                />
              ) : selfiePreview ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--card-muted)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                  <img src={selfiePreview} alt="Selfie preview" style={{ width: 48, height: 48, borderRadius: "var(--radius-full)", objectFit: "cover" }} />
                  <div style={{ flex: 1, fontSize: "0.88rem", fontWeight: 600, color: "var(--text-main)" }}>
                    Live Snapshot Attached
                  </div>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowScanner(true)}>
                    Retake
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={() => setShowScanner(true)} style={{ minHeight: 42 }}>
                  <Icons.Camera size={14} />
                  <span>Launch Camera & Take Selfie</span>
                </button>
              )}

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="end-reason">Optional Remarks / Shift Summary</label>
                <input
                  id="end-reason"
                  type="text"
                  placeholder="Completed fertigation & weed control"
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEndDrawer(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={pending || !capturedSelfieFile}
                >
                  {pending ? "Clocking Out…" : "Confirm End Day"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
