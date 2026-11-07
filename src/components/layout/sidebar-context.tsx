"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

interface SidebarState {
  /** Desktop rail collapsed to icon-only width. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Mobile drawer visibility. */
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarState | null>(null);

const DESKTOP_COLLAPSE_KEY = "rg.sidebar.collapsed";

let collapseListeners: Array<() => void> = [];
function emitCollapseChange() {
  for (const listener of collapseListeners) {
    listener();
  }
}

const collapseStore = {
  subscribe(listener: () => void) {
    collapseListeners.push(listener);
    return () => {
      collapseListeners = collapseListeners.filter((l) => l !== listener);
    };
  },
  getSnapshot() {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(DESKTOP_COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  },
  getServerSnapshot() {
    return false;
  },
  toggle() {
    try {
      const next = !collapseStore.getSnapshot();
      window.localStorage.setItem(DESKTOP_COLLAPSE_KEY, next ? "1" : "0");
      emitCollapseChange();
    } catch {
      /* ignore */
    }
  },
};

export function SidebarProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(
    collapseStore.subscribe,
    collapseStore.getSnapshot,
    collapseStore.getServerSnapshot,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    collapseStore.toggle();
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close the drawer when focus/keyboard requests Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const value = useMemo(
    () => ({
      collapsed,
      toggleCollapsed,
      mobileOpen,
      openMobile,
      closeMobile,
    }),
    [collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarState {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used inside <SidebarProvider>");
  }
  return context;
}
