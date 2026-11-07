"use client";

import { Filter, X } from "lucide-react";
import { SearchInput } from "@/components/common/search-input";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  CASE_CATEGORIES,
  CASE_STATUSES,
  CASE_PRIORITIES,
} from "@/lib/types";

export interface CaseFilterState {
  query: string;
  category: string;
  status: string;
  priority: string;
}

export const EMPTY_FILTERS: CaseFilterState = {
  query: "",
  category: "All",
  status: "All",
  priority: "All",
};

export function hasActiveFilters(state: CaseFilterState): boolean {
  return (
    state.query.trim() !== "" ||
    state.category !== "All" ||
    state.status !== "All" ||
    state.priority !== "All"
  );
}

/**
 * Controlled filter toolbar. Every control writes back to the parent so the
 * same instance works on the dashboard and the full case-management route.
 */
export function CaseFilters({
  state,
  onChange,
  showPriority = true,
  placeholder = "Search by case ID, customer or merchant…",
}: {
  state: CaseFilterState;
  onChange: (next: CaseFilterState) => void;
  showPriority?: boolean;
  placeholder?: string;
}) {
  const active = hasActiveFilters(state);
  const set = (patch: Partial<CaseFilterState>) => onChange({ ...state, ...patch });

  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
      <SearchInput
        value={state.query}
        onValueChange={(value) => set({ query: value })}
        placeholder={placeholder}
        aria-label="Search cases"
        className="w-full lg:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden items-center gap-1.5 pr-0.5 text-[11.5px] font-medium text-faint sm:flex">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
        </span>

        <Select
          aria-label="Filter by category"
          value={state.category}
          onChange={(event) => set({ category: event.target.value })}
          className="w-[calc(50%-0.25rem)] sm:w-52"
        >
          <option value="All">All categories</option>
          {CASE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filter by status"
          value={state.status}
          onChange={(event) => set({ status: event.target.value })}
          className="w-[calc(50%-0.25rem)] sm:w-48"
        >
          <option value="All">All statuses</option>
          {CASE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>

        {showPriority ? (
          <Select
            aria-label="Filter by priority"
            value={state.priority}
            onChange={(event) => set({ priority: event.target.value })}
            className="w-[calc(50%-0.25rem)] sm:w-40"
          >
            <option value="All">All priorities</option>
            {CASE_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>
        ) : null}

        {active ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_FILTERS)}
            icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
