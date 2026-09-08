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

    if (radar && !radar.isInside && (!reason || reason.trim().length < 5)) {
      toast.show("Please provide a reason (min 5 chars) for out-of-bounds clock-in.", "error");
      return;
    }

    setPending(true);
    try {
      const loc = coords ?? (await getGPS());

      // 1. Presign upload URL for selfie
      const mimeType = selfie.type || "image/jpeg";
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
        throw new Error(err.error || "Failed to prepare photo upload.");
      }
      const { uploadUrl, mediaId } = await presignRes.json();

      // 2. Upload photo to S3
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        body: selfie,
        headers: { "Content-Type": mimeType },
      });
      if (!s3Res.ok) throw new Error("Could not upload presence photo.");

      // 3. Complete and verify upload
      const completeRes = await fetch(`/api/uploads/${mediaId}/complete`, { method: "POST" });
      if (!completeRes.ok) throw new Error("Could not verify photo upload.");

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
        toast.show(errorData.error ?? "Clock-in failed.", "error");
        return;
      }

      const resData = await attRes.json();
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
        toast.show(errorData.error ?? "Clock-out failed.", "error");
        return;
      }
      toast.show("Shift ended successfully.", "success");
      setShowEndModal(false);
      void load();
      onShiftChange?.();
    } catch {
      setPending(false);
      toast.show("Network error during clock-out.", "error");
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
          border: isException ? "1px solid var(--amber)" : "1px solid var(--green)",
          background: "var(--card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
                  {isException ? "Shift Active • Out-of-Bounds" : "Shift Active • On Duty"}
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
                    ⚠ Awaiting Farm Admin authorization
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowEndModal(true)}
            style={{ borderRadius: "var(--radius-pill)", padding: "8px 20px" }}
          >
            <Icons.LogOut size={15} />
            <span>Clock Out / End Shift</span>
          </button>
        </div>

        {showEndModal && (
          <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 16, borderRadius: "var(--radius-lg)", padding: 24 }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Clock Out Confirmation</h3>
              <p className="muted" style={{ margin: 0, fontSize: "14px", lineHeight: 1.5 }}>
                End your active shift at <strong>{attendance.farm.name}</strong>? Total duration: <strong>{elapsed}</strong>.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEndModal(false)}
                  style={{ borderRadius: "var(--radius-pill)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleClockOut}
                  disabled={pending}
                  style={{ borderRadius: "var(--radius-pill)" }}
                >
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
            <strong style={{ color: "var(--ink)", fontSize: "15px" }}>
              Shift Completed Today &bull; {attendance.farm.name}
            </strong>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "13px" }}>
              Clocked out at {new Date(attendance.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
            </p>
          </div>
          <span className="badge badge-green">SHIFT FINISHED</span>
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
            Capture a photo and verify your estate geofence coordinates to begin field operations.
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
              <label style={{ margin: 0 }}>GPS Geofence Status</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void getGPS()}
                disabled={gpsLoading}
                style={{ fontSize: "11px", padding: "4px 8px" }}
              >
                <Icons.MapPin size={12} />
                <span>{gpsLoading ? "Acquiring…" : "Refresh GPS"}</span>
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
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              {radar ? (
                <span style={{ color: radar.isInside ? "var(--green)" : "var(--red)", fontWeight: 650 }}>
                  {radar.isInside
                    ? `✓ Within boundary (${radar.dist}m / ${radar.radius}m radius)`
                    : `⚠ Outside fence (${radar.dist >= 1000 ? `${(radar.dist / 1000).toFixed(1)}km` : `${radar.dist}m`} / ${radar.radius}m radius)`}
                </span>
              ) : (
                <span className="muted">{gpsLoading ? "Acquiring GPS fix…" : "Awaiting location…"}</span>
              )}
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
              <span>
                Out-of-Bounds Location Flagged ({radar.dist >= 1000 ? `${(radar.dist / 1000).toFixed(1)}km` : `${radar.dist}m`} from {selectedFarm?.name || "estate"})
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink)", lineHeight: 1.45 }}>
              You are currently outside the {radar.radius}m estate geofence. Please provide a reason below. This shift will be logged as <strong>EXCEPTION PENDING</strong> for owner review.
            </p>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
                Reason for Out-of-Bounds Clock In <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Attending machinery vendor / road diversion"
                required
                minLength={5}
                style={{ width: "100%", background: "var(--canvas)", borderColor: "var(--amber)" }}
              />
            </div>
          </div>
        )}

        {/* Native Mobile Camera Capture */}
        <div style={{ background: "var(--stone)", padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {selfiePreview ? (
              <img
                src={selfiePreview}
                alt="Selfie preview"
                style={{ width: 52, height: 52, borderRadius: "var(--radius-sm)", objectFit: "cover", border: "2px solid var(--green)" }}
              />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: "var(--radius-sm)", background: "var(--canvas)", display: "grid", placeItems: "center", border: "1px dashed var(--line)" }}>
                <Icons.Camera size={22} color="var(--muted)" />
              </div>
            )}
            <div>
              <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                {selfie ? "✓ Photo Attached" : "Presence Photo Required"}
              </strong>
              <div className="muted" style={{ fontSize: "12px", marginTop: 2 }}>
                {compressing ? "Compressing image…" : selfie ? `${Math.round(selfie.size / 1024)} KB compressed` : "Take a quick photo to verify attendance"}
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handlePhotoSelect}
            style={{ display: "none" }}
          />

          <button
            type="button"
            className={`btn ${selfie ? "btn-secondary" : "btn-green"}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={compressing}
            style={{ borderRadius: "var(--radius-pill)", padding: "8px 18px" }}
          >
            <Icons.Camera size={15} />
            <span>{selfie ? "Change Photo" : "Take Photo"}</span>
          </button>
        </div>

        {gpsError && (
          <div className="error" role="alert" style={{ fontSize: "12px" }}>
            <Icons.AlertCircle size={15} />
            <span>{gpsError}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-green btn-lg"
          disabled={pending || !farmId || !selfie || compressing}
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
