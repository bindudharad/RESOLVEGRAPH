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

export interface DashboardOverviewMetric {
  value: number;
  label: string;
  sublabel: string;
  href: string;
}

export interface AttentionQueueItem {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  amount: number;
  currency: string;
  customer: string;
  merchant: string;
  provider: string;
  reason: string;
  nextAction: string;
  lastUpdated: string;
}

export interface AiFindingItem {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  title: string;
  explanation: string;
  recommendedNextStep: string;
  category: "SUPPORTED_FINDING" | "POSSIBLE_EXPLANATION" | "CONFLICT_DETECTED" | "MISSING_INFORMATION";
  findingType: string;
  outcome: string;
  severity: string;
  reviewStatus: string;
  createdAt: string;
  evidenceLinks: Array<{ filename: string; verificationStatus: string }>;
}

export interface EvidenceIntelligenceData {
  total: number;
  verified: number;
  suspicious: number;
  unverified: number;
  recent: Array<{
    id: string;
    filename: string;
    caseId: string;
    caseNumber: string;
    caseTitle: string;
    evidenceType: string;
    verificationStatus: string;
    sha256: string;
    sizeBytes: number;
    uploadedByName: string;
    createdAt: string;
  }>;
}

export interface ReconciliationIntelligenceData {
  total: number;
  matched: number;
  review: number;
  conflict: number;
  unmatched: number;
  recentTransactions: Array<{
    id: string;
    provider: string;
    grossAmountMinor: number;
    currency: string;
    reconciliationState: string;
    externalReference?: string;
    normalizedStatus: string;
    timestamp: string;
  }>;
}

export interface CommerceIntelligenceData {
  totalOrders: number;
  purchaseMemories: number;
  registeredPackages: number;
  packagesInTransit: number;
  deliveryReminders: number;
  unboxingSessions: number;
}

export interface IntegrationHealthItem {
  name: string;
  status: "CONNECTED" | "AVAILABLE" | "SANDBOX" | "SIMULATED" | "NOT CONFIGURED" | "UNAVAILABLE" | "ERROR" | "ACTIVE";
  detail: string;
  latency: string;
}

export interface PipelineStageItem {
  index: number;
  name: string;
  status: "COMPLETED" | "ACTIVE" | "PENDING" | "BLOCKED";
  href: string;
}

export interface CanonicalPipelineData {
  id: string;
  caseNumber: string;
  title: string;
  activeStage: number;
  stages: PipelineStageItem[];
}

export interface DashboardSummaryData {
  kpis: {
    totalCases: { value: number; trend: number; hint: string };
    openCases: { value: number; trend: number; hint: string };
    awaitingResponse: { value: number; trend: number; hint: string };
    resolvedCases: { value: number; trend: number; hint: string };
  };
  overviewMetrics?: {
    activeInvestigations: DashboardOverviewMetric;
    pendingReviews: DashboardOverviewMetric;
    paymentConflicts: DashboardOverviewMetric;
    evidenceRequiringReview: DashboardOverviewMetric;
  };
  categoryDistribution: Array<{ category: string; count: number; share: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
  recentCases: Record<string, unknown>[];
  attentionCases: Record<string, unknown>[];
  attentionQueue?: AttentionQueueItem[];
  evidenceIntelligence?: EvidenceIntelligenceData;
  reconciliationIntelligence?: ReconciliationIntelligenceData;
  aiIntelligence?: {
    findings: AiFindingItem[];
  };
  commerceIntelligence?: CommerceIntelligenceData;
  integrationHealth?: IntegrationHealthItem[];
  canonicalPipelineCase?: CanonicalPipelineData | null;
  recentEvents: Record<string, unknown>[];
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
