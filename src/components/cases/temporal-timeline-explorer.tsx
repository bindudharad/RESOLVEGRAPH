"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Play,
  CheckCircle,
  Package,
  CreditCard,
  Truck,
  FileCheck,
  AlertOctagon,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface TemporalTimelineExplorerProps {
  caseId: string;
}

interface TimelineEventItem {
  id: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string | null;
  recordedAt: string;
  sourceTimestamp: string | null;
  timePrecision: string;
  timeBasis: string;
  isContradictory: boolean;
}

interface AnomalyItem {
  anomalyType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
}

interface ReplayState {
  asOfTimestamp: string;
  eventsCount: number;
  claimsPresent: Array<{ id: string; claimType: string; assertedAt: string }>;
  evidencePresent: Array<{ id: string; title: string; submittedAt: string }>;
  factsKnown: Array<{ id: string; fieldKey: string; normalizedValue: string | null }>;
  findingsFormed: Array<{ id: string; title: string; findingType: string }>;
}

const EVENT_ICONS: Record<string, typeof Package> = {
  PURCHASE: Package,
  PAYMENT: CreditCard,
  DISPATCH: Truck,
  DELIVERY_ATTEMPT: Truck,
  DELIVERY_COMPLETED: CheckCircle,
  COMPLAINT_FILED: AlertOctagon,
  EVIDENCE_SUBMITTED: FileCheck,
  INSPECTION_REPORT: FileCheck,
};

export function TemporalTimelineExplorer({ caseId }: TemporalTimelineExplorerProps) {
  const [timeline, setTimeline] = useState<TimelineEventItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);

  // Counterfactual replay state
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [replayState, setReplayState] = useState<ReplayState | null>(null);

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline || []);
        setAnomalies(data.anomalies || []);
        if (data.timeline?.length > 0) {
          setReplayIndex(data.timeline.length - 1);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/timeline`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setTimeline(data.timeline || []);
          setAnomalies(data.anomalies || []);
          if (data.timeline?.length > 0) {
            setReplayIndex(data.timeline.length - 1);
          }
        }
      } catch {
        // Fallback
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [caseId]);

  // Fetch counterfactual replay state when replayIndex changes
  useEffect(() => {
    if (timeline.length === 0) return;
    const currentEvent = timeline[replayIndex];
    if (!currentEvent) return;

    const targetDate = currentEvent.occurredAt || currentEvent.recordedAt;

    fetch(`/api/cases/${caseId}/replay?asOf=${encodeURIComponent(targetDate)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.replay) {
          setReplayState(data.replay);
        }
      })
      .catch(() => {});
  }, [caseId, replayIndex, timeline]);

  return (
    <div className="rg-card flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-fg">Temporal Intelligence & Chronological Replay</h3>
            <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-indigo-300">
              Occurred vs Recorded
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-subtle">
            Reconstructs real-world transaction chronology, flags timestamp contradictions, and enables counterfactual case replay.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTimeline}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Refresh Timeline
          </Button>
        </div>
      </div>

      {/* Anomalies Alert Box */}
      {anomalies.length > 0 && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert className="h-4 w-4" />
            <h4 className="text-[13px] font-semibold">
              {anomalies.length} Temporal Discrepanc{anomalies.length > 1 ? "ies" : "y"} Detected
            </h4>
          </div>
          <div className="mt-2 space-y-1.5 text-[12px] text-rose-300/90">
            {anomalies.map((ano, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="font-mono font-bold text-[10.5px] uppercase text-rose-400">
                  [{ano.anomalyType}]:
                </span>
                <span>{ano.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counterfactual Case Replay Scrubbing Bar */}
      {timeline.length > 0 && (
        <div className="rounded-lg border border-line bg-surface-2/60 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-amber-400" />
              <span className="text-[12.5px] font-semibold text-fg">
                Counterfactual Case Replay (Milestone {replayIndex + 1} of {timeline.length})
              </span>
            </div>
            <span className="font-mono text-[11.5px] text-muted">
              As Of: {timeline[replayIndex]?.occurredAt ? formatDate(timeline[replayIndex].occurredAt!) : formatDate(timeline[replayIndex]?.recordedAt)}
            </span>
          </div>

          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={Math.max(0, timeline.length - 1)}
              value={replayIndex}
              onChange={(e) => setReplayIndex(Number(e.target.value))}
              className="w-full accent-[var(--color-brand)] cursor-pointer"
            />
          </div>

          {/* Replay State Snapshot Pills */}
          {replayState && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11.5px]">
              <div className="rounded border border-line bg-surface p-2">
                <span className="text-faint">Claims Known:</span>
                <span className="ml-1.5 font-bold text-fg">{replayState.claimsPresent.length}</span>
              </div>
              <div className="rounded border border-line bg-surface p-2">
                <span className="text-faint">Evidence Uploaded:</span>
                <span className="ml-1.5 font-bold text-fg">{replayState.evidencePresent.length}</span>
              </div>
              <div className="rounded border border-line bg-surface p-2">
                <span className="text-faint">Facts Extracted:</span>
                <span className="ml-1.5 font-bold text-fg">{replayState.factsKnown.length}</span>
              </div>
              <div className="rounded border border-line bg-surface p-2">
                <span className="text-faint">BERR Findings:</span>
                <span className="ml-1.5 font-bold text-fg">{replayState.findingsFormed.length}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chronological Timeline Stream */}
      <div className="relative flex flex-col gap-4 pl-6 before:absolute before:bottom-0 before:left-2.5 before:top-2 before:w-0.5 before:bg-line">
        {timeline.map((item, index) => {
          const IconComponent = EVENT_ICONS[item.eventType] || Clock;
          const isSelected = index === replayIndex;

          return (
            <div
              key={item.id}
              className={`relative flex flex-col gap-2 rounded-lg border p-4 transition-all ${
                isSelected
                  ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface-2))]"
                  : item.isContradictory
                  ? "border-rose-500/40 bg-rose-950/10"
                  : "border-line bg-surface-2 hover:border-line-2"
              }`}
            >
              {/* Timeline Dot Marker */}
              <div
                className={`absolute -left-6 top-4 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border ${
                  item.isContradictory
                    ? "border-rose-500 bg-rose-950 text-rose-400"
                    : isSelected
                    ? "border-amber-400 bg-amber-950 text-amber-300"
                    : "border-line bg-surface text-faint"
                }`}
              >
                <IconComponent className="h-2.5 w-2.5" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase text-amber-400">
                    {item.eventType.replace("_", " ")}
                  </span>
                  <span className="font-semibold text-[13.5px] text-fg">{item.title}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                  <span className="rounded bg-surface px-2 py-0.5 font-medium text-muted border border-line">
                    Basis: {item.timeBasis}
                  </span>
                  <span className="rounded bg-surface px-2 py-0.5 font-medium text-muted border border-line">
                    Precision: {item.timePrecision}
                  </span>
                </div>
              </div>

              <p className="text-[12px] text-subtle">{item.description}</p>

              {/* Occurred vs Recorded Comparison */}
              <div className="mt-1 flex flex-wrap items-center gap-4 border-t border-line/60 pt-2 text-[11.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-faint">Occurred At:</span>
                  <span className="font-mono font-medium text-fg">
                    {item.occurredAt ? formatDate(item.occurredAt) : "Not Asserted"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-faint">Recorded In System:</span>
                  <span className="font-mono font-medium text-muted">
                    {formatDate(item.recordedAt)}
                  </span>
                </div>
                {item.sourceTimestamp && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-faint">Source Excerpt:</span>
                    <span className="font-mono text-faint italic">&ldquo;{item.sourceTimestamp}&rdquo;</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
