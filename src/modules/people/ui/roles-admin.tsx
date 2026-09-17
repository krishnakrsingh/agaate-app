"use client";

import { FormEvent, Fragment, useCallback, useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { PERMISSION_GROUPS, type Permission } from "@modules/auth/rbac";

export type RoleRow = {
  id: string;
  slug: string;
  label: string;
  description: string;
  tier: string;
  scope: string;
  permissions: Permission[];
  isSystem: boolean;
  active: boolean;
  userCount: number;
};

function PermissionChecklist({
  selected,
  onChange,
  disabled,
}: {
  selected: Set<Permission>;
  onChange: (next: Set<Permission>) => void;
  disabled?: boolean;
}) {
  function toggle(perm: Permission) {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 6 }}>
            {group.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {group.permissions.map((perm) => (
              <label key={perm} className="check" style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={selected.has(perm)}
                  disabled={disabled}
                  onChange={() => toggle(perm)}
                />
                <span>{perm.replaceAll("_", " ").replaceAll(":", " · ")}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DrawerShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
            <Icons.X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RoleFormDrawer({
  mode,
  role,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  role?: RoleRow;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [label, setLabel] = useState(role?.label ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [active, setActive] = useState(role?.active ?? true);
  const [perms, setPerms] = useState<Set<Permission>>(new Set(role?.permissions ?? []));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const body = {
        label,
        description,
        permissions: [...perms],
        ...(mode === "edit" ? { active } : {}),
      };
      const res = await fetch(mode === "create" ? "/api/hq/roles" : `/api/hq/roles/${role!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed.");
      }
      onSaved(mode === "create" ? `Role "${label}" created.` : `Role "${label}" updated.`);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Save failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DrawerShell title={mode === "create" ? "Create Custom Role" : `Edit Role: ${role?.label}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <div className="error" role="alert">{error}</div>}
        {role?.isSystem && (
          <div className="muted" style={{ fontSize: 12, padding: "8px 10px", background: "var(--surface)", borderRadius: "var(--radius-xs)" }}>
            System role — slug cannot change. Permissions are editable with safeguards.
          </div>
        )}
        <div className="form-group" style={{ margin: 0 }}>
          <label>Role Name</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} required minLength={2} maxLength={80} disabled={role?.isSystem && role.slug === "SUPER_ADMIN"} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} style={{ width: "100%" }} />
        </div>
        {mode === "edit" && (
          <label className="check">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <strong>Role Active</strong>
          </label>
        )}
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Permissions ({perms.size})</label>
          <PermissionChecklist selected={perms} onChange={setPerms} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending || perms.size === 0}>
            {pending ? "Saving..." : mode === "create" ? "Create Role" : "Save Changes"}
          </button>
        </div>
      </form>
    </DrawerShell>
  );
}

export function RolesAdmin() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);

  const loadRoles = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/hq/roles?tier=hq")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load roles.");
        return res.json();
      })
      .then((data: RoleRow[]) => setRoles(data))
      .catch((err) => {
        setError(err.message);
        setRoles([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  async function deleteRole(role: RoleRow) {
    if (role.isSystem) return;
    if (!confirm(`Delete role "${role.label}"? This cannot be undone.`)) return;
    setError("");
    try {
      const res = await fetch(`/api/hq/roles/${role.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed.");
      }
      setMessage(`Role "${role.label}" deleted.`);
      loadRoles();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && <div className="error" role="alert"><Icons.AlertCircle size={15} /><span>{error}</span></div>}
      {message && <div className="success-banner" role="status"><Icons.CheckCircle size={15} /><span>{message}</span></div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          System roles are seeded defaults. Custom HQ roles can be created with a tailored permission set.
        </p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Icons.Plus size={14} />
          <span>Create Role</span>
        </button>
      </div>

      {roles.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Type</th>
                <th>Permissions</th>
                <th>Users</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.label}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{r.slug}</div>
                    </td>
                    <td>{r.isSystem ? "System" : "Custom"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      >
                        {r.permissions.length} permissions
                      </button>
                    </td>
                    <td>{r.userCount}</td>
                    <td>
                      <span className={`status ${r.active ? "active" : "inactive"}`}>{r.active ? "Active" : "Inactive"}</span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(r)}>
                        <Icons.Edit size={12} />
                        <span>Edit</span>
                      </button>
                      {!r.isSystem && (
                        <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 6 }} onClick={() => deleteRole(r)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--surface)", fontSize: 11 }}>
                        {r.permissions.map((p) => p.replaceAll("_", " ")).join(" · ")}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading ? (
        <EmptyState
          icon={<Icons.Shield size={24} />}
          title="No roles found"
          description="Create a custom HQ role or run the role definition seed."
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              Create Role
            </button>
          }
        />
      ) : null}

      {loading && <span className="muted" style={{ fontSize: 12 }}>Loading roles...</span>}

      {showCreate && (
        <RoleFormDrawer
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={(msg) => {
            setMessage(msg);
            loadRoles();
          }}
        />
      )}
      {editing && (
        <RoleFormDrawer
          mode="edit"
          role={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setMessage(msg);
            loadRoles();
          }}
        />
      )}
    </section>
  );
}
