"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import { Icons } from "./icons";
import { RoleBadge } from "./ui/badge";
import { EmptyState } from "./ui/empty-state";

type ClientInfo = {
  id: string;
  name: string;
  code: string | null;
};

type FarmAccessInfo = {
  farmId: string;
  canManage: boolean;
  farm?: { id: string; name: string } | null;
};

type User = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  role: string;
  active: boolean;
  isSupervisor?: boolean;
  clientId?: string | null;
  client?: ClientInfo | null;
  createdAt?: string;
  farmAccess: FarmAccessInfo[];
};

type AssignedFarm = {
  farmId: string;
  farmName: string;
  canManage: boolean;
};

type FarmSearchResult = {
  id: string;
  name: string;
  location: string;
};

const ROLES = ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"] as const;

export function AdminConsole() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pending, setPending] = useState(false);

  // Form interactive farm search & assignments
  const [assignedFarms, setAssignedFarms] = useState<AssignedFarm[]>([]);
  const [farmQuery, setFarmQuery] = useState("");
  const [farmResults, setFarmResults] = useState<FarmSearchResult[]>([]);

  // Debounce user search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load paginated users
  const loadUsers = useCallback(() => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      paginate: "true",
      limit: limit.toString(),
      offset: ((page - 1) * limit).toString(),
    });

    if (debouncedSearch) params.set("search", debouncedSearch);
    if (roleFilter !== "ALL") params.set("role", roleFilter);

    fetch(`/api/users?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load user directory.");
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.users)) {
          setUsers(data.users);
          setTotal(data.total ?? data.users.length);
        } else if (Array.isArray(data)) {
          setUsers(data);
          setTotal(data.length);
        }
      })
      .catch((err) => setError(err.message || "Network error loading users"))
      .finally(() => setLoading(false));
  }, [page, limit, debouncedSearch, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Debounced farm search for estate assignment
  useEffect(() => {
    const q = farmQuery.trim();
    if (!q) {
      setFarmResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/farms?search=${encodeURIComponent(q)}&limit=6`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: any[]) => {
          setFarmResults(
            (data || []).map((f) => ({
              id: f.id,
              name: f.name,
              location: f.location,
            }))
          );
        })
        .catch(() => setFarmResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [farmQuery]);

  function startCreate() {
    setEditingUser(null);
    setAssignedFarms([]);
    setFarmQuery("");
    setFarmResults([]);
    setShowCreate(true);
  }

  function startEdit(u: User) {
    setShowCreate(false);
    setEditingUser(u);
    setAssignedFarms(
      u.farmAccess.map((fa) => ({
        farmId: fa.farmId,
        farmName: fa.farm?.name || "Assigned Estate",
        canManage: fa.canManage,
      }))
    );
    setFarmQuery("");
    setFarmResults([]);
  }

  function toggleAddFarm(f: FarmSearchResult) {
    if (assignedFarms.some((af) => af.farmId === f.id)) return;
    setAssignedFarms((prev) => [
      ...prev,
      { farmId: f.id, farmName: f.name, canManage: false },
    ]);
    setFarmQuery("");
    setFarmResults([]);
  }

  function removeFarm(farmId: string) {
    setAssignedFarms((prev) => prev.filter((f) => f.farmId !== farmId));
  }

  function toggleFarmManage(farmId: string) {
    setAssignedFarms((prev) =>
      prev.map((f) =>
        f.farmId === farmId ? { ...f, canManage: !f.canManage } : f
      )
    );
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    const f = new FormData(e.currentTarget);
    const farmIds = assignedFarms.map((af) => af.farmId);
    const managesFarmIds = assignedFarms
      .filter((af) => af.canManage)
      .map((af) => af.farmId);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email") || null,
          phone: f.get("phone") || null,
          password: f.get("password"),
          role: f.get("role"),
          farmIds,
          managesFarmIds,
        }),
      });

      setPending(false);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Account creation failed.");
      }

      setMessage("User account successfully created.");
      setShowCreate(false);
      setAssignedFarms([]);
      loadUsers();
    } catch (err: any) {
      setPending(false);
      setError(err.message ?? "Error creating user account.");
    }
  }

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    if (!editingUser) return;
    e.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    const f = new FormData(e.currentTarget);
    const newPassword = String(f.get("newPassword") ?? "").trim();
    const farmIds = assignedFarms.map((af) => af.farmId);
    const managesFarmIds = assignedFarms
      .filter((af) => af.canManage)
      .map((af) => af.farmId);

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          role: f.get("role"),
          active: f.get("active") === "on",
          farmIds,
          managesFarmIds,
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });

      setPending(false);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Account update failed.");
      }

      setMessage(`Account permissions updated for ${editingUser.name}.`);
      setEditingUser(null);
      setAssignedFarms([]);
      loadUsers();
    } catch (err: any) {
      setPending(false);
      setError(err.message ?? "Error updating user account.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentOffset = (page - 1) * limit;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* FILTER & ACTION BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search by name, email, phone, client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280, minHeight: 38, padding: "8px 12px" }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: 8, top: 10, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
              >
                <Icons.X size={13} />
              </button>
            )}
          </div>

          <div className="tabs-nav">
            {["ALL", "SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"].map((r) => (
              <button
                key={r}
                type="button"
                className={`tab-btn ${roleFilter === r ? "active" : ""}`}
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
              >
                {r === "ALL" ? "All" : r.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-green btn-sm"
          onClick={() => (showCreate ? setShowCreate(false) : startCreate())}
        >
          <Icons.Plus size={14} />
          <span>{showCreate ? "Close Form" : "Add Team Member"}</span>
        </button>
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="success-banner" role="status">
          <Icons.CheckCircle size={15} />
          <span>{message}</span>
        </div>
      )}

      {/* CREATE FORM */}
      {showCreate && (
        <form onSubmit={handleCreate} className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div className="form-section-title">New Team Member Profile</div>
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Full Name</label>
              <input name="name" required placeholder="Full Name" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Email Address</label>
              <input name="email" type="email" placeholder="user@agaate.ag (or mobile phone)" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Mobile Phone</label>
              <input name="phone" placeholder="+91 98765 43210" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Initial Password</label>
              <input name="password" type="password" required minLength={12} placeholder="Min 12 characters" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>System Role</label>
              <select name="role" defaultValue="FARM_OFFICER">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* HIGH-SCALE ESTATE SELECTOR */}
          <div className="form-group" style={{ margin: 0 }}>
            <label>Assigned Estates ({assignedFarms.length})</label>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Type to search and add estates (e.g. Bangalore, Orchard, Estate 1)…"
                value={farmQuery}
                onChange={(e) => setFarmQuery(e.target.value)}
                style={{ width: "100%", padding: "8px 12px" }}
              />
              {farmResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "var(--canvas)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-xs)",
                    zIndex: 20,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    maxHeight: 180,
                    overflowY: "auto",
                  }}
                >
                  {farmResults.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleAddFarm(f)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        borderBottom: "1px solid var(--stone)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      className="hover-glow"
                    >
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{f.name}</span>
                      <span className="muted" style={{ fontSize: 11 }}>{f.location}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Estates Pills */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
              {assignedFarms.map((af) => (
                <div
                  key={af.farmId}
                  style={{
                    padding: "8px 12px",
                    background: "var(--stone)",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{af.farmName}</div>
                    <label className="check" style={{ fontSize: "11px", color: "var(--muted)", marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={af.canManage}
                        onChange={() => toggleFarmManage(af.farmId)}
                      />
                      <span>Manager Permissions</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFarm(af.farmId)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
                  >
                    <Icons.X size={13} />
                  </button>
                </div>
              ))}
              {assignedFarms.length === 0 && (
                <span className="muted" style={{ fontSize: 12 }}>
                  No individual estates assigned. (Super Admins have universal platform access by default).
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-green btn-sm" disabled={pending}>
              {pending ? "Saving…" : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {/* EDIT MODAL / DRAWER */}
      {editingUser && (
        <form onSubmit={handleUpdate} className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div className="form-section-title">Edit Access &amp; Permissions: {editingUser.name}</div>
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Full Name</label>
              <input name="name" defaultValue={editingUser.name} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Role</label>
              <select name="role" defaultValue={editingUser.role}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>New Password (Optional)</label>
              <input name="newPassword" type="password" minLength={12} placeholder="Leave blank to retain current password" />
            </div>
            <div className="form-group" style={{ margin: 0, display: "flex", alignItems: "center", paddingTop: 20 }}>
              <label className="check">
                <input type="checkbox" name="active" defaultChecked={editingUser.active} />
                <strong>Account Active &amp; Login Permitted</strong>
              </label>
            </div>
          </div>

          {/* HIGH-SCALE ESTATE SELECTOR */}
          <div className="form-group" style={{ margin: 0 }}>
            <label>Assigned Estates ({assignedFarms.length})</label>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Type to search and add estates…"
                value={farmQuery}
                onChange={(e) => setFarmQuery(e.target.value)}
                style={{ width: "100%", padding: "8px 12px" }}
              />
              {farmResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "var(--canvas)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-xs)",
                    zIndex: 20,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    maxHeight: 180,
                    overflowY: "auto",
                  }}
                >
                  {farmResults.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleAddFarm(f)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        borderBottom: "1px solid var(--stone)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      className="hover-glow"
                    >
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{f.name}</span>
                      <span className="muted" style={{ fontSize: 11 }}>{f.location}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Estates Pills */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
              {assignedFarms.map((af) => (
                <div
                  key={af.farmId}
                  style={{
                    padding: "8px 12px",
                    background: "var(--stone)",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{af.farmName}</div>
                    <label className="check" style={{ fontSize: "11px", color: "var(--muted)", marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={af.canManage}
                        onChange={() => toggleFarmManage(af.farmId)}
                      />
                      <span>Manager Permissions</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFarm(af.farmId)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
                  >
                    <Icons.X size={13} />
                  </button>
                </div>
              ))}
              {assignedFarms.length === 0 && (
                <span className="muted" style={{ fontSize: 12 }}>
                  No individual estates assigned.
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingUser(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {/* METRICS & TOTAL BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--muted)", padding: "4px 2px" }}>
        <span>
          Showing {total > 0 ? currentOffset + 1 : 0}&ndash;{Math.min(currentOffset + limit, total)} of{" "}
          <strong style={{ color: "var(--ink)" }}>{total.toLocaleString()}</strong> platform accounts
        </span>
        {loading && <span>Refreshing directory…</span>}
      </div>

      {/* DIRECTORY TABLE */}
      {users.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Role</th>
                <th>Organization / Client</th>
                <th>Status</th>
                <th>Assigned Estates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isEdit = editingUser?.id === u.id;
                const farmNames = u.farmAccess
                  .map((a) => a.farm?.name)
                  .filter(Boolean);

                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <div className="muted" style={{ fontSize: "12px" }}>
                        {u.email || u.phone || "No direct contact"}
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      {u.role === "SUPER_ADMIN" ? (
                        <span className="badge" style={{ background: "rgba(46,125,50,0.08)", color: "var(--green)", fontSize: 11 }}>
                          Agaate Platform HQ
                        </span>
                      ) : u.client ? (
                        <span className="badge badge-stone" style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 11 }}>
                          <Icons.Layers size={11} style={{ color: "var(--green)" }} />
                          <span>
                            {u.client.name} {u.client.code ? `(${u.client.code})` : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="muted" style={{ fontSize: 11 }}>Direct Platform</span>
                      )}
                    </td>
                    <td>
                      <span className={`status ${u.active ? "active" : "inactive"}`}>
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px" }}>
                      {u.role === "SUPER_ADMIN" ? (
                        <span style={{ color: "var(--green)", fontWeight: 600 }}>Global Universal Access</span>
                      ) : farmNames.length > 0 ? (
                        <span>
                          {farmNames.slice(0, 2).join(", ")}
                          {farmNames.length > 2 && ` +${farmNames.length - 2} more`}
                        </span>
                      ) : (
                        <span className="muted">None</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => (isEdit ? setEditingUser(null) : startEdit(u))}
                      >
                        <Icons.Edit size={12} />
                        <span>{isEdit ? "Close" : "Edit Access"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<Icons.Users size={24} />}
          title="No team members found"
          description={
            debouncedSearch || roleFilter !== "ALL"
              ? "Try adjusting your search criteria or role filters."
              : "Create the first team member or client farm admin."
          }
        />
      )}

      {/* SERVER-SIDE PAGINATION BAR */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 14px",
            borderTop: "1px solid var(--line)",
            backgroundColor: "var(--stone)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Page <strong style={{ color: "var(--ink)" }}>{page}</strong> of{" "}
            <strong style={{ color: "var(--ink)" }}>{totalPages}</strong> ({total.toLocaleString()} total)
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icons.ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <span>Next</span>
              <Icons.ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
