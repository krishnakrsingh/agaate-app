"use client";
import { useEffect, useState } from "react";
import { Icons } from "./icons";

export function ThemeToggle({ variant = "button" }: { variant?: "button" | "menu-item" }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setTheme(current);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("agaate_theme", next);
    } catch {
      // ignore
    }
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--radius-circle)",
          background: "var(--mid-dark)",
          border: "1px solid var(--border-subtle)",
          display: "grid",
          placeItems: "center",
          opacity: 0,
        }}
      />
    );
  }

  if (variant === "menu-item") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="nav-link"
        style={{
          width: "100%",
          justifyContent: "flex-start",
          padding: "8px 12px",
          fontSize: 13,
          borderRadius: "var(--radius-xs)",
          cursor: "pointer",
          border: "none",
        }}
      >
        {theme === "light" ? <Icons.Moon size={14} /> : <Icons.Sun size={14} />}
        <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      style={{
        width: 36,
        height: 36,
        borderRadius: "var(--radius-circle)",
        background: "var(--mid-dark)",
        color: "var(--text-base)",
        border: "1px solid var(--border-subtle)",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
      }}
    >
      {theme === "light" ? <Icons.Moon size={16} /> : <Icons.Sun size={16} />}
    </button>
  );
}
