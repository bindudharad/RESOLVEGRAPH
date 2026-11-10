"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type MotionMode = "full" | "reduced" | "off";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (mode: ThemeMode) => void;
  motion: MotionMode;
  setMotion: (mode: MotionMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  motion: "full",
  setMotion: () => {},
});

const THEME_STORAGE_KEY = "rg.theme";
const MOTION_STORAGE_KEY = "rg.motion";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [motion, setMotionState] = useState<MotionMode>("full");

  useEffect(() => {
    // Read stored settings or fallback to default dark obsidian environment
    const storedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || "dark";
    const storedMotion = (localStorage.getItem(MOTION_STORAGE_KEY) as MotionMode) || "full";
    setThemeState(storedTheme);
    setMotionState(storedMotion);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let actualTheme: "light" | "dark" = "light";

    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      actualTheme = prefersDark ? "dark" : "light";
    } else {
      actualTheme = theme;
    }

    setResolvedTheme(actualTheme);
    if (actualTheme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-motion", motion);
    if (motion === "reduced" || motion === "off") {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
  }, [motion]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const setMotion = (mode: MotionMode) => {
    setMotionState(mode);
    localStorage.setItem(MOTION_STORAGE_KEY, mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, motion, setMotion }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
