"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type UiChromeContextValue = {
  zoom: number;
  setZoom: (z: number) => void;
  bumpZoom: (delta: number) => void;
  resetZoom: () => void;
  dark: boolean;
  setDark: (v: boolean) => void;
  toggleTheme: () => void;
};

const UiChromeContext = createContext<UiChromeContextValue | null>(null);

const ZOOM_KEY = "cissy-ui-zoom";
const THEME_KEY = "cissy-ui-theme";

export function UiChromeProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoomState] = useState(100);
  const [dark, setDarkState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const z = Number(sessionStorage.getItem(ZOOM_KEY));
      if (z >= 80 && z <= 140) setZoomState(z);
      setDarkState(sessionStorage.getItem(THEME_KEY) === "dark");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", dark);
    try {
      sessionStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark, mounted]);

  const setZoom = useCallback((z: number) => {
    const next = Math.min(140, Math.max(80, Math.round(z)));
    setZoomState(next);
    try {
      sessionStorage.setItem(ZOOM_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      sessionStorage.setItem(ZOOM_KEY, String(zoom));
    } catch {
      /* ignore */
    }
  }, [zoom, mounted]);

  const bumpZoom = useCallback(
    (delta: number) => setZoom(zoom + delta),
    [zoom, setZoom]
  );

  const resetZoom = useCallback(() => setZoom(100), [setZoom]);

  const setDark = useCallback((v: boolean) => setDarkState(v), []);

  const toggleTheme = useCallback(() => setDarkState((d) => !d), []);

  const value = useMemo(
    () => ({
      zoom,
      setZoom,
      bumpZoom,
      resetZoom,
      dark,
      setDark,
      toggleTheme,
    }),
    [zoom, setZoom, bumpZoom, resetZoom, dark, setDark, toggleTheme]
  );

  return (
    <UiChromeContext.Provider value={value}>{children}</UiChromeContext.Provider>
  );
}

export function useUiChrome() {
  const ctx = useContext(UiChromeContext);
  if (!ctx) {
    throw new Error("useUiChrome must be used within UiChromeProvider");
  }
  return ctx;
}
