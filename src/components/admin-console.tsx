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
          <div style={{ position: "relative", minWidth: 220 }}>
            <input
              type="text"
              placeholder="Search users…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 32px",
                fontSize: 13,
                height: 36,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--slate)",
              }}
            >
              <Icons.Search size={14} />
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
                {r === "ALL" ? "All Users" : r.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? (
            <>
              <Icons.X size={14} />
              <span>Close Form</span>
            </>
          ) : (
            <>
              <Icons.Plus size={14} />
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
        <div className="success-banner" role="status">
          <Icons.CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Create User Drawer */}
      {showCreate && (
        <article className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="eyebrow">USER ACCESS PROVISIONING</div>
              <h3 style={{ margin: "2px 0 0" }}>Create New User</h3>
            </div>
          </div>

          <form onSubmit={create} style={{ display: "grid", gap: 16 }}>
            <div className="two-column">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Full Name</label>
                <input name="name" placeholder="Ramesh Patel" required />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Email Address</label>
                <input name="email" type="email" placeholder="ramesh@agaate.local" required />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Temporary Password</label>
                <input name="password" type="password" minLength={8} placeholder="••••••••••••" required />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Role</label>
                <select name="role" defaultValue="FARM_OFFICER">
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Farm Assignment Multi-select */}
            <div style={{ background: "var(--soft-stone)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-xs)", padding: 14, display: "grid", gap: 8 }}>
              <div className="mono-label">Assign Farm Access</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {farms.map((farm) => (
                  <label key={farm.id} className="check" style={{ fontSize: 13 }}>
                    <input type="checkbox" name="farmIds" value={farm.id} />
                    <span>{farm.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={pending}
              >
                {pending ? "Creating…" : "Confirm & Create User"}
              </button>
            </div>
          </form>
        </article>
      )}

      {/* Users List (Cohere Data Table) */}
      <article className="card" style={{ padding: 24 }}>
        <div className="card-header">
          <div>
            <div className="eyebrow">ORGANIZATION DIRECTORY</div>
            <h3 style={{ margin: "2px 0 0" }}>System Users & Farm Permissions</h3>
          </div>
          <span className="mono-label">{filteredUsers.length} Users</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Status</th>
                <th>Assigned Farms</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isEditing = editingUserId === user.id;

                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <div style={{ fontSize: 12, color: "var(--body-muted)" }}>{user.email}</div>
                    </td>
                    <td>
                      <span className="mono-label" style={{ background: "var(--soft-stone)", padding: "2px 8px", borderRadius: "var(--radius-xs)" }}>
                        {user.role.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span className={`status ${user.active ? "active" : "blocked"}`}>
                        {user.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 220 }}>
                        {user.farmAccess.map((a) => {
                          const farm = farms.find((f) => f.id === a.farmId);
                          return (
                            <span key={a.farmId} className="mono-label" style={{ fontSize: 10, background: "var(--soft-stone)", padding: "2px 6px", borderRadius: "var(--radius-xs)" }}>
                              {farm?.name ?? a.farmId}
                            </span>
                          );
                        })}
                        {!user.farmAccess.length && (
                          <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                            {user.role === "SUPER_ADMIN" ? "Global Access" : "No farms assigned"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditingUserId(isEditing ? null : user.id)}
                      >
                        <Icons.Edit size={12} />
                        <span>{isEditing ? "Close" : "Edit"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
