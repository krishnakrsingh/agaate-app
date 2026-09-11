"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

interface FarmSummary {
  id: string;
  name: string;
  location: string;
  status: string;
  setupStage: string;
  setupProgress: number;
  totalArea: any;
  cultivableArea: any;
  plots: Array<{ id: string; name: string; area: any; status: string }>;
  access: Array<{ user: { id: string; name: string; email: string; role: string } }>;
}

interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  active: boolean;
  createdAt: string;
}

interface ClientData {
  id: string;
  code?: string | null;
  name: string;
  companyName?: string | null;
  entityType?: string | null;
  panNumber?: string | null;
  gstin?: string | null;
  billingAddress?: string | null;
  secondaryContact?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  district?: string | null;
  address?: string | null;
  status: string;
  createdAt: string;
  farms: FarmSummary[];
  users: UserSummary[];
  metrics: {
    totalAcreage: number;
    totalCultivable: number;
    activeFarms: number;
    setupFarms: number;
    totalFarms: number;
    totalPlots: number;
    totalUsers: number;
  };
}

export function ClientWorkspace({ initialClient }: { initialClient: ClientData }) {
  const toast = useToast();
  const [client, setClient] = useState<ClientData>(initialClient);
  const [activeTab, setActiveTab] = useState<"farms" | "users" | "legal">("farms");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: client.name,
    companyName: client.companyName || "",
    email: client.email || "",
    phone: client.phone || "",
    entityType: client.entityType || "",
    panNumber: client.panNumber || "",
    gstin: client.gstin || "",
    billingAddress: client.billingAddress || "",
    secondaryContact: client.secondaryContact || "",
    state: client.state || "",
    district: client.district || "",
  });

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || "Failed to update client.");

      setClient((prev) => ({ ...prev, ...updated }));
      setIsEditing(false);
      toast.success("Client details successfully updated.");
    } catch (err: any) {
      toast.error(err.message || "Unable to save client details.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Entity Overview Card */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-xl)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span className={`status-badge ${client.status.toLowerCase()}`}>{client.status}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)" }}>
                {client.code || `CLI-${client.id.slice(-4).toUpperCase()}`}
              </span>
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              {client.name}
            </h1>
            {client.companyName && (
              <p style={{ fontSize: "15px", color: "var(--muted)", marginTop: "4px" }}>
                {client.companyName} {client.entityType ? `• ${client.entityType}` : ""}
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Icons.Edit size={13} />
              <span>{isEditing ? "Cancel Editing" : "Edit Profile"}</span>
            </button>
            <Link href={`/farms/new?clientId=${client.id}`} className="btn btn-primary btn-sm">
              <Icons.Plus size={13} />
              <span>Add Estate to Client</span>
            </Link>
          </div>
        </div>

        {/* Macro Metric Ribbons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
            paddingTop: "16px",
            borderTop: "1px solid var(--hairline)",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>Total Estates</div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--ink)", marginTop: "4px" }}>
              {client.metrics.totalFarms}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{client.metrics.activeFarms} active • {client.metrics.setupFarms} setup</div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>Total Acreage</div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--ink)", marginTop: "4px" }}>
              {client.metrics.totalAcreage.toFixed(1)} <span style={{ fontSize: "14px", fontWeight: 400 }}>ac</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{client.metrics.totalCultivable.toFixed(1)} ac cultivable</div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>Plots Demarcated</div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--ink)", marginTop: "4px" }}>
              {client.metrics.totalPlots}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>across all estates</div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>Authorized Users</div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--ink)", marginTop: "4px" }}>
              {client.metrics.totalUsers}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>farm owners & admins</div>
          </div>
        </div>
      </div>

      {/* Edit Form Modal/Drawer */}
      {isEditing && (
        <form
          onSubmit={handleSaveClient}
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline-strong)",
            borderRadius: "var(--radius-xl)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>Edit Client Corporate Profile</h3>
          <div className="two-column">
            <div className="form-group">
              <label className="form-label">Client Name</label>
              <input
                type="text"
                className="input-field"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Company / Entity Name</label>
              <input
                type="text"
                className="input-field"
                value={editForm.companyName}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
              />
            </div>
          </div>

          <div className="two-column">
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input
                type="text"
                className="input-field"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
          </div>

          <div className="three-column">
            <div className="form-group">
              <label className="form-label">Entity Type</label>
              <select
                className="input-field"
                value={editForm.entityType}
                onChange={(e) => setEditForm({ ...editForm, entityType: e.target.value })}
              >
                <option value="">Select Type</option>
                <option value="INDIVIDUAL">Individual / Farmer</option>
                <option value="PVT_LTD">Private Limited</option>
                <option value="PARTNERSHIP">Partnership Firm</option>
                <option value="HUF">Hindu Undivided Family (HUF)</option>
                <option value="TRUST">Trust / Foundation</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input
                type="text"
                className="input-field"
                value={editForm.panNumber}
                onChange={(e) => setEditForm({ ...editForm, panNumber: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN</label>
              <input
                type="text"
                className="input-field"
                value={editForm.gstin}
                onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="two-column">
            <div className="form-group">
              <label className="form-label">State</label>
              <input
                type="text"
                className="input-field"
                value={editForm.state}
                onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">District</label>
              <input
                type="text"
                className="input-field"
                value={editForm.district}
                onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {/* 2. Workspace Tabs Navigation */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--hairline)", paddingBottom: "4px" }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "farms" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("farms")}
        >
          <Icons.Farm size={14} />
          <span>Estates Portfolio ({client.farms.length})</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "users" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("users")}
        >
          <Icons.Users size={14} />
          <span>Personnel & Access ({client.users.length})</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === "legal" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("legal")}
        >
          <Icons.FileText size={14} />
          <span>Corporate & Legal</span>
        </button>
      </div>

      {/* 3. TAB 1: ESTATES PORTFOLIO */}
      {activeTab === "farms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {client.farms.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", border: "1px dashed var(--hairline-strong)", borderRadius: "var(--radius-xl)" }}>
              <p style={{ fontSize: "15px", color: "var(--muted)", marginBottom: "16px" }}>
                No farm estates registered under this organization yet.
              </p>
              <Link href={`/farms/new?clientId=${client.id}`} className="btn btn-primary btn-sm">
                Register First Farm
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Estate Name</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Setup Stage</th>
                    <th>Cultivable / Total</th>
                    <th>Plots</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {client.farms.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>
                        <Link href={`/farms/${f.id}`} style={{ textDecoration: "none", color: "var(--ink)" }}>
                          {f.name}
                        </Link>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "13px" }}>{f.location}</td>
                      <td>
                        <span className={`status-badge ${f.status.toLowerCase()}`}>{f.status}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                          {f.setupStage.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        {Number(f.cultivableArea || 0)} / {Number(f.totalArea || 0)} ac
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        {f.plots.length} plot(s)
                      </td>
                      <td>
                        <Link href={`/farms/${f.id}`} className="text-action" style={{ fontSize: "13px" }}>
                          Open Workspace →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: PERSONNEL & ACCESS */}
      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Contact Info</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {client.users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ fontSize: "13px" }}>
                      {[u.phone, u.email].filter(Boolean).join(" • ")}
                    </td>
                    <td>
                      <span className="status-badge" style={{ fontSize: "11px" }}>
                        {u.role.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.active ? "active" : "inactive"}`}>
                        {u.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 3: CORPORATE & LEGAL */}
      {activeTab === "legal" && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>Entity Legal Type</div>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--ink)", marginTop: "4px" }}>
              {client.entityType || "Not Specified"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>PAN Card Number</div>
            <div style={{ fontSize: "15px", fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--ink)", marginTop: "4px" }}>
              {client.panNumber || "—"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>GSTIN Registration</div>
            <div style={{ fontSize: "15px", fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--ink)", marginTop: "4px" }}>
              {client.gstin || "—"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>Secondary Emergency Contact</div>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--ink)", marginTop: "4px" }}>
              {client.secondaryContact || "—"}
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>Billing & Registered Address</div>
            <div style={{ fontSize: "15px", color: "var(--ink)", marginTop: "4px" }}>
              {client.billingAddress || client.address || "No formal address recorded."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
