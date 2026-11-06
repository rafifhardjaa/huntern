"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface ResumeLink {
  id: string;
  title: string;
  original_url: string;
  short_code: string;
  created_at: string;
  clicks: number;
}

interface DeviceStat {
  device: string;
  clicks: number;
  fill: string;
}

const inputClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

function DeviceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-lg">
      <p className="tnum text-xs font-semibold text-slate-900">
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  );
}

export function LinksWidget({ userId }: { userId: string | null }) {
  const [links, setLinks] = useState<ResumeLink[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStat[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLinks() {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/links?user_id=${userId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load links");
        if (!cancelled) {
          setLinks(data.links ?? []);
          setDeviceStats(data.stats?.by_device ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load links");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLinks();

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
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, title, original_url: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create link");
      setLinks((prev) => [data, ...prev]);
      setTitle("");
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!userId) return;
    const res = await fetch(`/api/links?id=${id}&user_id=${userId}`, { method: "DELETE" });
    if (res.ok) setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function handleCopy(code: string) {
    const shortUrl = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(shortUrl).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
  const hasDeviceData = deviceStats.some((d) => d.clicks > 0);

  return (
    <section
      aria-label="Resume links"
      className="bg-white rounded-xl border border-slate-200 shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">
          Resume links
        </h2>
        <span className="tnum text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {totalClicks} total clicks
        </span>
      </header>

      <div className="p-4 space-y-4">
        <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-2">
          <label htmlFor="link-title" className="sr-only">Link title</label>
          <input
            id="link-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Portfolio title"
            className={`flex-1 ${inputClass}`}
          />
          <label htmlFor="link-url" className="sr-only">Original URL</label>
          <input
            id="link-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://my-resume.com"
            className={`flex-[2] ${inputClass}`}
          />
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2 px-4 shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Shorten"}
          </button>
        </form>

        {error && (
          <p role="alert" className="text-xs font-medium text-rose-600 rounded-lg bg-rose-50 border border-rose-200 p-2">
            {error}
          </p>
        )}

        {/* Device breakdown analytics */}
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-900">
            Clicks by device
          </p>
          {!hasDeviceData ? (
            <p className="text-xs text-slate-500 mt-1">
              No clicks yet — share a link to see the breakdown.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="h-40 w-full sm:w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<DeviceTooltip />} />
                    <Pie
                      data={deviceStats}
                      dataKey="clicks"
                      nameKey="device"
                      innerRadius={45}
                      outerRadius={65}
                      strokeWidth={0}
                      paddingAngle={2}
                    >
                      {deviceStats.map((entry) => (
                        <Cell key={entry.device} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 w-full space-y-1.5">
                {deviceStats.map((d) => (
                  <li key={d.device} className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: d.fill }}
                    />
                    <span className="font-medium text-slate-600">
                      {d.device}
                    </span>
                    <span className="tnum ml-auto font-semibold text-slate-900">
                      {d.clicks}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-xs font-medium text-slate-500 animate-pulse">Loading links...</p>
        ) : links.length === 0 ? (
          <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50">
            No short links yet — paste your resume URL above.
          </p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm flex flex-wrap items-center gap-2"
              >
                <div className="flex-1 min-w-40">
                  <p className="text-sm font-semibold text-slate-900 truncate">{link.title}</p>
                  <p className="text-xs text-slate-500 truncate">
                    /r/{link.short_code}
                  </p>
                </div>
                <span className="tnum text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {link.clicks} clicks
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(link.short_code)}
                  className="text-xs font-semibold px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {copied === link.short_code ? "Copied!" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(link.id)}
                  aria-label={`Delete ${link.title}`}
                  className="text-xs font-semibold px-2 py-1 rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
