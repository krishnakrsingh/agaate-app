"use client";
/* eslint-disable @next/next/no-img-element */
import { FormEvent, useState } from "react";
import { Icons } from "./icons";
import { compressImage } from "@/lib/image-compress";

function basisText(basis?: string | null) {
  if (basis === "PLOT_POLYGON") return "plot fence";
  if (basis === "FARM_POLYGON") return "farm fence";
  if (basis === "RADIUS") return "radius fallback (no fence drawn)";
  return "location check";
}

/** One-shot GPS for completion evidence. Rejects when unavailable — caller proceeds without GPS. */
function captureCompletionGps(): Promise<{ latitude: number; longitude: number; accuracyMeters: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!Number.isFinite(p.coords.latitude) || !Number.isFinite(p.coords.longitude)) {
          reject(new Error("Location unavailable."));
          return;
        }
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracyMeters: typeof p.coords.accuracy === "number" ? p.coords.accuracy : 999,
        });
      },
      (err) =>
        reject(
          new Error(
            err.code === 1
              ? "Location permission was denied."
              : err.code === 3
                ? "Location timed out."
                : "Location is unavailable."
          )
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function TaskCompletionForm({
  taskId,
  farmId,
  taskTitle,
  milestoneName,
  plotId,
  plotName,
  onComplete,
  onCancel,
}: {
  taskId: string;
  farmId: string;
  taskTitle: string;
  milestoneName?: string | null;
  plotId?: string | null;
  plotName?: string | null;
  onComplete: () => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [gpsNote, setGpsNote] = useState("");
  const [verdict, setVerdict] = useState<string | null>(null);
  const [labourers, setLabourers] = useState<number | "">("");
  const [hours, setHours] = useState<number | "">("");
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const calculatedLabourHours =
    labourers && hours ? (Number(labourers) * Number(hours)).toFixed(1) : null;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    try {
      const mediaIds: string[] = [];
      for (const rawFile of form.getAll("evidence")) {
        if (!(rawFile instanceof File) || !rawFile.size) continue;
        const file = await compressImage(rawFile);
        try {
          const signed = await fetch("/api/uploads/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              farmId,
              kind: "ACTIVITY_EVIDENCE",
              mimeType: file.type || "image/jpeg",
              sizeBytes: file.size,
            }),
          });

          if (!signed.ok) throw new Error("Presign failed");
          const upload = await signed.json();
          const stored = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "image/jpeg" },
            body: file,
          });

          if (!stored.ok) throw new Error("Evidence photo upload failed.");

          const confirmed = await fetch(`/api/uploads/${upload.mediaId}/complete`, { method: "POST" });
          if (!confirmed.ok) throw new Error("Verification failed");
          mediaIds.push(upload.mediaId);
        } catch {
          // Direct server upload fallback
          const directData = new FormData();
          directData.append("file", file);
          directData.append("farmId", farmId);
          directData.append("kind", "ACTIVITY_EVIDENCE");
          const directRes = await fetch("/api/uploads/direct", {
            method: "POST",
            body: directData,
          });
          if (directRes.ok) {
            const { mediaId } = await directRes.json();
            mediaIds.push(mediaId);
          }
        }
      }

      const materialName = String(form.get("materialName") || "").trim();
      const actualBedsCreated = form.get("actualBedsCreated");
      const actualPlants = form.get("actualPlants");

      // Best-effort completion GPS: when the task names a plot, the server
      // verifies presence inside it. GPS failure never blocks completion —
      // the server only gates when coordinates arrive.
      let gps: { latitude: number; longitude: number; accuracyMeters: number } | null = null;
      try {
        gps = await captureCompletionGps();
        setGpsNote(`GPS ±${Math.round(gps.accuracyMeters)}m attached.`);
      } catch {
        setGpsNote(plotId ? "No GPS fix — completing without location proof." : "");
      }

      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remarks: form.get("remarks") || null,
          mediaIds,
          materials: materialName
            ? [
                {
                  materialName,
                  quantity: Number(form.get("quantity")),
                  unit: form.get("unit"),
                },
              ]
            : [],
          labour: labourers && hours ? [{ labourers: Number(labourers), hours: Number(hours) }] : [],
          ...(actualBedsCreated ? { actualBedsCreated: Number(actualBedsCreated) } : {}),
          ...(actualPlants ? { actualPlants: Number(actualPlants) } : {}),
          ...(gps ? { latitude: gps.latitude, longitude: gps.longitude, accuracyMeters: gps.accuracyMeters } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (body.geofenceBasis) {
          setVerdict(`Server: outside ${basisText(body.geofenceBasis)} — ${body.error ?? "rejected"}`);
        }
        throw new Error(body.error ?? "Completion recording failed.");
      }

      const done = await response.json().catch(() => ({}));
      if (done.geofenceBasis) {
        setVerdict(`Server verified inside ${basisText(done.geofenceBasis)}.`);
      }

      onComplete();
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Unable to complete task.");
    }
  }

  // Structured domain check: use milestone name instead of title regex
  const bedActivity = milestoneName === "Land Preparation";
  const plantActivity = milestoneName === "Transplantation" || milestoneName === "Direct Sowing";

  return (
    <form
      onSubmit={submit}
      style={{
        marginTop: 14,
        padding: 20,
        backgroundColor: "var(--stone)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--stone)",
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.CheckCircle size={16} style={{ color: "var(--green)" }} />
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Record Activity Completion</h4>
        </div>
        {onCancel && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            style={{ padding: "2px 6px", minHeight: "auto" }}
          >
            <Icons.X size={14} />
          </button>
        )}
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Completion Remarks &amp; Field Notes</label>
        <textarea
          name="remarks"
          maxLength={2000}
          placeholder="e.g., Fertigation completed at 3.5 bar pressure as per agronomy schedule"
          rows={2}
        />
      </div>

      {bedActivity && (
        <div className="form-group" style={{ margin: 0 }}>
          <label>Actual Beds Created (BRD §9)</label>
          <input
            name="actualBedsCreated"
            type="number"
            min="0"
            step="1"
            placeholder="Count of finished beds (leave blank if not applicable)"
          />
        </div>
      )}

      {plantActivity && (
        <div className="form-group" style={{ margin: 0 }}>
          <label>Approximate Actual Plants (BRD §11)</label>
          <input
            name="actualPlants"
            type="number"
            min="0"
            step="1"
            placeholder="Total count of transplanted seedlings / sown seeds"
          />
        </div>
      )}

      {/* Materials Used */}
      <div style={{ backgroundColor: "var(--canvas)", border: "1px solid var(--canvas)", borderRadius: "var(--radius-xs)", padding: 14, display: "grid", gap: 10 }}>
        <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icons.Layers size={13} color="var(--green)" />
          <span>Material Utilization (Optional)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))", gap: 10 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px" }}>Material Name</label>
            <input name="materialName" placeholder="e.g., NPK 19:19:19" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px" }}>Quantity</label>
            <input name="quantity" type="number" min="0.01" step="0.01" placeholder="5" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px" }}>Unit</label>
            <input name="unit" placeholder="kg, L, bags" />
          </div>
        </div>
      </div>

      {/* Labour Tracking with Tactile Steppers */}
      <div style={{ backgroundColor: "var(--canvas)", border: "1px solid var(--canvas)", borderRadius: "var(--radius-sm)", padding: 14, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icons.Users size={14} style={{ color: "var(--green)" }} />
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>Labour Tracking (Optional)</span>
          </div>
          {calculatedLabourHours && (
            <span className="badge badge-green" style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
              {calculatedLabourHours} Man-Hours
            </span>
          )}
        </div>

        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px", fontWeight: 650 }}>Number of Labourers</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setLabourers(Math.max(1, (Number(labourers) || 1) - 1))}
                style={{ width: 36, height: 36, padding: 0, fontSize: "18px", fontWeight: 700 }}
              >
                &minus;
              </button>
              <input
                name="labourers"
                type="number"
                min="1"
                step="1"
                value={labourers}
                onChange={(e) => setLabourers(e.target.value ? Number(e.target.value) : "")}
                placeholder="0"
                className="input-field"
                style={{ textAlign: "center", fontWeight: 700, fontSize: "15px", height: 36 }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setLabourers((Number(labourers) || 0) + 1)}
                style={{ width: 36, height: 36, padding: 0, fontSize: "18px", fontWeight: 700 }}
              >
                +
              </button>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {[2, 4, 8, 12].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLabourers(preset)}
                  className="select-chip"
                  data-selected={labourers === preset}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px", fontWeight: 650 }}>Hours Worked per Person</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setHours(Math.max(0.5, (Number(hours) || 1) - 0.5))}
                style={{ width: 36, height: 36, padding: 0, fontSize: "18px", fontWeight: 700 }}
              >
                &minus;
              </button>
              <input
                name="hours"
                type="number"
                min="0.1"
                max="24"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value ? Number(e.target.value) : "")}
                placeholder="0"
                className="input-field"
                style={{ textAlign: "center", fontWeight: 700, fontSize: "15px", height: 36 }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setHours((Number(hours) || 0) + 0.5)}
                style={{ width: 36, height: 36, padding: 0, fontSize: "18px", fontWeight: 700 }}
              >
                +
              </button>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {[1, 2, 4, 8].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHours(preset)}
                  className="select-chip"
                  data-selected={hours === preset}
                >
                  {preset}h
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Photos */}
      <div className="form-group" style={{ margin: 0 }}>
        <label style={{ fontSize: "12px", fontWeight: 650 }}>Photo Evidence (Field Rear Camera)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label
            className="btn btn-secondary btn-sm"
            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, padding: "8px 14px" }}
          >
            <Icons.Camera size={16} style={{ color: "var(--green)" }} />
            <span>Snap Field Photo</span>
            <input
              type="file"
              name="evidence"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
          </label>
          <span className="muted" style={{ fontSize: "12px" }}>
            {photoPreviews.length ? `${photoPreviews.length} photo(s) attached` : "Snaps upload directly to agronomy audit trail"}
          </span>
        </div>
        {photoPreviews.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {photoPreviews.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Evidence preview ${i + 1}`}
                style={{ width: 64, height: 64, borderRadius: "var(--radius-xs)", objectFit: "cover", border: "2px solid var(--green)" }}
              />
            ))}
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {gpsNote && !error && <div style={{ fontSize: "12px", color: "var(--muted)" }}>{gpsNote}</div>}
      {verdict && <div style={{ fontSize: "12px", color: "var(--muted)" }}>{verdict}</div>}
      {plotName && (
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
          Completing inside {plotName} — server verifies presence on submit.
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        {onCancel && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn-green btn-sm"
          disabled={pending}
        >
          {pending ? "Saving Evidence…" : "Complete Activity"}
        </button>
      </div>
    </form>
  );
}
