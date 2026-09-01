"use client";
import { FormEvent, useEffect, useState, useMemo } from "react";
import { Icons } from "./icons";
import { RoleBadge } from "./ui/badge";
import { EmptyState } from "./ui/empty-state";

type Farm = { id: string; name: string };
type User = { id: string; name: string; email: string; role: string; active: boolean; farmAccess: { farmId: string; canManage: boolean }[] };
const roles = ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"] as const;

export function AdminConsole() {
  const [users, setUsers] = useState<User[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = () =>
    Promise.all([fetch("/api/users"), fetch("/api/farms")])
      .then(async ([u, f]) => {
        if (!u.ok || !f.ok) throw new Error("Unable to load data.");
        setUsers(await u.json());
        setFarms(await f.json());
      })
      .catch((e) => setError(e.message));

  useEffect(() => { void load(); }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"), email: f.get("email"), password: f.get("password"), role: f.get("role"),
          farmIds: f.getAll("farmIds").map(String), managesFarmIds: f.getAll("managesFarmIds").map(String),
        }),
      });
      setPending(false);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Creation failed.");
      setMessage("User account created.");
      setShowCreate(false);
      void load();
    } catch (err: any) {
      setPending(false);
      setError(err.message ?? "Error.");
    }
  }

  async function update(e: FormEvent<HTMLFormElement>, u: User) {
    e.preventDefault();
    setPending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const newPassword = String(f.get("newPassword") ?? "").trim();
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: f.get("role"), active: f.get("active") === "on",
          farmIds: f.getAll("farmIds").map(String), managesFarmIds: f.getAll("managesFarmIds").map(String),
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });
      setPending(false);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Update failed.");
      setMessage(`Updated ${u.name}.`);
      setEditingId(null);
      void load();
    } catch (err: any) {
      setPending(false);
      setError(err.message ?? "Error.");
    }
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, search]);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="text" placeholder="Search team…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
          <div className="tabs-nav" style={{ margin: 0 }}>
            {["ALL", "SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"].map((r) => (
              <button key={r} type="button" className={`tab-btn ${roleFilter === r ? "active" : ""}`} onClick={() => setRoleFilter(r)}>
                {r === "ALL" ? "All" : r.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
          <Icons.Plus size={14} /><span>{showCreate ? "Close" : "Add User"}</span>
        </button>
      </div>

      {error && <div className="error" role="alert"><Icons.AlertCircle size={15} /><span>{error}</span></div>}
      {message && <div className="success-banner" role="status"><span>{message}</span></div>}

      {/* CREATE FORM */}
      {showCreate && (
        <form onSubmit={create} className="card" style={{ padding: 20, display: "grid", gap: 14 }}>
          <h3 style={{ margin: 0 }}>New Team Member</h3>
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}><label>Name</label><input name="name" required placeholder="Full Name" /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Email</label><input name="email" type="email" required placeholder="user@agaate.ag" /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Password</label><input name="password" type="password" required minLength={8} placeholder="Min 8 chars" /></div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Role</label>
              <select name="role" defaultValue="FARM_OFFICER">{roles.map((r) => (<option key={r} value={r}>{r.replaceAll("_", " ")}</option>))}</select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Farm Assignments</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
              {farms.map((f) => (
                <div key={f.id} style={{ padding: 8, background: "var(--card-muted)", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)" }}>
                  <label className="check"><input type="checkbox" name="farmIds" value={f.id} /><span>{f.name}</span></label>
                  <label className="check" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}><input type="checkbox" name="managesFarmIds" value={f.id} /><span>Manager</span></label>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Create Account"}</button>
          </div>
        </form>
      )}

      {/* DIRECTORY TABLE */}
      <article className="card" style={{ padding: 18 }}>
        {filtered.length ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Estates</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map((u) => {
                  const isEdit = editingId === u.id;
                  const farmNames = u.farmAccess.map((a) => farms.find((f) => f.id === a.farmId)?.name).filter(Boolean);
                  return (
                    <tr key={u.id}>
                      <td><strong>{u.name}</strong><div className="muted" style={{ fontSize: "0.75rem" }}>{u.email}</div></td>
                      <td><RoleBadge role={u.role} /></td>
                      <td><span className={`status ${u.active ? "active" : "inactive"}`}>{u.active ? "Active" : "Inactive"}</span></td>
                      <td style={{ fontSize: "0.82rem" }}>{farmNames.join(", ") || (u.role === "SUPER_ADMIN" ? "Global" : "None")}</td>
                      <td>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(isEdit ? null : u.id)}>
                          <Icons.Edit size={12} /><span>{isEdit ? "Close" : "Edit"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Icons.Users size={28} />} title="No users found" />
        )}
      </article>

      {/* EDIT MODAL */}
      {editingId && (() => {
        const u = users.find((x) => x.id === editingId);
        if (!u) return null;
        return (
          <form onSubmit={(e) => update(e, u)} className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
            <h4>Edit Access for {u.name}</h4>
            <div className="two-column">
              <div className="form-group" style={{ margin: 0 }}><label>Role</label><select name="role" defaultValue={u.role}>{roles.map((r) => (<option key={r} value={r}>{r.replaceAll("_", " ")}</option>))}</select></div>
              <div className="form-group" style={{ margin: 0 }}><label>New Password (Optional)</label><input name="newPassword" type="password" minLength={8} placeholder="Leave blank to keep" /></div>
            </div>
            <label className="check"><input type="checkbox" name="active" defaultChecked={u.active} /><strong>Account Active</strong></label>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Assigned Farms</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 6 }}>
                {farms.map((f) => {
                  const acc = u.farmAccess.find((a) => a.farmId === f.id);
                  return (
                    <div key={f.id} style={{ padding: 8, background: "var(--card-muted)", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)" }}>
                      <label className="check"><input type="checkbox" name="farmIds" value={f.id} defaultChecked={Boolean(acc)} /><span>{f.name}</span></label>
                      <label className="check" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}><input type="checkbox" name="managesFarmIds" value={f.id} defaultChecked={Boolean(acc?.canManage)} /><span>Manager</span></label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        );
      })()}
    </section>
  );
}
