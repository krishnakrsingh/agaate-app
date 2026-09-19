"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { MAX_FARMS, type FarmInput, type ClientInput, type ContactsInput } from "./onboarding-schema";
import { emptyFarm } from "./onboarding-draft";
import { ringAcres } from "@modules/spatial/ui/geo";

const GeoMap = dynamic(() => import("@modules/spatial/ui/geo-map").then((m) => m.GeoMap), { ssr: false });

const SOIL_TYPES = [
  "Black Cotton / Clay",
  "Red Sandy Loam",
  "Alluvial Loam",
  "Laterite Soil",
  "Sandy Soil (Light)",
  "Clay Loam (Heavy)",
  "Silty Loam",
  "Peaty / Organic Rich",
];

function Field({
  label,
  error,
  required,
  children,
  helper,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  helper?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: "#1e293b",
            letterSpacing: "-0.01em",
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: "#dc2626", fontWeight: 700 }}>*</span>}
        </label>
        {helper}
      </div>
      {children}
      {error && (
        <div
          role="alert"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#dc2626",
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Icons.AlertTriangle size={11} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 38,
  fontSize: 13,
  fontWeight: 500,
  color: "#0f172a",
  backgroundColor: "#ffffff",
  border: "1px solid #d5ded7",
  borderRadius: 8,
  padding: "0 11px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  outline: "none",
  width: "100%",
};

export function OnboardingStepFarms({
  value,
  onChange,
  errors,
  client,
}: {
  value: FarmInput[];
  onChange: (v: FarmInput[]) => void;
  errors: Record<string, string>;
  client?: ClientInput;
  contacts?: ContactsInput;
}) {
  const [gpsLoadingRow, setGpsLoadingRow] = useState<number | null>(null);
  const [gpsStatusRow, setGpsStatusRow] = useState<{ row: number; msg: string; isError?: boolean } | null>(null);

  const patch = (i: number, p: Partial<FarmInput>) => onChange(value.map((f, j) => (j === i ? { ...f, ...p } : f)));

  const patchRing = (i: number, nextRing: [number, number][] | null) => {
    if (!nextRing || nextRing.length < 4) {
      patch(i, { boundaryRing: null });
      return;
    }
    let acres = 0;
    try {
      acres = ringAcres(nextRing);
    } catch {
      acres = 0;
    }
    const rounded = Math.round(acres * 100) / 100;
    const curA = Number(value[i]?.cultivableArea);
    patch(i, {
      boundaryRing: nextRing,
      totalArea: rounded > 0 ? rounded : Number.isFinite(curA) ? curA : undefined,
      cultivableArea: rounded > 0 ? rounded : Number.isFinite(curA) ? curA : undefined,
    });
  };

  const addRow = () => {
    if (value.length >= MAX_FARMS) return;
    const next = emptyFarm();
    next.name = client?.name ? `${client.name}'s Farm ${value.length + 1}` : `Farm ${value.length + 1}`;
    onChange([...value, next]);
  };

  const removeRow = (i: number) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, j) => j !== i));
  };

  const detectLocation = (i: number) => {
    if (!navigator?.geolocation) {
      setGpsStatusRow({ row: i, msg: "GPS not supported on this browser.", isError: true });
      return;
    }
    setGpsLoadingRow(i);
    setGpsStatusRow({ row: i, msg: "Detecting GPS coordinates…" });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setGpsStatusRow({ row: i, msg: "Reverse-geocoding address…" });

        try {
          const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
          const json = await res.json().catch(() => ({}));

          if (res.ok && json.ok && json.data) {
            const d = json.data;
            patch(i, {
              latitude: lat,
              longitude: lng,
              village: d.village || value[i].village || "",
              city: d.city || value[i].city || "",
              taluk: d.taluk || value[i].taluk || "",
              state: d.state || value[i].state || "",
              pincode: d.pincode || value[i].pincode || "",
              location: d.location || value[i].location || [d.village, d.city].filter(Boolean).join(", "),
            });
            setGpsStatusRow({ row: i, msg: "Location and address filled from GPS!" });
          } else {
            patch(i, { latitude: lat, longitude: lng });
            setGpsStatusRow({ row: i, msg: "Coordinates captured (address lookup offline)." });
          }
        } catch {
          patch(i, { latitude: lat, longitude: lng });
          setGpsStatusRow({ row: i, msg: "Coordinates captured." });
        } finally {
          setGpsLoadingRow(null);
          setTimeout(() => setGpsStatusRow(null), 4000);
        }
      },
      (err) => {
        setGpsLoadingRow(null);
        setGpsStatusRow({
          row: i,
          msg: err.code === 1 ? "GPS access denied. Enable location." : "GPS signal unavailable.",
          isError: true,
        });
        setTimeout(() => setGpsStatusRow(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const toggleSameAsClientAddress = (i: number, checked: boolean) => {
    if (checked && client) {
      patch(i, {
        sameAsClientAddress: true,
        village: client.village ?? value[i]?.village ?? "",
        city: client.city ?? value[i]?.city ?? "",
        state: client.state ?? value[i]?.state ?? "",
        pincode: client.pincode ?? value[i]?.pincode ?? "",
        location: value[i]?.location || client.billingAddress || [client.city, client.state].filter(Boolean).join(", "),
      });
    } else {
      patch(i, { sameAsClientAddress: false });
    }
  };

  const handleAreaChange = (i: number, rawArea: number, unit: "Acre" | "Hectare" | "Gunta") => {
    let normalizedAcres = rawArea;
    if (unit === "Hectare") normalizedAcres = Number((rawArea * 2.47105).toFixed(2));
    if (unit === "Gunta") normalizedAcres = Number((rawArea * 0.025).toFixed(2));

    patch(i, {
      area: rawArea,
      areaUnit: unit,
      totalArea: normalizedAcres,
      cultivableArea: normalizedAcres,
    });
  };

  const e = (i: number, f: string) => errors[`farms.${i}.${f}`];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── STACKED FARM CARDS ("ADD SUCH FARMS DOWN MORE AND MORE") ── */}
      {value.map((farm, i) => {
        const lat = Number(farm.latitude);
        const lng = Number(farm.longitude);
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
        const mapCenter: [number, number] = hasCoords ? [lat, lng] : [13.0827, 77.5877];
        const ring = (farm.boundaryRing ?? null) as [number, number][] | null;
        const isGpsLoading = gpsLoadingRow === i;
        const status = gpsStatusRow?.row === i ? gpsStatusRow : null;

        return (
          <div
            key={farm.rowId ?? `farm-${i}`}
            style={{
              background: "#ffffff",
              border: "1px solid #d5e4d8",
              borderRadius: 14,
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(21, 128, 61, 0.04), 0 4px 12px rgba(21, 128, 61, 0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Header: Farm Title, Count, & Remove */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 10,
                borderBottom: "1px solid #eef5ef",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#f0fdf4",
                    color: "#15803d",
                    border: "1px solid #bbf7d0",
                    padding: "3px 9px",
                    borderRadius: 6,
                    letterSpacing: "0.02em",
                  }}
                >
                  Farm #{i + 1}
                </span>
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>
                  {farm.name ? farm.name : `Estate Property ${i + 1}`}
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {status && (
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: status.isError ? "#dc2626" : "#15803d",
                    }}
                  >
                    {status.msg}
                  </span>
                )}
                {value.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#dc2626",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 6,
                      cursor: "pointer",
                      padding: "4px 8px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icons.Trash size={12} />
                    <span>Remove Farm</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── 2-COLUMN BODY: SQUARE MAP (LEFT) + FORM FIELDS (RIGHT) ─ */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "320px minmax(0, 1fr)",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              {/* ── LEFT COLUMN: SQUARE MAP ──────────────────────────── */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  width: 320,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 320,
                    height: 320,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid #d5e4d8",
                    position: "relative",
                    background: "#f8fafc",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <GeoMap
                    center={mapCenter}
                    polygon={ring}
                    onChange={(nextRing) => patchRing(i, nextRing)}
                    height="100%"
                    interactive={true}
                    pins={
                      hasCoords
                        ? [
                            {
                              key: `farm_pin_${i}`,
                              lat,
                              lng,
                              color: "#16a34a",
                              label: farm.name || `Farm ${i + 1}`,
                            },
                          ]
                        : null
                    }
                  />

                  {/* Overlay Helper Badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      right: 8,
                      background: "rgba(15, 23, 42, 0.8)",
                      backdropFilter: "blur(4px)",
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "5px 9px",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      zIndex: 900,
                      pointerEvents: "none",
                    }}
                  >
                    <span>
                      {hasCoords
                        ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                        : "Detect GPS or enter coordinates"}
                    </span>
                    {ring && ring.length >= 4 && (
                      <span style={{ color: "#4ade80", fontWeight: 700 }}>
                        {ringAcres(ring).toFixed(2)} ac
                      </span>
                    )}
                  </div>
                </div>

                {/* Map Quick Action Ribbon */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    Trace farm boundary using top-left tool
                  </span>
                  {ring && ring.length >= 4 && (
                    <button
                      type="button"
                      onClick={() => patch(i, { boundaryRing: null })}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#dc2626",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Clear Boundary
                    </button>
                  )}
                </div>
              </div>

              {/* ── RIGHT COLUMN: FARM DETAILS & COORDINATES ─────────── */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                {/* Row 1: Farm Name & Area */}
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
                  <Field
                    label="Farm Name"
                    error={e(i, "name")}
                    required
                    helper={
                      client?.name ? (
                        <button
                          type="button"
                          onClick={() => patch(i, { name: `${client.name}'s Estate` })}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#15803d",
                            cursor: "pointer",
                          }}
                        >
                          Copy Client Name
                        </button>
                      ) : null
                    }
                  >
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., North Ridge Orchard"
                      value={farm.name}
                      onChange={(ev) => patch(i, { name: ev.target.value })}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Total Area & Unit" error={e(i, "area") || e(i, "totalArea")} required>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 6 }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input"
                        placeholder="12.5"
                        value={farm.area === undefined || farm.area === null ? "" : String(farm.area)}
                        onChange={(ev) => handleAreaChange(i, parseFloat(ev.target.value) || 0, farm.areaUnit || "Acre")}
                        style={inputStyle}
                      />
                      <select
                        className="input"
                        value={farm.areaUnit || "Acre"}
                        onChange={(ev) =>
                          handleAreaChange(i, Number(farm.area) || 0, ev.target.value as "Acre" | "Hectare" | "Gunta")
                        }
                        style={{
                          ...inputStyle,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "0 6px",
                        }}
                      >
                        <option value="Acre">Acre</option>
                        <option value="Hectare">Hectare</option>
                        <option value="Gunta">Gunta</option>
                      </select>
                    </div>
                  </Field>
                </div>

                {/* Row 2: Soil Type & Water Source */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Soil Type" error={e(i, "soilType")} required>
                    <select
                      className="input"
                      value={farm.soilType || ""}
                      onChange={(ev) => patch(i, { soilType: ev.target.value })}
                      style={{
                        ...inputStyle,
                        fontSize: 12.5,
                      }}
                    >
                      <option value="">-- Select Soil Type --</option>
                      {SOIL_TYPES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Water Source" error={e(i, "waterSource")} required>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., 2 Borewells + Canal"
                      value={farm.waterSource || ""}
                      onChange={(ev) => patch(i, { waterSource: ev.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {/* Coordinates & Detect Location Button */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "flex-end" }}>
                  <Field label="Latitude" error={e(i, "latitude")} required>
                    <input
                      type="number"
                      step="any"
                      className="input"
                      placeholder="e.g., 13.0827"
                      value={farm.latitude === undefined || farm.latitude === null ? "" : String(farm.latitude)}
                      onChange={(ev) => patch(i, { latitude: parseFloat(ev.target.value) as unknown as number })}
                      style={{
                        ...inputStyle,
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    />
                  </Field>

                  <Field label="Longitude" error={e(i, "longitude")} required>
                    <input
                      type="number"
                      step="any"
                      className="input"
                      placeholder="e.g., 77.5877"
                      value={farm.longitude === undefined || farm.longitude === null ? "" : String(farm.longitude)}
                      onChange={(ev) => patch(i, { longitude: parseFloat(ev.target.value) as unknown as number })}
                      style={{
                        ...inputStyle,
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={() => detectLocation(i)}
                    disabled={isGpsLoading}
                    style={{
                      height: 38,
                      padding: "0 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: "none",
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      cursor: isGpsLoading ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)",
                      transition: "all 0.15s ease",
                    }}
                    title="Detect GPS coordinates and automatically auto-fill exact address"
                  >
                    {isGpsLoading ? (
                      <Icons.Refresh size={14} className="spin" style={{ color: "#ffffff" }} />
                    ) : (
                      <Icons.Navigation size={14} style={{ color: "#ffffff" }} />
                    )}
                    <span>{isGpsLoading ? "Detecting…" : "Detect Location"}</span>
                  </button>
                </div>

                {/* Row 5: Farm Location / Landmark */}
                <Field
                  label="Farm Location / Landmark"
                  error={e(i, "location")}
                  required
                  helper={
                    client?.village ? (
                      <button
                        type="button"
                        onClick={() => toggleSameAsClientAddress(i, !farm.sameAsClientAddress)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#15803d",
                          cursor: "pointer",
                        }}
                      >
                        {farm.sameAsClientAddress ? "[✓] Synced with Client" : "Copy Client Address"}
                      </button>
                    ) : null
                  }
                >
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Near Hoskote Gate, Survey #45"
                    value={farm.location || ""}
                    onChange={(ev) => patch(i, { location: ev.target.value })}
                    style={inputStyle}
                  />
                </Field>

                {/* Row 6: 4-Column Postal & Regional Address */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                  <Field label="Village" error={e(i, "village")} required>
                    <input
                      type="text"
                      className="input"
                      placeholder="Solur"
                      value={farm.village || ""}
                      onChange={(ev) => patch(i, { village: ev.target.value })}
                      style={{
                        ...inputStyle,
                        padding: "0 8px",
                      }}
                    />
                  </Field>

                  <Field label="City / Taluk" error={e(i, "city")} required>
                    <input
                      type="text"
                      className="input"
                      placeholder="Magadi"
                      value={farm.city || ""}
                      onChange={(ev) => patch(i, { city: ev.target.value })}
                      style={{
                        ...inputStyle,
                        padding: "0 8px",
                      }}
                    />
                  </Field>

                  <Field label="State" error={e(i, "state")} required>
                    <input
                      type="text"
                      className="input"
                      placeholder="Karnataka"
                      value={farm.state || ""}
                      onChange={(ev) => patch(i, { state: ev.target.value })}
                      style={{
                        ...inputStyle,
                        padding: "0 8px",
                      }}
                    />
                  </Field>

                  <Field label="PIN Code" error={e(i, "pincode")} required>
                    <input
                      type="text"
                      className="input"
                      placeholder="562127"
                      maxLength={6}
                      value={farm.pincode || ""}
                      onChange={(ev) => patch(i, { pincode: ev.target.value.replace(/\D/g, "") })}
                      style={{
                        ...inputStyle,
                        fontFamily: "var(--font-mono, monospace)",
                        padding: "0 8px",
                      }}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── ADD ANOTHER FARM BUTTON ── */}
      {value.length < MAX_FARMS && (
        <button
          type="button"
          onClick={addRow}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "13px 20px",
            borderRadius: 10,
            border: "1px dashed #94a3b8",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            transition: "all 0.15s ease",
          }}
        >
          <Icons.Plus size={16} strokeWidth={2.5} />
          <span>Add Another Farm</span>
        </button>
      )}
    </div>
  );
}
