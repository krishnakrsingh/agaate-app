"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface FarmSettingsData {
  id: string;
  name: string;
  location: string;
  address?: string | null;
  geofenceRadiusMeters: number;
  waterSource: string;
  soilType?: string | null;
}

export function FarmSettingsConsole({ farm }: { farm: FarmSettingsData }) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: farm.name,
    location: farm.location,
    address: farm.address || "",
    geofenceRadiusMeters: farm.geofenceRadiusMeters || 500,
    waterSource: farm.waterSource || "",
    soilType: farm.soilType || "",
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/farms/${farm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          address: formData.address || null,
          geofenceRadiusMeters: Number(formData.geofenceRadiusMeters),
          waterSource: formData.waterSource,
          soilType: formData.soilType || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings.");
      toast.success("Farm configuration updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-xl)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "720px",
      }}
    >
      <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
        Estate Operational Parameters
      </h3>

      <div className="two-column">
        <div className="form-group">
          <label className="form-label">Estate Name</label>
          <input
            type="text"
            className="input-field"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">General Location / Landmark</label>
          <input
            type="text"
            className="input-field"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Postal / Cadastral Address</label>
        <textarea
          className="input-field"
          rows={3}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div className="two-column">
        <div className="form-group">
          <label className="form-label">Geofence Perimeter Radius (meters)</label>
          <input
            type="number"
            min={50}
            max={5000}
            className="input-field"
            value={formData.geofenceRadiusMeters}
            onChange={(e) => setFormData({ ...formData, geofenceRadiusMeters: Number(e.target.value) })}
            required
          />
          <span style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
            Field officers clocking in outside this radius generate a verification exception.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Primary Water Source</label>
          <input
            type="text"
            className="input-field"
            value={formData.waterSource}
            onChange={(e) => setFormData({ ...formData, waterSource: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Predominant Soil Classification</label>
        <input
          type="text"
          className="input-field"
          value={formData.soilType}
          onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? "Saving Settings..." : "Save Configuration"}
        </button>
      </div>
    </form>
  );
}
