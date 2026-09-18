"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Building2,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  X,
} from "lucide-react";

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

const MENU_WIDTH = 300;

function digitsOnly(v: string) {
  return v.replace(/[^\d]/g, "");
}

export function ClientActionsMenu({
  client,
  canEditClient = false,
  canCreateFarm = false,
  canViewFarms = false,
  canWrite = false,
  onCopy,
  onStatusChange,
  onExport,
}: {
  client: ClientMenuTarget;
  canEditClient?: boolean;
  canCreateFarm?: boolean;
  canViewFarms?: boolean;
  canWrite?: boolean;
  onCopy: (value: string, label: string) => void;
  onStatusChange: (status: "ACTIVE" | "INACTIVE") => void | Promise<void>;
  onExport: (client: ClientMenuTarget) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fixed-position placement so the table's overflow never clips the menu.
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

  // Focus first item on open; keyboard navigation + Escape.
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

  const item = (icon: ReactNode, label: string, onClick: () => void, quiet = false) => (
    <button
      type="button"
      role="menuitem"
      className={`ctx-menu-item ${quiet ? "quiet" : ""}`}
      onClick={() => {
        close();
        onClick();
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const linkItem = (icon: ReactNode, label: string, href: string, external = false) => (
    <Link
      role="menuitem"
      href={href}
      className="ctx-menu-item"
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      onClick={close}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );

  const view = `/hq/clients/${client.id}`;
  const hasCommunication = Boolean(client.phone || client.whatsappNo || client.email);

  const sections: Array<{ label?: string; content: ReactNode }> = [
    {
      label: "View",
      content: (
        <>
          {linkItem(<Eye size={18} />, "View details", view)}
          <a
            role="menuitem"
            href={view}
            target="_blank"
            rel="noreferrer"
            className="ctx-menu-item"
            onClick={close}
          >
            <ExternalLink size={18} />
            <span>Open in new tab</span>
          </a>
        </>
      ),
    },
    {
      label: "Manage",
      content: (
        <>
          {canEditClient && linkItem(<Pencil size={18} />, "Edit client", `/hq/clients/${client.id}/edit`)}
          {canCreateFarm &&
            linkItem(<Plus size={18} />, "Add farm estate", `/hq/clients/${client.id}/farms/new`)}
          {canViewFarms &&
            client.farmCount > 0 &&
            linkItem(<Building2 size={18} />, "Manage farms", `/hq/farms?clientId=${client.id}`)}
        </>
      ),
    },
    {
      label: "Quick actions",
      content: (
        <>
          {item(<Copy size={18} />, "Copy client code", () => onCopy(client.code, "Client code copied"), true)}
          {client.phone &&
            item(<Copy size={18} />, "Copy phone number", () => onCopy(client.phone!, "Phone number copied"), true)}
          {client.email &&
            item(<Copy size={18} />, "Copy email", () => onCopy(client.email!, "Email copied"), true)}
        </>
      ),
    },
  ];

  if (hasCommunication) {
    sections.push({
      label: "Communication",
      content: (
        <>
          {client.phone && (
            <a role="menuitem" href={`tel:${client.phone}`} className="ctx-menu-item" onClick={close}>
              <Phone size={18} />
              <span>Call client</span>
            </a>
          )}
          {client.whatsappNo && (
            <a
              role="menuitem"
              href={`https://wa.me/${digitsOnly(client.whatsappNo)}`}
              target="_blank"
              rel="noreferrer"
              className="ctx-menu-item"
              onClick={close}
            >
              <MessageCircle size={18} />
              <span>WhatsApp client</span>
            </a>
          )}
          {client.email && (
            <a role="menuitem" href={`mailto:${client.email}`} className="ctx-menu-item" onClick={close}>
              <Mail size={18} />
              <span>Email client</span>
            </a>
          )}
        </>
      ),
    });
  }

  sections.push({
    label: "Data",
    content: item(<Download size={18} />, "Export client", () => onExport(client)),
  });

  if (canWrite) {
    sections.push({
      label: "Status",
      content: (
        <>
          {client.status !== "ACTIVE" &&
            item(<Check size={18} />, "Set active", () => onStatusChange("ACTIVE"))}
          {client.status !== "INACTIVE" &&
            item(<X size={18} />, "Set inactive", () => {
              if (
                confirm(
                  `Mark ${client.name} as inactive?\n\nThis will mark ${client.name} as inactive. Existing records and farm data will remain available.`
                )
              ) {
                void onStatusChange("INACTIVE");
              }
            })}
        </>
      ),
    });
  }

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
              {sections.map((section, i) => (
                <div key={section.label ?? i} className="ctx-menu-section">
                  {section.label && <div className="ctx-menu-label">{section.label}</div>}
                  {section.content}
                </div>
              ))}
            </div>
          </>,
          document.body
        )}
    </span>
  );
}
