"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icons } from "../icons";

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

export type DirectoryUser = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  role: string;
  active: boolean;
  clientId?: string | null;
  client?: { id: string; name: string; code: string | null } | null;
  createdAt?: string;
  lastActive?: string;
  lastActiveSource?: string;
  farmCount: number;
  farmAccess: FarmAccessInfo[];
};

export const ROLES = ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"] as const;

// Search-as-type farm lookup, capped at 6 rows. Never fetch-all.
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
        .then((data: any) => {
          const arr = Array.isArray(data) ? data : (data.farms ?? []);
          setResults(
            arr.map((f: any) => ({ id: f.id, name: f.name, location: f.location ?? "" }))
          );
        })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, clientId]);

  return { query, setQuery, results, clear: () => { setQuery(""); setResults([]); } };
}

// Search-as-type client lookup, capped at 6 rows. Never fetch-all.
export function useClientSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; code: string }[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/admin/clients?search=${encodeURIComponent(q)}&limit=6`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: any) => {
          const arr = data?.clients ?? [];
          setResults(arr.map((c: any) => ({ id: c.id, name: c.name, code: c.code ?? "" })));
        })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return { query, setQuery, results, clear: () => { setQuery(""); setResults([]); } };
}

function FarmPills({
  assigned,
  onToggleManage,
  onRemove,
}: {
  assigned: AssignedFarm[];
  onToggleManage: (farmId: string) => void;
  onRemove: (farmId: string) => void;
}) {
  if (!assigned.length) {
    return <span className="muted" style={{ fontSize: 12 }}>No estates assigned yet.</span>;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
      {assigned.map((af) => (
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
            <label className="check" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              <input
                type="checkbox"
                checked={af.canManage}
                onChange={() => onToggleManage(af.farmId)}
              />
              <span>Manager Access</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => onRemove(af.farmId)}
            aria-label={`Remove ${af.farmName}`}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
          >
            <Icons.X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

function FarmAssigner({
  assigned,
  setAssigned,
  clientId,
}: {
  assigned: AssignedFarm[];
  setAssigned: (fn: (prev: AssignedFarm[]) => AssignedFarm[]) => void;
  clientId?: string | null;
}) {
  const { query, setQuery, results, clear } = useFarmSearch(clientId);

  function add(id: string, name: string) {
    setAssigned((prev) =>
      prev.some((p) => p.farmId === id) ? prev : [...prev, { farmId: id, farmName: name, canManage: false }]
    );
    clear();
  }

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Type to search and add estates..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", padding: "8px 12px" }}
        />
        {results.length > 0 && (
          <div
            style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              backgroundColor: "var(--canvas)", border: "1px solid var(--line)",
              borderRadius: "var(--radius-xs)", zIndex: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 180, overflowY: "auto",
            }}
          >
            {results.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => add(f.id, f.name)}
                style={{
                  width: "100%", padding: "8px 12px", textAlign: "left", background: "none",
                  border: "none", borderBottom: "1px solid var(--stone)", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 12 }}>{f.name}</span>
                <span className="muted" style={{ fontSize: 11 }}>{f.location}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <FarmPills
        assigned={assigned}
        onToggleManage={(farmId) =>
          setAssigned((prev) => prev.map((f) => (f.farmId === farmId ? { ...f, canManage: !f.canManage } : f)))
        }
        onRemove={(farmId) => setAssigned((prev) => prev.filter((f) => f.farmId !== farmId))}
      />
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

  // Fixed overlay: page scroll position is preserved, unlike inline edit forms.
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
          >
            <Icons.X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CreateAccountDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const [assigned, setAssigned] = useState<AssignedFarm[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [pending, setPending] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState("");
  const clientSearch = useClientSearch();

  async function assignAllClientFarms() {
    if (!clientId) return;
    setBulkBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ clientId, limit: "200" });
      const res = await fetch(`/api/farms?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load client estates.");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.farms ?? []);
      const total = Number(res.headers.get("X-Total-Count") ?? arr.length);
      setAssigned((prev) => {
        const seen = new Set(prev.map((p) => p.farmId));
        const next = [...prev];
        for (const f of arr) {
          if (!seen.has(f.id)) {
            seen.add(f.id);
            next.push({ farmId: f.id, farmName: f.name, canManage: false });
          }
        }
        return next;
      });
      if (total > arr.length) {
        setError(`Client has ${total} estates; first ${arr.length} were added. Add the rest via search.`);
      }
    } catch (err: any) {
      setError(err.message ?? "Could not load client estates.");
    } finally {
      setBulkBusy(false);
    }
  }

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
          role: f.get("role"),
          clientId,
          farmIds: assigned.map((a) => a.farmId),
          managesFarmIds: assigned.filter((a) => a.canManage).map((a) => a.farmId),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Account creation failed.");
      }
      onCreated("Account created.");
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Error creating account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DrawerShell title="Create Account" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Full Name</label>
            <input name="name" required minLength={2} maxLength={100} placeholder="Full Name" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>System Role</label>
            <select name="role" defaultValue="FARM_OFFICER">
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Email Address</label>
            <input name="email" type="email" maxLength={254} placeholder="user@example.com (or phone)" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Mobile Phone</label>
            <input name="phone" placeholder="+91 98765 43210" />
          </div>
          <div className="form-group wide" style={{ margin: 0 }}>
            <label>Initial Password</label>
            <input name="password" type="password" required minLength={12} maxLength={128} placeholder="Min 12 characters" />
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label>Client Link</label>
          {clientId ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="badge" style={{ fontSize: 11 }}>{clientName}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={bulkBusy}
                onClick={assignAllClientFarms}
              >
                {bulkBusy ? "Adding..." : "Assign all client estates"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setClientId(null); setClientName(""); }}
              >
                Clear
              </button>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Type to link a client (optional)..."
                value={clientSearch.query}
                onChange={(e) => clientSearch.setQuery(e.target.value)}
                style={{ width: "100%", padding: "8px 12px" }}
              />
              {clientSearch.results.length > 0 && (
                <div
                  style={{
                    position: "absolute", top: "100%", left: 0, right: 0,
                    backgroundColor: "var(--canvas)", border: "1px solid var(--line)",
                    borderRadius: "var(--radius-xs)", zIndex: 20,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 180, overflowY: "auto",
                  }}
                >
                  {clientSearch.results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClientId(c.id);
                        setClientName(c.code ? `${c.name} (${c.code})` : c.name);
                        clientSearch.clear();
                      }}
                      style={{
                        width: "100%", padding: "8px 12px", textAlign: "left", background: "none",
                        border: "none", borderBottom: "1px solid var(--stone)", cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</span>
                      <span className="muted" style={{ fontSize: 11 }}>{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label>Assigned Estates ({assigned.length})</label>
          <FarmAssigner assigned={assigned} setAssigned={setAssigned} clientId={clientId} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-green btn-sm" disabled={pending}>
            {pending ? "Saving..." : "Create Account"}
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
  const [assigned, setAssigned] = useState<AssignedFarm[]>(
    user.farmAccess.map((fa) => ({
      farmId: fa.farmId,
      farmName: fa.farm?.name ?? "Assigned Estate",
      canManage: fa.canManage,
    }))
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const nextRole = String(f.get("role") ?? user.role);
    const nextActive = f.get("active") === "on";
    const newPassword = String(f.get("newPassword") ?? "").trim();

    // Self-demotion guard mirrors the server guard in /api/users/[userId].
    if (user.id === currentUserId && (!nextActive || nextRole !== "SUPER_ADMIN")) {
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
          role: nextRole,
          active: nextActive,
          farmIds: assigned.map((a) => a.farmId),
          managesFarmIds: assigned.filter((a) => a.canManage).map((a) => a.farmId),
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Account update failed.");
      }
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
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Full Name</label>
            <input name="name" defaultValue={user.name} required minLength={2} maxLength={100} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Role</label>
            <select name="role" defaultValue={user.role}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replaceAll("_", " ")}</option>
              ))}
            </select>
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

        <div className="form-group" style={{ margin: 0 }}>
          <label>Assigned Estates ({assigned.length})</label>
          <FarmAssigner assigned={assigned} setAssigned={setAssigned} clientId={user.clientId} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </DrawerShell>
  );
}
