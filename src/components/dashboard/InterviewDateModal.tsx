"use client";

import { useEffect, useRef, useState } from "react";
import type { JobApplication } from "@/types/database";

interface InterviewDateModalProps {
  application: JobApplication;
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (id: string, interviewDate: string | null) => void;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewDateModal({
  application,
  saving,
  serverError,
  onClose,
  onSave,
}: InterviewDateModalProps) {
  const [value, setValue] = useState(() => toLocalInput(application.interview_date));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) {
      setError("Pick a date and time, or skip for now");
      return;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      setError("Invalid date and time");
      return;
    }
    onSave(application.id, date.toISOString());
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Schedule interview for ${application.position_title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl">
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Schedule interview
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <p className="text-sm font-semibold text-slate-900">
              {application.position_title} · {application.company_name}
            </p>
            <div>
              <label htmlFor="interview-datetime" className="block text-sm font-semibold text-slate-700 mb-1">
                Date & time
              </label>
              <input
                id="interview-datetime"
                ref={inputRef}
                type="datetime-local"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="tnum w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {error && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600">
                  {error}
                </p>
              )}
            </div>
            {serverError && (
              <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs font-medium text-rose-600">
                {serverError}
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-wrap gap-2 px-6 py-4 border-t border-slate-100 bg-white rounded-b-2xl">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-w-32 bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2 px-4 shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save date"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 min-w-32 bg-white text-slate-700 text-sm font-semibold rounded-lg py-2 px-4 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
