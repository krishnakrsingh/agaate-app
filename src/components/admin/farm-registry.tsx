"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";
import { FarmForm } from "@/components/farm-form";

interface FarmRow {
  id: string;
  name: string;
  ownerName: string;
  location: string;
  surveyNumber?: string | null;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  totalArea: string | number;
  cultivableArea: string | number;
  measuredAcres?: string | number | null;
  boundaryGeoJson?: string | null;
  status: string;
  setupStage?: string | null;
  setupProgress?: number | null;
  client?: { id: string; name: string; code: string | null } | null;
  _count?: { plots: number; access: number };
  plots?: Array<{ id: string; status: string; cropCycles: Array<{ id: string }> }>;
}

export function FarmRegistry() {
  const [farms, setFarms] = useState<FarmRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [boundaryFilter, setBoundaryFilter] = useState("ALL"); // ALL | HAS_BOUNDARY | NO_BOUNDARY
  const [loading, setLoading] = useState(true);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const loadFarms = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
      sortBy: "updatedAt",
      order: "desc",
    });

    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (stageFilter !== "ALL") params.set("setupStage", stageFilter);

    fetch(`/api/farms?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load farms.");
        const count = Number(res.headers.get("X-Total-Count")) || 0;
        const data = await res.json();
        setTotal(count);
        let list: FarmRow[] = Array.isArray(data) ? data : [];
        if (boundaryFilter === "HAS_BOUNDARY") {
          list = list.filter((f) => !!f.boundaryGeoJson);
        } else if (boundaryFilter === "NO_BOUNDARY") {
          list = list.filter((f) => !f.boundaryGeoJson);
        }
        setFarms(list);
      })
      .catch(() => {
        setFarms([]);
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, statusFilter, stageFilter, boundaryFilter, page]);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. Filter & Search Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: 16,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
          <div style={{ position: "relative", minWidth: 260, maxWidth: 360, flex: 1 }}>
            <Icons.Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farm, survey #, location, client..."
              style={{ paddingLeft: 32, width: "100%", fontSize: 13 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <Icons.X size={13} />
              </button>
            )}
          </div>

          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: "auto", fontSize: 13 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Production</option>
            <option value="SETUP">Turnkey Setup</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            className="input-field"
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: "auto", fontSize: 13 }}
          >
            <option value="ALL">All Setup Stages</option>
            <option value="SURVEY_SOIL_TEST">1. Survey & Soil</option>
            <option value="PLOT_DEMARCATION">2. Plot Demarcation</option>
            <option value="BED_SOIL_PREP">3. Bed & Soil Prep</option>
            <option value="IRRIGATION_LAYOUT">4. Irrigation Setup</option>
            <option value="HANDED_OVER">5. Handed Over</option>
          </select>

          <select
            className="input-field"
            value={boundaryFilter}
            onChange={(e) => {
              setBoundaryFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: "auto", fontSize: 13 }}
          >
            <option value="ALL">All Boundaries</option>
            <option value="HAS_BOUNDARY">Demarcated Boundary</option>
            <option value="NO_BOUNDARY">Missing Boundary</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowIntakeModal(true)}
          >
            <Icons.Plus size={14} />
            <span>Intake New Farm</span>
          </button>
        </div>
      </div>

      {/* 2. Farm Registry Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th>Farm & Cadastral</th>
                <th>Client / Owner</th>
                <th>Location</th>
                <th>Acreage</th>
                <th>Plots</th>
                <th>Boundary Status</th>
                <th>Operational State</th>
                <th style={{ textAlign: "right" }}>Command Center</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
                    Loading portfolio registry…
                  </td>
                </tr>
              ) : farms.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 48 }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                      No farms match the selected criteria
                    </div>
                    <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                      Try adjusting the search query or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                farms.map((farm) => {
                  const hasBoundary = !!farm.boundaryGeoJson;
                  const plotCount = farm._count?.plots ?? farm.plots?.length ?? 0;
                  const activeCycles = farm.plots?.reduce(
                    (acc, p) => acc + (p.cropCycles?.length || 0),
                    0
                  ) || 0;

                  return (
                    <tr key={farm.id}>
                      <td>
                        <Link
                          href={`/farms/${farm.id}`}
                          style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}
                        >
                          {farm.name}
                        </Link>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {farm.surveyNumber ? `Sy #${farm.surveyNumber}` : "Sy # Pending"}
                        </div>
                      </td>

                      <td>
                        {farm.client ? (
                          <div>
                            <span style={{ fontWeight: 500, color: "var(--ink)" }}>{farm.client.name}</span>
                            {farm.client.code && (
                              <span className="badge badge-stone" style={{ fontSize: 10, marginLeft: 6 }}>
                                {farm.client.code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="muted">{farm.ownerName}</span>
                        )}
                      </td>

                      <td>
                        <div style={{ color: "var(--ink)" }}>{farm.location}</div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {[farm.district, farm.state].filter(Boolean).join(", ") || "—"}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                          {farm.totalArea} ac
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {farm.cultivableArea} ac cultivable
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{plotCount}</span>
                        {activeCycles > 0 && (
                          <div className="muted" style={{ fontSize: 11 }}>
                            {activeCycles} active cycles
                          </div>
                        )}
                      </td>

                      <td>
                        {hasBoundary ? (
                          <span
                            className="badge badge-green"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}
                          >
                            <Icons.Check size={11} />
                            <span>
                              {farm.measuredAcres ? `${farm.measuredAcres} ac` : "Demarcated"}
                            </span>
                          </span>
                        ) : (
                          <span
                            className="badge badge-amber"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}
                          >
                            <Icons.AlertTriangle size={11} />
                            <span>Missing Boundary</span>
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <StatusBadge status={farm.status} />
                          {farm.status === "SETUP" && farm.setupStage && (
                            <span className="badge badge-stone" style={{ fontSize: 10 }}>
                              {farm.setupStage.replaceAll("_", " ")}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/farms/${farm.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          <span>Open Cockpit</span>
                          <Icons.ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Pagination Footer */}
        {total > limit && (
          <div
            style={{
              padding: "12px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid var(--line)",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total.toLocaleString()} estates
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Intake New Farm Modal */}
      {showIntakeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIntakeModal(false);
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: 640,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                  Intake New Farm Estate
                </h2>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                  Provision cadastral baseline, owner assignment, and initial setup boundaries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIntakeModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <Icons.X size={18} />
              </button>
            </div>

            <FarmForm />
          </div>
        </div>
      )}
    </div>
  );
}
