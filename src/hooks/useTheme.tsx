import { useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "exobrain-theme";

const getInitial = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
};

const apply = (t: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = getInitial();
    if (typeof window !== "undefined") apply(t);
    return t;
  });

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
};
