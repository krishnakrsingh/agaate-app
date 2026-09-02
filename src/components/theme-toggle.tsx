"use client";
/* eslint-disable react-hooks/set-state-in-effect */
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
          borderRadius: "var(--radius-xs)",
          background: "var(--canvas)",
          border: "1px solid var(--line)",
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
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          fontSize: 13,
          fontFamily: "var(--font-body)",
          color: "var(--ink)",
          background: "transparent",
          cursor: "pointer",
          border: "none",
          textAlign: "left",
        }}
      >
        {theme === "light" ? <Icons.Moon size={14} /> : <Icons.Sun size={14} />}
        <span>{theme === "light" ? "Dark Theme" : "Light Theme"}</span>
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
        borderRadius: "var(--radius-xs)",
        background: "var(--canvas)",
        color: "var(--ink)",
        border: "1px solid var(--line)",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        transition: "background-color 0.12s ease",
      }}
    >
      {theme === "light" ? <Icons.Moon size={15} /> : <Icons.Sun size={15} />}
    </button>
  );
}
