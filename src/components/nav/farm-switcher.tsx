"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "../icons";

type FarmOption = { id: string; name: string; location: string; status: string };

export function FarmSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
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
  // Hide switcher on login/farms/new etc when not needed? Keep minimal
  if (farms.length === 1) {
    // Single farm: just show link to it if not already there
    const only = farms[0];
    const isOnFarm = pathname.startsWith(`/farms/${only.id}`);
    return (
      <Link
        href={`/farms/${only.id}`}
        className={`farm-switcher-single ${isOnFarm ? "active" : ""}`}
        title={only.name}
      >
        <Icons.Farm size={14} />
        <span>{only.name}</span>
      </Link>
    );
  }

  return (
    <div className="farm-switcher">
      <button
        type="button"
        className="farm-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icons.Farm size={14} />
        <span className="farm-switcher-label">
          {currentFarm ? currentFarm.name : "Select farm"}
        </span>
        <Icons.ChevronDown size={14} className={`farm-switcher-chevron ${open ? "open" : ""}`} />
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
            <div className="farm-switcher-menu-head">Your farms</div>
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
                  <span className="farm-option-name">{f.name}</span>
                  <span className="farm-option-meta">
                    {f.location} • {f.status}
                  </span>
                </Link>
              );
            })}
            <Link
              href="/dashboard"
              className="farm-switcher-option all"
              onClick={() => setOpen(false)}
            >
              <Icons.Layers size={14} />
              <span>View all farms</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
