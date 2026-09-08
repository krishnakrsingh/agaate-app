"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from "react";
import { Icons } from "./icons";
import { IncidentReportForm } from "./incident-report-form";
import { LocationRequestForm } from "./location-request-form";
import { EmptyState } from "./ui/empty-state";
import { CardSkeleton } from "./ui/skeleton";
import { useToast } from "./ui/toast";

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
  followUps: Array<{ id: string; authorName: string; action: string; remarks: string | null; createdAt: string }>;
};

type CropStage = "Germination" | "Establishment" | "Vegetative" | "Flowering" | "Fruiting" | "Harvesting";

export function OfficerSignalsConsole() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"incident" | "monitoring" | "log" | "location">("incident");
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);

  // Monitoring form state
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
      const res = await fetch("/api/incidents?limit=25");
      if (res.ok) {
        setIncidents(await res.json());
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

  // Fetch farms for monitoring tab
  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setFarms(data);
        if (data.length > 0 && !selectedFarmId) setSelectedFarmId(data[0].id);
      });
  }, [selectedFarmId]);

  // Fetch plots when farm changes
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

  const handleMonitoringSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      toast.error(err.message || "Failed to log observation.");
    } finally {
      setMonitoringPending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* TABS NAVIGATION */}
      <div className="tabs-nav" style={{ margin: 0 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "incident" ? "active" : ""}`}
          onClick={() => setActiveTab("incident")}
        >
          <Icons.AlertTriangle size={15} style={{ color: "var(--red)" }} />
          <span>Report Incident</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "log" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("log");
            void fetchIncidents();
          }}
        >
          <Icons.Image size={15} />
          <span>Incident Evidence Log ({incidents.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "monitoring" ? "active" : ""}`}
          onClick={() => setActiveTab("monitoring")}
        >
          <Icons.Eye size={15} />
          <span>Crop Health Observation</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "location" ? "active" : ""}`}
          onClick={() => setActiveTab("location")}
        >
          <Icons.MapPin size={15} />
          <span>Boundary Request</span>
        </button>
      </div>

      {/* TAB 1: REPORT FIELD INCIDENT */}
      {activeTab === "incident" && (
        <IncidentReportForm
          onSuccess={() => {
            void fetchIncidents();
            setActiveTab("log");
          }}
        />
      )}

      {/* TAB 2: INCIDENT EVIDENCE LOG WITH PHOTOS */}
      {activeTab === "log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, color: "var(--ink)" }}>
                Estate Field Incident Evidence Stream
              </h3>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                Verified photographic hazard reports and mitigation follow-up statuses.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={fetchIncidents}
            >
              <Icons.Refresh size={14} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : incidents.length === 0 ? (
            <EmptyState
              title="No Incidents Reported"
              description="No agricultural hazards or incidents recorded for your estates yet."
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="compact-card hover-glow"
                  style={{
                    padding: 16,
                    gap: 12,
                    borderLeft:
                      inc.severity === "CRITICAL"
                        ? "4px solid var(--red)"
                        : inc.severity === "HIGH"
                        ? "4px solid var(--amber)"
                        : "4px solid var(--blue)",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedIncident(inc)}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {/* Image thumbnail */}
                    <div
                      style={{
                        width: 90,
                        height: 90,
                        minWidth: 90,
                        borderRadius: "var(--radius-xs)",
                        overflow: "hidden",
                        border: "1px solid var(--line)",
                        backgroundColor: "var(--canvas)",
                        position: "relative",
                      }}
                    >
                      {inc.primaryImageUrl ? (
                        <img
                          src={inc.primaryImageUrl}
                          alt={inc.type}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            color: "var(--muted)",
                            fontSize: 10,
                            backgroundColor: "var(--line)",
                          }}
                        >
                          <Icons.AlertTriangle size={22} style={{ color: "var(--amber)" }} />
                          <span>No Photo</span>
                        </div>
                      )}
                      {inc.media.length > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: 2,
                            right: 2,
                            backgroundColor: "rgba(0, 0, 0, 0.65)",
                            color: "#fff",
                            borderRadius: 2,
                            padding: "1px 4px",
                            fontSize: 9,
                          }}
                        >
                          {inc.media.length} photo{inc.media.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                          {inc.type}
                        </span>
                        <span
                          className={`badge ${
                            inc.severity === "CRITICAL"
                              ? "badge-danger"
                              : inc.severity === "HIGH"
                              ? "badge-amber"
                              : "badge-blue"
                          }`}
                          style={{ fontSize: 10 }}
                        >
                          {inc.severity}
                        </span>
                      </div>

                      <div className="muted" style={{ fontSize: 12 }}>
                        {inc.farmName} {inc.plotName ? `• ${inc.plotName}` : ""}
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "var(--ink)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.4,
                        }}
                      >
                        {inc.description}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 11,
                          color: "var(--muted)",
                          marginTop: 2,
                        }}
                      >
                        <span>{new Date(inc.createdAt).toLocaleDateString()}</span>
                        <span className="badge badge-muted" style={{ fontSize: 10 }}>
                          {inc.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DAILY CROP MONITORING */}
      {activeTab === "monitoring" && (
        <form onSubmit={handleMonitoringSubmit} className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div className="form-section-title">Visual Crop Health Observation</div>

          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Target Farm</label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="input-field"
                required
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Target Plot</label>
              <select
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
                className="input-field"
                required
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group wide" style={{ margin: 0 }}>
              <label>Crop Cycle</label>
              <select
                value={selectedCropId}
                onChange={(e) => setSelectedCropId(e.target.value)}
                className="input-field"
                required
              >
                {activeCrops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cropName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Crop Condition</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                className={`btn ${healthStatus === "GOOD" ? "btn-green" : "btn-secondary"}`}
                onClick={() => setHealthStatus("GOOD")}
              >
                <Icons.CheckCircle size={16} />
                <span>Healthy / Thriving</span>
              </button>
              <button
                type="button"
                className={`btn ${healthStatus === "POOR" ? "btn-danger" : "btn-secondary"}`}
                onClick={() => setHealthStatus("POOR")}
              >
                <Icons.AlertTriangle size={16} />
                <span>Distressed / Poor</span>
              </button>
            </div>
          </div>

          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Growth Stage</label>
              <select
                value={cropStage}
                onChange={(e: any) => setCropStage(e.target.value)}
                className="input-field"
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
              <div className="form-group" style={{ margin: 0 }}>
                <label>Estimated Yield Impact (%)</label>
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
                  required
                />
              </div>
            )}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Observations &amp; Agronomy Remarks</label>
            <textarea
              rows={2}
              className="input-field"
              placeholder="Record leaf color, canopy coverage, vigor, or irrigation performance."
              value={monitoringRemarks}
              onChange={(e) => setMonitoringRemarks(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <button
              type="submit"
              className="btn btn-green"
              disabled={monitoringPending}
            >
              <Icons.Check size={15} />
              <span>{monitoringPending ? "Recording…" : "Save Crop Observation"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: LOCATION BOUNDARY REQUEST */}
      {activeTab === "location" && <LocationRequestForm />}

      {/* LIGHTBOX DETAIL MODAL */}
      {selectedIncident && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="compact-card"
            style={{
              maxWidth: 540,
              width: "100%",
              padding: 24,
              gap: 16,
              backgroundColor: "var(--canvas)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span className={`badge ${selectedIncident.severity === "CRITICAL" ? "badge-danger" : "badge-amber"}`}>
                  {selectedIncident.severity}
                </span>
                <h3 style={{ margin: "6px 0 0", fontSize: 18, color: "var(--ink)" }}>
                  {selectedIncident.type}
                </h3>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {selectedIncident.farmName} {selectedIncident.plotName ? `• Plot: ${selectedIncident.plotName}` : ""}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedIncident(null)}
              >
                <Icons.X size={15} />
              </button>
            </div>

            {selectedIncident.primaryImageUrl && (
              <div
                style={{
                  width: "100%",
                  maxHeight: 320,
                  borderRadius: "var(--radius-xs)",
                  overflow: "hidden",
                  border: "1px solid var(--line)",
                  backgroundColor: "#000",
                }}
              >
                <img
                  src={selectedIncident.primaryImageUrl}
                  alt={selectedIncident.type}
                  style={{ width: "100%", maxHeight: 320, objectFit: "contain" }}
                />
              </div>
            )}

            <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
              <span className="label" style={{ fontSize: 11 }}>FIELD OBSERVATIONS</span>
              <p style={{ margin: "4px 0 0" }}>{selectedIncident.description}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedIncident(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
