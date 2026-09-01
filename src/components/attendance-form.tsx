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

  // Update shift timer elapsed time
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

  // Acquire high accuracy GPS
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
              ? "Location permission was denied. Please allow GPS location access in browser settings."
              : "Unable to acquire accurate GPS fix. Please step into an open area and retry.";
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
      toast.error("A live presence selfie photo is required to clock in.");
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
    <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
      {/* Active Shift Card (Deep Green Cohere Band) */}
      {isShiftActive && (
        <article
          style={{
            background: "var(--deep-green)",
            color: "var(--on-dark)",
            borderRadius: "var(--radius-sm)",
            padding: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="mono-label" style={{ color: "rgba(255, 255, 255, 0.7)", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                <span>SHIFT ACTIVE &bull; {currentAttendance?.farm.name}</span>
              </div>
              <h2 style={{ color: "white", margin: "8px 0 2px" }}>
                {shiftElapsed || "0h 0m 0s"}
              </h2>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 13, margin: 0 }}>
                Started at {new Date(currentAttendance!.startAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} &bull; GPS Verified
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowEndDrawer(true);
                setShowScanner(true);
              }}
              style={{ background: "white", color: "var(--primary)", borderColor: "white" }}
            >
              <Icons.Clock size={14} />
              <span>End Shift</span>
            </button>
          </div>
        </article>
      )}

      {/* Shift Completed Card */}
      {isShiftCompleted && (
        <article style={{ background: "var(--pale-green)", border: "1px solid #bbf7d0", borderRadius: "var(--radius-sm)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "var(--radius-xs)", background: "var(--primary)", color: "white", display: "grid", placeItems: "center" }}>
              <Icons.CheckCircle size={18} />
            </div>
            <div>
              <strong style={{ fontSize: 15, color: "#166534" }}>Shift Completed Today</strong>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#15803d" }}>
                {currentAttendance?.farm.name} &bull; {new Date(currentAttendance!.startAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to {new Date(currentAttendance!.endAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </article>
      )}

      {/* Start Shift Form */}
      {!isShiftActive && !isShiftCompleted && (
        <article className="card">
          <div className="card-header">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot"></span>
                FIELD ATTENDANCE &bull; BRD §17
              </div>
              <h2 style={{ margin: "4px 0 0" }}>Start Day Shift</h2>
            </div>
          </div>

          <form onSubmit={handleClockIn} style={{ display: "grid", gap: 16 }}>
            {/* Assigned Farm Select */}
            <div className="form-group">
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
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Live Front-Camera Presence Selfie</label>
                {selfiePreview && (
                  <span className="mono-label" style={{ color: "#166534", background: "var(--pale-green)", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>
                    ✓ Presence Verified
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
                <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--soft-stone)", border: "1px solid var(--hairline)", padding: 14, borderRadius: "var(--radius-sm)" }}>
                  <img
                    src={selfiePreview}
                    alt="Selfie preview"
                    style={{ width: 56, height: 56, borderRadius: "var(--radius-full)", objectFit: "cover", border: "2px solid var(--primary)" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                      Live Selfie Attached
                    </div>
                    <div style={{ fontSize: 12, color: "var(--body-muted)" }}>
                      High-resolution frame captured from front camera
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
                  style={{ minHeight: 44, width: "100%", justifyContent: "center" }}
                >
                  <Icons.Camera size={16} />
                  <span>Launch Live Camera & Take Selfie</span>
                </button>
              )}
            </div>

            {/* Real-time Geofence Proximity Radar */}
            <div
              style={{
                background: proximityInfo?.isWithin ? "var(--spotify-green-tint)" : coords ? "var(--warning-orange-tint)" : "var(--mid-dark)",
                border: `1px solid ${proximityInfo?.isWithin ? "rgba(30, 215, 96, 0.4)" : coords ? "rgba(255, 164, 43, 0.4)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-sm)",
                padding: 16,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.MapPin size={16} style={{ color: proximityInfo?.isWithin ? "var(--spotify-green)" : coords ? "var(--warning-orange)" : "var(--text-secondary)" }} />
                  <span className="mono-label" style={{ color: "var(--text-base)" }}>
                    GPS Geofence Proximity Radar
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => acquireLocation()}
                  disabled={acquiringGps}
                  style={{ fontSize: 12, padding: 0 }}
                >
                  <span>{acquiringGps ? "Acquiring GPS…" : "Refresh Location"}</span>
                </button>
              </div>

              {coords ? (
                <div>
                  {proximityInfo ? (
                    <div style={{ fontSize: 14 }}>
                      {proximityInfo.isWithin ? (
                        <div style={{ color: "#166534", fontWeight: 600 }}>
                          ✓ Within Geofence ({proximityInfo.distance}m from Farm HQ &bull; Max {proximityInfo.maxRadius}m)
                        </div>
                      ) : (
                        <div style={{ color: "#b45309", fontWeight: 600 }}>
                          ⚠️ Outside Geofence ({proximityInfo.distance}m from Farm HQ &bull; Max {proximityInfo.maxRadius}m)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--body-muted)" }}>
                      GPS Coords: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  GPS position will be checked automatically upon clock-in.
                </div>
              )}

              {/* Exception Reason when outside geofence */}
              {proximityInfo && !proximityInfo.isWithin && (
                <div style={{ marginTop: 6 }}>
                  <label htmlFor="start-reason" style={{ fontSize: 12, color: "#92400e" }}>
                    Exception Reason (Mandatory when outside 500m)
                  </label>
                  <input
                    id="start-reason"
                    type="text"
                    placeholder="e.g., Attending agro machinery workshop / remote nursery"
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
              style={{ width: "100%", marginTop: 4 }}
            >
              <span>{pending ? "Clocking In…" : "Start Day & Clock In"}</span>
              <Icons.ArrowRight size={16} />
            </button>
          </form>
        </article>
      )}

      {/* End Shift Drawer Modal */}
      {showEndDrawer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(2px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div className="card" style={{ maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>End Day Shift</h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowEndDrawer(false);
                  setShowScanner(false);
                }}
                style={{ padding: 0 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleClockOut} style={{ display: "grid", gap: 14 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--body-muted)" }}>
                Clocking out of <strong>{currentAttendance?.farm.name}</strong>. Please capture a live front-camera selfie to verify presence.
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
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--soft-stone)", padding: 12, borderRadius: "var(--radius-xs)" }}>
                  <img src={selfiePreview} alt="Selfie preview" style={{ width: 48, height: 48, borderRadius: "var(--radius-full)", objectFit: "cover" }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
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

              <div className="form-group">
                <label htmlFor="end-reason" style={{ fontSize: 13 }}>Optional Remarks / Shift Summary</label>
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
