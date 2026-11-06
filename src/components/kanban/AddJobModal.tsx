"use client";

import { useEffect, useRef, useState } from "react";
import type { JobStatus } from "@/types/database";
import { JOB_STATUSES } from "@/types/database";

export interface NewJobInput {
  company_name: string;
  position_title: string;
  status: JobStatus;
  job_description: string | null;
  ai_cover_letter: string | null;
  deadline: string | null;
}

interface AddJobModalProps {
  open: boolean;
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSubmit: (input: NewJobInput) => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

const labelClass =
  "block text-sm font-semibold text-slate-700 mb-1";

const aiButtonClass =
  "mt-2 w-full text-sm font-semibold rounded-lg py-2 px-4 border transition disabled:opacity-50 active:scale-[0.98]";

export function AddJobModal({ open, saving, serverError, onClose, onSubmit }: AddJobModalProps) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState<JobStatus>("wishlist");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [quickPaste, setQuickPaste] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState(false);
  const [errors, setErrors] = useState<{ company?: string; position?: string }>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => firstFieldRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!open) return null;

  async function handleExtract() {
    if (quickPaste.trim().length < 20) {
      setExtractError("Paste raw job text first (min 20 characters)");
      return;
    }
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/extract-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: quickPaste.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI extraction failed");

      if (data.company_name) setCompany(data.company_name);
      if (data.position_title) setPosition(data.position_title);
      if (data.job_description) setDescription(data.job_description);
      setErrors({});
      setExtracted(true);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "AI extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerate() {
    if (description.trim().length < 20) {
      setAiError("Add a job description first (min 20 characters)");
      return;
    }
    setGenerating(true);
    setAiError(null);
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI generation failed");

      if (data.company_name && !company.trim()) setCompany(data.company_name);
      if (data.position_title && !position.trim()) setPosition(data.position_title);
      if (data.cover_letter) {
        setCoverLetter(data.cover_letter);
      } else {
        setAiError("AI returned an empty cover letter, try again");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!company.trim()) nextErrors.company = "Company is required";
    if (!position.trim()) nextErrors.position = "Position is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      company_name: company.trim(),
      position_title: position.trim(),
      status,
      job_description: description.trim() ? description.trim() : null,
      ai_cover_letter: coverLetter,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add job application"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl">
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Add job</h2>
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
            <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3/10">
              <label htmlFor="add-job-quickpaste" className={labelClass}>
                Quick paste
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Dump raw text from LinkedIn or Jobstreet — AI fills the fields below.
              </p>
              <textarea
                id="add-job-quickpaste"
                value={quickPaste}
                onChange={(e) => {
                  setQuickPaste(e.target.value);
                  setExtracted(false);
                }}
                placeholder="Paste raw job posting text here..."
                rows={3}
                className={`${inputClass} resize-y`}
              />
              <button
                type="button"
                onClick={handleExtract}
                disabled={extracting || saving}
                className={`${aiButtonClass} bg-slate-900 text-white border-transparent shadow-sm hover:bg-slate-100`}
              >
                {extracting ? "Extracting..." : extracted ? "Extracted — review below" : "Smart extract"}
              </button>
              {extractError && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600">
                  {extractError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="add-job-company" className={labelClass}>
                Company <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-job-company"
                ref={firstFieldRef}
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corp"
                className={inputClass}
              />
              {errors.company && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600">
                  {errors.company}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="add-job-position" className={labelClass}>
                Position <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-job-position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Frontend intern"
                className={inputClass}
              />
              {errors.position && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600">
                  {errors.position}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="add-job-status" className={labelClass}>
                Status
              </label>
              <select
                id="add-job-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className={inputClass}
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="add-job-deadline" className={labelClass}>
                Application deadline
              </label>
              <input
                id="add-job-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-1">
                Optional. We email you 3 days and 1 day before it closes.
              </p>
            </div>

            <div>
              <label htmlFor="add-job-description" className={labelClass}>
                Job description
              </label>
              <textarea
                id="add-job-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste the job posting here..."
                rows={4}
                className={`${inputClass} resize-y leading-relaxed`}
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || saving}
                className={`${aiButtonClass} bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100`}
              >
                {generating ? "Generating..." : "Generate cover letter with AI"}
              </button>
              {aiError && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-600">
                  {aiError}
                </p>
              )}
            </div>

            {coverLetter && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-slate-900">AI cover letter</p>
                  <button
                    type="button"
                    onClick={() => setCoverLetter(null)}
                    className="text-xs font-medium text-slate-500 underline hover:text-slate-900"
                  >
                    Discard
                  </button>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {coverLetter}
                </p>
              </div>
            )}

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
              {saving ? "Saving..." : "Save job"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 min-w-32 bg-white text-slate-700 text-sm font-semibold rounded-lg py-2 px-4 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
