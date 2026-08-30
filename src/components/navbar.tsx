"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "./icons";
import { LogoutButton } from "./logout-button";

export function Navbar({
  role,
  userName,
}: {
  role: string;
  userName?: string;
}) {
  const pathname = usePathname();

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isFarmAdmin = role === "FARM_ADMIN";
  const isAgronomist = role === "AGRONOMIST";
  const isOfficer = role === "FARM_OFFICER";

  const canManage = isSuperAdmin || isFarmAdmin;
  const canPlan = isSuperAdmin || isAgronomist;
  const canExecute = isSuperAdmin || isOfficer;

  const roleLabel = role.replaceAll("_", " ");
  const roleClass = role.toLowerCase();

  return (
    <>
      <header className="app-navbar">
        <div className="navbar-inner">
          <Link href="/dashboard" className="navbar-brand">
            <div className="brand-icon">
              <Icons.Sprout size={20} />
            </div>
            <span>AGAATE</span>
          </Link>

          <nav>
            <ul className="navbar-nav">
              <li>
                <Link
                  href="/dashboard"
                  className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}
                >
                  <Icons.Farm size={16} />
                  <span>Dashboard</span>
                </Link>
              </li>

              {canManage && (
                <li>
                  <Link
                    href="/farms/new"
                    className={`nav-link ${pathname === "/farms/new" ? "active" : ""}`}
                  >
                    <Icons.Plus size={16} />
                    <span>New Farm</span>
                  </Link>
                </li>
              )}

              {canPlan && (
                <>
                  <li>
                    <Link
                      href="/tasks/new"
                      className={`nav-link ${pathname === "/tasks/new" ? "active" : ""}`}
                    >
                      <Icons.Calendar size={16} />
                      <span>Plan Activity</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/tasks"
                      className={`nav-link ${pathname === "/tasks" ? "active" : ""}`}
                    >
                      <Icons.ClipboardList size={16} />
                      <span>Activities</span>
                    </Link>
                  </li>
                </>
              )}

              {canExecute && (
                <>
                  <li>
                    <Link
                      href="/officer/day"
                      className={`nav-link ${pathname.startsWith("/officer/day") ? "active" : ""}`}
                    >
                      <Icons.Sun size={16} />
                      <span>My Day</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/officer/reports"
                      className={`nav-link ${pathname.startsWith("/officer/reports") ? "active" : ""}`}
                    >
                      <Icons.Camera size={16} />
                      <span>Field Signals</span>
                    </Link>
                  </li>
                </>
              )}

              <li>
                <Link
                  href="/reports/daily"
                  className={`nav-link ${pathname.startsWith("/reports") ? "active" : ""}`}
                >
                  <Icons.FileText size={16} />
                  <span>Daily Report</span>
                </Link>
              </li>

              {isSuperAdmin && (
                <li>
                  <Link
                    href="/admin/users"
                    className={`nav-link ${pathname.startsWith("/admin/users") ? "active" : ""}`}
                  >
                    <Icons.Users size={16} />
                    <span>Users</span>
                  </Link>
                </li>
              )}

              {(isSuperAdmin || isFarmAdmin) && (
                <li>
                  <Link
                    href="/admin/approvals"
                    className={`nav-link ${pathname.startsWith("/admin/approvals") ? "active" : ""}`}
                  >
                    <Icons.Shield size={16} />
                    <span>Approvals</span>
                  </Link>
                </li>
              )}

              <li>
                <Link
                  href="/settings/passkeys"
                  className={`nav-link ${pathname.startsWith("/settings/passkeys") ? "active" : ""}`}
                >
                  <Icons.Fingerprint size={16} />
                  <span>Device</span>
                </Link>
              </li>

              <li>
                <Link
                  href="/settings/biometric"
                  className={`nav-link ${pathname.startsWith("/settings/biometric") ? "active" : ""}`}
                >
                  <Icons.User size={16} />
                  <span>Biometric</span>
                </Link>
              </li>
            </ul>
          </nav>

          <div className="navbar-actions">
            <span className={`role-badge ${roleClass}`}>
              {roleLabel}
            </span>

            {userName && (
              <div className="user-profile-badge" title={`Signed in as ${userName}`}>
                <div className="user-avatar">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span>{userName}</span>
              </div>
            )}

            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        <div className="mobile-nav-inner">
          <Link
            href="/dashboard"
            className={`mobile-nav-item ${pathname === "/dashboard" ? "active" : ""}`}
          >
            <Icons.Farm size={20} />
            <span>Farms</span>
          </Link>

          {canExecute && (
            <Link
              href="/officer/day"
              className={`mobile-nav-item ${pathname.startsWith("/officer/day") ? "active" : ""}`}
            >
              <Icons.Sun size={20} />
              <span>My Day</span>
            </Link>
          )}

          {canExecute && (
            <Link
              href="/officer/reports"
              className={`mobile-nav-item ${pathname.startsWith("/officer/reports") ? "active" : ""}`}
            >
              <Icons.Camera size={20} />
              <span>Signals</span>
            </Link>
          )}

          {canPlan && !canExecute && (
            <Link
              href="/tasks/new"
              className={`mobile-nav-item ${pathname.startsWith("/tasks/new") ? "active" : ""}`}
            >
              <Icons.Calendar size={20} />
              <span>Plan</span>
            </Link>
          )}

          {canPlan && (
            <Link
              href="/tasks"
              className={`mobile-nav-item ${pathname === "/tasks" ? "active" : ""}`}
            >
              <Icons.ClipboardList size={20} />
              <span>Activities</span>
            </Link>
          )}

          {(isSuperAdmin || isFarmAdmin) && (
            <Link
              href="/admin/approvals"
              className={`mobile-nav-item ${pathname.startsWith("/admin/approvals") ? "active" : ""}`}
            >
              <Icons.Shield size={20} />
              <span>Approvals</span>
            </Link>
          )}

          <Link
            href="/reports/daily"
            className={`mobile-nav-item ${pathname.startsWith("/reports") ? "active" : ""}`}
          >
            <Icons.FileText size={20} />
            <span>Report</span>
          </Link>

          <Link
            href="/settings/passkeys"
            className={`mobile-nav-item ${pathname.startsWith("/settings/passkeys") ? "active" : ""}`}
          >
            <Icons.Fingerprint size={20} />
            <span>Device</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
