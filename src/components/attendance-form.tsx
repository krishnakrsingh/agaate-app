"use client";
import { FormEvent, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { useToast } from "./ui/toast";
import { BiometricFaceScanner } from "./biometric-face-scanner";
import { WebAuthnVerify } from "./webauthn/webauthn-verify";
import { LivenessChallenge } from "./liveness-challenge";

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

// Haversine formula to compute distance in meters on client for visual feedback
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function AttendanceForm({ onShiftChange }: { onShiftChange?: () => void }) {
  const toast = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [showEndDrawer, setShowEndDrawer] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [capturedSelfieFile, setCapturedSelfieFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [gpsError, setGpsError] = useState("");
  const [pending, setPending] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webauthnVerified, setWebauthnVerified] = useState(false);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [needsWebAuthn, setNeedsWebAuthn] = useState(false);
  const [needsFace, setNeedsFace] = useState(false);

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
      // Stage 4: check if biometric enrollment requires recent verification for attendance
      try {
        const [credRes, faceRes] = await Promise.all([fetch("/api/webauthn/credentials"), fetch("/api/biometric/status")]);
        if (credRes.ok) {
          const creds = await credRes.json();
          setNeedsWebAuthn(Array.isArray(creds) && creds.length > 0);
        }
        if (faceRes.ok) {
          const s = await faceRes.json();
          setNeedsFace(Boolean(s.enrolled));
        }
      } catch {
        // ignore biometric status
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

  // Compute live proximity distance if coordinates are available
  const proximityInfo = (() => {
    if (!coords || !selectedFarm || !selectedFarm.latitude || !selectedFarm.longitude) {
      return null;
    }
    const farmLat = Number(selectedFarm.latitude);
    const farmLng = Number(selectedFarm.longitude);
    if (isNaN(farmLat) || isNaN(farmLng)) return null;

    const distance = calculateDistanceMeters(coords.lat, coords.lng, farmLat, farmLng);
    const maxRadius = selectedFarm.geofenceRadiusMeters ?? 500;
    const isWithin = distance <= maxRadius;

    return { distance, maxRadius, isWithin };
  })();

  function handleSelfieChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelfiePreview(URL.createObjectURL(file));
      setGpsError("");
    } else {
      setSelfiePreview(null);
    }
  }

  function acquireLocation(): Promise<{ lat: number; lng: number }> {
    setGpsError("");
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = new Error("This device cannot provide geolocation.");
        setGpsError(err.message);
        reject(err);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          resolve(c);
        },
        (err) => {
          const msg =
            err.code === 1
              ? "Location permission was denied. Please allow location access in your browser settings to verify field attendance."
              : "Unable to acquire high-accuracy GPS signal. Please step outdoors and retry.";
          setGpsError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }

  async function handleAttendanceSubmit(action: "START" | "END", e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    setGpsError("");

    const form = new FormData(e.currentTarget);
    const farmId = action === "START" ? selectedFarmId || String(form.get("farmId")) : currentAttendance?.farm.id;
    const formSelfie = form.get("selfie");
    const selfie = capturedSelfieFile || (formSelfie instanceof File && formSelfie.size > 0 ? formSelfie : null);

    if (!farmId) {
      setPending(false);
      setMessage("Please select your assigned farm.");
      return;
    }

    if (!selfie || !(selfie instanceof File) || !selfie.size) {
      setPending(false);
      setMessage("A live identity selfie photo is mandatory (BRD §17).");
      return;
    }

    try {
      const location = await acquireLocation();

      const presign = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          kind: "SELFIE",
          mimeType: selfie.type,
          sizeBytes: selfie.size,
        }),
      });

      if (!presign.ok) {
        const body = await presign.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to prepare selfie upload.");
      }

      const upload = await presign.json();
      const stored = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": selfie.type },
        body: selfie,
      });

      if (!stored.ok) throw new Error("Selfie photo upload failed. Check connection.");

      const confirmed = await fetch(`/api/uploads/${upload.mediaId}/complete`, { method: "POST" });
      if (!confirmed.ok) {
        const body = await confirmed.json().catch(() => ({}));
        throw new Error(body.error ?? "Selfie upload verification failed.");
      }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          action,
          latitude: location.lat,
          longitude: location.lng,
          selfieMediaId: upload.mediaId,
          reason: form.get("reason") || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Attendance submission failed.");

      const msg =
        action === "START"
          ? "Shift started successfully! Ready for field tasks."
          : "Shift ended successfully. Great job today!";
      
      toast.success(msg);
      setMessage(msg);
      setSelfiePreview(null);
      setCoords(null);
      setShowEndDrawer(false);
      await loadAttendance();
      if (onShiftChange) onShiftChange();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Attendance operation failed.";
      setMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setPending(false);
    }
  }

  // =========================================================================
  // STATE 1: ACTIVE SHIFT (Clocked In & Working)
  // =========================================================================
  if (currentAttendance && currentAttendance.startAt && !currentAttendance.endAt) {
    const startTime = new Date(currentAttendance.startAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <article
        className="card"
        style={{
          border: "2px solid var(--primary-500)",
          background: "var(--bg-card)",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-full)",
                background: "var(--primary-100)",
                color: "var(--primary-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icons.Sun size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="status active">ON DUTY</span>
                <strong style={{ fontSize: "1.1rem" }}>{currentAttendance.farm.name}</strong>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Started at <strong>{startTime}</strong> &bull; GPS Verified Field Presence
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/officer/reports" className="btn btn-sm btn-primary">
              <Icons.Camera size={14} />
              <span>Record Crop Signal</span>
            </Link>

            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setShowEndDrawer(!showEndDrawer)}
              style={{ color: "var(--danger-red)", borderColor: "var(--danger-border)" }}
            >
              <Icons.Clock size={14} />
              <span>{showEndDrawer ? "Close" : "End Shift"}</span>
            </button>
          </div>
        </div>

        {/* End Shift Drawer */}
        {showEndDrawer && (
          <form
            onSubmit={(e) => handleAttendanceSubmit("END", e)}
            className="form"
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: "var(--danger-red)" }}>
              <Icons.AlertCircle size={16} />
              <strong style={{ fontSize: "0.95rem" }}>End Today&apos;s Field Shift</strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 10px" }}>
              Capture an end-of-day selfie to verify departure time and location.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: "var(--danger-red)" }}>
              <Icons.AlertCircle size={16} />
              <strong style={{ fontSize: "0.95rem" }}>End Today&apos;s Field Shift</strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 10px" }}>
              Capture an end-of-day selfie to verify departure time and location (BRD §17).
            </p>

            <div className="form-group">
              <label>End-of-Day Field Selfie Evidence</label>
              {showScanner ? (
                <div style={{ margin: "10px 0" }}>
                  <BiometricFaceScanner
                    onCapture={(file, previewUrl) => {
                      setCapturedSelfieFile(file);
                      setSelfiePreview(previewUrl);
                      setShowScanner(false);
                      setGpsError("");
                    }}
                    onCancel={() => setShowScanner(false)}
                  />
                </div>
              ) : (
                <div
                  style={{
                    border: "2px dashed var(--border-strong)",
                    borderRadius: "var(--radius-md)",
                    padding: 14,
                    textAlign: "center",
                    background: selfiePreview ? "var(--primary-50)" : "var(--slate-50)",
                  }}
                >
                  {selfiePreview ? (
                    <div>
                      <img
                        src={selfiePreview}
                        alt="Selfie"
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: "var(--radius-full)",
                          objectFit: "cover",
                          margin: "0 auto 8px",
                          border: "2px solid var(--primary-500)",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setShowScanner(true)}
                        >
                          <Icons.Camera size={12} />
                          <span>Rescan</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span>Upload</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowScanner(true)}
                        style={{ minHeight: 42, fontSize: "0.85rem" }}
                      >
                        <Icons.Camera size={16} />
                        <span>Take Selfie</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ minHeight: 42, fontSize: "0.85rem" }}
                      >
                        <Icons.Upload size={14} />
                        <span>Upload Photo</span>
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    name="selfie"
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleSelfieChange}
                    style={{ display: "none" }}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Reason (only if ending shift outside farm perimeter)</label>
              <input name="reason" placeholder="e.g., Traveled to central grain market" />
            </div>

            {message && !message.includes("success") && (
              <div className="error" role="alert">
                <Icons.AlertCircle size={16} />
                <span>{message}</span>
              </div>
            )}

            <button type="submit" className="btn btn-danger" disabled={pending} style={{ minHeight: 48, width: "100%" }}>
              <Icons.Check size={18} />
              <span>{pending ? "Acquiring GPS & Clocking Out…" : "Confirm End of Shift"}</span>
            </button>
          </form>
        )}
      </article>
    );
  }

  // =========================================================================
  // STATE 2: SHIFT COMPLETED
  // =========================================================================
  if (currentAttendance && currentAttendance.endAt) {
    const startTime = currentAttendance.startAt
      ? new Date(currentAttendance.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";
    const endTime = new Date(currentAttendance.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
      <article
        className="card"
        style={{
          border: "1px solid var(--primary-200)",
          background: "var(--slate-50)",
          padding: "16px 20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-full)",
                background: "var(--primary-100)",
                color: "var(--primary-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icons.CheckCircle size={22} />
            </div>
            <div>
              <strong style={{ fontSize: "1.05rem" }}>Today&apos;s Field Shift Completed</strong>
              <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {currentAttendance.farm.name} &bull; {startTime} to {endTime}
              </p>
            </div>
          </div>
          <span className="status completed">Shift Closed</span>
        </div>
      </article>
    );
  }

  // =========================================================================
  // STATE 3: NOT CLOCKED IN (Start Shift Flow)
  // =========================================================================
  return (
    <article
      className="card"
      style={{
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-card)",
        padding: "20px",
        marginBottom: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div className="metric-icon-box emerald">
          <Icons.Sun size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Start Morning Field Shift</h2>
          <p className="muted" style={{ fontSize: "0.82rem" }}>
            Geofence verified selfie clock-in activates your assigned daily task queue.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => handleAttendanceSubmit("START", e)} className="form">
        <div className="form-group">
          <label>Select Assigned Farm</label>
          <select
            name="farmId"
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            required
            style={{ minHeight: 44 }}
          >
            <option value="">Choose farm location…</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.location})
              </option>
            ))}
          </select>
        </div>

        {/* Live Selfie Box — evidence (S3) */}
        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ margin: 0 }}>Live Field Selfie Evidence (BRD §17)</label>
            {selfiePreview && (
              <span
                style={{
                  background: "var(--primary-100)",
                  color: "var(--primary-700)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icons.CheckCircle size={12} />
                <span>Selfie Attached</span>
              </span>
            )}
          </div>

          {showScanner ? (
            <div style={{ margin: "10px 0" }}>
              <BiometricFaceScanner
                onCapture={(file, previewUrl) => {
                  setCapturedSelfieFile(file);
                  setSelfiePreview(previewUrl);
                  setShowScanner(false);
                  setGpsError("");
                }}
                onCancel={() => setShowScanner(false)}
              />
            </div>
          ) : (
            <div
              style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                textAlign: "center",
                background: selfiePreview ? "var(--primary-50)" : "var(--slate-50)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              {selfiePreview ? (
                <div>
                  <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 10px" }}>
                    <img
                      src={selfiePreview}
                      alt="Selfie preview"
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: "var(--radius-full)",
                        objectFit: "cover",
                        border: "3px solid var(--primary-500)",
                        boxShadow: "0 0 12px rgba(16, 185, 129, 0.3)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        background: "var(--primary-600)",
                        color: "white",
                        borderRadius: "50%",
                        width: 26,
                        height: 26,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid white",
                      }}
                    >
                      <Icons.Check size={14} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowScanner(true)}
                      style={{ minHeight: 36 }}
                    >
                      <Icons.Camera size={14} />
                      <span>Retake Selfie</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ minHeight: 36 }}
                    >
                      <span>Upload Other</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ width: "100%", maxWidth: 320 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "var(--primary-100)",
                      color: "var(--primary-700)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 10px",
                    }}
                  >
                    <Icons.Camera size={26} />
                  </div>
                  <strong style={{ fontSize: "0.95rem", color: "var(--slate-900)", display: "block", marginBottom: 2 }}>
                    Field Identity Selfie
                  </strong>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 14px" }}>
                    Capture front-camera photo to verify officer presence at field location
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setShowScanner(true)}
                      style={{
                        minHeight: 46,
                        width: "100%",
                        background: "var(--primary-600)",
                        boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                      }}
                    >
                      <Icons.Camera size={18} />
                      <span>Launch Camera</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ minHeight: 40, width: "100%", fontSize: "0.85rem" }}
                    >
                      <Icons.Upload size={14} />
                      <span>Upload Field Photo</span>
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                name="selfie"
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleSelfieChange}
                style={{ display: "none" }}
              />
            </div>
          )}
        </div>

        {/* Visual Geofence Proximity Radar */}
        {proximityInfo && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: proximityInfo.isWithin ? "var(--primary-50)" : "var(--harvest-light)",
              border: `1px solid ${proximityInfo.isWithin ? "var(--primary-200)" : "var(--harvest-border)"}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {proximityInfo.isWithin ? (
              <Icons.CheckCircle size={18} style={{ color: "var(--primary-700)" }} />
            ) : (
              <Icons.AlertTriangle size={18} style={{ color: "var(--harvest-dark)" }} />
            )}
            <div style={{ fontSize: "0.82rem" }}>
              <strong>
                {proximityInfo.isWithin
                  ? `Inside Farm Geofence (${proximityInfo.distance}m from HQ)`
                  : `Outside Geofence (${proximityInfo.distance}m from HQ, limit is ${proximityInfo.maxRadius}m)`}
              </strong>
              {!proximityInfo.isWithin && (
                <div style={{ color: "var(--harvest-dark)", marginTop: 2 }}>
                  Clock-in reason below is required for manager exception review.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reason Field */}
        <div className="form-group">
          <label>Reason (only if outside farm geofence perimeter)</label>
          <input name="reason" placeholder="e.g., Procuring irrigation parts at market" />
        </div>

        {/* Actionable GPS Status & Error Handling */}
        {gpsError && (
          <div className="error" role="alert">
            <Icons.AlertCircle size={16} />
            <div style={{ flex: 1 }}>
              <span>{gpsError}</span>
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => acquireLocation()}
                  style={{ background: "white" }}
                >
                  <Icons.Compass size={14} />
                  <span>Retry Acquiring GPS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {message && !message.includes("success") && (
          <div className="error" role="alert">
            <Icons.AlertCircle size={16} />
            <span>{message}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || !selectedFarmId}
          style={{ width: "100%", minHeight: 48, fontSize: "0.95rem" }}
        >
          <Icons.Check size={20} />
          <span>{pending ? "Validating GPS & Clocking In…" : "Clock In & Start Field Shift"}</span>
        </button>
      </form>
    </article>
  );
}
