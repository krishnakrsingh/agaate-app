"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { useServerList } from "@/components/data/use-server-list";
import { ServerTable } from "@/components/data/server-table";
import { useToast } from "@/components/ui/toast";

type DirectoryTab = "farms" | "clients" | "users" | "plots";

interface FarmRow {
  id: string;
  name: string;
  location: string;
  ownerName: string;
  status: string;
  setupStage: string;
  setupProgress: number;
  totalArea: string | number;
  cultivableArea: string | number;
  state?: string | null;
  district?: string | null;
  client?: { id: string; name: string; code: string | null } | null;
  _count?: { plots: number; access: number };
}

interface ClientRow {
  id: string;
  code: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  district?: string | null;
  status: string;
  totalFarms: number;
  activeFarmsCount: number;
  setupFarmsCount: number;
  totalAcreage: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  active: boolean;
  client?: { id: string; name: string; code: string | null } | null;
  farmAccess?: Array<{ farm: { id: string; name: string } }>;
  createdAt: string;
}

interface PlotRow {
  id: string;
  name: string;
  area: string | number;
  soilType: string;
  status: string;
  farmId: string;
  farmName: string;
  farmLocation: string;
  irrigationTypes: string;
  activeCrops: string;
}

const VIEWS_STORAGE_KEY = "agaate_directory_saved_views_v2";

export function UnifiedDirectory({ initialTab = "farms" }: { initialTab?: DirectoryTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const tabParam = (searchParams.get("tab") as DirectoryTab) || initialTab;
  const [activeTab, setActiveTab] = useState<DirectoryTab>(tabParam);

  // Sync tab with URL parameter
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  function switchTab(newTab: DirectoryTab) {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`/directory?${params.toString()}`);
  }

  // Filters for Farms
  const [farmStatus, setFarmStatus] = useState("ALL");
  const [farmStage, setFarmStage] = useState("ALL");
  const [farmState, setFarmState] = useState("ALL");

  // Filters for Clients
  const [clientStatus, setClientStatus] = useState("ALL");

  // Filters for Users
  const [userRole, setUserRole] = useState("ALL");

  // Filters for Plots
  const [plotStatus, setPlotStatus] = useState("ALL");

  // Bulk action confirmation dialog state
  const [confirmBulk, setConfirmBulk] = useState<null | {
    label: string;
    action: "STATUS" | "STAGE";
    value: string;
  }>(null);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Extra query params for each server list hook
  const farmExtraParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (farmStatus !== "ALL") p.status = farmStatus;
    if (farmStage !== "ALL") p.setupStage = farmStage;
    if (farmState !== "ALL") p.state = farmState;
    return p;
  }, [farmStatus, farmStage, farmState]);

  const clientExtraParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (clientStatus !== "ALL") p.status = clientStatus;
    return p;
  }, [clientStatus]);

  const userExtraParams = useMemo(() => {
    const p: Record<string, string> = { paginate: "true" };
    if (userRole !== "ALL") p.role = userRole;
    return p;
  }, [userRole]);

  const plotExtraParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (plotStatus !== "ALL") p.status = plotStatus;
    return p;
  }, [plotStatus]);

  // Hook instances for each collection
  const farmList = useServerList<FarmRow>("/api/farms", { initialLimit: 25, extraParams: farmExtraParams });
  const clientList = useServerList<ClientRow>("/api/admin/clients", { initialLimit: 25, extraParams: clientExtraParams });
  const userList = useServerList<UserRow>("/api/users", { initialLimit: 25, extraParams: userExtraParams });
  const plotList = useServerList<PlotRow>("/api/plots", { initialLimit: 25, extraParams: plotExtraParams });

  // Saved Views (localStorage)
  function saveCurrentView() {
    try {
      const raw = localStorage.getItem(VIEWS_STORAGE_KEY);
      const views = raw ? JSON.parse(raw) : [];
      const newPreset = {
        id: Date.now().toString(),
        tab: activeTab,
        timestamp: new Date().toISOString(),
        title: `${activeTab.toUpperCase()} preset (${new Date().toLocaleDateString()})`,
        filters: activeTab === "farms" ? { farmStatus, farmStage, farmState } : { clientStatus },
      };
      views.push(newPreset);
      localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(views.slice(-8)));
      toast.success("Current filter view saved locally.");
    } catch {
      toast.error("Unable to save view.");
    }
  }

  // Export current selection to CSV
  function exportSelectionCsv() {
    if (activeTab === "farms") {
      const selectedFarms = farmList.rows.filter((f) => farmList.selected.has(f.id));
      const targetRows = selectedFarms.length ? selectedFarms : farmList.rows;
      const csv = [
        "Farm ID,Name,Location,Owner,Status,Stage,Acreage,Client",
        ...targetRows.map((f) =>
          `"${f.id}","${f.name}","${f.location}","${f.ownerName}","${f.status}","${f.setupStage}","${f.totalArea}","${f.client?.name || ""}"`
        ),
      ].join("\n");
      downloadCsv(csv, "agaate-farms-export.csv");
    } else if (activeTab === "clients") {
      const selectedClients = clientList.rows.filter((c) => clientList.selected.has(c.id));
      const targetRows = selectedClients.length ? selectedClients : clientList.rows;
      const csv = [
        "Client ID,Code,Name,Company,Phone,Email,Region,Status,Total Farms,Total Acreage",
        ...targetRows.map((c) =>
          `"${c.id}","${c.code}","${c.name}","${c.companyName || ""}","${c.phone || ""}","${c.email || ""}","${c.state || ""}","${c.status}","${c.totalFarms}","${c.totalAcreage}"`
        ),
      ].join("\n");
      downloadCsv(csv, "agaate-clients-export.csv");
    } else if (activeTab === "users") {
      const selectedUsers = userList.rows.filter((u) => userList.selected.has(u.id));
      const targetRows = selectedUsers.length ? selectedUsers : userList.rows;
      const csv = [
        "User ID,Name,Email,Phone,Role,Active,Client",
        ...targetRows.map((u) =>
          `"${u.id}","${u.name}","${u.email}","${u.phone || ""}","${u.role}","${u.active}","${u.client?.name || ""}"`
        ),
      ].join("\n");
      downloadCsv(csv, "agaate-users-export.csv");
    } else if (activeTab === "plots") {
      const selectedPlots = plotList.rows.filter((p) => plotList.selected.has(p.id));
      const targetRows = selectedPlots.length ? selectedPlots : plotList.rows;
      const csv = [
        "Plot ID,Name,Area,Soil Type,Status,Farm,Active Crops",
        ...targetRows.map((p) =>
          `"${p.id}","${p.name}","${p.area}","${p.soilType}","${p.status}","${p.farmName}","${p.activeCrops}"`
        ),
      ].join("\n");
      downloadCsv(csv, "agaate-plots-export.csv");
    }
  }

  function downloadCsv(csvContent: string, fileName: string) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export generated successfully.");
  }

  // Execute Bulk Action on Farms
  async function handleExecuteBulkFarms() {
    if (!confirmBulk) return;
    const farmIds = [...farmList.selected];
    setIsBulkExecuting(true);
    try {
      const payload: any = {
        farmIds,
        action: confirmBulk.action,
        expectedCount: farmIds.length,
      };
      if (confirmBulk.action === "STATUS") payload.status = confirmBulk.value;
      if (confirmBulk.action === "STAGE") payload.setupStage = confirmBulk.value;

      const res = await fetch("/api/farms/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Bulk operation failed.");

      toast.success(`Successfully updated ${data.updated} farm(s).`);
      setConfirmBulk(null);
      farmList.reload();
    } catch (err: any) {
      toast.error(err.message || "Bulk operation failed.");
    } finally {
      setIsBulkExecuting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. High-Precision Segmented Tab Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--hairline)",
          paddingBottom: "8px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "inline-flex", gap: "4px", background: "var(--surface-strong)", padding: "4px", borderRadius: "var(--radius-pill)" }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "farms" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => switchTab("farms")}
          >
            <Icons.Farm size={14} />
            <span>Farms {farmList.total != null && `(${farmList.total.toLocaleString()})`}</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "clients" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => switchTab("clients")}
          >
            <Icons.Users size={14} />
            <span>Clients {clientList.total != null && `(${clientList.total.toLocaleString()})`}</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "users" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => switchTab("users")}
          >
            <Icons.User size={14} />
            <span>Users {userList.total != null && `(${userList.total.toLocaleString()})`}</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "plots" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => switchTab("plots")}
          >
            <Icons.Plot size={14} />
            <span>Plots {plotList.total != null && `(${plotList.total.toLocaleString()})`}</span>
          </button>
        </div>

        {/* Global Toolbar Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={saveCurrentView}
            title="Bookmark this view in local browser storage"
          >
            <Icons.Check size={13} />
            <span>Save View</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={exportSelectionCsv}
            title="Download CSV of selected or page records"
          >
            <Icons.Upload size={13} style={{ transform: "rotate(180deg)" }} />
            <span>Export CSV</span>
          </button>
          {activeTab === "farms" && (
            <Link href="/farms/new" className="btn btn-primary btn-sm">
              <Icons.Plus size={13} />
              <span>Register Farm</span>
            </Link>
          )}
          {activeTab === "clients" && (
            <Link href="/onboarding" className="btn btn-primary btn-sm">
              <Icons.Plus size={13} />
              <span>Onboard Client</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. TAB: FARMS DIRECTORY */}
      {activeTab === "farms" && (
        <ServerTable<FarmRow>
          columns={[
            {
              key: "farm",
              header: "Farm & Location",
              render: (f) => (
                <div style={{ minWidth: 240 }}>
                  <Link href={`/farms/${f.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                    {f.name}
                  </Link>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                    {f.location} {f.district ? `• ${f.district}` : ""} {f.state ? `• ${f.state}` : ""}
                  </div>
                  {f.client && (
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                      Org: <Link href={`/clients/${f.client.id}`}>{f.client.name}</Link>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "owner",
              header: "Manager / Owner",
              render: (f) => <span style={{ fontSize: "13px" }}>{f.ownerName}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (f) => (
                <span className={`status-badge ${f.status.toLowerCase()}`}>
                  {f.status}
                </span>
              ),
            },
            {
              key: "stage",
              header: "Setup Stage",
              render: (f) => (
                <div>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
                    {f.setupStage.replaceAll("_", " ")}
                  </span>
                  {f.status === "SETUP" && (
                    <div style={{ width: "80px", height: "4px", background: "var(--hairline)", borderRadius: "2px", marginTop: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${f.setupProgress}%`, height: "100%", background: "var(--primary)" }} />
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "acreage",
              header: "Acreage",
              render: (f) => (
                <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)" }}>
                  {Number(f.cultivableArea || 0)} / {Number(f.totalArea || 0)} ac
                </span>
              ),
            },
            {
              key: "plots",
              header: "Plots",
              render: (f) => (
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                  {f._count?.plots ?? 0} plot(s)
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (f) => (
                <Link href={`/farms/${f.id}`} className="text-action" style={{ fontSize: "13px" }}>
                  Workspace →
                </Link>
              ),
            },
          ]}
          rows={farmList.rows}
          total={farmList.total}
          page={farmList.page}
          limit={farmList.limit}
          loading={farmList.loading}
          error={farmList.error}
          search={farmList.search}
          onSearch={farmList.setSearch}
          onPage={farmList.setPage}
          onLimit={farmList.setLimit}
          onRetry={farmList.reload}
          searchPlaceholder="Search 25,000+ farms by name, owner, location..."
          emptyTitle="No farms match current filters"
          emptyHint="Refine search query, or clear state/stage filters above."
          selected={farmList.selected}
          onToggleSelect={farmList.toggleSelect}
          onTogglePage={farmList.toggleSelectPage}
          toolbar={
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select
                aria-label="Filter by Status"
                value={farmStatus}
                onChange={(e) => setFarmStatus(e.target.value)}
                style={{ height: "36px", fontSize: "13px", minWidth: "120px" }}
              >
                <option value="ALL">Status: All</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SETUP">SETUP</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>

              <select
                aria-label="Filter by Setup Stage"
                value={farmStage}
                onChange={(e) => setFarmStage(e.target.value)}
                style={{ height: "36px", fontSize: "13px", minWidth: "140px" }}
              >
                <option value="ALL">Stage: All Stages</option>
                <option value="SURVEY_SOIL_TEST">Survey & Soil Test</option>
                <option value="PLOT_DEMARCATION">Plot Demarcation</option>
                <option value="BED_SOIL_PREP">Bed & Soil Prep</option>
                <option value="IRRIGATION_LAYOUT">Irrigation Layout</option>
                <option value="HANDED_OVER">Handed Over</option>
              </select>
            </div>
          }
          bulkBar={
            farmList.selected.size > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  background: "var(--surface-strong)",
                  borderBottom: "1px solid var(--hairline)",
                  fontSize: "13px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {farmList.selected.size} farm(s) selected
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setConfirmBulk({ label: "Mark as ACTIVE", action: "STATUS", value: "ACTIVE" })}
                  >
                    Activate Selected
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setConfirmBulk({ label: "Advance to Handed Over", action: "STAGE", value: "HANDED_OVER" })}
                  >
                    Handover Selected
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={farmList.clearSelection}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )
          }
        />
      )}

      {/* 3. TAB: CLIENTS DIRECTORY */}
      {activeTab === "clients" && (
        <ServerTable<ClientRow>
          columns={[
            {
              key: "client",
              header: "Client & Business Profile",
              render: (c) => (
                <div style={{ minWidth: 240 }}>
                  <Link href={`/clients/${c.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                    {c.name}
                  </Link>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    {c.code} {c.companyName ? `• ${c.companyName}` : ""}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                    {[c.phone, c.email].filter(Boolean).join(" • ")}
                  </div>
                </div>
              ),
            },
            {
              key: "region",
              header: "State / District",
              render: (c) => <span style={{ fontSize: "13px" }}>{[c.district, c.state].filter(Boolean).join(", ") || "—"}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (c) => <span className={`status-badge ${c.status.toLowerCase()}`}>{c.status}</span>,
            },
            {
              key: "farms",
              header: "Farms Portfolio",
              render: (c) => (
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                  {c.totalFarms} farm(s) • {c.activeFarmsCount} active
                </span>
              ),
            },
            {
              key: "acreage",
              header: "Total Acreage",
              render: (c) => (
                <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)" }}>
                  {Number(c.totalAcreage || 0).toFixed(1)} ac
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (c) => (
                <Link href={`/clients/${c.id}`} className="text-action" style={{ fontSize: "13px" }}>
                  Workspace →
                </Link>
              ),
            },
          ]}
          rows={clientList.rows}
          total={clientList.total}
          page={clientList.page}
          limit={clientList.limit}
          loading={clientList.loading}
          error={clientList.error}
          search={clientList.search}
          onSearch={clientList.setSearch}
          onPage={clientList.setPage}
          onLimit={clientList.setLimit}
          onRetry={clientList.reload}
          searchPlaceholder="Search 10,000+ client organizations by name, code, phone, company..."
          emptyTitle="No clients match current filters"
          emptyHint="Search queries are resolved server-side with sub-millisecond database indices."
          selected={clientList.selected}
          onToggleSelect={clientList.toggleSelect}
          onTogglePage={clientList.toggleSelectPage}
          toolbar={
            <select
              aria-label="Filter by Client Status"
              value={clientStatus}
              onChange={(e) => setClientStatus(e.target.value)}
              style={{ height: "36px", fontSize: "13px", minWidth: "120px" }}
            >
              <option value="ALL">Status: All</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          }
        />
      )}

      {/* 4. TAB: USERS & ACCESS DIRECTORY */}
      {activeTab === "users" && (
        <ServerTable<UserRow>
          columns={[
            {
              key: "name",
              header: "User Identity",
              render: (u) => (
                <div style={{ minWidth: 200 }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{u.name}</span>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                    {[u.phone, u.email].filter(Boolean).join(" • ")}
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role / Tier",
              render: (u) => (
                <span className="status-badge" style={{ fontSize: "11px", textTransform: "uppercase" }}>
                  {u.role.replaceAll("_", " ")}
                </span>
              ),
            },
            {
              key: "client",
              header: "Organization / Client",
              render: (u) => (
                <span style={{ fontSize: "13px" }}>
                  {u.client ? u.client.name : "Agaate Platform"}
                </span>
              ),
            },
            {
              key: "access",
              header: "Assigned Estates",
              render: (u) => (
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                  {u.farmAccess && u.farmAccess.length > 0 ? `${u.farmAccess.length} farm(s)` : "Unassigned"}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (u) => (
                <span className={`status-badge ${u.active ? "active" : "inactive"}`}>
                  {u.active ? "ACTIVE" : "INACTIVE"}
                </span>
              ),
            },
          ]}
          rows={userList.rows}
          total={userList.total}
          page={userList.page}
          limit={userList.limit}
          loading={userList.loading}
          error={userList.error}
          search={userList.search}
          onSearch={userList.setSearch}
          onPage={userList.setPage}
          onLimit={userList.setLimit}
          onRetry={userList.reload}
          searchPlaceholder="Search 10,000+ users by name, phone, email..."
          emptyTitle="No users match query"
          emptyHint="Try searching by full mobile number or partial name."
          selected={userList.selected}
          onToggleSelect={userList.toggleSelect}
          onTogglePage={userList.toggleSelectPage}
          toolbar={
            <select
              aria-label="Filter by Role"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              style={{ height: "36px", fontSize: "13px", minWidth: "140px" }}
            >
              <option value="ALL">Role: All Tiers</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="FARM_ADMIN">Farm Admin (Owner)</option>
              <option value="AGRONOMIST">Agronomist</option>
              <option value="FARM_OFFICER">Farm Officer</option>
            </select>
          }
        />
      )}

      {/* 5. TAB: PLOTS DIRECTORY */}
      {activeTab === "plots" && (
        <ServerTable<PlotRow>
          columns={[
            {
              key: "plot",
              header: "Plot Name",
              render: (p) => (
                <div style={{ minWidth: 180 }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                    Soil: {p.soilType}
                  </div>
                </div>
              ),
            },
            {
              key: "farm",
              header: "Parent Farm Estate",
              render: (p) => (
                <div style={{ minWidth: 200 }}>
                  <Link href={`/farms/${p.farmId}`} style={{ fontWeight: 500 }}>
                    {p.farmName}
                  </Link>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                    {p.farmLocation}
                  </div>
                </div>
              ),
            },
            {
              key: "area",
              header: "Acreage",
              render: (p) => (
                <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)" }}>
                  {p.area} ac
                </span>
              ),
            },
            {
              key: "irrigation",
              header: "Irrigation Setup",
              render: (p) => <span style={{ fontSize: "12px" }}>{p.irrigationTypes}</span>,
            },
            {
              key: "crops",
              header: "Active / Planned Crops",
              render: (p) => <span style={{ fontSize: "12px", fontWeight: 500 }}>{p.activeCrops}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (p) => <span className={`status-badge ${p.status.toLowerCase()}`}>{p.status}</span>,
            },
          ]}
          rows={plotList.rows}
          total={plotList.total}
          page={plotList.page}
          limit={plotList.limit}
          loading={plotList.loading}
          error={plotList.error}
          search={plotList.search}
          onSearch={plotList.setSearch}
          onPage={plotList.setPage}
          onLimit={plotList.setLimit}
          onRetry={plotList.reload}
          searchPlaceholder="Search 35,000+ plots by name, soil, farm..."
          emptyTitle="No plots found"
          emptyHint="Try searching by parcel or estate name."
          selected={plotList.selected}
          onToggleSelect={plotList.toggleSelect}
          onTogglePage={plotList.toggleSelectPage}
          toolbar={
            <select
              aria-label="Filter by Plot Status"
              value={plotStatus}
              onChange={(e) => setPlotStatus(e.target.value)}
              style={{ height: "36px", fontSize: "13px", minWidth: "120px" }}
            >
              <option value="ALL">Status: All</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SETUP">SETUP</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          }
        />
      )}

      {/* Bulk Action Confirmation Modal */}
      {confirmBulk && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "grid",
            placeItems: "center",
            background: "rgba(12, 10, 9, 0.4)",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--canvas)",
              border: "1px solid var(--hairline-strong)",
              borderRadius: "var(--radius-xl)",
              maxWidth: "480px",
              width: "100%",
              padding: "24px",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <h3 style={{ fontSize: "20px", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
              Confirm Bulk Action
            </h3>
            <p style={{ fontSize: "14px", color: "var(--body)", marginBottom: "20px" }}>
              Are you sure you want to execute <strong>{confirmBulk.label}</strong> across{" "}
              <strong>{farmList.selected.size} selected farms</strong>? This action updates live records in the database.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmBulk(null)}
                disabled={isBulkExecuting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteBulkFarms}
                disabled={isBulkExecuting}
              >
                {isBulkExecuting ? "Executing..." : "Confirm & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
