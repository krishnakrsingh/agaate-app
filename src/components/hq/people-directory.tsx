"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "../icons";
import { RoleBadge } from "../ui/badge";
import { EmptyState } from "../ui/empty-state";
import {
  CreateAccountDrawer,
  DirectoryUser,
  EditAccessDrawer,
  ROLES,
} from "./people-drawers";

const PAGE_SIZE = 25;

type SortOption = "recent" | "name-asc" | "name-desc" | "updated";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Most recent",
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
  updated: "Recently updated",
};

function sortParams(sort: SortOption): { sortBy: string; sortOrder: string } {
  switch (sort) {
    case "name-asc":
      return { sortBy: "name", sortOrder: "asc" };
    case "name-desc":
      return { sortBy: "name", sortOrder: "desc" };
    case "updated":
      return { sortBy: "updatedAt", sortOrder: "desc" };
    default:
      return { sortBy: "createdAt", sortOrder: "desc" };
  }
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function parseNameAndTitle(rawName: string) {
  const match = rawName.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return { name: match[1].trim(), title: match[2].trim() };
  }
  return { name: rawName.trim(), title: null };
}

function getInitials(name: string) {
  const clean = name.replace(/^Dr\.\s+/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.substring(0, 2) || "U").toUpperCase();
}

export function PeopleDirectory({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [active, setActive] = useState("ALL");
  const [sort, setSort] = useState<SortOption>("recent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ done: number; total: number; failures: { id: string; name: string; error: string }[] } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DirectoryUser | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(() => {
    setLoading(true);
    setError("");
    const { sortBy, sortOrder } = sortParams(sort);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
      sortBy,
      sortOrder,
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (role !== "ALL") params.set("role", role);
    if (active !== "ALL") params.set("active", active);

    fetch(`/api/hq/people?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load internal team directory.");
        }
        const headerTotal = res.headers.get("X-Total-Count");
        const data: DirectoryUser[] = await res.json();
        setUsers(data);
        setTotal(headerTotal != null ? Number(headerTotal) : data.length);
        setSelected(new Set());
      })
      .catch((err) => {
        setError(err.message || "Network error loading directory.");
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, role, active, sort]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    if (users.length === 0) return;
    const allOnPage = users.every((u) => selected.has(u.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) {
        users.forEach((u) => next.delete(u.id));
      } else {
        users.forEach((u) => next.add(u.id));
      }
      return next;
    });
  }

  async function bulkSetActive(nextActive: boolean) {
    if (selected.size === 0 || bulkBusy) return;
    const targets = users.filter((u) => selected.has(u.id));
    if (targets.length === 0) return;

    if (nextActive === false && targets.some((u) => u.id === currentUserId)) {
      setError("You cannot deactivate your own account.");
      return;
    }

    setBulkBusy(true);
    setBulk({ done: 0, total: targets.length, failures: [] });
    setError("");
    setMessage("");

    const failures: { id: string; name: string; error: string }[] = [];
    let done = 0;

    for (const u of targets) {
      try {
        const res = await fetch(`/api/users/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: nextActive }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Update failed.");
        }
      } catch (err: any) {
        failures.push({ id: u.id, name: u.name, error: err.message ?? "Update failed." });
      }
      done += 1;
      setBulk({ done, total: targets.length, failures: [...failures] });
    }
    setBulkBusy(false);
    setSelected(new Set());
    loadUsers();
    const ok = targets.length - failures.length;
    setMessage(
      failures.length
        ? `${ok} of ${targets.length} accounts ${nextActive ? "activated" : "deactivated"}; ${failures.length} failed.`
        : `${ok} account${ok === 1 ? "" : "s"} ${nextActive ? "activated" : "deactivated"}.`
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;
  const allPageSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && <div className="error" role="alert"><Icons.AlertCircle size={15} /><span>{error}</span></div>}
      {message && <div className="success-banner" role="status"><Icons.CheckCircle size={15} /><span>{message}</span></div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", flex: "1 1 auto" }}>
          <div className="form-group" style={{ margin: 0, minWidth: 200, flex: "1 1 200px" }}>
            <label>Search</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  style={{ position: "absolute", right: 10, top: 10, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
                >
                  <Icons.X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
            <label>Role</label>
            <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
              <option value="ALL">All internal roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r === "AGRONOMIST" ? "Agronomist" : "Super Admin"}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: 130 }}>
            <label>Status</label>
            <select value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
              <option value="ALL">Active + Inactive</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
            <label>Sort</label>
            <select value={sort} onChange={(e) => { setSort(e.target.value as SortOption); setPage(1); }}>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                <option key={s} value={s}>{SORT_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} style={{ alignSelf: "flex-end" }}>
          <Icons.Plus size={14} />
          <span>Add Team Member</span>
        </button>
      </div>

      {selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", fontSize: 13, flexWrap: "wrap" }}>
          <strong>{selected.size} selected</strong>
          <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => bulkSetActive(true)}>
            Activate
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => bulkSetActive(false)}>
            Deactivate
          </button>
          {bulkBusy && bulk && <span className="muted">Working {bulk.done}/{bulk.total}...</span>}
          <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--muted)", padding: "2px 0" }}>
        <span>
          Showing {total > 0 ? offset + 1 : 0}-{Math.min(offset + PAGE_SIZE, total)} of{" "}
          <strong style={{ color: "var(--ink)" }}>{total}</strong> internal team members
        </span>
        {loading && <span>Refreshing...</span>}
      </div>

      {users.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage} aria-label="Select page" /></th>
                <th>Name</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Assigned Estates</th>
                <th>Status</th>
                <th>Last Active</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const { name: cleanName, title: titleDesignation } = parseNameAndTitle(u.name);
                const initials = getInitials(cleanName);

                return (
                  <tr key={u.id}>
                    <td><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} aria-label={`Select ${u.name}`} /></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 0" }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--surface-strong) 0%, var(--surface-card) 100%)",
                            border: "1px solid var(--hairline)",
                            color: "var(--primary)",
                            fontWeight: 700,
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            letterSpacing: "0.02em"
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13, lineHeight: 1.3 }}>
                            {cleanName}
                          </div>
                          {titleDesignation && (
                            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, lineHeight: 1.25, marginTop: 1 }}>
                              {titleDesignation}
                            </div>
                          )}
                          <div className="muted" style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", opacity: 0.7, marginTop: 2 }}>
                            ID: {u.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {u.email && <div style={{ color: "var(--ink)", fontWeight: 500 }}>{u.email}</div>}
                      {u.phone && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{u.phone}</div>}
                      {!u.email && !u.phone && <span className="muted">No contact</span>}
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {u.role === "SUPER_ADMIN" ? (
                        <span className="badge" style={{ fontSize: 11, whiteSpace: "nowrap" }}>All Estates (HQ)</span>
                      ) : u.farmCount > 0 ? (
                        <span style={{ fontWeight: 500 }}>{u.farmCount} estate{u.farmCount === 1 ? "" : "s"}</span>
                      ) : (
                        <span className="muted">No estates assigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`status ${u.active ? "active" : "inactive"}`} style={{ whiteSpace: "nowrap" }}>
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }} className="muted">
                      {formatDate(u.lastActive)}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditing(u)}
                      >
                        <Icons.Edit size={12} />
                        <span>Edit Access</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !loading ? (
        <EmptyState
          icon={<Icons.Users size={24} />}
          title="No internal team members found"
          description="Use 'Add Team Member' to invite an agronomist or super admin."
          action={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreate(true)}
            >
              Add Team Member
            </button>
          }
        />
      ) : null}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
          <span className="muted" style={{ fontSize: 12 }}>Page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateAccountDrawer
          onClose={() => setShowCreate(false)}
          onCreated={(msg) => {
            setMessage(msg);
            loadUsers();
          }}
        />
      )}
      {editing && (
        <EditAccessDrawer
          user={editing}
          currentUserId={currentUserId}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setMessage(msg);
            loadUsers();
          }}
        />
      )}
    </section>
  );
}
