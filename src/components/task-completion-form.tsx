"use client";
/* eslint-disable @next/next/no-img-element */
import { FormEvent, useState } from "react";
import { Icons } from "./icons";

export function TaskCompletionForm({
  taskId,
  farmId,
  taskTitle,
  milestoneName,
  onComplete,
  onCancel,
}: {
  taskId: string;
  farmId: string;
  taskTitle: string;
  milestoneName?: string | null;
  onComplete: () => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
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
      for (const file of form.getAll("evidence")) {
        if (!(file instanceof File) || !file.size) continue;
        const signed = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farmId,
            kind: "ACTIVITY_EVIDENCE",
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        });

        if (!signed.ok) {
          const body = await signed.json().catch(() => ({}));
          throw new Error(body.error ?? "Unable to prepare evidence upload.");
        }

        const upload = await signed.json();
        const stored = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!stored.ok) throw new Error("Evidence photo upload failed.");

        const confirmed = await fetch(`/api/uploads/${upload.mediaId}/complete`, { method: "POST" });
        if (!confirmed.ok) {
          const body = await confirmed.json().catch(() => ({}));
          throw new Error(body.error ?? "Evidence upload could not be verified.");
        }
        mediaIds.push(upload.mediaId);
      }

      const materialName = String(form.get("materialName") || "").trim();
      const actualBedsCreated = form.get("actualBedsCreated");
      const actualPlants = form.get("actualPlants");

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
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Completion recording failed.");
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
        border: "1px solid var(--line)",
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
      <div style={{ backgroundColor: "var(--canvas)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", padding: 14, display: "grid", gap: 10 }}>
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

      {/* Labour Tracking */}
      <div style={{ backgroundColor: "var(--canvas)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", padding: 14, display: "grid", gap: 10 }}>
        <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icons.Users size={13} color="var(--green)" />
          <span>Labour Tracking (Optional)</span>
        </div>
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px" }}>Number of Labourers</label>
            <input
              name="labourers"
              type="number"
              min="1"
              step="1"
              value={labourers}
              onChange={(e) => setLabourers(e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g., 4"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px" }}>Hours Worked per Person</label>
            <input
              name="hours"
              type="number"
              min="0.1"
              max="24"
              step="0.1"
              value={hours}
              onChange={(e) => setHours(e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g., 5.5"
            />
          </div>
        </div>

        {calculatedLabourHours && (
          <div className="data" style={{ fontSize: "12px", color: "var(--green)", fontWeight: 550 }}>
            Total Labour Utilization: {calculatedLabourHours} Man-Hours
          </div>
        )}
      </div>

      {/* Evidence Photos */}
      <div className="form-group" style={{ margin: 0 }}>
        <label>Photo Evidence (Optional)</label>
        <input
          type="file"
          name="evidence"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handlePhotoChange}
        />
        {photoPreviews.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {photoPreviews.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Evidence preview ${i + 1}`}
                style={{ width: 56, height: 56, borderRadius: "var(--radius-xs)", objectFit: "cover", border: "1px solid var(--line)" }}
              />
            ))}
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}

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
          {pending ? "Saving Evidence…" : "Confirm Activity Completion"}
        </button>
      </div>
    </form>
  );
}
