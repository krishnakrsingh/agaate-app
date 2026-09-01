"use client";
import { FormEvent, useEffect, useState, useMemo, Fragment } from "react";
import { Icons } from "./icons";
import { RoleBadge } from "./ui/badge";
import { EmptyState } from "./ui/empty-state";

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
    <section style={{ display: "grid", gap: 18 }}>
      {/* Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", minWidth: 220 }}>
            <input
              type="text"
              placeholder="Search users…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 34px",
                fontSize: "0.88rem",
                height: 38,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icons.Search size={15} />
            </span>
          </div>

          {/* Role Filter Tabs */}
          <div className="tabs-nav" style={{ margin: 0 }}>
            {["ALL", "SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"].map((r) => (
              <button
                key={r}
                type="button"
                className={`tab-btn ${roleFilter === r ? "active" : ""}`}
                onClick={() => setRoleFilter(r)}
              >
                {r === "ALL" ? "All Roles" : r.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? <Icons.X size={15} /> : <Icons.Plus size={15} />}
          <span>{showCreate ? "Close" : "Add Team Member"}</span>
        </button>
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="success-banner" role="status">
          <Icons.CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* CREATE USER FORM */}
      {showCreate && (
        <form onSubmit={create} className="card" style={{ padding: 24, display: "grid", gap: 16 }}>
          <div className="card-header">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot"></span>
                NEW USER PROVISIONING
              </div>
              <h3 style={{ margin: "2px 0 0" }}>Create System User</h3>
            </div>
          </div>

          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Full Name</label>
              <input name="name" required placeholder="e.g. Ramesh Gowda" />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Email Address</label>
              <input name="email" type="email" required placeholder="ramesh@agaate.ag" />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Temporary Password</label>
              <input name="password" type="password" required minLength={8} placeholder="Min 8 characters" />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>System Role</label>
              <select name="role" defaultValue="FARM_OFFICER" required>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Farm Assignments */}
          <div className="form-group" style={{ margin: 0 }}>
            <label>Assigned Farms & Access Level</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 4 }}>
              {farms.map((farm) => (
                <div
                  key={farm.id}
                  style={{
                    padding: 12,
                    background: "var(--card-muted)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <label className="check">
                    <input type="checkbox" name="farmIds" value={farm.id} />
                    <strong>{farm.name}</strong>
                  </label>
                  <label className="check" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    <input type="checkbox" name="managesFarmIds" value={farm.id} />
                    <span>Manager permissions</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Creating…" : "Save User Account"}
            </button>
          </div>
        </form>
      )}

      {/* USER DIRECTORY TABLE */}
      <article className="card" style={{ padding: 22 }}>
        {filteredUsers.length ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Farm Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isEditing = editingUserId === u.id;
                  const assignedFarmNames = u.farmAccess
                    .map((a) => farms.find((f) => f.id === a.farmId)?.name)
                    .filter(Boolean);

                  return (
                    <Fragment key={u.id}>
                      <tr>
                        <td>
                          <strong>{u.name}</strong>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{u.email}</div>
                        </td>
                        <td><RoleBadge role={u.role} /></td>
                        <td>
                          <span className={`status ${u.active ? "active" : "inactive"}`}>
                            {u.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ maxWidth: 280, fontSize: "0.85rem" }}>
                          {assignedFarmNames.length > 0
                            ? assignedFarmNames.join(", ")
                            : u.role === "SUPER_ADMIN"
                            ? "All Estates (Global)"
                            : "No farms assigned"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingUserId(isEditing ? null : u.id)}
                          >
                            <Icons.Edit size={13} />
                            <span>{isEditing ? "Cancel" : "Edit"}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Inline User Edit Row */}
                      {isEditing && (
                        <tr>
                          <td colSpan={5} style={{ background: "var(--card-muted)", padding: 20 }}>
                            <form onSubmit={(e) => update(e, u)} style={{ display: "grid", gap: 14 }}>
                              <h4 style={{ margin: 0 }}>Edit Permissions for {u.name}</h4>
                              <div className="two-column">
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label>System Role</label>
                                  <select name="role" defaultValue={u.role}>
                                    {roles.map((r) => (
                                      <option key={r} value={r}>
                                        {r.replaceAll("_", " ")}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                  <label>Reset Password (Optional)</label>
                                  <input name="newPassword" type="password" minLength={8} placeholder="Leave blank to keep current" />
                                </div>
                              </div>

                              <label className="check">
                                <input type="checkbox" name="active" defaultChecked={u.active} />
                                <strong>Account is Active and allowed to sign in</strong>
                              </label>

                              {/* Farm Assignments */}
                              <div className="form-group" style={{ margin: 0 }}>
                                <label>Assigned Farms</label>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginTop: 4 }}>
                                  {farms.map((farm) => {
                                    const acc = u.farmAccess.find((a) => a.farmId === farm.id);
                                    return (
                                      <div
                                        key={farm.id}
                                        style={{
                                          padding: 10,
                                          background: "var(--card)",
                                          borderRadius: "var(--radius-xs)",
                                          border: "1px solid var(--border)",
                                          display: "grid",
                                          gap: 4,
                                        }}
                                      >
                                        <label className="check">
                                          <input
                                            type="checkbox"
                                            name="farmIds"
                                            value={farm.id}
                                            defaultChecked={Boolean(acc)}
                                          />
                                          <span>{farm.name}</span>
                                        </label>
                                        <label className="check" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                          <input
                                            type="checkbox"
                                            name="managesFarmIds"
                                            value={farm.id}
                                            defaultChecked={Boolean(acc?.canManage)}
                                          />
                                          <span>Manager</span>
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingUserId(null)}>
                                  Cancel
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
                                  {pending ? "Saving…" : "Save Changes"}
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Icons.Users size={28} />}
            title="No users match search"
          />
        )}
      </article>
    </section>
  );
}
