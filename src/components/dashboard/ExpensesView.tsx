"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


interface Expense {
  id: string;
  title: string;
  amount_cents: number;
  category: string;
  spent_on: string;
  created_at: string;
}

const CATEGORIES = ["subscriptions", "courses", "transport", "meals", "other"] as const;

const CATEGORY_FILL: Record<string, string> = {
  subscriptions: "#4F46E5",
  courses: "#10B981",
  transport: "#F59E0B",
  meals: "#F43F5E",
  other: "#94A3B8",
};

function toTitle(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
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
  const raw = Number(p.value ?? 0);
  const title = label ?? p.name ?? "";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-lg">
      <p className="tnum text-xs font-semibold text-slate-900">
        {title}: {money(raw)}
      </p>
    </div>
  );
}

// Monday of the week containing `d`
function weekStart(d: Date): Date {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const inputClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

export function ExpensesView({ userId }: { userId: string | null }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("subscriptions");
  const [spentOn, setSpentOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchExpenses() {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/expenses?user_id=${userId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load expenses");
        if (!cancelled) setExpenses(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load expenses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchExpenses();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title,
          amount: Number(amount),
          category,
          spent_on: spentOn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add expense");
      setExpenses((prev) => [data, ...prev].sort((a, b) => b.spent_on.localeCompare(a.spent_on)));
      setTitle("");
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!userId) return;
    const res = await fetch(`/api/expenses?id=${id}&user_id=${userId}`, { method: "DELETE" });
    if (res.ok) setExpenses((prev) => prev.filter((x) => x.id !== id));
  }

  const byCategory = useMemo(() => {
    return CATEGORIES.map((c) => ({
      category: toTitle(c),
      total: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount_cents, 0),
      fill: CATEGORY_FILL[c],
    })).filter((x) => x.total > 0);
  }, [expenses]);

  const weekly = useMemo(() => {
    const buckets: { week: string; total: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const start = weekStart(new Date(now.getTime() - i * 7 * 24 * 3600 * 1000));
      const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
      const total = expenses
        .filter((e) => {
          const d = new Date(e.spent_on);
          return d >= start && d < end;
        })
        .reduce((s, e) => s + e.amount_cents, 0);
      buckets.push({
        week: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        total: Math.round((total / 100) * 100) / 100,
      });
    }
    return buckets;
  }, [expenses]);

  const grandTotal = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const gridStroke = "#E5E7EB";
  const tickFill = "#6B7280";

  return (
    <div className="space-y-4">
      <section
        aria-label="Add expense"
        className="bg-white rounded-xl border border-slate-200 shadow-sm"
      >
        <header className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Track spending
          </h2>
        </header>
        <form onSubmit={handleCreate} className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          <label className="sr-only" htmlFor="exp-title">Title</label>
          <input
            id="exp-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="LinkedIn Premium"
            className={`sm:col-span-2 ${inputClass}`}
          />
          <label className="sr-only" htmlFor="exp-amount">Amount (USD)</label>
          <input
            id="exp-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="29.99"
            className={`tnum ${inputClass}`}
          />
          <label className="sr-only" htmlFor="exp-category">Category</label>
          <select
            id="exp-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{toTitle(c)}</option>
            ))}
          </select>
          <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
            <label className="sr-only" htmlFor="exp-date">Date</label>
            <input
              id="exp-date"
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              className={`tnum flex-1 min-w-0 ${inputClass}`}
            />
            <button
              type="submit"
              disabled={saving}
              className="shrink-0 bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2 px-4 shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
            >
              {saving ? "..." : "Add"}
            </button>
          </div>
        </form>
        {error && (
          <p role="alert" className="mx-4 mb-4 text-xs font-medium text-rose-600 rounded-lg bg-rose-50 border border-rose-200 p-2">
            {error}
          </p>
        )}
      </section>

      <section aria-label="Expense analytics" className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <header className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              By category
            </h2>
          </header>
          <div className="p-4 h-64">
            {byCategory.length === 0 ? (
              <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50">
                No expenses yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Pie
                    data={byCategory}
                    dataKey="total"
                    nameKey="category"
                    innerRadius={50}
                    outerRadius={80}
                    strokeWidth={0}
                    paddingAngle={2}
                  >
                    {byCategory.map((entry) => (
                      <Cell key={entry.category} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {byCategory.length > 0 && (
            <ul className="px-4 pb-4 space-y-1.5">
              {byCategory.map((c) => (
                <li key={c.category} className="flex items-center gap-2 text-xs">
                  <span aria-hidden="true" className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: c.fill }} />
                  <span className="font-medium text-slate-600">{c.category}</span>
                  <span className="tnum ml-auto font-semibold text-slate-900">{money(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="col-span-12 xl:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm">
          <header className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Weekly trend · last 8 weeks
            </h2>
            <span className="tnum text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              Total {money(grandTotal)}
            </span>
          </header>
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: tickFill, fontSize: 10, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                  interval={1}
                />
                <YAxis
                  tick={{ fill: tickFill, fontSize: 10, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F1F5F9" }} />
                <Bar dataKey="total" fill="#4F46E5" radius={[6, 6, 0, 0]} strokeWidth={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section
        aria-label="Expense history"
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                {["Title", "Category", "Date", "Amount", ""].map((h) => (
                  <th key={h} className="text-xs font-semibold text-slate-500 px-3 py-2 border-b border-slate-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-xs text-slate-500 animate-pulse">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-xs text-slate-500 text-center">
                    No expenses yet — log your first one above.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <td className="text-sm font-medium text-slate-900 px-3 py-2.5 break-all">
                      {e.title}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {toTitle(e.category)}
                      </span>
                    </td>
                    <td className="tnum text-xs text-slate-500 px-3 py-2.5 whitespace-nowrap">
                      {e.spent_on}
                    </td>
                    <td className="tnum text-sm font-semibold text-slate-900 px-3 py-2.5 whitespace-nowrap">
                      {money(e.amount_cents)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id)}
                        aria-label={`Delete ${e.title}`}
                        className="text-xs font-semibold px-2.5 py-1 rounded-md text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
