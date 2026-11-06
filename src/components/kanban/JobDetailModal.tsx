"use client";

import { useEffect, useRef, useState } from "react";
import type { JobApplication, JobStatus, PrepQuestion, UserResume } from "@/types/database";
import { JOB_STATUSES } from "@/types/database";
import { deadlineUrgency, formatRelativeDeadline } from "@/lib/date-utils";

export interface JobPatch {
  company_name: string;
  position_title: string;
  status: JobStatus;
  job_description: string | null;
  ai_cover_letter: string | null;
  interview_date: string | null;
  deadline: string | null;
  custom_resume_bullets: string | null;
  interview_prep_questions: PrepQuestion[] | null;
  interview_notes: string | null;
}

interface JobDetailModalProps {
  application: JobApplication;
  userId: string | null;
  saving: boolean;
  serverError: string | null;
  onClose: () => void;
  onSave: (id: string, patch: JobPatch) => void;
  onDelete: (id: string) => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

const labelClass =
  "block text-sm font-semibold text-slate-700 mb-1";

const errorClass =
  "mt-1 text-xs font-medium text-rose-600";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function JobDetailModal({
  application,
  userId,
  saving,
  serverError,
  onClose,
  onSave,
  onDelete,
}: JobDetailModalProps) {
  const [company, setCompany] = useState(application.company_name);
  const [position, setPosition] = useState(application.position_title);
  const [status, setStatus] = useState<JobStatus>(application.status);
  const [description, setDescription] = useState(application.job_description ?? "");
  const [interviewDate, setInterviewDate] = useState(() => toLocalInput(application.interview_date));
  const [deadline, setDeadline] = useState(() => toLocalInput(application.deadline));
  const [coverLetter, setCoverLetter] = useState<string | null>(application.ai_cover_letter);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [resumeBullets, setResumeBullets] = useState("");
  const [resumeSource, setResumeSource] = useState<string | null>(null);
  const [tailoredBullets, setTailoredBullets] = useState<string[]>(
    application.custom_resume_bullets
      ? application.custom_resume_bullets.split("\n").filter(Boolean)
      : []
  );
  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [prepQuestions, setPrepQuestions] = useState<PrepQuestion[]>(
    application.interview_prep_questions ?? []
  );
  const [prepGenerating, setPrepGenerating] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [notes, setNotes] = useState(application.interview_notes ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [errors, setErrors] = useState<{ company?: string; position?: string; interviewDate?: string; deadline?: string }>({});
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

  // Prefill the tailor input from the saved resume so the user does not paste
  // the same bullets for every application.
  useEffect(() => {
    if (!userId || resumeBullets.trim()) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/resumes?user_id=${userId}`);
        if (!res.ok) return;
        const rows = (await res.json()) as UserResume[];
        const preferred = rows.find((r) => r.is_default) ?? rows[0];
        if (cancelled || !preferred) return;
        setResumeBullets(preferred.content);
        setResumeSource(preferred.title);
      } catch {
        // Non-critical: the user can still paste manually.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, resumeBullets]);

  async function handleRegenerate() {
    const text = description.trim();
    if (text.length < 20) {
      setAiError("Job description needs min 20 characters to regenerate");
      return;
    }
    setGenerating(true);
    setAiError(null);
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI generation failed");
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

  async function handleTailor() {
    const jd = description.trim() || application.job_description?.trim() || "";
    if (jd.length < 20) {
      setTailorError("Job description needs min 20 characters to tailor against");
      return;
    }
    if (resumeBullets.trim().length < 10) {
      setTailorError("Paste your resume bullets first (min 10 characters)");
      return;
    }
    setTailoring(true);
    setTailorError(null);
    try {
      const res = await fetch("/api/tailor-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd, resumeBullets: resumeBullets.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI tailoring failed");
      setTailoredBullets(data.tailored_bullets ?? []);
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : "AI tailoring failed");
    } finally {
      setTailoring(false);
    }
  }

  async function handleGeneratePrep() {
    const jd = description.trim() || application.job_description?.trim() || "";
    if (jd.length < 20) {
      setPrepError("Add a job description first (min 20 characters)");
      return;
    }
    setPrepGenerating(true);
    setPrepError(null);
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jd,
          positionTitle: position.trim(),
          companyName: company.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI generation failed");
      setPrepQuestions(data.questions ?? []);
    } catch (err) {
      setPrepError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setPrepGenerating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!company.trim()) nextErrors.company = "Company is required";
    if (!position.trim()) nextErrors.position = "Position is required";
    const parsed = interviewDate ? new Date(interviewDate) : null;
    if (interviewDate && (!parsed || Number.isNaN(parsed.getTime()))) {
      nextErrors.interviewDate = "Invalid date and time";
    }
    const parsedDeadline = deadline ? new Date(deadline) : null;
    if (deadline && (!parsedDeadline || Number.isNaN(parsedDeadline.getTime()))) {
      nextErrors.deadline = "Invalid deadline";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave(application.id, {
      company_name: company.trim(),
      position_title: position.trim(),
      status,
      job_description: description.trim() ? description.trim() : null,
      ai_cover_letter: coverLetter,
      interview_date: parsed ? parsed.toISOString() : null,
      deadline: parsedDeadline ? parsedDeadline.toISOString() : null,
      custom_resume_bullets: tailoredBullets.length > 0 ? tailoredBullets.join("\n") : null,
      interview_prep_questions: prepQuestions.length > 0 ? prepQuestions : null,
      interview_notes: notes.trim() ? notes.trim() : null,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${application.position_title} at ${application.company_name}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl">
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Job details</h2>
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
            <div>
              <label htmlFor="detail-company" className={labelClass}>
                Company <span className="text-rose-500">*</span>
              </label>
              <input
                id="detail-company"
                ref={firstFieldRef}
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
              />
              {errors.company && (
                <p role="alert" className={errorClass}>
                  {errors.company}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="detail-position" className={labelClass}>
                Position <span className="text-rose-500">*</span>
              </label>
              <input
                id="detail-position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={inputClass}
              />
              {errors.position && (
                <p role="alert" className={errorClass}>
                  {errors.position}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="detail-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="detail-status"
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
                <label htmlFor="detail-deadline" className={labelClass}>
                  Application deadline
                </label>
                <input
                  id="detail-deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={`tnum ${inputClass}`}
                />
                {errors.deadline && (
                  <p role="alert" className={errorClass}>
                    {errors.deadline}
                  </p>
                )}
                {application.deadline && (
                  <p
                    className={`text-xs font-medium mt-1 ${
                      deadlineUrgency(application.deadline) === 'danger'
                        ? 'text-rose-600'
                        : deadlineUrgency(application.deadline) === 'warning'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {formatRelativeDeadline(application.deadline)}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="detail-interview-date" className={labelClass}>
                  Interview date
                </label>
                <input
                  id="detail-interview-date"
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className={`tnum ${inputClass}`}
                />
                {errors.interviewDate && (
                  <p role="alert" className={errorClass}>
                    {errors.interviewDate}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="detail-description" className={labelClass}>
                Job description
              </label>
              <textarea
                id="detail-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={`${inputClass} resize-y leading-relaxed`}
              />
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={generating || saving}
                className="mt-2 w-full bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg py-2 px-4 border border-indigo-100 hover:bg-indigo-100 active:scale-[0.98] transition disabled:opacity-50"
              >
                {generating ? "Regenerating..." : "Regenerate cover letter"}
              </button>
              {aiError && (
                <p role="alert" className={errorClass}>
                  {aiError}
                </p>
              )}
            </div>

            {coverLetter ? (
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
            ) : (
              <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg p-3 text-center">
                No cover letter yet
              </p>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3">
              <p className="text-sm font-semibold text-slate-900 mb-1">AI resume tailor</p>
              {resumeSource && (
                <p className="text-xs text-slate-500 mb-1">
                  Loaded from saved resume:{" "}
                  <span className="font-semibold text-indigo-600">{resumeSource}</span>
                </p>
              )}
              <label htmlFor="detail-resume" className="sr-only">
                Your current resume bullet points
              </label>
              <textarea
                id="detail-resume"
                value={resumeBullets}
                onChange={(e) => {
                  setResumeBullets(e.target.value);
                  setResumeSource(null);
                }}
                placeholder="Paste your resume bullets here, or save one in Settings..."
                rows={3}
                className={`${inputClass} resize-y`}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleTailor}
                  disabled={tailoring || saving}
                  className="flex-1 min-w-32 bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2 px-4 shadow-sm hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] transition-all duration-200 ease-in-out disabled:opacity-50"
                >
                  {tailoring ? "Tailoring..." : "Tailor my resume"}
                </button>
                {tailoredBullets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTailoredBullets([])}
                    className="bg-white text-slate-700 text-sm font-semibold rounded-lg py-2 px-3 border border-slate-200 shadow-sm hover:bg-slate-50 transition-all duration-200 ease-in-out"
                  >
                    Clear result
                  </button>
                )}
              </div>
              {tailorError && (
                <p role="alert" className={errorClass}>
                  {tailorError}
                </p>
              )}
              {tailoredBullets.length > 0 && (
                <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-slate-700">
                      Tailored bullets — copy into your CV
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(tailoredBullets.map((b) => `• ${b}`).join('\n'))
                          .then(() => setCopied(true))
                          .catch(() => setCopied(false))
                      }
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      {copied ? "Copied!" : "Copy all"}
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {tailoredBullets.map((b, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-2"
                      >
                        • {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-slate-900">AI interview prep</p>
                <span className="tnum text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {prepQuestions.length > 0 ? `${prepQuestions.length} questions` : "not generated"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Behavioural, technical, and culture questions based on this job description.
              </p>
              <button
                type="button"
                onClick={handleGeneratePrep}
                disabled={prepGenerating || saving}
                className="w-full bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg py-2 px-4 border border-indigo-100 hover:bg-indigo-100 active:scale-[0.98] transition disabled:opacity-50"
              >
                {prepGenerating
                  ? "Generating questions..."
                  : prepQuestions.length > 0
                    ? "Regenerate questions"
                    : "Generate interview questions"}
              </button>
              {prepError && (
                <p role="alert" className={errorClass}>
                  {prepError}
                </p>
              )}

              {prepQuestions.length > 0 && (
                <div className="mt-2 space-y-3">
                  {(["behavioral", "technical", "culture"] as const).map((type) => {
                    const group = prepQuestions.filter((q) => q.type === type);
                    if (group.length === 0) return null;
                    return (
                      <div key={type}>
                        <p className="text-xs font-semibold text-slate-700 mb-1 capitalize">
                          {type === "culture" ? "Culture & motivation" : `${type} questions`}
                        </p>
                        <ul className="space-y-1">
                          {group.map((q, i) => (
                            <li
                              key={`${type}-${i}`}
                              className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 leading-relaxed"
                            >
                              <span className="font-semibold text-slate-900">Q. </span>
                              {q.question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}

                  <div>
                    <label htmlFor="detail-interview-notes" className={labelClass}>
                      Interview notes
                    </label>
                    <textarea
                      id="detail-interview-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Questions you were asked, people you met, follow-ups..."
                      className={`${inputClass} resize-y leading-relaxed`}
                    />
                  </div>
                </div>
              )}
            </div>

            <p className="tnum text-[11px] text-slate-500">
              Created {formatDateTime(application.created_at)} — Updated {formatDateTime(application.updated_at)}
            </p>

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
              {saving ? "Saving..." : "Save changes"}
            </button>
            {confirmingDelete ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onDelete(application.id)}
                  className="flex-1 min-w-32 bg-rose-600 text-white text-sm font-semibold rounded-lg py-2 px-4 shadow-sm hover:bg-rose-700 active:scale-[0.98] transition disabled:opacity-50"
                >
                  Confirm delete?
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 min-w-32 bg-white text-slate-700 text-sm font-semibold rounded-lg py-2 px-4 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50"
                >
                  Keep
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmingDelete(true)}
                className="flex-1 min-w-32 bg-white text-rose-600 text-sm font-semibold rounded-lg py-2 px-4 border border-slate-200 shadow-sm hover:bg-rose-50 active:scale-[0.98] transition disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
