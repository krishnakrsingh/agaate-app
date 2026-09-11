"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";

type SearchableItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: "FARMS" | "PLOTS" | "CLIENTS" | "TASKS" | "INCIDENTS" | "PEOPLE" | "NAVIGATION" | "ACTIONS";
  href: string;
  badge?: string;
  icon: keyof typeof Icons;
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  role?: string;
}

interface SearchResponse {
  clients: Array<{ id: string; name: string; code: string | null; phone: string | null; href: string }>;
  farms: Array<{ id: string; name: string; location: string; status: string; href: string; client: { name: string } | null }>;
  plots?: Array<{ id: string; name: string; farmName: string; area: number; href: string }>;
  users: Array<{ id: string; name: string; email: string | null; role: string; href: string }>;
  tasks: Array<{ id: string; title: string; status: string; href: string; farm: { id: string; name: string } }>;
  incidents: Array<{ id: string; type: string; status: string; href: string; farm: { id: string; name: string } }>;
}

/**
 * Global search (⌘K) — server-driven via /api/search, debounced 250ms with
 * AbortController. Connects directly to real backend database entities.
 */
export function CommandPalette({ isOpen, onClose, onOpen, role }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [server, setServer] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleClose = useCallback(() => {
    onClose();
    setQuery("");
    setDebounced("");
    setSelectedIndex(0);
    setServer(null);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onOpen();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onOpen, handleClose]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!isOpen || debounced.length < 2) {
      setServer(null);
      setSearching(false);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debounced)}&limit=6`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!ctrl.signal.aborted) {
          setServer(data);
          setSearching(false);
          setSelectedIndex(0);
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setSearching(false);
      });
    return () => ctrl.abort();
  }, [isOpen, debounced]);

  const baseItems: SearchableItem[] = useMemo(() => {
    if (role === "SUPER_ADMIN") {
      return [
        { id: "nav-overview", title: "HQ Overview", subtitle: "Platform metrics & alert inbox", category: "NAVIGATION", href: "/hq", icon: "Activity" },
        { id: "nav-clients", title: "Clients Directory", subtitle: "Client profiles, estates & acreage", category: "NAVIGATION", href: "/hq/clients", icon: "Users" },
        { id: "nav-farms", title: "Farms Portfolio", subtitle: "Cadastral registry, plots & history", category: "NAVIGATION", href: "/hq/farms", icon: "Farm" },
        { id: "nav-onboard", title: "Client Onboarding", subtitle: "Multi-farm setup wizard & drafts", category: "NAVIGATION", href: "/hq/onboarding", icon: "Zap", badge: "Pipeline" },
        { id: "nav-people", title: "People & Workforce", subtitle: "User credentials & estate assignments", category: "NAVIGATION", href: "/hq/people", icon: "User" },
        { id: "nav-map", title: "Platform Map", subtitle: "Satellite GIS map & plot boundaries", category: "NAVIGATION", href: "/hq/map", icon: "Navigation" },
        { id: "act-new-onboard", title: "Onboard New Client", subtitle: "Intake client, 10-20 farms & plots", category: "ACTIONS", href: "/hq/onboarding/new", icon: "Plus", badge: "Action" },
      ];
    }
    if (role === "FARM_ADMIN") {
      return [
        { id: "nav-owner-home", title: "Home Cockpit", subtitle: "Today's estate priorities", category: "NAVIGATION", href: "/owner/dashboard", icon: "Farm" },
        { id: "nav-owner-farm", title: "My Farm", subtitle: "Soil, water & infrastructure", category: "NAVIGATION", href: "/owner/farm", icon: "Plot" },
        { id: "nav-owner-land", title: "Land & Plots", subtitle: "Acreage & active crops", category: "NAVIGATION", href: "/owner/land", icon: "TrendingUp" },
        { id: "nav-owner-ops", title: "Operations", subtitle: "Field tasks & schedules", category: "NAVIGATION", href: "/owner/operations", icon: "ClipboardList" },
        { id: "nav-owner-people", title: "People & Labor", subtitle: "On-site managers & muster", category: "NAVIGATION", href: "/owner/people", icon: "Users" },
        { id: "nav-owner-records", title: "Logistics & Records", subtitle: "Harvest, inventory & expenses", category: "NAVIGATION", href: "/owner/records", icon: "Truck" },
        { id: "nav-owner-insights", title: "Farm Insights", subtitle: "Yield & executive brief", category: "NAVIGATION", href: "/owner/insights", icon: "Activity" },
        { id: "nav-owner-settings", title: "Settings", subtitle: "Geofence & configuration", category: "NAVIGATION", href: "/owner/settings", icon: "Settings" },
      ];
    }
    if (role === "FARM_OFFICER") {
      return [
        { id: "nav-officer-day", title: "My Day", subtitle: "Clock in, tasks, completion", category: "NAVIGATION", href: "/officer/day", icon: "ClipboardList", badge: "Duty" },
        { id: "nav-officer-reports", title: "Field Signals & Incidents", subtitle: "Crop monitoring updates", category: "NAVIGATION", href: "/officer/reports", icon: "AlertTriangle" },
        { id: "nav-officer-profile", title: "Officer Profile", subtitle: "Account & duty logs", category: "NAVIGATION", href: "/officer/profile", icon: "User" },
      ];
    }
    return [
      { id: "nav-agronomy-radar", title: "Crop Radar", subtitle: "Monitoring & health", category: "NAVIGATION", href: "/agronomy/radar", icon: "TrendingUp" },
      { id: "nav-agronomy-plan", title: "Weekly Plan", subtitle: "Schedule prescriptions", category: "NAVIGATION", href: "/agronomy/planning", icon: "Calendar" },
      { id: "nav-tasks", title: "All Tasks", subtitle: "Field activities", category: "NAVIGATION", href: "/tasks", icon: "ClipboardList" },
    ];
  }, [role]);

  const allItems: SearchableItem[] = useMemo(() => {
    const q = debounced.toLowerCase();
    const nav = !q ? baseItems.slice(0, 8) : baseItems.filter((i) => i.title.toLowerCase().includes(q) || (i.subtitle ?? "").toLowerCase().includes(q));
    if (!server || debounced.length < 2) return nav;
    const out: SearchableItem[] = [...nav];
    for (const f of server.farms) out.push({ id: `farm-${f.id}`, title: f.name, subtitle: `${f.location}${f.client ? ` • ${f.client.name}` : ""} • ${f.status}`, category: "FARMS", href: f.href, badge: f.status, icon: "Farm" });
    for (const p of (server.plots || [])) out.push({ id: `plot-${p.id}`, title: p.name, subtitle: `Plot in ${p.farmName} • ${p.area} ac`, category: "PLOTS", href: p.href, icon: "Plot" });
    for (const c of server.clients) out.push({ id: `client-${c.id}`, title: c.name, subtitle: `${c.code ?? ""} ${c.phone ?? ""}`.trim(), category: "CLIENTS", href: c.href, icon: "Users" });
    for (const t of server.tasks) out.push({ id: `task-${t.id}`, title: t.title, subtitle: `${t.farm.name} • ${t.status}`, category: "TASKS", href: t.href, badge: t.status, icon: "ClipboardList" });
    for (const i of server.incidents) out.push({ id: `inc-${i.id}`, title: i.type, subtitle: `${i.farm.name} • ${i.status}`, category: "INCIDENTS", href: i.href, badge: i.status, icon: "AlertTriangle" });
    for (const u of server.users) out.push({ id: `user-${u.id}`, title: u.name, subtitle: `${u.email ?? ""} • ${u.role}`, category: "PEOPLE", href: u.href, icon: "User" });
    return out.slice(0, 25);
  }, [baseItems, server, debounced]);

  const filteredItems = allItems;

  const handleSelect = (item: SearchableItem) => {
    handleClose();
    router.push(item.href);
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, paddingLeft: 16, paddingRight: 16, backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        style={{ width: "100%", maxWidth: 580, backgroundColor: "var(--canvas)", border: "1px solid var(--hairline-strong)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-modal)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleListKeyDown}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--hairline)", backgroundColor: "var(--surface-strong)" }}>
          <span style={{ color: "var(--muted)", display: "flex", alignItems: "center" }}>
            <Icons.Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search farms, clients, users, tasks, incidents… (⌘K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            style={{ flex: 1, backgroundColor: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--ink)" }}
          />
          {searching && (
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
              SEARCHING…
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              No matches found for &ldquo;{debounced}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const IconComp = Icons[item.icon] || Icons.Layers;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isSelected ? "var(--surface-strong)" : "transparent",
                    cursor: "pointer",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span style={{ color: isSelected ? "var(--ink)" : "var(--muted)", display: "flex", alignItems: "center" }}>
                      <IconComp size={16} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {item.badge && (
                      <span className="status-badge" style={{ fontSize: 10 }}>
                        {item.badge}
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                      {item.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--hairline)", backgroundColor: "var(--surface-card)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
          <span>Navigate: ↑↓ • Open: ↵</span>
          <span>Close: Esc</span>
        </div>
      </div>
    </div>
  );
}
