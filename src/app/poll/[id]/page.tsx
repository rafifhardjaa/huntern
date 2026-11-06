"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface Poll {
  id: string;
  title: string;
  poll_options: PollOption[];
}

export default function GuestPollPage({ params }: { params: Promise<{ id: string }> }) {
  const [pollId, setPollId] = useState<string | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    params.then((p) => setPollId(p.id));
  }, [params]);

  useEffect(() => {
    if (!pollId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from("offer_polls")
          .select("id, title, poll_options(id, label, votes)")
          .eq("id", pollId)
          .single();
        if (err) throw err;
        if (!data) throw new Error("Poll not found");
        setPoll(data as Poll);
        try {
          setVoted(localStorage.getItem(`huntern-vote-${pollId}`) === "1");
        } catch {
          /* ignore */
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load poll");
      } finally {
        setLoading(false);
      }
    }

    load();

    channel = supabase
      .channel(`poll-${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "poll_options",
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; votes: number };
          setPoll((prev) =>
            prev
              ? {
                  ...prev,
                  poll_options: prev.poll_options.map((o) =>
                    o.id === updated.id ? { ...o, votes: updated.votes } : o
                  ),
                }
              : prev
          );
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [pollId]);

  async function handleVote(optionId: string) {
    if (!pollId || voted || voting) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vote failed");
      setVoted(true);
      try {
        localStorage.setItem(`huntern-vote-${pollId}`, "1");
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(false);
    }
  }

  const total = (poll?.poll_options ?? []).reduce((s, o) => s + o.votes, 0);

  return (
    <main className="w-full min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-xl font-bold tracking-tight text-slate-900">Huntern</p>
          <p className="text-xs text-slate-500">Offer poll · live results</p>
        </div>

        {loading ? (
          <p className="text-sm font-medium text-slate-500 animate-pulse text-center">
            Loading poll...
          </p>
        ) : error || !poll ? (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xl p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">{error ?? "Poll not found"}</p>
          </div>
        ) : (
          <section
            aria-label={poll.title}
            className="bg-white rounded-xl border border-slate-200 shadow-sm"
          >
            <header className="px-4 py-3 border-b border-slate-100">
              <h1 className="text-lg font-semibold text-slate-900">{poll.title}</h1>
              <p className="tnum text-xs text-slate-500 mt-0.5">
                {total} votes {voted ? "· thanks for voting!" : "· tap to vote"}
              </p>
            </header>
            <div className="p-4 space-y-2">
              {poll.poll_options.map((opt) => {
                const pct = total === 0 ? 0 : Math.round((opt.votes / total) * 100);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={voted || voting}
                    onClick={() => handleVote(opt.id)}
                    className="w-full text-left rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition disabled:pointer-events-nonehover:border-slate-600"
                  >
                    <div className="flex justify-between gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
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
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
