"use client";
import { FormEvent, useState } from "react";
import { Icons } from "./icons";

export function TaskCompletionForm({
  taskId,
  farmId,
  taskTitle,
  onComplete,
}: {
  taskId: string;
  farmId: string;
  taskTitle: string;
  onComplete: () => void;
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
          ...(actualPlants ? { actualPlants: Number(actualPlants) } : {})
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Task completion failed.");
      }

      formEl?.reset();
      setPhotoPreviews([]);
      onComplete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Task completion failed.");
    } finally {
      setPending(false);
    }
  }

  const bedActivity = /land|bed preparation/i.test(taskTitle);
  const plantActivity = /(transplantation|direct sowing)/i.test(taskTitle);

  return (
    <form
      className="form"
      onSubmit={submit}
      style={{
        marginTop: 16,
        padding: 18,
        background: "var(--slate-50)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Icons.CheckCircle size={18} style={{ color: "var(--primary-600)" }} />
        <h4 style={{ margin: 0, fontSize: "1.05rem" }}>Record Execution Details</h4>
      </div>

      <div className="form-group">
        <label>Completion Remarks & Notes</label>
        <textarea
          name="remarks"
          maxLength={2000}
          placeholder="e.g., Fertigation completed at 3.5 bar pressure as per agronomy schedule"
          rows={2}
        />
      </div>

      {bedActivity && (
        <div className="form-group">
          <label>Actual Beds Created (BRD §9)</label>
          <input
            name="actualBedsCreated"
            type="number"
            min="0"
            step="1"
            placeholder="Count of finished beds"
            required
          />
        </div>
      )}

      {plantActivity && (
        <div className="form-group">
          <label>Approximate Actual Plants (BRD §11)</label>
          <input
            name="actualPlants"
            type="number"
            min="0"
            step="1"
            placeholder="Total count of transplanted seedlings / sown seeds"
            required
          />
        </div>
      )}

      {/* Materials Used */}
      <fieldset>
        <legend style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icons.Layers size={14} />
          <span>Material Utilization (BRD §29 - Optional)</span>
        </legend>
        <div className="three-column">
          <div className="form-group">
            <label>Material Name</label>
            <input name="materialName" placeholder="e.g., NPK 19:19:19, Neem Oil" />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input name="quantity" type="number" min="0.01" step="0.01" placeholder="e.g., 5" />
          </div>
          <div className="form-group">
            <label>Unit</label>
            <input name="unit" placeholder="kg, L, bags, grams" />
          </div>
        </div>
      </fieldset>

      {/* Labour Tracking */}
      <fieldset>
        <legend style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icons.Users size={14} />
          <span>Labour Tracking (BRD §28 - Optional)</span>
        </legend>
        <div className="two-column">
          <div className="form-group">
            <label>Number of Labourers</label>
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
          <div className="form-group">
            <label>Hours Worked per Person</label>
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
          <div className="hint" style={{ padding: "6px 12px", fontSize: "0.8rem", margin: "4px 0" }}>
            <Icons.CheckCircle size={14} />
            <span>Total Labour Utilization: <strong>{calculatedLabourHours} Man-Hours</strong></span>
          </div>
        )}
      </fieldset>

      {/* Evidence Photos */}
      <div className="form-group">
        <label>Photo Evidence (Upload completed work photos)</label>
        <input
          name="evidence"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
        />

        {photoPreviews.length > 0 && (
          <div className="upload-previews">
            {photoPreviews.map((src, i) => (
              <div className="upload-preview-item" key={i}>
                <img src={src} alt="Evidence preview" />
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending}
        style={{ width: "100%", padding: "12px 20px" }}
      >
        <Icons.Check size={16} />
        <span>{pending ? "Uploading evidence & completing…" : "Complete Activity"}</span>
      </button>
    </form>
  );
}
