"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "../icons";

export type FarmOption = {
  id: string;
  name: string;
  location: string;
  status: string;
  client?: { name: string; code: string | null } | null;
};

const RECENT_KEY = "agaate_recent_estates_v2";

export function FarmSwitcher() {
  const pathname = usePathname();
  const [initialFarms, setInitialFarms] = useState<FarmOption[]>([]);
  const [searchResults, setSearchResults] = useState<FarmOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [recentFarms, setRecentFarms] = useState<FarmOption[]>([]);
  const [currentFarmDetails, setCurrentFarmDetails] = useState<FarmOption | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect current farm ID from URL (/farms/[id] or /plots/[id])
  const currentFarmId = useMemo(() => {
    const m = pathname.match(/\/farms\/([^/]+)/);
    return m ? m[1] : null;
  }, [pathname]);

  // Load recent farms from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentFarms(parsed.slice(0, 5));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentFarm = useCallback((farm: FarmOption) => {
    setRecentFarms((prev) => {
      const filtered = prev.filter((f) => f.id !== farm.id);
      const next = [farm, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Fetch initial top 15 estates for fast dropdown display
  useEffect(() => {
    let cancelled = false;
    fetch("/api/farms?limit=15")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: any[]) => {
        if (cancelled) return;
        const mapped: FarmOption[] = (list || []).map((f) => ({
          id: f.id,
          name: f.name,
          location: f.location,
          status: f.status,
          client: f.client,
        }));
        setInitialFarms(mapped);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve current farm details if on a farm page
  useEffect(() => {
    if (!currentFarmId) {
      setCurrentFarmDetails(null);
      return;
    }

    // Check if in initial list or recent farms first
    const found =
      initialFarms.find((f) => f.id === currentFarmId) ||
      recentFarms.find((f) => f.id === currentFarmId);

    if (found) {
      setCurrentFarmDetails(found);
      saveRecentFarm(found);
      return;
    }

    // Fetch individual farm if direct URL navigation
    let cancelled = false;
    fetch(`/api/farms/${currentFarmId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => {
        if (cancelled || !f) return;
        const opt: FarmOption = {
          id: f.id,
          name: f.name,
          location: f.location,
          status: f.status,
          client: f.client,
        };
        setCurrentFarmDetails(opt);
        saveRecentFarm(opt);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [currentFarmId, initialFarms, recentFarms, saveRecentFarm]);

  // High-scale remote debounced search
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    setSearching(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      fetch(`/api/farms?search=${encodeURIComponent(q)}&limit=25`, {
        signal: abortControllerRef.current.signal,
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((data: any[]) => {
          setSearchResults(
            (data || []).map((f) => ({
              id: f.id,
              name: f.name,
              location: f.location,
              status: f.status,
              client: f.client,
            }))
          );
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setSearchResults([]);
          }
        })
        .finally(() => setSearching(false));
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search]);

  const displayList = useMemo(() => {
    if (search.trim()) return searchResults;
    return initialFarms;
  }, [search, searchResults, initialFarms]);

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
            {currentFarmDetails ? currentFarmDetails.name : "Select Estate"}
          </span>
        </div>
        {currentFarmDetails && (
          <span className={`switcher-badge ${currentFarmDetails.status.toLowerCase()}`}>
            {currentFarmDetails.status}
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

          <div className="farm-switcher-menu" role="listbox" style={{ width: 320, padding: 0 }}>
            {/* Header & Remote Search Input */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", backgroundColor: "var(--stone)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>
                <span>ESTATE SELECTOR</span>
                <span style={{ color: "var(--green)", fontFamily: "monospace" }}>
                  {searching ? "SEARCHING..." : "ENTERPRISE SCALE"}
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search 100,000+ estates..."
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
            <div className="farm-switcher-menu-list" style={{ maxHeight: 290, overflowY: "auto" }}>
              {/* Recent section if not searching */}
              {!search.trim() && recentFarms.length > 0 && (
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
                            {f.client && <span>&bull; {f.client.name}</span>}
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

              {/* Main List Section */}
              <div>
                {!search.trim() && (
                  <div style={{ padding: "6px 12px 4px", fontSize: 10, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                    Portfolio Estates ({displayList.length})
                  </div>
                )}

                {searching && (
                  <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
                    Searching estates across platform…
                  </div>
                )}

                {!searching && search.trim() && displayList.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
                    No estates matching &ldquo;{search}&rdquo;
                  </div>
                )}

                {!searching &&
                  displayList.map((f) => {
                    const active = f.id === currentFarmId;
                    return (
                      <Link
                        key={f.id}
                        href={`/farms/${f.id}`}
                        role="option"
                        aria-selected={active}
                        className={`farm-switcher-option ${active ? "active" : ""}`}
                        onClick={() => {
                          setOpen(false);
                          saveRecentFarm(f);
                        }}
                      >
                        <div className="switcher-opt-main">
                          <strong className="farm-option-name">{f.name}</strong>
                          <span className="farm-option-meta">
                            <Icons.MapPin size={10} />
                            <span>{f.location}</span>
                            {f.client && <span style={{ color: "var(--green-dark)" }}>&bull; {f.client.name}</span>}
                          </span>
                        </div>
                        <span className={`switcher-pill ${f.status.toLowerCase()}`}>
                          {f.status}
                        </span>
                      </Link>
                    );
                  })}
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
                <span>Command Center</span>
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
