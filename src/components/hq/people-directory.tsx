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
  useClientSearch,
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

type LabourData = {
  totalOfficers: number;
  byClient: { clientId: string | null; client: { id: string; name: string; code: string | null } | null; officers: number }[];
  byFarm: { farmId: string; farm: { id: string; name: string; location: string; client: { id: string; name: string; code: string | null } | null } | null; officers: number }[];
  farmGroups: number;
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function PeopleDirectory({ currentUserId }: { currentUserId: string }) {
  const [view, setView] = useState<"directory" | "labour">("directory");
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [active, setActive] = useState("ALL");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ done: number; total: number; failures: { id: string; name: string; error: string }[] } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DirectoryUser | null>(null);

  const [labour, setLabour] = useState<LabourData | null>(null);
  const [labourLoading, setLabourLoading] = useState(false);
  const [labourError, setLabourError] = useState("");

  const clientSearch = useClientSearch();

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
    if (clientId) params.set("clientId", clientId);

    fetch(`/api/hq/people?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load directory.");
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
  }, [page, debouncedSearch, role, active, clientId, sort]);

  useEffect(() => {
    if (view === "directory") loadUsers();
  }, [view, loadUsers]);

  const loadLabour = useCallback(() => {
    setLabourLoading(true);
    setLabourError("");
    const params = new URLSearchParams({ limit: "100" });
    if (clientId) params.set("clientId", clientId);
    fetch(`/api/hq/people/labour?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load labour view.");
        }
        setLabour(await res.json());
      })
      .catch((err) => setLabourError(err.message || "Network error loading labour view."))
      .finally(() => setLabourLoading(false));
  }, [clientId]);

  useEffect(() => {
    if (view === "labour") loadLabour();
  }, [view, loadLabour]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelected((prev) => {
      if (users.every((u) => prev.has(u.id))) return new Set();
      return new Set(users.map((u) => u.id));
    });
  }

  // Sequential PATCH with progress + partial-failure report. Sequential (not
  // parallel) so the last-admin guard and audit log stay ordered and the
  // server is never hit with a bulk burst.
  async function bulkSetActive(nextActive: boolean) {
    const targets = users.filter((u) => selected.has(u.id));
    if (!targets.length || bulkBusy) return;
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
        ? `${ok} of ${targets.length} accounts ${nextActive ? "activated" : "deactivated"}; ${failures.length} failed (listed below).`
        : `${ok} account${ok === 1 ? "" : "s"} ${nextActive ? "activated" : "deactivated"}.`
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;
  const allPageSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="tabs-nav">
        <button type="button" className={`tab-btn ${view === "directory" ? "active" : ""}`} onClick={() => setView("directory")}>
          Directory
        </button>
        <button type="button" className={`tab-btn ${view === "labour" ? "active" : ""}`} onClick={() => setView("labour")}>
          Labour Lens
        </button>
      </div>

      {error && <div className="error" role="alert"><Icons.AlertCircle size={15} /><span>{error}</span></div>}
      {message && <div className="success-banner" role="status"><Icons.CheckCircle size={15} /><span>{message}</span></div>}

      {view === "directory" ? (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="form-group" style={{ margin: 0, minWidth: 220, flex: "1 1 220px" }}>
              <label>Search</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Name, email, phone, or User ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    style={{ position: "absolute", right: 10, top: 12, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
                  >
                    <Icons.X size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
              <label>Role</label>
              <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
                <option value="ALL">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.replaceAll("_", " ")}</option>
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
            <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
              <label>Client</label>
              {clientId ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="badge" style={{ fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientName}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setClientId(null); setClientName(""); setPage(1); }}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Type client name..."
                    value={clientSearch.query}
                    onChange={(e) => clientSearch.setQuery(e.target.value)}
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
                            setPage(1);
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
            <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
              <label>Sort</label>
              <select value={sort} onChange={(e) => { setSort(e.target.value as SortOption); setPage(1); }}>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                  <option key={s} value={s}>{SORT_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-green btn-sm" onClick={() => setShowCreate(true)}>
              <Icons.Plus size={14} />
              <span>Add Account</span>
            </button>
          </div>

          {selected.size > 0 && (
            <div
              style={{
                display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                padding: "10px 14px", background: "var(--stone)",
                border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", fontSize: 13,
              }}
            >
              <strong>{selected.size} selected on this page</strong>
              <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => bulkSetActive(true)}>
                Activate
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => bulkSetActive(false)}>
                Deactivate
              </button>
              {bulkBusy && bulk && <span className="muted">Working {bulk.done}/{bulk.total}...</span>}
              {bulkBusy && bulk && (
                <span style={{ flex: "1 1 160px", height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${(bulk.done / Math.max(1, bulk.total)) * 100}%`, background: "var(--ink)" }} />
                </span>
              )}
              <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </div>
          )}

          {bulk && !bulkBusy && bulk.failures.length > 0 && (
            <div className="error" role="alert" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <strong>Partial failure: {bulk.failures.length} of {bulk.total} not updated.</strong>
              <ul style={{ margin: "4px 0 0 16px", fontSize: 13 }}>
                {bulk.failures.map((f) => (
                  <li key={f.id}>{f.name} — {f.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--muted)", padding: "4px 2px" }}>
            <span>
              Showing {total > 0 ? offset + 1 : 0}-{Math.min(offset + PAGE_SIZE, total)} of{" "}
              <strong style={{ color: "var(--ink)" }}>{total.toLocaleString()}</strong> accounts
            </span>
            {loading && <span>Refreshing directory...</span>}
          </div>

          {users.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage} aria-label="Select page" /></th>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Farms</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} aria-label={`Select ${u.name}`} /></td>
                      <td title={u.id} style={{ fontSize: 12 }} className="muted">{u.id.slice(0, 8)}...</td>
                      <td><strong>{u.name}</strong></td>
                      <td style={{ fontSize: 12 }}>
                        {u.email && <div>{u.email}</div>}
                        {u.phone && <div className="muted">{u.phone}</div>}
                        {!u.email && !u.phone && <span className="muted">No contact</span>}
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td style={{ fontSize: 12 }}>
                        {u.role === "SUPER_ADMIN" ? (
                          <span className="badge" style={{ fontSize: 11 }}>Platform HQ</span>
                        ) : u.client ? (
                          <span title={`Client ID: ${u.client.id}`}>
                            {u.client.name} {u.client.code ? `(${u.client.code})` : ""}
                          </span>
                        ) : (
                          <span className="muted">Direct Platform</span>
                        )}
                      </td>
                      <td>
                        <span className={`status ${u.active ? "active" : "inactive"}`}>
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }} title={u.farmAccess.map((a) => a.farm?.name ?? a.farmId).join(", ") || "None"}>
                        {u.role === "SUPER_ADMIN" ? (
                          <span style={{ color: "var(--green)", fontWeight: 600 }}>Global</span>
                        ) : u.farmCount > 0 ? (
                          <span>{u.farmCount} farm{u.farmCount === 1 ? "" : "s"}</span>
                        ) : (
                          <span className="muted">None</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }} className="muted">{formatDate(u.lastActive)}</td>
                      <td>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(u)}>
                          <Icons.Edit size={12} />
                          <span>Edit Access</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : loading ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icons.Users size={24} /></div>
              <strong className="empty-state-title">Loading directory...</strong>
            </div>
          ) : (
            <EmptyState
              icon={<Icons.Users size={24} />}
              title="No accounts found"
              description={
                debouncedSearch || role !== "ALL" || active !== "ALL" || clientId
                  ? "Try adjusting your search or filters."
                  : "Create the first account to get started."
              }
              action={
                !debouncedSearch && role === "ALL" && active === "ALL" && !clientId ? (
                  <button type="button" className="btn btn-green btn-sm" onClick={() => setShowCreate(true)}>
                    <Icons.Plus size={14} />
                    <span>Add Account</span>
                  </button>
                ) : undefined
              }
            />
          )}

          {totalPages > 1 && (
            <div
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 14px", borderTop: "1px solid var(--line)",
                backgroundColor: "var(--stone)", borderRadius: "var(--radius-sm)",
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
        </>
      ) : (
        <>
          {labourError && <div className="error" role="alert"><Icons.AlertCircle size={15} /><span>{labourError}</span></div>}
          {labourLoading || !labour ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icons.Users size={24} /></div>
              <strong className="empty-state-title">{labourLoading ? "Loading labour view..." : "Labour view unavailable"}</strong>
              {!labourLoading && (
                <p className="empty-state-desc">The labour breakdown could not be loaded.</p>
              )}
            </div>
          ) : labour.totalOfficers === 0 ? (
            <EmptyState
              icon={<Icons.Users size={24} />}
              title="No farm officers found"
              description={clientId ? "No officers linked to this client." : "No FARM_OFFICER accounts exist yet."}
            />
          ) : (
            <>
              <div className="metric-summary-row">
                <div className="metric-summary-item">
                  <span className="metric-label">Farm Officers</span>
                  <span className="metric-value">{labour.totalOfficers.toLocaleString()}</span>
                  <span className="metric-sub">Active field workforce</span>
                </div>
                <div className="metric-summary-item">
                  <span className="metric-label">Hiring Clients</span>
                  <span className="metric-value">{labour.byClient.length.toLocaleString()}</span>
                  <span className="metric-sub">Clients with officers</span>
                </div>
                <div className="metric-summary-item">
                  <span className="metric-label">Staffed Estates</span>
                  <span className="metric-value">{labour.farmGroups.toLocaleString()}</span>
                  <span className="metric-sub">Farms with officers</span>
                </div>
              </div>

              <div className="form-section-title">Officers per client — how many labour each client hired</div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Officers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labour.byClient.map((row) => (
                      <tr key={row.clientId ?? "direct"}>
                        <td>
                          {row.client ? (
                            <span title={`Client ID: ${row.client.id}`}>
                              <strong>{row.client.name}</strong>{" "}
                              <span className="muted">{row.client.code ? `(${row.client.code})` : ""}</span>
                            </span>
                          ) : (
                            <span className="muted">Direct Platform (no client)</span>
                          )}
                        </td>
                        <td><strong>{row.officers}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-section-title">Who works where — officers per estate (top 100)</div>
              {labour.byFarm.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Estate</th>
                        <th>Client</th>
                        <th>Officers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labour.byFarm.map((row) => (
                        <tr key={row.farmId}>
                          <td><strong>{row.farm?.name ?? "Unknown estate"}</strong></td>
                          <td style={{ fontSize: 12 }}>
                            {row.farm?.client ? row.farm.client.name : <span className="muted">No client</span>}
                          </td>
                          <td><strong>{row.officers}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<Icons.Layers size={24} />}
                  title="No estate assignments"
                  description="Officers exist but none are assigned to estates yet."
                />
              )}
            </>
          )}
        </>
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
