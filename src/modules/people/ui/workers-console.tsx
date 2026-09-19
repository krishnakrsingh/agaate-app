"use client";
import { useState, FormEvent, useMemo } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

export type FarmWorker = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isSupervisor: boolean;
  active: boolean;
  createdAt: string;
  assignedFarm?: { id: string; name: string } | null;
};

interface WorkersConsoleProps {
  farmId: string;
  farmName: string;
  allFarms?: Array<{ id: string; name: string; location?: string }>;
  initialWorkers: FarmWorker[];
}

export function WorkersConsole({
  farmId,
  farmName,
  allFarms = [],
  initialWorkers,
}: WorkersConsoleProps) {
  const toast = useToast();
  const [workers, setWorkers] = useState<FarmWorker[]>(initialWorkers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "SUPERVISOR" | "LABORER">("ALL");
  const [estateFilter, setEstateFilter] = useState<string>("ALL");
  const [activeOnly, setActiveOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [showAddModal, setShowAddModal] = useState(false);

  // New worker form
  const [createFarmId, setCreateFarmId] = useState(farmId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [pending, setPending] = useState(false);

  // Handover card state
  const [recentWorker, setRecentWorker] = useState<{
    name: string;
    phone: string;
    password: string;
    isSupervisor: boolean;
    farmName: string;
  } | null>(null);

  // Assign / Reassign Farm Officer modal state (Strict 1:1 rule)
  const [assignModalWorker, setAssignModalWorker] = useState<FarmWorker | null>(null);
  const [selectedAssignFarmId, setSelectedAssignFarmId] = useState<string>(farmId);
  const [assignPending, setAssignPending] = useState(false);

  const generateSimplePassword = () => {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
    let pass = "";
    for (let i = 0; i < 9; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // ponytail: API requires min 12 chars — Ag@ (3) + 9 = 12
    setPassword("Ag@" + pass);
  };

  const handleCreateWorker = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !password.trim()) {
      toast.show("Name, mobile number, and password are required", "error");
      return;
    }

    const chosenFarmId = createFarmId || farmId;
    const chosenFarmObj =
      allFarms.find((f) => f.id === chosenFarmId) || { id: chosenFarmId, name: farmName };

    setPending(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          password: password.trim(),
          role: "FARM_OFFICER",
          isSupervisor,
          farmId: chosenFarmId,
          farmIds: [chosenFarmId],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to hire farm worker");
      }

      const newWorker: FarmWorker = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone || phone.trim(),
        role: data.role,
        isSupervisor: data.isSupervisor ?? isSupervisor,
        active: data.active,
        createdAt: data.createdAt,
        assignedFarm: { id: chosenFarmObj.id, name: chosenFarmObj.name },
      };

      setWorkers([newWorker, ...workers]);
      setRecentWorker({
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim(),
        isSupervisor,
        farmName: chosenFarmObj.name,
      });

      toast.show("Worker account provisioned successfully!", "success");
      setShowAddModal(false);
      setName("");
      setPhone("");
      setPassword("");
      setIsSupervisor(false);
    } catch (err: any) {
      toast.show(err.message || "Could not hire worker", "error");
    } finally {
      setPending(false);
    }
  };

  const handleAssignOfficer = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignModalWorker || !selectedAssignFarmId) return;

    setAssignPending(true);
    try {
      const res = await fetch(`/api/farms/${selectedAssignFarmId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: assignModalWorker.id, canManage: true }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign farm officer");
      }

      const assignedFarmObj = allFarms.find((f) => f.id === selectedAssignFarmId) || {
        id: selectedAssignFarmId,
        name: farmName,
      };

      setWorkers((prev) =>
        prev.map((w) =>
          w.id === assignModalWorker.id
            ? {
                ...w,
                isSupervisor: true,
                assignedFarm: { id: assignedFarmObj.id, name: assignedFarmObj.name },
              }
            : w
        )
      );

      toast.show(
        `${assignModalWorker.name} is now Farm Officer of ${assignedFarmObj.name}!`,
        "success"
      );
      setAssignModalWorker(null);
    } catch (err: any) {
      toast.show(err.message || "Failed to assign farm officer", "error");
    } finally {
      setAssignPending(false);
    }
  };

  const handleRevertToLabor = async (worker: FarmWorker) => {
    if (!worker.assignedFarm) {
      setWorkers((prev) =>
        prev.map((w) => (w.id === worker.id ? { ...w, isSupervisor: false } : w))
      );
      return;
    }

    if (
      !window.confirm(
        `Revert ${worker.name} from Farm Officer back to Labor? They will no longer manage ${worker.assignedFarm.name}.`
      )
    ) {
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/farms/${worker.assignedFarm.id}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: worker.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revert worker to labor");
      }

      setWorkers((prev) =>
        prev.map((w) =>
          w.id === worker.id
            ? {
                ...w,
                isSupervisor: false,
                assignedFarm: null,
              }
            : w
        )
      );
      toast.show(`${worker.name} reverted to Farm Laborer.`, "success");
    } catch (err: any) {
      toast.show(err.message || "Failed to revert officer", "error");
    } finally {
      setPending(false);
    }
  };

  const copyWorkerCredentials = (w: { name: string; phone?: string | null; password?: string }) => {
    const phoneDisplay = w.phone || "No phone registered";
    const text =
      "🌾 *Agaate Farm Team Credentials*\n\n" +
      "Farm: " + farmName + "\n" +
      "Name: " + w.name + "\n" +
      "Login Phone: " + phoneDisplay + "\n" +
      (w.password ? "Password: " + w.password + "\n" : "") +
      "Login Link: " + window.location.origin + "/login\n\n" +
      "_Open link on phone, enter phone and password to clock in and view daily field tasks._";

    navigator.clipboard.writeText(text);
    toast.show("Worker credentials copied to clipboard!", "success");
  };

  const shareWorkerWhatsApp = (w: { name: string; phone?: string | null; password?: string }) => {
    if (!w.phone) {
      toast.show("No phone number registered for this worker", "error");
      return;
    }
    const text = encodeURIComponent(
      "🌾 *Agaate Farm App Access*\n\n" +
      "Hello " + w.name + ", your login for *" + farmName + "* is ready.\n\n" +
      "*Login Phone*: " + w.phone + "\n" +
      (w.password ? "*Password*: " + w.password + "\n" : "") +
      "*Link*: " + window.location.origin + "/login\n\n" +
      "Use this to clock in and log your daily work."
    );
    const cleanPhone = w.phone.replace(/[^\d]/g, "");
    window.open("https://wa.me/" + cleanPhone + "?text=" + text, "_blank");
  };

  // Filter & Search
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return workers.filter((w) => {
      const matchesSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.phone && w.phone.includes(q)) ||
        w.email.toLowerCase().includes(q) ||
        (w.assignedFarm && w.assignedFarm.name.toLowerCase().includes(q));

      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "SUPERVISOR" && w.isSupervisor) ||
        (roleFilter === "LABORER" && !w.isSupervisor);

      const matchesActive = !activeOnly || w.active;

      const matchesEstate =
        estateFilter === "ALL" ||
        (estateFilter === "UNASSIGNED" && !w.assignedFarm) ||
        (w.assignedFarm?.id === estateFilter);

      return matchesSearch && matchesRole && matchesActive && matchesEstate;
    });
  }, [workers, searchTerm, roleFilter, estateFilter, activeOnly]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedWorkers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

  const supervisorsCount = workers.filter((w) => w.isSupervisor).length;
  const laborersCount = workers.filter((w) => !w.isSupervisor).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── 1. HEADER & QUICK STATS ── */}
      <div className="compact-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              <span className="eyebrow-dot" />
              <span>
                ESTATE WORKFORCE • {allFarms.length > 1 ? `${allFarms.length} ESTATES MANAGED` : farmName}
              </span>
            </div>
            <h1 className="page-title" style={{ margin: 0, fontSize: "22px" }}>
              Farm Workers &amp; On-Site Team
            </h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
              Manage field personnel, assign farm officers (1 farm per officer), and credential on-ground labor.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              generateSimplePassword();
              setCreateFarmId(farmId);
              setShowAddModal(true);
            }}
            className="btn btn-green"
          >
            <Icons.Plus size={16} />
            <span>Add Farm Worker / Manager</span>
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginTop: 20 }}>
          <div style={{ padding: 14, borderRadius: "var(--radius-sm)", background: "var(--stone)", border: "1px solid var(--stone)" }}>
            <div className="mono-label" style={{ fontSize: "11px", color: "var(--muted)" }}>TOTAL ROSTER</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{workers.length}</div>
            <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>Registered accounts</div>
          </div>

          <div style={{ padding: 14, borderRadius: "var(--radius-sm)", background: "var(--stone)", border: "1px solid var(--stone)" }}>
            <div className="mono-label" style={{ fontSize: "11px", color: "var(--green)" }}>FARM OFFICERS</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--green)", marginTop: 2 }}>{supervisorsCount}</div>
            <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>Dedicated 1 per estate</div>
          </div>

          <div style={{ padding: 14, borderRadius: "var(--radius-sm)", background: "var(--stone)", border: "1px solid var(--stone)" }}>
            <div className="mono-label" style={{ fontSize: "11px", color: "var(--muted)" }}>FARM LABOR</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{laborersCount}</div>
            <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>Field hands &amp; local connects</div>
          </div>

          <div style={{ padding: 14, borderRadius: "var(--radius-sm)", background: "var(--stone)", border: "1px solid var(--stone)" }}>
            <div className="mono-label" style={{ fontSize: "11px", color: "var(--muted)" }}>ACTIVE STATUS</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
              {workers.filter((w) => w.active).length} / {workers.length}
            </div>
            <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>Ready for field tasks</div>
          </div>
        </div>
      </div>

      {/* ── 2. RECENT PROVISIONED WORKER ALERT BANNER ── */}
      {recentWorker && (
        <div
          className="compact-card tone-green"
          style={{
            padding: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--green)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icons.Check size={20} />
              </div>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                  Newly Provisioned: {recentWorker.name}{" "}
                  {recentWorker.isSupervisor ? `(Farm Officer - ${recentWorker.farmName})` : "(Labor)"}
                </strong>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "monospace", marginTop: 2 }}>
                  Login Mobile: <strong style={{ color: "var(--ink)" }}>{recentWorker.phone}</strong> &bull; Temporary Password: <strong style={{ color: "var(--ink)" }}>{recentWorker.password}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => copyWorkerCredentials(recentWorker)}
                className="btn btn-sm btn-green"
              >
                <Icons.Copy size={13} />
                <span>Copy Credentials</span>
              </button>
              <button
                type="button"
                onClick={() => shareWorkerWhatsApp(recentWorker)}
                className="btn btn-sm btn-secondary"
              >
                <Icons.Send size={13} />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setRecentWorker(null)}
                className="btn btn-sm btn-link"
                style={{ color: "var(--muted)", fontSize: "12px" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. ROSTER TABLE WITH ADVANCED FILTERING & PAGINATION ── */}
      <div className="compact-card" style={{ padding: 22, gap: 16 }}>
        {/* Controls Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Role Filter Tabs */}
          <div style={{ display: "flex", gap: 4, background: "var(--stone)", padding: 3, borderRadius: "var(--radius-sm)" }}>
            <button
              type="button"
              onClick={() => { setRoleFilter("ALL"); setCurrentPage(1); }}
              className="btn btn-sm"
              style={{
                background: roleFilter === "ALL" ? "var(--canvas)" : "transparent",
                color: roleFilter === "ALL" ? "var(--ink)" : "var(--muted)",
                fontWeight: roleFilter === "ALL" ? 600 : 400,
                boxShadow: roleFilter === "ALL" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                fontSize: "12px",
                padding: "4px 10px",
              }}
            >
              All ({workers.length})
            </button>
            <button
              type="button"
              onClick={() => { setRoleFilter("SUPERVISOR"); setCurrentPage(1); }}
              className="btn btn-sm"
              style={{
                background: roleFilter === "SUPERVISOR" ? "var(--canvas)" : "transparent",
                color: roleFilter === "SUPERVISOR" ? "var(--green)" : "var(--muted)",
                fontWeight: roleFilter === "SUPERVISOR" ? 600 : 400,
                boxShadow: roleFilter === "SUPERVISOR" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                fontSize: "12px",
                padding: "4px 10px",
              }}
            >
              Farm Officers ({supervisorsCount})
            </button>
            <button
              type="button"
              onClick={() => { setRoleFilter("LABORER"); setCurrentPage(1); }}
              className="btn btn-sm"
              style={{
                background: roleFilter === "LABORER" ? "var(--canvas)" : "transparent",
                color: roleFilter === "LABORER" ? "var(--ink)" : "var(--muted)",
                fontWeight: roleFilter === "LABORER" ? 600 : 400,
                boxShadow: roleFilter === "LABORER" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                fontSize: "12px",
                padding: "4px 10px",
              }}
            >
              Labor ({laborersCount})
            </button>
          </div>

          {/* Secondary Controls: Estate filter, Search & Active Only */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {allFarms.length > 1 && (
              <select
                value={estateFilter}
                onChange={(e) => {
                  setEstateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{ fontSize: "12px", height: 34, minWidth: 160 }}
              >
                <option value="ALL">All Estates</option>
                <option value="UNASSIGNED">Unassigned Labor</option>
                {allFarms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => { setActiveOnly(e.target.checked); setCurrentPage(1); }}
              />
              <span>Active Only</span>
            </label>

            <div style={{ width: 240, position: "relative" }}>
              <input
                type="text"
                placeholder="Search name, mobile, estate…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="input-field"
                style={{ paddingLeft: 30, fontSize: "12px", height: 34 }}
              />
              <div style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }}>
                <Icons.Search size={14} />
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dense Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", fontSize: "13px" }}>
            <thead>
              <tr>
                <th>Worker Name</th>
                <th>Mobile Number</th>
                <th>Authority &amp; Estate Assignment</th>
                <th>Status</th>
                <th>Date Added</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWorkers.map((w) => (
                <tr key={w.id}>
                  <td>
                    <strong style={{ color: "var(--ink)", display: "block" }}>{w.name}</strong>
                    <span className="muted" style={{ fontSize: "11px" }}>{w.email}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink)" }}>
                      {w.phone || "No phone"}
                    </span>
                  </td>
                  <td>
                    {w.isSupervisor ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--green)",
                            background: "var(--stone)",
                            border: "1px solid var(--stone)",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-pill)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            width: "fit-content",
                          }}
                        >
                          <Icons.Shield size={11} />
                          <span>Farm Officer</span>
                        </span>
                        <span className="muted" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span>📍</span>
                          <strong style={{ color: "var(--ink)" }}>{w.assignedFarm?.name || farmName}</strong>
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--muted)",
                            background: "var(--stone)",
                            border: "1px solid var(--stone)",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-pill)",
                            display: "inline-flex",
                            alignItems: "center",
                            width: "fit-content",
                          }}
                        >
                          Labor
                        </span>
                        <span className="muted" style={{ fontSize: "11px" }}>
                          {w.assignedFarm ? `📍 ${w.assignedFarm.name}` : "Unassigned field hand / local connect"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    {w.active ? (
                      <span style={{ color: "var(--green)", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                        Active
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>Disabled</span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                    {new Date(w.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      {!w.isSupervisor ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAssignModalWorker(w);
                            setSelectedAssignFarmId(allFarms[0]?.id || farmId);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "var(--green)",
                            fontWeight: 600,
                          }}
                          title="Assign this laborer as a Farm Officer for an estate (1 farm per officer)"
                        >
                          <Icons.Shield size={12} />
                          <span>Assign as Farm Officer</span>
                        </button>
                      ) : (
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          {allFarms.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssignModalWorker(w);
                                const other = allFarms.find((f) => f.id !== w.assignedFarm?.id);
                                setSelectedAssignFarmId(other?.id || allFarms[0].id);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                              title="Reassign to another farm (1 farm maximum)"
                            >
                              Reassign Farm
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRevertToLabor(w)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: "11px", padding: "3px 8px", color: "var(--muted)" }}
                            title="Revert officer back to Farm Laborer"
                          >
                            Revert to Labor
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => copyWorkerCredentials({ name: w.name, phone: w.phone || w.email })}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "11px", padding: "3px 8px" }}
                        title="Copy credentials info"
                      >
                        <Icons.Copy size={12} />
                        <span>Copy</span>
                      </button>
                      {w.phone && (
                        <button
                          type="button"
                          onClick={() => shareWorkerWhatsApp({ name: w.name, phone: w.phone })}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: "11px", padding: "3px 8px" }}
                          title="Share via WhatsApp"
                        >
                          <Icons.Send size={12} />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <Icons.Users size={24} style={{ color: "var(--muted)" }} />
                      <strong style={{ color: "var(--ink)" }}>No personnel found</strong>
                      <span style={{ fontSize: "12px" }}>Try adjusting your search query, estate filter, or role tabs.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filtered.length > pageSize && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 12,
              borderTop: "1px solid var(--line)",
              flexWrap: "wrap",
              gap: 10,
              fontSize: "12px",
            }}
          >
            <span className="muted">
              Showing {Math.min((safeCurrentPage - 1) * pageSize + 1, filtered.length)} to{" "}
              {Math.min(safeCurrentPage * pageSize, filtered.length)} of {filtered.length} workers
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{ fontSize: "11px", padding: "2px 6px", height: 28 }}
              >
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="btn btn-secondary btn-sm"
                style={{ height: 28, padding: "0 8px" }}
              >
                &larr; Prev
              </button>

              <span style={{ fontWeight: 600, color: "var(--ink)", padding: "0 4px" }}>
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="btn btn-secondary btn-sm"
                style={{ height: 28, padding: "0 8px" }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. ADD WORKER MODAL ── */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div className="compact-card" style={{ width: "100%", maxWidth: 480, padding: 24, gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="mono-label" style={{ color: "var(--green)" }}>ON-BOARD WORKER</span>
                <h3 style={{ fontSize: "18px", margin: "2px 0 0", color: "var(--ink)" }}>
                  Add Farm Worker / Manager
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--muted)" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateWorker} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {allFarms.length > 1 && (
                <div>
                  <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>
                    Assigned Estate *
                  </label>
                  <select
                    value={createFarmId}
                    onChange={(e) => setCreateFarmId(e.target.value)}
                    className="input-field"
                    style={{ width: "100%", height: 38 }}
                  >
                    {allFarms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.location ? `(${f.location})` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="muted" style={{ fontSize: "11px", marginTop: 2, display: "block" }}>
                    {isSupervisor
                      ? "Farm Officers can be assigned to exactly 1 estate (1:1 rule)."
                      : "Primary estate for field muster and task assignment."}
                  </span>
                </div>
              )}

              <div>
                <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>
                  Worker Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>
                  Mobile Phone Number (Login Credential) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                />
                <span className="muted" style={{ fontSize: "11px", marginTop: 2, display: "block" }}>
                  Used directly by the worker to log into the mobile field app.
                </span>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label className="mono-label">Initial Password *</label>
                  <button
                    type="button"
                    onClick={generateSimplePassword}
                    className="btn btn-sm btn-link"
                    style={{ fontSize: "11px", color: "var(--green)" }}
                  >
                    Regenerate Simple PIN
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--stone)",
                  border: "1px solid var(--stone)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <input
                  type="checkbox"
                  id="supervisor-checkbox"
                  checked={isSupervisor}
                  onChange={(e) => setIsSupervisor(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <label htmlFor="supervisor-checkbox" style={{ fontSize: "12px", cursor: "pointer", color: "var(--ink)" }}>
                  <strong>Field Supervisor / Farm Officer Authority</strong>
                  <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>
                    Assigns worker as Farm Officer for this estate (1 farm per officer). Permits reviewing daily tasks, labor muster, and shift reports.
                  </div>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-green"
                >
                  {pending ? "Provisioning..." : "Confirm & Hire Worker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. ASSIGN / REASSIGN AS FARM OFFICER MODAL (STRICT 1:1 RULE) ── */}
      {assignModalWorker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div className="compact-card" style={{ width: "100%", maxWidth: 480, padding: 24, gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="mono-label" style={{ color: "var(--green)" }}>
                  {assignModalWorker.isSupervisor ? "REASSIGN ESTATE" : "PROMOTE TO FARM OFFICER"}
                </span>
                <h3 style={{ fontSize: "18px", margin: "2px 0 0", color: "var(--ink)" }}>
                  {assignModalWorker.isSupervisor
                    ? `Reassign ${assignModalWorker.name}`
                    : `Assign ${assignModalWorker.name} as Farm Officer`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalWorker(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--muted)" }}
              >
                &times;
              </button>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: "var(--radius-sm)",
                background: "var(--stone)",
                border: "1px solid var(--stone)",
                fontSize: "12px",
                color: "var(--ink)",
                lineHeight: "1.5",
              }}
            >
              <strong>Strict 1:1 Estate Assignment Rule:</strong>
              <div className="muted" style={{ fontSize: "11px", marginTop: 4 }}>
                Each Farm Officer is assigned to <strong>exactly 1 farm</strong>. Assigning this worker will grant them Field Supervisor authority exclusively over the chosen estate and replace any prior estate assignments.
              </div>
            </div>

            <form onSubmit={handleAssignOfficer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>
                  Select Estate *
                </label>
                <select
                  required
                  value={selectedAssignFarmId}
                  onChange={(e) => setSelectedAssignFarmId(e.target.value)}
                  className="input-field"
                  style={{ width: "100%", height: 38 }}
                >
                  {(allFarms.length > 0 ? allFarms : [{ id: farmId, name: farmName }]).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.location ? `— ${f.location}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setAssignModalWorker(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignPending}
                  className="btn btn-green"
                >
                  {assignPending ? "Updating Assignment..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
