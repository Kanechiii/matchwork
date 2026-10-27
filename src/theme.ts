import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "matchwork-theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/** Follows the OS preference until the user picks a theme, then remembers it. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => savedTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (!savedTheme()) setTheme(systemTheme()); };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
    setTheme(next);
  };

  return { theme, toggle };
}
