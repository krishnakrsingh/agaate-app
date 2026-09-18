"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Eye, Pencil, Plus, Building2, Check, X, Trash2 } from "lucide-react";
import { Icons } from "@/components/icons";

export interface ClientMenuTarget {
  id: string;
  code: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  whatsappNo: string | null;
  district: string | null;
  state: string | null;
  status: string;
  farmCount: number;
}

const MENU_WIDTH = 260;

function digitsOnly(v: string) {
  return v.replace(/[^\d]/g, "");
}

export function ClientActionsMenu({
  client,
  canEditClient = false,
  canCreateFarm = false,
  canViewFarms = false,
  canWrite = false,
  onStatusChange,
  onDelete,
}: {
  client: ClientMenuTarget;
  canEditClient?: boolean;
  canCreateFarm?: boolean;
  canViewFarms?: boolean;
  canWrite?: boolean;
  onStatusChange: (status: "ACTIVE" | "INACTIVE") => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const h = menuRef.current?.offsetHeight ?? 380;
      let left = r.right - MENU_WIDTH;
      left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));
      let top = r.bottom + 6;
      if (top + h > window.innerHeight - 8 && r.top - 6 - h >= 8) {
        top = r.top - 6 - h;
      }
      top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
      setPos({ top, left });
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
      );
      if (items.length === 0) return;
      e.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      const i = active ? items.indexOf(active) : -1;
      const next =
        e.key === "ArrowDown"
          ? items[(i + 1 + items.length) % items.length]
          : items[(i - 1 + items.length) % items.length];
      next?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  const item = (icon: ReactNode, label: string, onClick: () => void, quiet = false, danger = false) => (
    <button
      type="button"
      role="menuitem"
      className={`ctx-menu-item ${quiet ? "quiet" : ""} ${danger ? "danger" : ""}`}
      onClick={() => {
        close();
        onClick();
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const linkItem = (icon: ReactNode, label: string, href: string) => (
    <Link
      role="menuitem"
      href={href}
      className="ctx-menu-item"
      onClick={close}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );

  const view = `/hq/clients/${client.id}`;
  const whatsappNumber = client.whatsappNo ?? client.phone;
  const hasWhatsApp = Boolean(whatsappNumber);

  return (
    <span className="ctx-menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="dir-kebab"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Client actions"
        title="Client actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              className="dir-popover-backdrop"
              aria-hidden
              tabIndex={-1}
              onClick={close}
            />
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Actions for ${client.name}`}
              className="ctx-menu"
              style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            >
              {/* VIEW */}
              <div className="ctx-menu-section">
                <div className="ctx-menu-label">View</div>
                {linkItem(<Eye size={18} />, "View client", view)}
              </div>

              {/* MANAGE */}
              <div className="ctx-menu-section">
                <div className="ctx-menu-label">Manage</div>
                {canEditClient && linkItem(<Pencil size={18} />, "Edit client", `/hq/clients/${client.id}/edit`)}
                {canCreateFarm &&
                  linkItem(<Plus size={18} />, "Add farm estate", `/hq/clients/${client.id}/farms/new`)}
                {canViewFarms &&
                  client.farmCount > 0 &&
                  linkItem(<Building2 size={18} />, "Manage farms", `/hq/farms?clientId=${client.id}`)}
              </div>

              {/* COMMUNICATION */}
              {hasWhatsApp && (
                <div className="ctx-menu-section">
                  <div className="ctx-menu-label">Communication</div>
                  <a
                    role="menuitem"
                    href={`https://wa.me/${digitsOnly(whatsappNumber!)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ctx-menu-item"
                    onClick={close}
                  >
                    <Icons.Whatsapp size={18} style={{ color: "#25D366", flexShrink: 0 }} />
                    <span>Send Message</span>
                  </a>
                </div>
              )}

              {/* STATUS */}
              {canWrite && (
                <div className="ctx-menu-section">
                  <div className="ctx-menu-label">Status</div>
                  {client.status !== "ACTIVE" &&
                    item(<Check size={18} />, "Set active", () => onStatusChange("ACTIVE"))}
                  {client.status !== "INACTIVE" &&
                    item(<X size={18} />, "Set inactive", () => {
                      void onStatusChange("INACTIVE");
                    })}
                </div>
              )}

              {/* DELETE */}
              <div className="ctx-menu-section destructive">
                {item(
                  <Trash2 size={18} />,
                  "Delete client",
                  () => {
                    void onDelete(client.id);
                  },
                  false,
                  true
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </span>
  );
}