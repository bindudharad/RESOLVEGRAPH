"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileQuestion,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useDashboard, type AiFindingItem } from "@/components/dashboard/dashboard-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FindingCategoryFilter = "ALL" | "SUPPORTED_FINDING" | "POSSIBLE_EXPLANATION" | "CONFLICT_DETECTED" | "MISSING_INFORMATION";

export function InvestigationIntelligencePanel() {
  const { summary } = useDashboard();
  const [filter, setFilter] = useState<FindingCategoryFilter>("ALL");

  const findings: AiFindingItem[] = summary?.aiIntelligence?.findings || [];

  const filteredFindings = findings.filter((f) => {
    if (filter === "ALL") return true;
    return f.category === filter;
  });

  const getCategoryConfig = (category: AiFindingItem["category"]) => {
    switch (category) {
      case "SUPPORTED_FINDING":
        return {
          label: "SUPPORTED FINDING",
          color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
          desc: "Corroborated by bilateral evidence on record",
          icon: CheckCircle2,
        };
      case "CONFLICT_DETECTED":
        return {
          label: "CONFLICT DETECTED",
          color: "text-rose-300 bg-rose-500/10 border-rose-500/30",
          desc: "Discrepancy detected across participant records",
          icon: AlertTriangle,
        };
      case "POSSIBLE_EXPLANATION":
        return {
          label: "POSSIBLE EXPLANATION",
          color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
          desc: "Unconfirmed hypothesis requiring corroboration",
          icon: HelpCircle,
        };
      case "MISSING_INFORMATION":
        return {
          label: "MISSING INFORMATION",
          color: "text-purple-300 bg-purple-500/10 border-purple-500/30",
          desc: "Required documentation to reach determination",
          icon: FileQuestion,
        };
    }
  };

  return (
    <section
      aria-labelledby="ai-intelligence-heading"
      className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm space-y-4 paper-dark overflow-hidden"
    >
      {/* Plumbline Grid Accent */}
      <div className="guides-dark pointer-events-none absolute inset-0 opacity-20" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/70 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="ai-intelligence-heading" className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <span>Investigation Intelligence</span>
            </h2>
            <Badge tone="brand" className="text-[11px] font-mono bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30">
              BERR v2 REASONING
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            Understand what happened, why it happened and what evidence is still required across open cases.
          </p>
        </div>

        <Link href="/copilot">
          <Button variant="outline" size="sm" className="text-xs h-8 px-3 shadow-xs font-mono">
            <span>Open AI Copilot</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Category Filter Tabs */}
      <div className="relative z-10 flex flex-wrap items-center gap-1.5 text-xs">
        {[
          { id: "ALL", label: `All Findings (${findings.length})` },
          { id: "SUPPORTED_FINDING", label: "Supported Finding" },
          { id: "CONFLICT_DETECTED", label: "Conflict Detected" },
          { id: "POSSIBLE_EXPLANATION", label: "Possible Explanation" },
          { id: "MISSING_INFORMATION", label: "Missing Information" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as FindingCategoryFilter)}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all cursor-pointer border",
              filter === tab.id
                ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-semibold ring-1 ring-[var(--accent)]"
                : "border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]/60"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Findings Grid */}
      {filteredFindings.length === 0 ? (
        <div className="relative z-10 py-10 text-center text-xs text-[var(--ink-3)] rounded-xl border border-dashed border-[var(--line)] p-6 font-mono">
          <Brain className="h-8 w-8 mx-auto text-[var(--ink-3)] mb-2 opacity-50" />
          <p className="font-semibold text-[var(--ink-2)]">No findings under selected filter.</p>
          <p className="text-[11px] mt-1">Run 12-Stage Forensics or AI Copilot on an active case to generate grounded findings.</p>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFindings.slice(0, 4).map((finding) => {
            const config = getCategoryConfig(finding.category);
            const CategoryIcon = config.icon;
            return (
              <article
                key={finding.id}
                className="group flex flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-4 transition-all duration-200 hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]/70 hover:-translate-y-0.5 space-y-3 paper-dark"
              >
                <div>
                  {/* Category Pill + Case badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border", config.color)}>
                      <CategoryIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                    <Link
                      href={`/cases/${finding.caseNumber || finding.caseId}`}
                      className="text-[11px] font-mono font-bold text-[var(--ink)] hover:text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      {finding.caseNumber}
                    </Link>
                  </div>

                  {/* Title & Explanation */}
                  <h3 className="text-xs font-semibold text-[var(--ink)] leading-snug">
                    {finding.title}
                  </h3>
                  <p className="mt-1.5 text-[11.5px] text-[var(--ink-2)] leading-relaxed">
                    {finding.explanation}
                  </p>
                </div>

                {/* Recommended Next Step Box */}
                <div className="pt-2 border-t border-[var(--line)]/50">
                  <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-[var(--ink-3)] block mb-1">
                    Recommended Action:
                  </span>
                  <p className="text-[11px] font-mono text-[var(--ink-2)] bg-[var(--surface)] px-3 py-2 rounded-lg border border-[var(--line)] shadow-xs">
                    {finding.recommendedNextStep}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
