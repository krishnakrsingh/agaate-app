"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useMemo, FormEvent } from "react";
import { Icons } from "./icons";
import { IncidentReportForm } from "./incident-report-form";
import { EmptyState } from "./ui/empty-state";
import { CardSkeleton } from "./ui/skeleton";
import { useToast } from "./ui/toast";

type FollowUp = {
  id: string;
  authorName: string;
  action: string;
  remarks: string | null;
  createdAt: string;
};

type IncidentItem = {
  id: string;
  farmId: string;
  farmName: string;
  plotName: string | null;
  cropName: string | null;
  reporterName: string;
  level: string;
  type: string;
  severity: string;
  description: string;
  impactPercent: string | null;
  status: string;
  createdAt: string;
  primaryImageUrl: string | null;
  media: Array<{ id: string; url: string | null }>;
  followUps: FollowUp[];
};

type CropStage = "Germination" | "Establishment" | "Vegetative" | "Flowering" | "Fruiting" | "Harvesting";

export function OfficerSignalsConsole() {
  const toast = useToast();

  // Primary state
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportingMode, setReportingMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ACTIVE" | "URGENT" | "RESOLVED" | "SCOUTING">("ACTIVE");
  
  // Interactive modals & expansion
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);
  const [modalActivePhotoIndex, setModalActivePhotoIndex] = useState(0);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal interaction state
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newActionNote, setNewActionNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Crop Scouting / Monitoring form state
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [plots, setPlots] = useState<Array<{ id: string; name: string; cropCycles: Array<{ id: string; cropName: string }> }>>([]);
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedCropId, setSelectedCropId] = useState("");
  const [healthStatus, setHealthStatus] = useState<"GOOD" | "POOR">("GOOD");
  const [cropStage, setCropStage] = useState<CropStage>("Vegetative");
  const [monitoringRemarks, setMonitoringRemarks] = useState("");
  const [monitoringImpact, setMonitoringImpact] = useState<number | "">("");
  const [monitoringPending, setMonitoringPending] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/incidents?limit=50");
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchIncidents();
  }, []);

  // Reset modal active photo when selected incident changes
  useEffect(() => {
    setModalActivePhotoIndex(0);
  }, [selectedIncident]);

  // Fetch farms for routine crop scouting
  useEffect(() => {
    if (activeFilter !== "SCOUTING") return;
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setFarms(data);
        if (data.length > 0 && !selectedFarmId) setSelectedFarmId(data[0].id);
      });
  }, [activeFilter, selectedFarmId]);

  // Fetch plots when farm changes in scouting
  useEffect(() => {
    if (!selectedFarmId) {
      setPlots([]);
      return;
    }
    fetch(`/api/farms/${selectedFarmId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setPlots(data?.plots || []);
        if (data?.plots?.length > 0) {
          setSelectedPlotId(data.plots[0].id);
          if (data.plots[0].cropCycles?.length > 0) {
            setSelectedCropId(data.plots[0].cropCycles[0].id);
          }
        }
      });
  }, [selectedFarmId]);

  const activePlot = plots.find((p) => p.id === selectedPlotId);
  const activeCrops = activePlot?.cropCycles || [];

  // Scoped Incident Calculations
  const activeIncidents = useMemo(() => {
    return incidents.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED");
  }, [incidents]);

  const urgentIncidents = useMemo(() => {
    return incidents.filter(
      (i) => (i.severity === "CRITICAL" || i.severity === "HIGH") && i.status !== "RESOLVED" && i.status !== "CLOSED"
    );
  }, [incidents]);

  const resolvedIncidents = useMemo(() => {
    return incidents.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED");
  }, [incidents]);

  // Filtered list based on active pill and search query
  const filteredIncidents = useMemo(() => {
    let list: IncidentItem[] = [];
    if (activeFilter === "ACTIVE") list = activeIncidents;
    else if (activeFilter === "URGENT") list = urgentIncidents;
    else if (activeFilter === "RESOLVED") list = resolvedIncidents;
    else return [];

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((i) => {
      return (
        i.type.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.plotName && i.plotName.toLowerCase().includes(q)) ||
        (i.cropName && i.cropName.toLowerCase().includes(q)) ||
        i.farmName.toLowerCase().includes(q)
      );
    });
  }, [activeFilter, activeIncidents, urgentIncidents, resolvedIncidents, searchQuery]);

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Status Updater in Modal
  const handleUpdateStatus = async (newStatus: "OPEN" | "ACKNOWLEDGED" | "RESOLVED") => {
    if (!selectedIncident) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(`Incident marked as ${newStatus.toLowerCase()}`);
      setSelectedIncident((prev) => (prev ? { ...prev, status: newStatus } : null));
      setIncidents((prev) =>
        prev.map((i) => (i.id === selectedIncident.id ? { ...i, status: newStatus } : i))
      );
    } catch {
      toast.error("Could not update incident status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Add Mitigation Follow-up Note in Modal
  const handleAddFollowUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !newActionNote.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MITIGATION_UPDATE",
          remarks: newActionNote.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record follow-up");
      }

      const body = await res.json();
      toast.success("Mitigation follow-up recorded");
      setNewActionNote("");

      const newFollowUp: FollowUp = {
        id: body.id || String(Date.now()),
        authorName: "You",
        action: "MITIGATION_UPDATE",
        remarks: newActionNote.trim(),
        createdAt: new Date().toISOString(),
      };

      setSelectedIncident((prev) =>
        prev ? { ...prev, followUps: [newFollowUp, ...prev.followUps] } : null
      );
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === selectedIncident.id ? { ...i, followUps: [newFollowUp, ...i.followUps] } : i
        )
      );
    } catch {
      toast.error("Could not record follow-up");
    } finally {
      setSubmittingNote(false);
    }
  };

  // Routine Scouting Form Submit
  const handleMonitoringSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCropId) {
      toast.error("Please select a plot and crop cycle.");
      return;
    }

    setMonitoringPending(true);
    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropCycleId: selectedCropId,
          status: healthStatus,
          stage: cropStage,
          impactPercent: healthStatus === "POOR" && monitoringImpact !== "" ? Number(monitoringImpact) : null,
          remarks: monitoringRemarks.trim() || null,
          mediaIds: [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to log crop health.");
      }

      toast.success("Crop observation logged successfully.");
      setMonitoringRemarks("");
      setMonitoringImpact("");
      setActiveFilter("ACTIVE");
    } catch (err: any) {
      toast.error(err.message || "Failed to log observation.");
    } finally {
      setMonitoringPending(false);
    }
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 110 }}>
      {/* 1. COMPACT CONSOLE HEADER (Matches Tasks Page Density) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 750,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {reportingMode
              ? "New Hazard Report"
              : activeFilter === "SCOUTING"
              ? "Crop Health Scouting"
              : "Field Incidents"}
          </h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor:
                  urgentIncidents.length > 0
                    ? "var(--red)"
                    : activeIncidents.length > 0
                    ? "var(--amber)"
                    : "var(--green)",
              }}
            />
            <span className="muted" style={{ fontSize: "11.5px", fontWeight: 550 }}>
              {activeIncidents.length > 0
                ? `${activeIncidents.length} active • ${urgentIncidents.length} urgent`
                : "All clear (0 active hazards)"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {!reportingMode && activeFilter !== "SCOUTING" && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSearch((v) => !v)}
                style={{
                  borderRadius: "9999px",
                  width: 34,
                  height: 34,
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: showSearch ? "var(--stone)" : "transparent",
                }}
                title="Search incidents"
              >
                <Icons.Search size={13} />
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={fetchIncidents}
                style={{
                  borderRadius: "9999px",
                  width: 34,
                  height: 34,
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                }}
                title="Refresh"
              >
                <Icons.Refresh size={13} />
              </button>
            </>
          )}

          {reportingMode ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReportingMode(false)}
              style={{
                borderRadius: "9999px",
                padding: "0 13px",
                fontWeight: 650,
                fontSize: "12px",
                height: 34,
              }}
            >
              ← Back to Feed
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-green"
              onClick={() => setReportingMode(true)}
              style={{
                borderRadius: "9999px",
                padding: "0 13px",
                fontWeight: 700,
                fontSize: "12px",
                height: 34,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Icons.Plus size={13} />
              <span>Report Hazard</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Search Bar */}
      {showSearch && !reportingMode && activeFilter !== "SCOUTING" && (
        <div style={{ position: "relative", width: "100%" }}>
          <input
            type="text"
            placeholder="Search by title, plot, crop, or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              height: "32px",
              borderRadius: "9999px",
              border: "1px solid var(--line)",
              backgroundColor: "var(--card)",
              padding: "0 28px 0 30px",
              fontSize: "12px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <div style={{ position: "absolute", left: 10, top: 9, color: "var(--muted)", pointerEvents: "none" }}>
            <Icons.Search size={12} />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 8,
                top: 6,
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "14px",
                padding: "2px 4px",
              }}
            >
              &times;
            </button>
          )}
        </div>
      )}

      {/* 2. SINGLE HORIZONTAL SEGMENTED PILL RAIL */}
      {!reportingMode && (
        <div
          className="schedule-pill-rail"
          style={{
            display: "flex",
            gap: 5,
            overflowX: "auto",
            padding: "2px 0",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {[
            { key: "ACTIVE", label: "Active", count: activeIncidents.length },
            { key: "URGENT", label: "Urgent", count: urgentIncidents.length },
            { key: "RESOLVED", label: "Resolved", count: resolvedIncidents.length },
            { key: "SCOUTING", label: "Crop Scouting", count: null },
          ].map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key as any)}
                style={{
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: active ? 700 : 500,
                  borderRadius: "9999px",
                  border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
                  backgroundColor: active ? "var(--ink)" : "var(--card)",
                  color: active ? "var(--canvas)" : "var(--muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.12s ease",
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      opacity: active ? 0.9 : 0.6,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. REPORTING MODE FORM */}
      {reportingMode && (
        <IncidentReportForm
          onSuccess={() => {
            setReportingMode(false);
            void fetchIncidents();
          }}
          onCancel={() => setReportingMode(false)}
        />
      )}

      {/* 4. ROUTINE CROP SCOUTING TAB */}
      {!reportingMode && activeFilter === "SCOUTING" && (
        <form
          onSubmit={handleMonitoringSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "16px 18px",
            borderRadius: "16px",
            border: "1px solid var(--card)",
            backgroundColor: "var(--card)",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--green-dark)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              ROUTINE FIELD OBSERVATION
            </span>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)", margin: "2px 0 0" }}>
              Log Crop Health Observation
            </h2>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
              Record vigor, canopy development, and agronomy notes.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: farms.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
            {farms.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span className="muted" style={{ fontSize: "11px" }}>Estate</span>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="input-field"
                  style={{ height: "32px", fontSize: "12px", borderRadius: "8px" }}
                  required
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="muted" style={{ fontSize: "11px" }}>Plot</span>
              <select
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
                className="input-field"
                style={{ height: "32px", fontSize: "12px", borderRadius: "8px" }}
                required
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeCrops.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="muted" style={{ fontSize: "11px" }}>Active Crop Cycle</span>
              <select
                value={selectedCropId}
                onChange={(e) => setSelectedCropId(e.target.value)}
                className="input-field"
                style={{ height: "32px", fontSize: "12px", borderRadius: "8px" }}
                required
              >
                {activeCrops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cropName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Condition Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>Crop Condition</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => setHealthStatus("GOOD")}
                className="select-chip select-chip-pill"
                data-selected={healthStatus === "GOOD"}
                style={{ height: 36, fontSize: "12px", flex: 1 }}
              >
                <Icons.CheckCircle size={14} />
                <span>Healthy / Thriving</span>
              </button>

              <button
                type="button"
                onClick={() => setHealthStatus("POOR")}
                className="select-chip select-chip-pill"
                data-selected={healthStatus === "POOR"}
                data-tone="red"
                style={{ height: 36, fontSize: "12px", flex: 1 }}
              >
                <Icons.AlertTriangle size={14} />
                <span>Distressed / Poor</span>
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: healthStatus === "POOR" ? "1fr 1fr" : "1fr", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="muted" style={{ fontSize: "11px" }}>Growth Stage</span>
              <select
                value={cropStage}
                onChange={(e: any) => setCropStage(e.target.value)}
                className="input-field"
                style={{ height: "32px", fontSize: "12px", borderRadius: "8px" }}
              >
                <option value="Germination">Germination</option>
                <option value="Establishment">Establishment</option>
                <option value="Vegetative">Vegetative</option>
                <option value="Flowering">Flowering</option>
                <option value="Fruiting">Fruiting</option>
                <option value="Harvesting">Harvesting</option>
              </select>
            </div>

            {healthStatus === "POOR" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span className="muted" style={{ fontSize: "11px" }}>Estimated Yield Impact (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 20"
                  value={monitoringImpact}
                  onChange={(e) =>
                    setMonitoringImpact(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="input-field"
                  style={{ height: "32px", fontSize: "12px", borderRadius: "8px" }}
                  required
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span className="muted" style={{ fontSize: "11px" }}>Agronomy Remarks</span>
            <textarea
              rows={2}
              className="input-field"
              placeholder="Record leaf color, canopy coverage, vigor, or irrigation observations..."
              value={monitoringRemarks}
              onChange={(e) => setMonitoringRemarks(e.target.value)}
              style={{ fontSize: "12px", borderRadius: "8px" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <button
              type="submit"
              className="btn btn-green"
              disabled={monitoringPending}
              style={{
                borderRadius: "9999px",
                height: 34,
                padding: "0 18px",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Icons.Check size={14} />
              <span>{monitoringPending ? "Recording…" : "Save Crop Observation"}</span>
            </button>
          </div>
        </form>
      )}

      {/* 5. HIGH-DENSITY INCIDENT CARDS (SQUARE IMAGE + TAP TO EXPAND) */}
      {!reportingMode && activeFilter !== "SCOUTING" && (
        <>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <CardSkeleton />
              <CardSkeleton />
            </div>
          )}

          {!loading && filteredIncidents.length === 0 && (
            <EmptyState
              title={
                activeFilter === "ACTIVE"
                  ? "No Active Hazards"
                  : activeFilter === "URGENT"
                  ? "No Urgent Incidents"
                  : "No Resolved Incidents"
              }
              description={
                activeFilter === "ACTIVE"
                  ? "All plots and operations are currently running without active issues."
                  : activeFilter === "URGENT"
                  ? "No high-priority or critical escalations logged for your estate."
                  : "Cleared and resolved incidents will be archived here."
              }
            />
          )}

          {!loading && filteredIncidents.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredIncidents.map((inc) => {
                const isResolved = inc.status === "RESOLVED" || inc.status === "CLOSED";
                const isCritical = inc.severity === "CRITICAL";
                const isHigh = inc.severity === "HIGH";
                const displayImage = inc.primaryImageUrl || inc.media.find((m) => m.url)?.url || null;

                return (
                  <article
                    key={inc.id}
                    className={`officer-task-card${isResolved ? " is-done" : ""}`}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "4px 12px 4px 4px",
                      alignItems: "center",
                    }}
                  >
                    {/* SQUARE IMAGE THUMBNAIL (TAP TO EXPAND) */}
                    {displayImage ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPhotoUrl(displayImage);
                        }}
                        title="Tap to expand photo"
                        style={{
                          position: "relative",
                          width: 90,
                          height: 90,
                          minWidth: 90,
                          maxWidth: 90,
                          borderRadius: "10px",
                          overflow: "hidden",
                          backgroundColor: "var(--stone)",
                          cursor: "zoom-in",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={displayImage}
                          alt={inc.type}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        {/* Zoom tag */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: 5,
                            right: 5,
                            backgroundColor: "rgba(0, 0, 0, 0.65)",
                            color: "#fff",
                            borderRadius: 4,
                            padding: "1px 4px",
                            fontSize: "8.5px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                            backdropFilter: "blur(2px)",
                          }}
                        >
                          <Icons.Maximize2 size={9} />
                          {inc.media.length > 1 && <span>{inc.media.length}</span>}
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setSelectedIncident(inc)}
                        style={{
                          width: 90,
                          height: 90,
                          minWidth: 90,
                          maxWidth: 90,
                          borderRadius: "10px",
                          backgroundColor: "var(--stone)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 3,
                          color: "var(--muted)",
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      >
                        <Icons.AlertTriangle size={18} style={{ opacity: 0.45 }} />
                        <span style={{ fontSize: "9px", fontWeight: 600 }}>No Photo</span>
                      </div>
                    )}

                    {/* CONTENT & METADATA HIERARCHY */}
                    <div
                      onClick={() => setSelectedIncident(inc)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        height: 90,
                        gap: 2,
                        flex: 1,
                        minWidth: 0,
                        cursor: "pointer",
                      }}
                    >
                      {/* Row 1: Plot on Left, Severity + Status on Right */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--green-dark)",
                            backgroundColor: "var(--green-light)",
                            padding: "2px 7px",
                            borderRadius: "6px",
                            maxWidth: "60%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {inc.plotName ? inc.plotName.replace(/^Plot:\s*/i, "") : "Main Field"}
                          {inc.cropName ? ` • ${inc.cropName.split(" ")[0]}` : ""}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          {isCritical ? (
                            <span
                              style={{
                                fontSize: "9.5px",
                                fontWeight: 750,
                                textTransform: "uppercase",
                                color: "var(--red)",
                                backgroundColor: "var(--red-light)",
                                padding: "1px 5px",
                                borderRadius: "9999px",
                              }}
                            >
                              Critical
                            </span>
                          ) : isHigh ? (
                            <span
                              style={{
                                fontSize: "9.5px",
                                fontWeight: 750,
                                textTransform: "uppercase",
                                color: "var(--amber)",
                                backgroundColor: "var(--amber-light)",
                                padding: "1px 5px",
                                borderRadius: "9999px",
                              }}
                            >
                              High
                            </span>
                          ) : null}

                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 650,
                              padding: "1px 6px",
                              borderRadius: "9999px",
                              color: isResolved ? "var(--green-dark)" : "var(--muted)",
                              backgroundColor: isResolved ? "var(--green-light)" : "rgba(0,0,0,0.04)",
                            }}
                          >
                            {isResolved ? "✓ Resolved" : inc.status === "ACKNOWLEDGED" ? "In Review" : "Open"}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Title */}
                      <h3
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "var(--ink)",
                          margin: 0,
                          lineHeight: 1.25,
                          letterSpacing: "-0.01em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {inc.type}
                      </h3>

                      {/* Row 3: Description (Clean 2-line clamp) */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: "11.5px",
                          color: "var(--ink-soft)",
                          lineHeight: 1.3,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {inc.description}
                      </p>

                      {/* Row 4: Footer */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "10.5px",
                          color: "var(--muted)",
                        }}
                      >
                        <span>
                          {formatTimeAgo(inc.createdAt)} • by {inc.reporterName.split(" ")[0]}
                        </span>

                        {inc.followUps.length > 0 && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 650,
                              color: "var(--green-dark)",
                              backgroundColor: "var(--green-light)",
                              padding: "1px 6px",
                              borderRadius: "9999px",
                            }}
                          >
                            💬 {inc.followUps.length} note{inc.followUps.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 6. FULL-SCREEN LIGHTBOX MODAL (EXPAND PHOTO DIRECTLY) */}
      {expandedPhotoUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => setExpandedPhotoUrl(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedPhotoUrl(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
            title="Close image"
          >
            <Icons.X size={18} />
          </button>

          <img
            src={expandedPhotoUrl}
            alt="Field evidence"
            style={{
              maxWidth: "92vw",
              maxHeight: "80vh",
              objectFit: "contain",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <span
            style={{
              marginTop: 14,
              color: "rgba(255,255,255,0.75)",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Tap anywhere to close
          </span>
        </div>
      )}

      {/* 7. INTERACTIVE INCIDENT DETAIL & RESOLUTION MODAL */}
      {selectedIncident && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 14,
          }}
          onClick={() => setSelectedIncident(null)}
        >
          <div
            style={{
              maxWidth: 480,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "var(--card)",
              borderRadius: "20px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "var(--shadow-modal)",
              border: "1px solid var(--card)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      padding: "2px 7px",
                      borderRadius: "9999px",
                      color:
                        selectedIncident.severity === "CRITICAL"
                          ? "var(--red)"
                          : selectedIncident.severity === "HIGH"
                          ? "var(--amber)"
                          : "var(--muted)",
                      backgroundColor:
                        selectedIncident.severity === "CRITICAL"
                          ? "var(--red-light)"
                          : selectedIncident.severity === "HIGH"
                          ? "var(--amber-light)"
                          : "rgba(0,0,0,0.06)",
                    }}
                  >
                    {selectedIncident.severity}
                  </span>
                  <span className="muted" style={{ fontSize: "11.5px" }}>
                    📍 {selectedIncident.plotName || "Estate Wide"}
                    {selectedIncident.cropName ? ` • ${selectedIncident.cropName}` : ""}
                  </span>
                </div>
                <h2 style={{ fontSize: "16.5px", fontWeight: 750, color: "var(--ink)", margin: 0, lineHeight: 1.25 }}>
                  {selectedIncident.type}
                </h2>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedIncident(null)}
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: "9999px",
                  display: "grid",
                  placeItems: "center",
                }}
                title="Close"
              >
                <Icons.X size={14} />
              </button>
            </div>

            {/* High-Res Image Preview with Thumbnails */}
            {selectedIncident.media.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: "1px solid var(--line)",
                    backgroundColor: "#000",
                    position: "relative",
                  }}
                >
                  <img
                    src={
                      selectedIncident.media[modalActivePhotoIndex]?.url ||
                      selectedIncident.primaryImageUrl ||
                      ""
                    }
                    alt={selectedIncident.type}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>

                {/* Multiple Photos Thumbnails Rail */}
                {selectedIncident.media.length > 1 && (
                  <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                    {selectedIncident.media.map((m, idx) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModalActivePhotoIndex(idx)}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: modalActivePhotoIndex === idx ? "2px solid var(--ink)" : "1px solid var(--line)",
                          padding: 0,
                          cursor: "pointer",
                          opacity: modalActivePhotoIndex === idx ? 1 : 0.6,
                        }}
                      >
                        <img src={m.url || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description & Impact */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                backgroundColor: "var(--stone)",
                border: "1px solid var(--stone)",
                fontSize: "12.5px",
                color: "var(--ink)",
                lineHeight: 1.45,
              }}
            >
              <div className="muted" style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>
                Field Observations &amp; Description
              </div>
              <p style={{ margin: 0 }}>{selectedIncident.description}</p>
              {selectedIncident.impactPercent && (
                <div style={{ marginTop: 6, fontSize: "11.5px", fontWeight: 600, color: "var(--amber)" }}>
                  ⚠️ Estimated yield impact: {selectedIncident.impactPercent}%
                </div>
              )}
            </div>

            {/* Quick Status Updater */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink)" }}>Update Hazard Status</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {(["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const).map((st) => {
                  const active = selectedIncident.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => handleUpdateStatus(st)}
                      style={{
                        height: 32,
                        borderRadius: "9999px",
                        fontSize: "11.5px",
                        fontWeight: active ? 750 : 500,
                        border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
                        backgroundColor: active
                          ? st === "RESOLVED"
                            ? "var(--green)"
                            : "var(--ink)"
                          : "var(--canvas)",
                        color: active ? "#fff" : "var(--muted)",
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                      }}
                    >
                      {st === "OPEN" ? "Open" : st === "ACKNOWLEDGED" ? "In Review" : "✓ Resolved"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mitigation Timeline / Follow-ups */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                  Mitigation Log &amp; Follow-ups ({selectedIncident.followUps.length})
                </span>
              </div>

              {selectedIncident.followUps.length === 0 ? (
                <div className="muted" style={{ fontSize: "11.5px" }}>
                  No follow-up mitigation notes logged yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                  {selectedIncident.followUps.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        padding: "7px 10px",
                        borderRadius: "8px",
                        backgroundColor: "var(--stone)",
                        border: "1px solid var(--stone)",
                        fontSize: "11.5px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "10.5px" }}>
                        <span style={{ fontWeight: 650, color: "var(--ink)" }}>{f.authorName}</span>
                        <span>{formatTimeAgo(f.createdAt)}</span>
                      </div>
                      <p style={{ margin: "2px 0 0", color: "var(--ink)", lineHeight: 1.35 }}>
                        {f.remarks || f.action}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Note Form */}
              <form onSubmit={handleAddFollowUp} style={{ display: "flex", gap: 6, marginTop: 2 }}>
                <input
                  type="text"
                  placeholder="Add mitigation update..."
                  value={newActionNote}
                  onChange={(e) => setNewActionNote(e.target.value)}
                  style={{
                    flex: 1,
                    height: "32px",
                    borderRadius: "9999px",
                    border: "1px solid var(--line)",
                    backgroundColor: "var(--canvas)",
                    padding: "0 12px",
                    fontSize: "11.5px",
                    color: "var(--ink)",
                    outline: "none",
                  }}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingNote}
                  style={{
                    borderRadius: "9999px",
                    height: "32px",
                    padding: "0 14px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                  }}
                >
                  {submittingNote ? "…" : "Post"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
