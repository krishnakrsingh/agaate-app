"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { RoleBadge } from "@/components/ui/badge";
import { describeUserAccess, type AccessScope } from "@modules/auth/rbac";
import {
  CreateAccountDrawer,
  DirectoryUser,
  EditAccessDrawer,
} from "@modules/people/ui/people-drawers";
import type { RoleRow } from "./roles-admin";

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

function RoleCell({ user }: { user: DirectoryUser }) {
  const label = user.roleDefinition?.label;
  if (label && !user.roleDefinition?.isSystem) {
    return <span className="role-badge role-agronomist">{label}</span>;
  }
  return <RoleBadge role={user.roleDefinition?.slug ?? user.role} />;
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span className="dir-status" style={{ color: active ? "var(--green-ink)" : "var(--muted)" }}>
      <span className="dir-status-dot" style={{ background: active ? "var(--green-ink)" : "var(--muted)" }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function PeopleDirectory({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [hqRoles, setHqRoles] = useState<RoleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleDefinitionId, setRoleDefinitionId] = useState("ALL");
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
    fetch("/api/hq/roles?tier=hq")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setHqRoles(Array.isArray(data) ? data : []))
      .catch(() => setHqRoles([]));
  }, []);

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
    if (roleDefinitionId !== "ALL") params.set("roleDefinitionId", roleDefinitionId);
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
  }, [page, debouncedSearch, roleDefinitionId, active, sort]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 0);
    return () => clearTimeout(t);
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
  const filtersActive = !!search || roleDefinitionId !== "ALL" || active !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setRoleDefinitionId("ALL");
    setActive("ALL");
    setPage(1);
  };

  const activeRoleLabel = roleDefinitionId === "ALL" ? "" : hqRoles.find((r) => r.id === roleDefinitionId)?.label ?? "Role";

  return (
    <section className="dir-root">
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

      {/* Toolbar */}
      <div className="dir-toolbar">
        <div className="dir-search">
          <Icons.Search size={14} className="dir-search-icon" />
          <input
            className="input-field dir-search-input"
            type="text"
            placeholder="Search team members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search team members by name, email or phone"
          />
          {search && (
            <button type="button" className="dir-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
              <Icons.X size={13} />
            </button>
          )}
        </div>

        <div className="dir-controls">
          <select
            className="input-field dir-select"
            value={roleDefinitionId}
            onChange={(e) => {
              setRoleDefinitionId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
          >
            <option value="ALL">All roles</option>
            {hqRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            className="input-field dir-select"
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="dir-sort">
          <span className="dir-sort-label">Sort:</span>
          <select
            className="input-field dir-select"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortOption);
              setPage(1);
            }}
            aria-label="Sort team members"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm dir-add-btn"
          onClick={() => setShowCreate(true)}
        >
          <Icons.Plus size={14} />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Active filter chips */}
      {(activeRoleLabel || active !== "ALL") && (
        <div className="dir-chips">
          {activeRoleLabel && (
            <span className="dir-chip">
              Role: {activeRoleLabel}
              <button
                type="button"
                onClick={() => setRoleDefinitionId("ALL")}
                aria-label={`Remove role filter`}
              >
                <Icons.X size={11} />
              </button>
            </span>
          )}
          {active !== "ALL" && (
            <span className="dir-chip">
              Status: {active === "true" ? "Active" : "Inactive"}
              <button type="button" onClick={() => setActive("ALL")} aria-label={`Remove status filter`}>
                <Icons.X size={11} />
              </button>
            </span>
          )}
          <button type="button" className="dir-chip-clear" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="dir-bulkbar">
          <strong>{selected.size} selected</strong>
          <button type="button" className="btn btn-primary btn-sm" disabled={bulkBusy} onClick={() => bulkSetActive(true)}>
            Activate
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => bulkSetActive(false)}>
            Deactivate
          </button>
          {bulkBusy && bulk && (
            <span className="dir-muted">
              Working {bulk.done}/{bulk.total}…
            </span>
          )}
          <button type="button" className="dir-chip-clear" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {/* Count */}
      {!error && (
        <div className="dir-count">
          <strong>{total.toLocaleString()}</strong> team member{total === 1 ? "" : "s"}
          {filtersActive ? " matching filters" : ""}
          {total > PAGE_SIZE ? ` · Page ${page} of ${totalPages}` : ""}
        </div>
      )}

      {/* Table */}
      <div className="dir-table-card">
        <div className="dir-table-scroll">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="dir-check-col">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectPage}
                    aria-label="Select all on page"
                  />
                </th>
                <th>Name</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Access Scope</th>
                <th>Status</th>
                <th>Last Active</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="dir-state-cell">
                    <Icons.Spinner size={16} className="spin" /> Loading team members…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="dir-state-cell">
                    <div className="dir-state-title">Couldn’t load team members</div>
                    <p className="dir-state-hint">{error}</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={loadUsers}>
                      Retry
                    </button>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dir-state-cell">
                    <div className="dir-state-title">No team members found</div>
                    <p className="dir-state-hint">
                      {filtersActive
                        ? "Try changing your search or filters."
                        : "Add agronomists, operations managers, or super admins to the internal team."}
                    </p>
                    {filtersActive && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                        Clear all
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const { name: cleanName, title: titleDesignation } = parseNameAndTitle(u.name);
                  const initials = getInitials(cleanName);
                  const scope = (u.roleDefinition?.scope ?? "platform") as AccessScope;
                  const access = describeUserAccess(u.roleDefinition?.slug ?? u.role, u.farmAccess, scope);

                  return (
                    <tr key={u.id} className="dir-row">
                      <td className="dir-check-col">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          aria-label={`Select ${u.name}`}
                        />
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: "var(--surface-strong)",
                              border: "1px solid var(--hairline)",
                              color: "var(--ink)",
                              fontWeight: 700,
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              letterSpacing: "0.02em",
                            }}
                          >
                            {initials}
                          </div>
                          <div className="dir-identity">
                            <span className="dir-name">{cleanName}</span>
                            {titleDesignation && <span className="dir-sub">{titleDesignation}</span>}
                            <span className="dir-code">ID: {u.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="dir-identity">
                          {u.email && <span className="dir-name">{u.email}</span>}
                          {u.phone ? (
                            <a href={`tel:${u.phone}`} className="dir-phone">
                              {u.phone}
                            </a>
                          ) : (
                            !u.email && <span className="dir-muted">No contact</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <RoleCell user={u} />
                      </td>
                      <td>
                        <div className="dir-identity">
                          <span className="dir-sub" style={{ color: "var(--ink)", fontWeight: 500 }}>
                            {access.label}
                          </span>
                          <span className="dir-muted-soft" style={{ fontSize: 11 }}>
                            {access.detail}
                          </span>
                        </div>
                      </td>
                      <td>
                        <ActiveDot active={u.active} />
                      </td>
                      <td className="dir-muted" style={{ whiteSpace: "nowrap" }}>
                        {formatDate(u.lastActive)}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditing(u)}
                          style={{ gap: 5 }}
                        >
                          <Icons.Edit size={12} />
                          <span>Edit access</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="dir-pagination">
          <span>
            Showing {total > 0 ? offset + 1 : 0}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>
          <div className="dir-pagination-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icons.ChevronLeft size={13} /> Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <Icons.ChevronRight size={13} />
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
