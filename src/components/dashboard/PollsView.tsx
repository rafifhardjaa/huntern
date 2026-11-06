"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { JobApplication } from "@/types/database";

interface PollOption {
  id: string;
  label: string;
  votes: number;
  job_application_id: string | null;
}

interface Poll {
  id: string;
  title: string;
  created_at: string;
  poll_options: PollOption[];
}

const inputClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

export function PollsView({
  userId,
  offeredJobs,
}: {
  userId: string | null;
  offeredJobs: JobApplication[];
}) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPolls() {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/polls?user_id=${userId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load polls");
        if (!cancelled) setPolls(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load polls");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPolls();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Live vote updates on owner's screen
  useEffect(() => {
    if (polls.length === 0) return;
    const channel = supabase
      .channel("owner-polls")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "poll_options" },
        (payload) => {
          const updated = payload.new as { id: string; votes: number };
          setPolls((prev) =>
            prev.map((p) => ({
              ...p,
              poll_options: p.poll_options.map((o) =>
                o.id === updated.id ? { ...o, votes: updated.votes } : o
              ),
            }))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [polls.length]);

  function toggleJob(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const options = selected
        .map((id) => offeredJobs.find((j) => j.id === id))
        .filter((j): j is JobApplication => Boolean(j))
        .map((j) => ({
          job_application_id: j.id,
          label: `${j.position_title} @ ${j.company_name}`,
        }));
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, title, options }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create poll");
      setPolls((prev) => [data, ...prev]);
      setTitle("");
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create poll");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!userId) return;
    const res = await fetch(`/api/polls?id=${id}&user_id=${userId}`, { method: "DELETE" });
    if (res.ok) setPolls((prev) => prev.filter((p) => p.id !== id));
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/poll/${id}`).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="space-y-4">
      <section
        aria-label="Create offer poll"
        className="bg-white rounded-xl border border-slate-200 shadow-sm"
      >
        <header className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Compare offers — new poll
          </h2>
        </header>
        <form onSubmit={handleCreate} className="p-4 space-y-4">
          <div>
            <label htmlFor="poll-title" className="block text-sm font-semibold text-slate-700 mb-1">
              Poll question
            </label>
            <input
              id="poll-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Which offer should I take?"
              className={`w-full ${inputClass}`}
            />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700 mb-1">
              Pick offers (min 2)
            </legend>
            {offeredJobs.length === 0 ? (
              <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50">
                No offered jobs yet — move cards to Offered first.
              </p>
            ) : (
              <div className="space-y-2">
                {offeredJobs.map((job) => (
                  <label
                    key={job.id}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      selected.includes(job.id)
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(job.id)}
                      onChange={() => toggleJob(job.id)}
                      className="h-4 w-4 rounded accent-indigo-600"
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {job.position_title} · {job.company_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="text-xs font-medium text-rose-600 rounded-lg bg-rose-50 border border-rose-200 p-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2 px-4 shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create poll and get share link"}
          </button>
        </form>
      </section>

      {loading ? (
        <p className="text-xs font-medium text-slate-500 animate-pulse">Loading polls...</p>
      ) : (
        polls.map((poll) => {
          const total = poll.poll_options.reduce((s, o) => s + o.votes, 0);
          return (
            <article
              key={poll.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">{poll.title}</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(poll.id)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    {copied === poll.id ? "Copied!" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(poll.id)}
                    aria-label={`Delete poll ${poll.title}`}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </header>
              <div className="p-4 space-y-2">
                <p className="tnum text-xs text-slate-500">
                  /poll/{poll.id.slice(0, 8)}… · {total} votes · live
                </p>
                {poll.poll_options.map((opt) => {
                  const pct = total === 0 ? 0 : Math.round((opt.votes / total) * 100);
                  return (
                    <div key={opt.id} className="rounded-lg border border-slate-200 p-2.5">
                      <div className="flex justify-between gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-slate-900">{opt.label}</span>
                        <span className="tnum text-xs text-slate-500">
                          {opt.votes} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
