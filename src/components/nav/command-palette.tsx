"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";

type SearchableItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: "FARMS" | "CLIENTS" | "TASKS" | "INCIDENTS" | "PEOPLE" | "NAVIGATION" | "ACTIONS";
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
  farms: Array<{ id: string; name: string; location: string; status: string; href: string }>;
  users: Array<{ id: string; name: string; email: string | null; role: string; href: string }>;
  tasks: Array<{ id: string; title: string; status: string; href: string; farm: { id: string; name: string } }>;
  incidents: Array<{ id: string; type: string; status: string; href: string; farm: { id: string; name: string } }>;
}

/**
 * Global search (⌘K) — server-driven via /api/search, debounced 250ms with
 * AbortController. Replaces the old fetch-all-farms-once pattern that missed
 * 99.9% of entities past the first 100 rows.
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
    const items: SearchableItem[] = [
      { id: "nav-overview", title: "Overview", subtitle: "Aggregates + drill-down", category: "NAVIGATION", href: role === "FARM_ADMIN" ? "/owner/dashboard" : "/dashboard", icon: "Farm" },
      { id: "nav-farms", title: "Farms directory", subtitle: "Search, filter, bulk act", category: "NAVIGATION", href: "/farms", icon: "Farm" },
      { id: "nav-tasks", title: "Tasks queue", subtitle: "Filter + bulk dispatch", category: "NAVIGATION", href: "/operations/tasks", icon: "CheckCircle" },
      { id: "nav-calendar", title: "Operations Calendar", subtitle: "Chronological ledger", category: "NAVIGATION", href: "/owner/calendar", icon: "Calendar", badge: "Timeline" },
      { id: "nav-reports", title: "Daily reports", subtitle: "Per-farm/day rollup", category: "NAVIGATION", href: "/reports/daily", icon: "FileText" },
    ];
    if (role === "SUPER_ADMIN") {
      items.unshift({ id: "act-new-farm", title: "Onboard New Client Farm", subtitle: "Staged workflow", category: "ACTIONS", href: "/farms/new", icon: "Plus", badge: "Admin" });
      items.push({ id: "nav-clients", title: "Clients directory", subtitle: "Portfolio accounts", category: "NAVIGATION", href: "/clients", icon: "Users" });
      items.push({ id: "nav-audit", title: "Audit trail", subtitle: "Filterable ledger", category: "NAVIGATION", href: "/admin/audit", icon: "Shield" });
    }
    if (role === "FARM_OFFICER") {
      items.unshift({ id: "nav-officer-day", title: "My Day", subtitle: "Assigned execution", category: "NAVIGATION", href: "/officer/day", icon: "ClipboardList", badge: "Duty" });
    }
    return items;
  }, [role]);

  const allItems: SearchableItem[] = useMemo(() => {
    const q = debounced.toLowerCase();
    const nav = !q ? baseItems.slice(0, 8) : baseItems.filter((i) => i.title.toLowerCase().includes(q) || (i.subtitle ?? "").toLowerCase().includes(q));
    if (!server || debounced.length < 2) return nav;
    const out: SearchableItem[] = [...nav];
    for (const f of server.farms) out.push({ id: `farm-${f.id}`, title: f.name, subtitle: `${f.location} • ${f.status}`, category: "FARMS", href: f.href, badge: f.status, icon: "Farm" });
    for (const c of server.clients) out.push({ id: `client-${c.id}`, title: c.name, subtitle: `${c.code ?? ""} ${c.phone ?? ""}`.trim(), category: "CLIENTS", href: c.href, icon: "Users" });
    for (const t of server.tasks) out.push({ id: `task-${t.id}`, title: t.title, subtitle: `${t.farm.name} • ${t.status}`, category: "TASKS", href: t.href, badge: t.status, icon: "CheckCircle" });
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
        style={{ width: "100%", maxWidth: 580, backgroundColor: "var(--canvas)", border: "1px solid var(--canvas)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-modal)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleListKeyDown}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)", backgroundColor: "var(--stone)" }}>
          <span style={{ color: "var(--muted)", display: "flex", alignItems: "center" }}>
            <Icons.Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search farms, clients, tasks, incidents, people… (min 2 chars)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            style={{ flex: 1, backgroundColor: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--ink)" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}>
              <Icons.X size={14} />
            </button>
          )}
          <kbd style={{ display: "inline-flex", alignItems: "center", padding: "2px 6px", fontSize: 10, fontFamily: "monospace", fontWeight: 700, borderRadius: "var(--radius-xs)", backgroundColor: "var(--canvas)", color: "var(--muted)", border: "1px solid var(--canvas)" }}>ESC</kbd>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {searching && <div style={{ textAlign: "center", padding: "24px 16px", fontSize: 12, color: "var(--muted)" }}>Searching…</div>}
          {!searching && debounced.length >= 2 && filteredItems.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 16px", fontSize: 12, color: "var(--muted)" }}>
              No matching farms, clients, tasks, incidents or people for &ldquo;{debounced}&rdquo;
            </div>
          )}
          {!searching && filteredItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const Icon = Icons[item.icon] || Icons.Layers;
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "var(--radius-xs)", cursor: "pointer", transition: "all 0.1s ease", backgroundColor: isSelected ? "var(--green-light)" : "transparent", border: isSelected ? "1px solid var(--green)" : "1px solid transparent" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "var(--radius-xs)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: isSelected ? "var(--green)" : "var(--stone)", color: isSelected ? "#ffffff" : "var(--green)" }}>
                    <Icon size={14} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                    {item.subtitle && <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subtitle}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  {item.badge && <span className="badge badge-muted font-mono" style={{ fontSize: 9 }}>{item.badge}</span>}
                  <span style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", color: "var(--muted)" }}>{item.category}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderTop: "1px solid var(--line)", backgroundColor: "var(--stone)", fontSize: 11, fontFamily: "monospace", color: "var(--muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>ESC Close</span>
          </div>
          <span>{searching ? "Searching…" : `Server results for "${debounced || "…"}"`}</span>
        </div>
      </div>
    </div>
  );
}
