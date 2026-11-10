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
import { DEMO_CASES, CURRENT_USER } from "@/lib/mock-data";
import { CANONICAL_DEMO_CASE } from "@/lib/demo-fixture";
import type {
  CaseCategory as FrontendCaseCategory,
  CasePriority,
  CaseStatus as FrontendCaseStatus,
  Currency,
  ResolutionCase,
} from "@/lib/types";
import { CaseCategory, CaseStatus, CasePriority as DBCasePriority } from "@/generated/prisma/enums";

export interface NewCaseInput {
  title: string;
  customer: string;
  merchant: string;
  category: FrontendCaseCategory;
  description: string;
  amount: number;
  currency: Currency;
  priority: CasePriority;
}

export interface CaseNote {
  id: string;
  caseId: string;
  author: string;
  text: string;
  timestamp: string;
}

const INITIAL_NOTES: Record<string, CaseNote[]> = {
  "RG-1001": [
    {
      id: "note-1",
      caseId: "RG-1001",
      author: CURRENT_USER.fullName,
      text: "Carrier package scan confirms delivery weight 340g. A 1 TB model packaging averages 345g, whereas 512 GB averages 338g. Requesting exact serial number from device firmware log.",
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: "note-2",
      caseId: "RG-1001",
      author: "TechStore Support Team",
      text: "Warehouse shift supervisor initiated review for picking batch SSD-1TB-BLK. We will respond with carrier manifest record within 24 hours.",
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ],
};

const CATEGORY_MAP: Record<string, CaseCategory> = {
  "Product Not as Described": CaseCategory.NOT_AS_DESCRIBED,
  "Item Not Received": CaseCategory.NON_DELIVERY,
  "Damaged Product": CaseCategory.DAMAGED_GOODS,
  "Refund Pending": CaseCategory.REFUND_DISPUTE,
  "Return Denied": CaseCategory.REFUND_DISPUTE,
  "Payment Issue": CaseCategory.UNAUTHORIZED_TRANSACTION,
  "Other": CaseCategory.OTHER,
};

const REVERSE_CATEGORY_MAP: Record<string, FrontendCaseCategory> = {
  [CaseCategory.NOT_AS_DESCRIBED]: "Product Not as Described",
  [CaseCategory.NON_DELIVERY]: "Item Not Received",
  [CaseCategory.DAMAGED_GOODS]: "Damaged Product",
  [CaseCategory.REFUND_DISPUTE]: "Refund Pending",
  [CaseCategory.UNAUTHORIZED_TRANSACTION]: "Payment Issue",
  [CaseCategory.BILLING_ERROR]: "Payment Issue",
  [CaseCategory.OTHER]: "Other",
};

const STATUS_MAP: Record<string, CaseStatus> = {
  "Open": CaseStatus.SUBMITTED,
  "Under Investigation": CaseStatus.UNDER_ANALYSIS,
  "Awaiting Merchant": CaseStatus.EVIDENCE_REQUESTED,
  "Awaiting Buyer": CaseStatus.EVIDENCE_REQUESTED,
  "Resolved": CaseStatus.RESOLVED,
  "Escalated": CaseStatus.IN_REVIEW,
};

const REVERSE_STATUS_MAP: Record<string, FrontendCaseStatus> = {
  [CaseStatus.DRAFT]: "Open",
  [CaseStatus.SUBMITTED]: "Open",
  [CaseStatus.UNDER_ANALYSIS]: "Under Investigation",
  [CaseStatus.EVIDENCE_REQUESTED]: "Awaiting Merchant",
  [CaseStatus.EVIDENCE_SUBMITTED]: "Under Investigation",
  [CaseStatus.IN_REVIEW]: "Escalated",
  [CaseStatus.RESOLVED]: "Resolved",
  [CaseStatus.CLOSED]: "Resolved",
  [CaseStatus.ARCHIVED]: "Resolved",
};

const PRIORITY_MAP: Record<string, DBCasePriority> = {
  "High": DBCasePriority.HIGH,
  "Medium": DBCasePriority.MEDIUM,
  "Low": DBCasePriority.LOW,
};

const REVERSE_PRIORITY_MAP: Record<string, CasePriority> = {
  [DBCasePriority.URGENT]: "High",
  [DBCasePriority.HIGH]: "High",
  [DBCasePriority.MEDIUM]: "Medium",
  [DBCasePriority.LOW]: "Low",
};

interface DbCaseRecord {
  id: string;
  caseNumber?: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priority: string;
  amount?: number;
  amountMinor?: number;
  currency?: string;
  expectedProduct?: string;
  reportedProduct?: string;
  customer?: string;
  merchant?: string;
  buyer?: { fullName?: string };
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

function formatDbCase(dbCase: DbCaseRecord): ResolutionCase {
  const categoryLabel: FrontendCaseCategory =
    REVERSE_CATEGORY_MAP[dbCase.category] || "Other";
  const statusLabel: FrontendCaseStatus =
    REVERSE_STATUS_MAP[dbCase.status] || "Open";
  const priorityLabel: CasePriority =
    REVERSE_PRIORITY_MAP[dbCase.priority] || "Medium";

  return {
    id: dbCase.caseNumber || dbCase.id,
    title: dbCase.title,
    customer: dbCase.buyer?.fullName || dbCase.customer || "Alex Morgan",
    merchant: dbCase.merchant || "TechStore Global",
    category: categoryLabel,
    amount: typeof dbCase.amount === "number" ? dbCase.amount : (dbCase.amountMinor || 0) / 100,
    currency: (dbCase.currency as Currency) || "USD",
    priority: priorityLabel,
    status: statusLabel,
    createdAt: dbCase.createdAt ? new Date(dbCase.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: dbCase.updatedAt ? new Date(dbCase.updatedAt).toISOString() : new Date().toISOString(),
    description: dbCase.description || "",
    expectedProduct: dbCase.expectedProduct,
    reportedProduct: dbCase.reportedProduct,
  };
}

interface CasesApi {
  cases: ResolutionCase[];
  /** How many cases were created this session. */
  ephemeralCount: number;
  isLoading: boolean;
  createCase: (input: NewCaseInput) => ResolutionCase;
  getCase: (id: string) => ResolutionCase | undefined;
  updateCaseStatus: (id: string, status: FrontendCaseStatus) => void;
  getCaseNotes: (id: string) => CaseNote[];
  addCaseNote: (caseId: string, text: string, author?: string) => CaseNote;
  refresh: () => Promise<void>;
}

const CasesContext = createContext<CasesApi | null>(null);

const ID_PREFIX = "RG-";

function nextId(cases: ResolutionCase[]): string {
  const highest = cases.reduce((max, item) => {
    const numeric = Number.parseInt(item.id.replace(ID_PREFIX, ""), 10);
    return Number.isNaN(numeric) ? max : Math.max(max, numeric);
  }, 1000);
  return `${ID_PREFIX}${highest + 1}`;
}

const DEFAULT_CASES: ResolutionCase[] = [
  CANONICAL_DEMO_CASE,
  ...DEMO_CASES.filter((c) => c.id !== CANONICAL_DEMO_CASE.id),
];

export function CasesProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<ResolutionCase[]>(DEFAULT_CASES);
  const [notes, setNotes] = useState<Record<string, CaseNote[]>>(INITIAL_NOTES);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const casesRef = useRef<ResolutionCase[]>(DEFAULT_CASES);

  const commit = useCallback((next: ResolutionCase[]) => {
    casesRef.current = next;
    setCases(next);
  }, []);

  // Fetch initial real cases from backend database on mount
  useEffect(() => {
    let active = true;
    fetch("/api/cases?limit=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: DbCaseRecord[] } | null) => {
        if (active && data?.items && Array.isArray(data.items) && data.items.length > 0) {
          const formatted = data.items.map(formatDbCase);
          commit([CANONICAL_DEMO_CASE, ...formatted.filter((c: ResolutionCase) => c.id !== CANONICAL_DEMO_CASE.id)]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [commit]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/cases?limit=50");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          const formatted = data.items.map(formatDbCase);
          commit([CANONICAL_DEMO_CASE, ...formatted.filter((c: ResolutionCase) => c.id !== CANONICAL_DEMO_CASE.id)]);
        }
      }
    } catch (e) {
      console.warn("Using local fallback cases (network unavailable)", e);
    } finally {
      setIsLoading(false);
    }
  }, [commit]);

  const createCase = useCallback(
    (input: NewCaseInput): ResolutionCase => {
      const now = new Date().toISOString();
      const tempId = nextId(casesRef.current);
      const created: ResolutionCase = {
        id: tempId,
        ...input,
        status: "Open",
        createdAt: now,
        updatedAt: now,
        ephemeral: false,
      };

      // Optimistic update
      commit([created, ...casesRef.current]);

      // Map names to seeded users
      let buyerId = "usr_alex_buyer";
      if (input.customer.toLowerCase().includes("sarah")) buyerId = "usr_sarah_buyer";
      if (input.customer.toLowerCase().includes("daniel")) buyerId = "usr_daniel_buyer";

      let merchantId = "usr_techstore_merchant";
      if (input.merchant.toLowerCase().includes("digital")) merchantId = "usr_digitalmart_merchant";
      if (input.merchant.toLowerCase().includes("nova")) merchantId = "usr_novaelectronics_merchant";

      const dbCategory = CATEGORY_MAP[input.category] || CaseCategory.OTHER;
      const dbPriority = PRIORITY_MAP[input.priority] || DBCasePriority.MEDIUM;
      const amountMinor = Math.round(input.amount * 100);

      // Persist to SQLite backend
      fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          category: dbCategory,
          priority: dbPriority,
          amountMinor,
          currency: input.currency,
          buyerId,
          merchantId,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((savedCase) => {
          if (savedCase) {
            const formatted = formatDbCase(savedCase);
            commit(casesRef.current.map((c) => (c.id === tempId ? formatted : c)));
          }
        })
        .catch((err) => {
          console.error("Failed to persist case to SQLite:", err);
        });

      return created;
    },
    [commit],
  );

  const getCase = useCallback(
    (id: string) => cases.find((item) => item.id.toLowerCase() === id.toLowerCase()),
    [cases],
  );

  const updateCaseStatus = useCallback(
    (id: string, status: FrontendCaseStatus) => {
      const now = new Date().toISOString();
      const next = casesRef.current.map((item) => {
        if (item.id === id) {
          return { ...item, status, updatedAt: now };
        }
        return item;
      });
      commit(next);

      // Persist status change to SQLite with audit event
      const dbStatus = STATUS_MAP[status] || CaseStatus.SUBMITTED;
      fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: dbStatus,
          note: `Case status changed to ${status}`,
          actorId: "usr_priya_admin",
        }),
      }).catch((err) => {
        console.error("Failed to persist status change to SQLite:", err);
      });
    },
    [commit],
  );

  const getCaseNotes = useCallback(
    (caseId: string) => notes[caseId] ?? [],
    [notes],
  );

  const addCaseNote = useCallback(
    (caseId: string, text: string, author: string = CURRENT_USER.fullName): CaseNote => {
      const newNote: CaseNote = {
        id: `note-${Date.now()}`,
        caseId,
        author,
        text,
        timestamp: new Date().toISOString(),
      };
      setNotes((current) => ({
        ...current,
        [caseId]: [newNote, ...(current[caseId] ?? [])],
      }));

      // Persist note to SQLite audit log
      fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: text,
          actorId: "usr_priya_admin",
        }),
      }).catch((err) => {
        console.error("Failed to persist note to SQLite:", err);
      });

      return newNote;
    },
    [],
  );

  const value = useMemo<CasesApi>(
    () => ({
      cases,
      ephemeralCount: cases.filter((item) => item.ephemeral).length,
      isLoading,
      createCase,
      getCase,
      updateCaseStatus,
      getCaseNotes,
      addCaseNote,
      refresh,
    }),
    [cases, isLoading, createCase, getCase, updateCaseStatus, getCaseNotes, addCaseNote, refresh],
  );

  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>;
}

export function useDemoCases(): CasesApi {
  const context = useContext(CasesContext);
  if (!context) {
    throw new Error("useDemoCases must be used inside <CasesProvider>");
  }
  return context;
}
