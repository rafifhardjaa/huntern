"use client";

import type { JobStatus } from "@/types/database";
import { JOB_STATUSES } from "@/types/database";

export type StatusFilter = JobStatus | "all" | "expiring";
export type SortOrder = "newest" | "oldest" | "az";

interface FilterBarProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  sort: SortOrder;
  onSortChange: (value: SortOrder) => void;
  counts: Record<JobStatus, number>;
  total: number;
  expiringCount: number;
}

function toTitle(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function FilterBar({
  statusFilter,
  onStatusFilterChange,
  sort,
  onSortChange,
  counts,
  total,
  expiringCount,
}: FilterBarProps) {
  const chip = (active: boolean) =>
    `tnum text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
      active
        ? "bg-slate-900 text-white"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`;

  return (
    <section
      aria-label="Filter and sort applications"
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-2"
    >
      <span className="text-xs font-semibold text-slate-500 mr-1">Status</span>
      <button type="button" onClick={() => onStatusFilterChange("all")} className={chip(statusFilter === "all")}>
        All · {total}
      </button>
      {JOB_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onStatusFilterChange(s)}
          aria-pressed={statusFilter === s}
          className={chip(statusFilter === s)}
        >
          {toTitle(s)} · {counts[s]}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onStatusFilterChange("expiring")}
        aria-pressed={statusFilter === "expiring"}
        className={`tnum text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
          statusFilter === "expiring"
            ? "bg-rose-600 text-white"
            : "bg-rose-50 text-rose-700 hover:bg-rose-100"
        }`}
      >
        Expiring soon · {expiringCount}
      </button>

      <span className="text-xs font-semibold text-slate-500 ml-2">Sort</span>
      <label htmlFor="sort-order" className="sr-only">
        Sort order
      </label>
      <select
        id="sort-order"
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOrder)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="az">A–Z</option>
      </select>
    </section>
  );
}
