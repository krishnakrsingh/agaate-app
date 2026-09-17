"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

const ACRES_PER_HECTARE = 2.47105;

export interface EditableFarm {
  id: string;
  name: string;
  ownerName: string;
  location: string;
  address: string | null;
  village: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  localConnect: string | null;
  surveyNumber: string | null;
  waterSource: string;
  totalArea: string;
  cultivableArea: string;
  geofenceRadiusMeters: number;
  latitude: string;
  longitude: string;
}

function F({
  label,
  span,
  children,
}: {
  label: string;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="form-group" style={{ margin: 0, gridColumn: span ? "1 / -1" : undefined }}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function FarmEditPageForm({
  farm,
  returnTo,
}: {
  farm: EditableFarm;
  returnTo?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const back = returnTo ?? `/hq/farms/${farm.id}`;

  const [form, setForm] = useState({
    name: farm.name,
    ownerName: farm.ownerName,
    location: farm.location,
    address: farm.address ?? "",
    village: farm.village ?? "",
    city: farm.city ?? "",
    state: farm.state ?? "",
    pincode: farm.pincode ?? "",
    localConnect: farm.localConnect ?? "",
    surveyNumber: farm.surveyNumber ?? "",
    waterSource: farm.waterSource,
    totalArea: farm.totalArea,
    cultivableArea: farm.cultivableArea,
    areaUnit: "ACRES" as "ACRES" | "HECTARES",
    geofenceRadiusMeters: String(farm.geofenceRadiusMeters),
    latitude: farm.latitude,
    longitude: farm.longitude,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  function captureGps() {
    if (!navigator.geolocation) {
      setError("This device cannot provide geolocation. Enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(7));
        set("longitude", pos.coords.longitude.toFixed(7));
        setError("");
      },
      () => setError("Location is unavailable or permission was denied. Enter coordinates manually."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const factor = form.areaUnit === "HECTARES" ? ACRES_PER_HECTARE : 1;
    const totalArea = Number(form.totalArea) * factor;
    const cultivableArea = Number(form.cultivableArea) * factor;
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!form.name.trim() || form.name.trim().length < 2) return setError("Farm name is required.");
    if (!form.location.trim() || form.location.trim().length < 2) return setError("Farm location is required.");
    if (!form.waterSource.trim() || form.waterSource.trim().length < 2) return setError("Primary water source is required.");
    if (!Number.isFinite(totalArea) || totalArea <= 0) return setError("Enter a valid total area.");
    if (!Number.isFinite(cultivableArea) || cultivableArea <= 0) return setError("Enter a valid cultivable area.");
    if (cultivableArea > totalArea) return setError("Cultivable area cannot exceed the total area.");
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return setError("Enter a valid latitude (-90 to 90).");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return setError("Enter a valid longitude (-180 to 180).");

    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/farms/${farm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          ownerName: form.ownerName.trim() || undefined,
          location: form.location.trim(),
          address: form.address.trim() || null,
          village: form.village.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          pincode: form.pincode.trim() || null,
          localConnect: form.localConnect.trim() || null,
          surveyNumber: form.surveyNumber.trim() || null,
          waterSource: form.waterSource.trim(),
          totalArea,
          cultivableArea,
          geofenceRadiusMeters: Number(form.geofenceRadiusMeters || 500),
          latitude,
          longitude,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Unable to save farm changes.");

      toast.success("Farm details updated.");
      router.push(back);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save farm changes.");
      setPending(false);
    }
  }

  return (
    <article className="compact-card" style={{ padding: 24, gap: 18 }}>
      <div className="page-header" style={{ paddingBottom: 12 }}>
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>EDIT FARM</span>
          </div>
          <h2 className="section-title">Edit Farm: {farm.name}</h2>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Existing values are pre-filled. Changes apply to this farm only.
          </p>
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <section className="section-block">
          <div className="form-section-title">1. Estate Details</div>
          <div className="two-column" style={{ marginTop: 12 }}>
            <F label="Farm Name">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
            </F>
            <F label="Local Connect">
              <input value={form.localConnect} onChange={(e) => set("localConnect", e.target.value)} maxLength={120} />
            </F>
            <F label="Farm Location">
              <input value={form.location} onChange={(e) => set("location", e.target.value)} maxLength={180} required />
            </F>
            <F label="Owner / Client Name">
              <input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} maxLength={120} />
            </F>
            <F label="Address / Landmark" span>
              <input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={500} />
            </F>
            <F label="Survey / Khasra No.">
              <input value={form.surveyNumber} onChange={(e) => set("surveyNumber", e.target.value)} maxLength={60} />
            </F>
            <F label="Primary Water Source">
              <input value={form.waterSource} onChange={(e) => set("waterSource", e.target.value)} maxLength={180} required />
            </F>
          </div>
        </section>

        <section className="section-block">
          <div className="form-section-title">2. Location &amp; Address</div>
          <div className="two-column" style={{ marginTop: 12 }}>
            <F label="Village">
              <input value={form.village} onChange={(e) => set("village", e.target.value)} maxLength={120} />
            </F>
            <F label="City">
              <input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={120} />
            </F>
            <F label="State">
              <input value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={120} />
            </F>
            <F label="PIN Code">
              <input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} maxLength={12} inputMode="numeric" />
            </F>
          </div>
        </section>

        <section className="section-block">
          <div className="form-section-title">3. Area &amp; Geodata</div>
          <div className="two-column" style={{ marginTop: 12 }}>
            <F label="Area Unit">
              <select value={form.areaUnit} onChange={(e) => set("areaUnit", e.target.value)}>
                <option value="ACRES">Acres</option>
                <option value="HECTARES">Hectares</option>
              </select>
            </F>
            <div />
            <F label={`Total Area (${form.areaUnit === "HECTARES" ? "ha" : "ac"})`}>
              <input type="number" min="0.01" step="0.01" value={form.totalArea} onChange={(e) => set("totalArea", e.target.value)} required />
            </F>
            <F label={`Cultivable Area (${form.areaUnit === "HECTARES" ? "ha" : "ac"})`}>
              <input type="number" min="0.01" step="0.01" value={form.cultivableArea} onChange={(e) => set("cultivableArea", e.target.value)} required />
            </F>
            <F label="Latitude">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} required style={{ flex: 1 }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={captureGps}>
                  GPS
                </button>
              </div>
            </F>
            <F label="Longitude">
              <input type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} required />
            </F>
            <F label="Geofence Radius (meters)">
              <input type="number" min="50" max="10000" value={form.geofenceRadiusMeters} onChange={(e) => set("geofenceRadiusMeters", e.target.value)} />
            </F>
          </div>
        </section>

        {error && (
          <div className="error" role="alert">
            <Icons.AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.push(back)} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <Icons.Check size={14} />
            <span>{pending ? "Saving…" : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </article>
  );
}
