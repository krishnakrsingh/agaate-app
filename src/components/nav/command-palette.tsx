"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";

type SearchableItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: "ESTATES" | "NAVIGATION" | "ACTIONS" | "WORKFORCE";
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

export function CommandPalette({ isOpen, onClose, onOpen, role }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [farms, setFarms] = useState<{ id: string; name: string; location: string; status: string; cultivableArea: string }[]>([]);

  const handleClose = useCallback(() => {
    onClose();
    setQuery("");
    setSelectedIndex(0);
  }, [onClose]);

  // Global keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onOpen, handleClose]);

  // Fetch estates list once for quick searching
  useEffect(() => {
    if (isOpen && farms.length === 0) {
      fetch("/api/farms")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setFarms(data || []))
        .catch(() => undefined);
    }
  }, [isOpen, farms.length]);

  // Static navigation routes tailored to role
  const baseItems: SearchableItem[] = useMemo(() => {
    const items: SearchableItem[] = [
      {
        id: "nav-cockpit",
        title: "Estate Cockpit / Overview",
        subtitle: "Top-line KPIs, field progress & metrics",
        category: "NAVIGATION",
        href: role === "FARM_ADMIN" ? "/owner/dashboard" : "/dashboard",
        icon: "Farm",
      },
      {
        id: "nav-calendar",
        title: "Operations Calendar",
        subtitle: "Chronological ledger of tasks & incidents",
        category: "NAVIGATION",
        href: "/owner/calendar",
        icon: "Calendar",
        badge: "Timeline",
      },
      {
        id: "nav-team",
        title: "Team & Laborers Roster",
        subtitle: "Worker accounts, supervisor toggles & vouchers",
        category: "NAVIGATION",
        href: "/owner/team",
        icon: "Users",
      },
      {
        id: "nav-plots",
        title: "Plots & Parcels Explorer",
        subtitle: "Field geography, soil types, acreage & crop cycles",
        category: "NAVIGATION",
        href: "/owner/plots",
        icon: "Layers",
      },
      {
        id: "nav-financials",
        title: "Financials & Ledger",
        subtitle: "Expenses, income, and profit margins",
        category: "NAVIGATION",
        href: "/owner/financials",
        icon: "Coins",
      },
      {
        id: "nav-harvest",
        title: "Harvest Yields & Production",
        subtitle: "Harvest lots, grades, pricing, buyers and totals",
        category: "NAVIGATION",
        href: "/owner/harvest",
        icon: "Truck",
      },
      {
        id: "nav-tasks",
        title: "All Field Operations Tasks",
        subtitle: "View and filter operations across plots",
        category: "NAVIGATION",
        href: "/tasks",
        icon: "CheckCircle",
      },
      {
        id: "nav-incidents",
        title: "Incidents & Crop Stress Registry",
        subtitle: "Pests, disease, water logging, security alerts",
        category: "NAVIGATION",
        href: "/incidents",
        icon: "AlertTriangle",
      },
    ];

    if (role === "SUPER_ADMIN") {
      items.unshift({
        id: "act-new-farm",
        title: "Onboard New Client Farm",
        subtitle: "Create new estate with owner credentials",
        category: "ACTIONS",
        href: "/farms/new",
        icon: "Plus",
        badge: "Admin",
      });
      items.push({
        id: "nav-super-audit",
        title: "Global Security & Audit Trail",
        subtitle: "System logs, auth records and modifications",
        category: "NAVIGATION",
        href: "/admin/audit",
        icon: "Shield",
      });
      items.push({
        id: "nav-attendance-global",
        title: "Workforce Presence & Geofence Compliance",
        subtitle: "Live GPS telemetry and shift check-ins",
        category: "WORKFORCE",
        href: "/admin/attendance",
        icon: "Users",
      });
    }

    if (role === "FARM_OFFICER") {
      items.unshift({
        id: "nav-officer-day",
        title: "My Day / Field Execution Desk",
        subtitle: "Assigned tasks, execution workflows and reports",
        category: "NAVIGATION",
        href: "/officer/day",
        icon: "ClipboardList",
        badge: "Duty",
      });
      items.push({
        id: "act-log-report",
        title: "Log Field Incident / Pest Finding",
        subtitle: "Submit observation with photo and severity",
        category: "ACTIONS",
        href: "/officer/reports",
        icon: "AlertTriangle",
      });
    }

    return items;
  }, [role]);

  // Combine static navigation with dynamically fetched estates
  const allItems: SearchableItem[] = useMemo(() => {
    const estateItems: SearchableItem[] = farms.map((f) => ({
      id: `estate-${f.id}`,
      title: f.name,
      subtitle: `${f.location} • ${f.cultivableArea || "0"} Acres • Status: ${f.status}`,
      category: "ESTATES",
      href: `/farms/${f.id}`,
      badge: f.status,
      icon: "Farm",
    }));

    return [...baseItems, ...estateItems];
  }, [baseItems, farms]);

  // Filtered results based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return allItems.slice(0, 10);
    }
    return allItems
      .filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q) ||
          (item.badge && item.badge.toLowerCase().includes(q))
        );
      })
      .slice(0, 15);
  }, [allItems, query]);

  // Select item handler
  const handleSelect = (item: SearchableItem) => {
    handleClose();
    router.push(item.href);
  };

  // Keyboard navigation inside list
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
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
      }}
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        style={{
          width: "100%",
          maxWidth: 580,
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-modal)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleListKeyDown}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid var(--line)",
            backgroundColor: "var(--stone)",
          }}
        >
          <span style={{ color: "var(--muted)", display: "flex", alignItems: "center" }}>
            <Icons.Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search estates, parcels, operations, or jump to..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "var(--ink)",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}
            >
              <Icons.X size={14} />
            </button>
          )}
          <kbd
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 6px",
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: 700,
              borderRadius: "var(--radius-xs)",
              backgroundColor: "var(--canvas)",
              color: "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", fontSize: 12, color: "var(--muted)" }}>
              No matching estates, navigation items, or actions found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = Icons[item.icon] || Icons.Layers;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-xs)",
                    cursor: "pointer",
                    transition: "all 0.1s ease",
                    backgroundColor: isSelected ? "var(--green-light)" : "transparent",
                    border: isSelected ? "1px solid var(--green)" : "1px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-xs)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        backgroundColor: isSelected ? "var(--green)" : "var(--stone)",
                        color: isSelected ? "#ffffff" : "var(--green)",
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    {item.badge && (
                      <span
                        className={`badge ${
                          item.badge === "ACTIVE"
                            ? "badge-green"
                            : item.badge === "SETUP"
                            ? "badge-amber"
                            : "badge-muted"
                        } font-mono`}
                        style={{ fontSize: 9 }}
                      >
                        {item.badge}
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", color: "var(--muted)" }}>
                      {item.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            borderTop: "1px solid var(--line)",
            backgroundColor: "var(--stone)",
            fontSize: 11,
            fontFamily: "monospace",
            color: "var(--muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>ESC Close</span>
          </div>
          <span>Fast Jump ({allItems.length} indexed items)</span>
        </div>
      </div>
    </div>
  );
}
