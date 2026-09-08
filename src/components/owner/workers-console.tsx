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
};

interface WorkersConsoleProps {
  farmId: string;
  farmName: string;
  initialWorkers: FarmWorker[];
}

export function WorkersConsole({ farmId, farmName, initialWorkers }: WorkersConsoleProps) {
  const toast = useToast();
  const [workers, setWorkers] = useState<FarmWorker[]>(initialWorkers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "SUPERVISOR" | "LABORER">("ALL");
  const [activeOnly, setActiveOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [showAddModal, setShowAddModal] = useState(false);

  // New worker form
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
  } | null>(null);

  const generateSimplePassword = () => {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let pass = "";
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword("Ag@" + pass);
  };

  const handleCreateWorker = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !password.trim()) {
      toast.show("Name, mobile number, and password are required", "error");
      return;
    }

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
          farmId,
          farmIds: [farmId],
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
        isSupervisor: data.isSupervisor || isSupervisor,
        active: data.active,
        createdAt: data.createdAt,
      };

      setWorkers([newWorker, ...workers]);
      setRecentWorker({
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim(),
        isSupervisor,
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

  const copyWorkerCredentials = (w: { name: string; phone?: string | null; password?: string }) => {
    const phoneDisplay = w.phone || "No phone registered";
    const text =
      "🌾 *Agaate Farm Laborer Credentials*\n\n" +
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
        w.email.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "SUPERVISOR" && w.isSupervisor) ||
        (roleFilter === "LABORER" && !w.isSupervisor);

      const matchesActive = !activeOnly || w.active;

      return matchesSearch && matchesRole && matchesActive;
    });
  }, [workers, searchTerm, roleFilter, activeOnly]);

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
              <span>ESTATE WORKFORCE MANAGEMENT • {farmName}</span>
            </div>
            <h1 className="page-title" style={{ margin: 0, fontSize: "22px" }}>
              Farm Workers &amp; Laborers Roster
            </h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
              Provision, manage, and credential on-site farm workers with mobile phone login and daily muster assignment.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              generateSimplePassword();
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
          <div style={{ padding: 14, borderRadius: "var(--radius-sm)", background: "var(--stone)", border: "1px solid var(--line)" }}>
            <div className="mono-label" style={{ fontSize: "11px", color: "var(--muted)" }}>TOTAL ROSTER</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{workers.length}</div>
            <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>Registered accounts</div>
          </div>

          <div style={{ padding: 14, borderRadius: "var(--radius-sm)", background: "var(--stone)", border: "1px solid var(--line)" }}>
            <div className="mono-label" style={{ fontSize: "11px", color: "var(--green)" }}>FIELD SUPERVISORS</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--green)", marginTop: 2 }}>{supervisorsCount}</div>
            <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>Task &amp; muster dispatch</div>
          </div>

          <div style={{ padding: 14, borderRadius: "var(--radius-sm)", background: "var(--stone)", border: "1px solid var(--line)" }}>
            <div className="mono-label" style={{ fontSize: "11px", color: "var(--muted)" }}>FARM LABORERS</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{laborersCount}</div>
            <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>Field operation hands</div>
          </div>

          <div style={{ padding: 14, borderRadius: "var(--radius-sm)", background: "var(--stone)", border: "1px solid var(--line)" }}>
            <div className="mono-label" style={{ fontSize: "11px", color: "var(--muted)" }}>ACTIVE STATUS</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
              {workers.filter((w) => w.active).length} / {workers.length}
            </div>
            <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>Ready for field work</div>
          </div>
        </div>
      </div>

      {/* ── 2. RECENT PROVISIONED WORKER ALERT BANNER ── */}
      {recentWorker && (
        <div
          className="compact-card"
          style={{
            padding: 18,
            border: "1px solid var(--green)",
            background: "rgba(36, 84, 58, 0.05)",
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
                  Newly Provisioned: {recentWorker.name} {recentWorker.isSupervisor && "(Supervisor)"}
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
                style={{ color: "#25D366" }}
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
              Supervisors ({supervisorsCount})
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
              Laborers ({laborersCount})
            </button>
          </div>

          {/* Search & Active Only Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
                placeholder="Search by name, mobile, email…"
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
                <th>Authority Tier</th>
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
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--green-dark)",
                          background: "var(--green-light)",
                          border: "1px solid rgba(36, 84, 58, 0.2)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                        }}
                      >
                        Field Supervisor
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "var(--muted)",
                          background: "var(--stone)",
                          border: "1px solid var(--line)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                        }}
                      >
                        Farm Laborer
                      </span>
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
                    <div style={{ display: "inline-flex", gap: 6 }}>
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
                          style={{ fontSize: "11px", padding: "3px 8px", color: "#25D366" }}
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
                      <span style={{ fontSize: "12px" }}>Try adjusting your search query or filters.</span>
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
                  border: "1px solid var(--line)",
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
                  <strong>Field Supervisor Authority</strong>
                  <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>
                    Permits officer to review daily tasks, muster daily labor, and submit end-of-shift reports.
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
    </div>
  );
}
