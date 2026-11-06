"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { JobApplication, JobStatus } from "@/types/database";
import { JOB_STATUSES } from "@/types/database";

const STATUS_FILL: Record<JobStatus, string> = {
  wishlist: "#CBD5E1",
  applied: "#4F46E5",
  interview: "#F59E0B",
  offered: "#10B981",
  rejected: "#F43F5E",
};

type DateRange = "all" | "7d" | "30d" | "90d";

const RANGE_DAYS: Record<Exclude<DateRange, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function toTitle(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-lg">
      <p className="tnum text-xs font-semibold text-slate-900">
        {label ?? p.name}: {p.value}
      </p>
    </div>
  );
}

function weekStart(d: Date): Date {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const cardClass =
  "bg-white rounded-xl border border-slate-200 shadow-sm";
const headClass = "px-4 py-3 border-b border-slate-100";
const titleClass = "text-base font-semibold text-slate-900";

// Evaluated once at import so range filtering stays stable across re-renders.
const FILTER_NOW = Date.now();

export function Analytics({ applications }: { applications: JobApplication[] }) {
  const [range, setRange] = useState<DateRange>("all");
  const [role, setRole] = useState("");

  const scoped = useMemo(() => {
    const q = role.trim().toLowerCase();
    return applications.filter((a) => {
      if (range !== "all") {
        const created = new Date(a.created_at).getTime();
        if (Number.isNaN(created) || FILTER_NOW - created > RANGE_DAYS[range] * 24 * 3600 * 1000) {
          return false;
        }
      }
      if (q) {
        return (
          a.position_title.toLowerCase().includes(q) ||
          a.company_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [applications, range, role]);

  const counts = useMemo(() => {
    const acc = {} as Record<JobStatus, number>;
    for (const s of JOB_STATUSES) {
      acc[s] = scoped.filter((a) => a.status === s).length;
    }
    return acc;
  }, [scoped]);

  const statusData = JOB_STATUSES.map((s) => ({
    status: toTitle(s),
    count: counts[s],
    fill: STATUS_FILL[s],
  }));

  const weekly = useMemo(() => {
    const buckets: { week: string; applications: number }[] = [];
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const start = weekStart(new Date(now.getTime() - i * 7 * 24 * 3600 * 1000));
      const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
      const n = scoped.filter((a) => {
        const d = new Date(a.created_at);
        return d >= start && d < end;
      }).length;
      buckets.push({
        week: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        applications: n,
      });
    }
    return buckets;
  }, [scoped]);

  const total = scoped.length;
  const converted = counts.interview + counts.offered;
  const rate = total === 0 ? 0 : Math.round((converted / total) * 100);

  // "Reached at least this stage" — the app only stores the current status, so a
  // rejected card counts as having reached every earlier stage too.
  const funnelData = useMemo(() => {
    const reachedInterview = counts.interview + counts.offered + counts.rejected;
    const movedBeyondWishlist = total - counts.wishlist;
    return [
      { stage: 'Tracked', value: total, fill: '#CBD5E1' },
      { stage: 'Applied', value: movedBeyondWishlist, fill: '#818CF8' },
      { stage: 'Interview', value: reachedInterview, fill: '#4F46E5' },
      { stage: 'Offer', value: counts.offered, fill: '#10B981' },
    ];
  }, [total, counts]);

  // Average days between adding a job and its interview, for cards that got one.
  const avgDaysToInterview = useMemo(() => {
    const spans = scoped
      .filter((a) => a.interview_date)
      .map((a) => {
        const start = new Date(a.created_at).getTime();
        const end = new Date(a.interview_date!).getTime();
        if (Number.isNaN(start) || Number.isNaN(end)) return null;
        const days = (end - start) / (24 * 3600 * 1000);
        return days >= 0 ? days : null;
      })
      .filter((d): d is number => d !== null);
    if (spans.length === 0) return null;
    return Math.round(spans.reduce((sum, d) => sum + d, 0) / spans.length);
  }, [scoped]);

  // Deadlines the user set that have already passed, split by whether they acted.
  const deadlineMisses = useMemo(() => {
    const withDeadline = scoped.filter((a) => a.deadline && a.status !== 'wishlist');
    const missed = withDeadline.filter(
      (a) => new Date(a.deadline!).getTime() < FILTER_NOW && a.status === 'rejected'
    ).length;
    return { total: withDeadline.length, missed };
  }, [scoped]);

  const gridStroke = "#E5E7EB";
  const tickFill = "#6B7280";
  const cursorFill = "#F1F5F9";
  const lineStroke = "#4F46E5";

  const rangeChip = (active: boolean) =>
    `tnum text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
      active
        ? "bg-slate-900 text-white"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`;

  return (
    <section aria-label="Application analytics" className="space-y-4">
      {/* Interactive filters */}
      <div className={`${cardClass} p-4 flex flex-wrap items-center gap-2`}>
        <span className="text-xs font-semibold text-slate-500">Range</span>
        {(["all", "7d", "30d", "90d"] as DateRange[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={rangeChip(range === r)}
          >
            {r === "all" ? "All time" : `Last ${r}`}
          </button>
        ))}
        <span className="text-xs font-semibold text-slate-500 ml-2">Role</span>
        <label htmlFor="analytics-role" className="sr-only">Filter by role or company</label>
        <input
          id="analytics-role"
          type="search"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. frontend"
          className="rounded-lg bg-slate-100 border border-transparent px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <span className="tnum ml-auto text-xs text-slate-500">
          {total} in view
        </span>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className={`col-span-12 xl:col-span-8 ${cardClass}`}>
          <header className={headClass}>
            <h2 className={titleClass}>Status breakdown</h2>
          </header>
          <div className="p-4 h-72">
            {total === 0 ? (
              <EmptyChart text="No data matches these filters." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="status"
                    tick={{ fill: tickFill, fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: gridStroke }}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: tickFill, fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: cursorFill }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} strokeWidth={0}>
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={`col-span-12 xl:col-span-4 ${cardClass} p-6 flex flex-col justify-center`}>
          <p className="text-sm font-medium text-slate-500">Conversion rate</p>
          <p className="tnum text-5xl font-bold text-indigo-600 leading-none mt-2">
            {rate}%
          </p>
          <p className="tnum text-xs text-slate-500 mt-2">
            {converted} of {total} reached interview or offer
          </p>
        </div>

        <div className={`col-span-12 xl:col-span-4 ${cardClass}`}>
          <header className={headClass}>
            <h2 className={titleClass}>Pipeline funnel</h2>
          </header>
          <div className="p-4 h-64">
            {total === 0 ? (
              <EmptyChart text="No data matches these filters." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    {funnelData.map((entry) => (
                      <Cell key={entry.stage} fill={entry.fill} />
                    ))}
                    <LabelList
                      position="right"
                      fill="#111827"
                      stroke="none"
                      dataKey="stage"
                      fontSize={11}
                      fontWeight={600}
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            )}
          </div>
          {total > 0 && (
            <ul className="px-4 pb-4 space-y-1">
              {funnelData.map((d, i) => {
                const prev = i === 0 ? d.value : funnelData[i - 1].value;
                const stepRate = prev === 0 ? 0 : Math.round((d.value / prev) * 100);
                return (
                  <li key={d.stage} className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: d.fill }}
                    />
                    <span className="font-medium text-slate-600">{d.stage}</span>
                    <span className="tnum ml-auto font-semibold text-slate-900">{d.value}</span>
                    {i > 0 && (
                      <span className="tnum w-10 text-right text-slate-500">{stepRate}%</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="col-span-12 md:col-span-6 xl:col-span-4 grid grid-cols-2 gap-4">
          <div className={`${cardClass} p-5 flex flex-col justify-center`}>
            <p className="text-xs font-medium text-slate-500">Avg to interview</p>
            <p className="tnum text-3xl font-bold text-slate-900 leading-none mt-2">
              {avgDaysToInterview === null ? "—" : `${avgDaysToInterview}d`}
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              From adding a job to its interview date
            </p>
          </div>
          <div className={`${cardClass} p-5 flex flex-col justify-center`}>
            <p className="text-xs font-medium text-slate-500">Deadlines tracked</p>
            <p className="tnum text-3xl font-bold text-slate-900 leading-none mt-2">
              {deadlineMisses.total}
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              {deadlineMisses.missed} ended in rejection
            </p>
          </div>
        </div>

        <div className={`col-span-12 xl:col-span-4 ${cardClass}`}>
          <header className={headClass}>
            <h2 className={titleClass}>Distribution</h2>
          </header>
          <div className="p-4 h-64">
            {total === 0 ? (
              <EmptyChart text="No data matches these filters." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={55}
                    outerRadius={85}
                    strokeWidth={0}
                    paddingAngle={2}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {total > 0 && (
            <ul className="px-4 pb-4 space-y-1.5">
              {statusData.map((d) => (
                <li key={d.status} className="flex items-center gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: d.fill }}
                  />
                  <span className="font-medium text-slate-600">
                    {d.status}
                  </span>
                  <span className="tnum ml-auto font-semibold text-slate-900">
                    {d.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`col-span-12 xl:col-span-8 ${cardClass}`}>
          <header className={headClass}>
            <h2 className={titleClass}>Weekly applications · last 10 weeks</h2>
          </header>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: tickFill, fontSize: 10, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                  interval={2}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tickFill, fontSize: 10, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: gridStroke }} />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke={lineStroke}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: lineStroke, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50">
      {text}
    </p>
  );
}
