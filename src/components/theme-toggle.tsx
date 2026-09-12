"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useId, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { Icons } from "./icons";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

export function ThemeToggle({
  variant = "button",
  className = "",
}: {
  variant?: "button" | "menu-item" | "switch";
  className?: string;
}) {
  const id = useId();
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
    if (variant === "switch") {
      return <div style={{ width: 72, height: 36, borderRadius: 9999, background: "var(--line)", opacity: 0 }} />;
    }
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        style={{
          width: 36,
          height: 36,
          borderRadius: "9999px",
          background: "var(--canvas)",
          border: "1px solid var(--line)",
          display: "grid",
          placeItems: "center",
          opacity: 0,
        }}
      />
    );
  }

  if (variant === "switch") {
    const isDark = theme === "dark";
    return (
      <div>
        <div className="relative inline-grid h-9 grid-cols-[1fr_1fr] items-center text-sm font-medium">
          <Switch
            id={id}
            checked={isDark}
            onCheckedChange={toggle}
            className="peer data-[state=unchecked]:bg-input/50 absolute inset-0 h-[inherit] w-auto [&_span]:z-10 [&_span]:h-full [&_span]:w-1/2 [&_span]:transition-transform [&_span]:duration-300 [&_span]:ease-[cubic-bezier(0.16,1,0.3,1)] [&_span]:data-[state=checked]:translate-x-full [&_span]:data-[state=checked]:rtl:-translate-x-full"
          />
          {/* Moon — shows when light (unchecked) */}
          <span className="pointer-events-none relative ms-0.5 flex min-w-8 items-center justify-center text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=checked]:invisible peer-data-[state=unchecked]:translate-x-full peer-data-[state=unchecked]:rtl:-translate-x-full">
            <MoonIcon aria-hidden="true" size={16} />
          </span>
          {/* Sun — shows when dark (checked) */}
          <span className="peer-data-[state=checked]:text-background pointer-events-none relative me-0.5 flex min-w-8 items-center justify-center text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=checked]:-translate-x-full peer-data-[state=unchecked]:invisible peer-data-[state=checked]:rtl:translate-x-full">
            <SunIcon aria-hidden="true" size={16} />
          </span>
        </div>
        <Label className="sr-only" htmlFor={id}>
          Toggle dark mode
        </Label>
      </div>
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
      className={className}
      title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      style={{
        width: 36,
        height: 36,
        borderRadius: "9999px",
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
