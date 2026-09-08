"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "../icons";

type FarmOption = { id: string; name: string; location: string; status: string };

export function FarmSwitcher() {
  const pathname = usePathname();
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recentFarmIds, setRecentFarmIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: FarmOption[]) => setFarms(list || []))
      .catch(() => undefined);

    try {
      const stored = localStorage.getItem("agaate_recent_farms");
      if (stored) {
        setRecentFarmIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Detect current farm from URL /farms/[id] or /plots/[id]
  const currentFarmId = useMemo(() => {
    const m = pathname.match(/\/farms\/([^/]+)/);
    return m ? m[1] : null;
  }, [pathname]);

  const currentFarm = farms.find((f) => f.id === currentFarmId);

  // Save to recent farms whenever currentFarm changes
  useEffect(() => {
    if (currentFarmId) {
      setRecentFarmIds((prev) => {
        const next = [currentFarmId, ...prev.filter((id) => id !== currentFarmId)].slice(0, 5);
        try {
          localStorage.setItem("agaate_recent_farms", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  }, [currentFarmId]);

  const recentFarms = useMemo(() => {
    return recentFarmIds
      .map((id) => farms.find((f) => f.id === id))
      .filter((f): f is FarmOption => Boolean(f));
  }, [recentFarmIds, farms]);

  const filteredFarms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return farms.slice(0, 25);
    return farms
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q) ||
          f.status.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [farms, search]);

  if (farms.length === 0) return null;

  return (
    <div className="farm-switcher">
      <button
        type="button"
        className={`farm-switcher-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setSearch("");
        }}
        title="Select Target Agricultural Estate"
      >
        <span className="switcher-icon-wrap">
          <Icons.MapPin size={13} />
        </span>
        <div className="switcher-label-group">
          <span className="switcher-meta-label">ESTATE</span>
          <span className="switcher-current-name">
            {currentFarm ? currentFarm.name : "Select Estate"}
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

          <div className="farm-switcher-menu" role="listbox" style={{ width: 300, padding: 0 }}>
            {/* Header & Quick Search Bar */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", backgroundColor: "var(--stone)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>
                <span>ESTATE SELECTOR</span>
                <span style={{ color: "var(--green)", fontFamily: "monospace" }}>
                  {farms.length.toLocaleString()} ESTATES
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search by name, district..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="input-field"
                  style={{ width: "100%", fontSize: 12, padding: "6px 28px 6px 10px" }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
                  >
                    <Icons.X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* List Container */}
            <div className="farm-switcher-menu-list" style={{ maxHeight: 280, overflowY: "auto" }}>
              {/* Recent section if no active search */}
              {!search && recentFarms.length > 0 && (
                <div style={{ paddingBottom: 6, borderBottom: "1px solid var(--line)" }}>
                  <div style={{ padding: "6px 12px 4px", fontSize: 10, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                    Recent Estates
                  </div>
                  {recentFarms.map((f) => {
                    const active = f.id === currentFarmId;
                    return (
                      <Link
                        key={`recent-${f.id}`}
                        href={`/farms/${f.id}`}
                        className={`farm-switcher-option ${active ? "active" : ""}`}
                        onClick={() => setOpen(false)}
                      >
                        <div className="switcher-opt-main">
                          <strong className="farm-option-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--green)" }} />
                            {f.name}
                          </strong>
                          <span className="farm-option-meta">
                            <Icons.MapPin size={10} />
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
              )}

              {/* Filtered or All estates */}
              <div>
                {!search && (
                  <div style={{ padding: "6px 12px 4px", fontSize: 10, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                    All Estates ({filteredFarms.length} of {farms.length})
                  </div>
                )}

                {filteredFarms.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
                    No estates matching &ldquo;{search}&rdquo;
                  </div>
                ) : (
                  filteredFarms.map((f) => {
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
                            <Icons.MapPin size={10} />
                            <span>{f.location}</span>
                          </span>
                        </div>
                        <span className={`switcher-pill ${f.status.toLowerCase()}`}>
                          {f.status}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* Switcher Footer */}
            <div className="farm-switcher-footer">
              <Link
                href="/dashboard"
                className="farm-switcher-footer-btn"
                onClick={() => setOpen(false)}
              >
                <Icons.Layers size={13} />
                <span>Portfolio ({farms.length})</span>
              </Link>
              <Link
                href="/farms/new"
                className="farm-switcher-footer-btn primary"
                onClick={() => setOpen(false)}
              >
                <Icons.Plus size={13} />
                <span>Onboard Farm</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
