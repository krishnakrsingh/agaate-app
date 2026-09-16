"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { MAX_FARMS, type FarmInput, type ClientInput, type ContactsInput, type ContactItem } from "./onboarding-schema";
import { emptyFarm } from "./onboarding-draft";
import { ringAcres } from "@/lib/geo";
import { representativePoint } from "@/lib/geo-core";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), { ssr: false });

function F({ label, error, helper, children }: { label: string; error?: string; helper?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</label>
        {helper}
      </div>
      {children}
      {error && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 3 }}>{error}</div>}
    </div>
  );
}

export function OnboardingStepFarms({
  value,
  onChange,
  errors,
  client,
  contacts,
}: {
  value: FarmInput[];
  onChange: (v: FarmInput[]) => void;
  errors: Record<string, string>;
  client?: ClientInput;
  contacts?: ContactsInput;
}) {
  const [sel, setSel] = useState(0);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState("");
  const [addingLocalContact, setAddingLocalContact] = useState(false);
  const [newLocalName, setNewLocalName] = useState("");
  const [newLocalPhone, setNewLocalPhone] = useState("");

  const idx = Math.min(sel, Math.max(0, value.length - 1));
  const cur = value[idx];

  const dupNames = useMemo(() => {
    const c = new Map<string, number>();
    for (const f of value) {
      const k = f.name.trim().toLowerCase();
      if (k) c.set(k, (c.get(k) ?? 0) + 1);
    }
    return c;
  }, [value]);

  const patch = (i: number, p: Partial<FarmInput>) => onChange(value.map((f, j) => (j === i ? { ...f, ...p } : f)));

  const patchRing = (i: number, ring: [number, number][] | null) => {
    const f = value[i];
    if (!f) return;
    let { latitude, longitude } = f;
    if (ring && ring.length >= 4 && !Number.isFinite(Number(latitude))) {
      try {
        const c = representativePoint(ring as [number, number][]);
        if (c) {
          longitude = c[0] as unknown as number;
          latitude = c[1] as unknown as number;
        }
      } catch {
        /* keep manual coords */
      }
    }
    onChange(value.map((x, j) => (j === i ? { ...x, boundaryRing: ring, latitude, longitude } : x)));
  };

  const addRow = () => {
    if (value.length >= MAX_FARMS) return;
    onChange([...value, emptyFarm()]);
    setSel(value.length);
  };

  const removeRow = (i: number) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, j) => j !== i));
    setSel(0);
  };

  const gps = () => {
    setGpsErr("");
    if (!navigator.geolocation) {
      setGpsErr("Location not supported.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        patch(idx, { latitude: p.coords.latitude as unknown as number, longitude: p.coords.longitude as unknown as number });
        setGpsBusy(false);
      },
      (e) => {
        setGpsBusy(false);
        setGpsErr(e.code === 1 ? "Permission denied." : "Location unavailable.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const e = (i: number, f: string) => errors[`farms.${i}.${f}`];
  const lat = Number(cur?.latitude), lng = Number(cur?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const ring = (cur?.boundaryRing ?? null) as [number, number][] | null;
  const ringAcresLive = ring && ring.length >= 4 ? (() => { try { return ringAcres(ring); } catch { return 0; } })() : 0;
  const mapCenter: [number, number] = hasCoords ? [lat, lng] : [13.0827, 77.5877];

  // Unit conversion helper
  const handleAreaChange = (rawArea: number, unit: "Acre" | "Hectare" | "Gunta") => {
    let normalizedAcres = rawArea;
    if (unit === "Hectare") normalizedAcres = Number((rawArea * 2.47105).toFixed(2));
    if (unit === "Gunta") normalizedAcres = Number((rawArea * 0.025).toFixed(2));

    patch(idx, {
      area: rawArea,
      areaUnit: unit,
      totalArea: normalizedAcres,
      cultivableArea: normalizedAcres,
    });
  };

  // Same as Client Address toggle
  const toggleSameAsClientAddress = (checked: boolean) => {
    if (checked && client) {
      patch(idx, {
        sameAsClientAddress: true,
        village: client.village ?? cur?.village ?? "",
        city: client.city ?? cur?.city ?? "",
        state: client.state ?? cur?.state ?? "",
        pincode: client.pincode ?? cur?.pincode ?? "",
        location: cur?.location || client.billingAddress || [client.city, client.state].filter(Boolean).join(", "),
      });
    } else {
      patch(idx, { sameAsClientAddress: false });
    }
  };

  // Same as Client for Local Connect
  const setLocalConnectSameAsClient = () => {
    if (!client) return;
    const clientStr = `${client.name}${client.phone ? ` (${client.phone})` : ""}`;
    patch(idx, {
      localConnect: clientStr,
      localContactName: client.name,
      localContactPhone: client.phone ?? "",
      localConnectSameAsClient: true,
    });
  };

  // Client name default
  const defaultFarmName = client?.companyName ? `${client.companyName} Estate` : client?.name ? `${client.name}'s Farm` : "Greenfield Estate";

  // Available contact options for Local Connect
  const contactOptions: ContactItem[] = [];
  if (client?.name && client?.phone) {
    contactOptions.push({
      id: "client_owner",
      name: `${client.name} (Client Primary)`,
      phone: client.phone,
      email: client.email || null,
      role: "LOCAL",
    });
  }
  if (contacts?.financeContact) {
    contactOptions.push(contacts.financeContact);
  }
  if (contacts?.purchaserContact) {
    contactOptions.push(contacts.purchaserContact);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Client Context Header ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "var(--surface-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🏡
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Client Context
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              {client?.companyName ? `${client.companyName} · ` : ""}{client?.name || "Client"}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 20,
            background: "var(--surface-strong)",
            color: "var(--muted)",
          }}
        >
          {value.length} Farm{value.length > 1 ? "s" : ""} Added
        </span>
      </div>

      {/* ── Farm Selector Strip ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {value.map((f, i) => {
            const active = i === idx;
            const hasErr = Object.keys(errors).some((k) => k.startsWith(`farms.${i}.`));
            const dup = f.name.trim() && (dupNames.get(f.name.trim().toLowerCase()) ?? 0) > 1;

            return (
              <button
                key={f.rowId ?? i}
                type="button"
                onClick={() => setSel(i)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 20,
                  border: `1px solid ${active ? "var(--ink)" : hasErr ? "var(--semantic-error)" : "var(--hairline)"}`,
                  background: active ? "var(--ink)" : "var(--surface-card)",
                  color: active ? "#fff" : hasErr ? "var(--semantic-error)" : "var(--ink)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>{f.name.trim() || `Farm ${i + 1}`}</span>
                {(dup || hasErr) && <span>⚠</span>}
                {value.length > 1 && (
                  <span
                    role="button"
                    aria-label={`Remove farm ${i + 1}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removeRow(i);
                    }}
                    style={{ opacity: 0.6, fontSize: 13, cursor: "pointer", marginLeft: 2 }}
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={addRow}
          disabled={value.length >= MAX_FARMS}
          style={{ height: 32, padding: "0 12px", gap: 4 }}
        >
          <Icons.Plus size={13} />
          <span>Add Another Farm</span>
        </button>
      </div>

      {/* ── Selected Farm Details ────────────────────────────────────────── */}
      {cur && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Card 1: Farm Basic Information */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: "20px 24px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--hairline)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
                Estate Identity & Area
              </span>
            </div>

            <div className="ob-grid-3">
              <F
                label="Farm Name *"
                error={e(idx, "name")}
                helper={
                  <button
                    type="button"
                    onClick={() => patch(idx, { name: defaultFarmName })}
                    style={{
                      background: cur.name === defaultFarmName ? "var(--green-light, #dcfce7)" : "var(--surface-strong)",
                      color: cur.name === defaultFarmName ? "var(--green, #15803d)" : "var(--muted)",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "1px 6px",
                      cursor: "pointer",
                    }}
                  >
                    Use Client Name
                  </button>
                }
              >
                <input
                  className="input-field"
                  value={cur.name}
                  maxLength={120}
                  placeholder="e.g., North Valley Estate"
                  onChange={(ev) => patch(idx, { name: ev.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </F>

              {/* Area + Unit Selector */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                  Total Area & Unit *
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="input-field"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cur.area as unknown as string}
                    placeholder="12.5"
                    onChange={(ev) => handleAreaChange(Number(ev.target.value), cur.areaUnit ?? "Acre")}
                    style={{ borderRadius: 8, flex: 1 }}
                  />
                  <select
                    className="input-field"
                    value={cur.areaUnit ?? "Acre"}
                    onChange={(ev) => handleAreaChange(Number(cur.area || 0), ev.target.value as "Acre" | "Hectare" | "Gunta")}
                    style={{ width: 95, borderRadius: 8, padding: "0 8px" }}
                  >
                    <option value="Acre">Acre</option>
                    <option value="Hectare">Hectare</option>
                    <option value="Gunta">Gunta</option>
                  </select>
                </div>
                {e(idx, "totalArea") && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 3 }}>{e(idx, "totalArea")}</div>}
              </div>

              <F label="Water Source *" error={e(idx, "waterSource")}>
                <input
                  className="input-field"
                  value={cur.waterSource}
                  maxLength={300}
                  placeholder="e.g., 2x Borewells + Storage Pond"
                  onChange={(ev) => patch(idx, { waterSource: ev.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </F>
            </div>

            {/* Local Connect Relationship */}
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--hairline)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>Local Connect (Farm In-charge)</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Manager or primary contact residing at the farm location</div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={setLocalConnectSameAsClient}
                    style={{
                      fontSize: 11,
                      height: 28,
                      background: cur.localConnectSameAsClient ? "var(--green-light, #dcfce7)" : undefined,
                      color: cur.localConnectSameAsClient ? "var(--green, #15803d)" : undefined,
                    }}
                  >
                    Same as Client
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAddingLocalContact(!addingLocalContact)}
                    style={{ fontSize: 11, height: 28 }}
                  >
                    {addingLocalContact ? "Cancel New" : "+ Add New Local Contact"}
                  </button>
                </div>
              </div>

              {!addingLocalContact ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select
                    className="input-field"
                    value={cur.localContactId ?? (cur.localConnect ? "custom" : "")}
                    onChange={(ev) => {
                      const selectedId = ev.target.value;
                      if (selectedId === "custom") return;
                      const matched = contactOptions.find((c) => c.id === selectedId);
                      if (matched) {
                        patch(idx, {
                          localContactId: matched.id,
                          localContactName: matched.name,
                          localContactPhone: matched.phone,
                          localConnect: `${matched.name} (${matched.phone})`,
                          localConnectSameAsClient: matched.id === "client_owner",
                        });
                      }
                    }}
                    style={{ borderRadius: 8, flex: 1 }}
                  >
                    <option value="">-- Select Contact for Local Connect --</option>
                    {contactOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                    {cur.localConnect && !contactOptions.some((c) => c.id === cur.localContactId) && (
                      <option value="custom">{cur.localConnect}</option>
                    )}
                  </select>
                </div>
              ) : (
                <div className="ob-grid-2" style={{ background: "var(--surface-strong)", padding: 12, borderRadius: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Name</label>
                    <input
                      className="input-field"
                      value={newLocalName}
                      placeholder="e.g., Suresh Gowda"
                      onChange={(e) => setNewLocalName(e.target.value)}
                      style={{ borderRadius: 6, marginTop: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Phone</label>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <input
                        className="input-field"
                        value={newLocalPhone}
                        placeholder="e.g., 9876543210"
                        onChange={(e) => setNewLocalPhone(e.target.value)}
                        style={{ borderRadius: 6, flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          if (!newLocalName.trim() || !newLocalPhone.trim()) return;
                          patch(idx, {
                            localConnect: `${newLocalName.trim()} (${newLocalPhone.trim()})`,
                            localContactName: newLocalName.trim(),
                            localContactPhone: newLocalPhone.trim(),
                            localConnectSameAsClient: false,
                          });
                          setAddingLocalContact(false);
                          setNewLocalName("");
                          setNewLocalPhone("");
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Farm Location & Interactive Map */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: "20px 24px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.MapPin size={15} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
                  Farm Location & Map
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={gps}
                disabled={gpsBusy}
                style={{ height: 28, padding: "0 10px", fontSize: 11, gap: 4 }}
              >
                <Icons.MapPin size={12} />
                <span>{gpsBusy ? "Locating…" : "Detect Current GPS"}</span>
              </button>
            </div>

            {gpsErr && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginBottom: 8 }}>{gpsErr}</div>}

            {/* Map Canvas */}
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--hairline)", marginBottom: 14 }}>
              <GeoMap
                center={mapCenter}
                polygon={ring}
                onChange={(r) => patchRing(idx, r)}
                interactive
                height={260}
                pins={!ring && hasCoords ? [{ key: cur.rowId ?? String(idx), lat, lng, color: "var(--green, #15803d)", label: cur.name.trim() || `Farm ${idx + 1}` }] : null}
              />
            </div>

            {/* Lat/Long and Location Name inputs */}
            <div className="ob-grid-3">
              <F label="Farm Location Name *" error={e(idx, "location")}>
                <input
                  className="input-field"
                  value={cur.location}
                  maxLength={180}
                  placeholder="e.g., Near Hoskote Gate"
                  onChange={(ev) => patch(idx, { location: ev.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </F>
              <F label="Latitude *" error={e(idx, "latitude")}>
                <input
                  className="input-field"
                  type="number"
                  step="any"
                  value={cur.latitude as unknown as string}
                  placeholder="13.1234"
                  onChange={(ev) => patch(idx, { latitude: ev.target.value as unknown as number })}
                  style={{ borderRadius: 8 }}
                />
              </F>
              <F label="Longitude *" error={e(idx, "longitude")}>
                <input
                  className="input-field"
                  type="number"
                  step="any"
                  value={cur.longitude as unknown as string}
                  placeholder="77.5678"
                  onChange={(ev) => patch(idx, { longitude: ev.target.value as unknown as number })}
                  style={{ borderRadius: 8 }}
                />
              </F>
            </div>
          </div>

          {/* Card 3: Farm Address with 'Same as Client Address' */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: "20px 24px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.FileText size={15} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
                  Farm Address & Land Records
                </span>
              </div>

              {/* Prominent 'Same as Client Address' toggle */}
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink)",
                  cursor: "pointer",
                  background: cur.sameAsClientAddress ? "var(--green-light, #dcfce7)" : "var(--surface-strong)",
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!cur.sameAsClientAddress}
                  onChange={(e) => toggleSameAsClientAddress(e.target.checked)}
                />
                <span>Same as Client Address</span>
              </label>
            </div>

            <div className="ob-grid-3">
              <F label="Survey No." error={e(idx, "surveyNumber")}>
                <input
                  className="input-field"
                  value={cur.surveyNumber ?? ""}
                  placeholder="e.g., 42/1A"
                  onChange={(ev) => patch(idx, { surveyNumber: ev.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </F>
              <F label="Village" error={e(idx, "village")}>
                <input
                  className="input-field"
                  value={cur.village ?? ""}
                  placeholder="e.g., Solur"
                  onChange={(ev) => patch(idx, { village: ev.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </F>
              <F label="City" error={e(idx, "city")}>
                <input
                  className="input-field"
                  value={cur.city ?? ""}
                  placeholder="e.g., Bengaluru"
                  onChange={(ev) => patch(idx, { city: ev.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </F>
              <F label="Taluk" error={e(idx, "taluk")}>
                <input
                  className="input-field"
                  value={cur.taluk ?? ""}
                  placeholder="e.g., Magadi"
                  onChange={(ev) => patch(idx, { taluk: ev.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </F>
              <F label="State" error={e(idx, "state")}>
                <input
                  className="input-field"
                  value={cur.state ?? ""}
                  placeholder="e.g., Karnataka"
                  onChange={(ev) => patch(idx, { state: ev.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </F>
              <F label="PIN Code" error={e(idx, "pincode")}>
                <input
                  className="input-field"
                  value={cur.pincode ?? ""}
                  placeholder="e.g., 562127"
                  onChange={(ev) => patch(idx, { pincode: ev.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </F>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
