"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  role: string;
  userName?: string;
}

interface NavGroup {
  title: string;
  items: {
    href: string;
    label: string;
    icon: keyof typeof Icons;
    badge?: string;
    isActive?: (p: string) => boolean;
  }[];
}

type FarmOption = { id: string; name: string; location: string; status: string };

export function DesktopSidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [timeStr, setTimeStr] = useState<string>("");
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");

  useEffect(() => {
    // Add body class for layout margin adjustment on desktop
    document.body.classList.add("has-desktop-sidebar");
    return () => {
      document.body.classList.remove("has-desktop-sidebar");
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: FarmOption[]) => {
        setFarms(list);
        if (list.length > 0 && !selectedFarmId) {
          // Detect from URL if on a farm page
          const m = pathname.match(/\/farms\/([^/]+)/);
          const currentId = m ? m[1] : list[0].id;
          setSelectedFarmId(currentId);
        }
      })
      .catch(() => undefined);
  }, [pathname, selectedFarmId]);

  const handleFarmChange = (newFarmId: string) => {
    setSelectedFarmId(newFarmId);
    if (pathname.startsWith("/farms/")) {
      router.push(`/farms/${newFarmId}`);
    } else if (pathname.startsWith("/owner/calendar")) {
      router.push(`/owner/calendar?farmId=${newFarmId}`);
    } else if (pathname.startsWith("/owner/team")) {
      router.push(`/owner/team?farmId=${newFarmId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/login";
  };

  const roleMeta: Record<string, { label: string; badge: string; color: string }> = {
    SUPER_ADMIN: {
      label: "AGAATE HQ",
      badge: "SUPER ADMIN",
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    },
    FARM_ADMIN: {
      label: "ESTATE OWNER",
      badge: "COCKPIT",
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    },
    AGRONOMIST: {
      label: "AGRONOMY LAB",
      badge: "SPECIALIST",
      color: "border-sky-500/40 text-sky-400 bg-sky-500/10",
    },
    FARM_OFFICER: {
      label: "FIELD COMMAND",
      badge: "MANAGER",
      color: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    },
  };

  const currentRoleMeta = roleMeta[role] || {
    label: role,
    badge: "USER",
    color: "border-slate-700 text-slate-300 bg-slate-800",
  };

  // Construct Nav Groups per persona
  const groups: NavGroup[] = [];

  if (role === "SUPER_ADMIN") {
    groups.push(
      {
        title: "ESTATE COMMAND",
        items: [
          { href: "/dashboard", label: "Overview", icon: "Farm", isActive: (p) => p === "/dashboard" },
          { href: "/farms/new", label: "Onboard Farm", icon: "Plus", badge: "Wizard", isActive: (p) => p === "/farms/new" },
          { href: "/owner/calendar", label: "Ops Calendar", icon: "Calendar", badge: "Timeline", isActive: (p) => p.startsWith("/owner/calendar") },
        ],
      },
      {
        title: "WORKFORCE & SECURITY",
        items: [
          { href: "/admin/attendance", label: "Workforce", icon: "Activity", isActive: (p) => p.startsWith("/admin/attendance") },
          { href: "/admin/approvals", label: "Approvals", icon: "Shield", isActive: (p) => p.startsWith("/admin/approvals") },
          { href: "/admin/users", label: "Clients & Officers", icon: "Users", isActive: (p) => p.startsWith("/admin/users") },
          { href: "/admin/audit", label: "Audit Logs", icon: "Activity", isActive: (p) => p.startsWith("/admin/audit") },
        ],
      },
      {
        title: "INTELLIGENCE & TASKS",
        items: [
          { href: "/tasks", label: "Task Matrix", icon: "ClipboardList", isActive: (p) => p.startsWith("/tasks") },
          { href: "/reports/daily", label: "Field Reports", icon: "FileText", isActive: (p) => p.startsWith("/reports") },
        ],
      }
    );
  } else if (role === "FARM_ADMIN") {
    groups.push(
      {
        title: "ESTATE COCKPIT",
        items: [
          { href: "/owner/dashboard", label: "Cockpit", icon: "Farm", isActive: (p) => p.startsWith("/owner/dashboard") || p === "/dashboard" },
          { href: "/owner/calendar", label: "Ops Calendar", icon: "Calendar", badge: "Timeline", isActive: (p) => p.startsWith("/owner/calendar") },
          { href: "/owner/plots", label: "Plots & Crops", icon: "TrendingUp", isActive: (p) => p.startsWith("/owner/plots") },
        ],
      },
      {
        title: "FIELD & WORKFORCE",
        items: [
          { href: "/owner/team", label: "Team & Labor", icon: "Users", badge: "Vouchers", isActive: (p) => p.startsWith("/owner/team") },
          { href: "/owner/harvest", label: "Harvest Logs", icon: "Truck", isActive: (p) => p.startsWith("/owner/harvest") },
          { href: "/owner/inventory", label: "Shed Stock", icon: "Package", isActive: (p) => p.startsWith("/owner/inventory") },
          { href: "/admin/attendance", label: "Attendance", icon: "Activity", isActive: (p) => p.startsWith("/admin/attendance") },
        ],
      },
      {
        title: "FINANCIALS & REPORTS",
        items: [
          { href: "/owner/financials", label: "P&L Financials", icon: "Coins", isActive: (p) => p.startsWith("/owner/financials") },
          { href: "/reports/daily", label: "Field Reports", icon: "FileText", isActive: (p) => p.startsWith("/reports") },
        ],
      }
    );
  } else if (role === "FARM_OFFICER") {
    groups.push({
      title: "FIELD OPERATIONS",
      items: [
        { href: "/officer/day", label: "My Day", icon: "Sun", isActive: (p) => p.startsWith("/officer/day") },
        { href: "/officer/quick-log", label: "Quick Log", icon: "Zap", isActive: (p) => p.startsWith("/officer/quick-log") },
        { href: "/officer/harvest", label: "Log Harvest", icon: "Truck", isActive: (p) => p.startsWith("/officer/harvest") },
        { href: "/officer/crew", label: "Crew Muster", icon: "Users", isActive: (p) => p.startsWith("/officer/crew") },
        { href: "/officer/reports", label: "Signals & Snaps", icon: "Camera", isActive: (p) => p.startsWith("/officer/reports") },
      ],
    });
  } else if (role === "AGRONOMIST") {
    groups.push({
      title: "AGRONOMY SUITE",
      items: [
        { href: "/agronomy/radar", label: "Crop Radar", icon: "TrendingUp", isActive: (p) => p.startsWith("/agronomy/radar") },
        { href: "/agronomy/planning", label: "Weekly Plan", icon: "Calendar", isActive: (p) => p.startsWith("/agronomy/planning") },
        { href: "/agronomy/diagnostics", label: "Diagnostics", icon: "Stethoscope", isActive: (p) => p.startsWith("/agronomy/diagnostics") },
        { href: "/tasks", label: "All Tasks", icon: "ClipboardList", isActive: (p) => p.startsWith("/tasks") },
        { href: "/reports/daily", label: "Field Reports", icon: "FileText", isActive: (p) => p.startsWith("/reports") },
      ],
    });
  }

  const userInitials = (userName || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className="app-desktop-sidebar hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-slate-950 border-r border-slate-800/80 z-40 select-none"
      aria-label="Desktop Navigation Sidebar"
    >
      {/* 1. Header Brand & Mode Badge */}
      <div className="p-4 pb-3 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-2.5 text-white group">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
            <Icons.Sprout size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-extrabold tracking-widest text-white">AGAATE</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                PRO
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block -mt-0.5">
              Precision Agriculture
            </span>
          </div>
        </Link>

        {/* Persona Authority Badge */}
        <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
          <span className="font-medium text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {currentRoleMeta.label}
          </span>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${currentRoleMeta.color}`}>
            {currentRoleMeta.badge}
          </span>
        </div>
      </div>

      {/* 2. Farm Estate Switcher Instrument */}
      {farms.length > 0 && (
        <div className="px-3 pt-3 pb-2 border-b border-slate-900">
          <label htmlFor="sidebar-farm-select" className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1 px-1">
            Active Agricultural Estate
          </label>
          <div className="relative">
            <select
              id="sidebar-farm-select"
              value={selectedFarmId}
              onChange={(e) => handleFarmChange(e.target.value)}
              className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500 transition cursor-pointer appearance-none pr-7"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.location ? `• ${f.location}` : ""}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-2.5 pointer-events-none text-slate-400">
              <Icons.ChevronDown size={12} />
            </div>
          </div>
        </div>
      )}

      {/* 3. Categorized Nav Matrix */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = item.isActive
                ? item.isActive(pathname)
                : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = Icons[item.icon] || Icons.Layers;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={active ? "text-emerald-400" : "text-slate-400"}>
                      <Icon size={16} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        active
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* 4. Footer: Telemetry, Profile & Theme */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
        {/* Real-time telemetry */}
        <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-emerald-400">SYS LIVE</span>
          </div>
          <span suppressHydrationWarning>{timeStr}</span>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-white block truncate leading-tight">
                {userName || "Farm Operator"}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block truncate">
                {currentRoleMeta.badge}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <Icons.LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
