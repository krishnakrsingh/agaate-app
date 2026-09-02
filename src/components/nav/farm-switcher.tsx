"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "../icons";

type FarmOption = { id: string; name: string; location: string; status: string };

export function FarmSwitcher() {
  const pathname = usePathname();
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: FarmOption[]) => setFarms(list))
      .catch(() => undefined);
  }, []);

  // Detect current farm from URL /farms/[id] or /plots/[id]
  const currentFarmId = (() => {
    const m = pathname.match(/\/farms\/([^/]+)/);
    return m ? m[1] : null;
  })();
  const currentFarm = farms.find((f) => f.id === currentFarmId);

  if (farms.length === 0) return null;

  if (farms.length === 1) {
    const only = farms[0];
    const isOnFarm = pathname.startsWith(`/farms/${only.id}`);
    return (
      <Link
        href={`/farms/${only.id}`}
        className={`farm-switcher-single ${isOnFarm ? "active" : ""}`}
        title={only.name}
      >
        <span className="switcher-icon-wrap"><Icons.MapPin size={13} /></span>
        <span className="switcher-name">{only.name}</span>
        <span className={`switcher-status-dot ${only.status.toLowerCase()}`} />
      </Link>
    );
  }

  return (
    <div className="farm-switcher">
      <button
        type="button"
        className={`farm-switcher-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Select Target Agricultural Estate"
      >
        <span className="switcher-icon-wrap">
          <Icons.MapPin size={13} />
        </span>
        <div className="switcher-label-group">
          <span className="switcher-meta-label">ESTATE</span>
          <span className="switcher-current-name">
            {currentFarm ? currentFarm.name : "All Estates"}
          </span>
        </div>
        {currentFarm && (
          <span className={`switcher-badge ${currentFarm.status.toLowerCase()}`}>
            {currentFarm.status}
          </span>
        )}
        <Icons.ChevronDown size={13} className={`farm-switcher-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <>
          <button
            aria-label="Close farm switcher"
            className="farm-switcher-backdrop"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div className="farm-switcher-menu" role="listbox">
            <div className="farm-switcher-menu-head">
              <span>PORTFOLIO ESTATES ({farms.length})</span>
            </div>
            <div className="farm-switcher-menu-list">
              {farms.map((f) => {
                const active = f.id === currentFarmId;
                return (
                  <Link
                    key={f.id}
                    href={`/farms/${f.id}`}
                    role="option"
                    aria-selected={active}
                    className={`farm-switcher-option ${active ? "active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <div className="switcher-opt-main">
                      <strong className="farm-option-name">{f.name}</strong>
                      <span className="farm-option-meta">
                        <Icons.MapPin size={11} />
                        <span>{f.location}</span>
                      </span>
                    </div>
                    <span className={`switcher-pill ${f.status.toLowerCase()}`}>
                      {f.status}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="farm-switcher-footer">
              <Link
                href="/dashboard"
                className="farm-switcher-footer-btn"
                onClick={() => setOpen(false)}
              >
                <Icons.Layers size={13} />
                <span>Portfolio Overview</span>
              </Link>
              <Link
                href="/farms/new"
                className="farm-switcher-footer-btn primary"
                onClick={() => setOpen(false)}
              >
                <Icons.Plus size={13} />
                <span>Register Estate</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
