"use client";
import { useEffect, useLayoutEffect } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ThemeInitializer() {
  useIsomorphicLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("agaate_theme");
      if (stored === "dark" || stored === "light") {
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch {
      // Ignore if localStorage is inaccessible
    }
  }, []);

  return null;
}
