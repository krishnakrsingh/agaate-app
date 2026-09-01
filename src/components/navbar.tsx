"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "./icons";
import { getNavForRole, getMobileNavForRole, isActiveItem } from "./nav/config";
import { FarmSwitcher } from "./nav/farm-switcher";
import { ProfileMenu } from "./nav/profile-menu";

type Role = "SUPER_ADMIN" | "FARM_ADMIN" | "AGRONOMIST" | "FARM_OFFICER";

export function Navbar({ role, userName }: { role: string; userName?: string }) {
  const pathname = usePathname();
  const navRole = role as Role;
  const primary = getNavForRole(navRole);
  const mobile = getMobileNavForRole(navRole);

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

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-left">
            <Link href="/" className="app-brand" aria-label="Agaate home">
              <span className="app-brand-mark">
                <Icons.Sprout size={16} />
              </span>
              <span className="app-brand-word">AGAATE</span>
            </Link>

            <div className="app-header-sep" aria-hidden />

            <FarmSwitcher />
          </div>

          <nav className="app-nav" aria-label="Primary">
            <ul className="app-nav-list">
              {primary.map((item) => {
                const active = isActiveItem(pathname, item);
                const Icon = iconMap[item.icon];
                return (
                  <li key={item.href}>
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

          <div className="app-header-right">
            <ProfileMenu role={role} userName={userName} />
          </div>
        </div>
      </header>

      <nav className="app-mobile-dock" aria-label="Mobile">
        <div className="app-mobile-dock-inner">
          {mobile.map((item) => {
            const active = isActiveItem(pathname, item);
            const Icon = iconMap[item.icon];
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
