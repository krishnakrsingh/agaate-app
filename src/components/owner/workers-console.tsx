"use client";
import { useState, FormEvent } from "react";
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

  const copyWorkerCredentials = (w: { name: string; phone: string; password: string }) => {
    const text = "🌾 *Agaate Farm Laborer Credentials*\n\n" +
      "Farm: " + farmName + "\n" +
      "Name: " + w.name + "\n" +
      "Login Phone: " + w.phone + "\n" +
      "Password: " + w.password + "\n" +
      "Login Link: " + window.location.origin + "/login\n\n" +
      "_Open link on phone, enter phone and password to clock in and view daily field tasks._";

    navigator.clipboard.writeText(text);
    toast.show("Worker credentials copied to clipboard!", "success");
  };

  const shareWorkerWhatsApp = (w: { name: string; phone: string; password: string }) => {
    const text = encodeURIComponent(
      "🌾 *Agaate Farm App Access*\n\n" +
      "Hello " + w.name + ", your login for *" + farmName + "* is ready.\n\n" +
      "*Login Phone*: " + w.phone + "\n" +
      "*Password*: " + w.password + "\n" +
      "*Link*: " + window.location.origin + "/login\n\n" +
      "Use this to clock in and log your daily work."
    );
    const cleanPhone = w.phone.replace(/[^\d]/g, "");
    window.open("https://wa.me/" + cleanPhone + "?text=" + text, "_blank");
  };

  const filtered = workers.filter((w) => {
    const q = searchTerm.toLowerCase();
    return w.name.toLowerCase().includes(q) || (w.phone && w.phone.includes(q));
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header & Quick Stats */}
      <div className="compact-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              <span className="eyebrow-dot" />
              <span>ESTATE WORKFORCE MANAGEMENT</span>
            </div>
            <h1 className="page-title" style={{ margin: 0, fontSize: "22px" }}>
              Farm Workers & Laborers Roster
            </h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
              Hire, manage, and credential up to 20 on-site farm workers with mobile phone login.
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
          <div style={{ padding: 12, borderRadius: "var(--radius-sm)", background: "var(--surface-muted)" }}>
            <div style={{ fontSize: "11px", color: "var(--muted-fg)" }}>TOTAL WORKERS</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--fg)" }}>{workers.length}</div>
          </div>
          <div style={{ padding: 12, borderRadius: "var(--radius-sm)", background: "var(--surface-muted)" }}>
            <div style={{ fontSize: "11px", color: "var(--muted-fg)" }}>FIELD SUPERVISORS</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#34d399" }}>
              {workers.filter((w) => w.isSupervisor).length}
            </div>
          </div>
          <div style={{ padding: 12, borderRadius: "var(--radius-sm)", background: "var(--surface-muted)" }}>
            <div style={{ fontSize: "11px", color: "var(--muted-fg)" }}>ACTIVE STATUS</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--fg)" }}>
              {workers.filter((w) => w.active).length} / {workers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Handover Card Alert */}
      {recentWorker && (
        <div className="compact-card" style={{ padding: 20, border: "1px solid var(--brand)", background: "rgba(16, 185, 129, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand)", color: "#022c1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icons.Check size={20} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>
                  Provisioned Worker: {recentWorker.name} {recentWorker.isSupervisor && "(Supervisor)"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted-fg)", fontFamily: "monospace" }}>
                  Mobile: <strong>{recentWorker.phone}</strong> | Password: <strong>{recentWorker.password}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => copyWorkerCredentials(recentWorker)}
                className="btn btn-sm btn-green"
              >
                <Icons.Copy size={14} />
                <span>Copy Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => shareWorkerWhatsApp(recentWorker)}
                className="btn btn-sm btn-secondary"
                style={{ color: "#25D366" }}
              >
                <Icons.Send size={14} />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setRecentWorker(null)}
                className="btn btn-sm btn-link"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Table & Search */}
      <div className="compact-card" style={{ padding: 24, gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h2 className="section-title" style={{ margin: 0, fontSize: "16px" }}>
            Active Farm Personnel
          </h2>
          <div style={{ width: 280, position: "relative" }}>
            <input
              type="text"
              placeholder="Search worker by name or phone…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 34, fontSize: "12px" }}
            />
            <div style={{ position: "absolute", left: 10, top: 10, color: "var(--muted-fg)" }}>
              <Icons.Search size={14} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", fontSize: "13px" }}>
            <thead>
              <tr>
                <th>Worker Name</th>
                <th>Mobile Number</th>
                <th>Authority Tier</th>
                <th>Status</th>
                <th>Date Added</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td style={{ fontFamily: "monospace", color: "#34d399" }}>{w.phone || w.email}</td>
                  <td>
                    {w.isSupervisor ? (
                      <span className="badge badge-green" style={{ fontSize: "11px" }}>Field Supervisor</span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: "11px" }}>Farm Laborer</span>
                    )}
                  </td>
                  <td>
                    {w.active ? (
                      <span style={{ color: "#10b981", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                        Active
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted-fg)", fontSize: "12px" }}>Disabled</span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted-fg)", fontSize: "12px" }}>
                    {new Date(w.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => copyWorkerCredentials({ name: w.name, phone: w.phone || w.email, password: "(Set by Admin)" })}
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: "11px", padding: "3px 8px" }}
                    >
                      Copy Info
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--muted-fg)" }}>
                    No workers found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Worker Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
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
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Add Farm Worker / Manager</h2>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                  Worker can log in on their mobile phone using their number and password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn btn-link"
                style={{ padding: 4 }}
              >
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="w-name">Worker Full Name *</label>
                <input
                  id="w-name"
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="w-phone">Mobile Phone Number *</label>
                <input
                  id="w-phone"
                  type="tel"
                  required
                  placeholder="e.g. 9876543210 (Used for login)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <span className="form-hint">Worker logs in directly with this mobile number.</span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label htmlFor="w-pass" style={{ margin: 0 }}>Worker Password *</label>
                  <button
                    type="button"
                    onClick={generateSimplePassword}
                    className="btn btn-link"
                    style={{ fontSize: "11px", padding: 0 }}
                  >
                    Generate Simple PIN
                  </button>
                </div>
                <input
                  id="w-pass"
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter or generate password"
                />
              </div>

              {/* Supervisor Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-muted)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>Field Supervisor Authority</div>
                  <div style={{ fontSize: "11px", color: "var(--muted-fg)" }}>
                    Enable if this person manages other laborers and schedules tasks.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSupervisor}
                  onChange={(e) => setIsSupervisor(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-green"
                  disabled={pending}
                >
                  {pending ? "Provisioning…" : "Hire Worker & Generate Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
