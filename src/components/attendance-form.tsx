"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
import { FormEvent, useEffect, useState, useCallback, useRef } from "react";
import { Icons } from "./icons";
import { useToast } from "./ui/toast";
import { distanceMeters } from "@/lib/business";
import { compressImage } from "@/lib/image-compress";

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
  geofenceBasis?: string | null;
  farm: { id: string; name: string; location: string };
};

export function AttendanceForm({ onShiftChange }: { onShiftChange?: () => void }) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [farmId, setFarmId] = useState("");
  const [showEndModal, setShowEndModal] = useState(false);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  // Last SERVER verdict (never the phone radar): which boundary was used,
  // inside/outside, and why a check-in was rejected.
  const [verdict, setVerdict] = useState<string | null>(null);

function basisText(basis?: string | null) {
  if (basis === "PLOT_POLYGON") return "plot fence";
  if (basis === "FARM_POLYGON") return "farm fence";
  if (basis === "RADIUS") return "radius fallback (no fence drawn)";
  return "location check";
}
  const [elapsed, setElapsed] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

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
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
          const msg =
            err.code === 1
              ? "GPS access denied. Please enable location permissions."
              : "Unable to acquire GPS fix. Please step outside.";
          setGpsError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Auto-acquire GPS on mount if not yet clocked in
  useEffect(() => {
    if (!attendance && !coords) {
      void getGPS().catch(() => {});
    }
  }, [attendance, coords, getGPS]);

  // Auto-select nearest assigned farm based on GPS coordinates
  useEffect(() => {
    if (!coords || farms.length <= 1) return;
    let closestFarmId = farmId;
    let minDistance = Infinity;

    for (const f of farms) {
      if (!f.latitude || !f.longitude) continue;
      const fLat = Number(f.latitude);
      const fLng = Number(f.longitude);
      if (isNaN(fLat) || isNaN(fLng)) continue;
      const d = distanceMeters(
        { latitude: coords.lat, longitude: coords.lng },
        { latitude: fLat, longitude: fLng }
      );
      if (d < minDistance) {
        minDistance = d;
        closestFarmId = f.id;
      }
    }

    if (closestFarmId && closestFarmId !== farmId) {
      setFarmId(closestFarmId);
    }
  }, [coords, farms, farmId]);

  const radar = (() => {
    if (!coords || !selectedFarm?.latitude || !selectedFarm?.longitude) return null;
    const fLat = Number(selectedFarm.latitude);
    const fLng = Number(selectedFarm.longitude);
    if (isNaN(fLat) || isNaN(fLng)) return null;
    const dist = Math.round(
      distanceMeters(
        { latitude: coords.lat, longitude: coords.lng },
        { latitude: fLat, longitude: fLng }
      )
    );
    const radius = selectedFarm.geofenceRadiusMeters ?? 500;
    return { dist, radius, isInside: dist <= radius };
  })();

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setSelfie(compressed);
      setSelfiePreview(URL.createObjectURL(compressed));
      toast.show("Presence photo captured successfully", "success");
    } catch {
      toast.show("Could not process photo. Please try again.", "error");
    } finally {
      setCompressing(false);
    }
  };

  async function handleClockIn(e: FormEvent) {
    e.preventDefault();
    if (!selfie) {
      toast.show("Please capture a presence photo first.", "error");
      fileInputRef.current?.click();
      return;
    }

    if (radar && !radar.isInside && (!reason || !reason.trim())) {
      toast.show("Please enter a reason for remote check-in.", "error");
      return;
    }

    setPending(true);
    try {
      const loc = coords ?? (await getGPS());

      // 1. Secure selfie upload: presigned S3 PUT + server-side verify.
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId, kind: "SELFIE", mimeType: selfie.type || "image/jpeg", sizeBytes: selfie.size }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload presence selfie.");
      }
      const { uploadUrl, mediaId } = await presignRes.json();
      const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": selfie.type || "image/jpeg" }, body: selfie });
      if (!putRes.ok) throw new Error("Failed to upload presence selfie.");
      const completeRes = await fetch(`/api/uploads/${mediaId}/complete`, { method: "POST" });
      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload presence selfie.");
      }

      // Normalize short reasons (e.g. 1-2 chars) to ensure backend schema compatibility
      const trimmedReason = reason.trim();
      const sanitizedReason = trimmedReason.length < 3 ? `${trimmedReason} (remote field duty)` : trimmedReason;

      // 2. Submit attendance record
      const attRes = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START",
          farmId,
          latitude: loc.lat,
          longitude: loc.lng,
          selfieMediaId: mediaId,
          ...(trimmedReason ? { reason: sanitizedReason } : {}),
        }),
      });

      setPending(false);
      if (!attRes.ok) {
        const errorData = await attRes.json().catch(() => ({}));
        setVerdict(
          errorData.geofenceBasis
            ? `Server rejected: ${errorData.error ?? "Clock-in failed."} (checked against ${basisText(errorData.geofenceBasis)})`
            : null
        );
        toast.show(errorData.error ?? "Clock-in failed.", "error");
        return;
      }

      const resData = await attRes.json();
      setVerdict(
        `Server verified: ${resData.withinGeofence ? "inside" : "outside"} ${basisText(resData.geofenceBasis)}${
          typeof resData.distanceMeters === "number" ? ` · ${Math.round(resData.distanceMeters)}m from farm center` : ""
        }`
      );
      if (resData.attendance?.status === "EXCEPTION_PENDING") {
        toast.show("Shift started with Out-of-Bounds exception (sent to admin for review)", "info");
      } else {
        toast.show("Shift started successfully!", "success");
      }

      setSelfie(null);
      setSelfiePreview(null);
      setReason("");
      void load();
      onShiftChange?.();
    } catch (err: any) {
      setPending(false);
      toast.show(err.message ?? "Network error during clock-in.", "error");
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
        setVerdict(
          errorData.geofenceBasis
            ? `Server rejected: ${errorData.error ?? "Clock-out failed."} (checked against ${basisText(errorData.geofenceBasis)})`
            : null
        );
        toast.show(errorData.error ?? "Clock-out failed.", "error");
        return;
      }
      const endData = await res.json().catch(() => ({}));
      setVerdict(
        `Server verified: ${endData.withinGeofence ? "inside" : "outside"} ${basisText(endData.geofenceBasis)}`
      );
      toast.show("Shift ended successfully.", "success");
      setShowEndModal(false);
      void load();
      onShiftChange?.();
    } catch {
      setPending(false);
      toast.show("Network error during clock-out.", "error");
    }
  }

  if (initialLoading) {
    return (
      <div
        style={{
          height: 48,
          borderRadius: "var(--radius-pill)",
          background: "var(--stone)",
          marginBottom: 16,
          opacity: 0.6,
        }}
      />
    );
  }

  // 1. ACTIVE SHIFT: Sleek, compact top status bar (no bulky cards cluttering the page)
  if (attendance && !attendance.endAt) {
    const isException = attendance.status === "EXCEPTION_PENDING";

    return (
      <>
        <div
          className="officer-active-shift-bar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 12px",
            borderRadius: "9999px",
            border: isException ? "1px solid var(--amber-light)" : "1px solid var(--hairline)",
            backgroundColor: isException ? "var(--amber-light)" : "var(--canvas)",
            marginBottom: 10,
            gap: 8,
            minHeight: 36,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: "1 1 auto" }}>
            <span
              className="telemetry-live-dot"
              style={{
                width: 7,
                height: 7,
                backgroundColor: isException ? "var(--amber)" : "var(--green)",
                flexShrink: 0,
              }}
            />
            <span className="badge badge-green" style={{ fontSize: "10.5px", fontWeight: 750, letterSpacing: "0.04em" }}>
              ON DUTY
            </span>
            <span style={{ fontSize: "12px", color: "var(--ink)", fontWeight: 650, whiteSpace: "nowrap" }}>
              {isException ? "Shift (Exception)" : "Active Shift"}
            </span>
            <span className="muted" style={{ fontSize: "11.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              · {attendance.farm.name}{attendance.geofenceBasis ? ` · via ${basisText(attendance.geofenceBasis)}` : ""}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: 700,
                color: isException ? "var(--amber)" : "var(--green-dark)",
                background: isException ? "var(--amber-light)" : "var(--green-light)",
                border: isException ? "1px solid var(--amber-light)" : "1px solid var(--green-light)",
                padding: "2px 8px",
                borderRadius: "9999px",
                lineHeight: 1.2,
              }}
            >
              {elapsed || "0h 0m"}
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowEndModal(true)}
              style={{
                borderRadius: "9999px",
                padding: "3px 11px",
                fontSize: "11px",
                height: 26,
                minHeight: 26,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 600,
              }}
            >
              <Icons.LogOut size={11} />
              <span>End Shift</span>
            </button>
          </div>
        </div>

        {showEndModal && (
          <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 16, borderRadius: "var(--radius-lg)", padding: 24 }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>End Shift Confirmation</h3>
              <p className="muted" style={{ margin: 0, fontSize: "14px", lineHeight: 1.5 }}>
                End your active shift at <strong>{attendance.farm.name}</strong>? Total duration: <strong>{elapsed}</strong>.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleClockOut();
                }}
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                    Departure Selfie (Optional)
                  </label>
                  <input
                    type="file"
                    name="departureSelfie"
                    accept="image/*"
                    style={{ fontSize: "12px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEndModal(false)}
                    style={{ borderRadius: "var(--radius-pill)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={pending}
                    style={{ borderRadius: "var(--radius-pill)" }}
                  >
                    {pending ? "Ending…" : "Confirm End of Shift"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. COMPLETED SHIFT: Compact finished status pill
  if (attendance?.endAt) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 18px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--stone)",
          background: "var(--stone)",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.CheckCircle size={16} style={{ color: "var(--green)" }} />
          <span style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 600 }} suppressHydrationWarning>
            Today&apos;s Field Shift Completed at {attendance.farm.name} (Clocked out at {new Date(attendance.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setAttendance(null)}
          style={{ borderRadius: "var(--radius-pill)", padding: "4px 12px", fontSize: "11px" }}
        >
          Start New Shift
        </button>
      </div>
    );
  }

  // 3. BESPOKE PRESENCE VERIFICATION GATE (Hero Lens, Free-form Reason, Zero-Scroll, Brand Green)
  return (
    <div
      className="modal-overlay attendance-gate-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(18, 22, 19, 0.82)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="modal-content attendance-gate-card"
        style={{
          maxWidth: "380px",
          width: "100%",
          backgroundColor: "#FFFFFF",
          borderRadius: "24px",
          boxShadow: "var(--shadow-modal)",
          padding: "24px 20px 20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          border: "1px solid #FFFFFF",
          fontFamily: "var(--font-body)",
        }}
      >
        {/* Header: Eyebrow + Title + GPS Status Pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 750,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--green)",
                marginBottom: 2,
              }}
            >
              Daily Presence
            </div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 750, color: "var(--ink)", letterSpacing: "-0.02em" }}>
              Morning Clock-In
            </h3>
          </div>

          {radar ? (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 650,
                padding: "4px 10px",
                borderRadius: "9999px",
                backgroundColor: radar.isInside ? "var(--green-light)" : "var(--stone)",
                color: radar.isInside ? "var(--green-dark)" : "var(--ink)",
                border: radar.isInside ? "1px solid var(--green-light)" : "1px solid var(--stone)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: radar.isInside ? "var(--green)" : "#8E948F",
                }}
              />
              {radar.isInside
                ? "At Estate"
                : `Remote (${radar.dist >= 1000 ? `${(radar.dist / 1000).toFixed(0)}km` : `${radar.dist}m`})`}
            </span>
          ) : (
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              {gpsLoading ? "Acquiring GPS…" : "Checking GPS…"}
            </span>
          )}
        </div>

        {/* Estate Context */}
        {farms.length > 1 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "11px", fontWeight: 650, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Assigned Estate
            </label>
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              required
              style={{
                width: "100%",
                height: "36px",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--ink)",
                backgroundColor: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "0 10px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.location})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", color: "var(--muted)" }}>
            <Icons.MapPin size={13} style={{ color: "var(--green)", flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>{selectedFarm?.name || "Assigned Estate"}</span>
            {selectedFarm?.location && <span>• {selectedFarm.location}</span>}
          </div>
        )}

        <form onSubmit={handleClockIn} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Centered Hero: Circular Presence Verification Lens */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "8px 0 4px 0",
            }}
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              style={{
                width: "104px",
                height: "104px",
                borderRadius: "50%",
                position: "relative",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selfiePreview ? "var(--stone)" : "var(--green-light)",
                border: selfiePreview ? "2.5px solid var(--green)" : "2.5px dashed var(--green)",
                boxShadow: selfiePreview
                  ? "0 6px 20px rgba(36, 84, 58, 0.2)"
                  : "0 4px 14px rgba(36, 84, 58, 0.08)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {selfiePreview ? (
                <>
                  <img
                    src={selfiePreview}
                    alt="Presence selfie preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: -2,
                      bottom: -2,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: "var(--green)",
                      color: "#FFFFFF",
                      border: "2px solid #FFFFFF",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    }}
                  >
                    <Icons.Check size={16} />
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "var(--green)" }}>
                  <Icons.Camera size={30} />
                </div>
              )}
            </div>

            <div style={{ textAlign: "center" }}>
              <span
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "inline-block",
                  fontSize: "12px",
                  fontWeight: 650,
                  color: selfiePreview ? "var(--green-dark)" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {compressing
                  ? "Compressing Photo…"
                  : selfiePreview
                  ? "Photo verified • Tap circle to retake"
                  : "Tap circle to snap selfie *"}
              </span>
              {!selfiePreview && (
                <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginTop: 2 }}>
                  Front camera • Required before shift begins
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoSelect}
              style={{ display: "none" }}
            />
          </div>

          {/* Remote Check-In Reason (STRICTLY single text input, NO dropdown, NO box-in-a-box) */}
          {radar && !radar.isInside && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label style={{ fontSize: "12px", fontWeight: 650, color: "var(--ink)" }}>
                  Remote Check-In Reason <span style={{ color: "var(--green)" }}>*</span>
                </label>
                <span style={{ fontSize: "10px", color: "var(--muted)" }}>Officer verification</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Visiting fertilizer supplier, pump repair in town..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: "38px",
                  borderRadius: "10px",
                  border: "1.5px solid var(--line-strong)",
                  padding: "0 12px",
                  fontSize: "13px",
                  color: "var(--ink)",
                  backgroundColor: "#FFFFFF",
                  outline: "none",
                }}
              />
            </div>
          )}

          {gpsError && (
            <div style={{ fontSize: "11px", color: "var(--red)", textAlign: "center" }}>
              {gpsError}
            </div>
          )}

          {/* Primary Action Button: Active Camera Launcher or Shift Confirmation */}
          {!selfie ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "var(--green)",
                color: "#FFFFFF",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(36, 84, 58, 0.25)",
                letterSpacing: "-0.01em",
              }}
            >
              <Icons.Camera size={18} />
              <span>Open Camera to Take Selfie</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={Boolean(pending || compressing || !farmId || (radar && !radar.isInside && !reason.trim()))}
              style={{
                width: "100%",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "var(--green)",
                color: "#FFFFFF",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                cursor: pending ? "wait" : "pointer",
                opacity: (radar && !radar.isInside && !reason.trim()) ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(36, 84, 58, 0.25)",
                letterSpacing: "-0.01em",
              }}
            >
              {pending ? (
                <span>Starting Shift�?�</span>
              ) : (
                <>
                  <Icons.Check size={18} />
                  <span>Clock In &amp; Start Daily Shift</span>
                </>
              )}
            </button>
          )}
          {verdict && (
            <div style={{ fontSize: "11px", color: "var(--muted)", textAlign: "center", marginTop: 2 }}>
              {verdict}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
