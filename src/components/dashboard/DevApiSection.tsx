"use client";

import { useState } from "react";

const DEFAULT_TEMPLATE = `{
  "id": "$id",
  "company": "$company",
  "role": "$position",
  "stage": "$status",
  "headline": "$position at $company",
  "applied_at": "$date"
}`;

export function DevApiSection() {
  const [count, setCount] = useState(5);
  const [seed, setSeed] = useState(42);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [mocking, setMocking] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  const endpoint = `/api/dev/jobs?count=${count}&seed=${seed}`;

  async function handleTry() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setPreview(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleMock() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(template);
    } catch {
      setMockError("Template is not valid JSON");
      return;
    }
    setMocking(true);
    setMockError(null);
    try {
      const res = await fetch("/api/dev/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: parsed, count, seed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mock request failed");
      setPreview(JSON.stringify(data, null, 2));
    } catch (err) {
      setMockError(err instanceof Error ? err.message : "Mock request failed");
    } finally {
      setMocking(false);
    }
  }

  function handleCopy() {
    const url = `${window.location.origin}${endpoint}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-1">
        Developer API
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Mock endpoint returning deterministic fake job cards — handy for testing parsers.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <code className="tnum flex-1 min-w-52 text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700">
          GET {endpoint}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {copied ? "Copied!" : "Copy URL"}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div>
          <label htmlFor="dev-count" className="block text-xs font-semibold text-slate-500 mb-1">
            Count (1–25)
          </label>
          <input
            id="dev-count"
            type="number"
            min={1}
            max={25}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="tnum w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="dev-seed" className="block text-xs font-semibold text-slate-500 mb-1">
            Seed
          </label>
          <input
            id="dev-seed"
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            className="tnum w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={handleTry}
          disabled={loading}
          className="bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2 px-4 shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
        >
          {loading ? "Fetching..." : "Try it"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-xs font-medium text-rose-600 rounded-lg bg-rose-50 border border-rose-200 p-2">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950">
          <p className="text-xs font-semibold text-slate-200">
            Mock console — POST /api/dev/jobs
          </p>
          <p className="tnum text-[11px] text-slate-400">
            $id $company $position $status $description $letter $date
          </p>
        </div>
        <label htmlFor="dev-template" className="sr-only">
          Response template JSON
        </label>
        <textarea
          id="dev-template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={9}
          spellCheck={false}
          className="tnum w-full bg-slate-950 text-slate-100 text-[11px] leading-relaxed p-3 font-mono focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 resize-y"
        />
        <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleMock}
            disabled={mocking}
            className="bg-indigo-600 text-white text-xs font-semibold rounded-lg py-1.5 px-3 hover:bg-indigo-500 active:scale-[0.98] transition disabled:opacity-50"
          >
            {mocking ? "Mocking..." : "Run mock → preview"}
          </button>
          {mockError && (
            <p role="alert" className="text-[11px] font-medium text-rose-400">
              {mockError}
            </p>
          )}
        </div>
      </div>

      {preview && (
        <pre className="tnum text-[11px] leading-relaxed bg-slate-950 text-slate-100 rounded-lg p-3 overflow-auto max-h-64bg-black">
          {preview}
        </pre>
      )}
    </div>
  );
}
