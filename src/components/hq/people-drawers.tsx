"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icons } from "../icons";
import {
  describeUserAccess,
  roleUsesFarmAccess,
  type AccessScope,
} from "@/lib/rbac";
import type { RoleRow } from "./roles-admin";

export type AssignedFarm = {
  farmId: string;
  farmName: string;
  canManage: boolean;
};

export type FarmAccessInfo = {
  farmId: string;
  canManage: boolean;
  farm?: { id: string; name: string; client?: { id: string; name: string } | null } | null;
};

export type RoleDefinitionInfo = {
  id: string;
  slug: string;
  label: string;
  tier: string;
  scope: string;
  isSystem?: boolean;
};

export type DirectoryUser = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  role: string;
  active: boolean;
  clientId?: string | null;
  client?: { id: string; name: string; code: string | null } | null;
  roleDefinitionId?: string | null;
  roleDefinition?: RoleDefinitionInfo | null;
  createdAt?: string;
  lastActive?: string;
  lastActiveSource?: string;
  farmCount: number;
  farmAccess: FarmAccessInfo[];
};

function useHqRoles() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hq/roles?tier=hq")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  }, []);

  return { roles, loading };
}

export function useFarmSearch(clientId?: string | null) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; location: string }[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams({ search: q, limit: "6" });
      if (clientId) params.set("clientId", clientId);
      fetch(`/api/farms?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          const list = Array.isArray(data) ? data : (data.farms ?? []);
          setResults(list.map((f: any) => ({ id: f.id, name: f.name, location: f.location || f.village || f.district || "Estate" })));
        })
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query, clientId]);

  return { query, setQuery, results, clear: () => { setQuery(""); setResults([]); } };
}

function FarmPills({
  assigned,
  onToggleManage,
  onRemove,
  manageLabel,
  observeLabel,
}: {
  assigned: AssignedFarm[];
  onToggleManage: (farmId: string) => void;
  onRemove: (farmId: string) => void;
  manageLabel: string;
  observeLabel: string;
}) {
  if (assigned.length === 0) {
    return <div className="muted" style={{ fontSize: 12 }}>No estates assigned.</div>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {assigned.map((f) => (
        <span
          key={f.farmId}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            backgroundColor: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 999, padding: "3px 8px 3px 10px", fontSize: 11,
          }}
        >
          <span>{f.farmName}</span>
          <button
            type="button"
            onClick={() => onToggleManage(f.farmId)}
            title={f.canManage ? `${manageLabel} (click to demote)` : `${observeLabel} (click to promote)`}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 700, padding: 0,
              color: f.canManage ? "var(--green)" : "var(--muted)",
            }}
          >
            {f.canManage ? manageLabel : observeLabel}
          </button>
          <button type="button" onClick={() => onRemove(f.farmId)} aria-label={`Remove ${f.farmName}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}>
            <Icons.X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

function FarmAssigner({
  assigned,
  setAssigned,
  clientId,
  scope,
}: {
  assigned: AssignedFarm[];
  setAssigned: React.Dispatch<React.SetStateAction<AssignedFarm[]>>;
  clientId?: string | null;
  scope: AccessScope;
}) {
  const { query, setQuery, results, clear } = useFarmSearch(clientId);
  const manageLabel = scope === "assigned" ? "LEAD" : "ADMIN";
  const observeLabel = scope === "assigned" ? "ASSIGNED" : "VIEW";

  function add(farmId: string, farmName: string) {
    if (assigned.some((a) => a.farmId === farmId)) return;
    setAssigned((prev) => [...prev, { farmId, farmName, canManage: false }]);
    clear();
  }

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Type to search and assign estates..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", padding: "8px 12px" }}
        />
        {results.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "var(--canvas)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 180, overflowY: "auto" }}>
            {results.map((f) => (
              <button key={f.id} type="button" onClick={() => add(f.id, f.name)} style={{ width: "100%", padding: "8px 12px", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--stone)", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{f.name}</span>
                <span className="muted" style={{ fontSize: 11 }}>{f.location}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <FarmPills
        assigned={assigned}
        onToggleManage={(farmId) => setAssigned((prev) => prev.map((f) => (f.farmId === farmId ? { ...f, canManage: !f.canManage } : f)))}
        onRemove={(farmId) => setAssigned((prev) => prev.filter((f) => f.farmId !== farmId))}
        manageLabel={manageLabel}
        observeLabel={observeLabel}
      />
    </div>
  );
}

function DrawerShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
            <Icons.X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RoleDefinitionSelect({
  roles,
  value,
  onChange,
  loading,
}: {
  roles: RoleRow[];
  value: string;
  onChange: (id: string) => void;
  loading: boolean;
}) {
  const selected = roles.find((r) => r.id === value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Role</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={loading || !roles.length}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.label}{r.isSystem ? "" : " (Custom)"}</option>
          ))}
        </select>
      </div>
      {selected && (
        <div style={{ padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{selected.label}</div>
          <p className="muted" style={{ margin: "4px 0 8px" }}>{selected.description || "No description."}</p>
          <div className="muted">{selected.permissions.length} permissions · {selected.scope} scope</div>
        </div>
      )}
    </div>
  );
}

export function CreateAccountDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (message: string) => void }) {
  const { roles, loading } = useHqRoles();
  const [roleDefinitionId, setRoleDefinitionId] = useState("");
  const [assigned, setAssigned] = useState<AssignedFarm[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roleDefinitionId && roles.length) {
      const defaultRole = roles.find((r) => r.slug === "AGRONOMIST") ?? roles[0];
      setRoleDefinitionId(defaultRole.id);
    }
  }, [roles, roleDefinitionId]);

  const selected = roles.find((r) => r.id === roleDefinitionId);
  const scope = (selected?.scope ?? "platform") as AccessScope;
  const showEstates = selected && roleUsesFarmAccess(selected.slug, scope);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    if (password.length < 12) {
      setPending(false);
      setError("Password must be at least 12 characters.");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: (String(f.get("email") ?? "").trim() || null),
          phone: (String(f.get("phone") ?? "").trim() || null),
          password,
          roleDefinitionId,
          farmIds: assigned.map((a) => a.farmId),
          managesFarmIds: assigned.filter((a) => a.canManage).map((a) => a.farmId),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Account creation failed.");
      onCreated("Team member account created.");
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Error creating account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DrawerShell title="Add Internal Team Member" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Full Name</label>
            <input name="name" required minLength={2} maxLength={100} placeholder="e.g. Dr. Anand Sharma" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Email Address</label>
            <input name="email" type="email" maxLength={254} placeholder="anand@agaate.ag" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Mobile Phone</label>
            <input name="phone" placeholder="+91 98765 43210" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Initial Password</label>
            <input name="password" type="password" required minLength={12} maxLength={128} placeholder="Min 12 characters" />
          </div>
        </div>

        <RoleDefinitionSelect roles={roles} value={roleDefinitionId} onChange={setRoleDefinitionId} loading={loading} />

        {showEstates && (
          <div className="form-group" style={{ margin: 0 }}>
            <label>Assign Estates ({assigned.length})</label>
            <FarmAssigner assigned={assigned} setAssigned={setAssigned} scope={scope} />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !roleDefinitionId}>
            {pending ? "Adding..." : "Add Team Member"}
          </button>
        </div>
      </form>
    </DrawerShell>
  );
}

export function EditAccessDrawer({
  user,
  currentUserId,
  onClose,
  onSaved,
}: {
  user: DirectoryUser;
  currentUserId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { roles, loading } = useHqRoles();
  const [roleDefinitionId, setRoleDefinitionId] = useState(user.roleDefinitionId ?? user.roleDefinition?.id ?? "");
  const [assigned, setAssigned] = useState<AssignedFarm[]>(
    user.farmAccess.map((fa) => ({
      farmId: fa.farmId,
      farmName: fa.farm?.name ?? "Assigned Estate",
      canManage: fa.canManage,
    }))
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const selected = roles.find((r) => r.id === roleDefinitionId);
  const scope = (selected?.scope ?? user.roleDefinition?.scope ?? "platform") as AccessScope;
  const accessSummary = describeUserAccess(user.role, assigned, scope);
  const showEstates = selected && roleUsesFarmAccess(selected.slug, scope);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const nextActive = f.get("active") === "on";
    const newPassword = String(f.get("newPassword") ?? "").trim();
    const nextRole = roles.find((r) => r.id === roleDefinitionId);

    if (user.id === currentUserId && (!nextActive || nextRole?.slug !== "SUPER_ADMIN")) {
      setPending(false);
      setError("You cannot remove your own Super Admin access.");
      return;
    }
    if (newPassword && newPassword.length < 12) {
      setPending(false);
      setError("New password must be at least 12 characters.");
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          roleDefinitionId,
          active: nextActive,
          farmIds: assigned.map((a) => a.farmId),
          managesFarmIds: assigned.filter((a) => a.canManage).map((a) => a.farmId),
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Account update failed.");
      onSaved(`Access updated for ${user.name}.`);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Error updating account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DrawerShell title={`Edit Access: ${user.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <div className="error" role="alert">{error}</div>}
        <div style={{ padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", fontSize: 12 }}>
          <strong>Effective access:</strong> {accessSummary.label}
          <span className="muted"> — {accessSummary.detail}</span>
        </div>
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Full Name</label>
            <input name="name" defaultValue={user.name} required minLength={2} maxLength={100} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>New Password (Optional)</label>
            <input name="newPassword" type="password" minLength={12} maxLength={128} placeholder="Blank keeps current password" />
          </div>
          <div className="form-group" style={{ margin: 0, justifyContent: "flex-end" }}>
            <label className="check">
              <input type="checkbox" name="active" defaultChecked={user.active} />
              <strong>Account Active</strong>
            </label>
          </div>
        </div>
        <RoleDefinitionSelect roles={roles} value={roleDefinitionId} onChange={setRoleDefinitionId} loading={loading} />
        {showEstates && (
          <div className="form-group" style={{ margin: 0 }}>
            <label>Assigned Estates ({assigned.length})</label>
            <FarmAssigner assigned={assigned} setAssigned={setAssigned} clientId={user.clientId} scope={scope} />
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !roleDefinitionId}>
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </DrawerShell>
  );
}
