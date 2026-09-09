"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";

export type Farm = {
  id: string;
  name: string;
  location: string;
  totalArea: string;
  cultivableArea: string;
  status?: string;
  setupStage?: string | null;
  surveyNumber?: string | null;
  village?: string | null;
  taluk?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  soilPh?: string | null;
  soilEc?: string | null;
  soilOrganicCarbon?: string | null;
  waterSource?: string | null;
  borewellCount?: number | null;
  borewellDepthFeet?: number | null;
  waterYieldGph?: number | null;
  fencingType?: string | null;
  contractValue?: string | null;
  plots: {
    id: string;
    name: string;
    cropCycles: { id: string; cropName: string; status: string; startDate: string }[];
  }[];
};

export type TelemetryAttendance = {
  id: string;
  farmId: string;
  farmName: string;
  officerName: string;
  officerPhone?: string | null;
  startAt: string | null;
  selfieUrl: string | null;
  withinGeofence: boolean;
  distanceMeters: number | null;
  status: string;
};

export type TelemetryPhoto = {
  id: string;
  url: string;
  farmName: string;
  plotName: string;
  cropName: string;
  stage: string;
  healthStatus: string;
  createdAt: string;
};

export type InitialTelemetry = {
  attendances: TelemetryAttendance[];
  musters: any[];
  tasks: any[];
  harvests: any[];
  expenses: { totalBurn: number; categorySums: any[] };
  proofPhotos: TelemetryPhoto[];
  incidents: any[];
};

interface OwnerCockpitProps {
  initialFarms: Farm[];
  initialTelemetry?: InitialTelemetry;
}

export function OwnerCockpit({ initialFarms, initialTelemetry }: OwnerCockpitProps) {
  const [farms] = useState<Farm[]>(initialFarms);
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    initialFarms.length > 1 ? "ALL" : initialFarms[0]?.id || ""
  );
  const [farmSearch, setFarmSearch] = useState("");

  // Instant server-provided telemetry state
  const [allAttendances] = useState<TelemetryAttendance[]>(initialTelemetry?.attendances || []);
  const [allMusters] = useState<any[]>(initialTelemetry?.musters || []);
  const [allTasks] = useState<any[]>(initialTelemetry?.tasks || []);
  const [allHarvests] = useState<any[]>(initialTelemetry?.harvests || []);
  const [allExpenses] = useState<{ totalBurn: number; categorySums: any[] }>(
    initialTelemetry?.expenses || { totalBurn: 0, categorySums: [] }
  );
  const [allPhotos] = useState<TelemetryPhoto[]>(initialTelemetry?.proofPhotos || []);
  const [allIncidents] = useState<any[]>(initialTelemetry?.incidents || []);

  // Lightbox for photos
  const [activePhotoModal, setActivePhotoModal] = useState<{
    url: string;
    title: string;
    sub: string;
  } | null>(null);

  const isAll = selectedFarmId === "ALL";
  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || null;

  // Filter scoped to selected farm
  const scopedAttendances = useMemo(() => {
    if (isAll) return allAttendances;
    return allAttendances.filter((a) => a.farmId === selectedFarmId);
  }, [allAttendances, isAll, selectedFarmId]);

  const scopedMusters = useMemo(() => {
    if (isAll) return allMusters;
    return allMusters.filter((m) => m.farmId === selectedFarmId);
  }, [allMusters, isAll, selectedFarmId]);

  const scopedTasks = useMemo(() => {
    if (isAll) return allTasks;
    return allTasks.filter((t) => t.farmId === selectedFarmId);
  }, [allTasks, isAll, selectedFarmId]);

  const scopedHarvests = useMemo(() => {
    if (isAll) return allHarvests;
    return allHarvests.filter((h) => h.farmId === selectedFarmId);
  }, [allHarvests, isAll, selectedFarmId]);

  const scopedPhotos = useMemo(() => {
    if (isAll) return allPhotos;
    return allPhotos.filter((p) => p.farmName === selectedFarm?.name);
  }, [allPhotos, isAll, selectedFarmId, selectedFarm]);

  const scopedIncidents = useMemo(() => {
    if (isAll) return allIncidents;
    return allIncidents.filter((i) => i.farmId === selectedFarmId);
  }, [allIncidents, isAll, selectedFarmId]);

  // Primary active field manager
  const activeManager = scopedAttendances[0] || null;
  const totalLabourOnSite = scopedMusters.reduce(
    (acc, m) => acc + Number(m.totalLabourers || 0),
    0
  );

  // Telemetry aggregates
  const completedTasks = scopedTasks.filter((t) => t.status === "COMPLETED").length;
  const pendingTasks = scopedTasks.filter((t) => t.status !== "COMPLETED");
  const progressPercent = scopedTasks.length
    ? Math.round((completedTasks / scopedTasks.length) * 100)
    : 0;

  const totalHarvestKg = scopedHarvests.reduce(
    (acc, h) => acc + Number(h.quantity || 0),
    0
  );
  const totalRevenue = scopedHarvests.reduce(
    (acc, h) => acc + Number(h.totalAmount || 0),
    0
  );

  const scopeTotalArea = isAll
    ? farms.reduce((acc, f) => acc + Number(f.totalArea || 0), 0)
    : Number(selectedFarm?.totalArea || 0);

  const scopeCultivableArea = isAll
    ? farms.reduce((acc, f) => acc + Number(f.cultivableArea || 0), 0)
    : Number(selectedFarm?.cultivableArea || 0);

  const scopeTotalPlots = isAll
    ? farms.reduce((acc, f) => acc + f.plots.length, 0)
    : selectedFarm?.plots.length || 0;

  // Multi-estate breakdown matrix
  const estateMatrix = useMemo(() => {
    return farms.map((f) => {
      const fTasks = allTasks.filter((t) => t.farmId === f.id);
      const fDone = fTasks.filter((t) => t.status === "COMPLETED").length;
      const fPercent = fTasks.length ? Math.round((fDone / fTasks.length) * 100) : 0;
      const fMuster = allMusters.find((m) => m.farmId === f.id);
      const fOpenIncidents = allIncidents.filter(
        (i) => i.farmId === f.id && i.status !== "RESOLVED"
      );
      const fActiveCrops = Array.from(
        new Set(
          f.plots.flatMap((p) =>
            p.cropCycles.filter((c) => c.status === "ACTIVE").map((c) => c.cropName)
          )
        )
      );

      return {
        farm: f,
        tasksCount: fTasks.length,
        doneCount: fDone,
        progressPercent: fPercent,
        musterCount: fMuster ? fMuster.totalLabourers : 0,
        openIncidentsCount: fOpenIncidents.length,
        activeCrops: fActiveCrops,
      };
    });
  }, [farms, allTasks, allMusters, allIncidents]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── 1. OWNER COMMAND HEADER & PORTFOLIO SWITCHER ── */}
      <div className="page-header" style={{ paddingBottom: 16 }}>
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>
              {isAll
                ? `PORTFOLIO COMMAND • ${farms.length} ESTATES`
                : `ESTATE COCKPIT • ${selectedFarm?.location || "FIELD COMMAND"}`}
            </span>
          </div>
          <h1 className="page-title">
            {isAll ? "Multi-Estate Agricultural Portfolio" : selectedFarm?.name}
          </h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
            {isAll
              ? `Operational rollup across all ${farms.length} managed client estates: live workforce muster, daily operational pace, land utilization, and commercial harvest.`
              : `Live estate command: morning field manager presence, photo proof-of-work, parcel phenology, and MTD budget burn.`}
          </p>
          {!isAll && selectedFarm && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              {selectedFarm.status && <StatusBadge status={selectedFarm.status} />}
              {selectedFarm.surveyNumber && (
                <span className="badge badge-stone font-mono" style={{ fontSize: 11 }}>
                  📍 Sy/Khasra #{selectedFarm.surveyNumber}
                </span>
              )}
              {(selectedFarm.village || selectedFarm.district) && (
                <span className="mono-label" style={{ fontSize: 11 }}>
                  {[selectedFarm.village, selectedFarm.taluk, selectedFarm.district, selectedFarm.state].filter(Boolean).join(", ")}
                </span>
              )}
              {selectedFarm.soilPh && (
                <span className="badge badge-stone font-mono" style={{ fontSize: 11 }}>
                  pH {selectedFarm.soilPh} {selectedFarm.soilEc ? `• EC ${selectedFarm.soilEc}` : ""}
                </span>
              )}
              {typeof selectedFarm.borewellCount === "number" && selectedFarm.borewellCount > 0 && (
                <span className="badge badge-stone font-mono" style={{ fontSize: 11 }}>
                  💧 {selectedFarm.borewellCount} Borewell{selectedFarm.borewellCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", alignSelf: "flex-start" }}>
          {/* Multi-Estate Selector */}
          {farms.length > 1 && (
            <div style={{ minWidth: 240, position: "relative" }}>
              <label className="mono-label" style={{ display: "block", marginBottom: 4, fontSize: 11 }}>
                Active Estate View
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="input-field"
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  borderColor: isAll ? "var(--green)" : undefined,
                  background: isAll ? "var(--stone)" : "var(--canvas)",
                }}
              >
                <option value="ALL">★ All Estates Portfolio Rollup ({farms.length} Estates)</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.location})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 1-Click WhatsApp & Executive Brief */}
          <Link
            href="/owner/reports/brief"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-end", height: 38 }}
          >
            <Icons.FileText size={14} />
            <span>WhatsApp Executive Brief</span>
          </Link>
        </div>
      </div>

      {/* ── 2. DUAL-CARD FIELD REASSURANCE HERO (TOP OF COCKPIT) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* CARD A: ON-DUTY MANAGER & MORNING MUSTER */}
        <section className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--green-dark)" }}>
                <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
                <span>FIELD PRESENCE &amp; MUSTER</span>
              </div>
              <h3 style={{ fontSize: 17, margin: "4px 0 0", fontWeight: 700 }}>
                Today&apos;s Field Command
              </h3>
            </div>
            {activeManager?.withinGeofence && (
              <span className="badge badge-green font-mono" style={{ fontSize: 10 }}>
                ✓ GPS Verified On-Site
              </span>
            )}
          </div>

          {activeManager ? (
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                padding: "14px 16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--stone)",
                border: "1px solid var(--line)",
              }}
            >
              {/* Selfie photo with zoom trigger */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "var(--canvas)",
                  border: "2px solid var(--green)",
                  flexShrink: 0,
                  position: "relative",
                  cursor: activeManager.selfieUrl ? "pointer" : "default",
                }}
                onClick={() => {
                  if (activeManager.selfieUrl) {
                    setActivePhotoModal({
                      url: activeManager.selfieUrl,
                      title: `${activeManager.officerName} — Clock-In Verification`,
                      sub: `Verified on-site at ${activeManager.startAt ? new Date(activeManager.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Morning Shift"}`,
                    });
                  }
                }}
              >
                {activeManager.selfieUrl ? (
                  <img
                    src={activeManager.selfieUrl}
                    alt={activeManager.officerName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--muted)",
                    }}
                  >
                    <Icons.User size={28} />
                  </div>
                )}
              </div>

              {/* Manager metadata */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 15, color: "var(--ink)" }}>
                    {activeManager.officerName}
                  </strong>
                  <span className="badge badge-muted" style={{ fontSize: 9 }}>
                    On-Site Manager
                  </span>
                </div>

                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                  Clocked In:{" "}
                  <strong>
                    {activeManager.startAt
                      ? new Date(activeManager.startAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Morning Shift"}
                  </strong>{" "}
                  • {activeManager.farmName}
                </div>

                {activeManager.officerPhone && (
                  <a
                    href={`tel:${activeManager.officerPhone}`}
                    className="muted hover-ink"
                    style={{
                      fontSize: 11,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    📞 Call Manager: {activeManager.officerPhone}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--stone)",
                border: "1px dashed var(--line-strong)",
                fontSize: 13,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Icons.Sun size={24} style={{ color: "var(--amber)" }} />
              <div>
                <strong style={{ color: "var(--ink)", display: "block" }}>
                  Morning shift awaiting check-in
                </strong>
                <span>Field crew muster scheduled. Manager logs selfie upon arrival.</span>
              </div>
            </div>
          )}

          {/* Daily Labour Muster pill */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              background: "var(--canvas)",
              borderRadius: "var(--radius-xs)",
              border: "1px solid var(--line)",
              fontSize: 12,
            }}
          >
            <div>
              <span className="muted">Contractor Daily Crew: </span>
              <strong style={{ color: "var(--green-dark)" }}>
                {totalLabourOnSite > 0 ? `${totalLabourOnSite} Workers on site` : "Pending muster log"}
              </strong>
            </div>
            <Link href="/owner/team" className="muted hover-ink" style={{ fontSize: 11 }}>
              Manage Crew &rarr;
            </Link>
          </div>
        </section>

        {/* CARD B: TODAY'S VISUAL PROOF-OF-WORK STREAM */}
        <section className="compact-card" style={{ padding: 22, gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--green-dark)" }}>
                <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
                <span>VISUAL PROOF-OF-WORK STREAM</span>
              </div>
              <h3 style={{ fontSize: 17, margin: "4px 0 0", fontWeight: 700 }}>
                Live Field Photos &amp; Crop Snaps
              </h3>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              {scopedPhotos.length} Photos Captured
            </span>
          </div>

          {scopedPhotos.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 6,
              }}
            >
              {scopedPhotos.map((p) => (
                <div
                  key={p.id}
                  style={{
                    minWidth: 150,
                    maxWidth: 150,
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    border: "1px solid var(--line)",
                    background: "var(--canvas)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  onClick={() =>
                    setActivePhotoModal({
                      url: p.url,
                      title: `${p.cropName} • ${p.plotName}`,
                      sub: `Growth Stage: ${p.stage} • Health: ${p.healthStatus} (${new Date(p.createdAt).toLocaleDateString()})`,
                    })
                  }
                >
                  <div style={{ width: "100%", height: 100, position: "relative" }}>
                    <img
                      src={p.url}
                      alt={p.cropName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        borderRadius: 3,
                        padding: "1px 4px",
                        fontSize: 8,
                      }}
                    >
                      <Icons.Maximize2 size={8} />
                    </div>
                  </div>
                  <div style={{ padding: "6px 8px" }}>
                    <strong style={{ fontSize: 11, color: "var(--ink)", display: "block" }}>
                      {p.cropName}
                    </strong>
                    <span className="muted" style={{ fontSize: 10 }}>
                      {p.plotName} • {p.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 13,
                background: "var(--stone)",
                borderRadius: "var(--radius-sm)",
                border: "1px dashed var(--line)",
              }}
            >
              No crop monitoring photos logged yet today. Photos appear here as field rounds are completed.
            </div>
          )}
        </section>
      </div>

      {/* ── 3. EXECUTIVE TELEMETRY ROW ── */}
      <div className="metric-summary-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="metric-summary-item">
          <span className="metric-label">Land Under Management</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            {scopeCultivableArea.toFixed(1)}{" "}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>
              / {scopeTotalArea.toFixed(1)} Ac
            </span>
          </div>
          <div className="metric-sub">{scopeTotalPlots} active demarcated parcels</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Today&apos;s Field Muster</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {totalLabourOnSite > 0 ? `${totalLabourOnSite} Workers` : "0 Logged"}
          </div>
          <div className="metric-sub">
            {activeManager ? `Manager: ${activeManager.officerName}` : "Field operations on site"}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Operations Pulse</span>
          <div className="metric-value">{progressPercent}%</div>
          <div className="metric-sub">
            {completedTasks} of {scopedTasks.length} operations finished
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Harvested Output</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {totalHarvestKg > 0 ? `${totalHarvestKg.toLocaleString()} kg` : "0 kg"}
          </div>
          <div className="metric-sub">
            {totalRevenue > 0 ? `Est. ₹${totalRevenue.toLocaleString()}` : "Harvest in progress"}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Operating Spend (MTD)</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            ₹{allExpenses.totalBurn ? allExpenses.totalBurn.toLocaleString() : "0"}
          </div>
          <div className="metric-sub">Month-to-Date farm burn</div>
        </div>

        <div
          className="metric-summary-item"
          style={{
            borderColor: scopedIncidents.length > 0 ? "var(--red-light)" : undefined,
            background: scopedIncidents.length > 0 ? "var(--red-light)" : undefined,
          }}
        >
          <span className="metric-label" style={{ color: scopedIncidents.length > 0 ? "var(--red)" : undefined }}>
            Active Hazards &amp; Incidents
          </span>
          <div className="metric-value" style={{ color: scopedIncidents.length > 0 ? "var(--red)" : "var(--green)" }}>
            {scopedIncidents.length > 0 ? `${scopedIncidents.length} Open` : "0 Hazards"}
          </div>
          <div className="metric-sub" style={{ color: scopedIncidents.length > 0 ? "var(--red)" : undefined }}>
            {scopedIncidents.length > 0 ? "Action required on site" : "All clear across parcels"}
          </div>
        </div>
      </div>

      {/* ── 4. MULTI-ESTATE PERFORMANCE MATRIX TABLE (WHEN IN "ALL" VIEW) ── */}
      {isAll && farms.length > 1 && (
        <section className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--green)" }}>
                <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
                <span>PORTFOLIO BREAKDOWN</span>
              </div>
              <h2 className="section-title" style={{ fontSize: 18, marginTop: 4 }}>
                Estates Performance Matrix
              </h2>
              <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
                Comparative operational status, land allocation, and live daily completion across all your farms.
              </p>
            </div>

            {farms.length > 4 && (
              <div style={{ width: 220 }}>
                <input
                  type="text"
                  placeholder="Filter estates..."
                  value={farmSearch}
                  onChange={(e) => setFarmSearch(e.target.value)}
                  className="input-field"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                />
              </div>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Estate Name &amp; Location</th>
                  <th>Acreage (Cultivable / Total)</th>
                  <th>Demarcated Parcels</th>
                  <th>Active Crops</th>
                  <th>Today&apos;s Field Work</th>
                  <th>Muster On-Site</th>
                  <th>Hazards</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {estateMatrix
                  .filter(
                    (row) =>
                      row.farm.name.toLowerCase().includes(farmSearch.toLowerCase()) ||
                      row.farm.location.toLowerCase().includes(farmSearch.toLowerCase())
                  )
                  .map((row) => (
                    <tr key={row.farm.id}>
                      <td>
                        <strong style={{ color: "var(--ink)", display: "block" }}>{row.farm.name}</strong>
                        <span className="muted" style={{ fontSize: 11 }}>{row.farm.location}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{Number(row.farm.cultivableArea).toFixed(1)} Ac</span>
                        <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>
                          / {Number(row.farm.totalArea).toFixed(1)} Ac
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{row.farm.plots.length}</span>
                        <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>plots</span>
                      </td>
                      <td>
                        {row.activeCrops.length > 0 ? (
                          <span style={{ fontSize: 12, color: "var(--green)" }}>
                            {row.activeCrops.join(", ")}
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>No active cycles</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                          <div style={{ flex: 1, height: 6, background: "var(--stone)", borderRadius: 3, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${row.progressPercent}%`,
                                height: "100%",
                                background: "var(--green)",
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>
                            {row.progressPercent}%
                          </span>
                        </div>
                        <span className="muted" style={{ fontSize: 10 }}>
                          {row.doneCount} of {row.tasksCount} done
                        </span>
                      </td>
                      <td>
                        {row.musterCount > 0 ? (
                          <span style={{ fontWeight: 600, color: "var(--green)" }}>
                            {row.musterCount} Workers
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>None logged</span>
                        )}
                      </td>
                      <td>
                        {row.openIncidentsCount > 0 ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--red)",
                              background: "var(--red-light)",
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            {row.openIncidentsCount} Open
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--green)" }}>✓ Clear</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedFarmId(row.farm.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: "4px 8px" }}
                        >
                          Open Cockpit &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── 5. TODAY'S OPERATIONS PROGRESS & PENDING ACTIONS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* Operations Progress */}
        <section className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="mono-label" style={{ color: "var(--green-dark)" }}>DAILY FIELD PROGRESS</span>
              <h3 style={{ fontSize: 17, margin: "4px 0 0" }}>Today&apos;s Scheduled Operations</h3>
            </div>
            <Link href="/reports/daily" className="btn btn-secondary btn-sm" style={{ borderRadius: "var(--radius-pill)" }}>
              <Icons.FileText size={13} />
              <span>Full Daily Log</span>
            </Link>
          </div>

          <div style={{ width: "100%", height: 8, backgroundColor: "var(--stone)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <div style={{ width: `${progressPercent}%`, height: "100%", backgroundColor: "var(--green)", transition: "width 0.4s ease" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {pendingTasks.slice(0, 4).map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--stone)",
                  borderRadius: "var(--radius-xs)",
                  fontSize: 13,
                }}
              >
                <div>
                  <strong style={{ color: "var(--ink)", display: "block" }}>{t.title}</strong>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {t.farm ? `${t.farm.name} • ` : ""}
                    {t.plot ? t.plot.name : "Estate Wide"} • Priority: {t.priority}
                  </span>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="muted" style={{ fontSize: 13, textAlign: "center", padding: "12px 0" }}>
                ✓ All scheduled operations for today have been completed.
              </div>
            )}
            {pendingTasks.length > 4 && (
              <div style={{ textAlign: "center", paddingTop: 4 }}>
                <Link href="/owner/calendar" className="muted hover-ink" style={{ fontSize: 12 }}>
                  + {pendingTasks.length - 4} more operations scheduled &rarr;
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Financials Quick Breakdown */}
        <section className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="mono-label" style={{ color: "var(--green-dark)" }}>EXPENSE ALLOCATION</span>
              <h3 style={{ fontSize: 17, margin: "4px 0 0" }}>Operating Spend by Category</h3>
            </div>
            <Link href="/owner/financials" className="btn btn-secondary btn-sm" style={{ borderRadius: "var(--radius-pill)" }}>
              <Icons.Coins size={13} />
              <span>View Ledger</span>
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {allExpenses.categorySums.map((cat: any) => (
              <div
                key={cat.category}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--line)",
                  fontSize: 13,
                }}
              >
                <span style={{ textTransform: "capitalize", color: "var(--ink)" }}>
                  {cat.category.toLowerCase().replaceAll("_", " ")}
                </span>
                <strong style={{ color: "var(--ink)" }}>₹{cat.total.toLocaleString()}</strong>
              </div>
            ))}
            {allExpenses.categorySums.length === 0 && (
              <div className="muted" style={{ fontSize: 13, textAlign: "center", padding: "12px 0" }}>
                No expenses logged this month yet.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── 6. QUICK NAVIGATION CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <Link
          href="/owner/plots"
          className="compact-card hover-glow"
          style={{ padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Plot size={18} style={{ color: "var(--green)" }} />
            <strong style={{ color: "var(--ink)", fontSize: 14 }}>Plots &amp; Orchards</strong>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            {scopeTotalPlots} active parcels managed
          </span>
        </Link>

        <Link
          href="/owner/harvest"
          className="compact-card hover-glow"
          style={{ padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Truck size={18} style={{ color: "var(--green)" }} />
            <strong style={{ color: "var(--ink)", fontSize: 14 }}>Commercial Harvest</strong>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            {scopedHarvests.length} picking batches recorded
          </span>
        </Link>

        <Link
          href="/owner/inventory"
          className="compact-card hover-glow"
          style={{ padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Package size={18} style={{ color: "var(--green)" }} />
            <strong style={{ color: "var(--ink)", fontSize: 14 }}>Tool Shed &amp; Stock</strong>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            Monitor input inventory balances
          </span>
        </Link>

        <Link
          href="/admin/attendance"
          className="compact-card hover-glow"
          style={{ padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Users size={18} style={{ color: "var(--green)" }} />
            <strong style={{ color: "var(--ink)", fontSize: 14 }}>Workforce Muster</strong>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            Manager presence &amp; labour hours
          </span>
        </Link>
      </div>

      {/* ── 7. LIGHTBOX MODAL FOR HIGH-RES PHOTOS ── */}
      {activePhotoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: 16,
          }}
          onClick={() => setActivePhotoModal(null)}
        >
          <div
            style={{
              maxWidth: 800,
              width: "100%",
              background: "var(--canvas)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
              <div>
                <strong style={{ fontSize: 14, color: "var(--ink)" }}>{activePhotoModal.title}</strong>
                <div className="muted" style={{ fontSize: 11 }}>{activePhotoModal.sub}</div>
              </div>
              <button
                type="button"
                onClick={() => setActivePhotoModal(null)}
                className="btn btn-sm btn-ghost"
              >
                <Icons.X size={16} />
              </button>
            </div>
            <div style={{ maxHeight: "70vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
              <img
                src={activePhotoModal.url}
                alt={activePhotoModal.title}
                style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
