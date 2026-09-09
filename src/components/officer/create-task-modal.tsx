"use client";
import { useState, useEffect, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { PhotoUploadZone, PhotoItem, uploadEvidencePhotos } from "@/components/photo-upload-zone";

type Plot = { id: string; name: string; cropCycles?: { id: string; cropName: string }[] };
type Farm = { id: string; name: string; plots?: Plot[] };

const PRESETS = [
  {
    label: "💧 Drip / Pipe Leak",
    title: "Repair broken drip lateral / pipe leak",
    category: "IRRIGATION_RECOMMENDATION",
    priority: "URGENT" as const,
    instructions: "Locate crack, splice line with joiner/coupler, test pressure flush.",
  },
  {
    label: "🐛 Pest / Fungus Spot",
    title: "Urgent pest / disease spot treatment",
    category: "PREVENTIVE_SPRAY",
    priority: "HIGH" as const,
    instructions: "Scout surrounding rows, apply spot knapsack spray, take photo evidence.",
  },
  {
    label: "⚡ Pump / Power Failure",
    title: "Pump motor / starter trip repair",
    category: "CULTURAL_PRACTICE",
    priority: "URGENT" as const,
    instructions: "Check electrical phase voltages, clean intake filter, restart cycle.",
  },
  {
    label: "🌿 Emergency Weeding",
    title: "Clear weed choke along irrigation line",
    category: "CULTURAL_PRACTICE",
    priority: "MEDIUM" as const,
    instructions: "Hand-weed around root zone, ensure emitters are unblocked.",
  },
  {
    label: "🪵 Trellis / Stake Breakdown",
    title: "Repair collapsed trellis / plant support",
    category: "CULTURAL_PRACTICE",
    priority: "HIGH" as const,
    instructions: "Re-tie support wires, stake drooping branches, prevent fruit ground contact.",
  },
  {
    label: "🚜 Equipment Breakdown",
    title: "Field implement / machinery maintenance",
    category: "CULTURAL_PRACTICE",
    priority: "HIGH" as const,
    instructions: "Inspect fault, source spare parts, test before redeployment.",
  },
  {
    label: "📦 Unscheduled Harvest",
    title: "Emergency fruit drop pickup / harvest",
    category: "CROP_SPECIFIC",
    priority: "HIGH" as const,
    instructions: "Collect fallen/ripe produce to prevent pest attraction and spoilage.",
  },
  {
    label: "📝 Custom Field Job",
    title: "",
    category: "CROP_SPECIFIC",
    priority: "MEDIUM" as const,
    instructions: "",
  },
];

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [cropCycleId, setCropCycleId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("IRRIGATION_RECOMMENDATION");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("HIGH");
  const [instructions, setInstructions] = useState("");
  const [startImmediately, setStartImmediately] = useState(true);
  const [pending, setPending] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [activeFarmData, setActiveFarmData] = useState<Farm | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setFarms(data);
        if (data.length > 0 && !farmId) {
          setFarmId(data[0].id);
        }
      });
  }, [isOpen, farmId]);

  useEffect(() => {
    if (!farmId) {
      setActiveFarmData(null);
      return;
    }
    fetch(`/api/farms/${farmId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => {
        setActiveFarmData(f);
        if (f?.plots?.length > 0) {
          setPlotId(f.plots[0].id);
          if (f.plots[0].cropCycles?.length > 0) {
            setCropCycleId(f.plots[0].cropCycles[0].id);
          } else {
            setCropCycleId("");
          }
        } else {
          setPlotId("");
          setCropCycleId("");
        }
      });
  }, [farmId]);

  const activePlot = activeFarmData?.plots?.find((p) => p.id === plotId);
  const availableCrops = activePlot?.cropCycles || [];

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setPriority(preset.priority);
    if (preset.instructions) {
      setInstructions(preset.instructions);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!farmId) {
      toast.show("Please select a farm estate.", "error");
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      toast.show("Please enter a task title (min 3 characters).", "error");
      return;
    }

    setPending(true);
    setUploadProgress(null);
    try {
      let mediaIds: string[] = [];
      if (photos.length > 0) {
        setUploadProgress(`Securing ${photos.length} photo(s)…`);
        mediaIds = await uploadEvidencePhotos(
          farmId,
          "ACTIVITY_EVIDENCE",
          photos,
          (idx, total) => setUploadProgress(`Uploading photo ${idx} of ${total}…`)
        );
      }
      setUploadProgress("Creating field task…");

      const res = await fetch("/api/officer/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          plotId: plotId || null,
          cropCycleId: cropCycleId || null,
          category,
          title: title.trim(),
          instructions: instructions.trim() || null,
          priority,
          startImmediately,
          mediaIds,
        }),
      });

      setPending(false);
      setUploadProgress(null);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.show(err.error || "Failed to create field task.", "error");
        return;
      }

      toast.show(
        startImmediately
          ? "Task created & started in progress!"
          : "Field task added to operations queue!",
        "success"
      );
      setTitle("");
      setInstructions("");
      setPhotos([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setPending(false);
      setUploadProgress(null);
      toast.show(err?.message || "Network error while creating task.", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "540px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          backgroundColor: "var(--canvas)",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--green)" }}>
              <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
              <span>AD-HOC FIELD OPERATION</span>
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 700, color: "var(--ink)" }}>
              + Add Field Task / Fix
            </h3>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
              Quickly dispatch unscheduled maintenance, leak repairs, or edge-case jobs into today&apos;s queue.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--stone)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              fontSize: "18px",
              color: "var(--ink-soft)",
            }}
          >
            &times;
          </button>
        </div>

        {/* 1-Tap Quick Preset Chips */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
            QUICK PRESETS (TAP TO AUTO-FILL)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="select-chip select-chip-pill"
                data-selected={title === p.title && !!p.title}
                style={{ fontSize: "12px", padding: "5px 12px" }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Farm & Plot Pickers */}
          <div className="two-column" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: "12px", fontWeight: 600 }}>Farm Estate *</label>
              <select value={farmId} onChange={(e) => setFarmId(e.target.value)} required style={{ fontSize: "13px" }}>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: "12px", fontWeight: 600 }}>Plot Zone (Optional)</label>
              <select value={plotId} onChange={(e) => setPlotId(e.target.value)} style={{ fontSize: "13px" }}>
                <option value="">-- General Estate / All --</option>
                {activeFarmData?.plots?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {availableCrops.length > 0 && plotId && (
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: "12px", fontWeight: 600 }}>Crop Cycle (Optional)</label>
              <select value={cropCycleId} onChange={(e) => setCropCycleId(e.target.value)} style={{ fontSize: "13px" }}>
                <option value="">-- No specific cycle --</option>
                {availableCrops.map((c) => (
                  <option key={c.id} value={c.id}>
                    🌱 {c.cropName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title Input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px", fontWeight: 600 }}>Operation Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Replace damaged drip sub-main valve in Block 3"
              required
              minLength={3}
              maxLength={200}
              className="input-field"
              style={{ fontSize: "13px" }}
            />
          </div>

          {/* Priority Pills (Brand Colors Only) */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 650, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
              Priority Level
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => {
                const tone = p === "URGENT" ? "red" : p === "HIGH" ? "amber" : p === "MEDIUM" ? undefined : "neutral";
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="select-chip"
                    data-selected={priority === p}
                    data-tone={tone}
                    style={{ flex: 1, padding: "7px 0", borderRadius: "8px", fontSize: "12px" }}
                  >
                    {p === "URGENT" ? "⚡ URGENT" : p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instructions / Guidance */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px", fontWeight: 600 }}>Field Instructions / Remarks (Optional)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Provide context, required tools, parts needed, or special precautions…"
              rows={2}
              className="input-field"
              style={{ fontSize: "13px", resize: "vertical" }}
            />
          </div>

          {/* Visual Photo Evidence (Camera Capture / Gallery) */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>
              Field Photo Evidence / Job Reference (Optional)
            </label>
            <PhotoUploadZone
              farmId={farmId}
              kind="ACTIVITY_EVIDENCE"
              maxPhotos={4}
              onPhotosChange={setPhotos}
              isUploading={pending}
            />
            {uploadProgress && (
              <div style={{ fontSize: "12px", color: "var(--green-dark)", marginTop: 6, fontWeight: 600 }}>
                ⏳ {uploadProgress}
              </div>
            )}
          </div>

          {/* Start Immediately Toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "var(--stone)",
              border: "1px solid var(--stone)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={startImmediately}
              onChange={(e) => setStartImmediately(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--green)" }}
            />
            <div>
              <strong style={{ fontSize: "13px", color: "var(--ink)", display: "block" }}>
                Start Activity Immediately
              </strong>
              <span className="muted" style={{ fontSize: "12px" }}>
                Marks task as &quot;In Progress&quot; right away so you can complete it with evidence when done.
              </span>
            </div>
          </label>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ borderRadius: "var(--radius-pill)", padding: "10px 20px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-green"
              disabled={pending || !farmId || !title.trim()}
              style={{ borderRadius: "var(--radius-pill)", padding: "10px 24px", fontWeight: 700 }}
            >
              {pending ? "Adding Task…" : "+ Add to Today's Queue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
