"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ResolutionRange } from "@/lib/types";
import { useToast } from "@/components/common/toast";

export interface DashboardSummaryData {
  kpis: {
    totalCases: { value: number; trend: number; hint: string };
    openCases: { value: number; trend: number; hint: string };
    awaitingResponse: { value: number; trend: number; hint: string };
    resolvedCases: { value: number; trend: number; hint: string };
  };
  categoryDistribution: Array<{ category: string; count: number; share: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
  recentCases: unknown[];
  attentionCases: unknown[];
  recentEvents: unknown[];
}

interface DashboardState {
  period: ResolutionRange;
  setPeriod: (next: ResolutionRange) => void;
  refreshing: boolean;
  refresh: () => void;
  summary: DashboardSummaryData | null;
}

const DashboardContext = createContext<DashboardState | null>(null);

const REFRESH_MS = 650;

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<ResolutionRange>("7D");
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DashboardSummaryData | null) => {
        if (active && data) {
          setSummary(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setRefreshing((current) => {
      if (current) return current;
      toast({
        tone: "info",
        title: "Syncing dashboard",
        description: "Querying SQLite database via /api/dashboard/summary...",
      });

      fetch("/api/dashboard/summary")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: DashboardSummaryData | null) => {
          if (data) setSummary(data);
        })
        .catch(() => {})
        .finally(() => {
          timer.current = setTimeout(() => {
            setRefreshing(false);
            toast({
              tone: "success",
              title: "Dashboard synced",
              description: "Displaying persistent SQLite database records.",
            });
          }, REFRESH_MS);
        });

      return true;
    });
  }, [toast]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(
    () => ({ period, setPeriod, refreshing, refresh, summary }),
    [period, refreshing, refresh, summary],
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used inside <DashboardProvider>");
  }
  return context;
}
