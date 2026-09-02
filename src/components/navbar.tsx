"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "./icons";
import { getNavForRole, getMobileNavForRole, isActiveItem } from "./nav/config";
import { FarmSwitcher } from "./nav/farm-switcher";
import { ProfileMenu } from "./nav/profile-menu";
import { ThemeToggle } from "./theme-toggle";

type Role = "SUPER_ADMIN" | "FARM_ADMIN" | "AGRONOMIST" | "FARM_OFFICER";

export function Navbar({ role, userName }: { role: string; userName?: string }) {
  const pathname = usePathname();
  const navRole = role as Role;
  const primary = getNavForRole(navRole);
  const mobile = getMobileNavForRole(navRole);
  const [timeStr, setTimeStr] = useState<string>("");

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
  };

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "SUPER ADMIN",
    FARM_ADMIN: "FARM ADMIN",
    AGRONOMIST: "AGRONOMIST",
    FARM_OFFICER: "FIELD OFFICER",
  };

  return (
    <>
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
              {roleLabels[role] ?? role.replaceAll("_", " ")}
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
