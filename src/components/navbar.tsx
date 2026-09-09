"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "./icons";
import { getNavForRole, getMobileNavForRole, isActiveItem, ROLE_LABELS } from "./nav/config";
import { FarmSwitcher } from "./nav/farm-switcher";
import { ProfileMenu } from "./nav/profile-menu";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./nav/command-palette";
import { DesktopSidebar } from "./layout/desktop-sidebar";

type Role = "SUPER_ADMIN" | "FARM_ADMIN" | "AGRONOMIST" | "FARM_OFFICER";

export function Navbar({ role, userName }: { role: string; userName?: string }) {
  const pathname = usePathname();
  const navRole = role as Role;
  const primary = getNavForRole(navRole);
  const mobile = getMobileNavForRole(navRole);
  const [timeStr, setTimeStr] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);

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

  const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
    Farm: Icons.Farm,
    Sun: Icons.Sun,
    Calendar: Icons.Calendar,
    ClipboardList: Icons.ClipboardList,
    FileText: Icons.FileText,
    Shield: Icons.Shield,
    Users: Icons.Users,
    Camera: Icons.Camera,
    Activity: Icons.Activity,
    Package: Icons.Package,
    Coins: Icons.Coins,
    Truck: Icons.Truck,
    Stethoscope: Icons.Stethoscope,
    TrendingUp: Icons.TrendingUp,
    Zap: Icons.Zap,
  };

  return (
    <>
      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpen={() => setSearchOpen(true)}
        role={role}
      />

      {/* Enterprise Left-Rail Desktop Sidebar (Viewports >= 1024px) */}
      <DesktopSidebar
        role={role}
        userName={userName}
        onOpenCommandPalette={() => setSearchOpen(true)}
      />

      {/* Top Application Header (Viewports < 1024px) */}
      <header className="app-header">
        <div className="app-header-inner">
          {/* Left: Brand & Farm Switcher Instrument */}
          <div className="app-header-left">
            <Link href="/" className="app-brand" aria-label="Agaate Precision Agriculture Home">
              <span className="app-brand-mark">
                <Icons.Sprout size={16} />
              </span>
              <div className="app-brand-text">
                <span className="app-brand-word">AGAATE</span>
                <span className="app-brand-tag">OPS CONSOLE</span>
              </div>
            </Link>

            <div className="app-header-sep" aria-hidden />

            <FarmSwitcher />
          </div>

          {/* Center: Primary Navigation Matrix */}
          <nav className="app-nav" aria-label="Primary Navigation">
            <ul className="app-nav-list">
              {primary.map((item) => {
                const active = isActiveItem(pathname, item);
                const Icon = iconMap[item.icon] ?? Icons.Layers;
                return (
                  <li key={item.href} className="app-nav-item">
                    <Link
                      href={item.href}
                      className={`app-nav-link ${active ? "active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right: Telemetry, Theme Toggle & Profile Menu */}
          <div className="app-header-right">
            {/* Live Operational Status Clock */}
            <div className="header-telemetry" title="Operational Telemetry Sync" suppressHydrationWarning>
              <span className="telemetry-live-dot" />
              <span className="telemetry-label">SYS LIVE</span>
              {timeStr && <span className="telemetry-time" suppressHydrationWarning>{timeStr}</span>}
            </div>

            {/* Role Badge */}
            <div className="header-role-badge">
              {ROLE_LABELS[role] ?? role.replaceAll("_", " ")}
            </div>

            {/* Quick 1-Click Theme Toggle */}
            <ThemeToggle />

            {/* Separator */}
            <div className="app-header-sep" aria-hidden />

            {/* Profile Dropdown */}
            <ProfileMenu role={role} userName={userName} />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Dock (Touch-Engineered) */}
      <nav className="app-mobile-dock" aria-label="Mobile Navigation">
        <div className="app-mobile-dock-inner">
          {mobile.map((item) => {
            const active = isActiveItem(pathname, item);
            const Icon = iconMap[item.icon] ?? Icons.Layers;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-mobile-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
