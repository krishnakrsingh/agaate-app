"use client";
import { FormEvent, useEffect, useState, useMemo } from "react";
import { Icons } from "./icons";

type Farm = { id: string; name: string };
type Access = { farmId: string; canManage: boolean };
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  farmAccess: Access[];
};

const roles = ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"] as const;

export function AdminConsole() {
  const [users, setUsers] = useState<User[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = () =>
    Promise.all([fetch("/api/users"), fetch("/api/farms")])
      .then(async ([u, f]) => {
        if (!u.ok || !f.ok) throw new Error("Unable to load administrator data.");
        setUsers(await u.json());
        setFarms(await f.json());
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const farmIds = f.getAll("farmIds").map(String);
    const managesFarmIds = f.getAll("managesFarmIds").map(String);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          password: f.get("password"),
          role: f.get("role"),
          farmIds,
          managesFarmIds,
        }),
      });
      setPending(false);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Unable to create user.");
        return;
      }

      setMessage("User account successfully created.");
      setShowCreate(false);
      formEl?.reset();
      void load();
    } catch {
      setPending(false);
      setError("Network error creating user.");
    }
  }

  async function update(e: FormEvent<HTMLFormElement>, user: User) {
    e.preventDefault();
    setError("");
    setMessage("");
    setPending(true);

    const f = new FormData(e.currentTarget);
    const farmIds = f.getAll("farmIds").map(String);
    const managesFarmIds = f.getAll("managesFarmIds").map(String);
    const newPassword = String(f.get("newPassword") ?? "").trim();

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        setError(body.error ?? "Unable to update user.");
        return;
      }

      setMessage(`Updated ${user.name} access.`);
      setEditingUserId(null);
      void load();
    } catch {
      setPending(false);
      setError("Network error updating user.");
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchesSearch =
        searchQuery === "" ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  return (
    <section>
      {/* Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search users…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 32px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                fontSize: "0.88rem",
                width: 220,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--slate-400)",
              }}
            >
              <Icons.Search size={14} />
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="tabs-nav" style={{ margin: 0, padding: 3 }}>
            {["ALL", "SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"].map((r) => (
              <button
                key={r}
                type="button"
                className={`tab-btn ${roleFilter === r ? "active" : ""}`}
                onClick={() => setRoleFilter(r)}
                style={{ padding: "5px 10px", fontSize: "0.78rem" }}
              >
                {r === "ALL" ? "All Users" : r.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? (
            <>
              <Icons.X size={16} />
              <span>Close Form</span>
            </>
          ) : (
            <>
              <Icons.Plus size={16} />
              <span>Create User</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="hint" role="status">
          <Icons.CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Create User Drawer */}
      {showCreate && (
        <article className="card" style={{ border: "2px solid var(--primary-300)" }}>
          <div className="card-header">
            <div>
              <h3>Create New User</h3>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Add account credentials, role permission, and farm access.
              </p>
            </div>
          </div>

          <form className="form two-column" onSubmit={create}>
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" minLength={2} placeholder="e.g., Rajesh Kumar" required />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" placeholder="e.g., rajesh@agaate.farm" required />
            </div>

            <div className="form-group">
              <label>Password (Min 12 characters)</label>
              <input
                name="password"
                type="password"
                minLength={12}
                placeholder="••••••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label>System Role</label>
              <select name="role" defaultValue="FARM_OFFICER">
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="wide">
              <legend>Farm Access & Management Permissions</legend>
              <div style={{ display: "grid", gap: 8 }}>
                {farms.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "white",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <label className="check" style={{ margin: 0 }}>
                      <input type="checkbox" name="farmIds" value={f.id} />
                      <strong>{f.name}</strong>
                    </label>

                    <label className="check" style={{ margin: 0, fontSize: "0.82rem", color: "var(--slate-600)" }}>
                      <input type="checkbox" name="managesFarmIds" value={f.id} />
                      <span>Farm Admin Manager</span>
                    </label>
                  </div>
                ))}
                {!farms.length && <p className="muted">No farms created yet.</p>}
              </div>
            </fieldset>

            <button
              type="submit"
              className="btn btn-primary wide"
              disabled={pending}
              style={{ padding: "12px 20px" }}
            >
              <Icons.Plus size={16} />
              <span>{pending ? "Creating account…" : "Create User Account"}</span>
            </button>
          </form>
        </article>
      )}

      {/* Users List */}
      <div style={{ display: "grid", gap: 14 }}>
        {filteredUsers.map((user) => {
          const isEditing = editingUserId === user.id;
          const roleClass = user.role.toLowerCase();

          return (
            <article className="card" key={user.id} style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="user-avatar" style={{ width: 42, height: 42, fontSize: "1rem" }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: "1.1rem" }}>{user.name}</strong>
                      <span className={`role-badge ${roleClass}`}>
                        {user.role.replaceAll("_", " ")}
                      </span>
                      <span className={`status ${user.active ? "active" : "inactive"}`} style={{ fontSize: "0.68rem" }}>
                        {user.active ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {user.email} &bull; {user.farmAccess.length} farm(s) assigned
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setEditingUserId(isEditing ? null : user.id)}
                >
                  <Icons.Edit size={13} />
                  <span>{isEditing ? "Close" : "Manage Access"}</span>
                </button>
              </div>

              {/* Assigned Farms Chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {user.farmAccess.map((a) => {
                  const farmObj = farms.find((f) => f.id === a.farmId);
                  return (
                    <span
                      key={a.farmId}
                      style={{
                        padding: "3px 9px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--slate-100)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "var(--slate-700)",
                      }}
                    >
                      {farmObj?.name ?? a.farmId} {a.canManage ? "★ (Manager)" : ""}
                    </span>
                  );
                })}
              </div>

              {/* In-place User Access Editor */}
              {isEditing && (
                <form
                  className="form"
                  onSubmit={(e) => update(e, user)}
                  style={{
                    marginTop: 16,
                    padding: 16,
                    background: "var(--slate-50)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="two-column">
                    <div className="form-group">
                      <label>System Role</label>
                      <select name="role" defaultValue={user.role}>
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ justifyContent: "center" }}>
                      <label className="check" style={{ marginTop: 18 }}>
                        <input name="active" type="checkbox" defaultChecked={user.active} />
                        <strong>Account Active (Can log in)</strong>
                      </label>
                    </div>
                  </div>

                   <div className="form-group wide">
                    <label>Reset Password (optional, min 12 chars)</label>
                    <input name="newPassword" type="password" placeholder="Leave blank to keep existing" minLength={12} />
                  </div>

                  <fieldset>
                    <legend>Assigned Farms</legend>
                    <div style={{ display: "grid", gap: 8 }}>
                      {farms.map((f) => {
                        const access = user.farmAccess.find((a) => a.farmId === f.id);
                        return (
                          <div
                            key={f.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              background: "white",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <label className="check" style={{ margin: 0 }}>
                              <input
                                type="checkbox"
                                name="farmIds"
                                value={f.id}
                                defaultChecked={Boolean(access)}
                              />
                              <span>{f.name}</span>
                            </label>

                            <label className="check" style={{ margin: 0, fontSize: "0.82rem" }}>
                              <input
                                type="checkbox"
                                name="managesFarmIds"
                                value={f.id}
                                defaultChecked={Boolean(access?.canManage)}
                              />
                              <span>Can Manage</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </fieldset>

                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={pending}
                    style={{ width: "fit-content" }}
                  >
                    <Icons.Check size={14} />
                    <span>Save User Access</span>
                  </button>
                </form>
              )}
            </article>
          );
        })}

        {!filteredUsers.length && (
          <div className="empty">
            <div className="empty-icon">
              <Icons.Users size={24} />
            </div>
            <p>No users found matching your search.</p>
          </div>
        )}
      </div>
    </section>
  );
}
