"use client";

import { useEffect, useRef, useState } from "react";
import type { UserResume } from "@/types/database";
import { parseResumeFile } from "@/lib/document-parser";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

export function ResumeManager({ userId }: { userId: string | null }) {
  const [resumes, setResumes] = useState<UserResume[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(() => Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function fetchResumes() {
      try {
        setLoading(true);
        const res = await fetch(`/api/resumes?user_id=${userId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load resumes");
        if (!cancelled) setResumes(data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load resumes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchResumes();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function reload() {
    if (!userId) return;
    const res = await fetch(`/api/resumes?user_id=${userId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load resumes");
    setResumes(data ?? []);
  }

  function resetForm() {
    setSelectedId(null);
    setTitle("");
    setContent("");
    setParseWarning(null);
    setError(null);
    setNotice(null);
  }

  function startEdit(resume: UserResume) {
    setSelectedId(resume.id);
    setTitle(resume.title);
    setContent(resume.content);
    setParseWarning(null);
    setError(null);
    setNotice(null);
  }

  async function handleFile(file: File) {
    setParsing(true);
    setError(null);
    setParseWarning(null);
    try {
      const outcome = await parseResumeFile(file);
      setContent(outcome.text);
      if (!title.trim()) setTitle(file.name.replace(/\.(pdf|docx|txt)$/i, ""));
      setParseWarning(outcome.warning ?? null);
      if (outcome.text.length < 20) {
        setError("Could not read enough text from that file. Paste it manually instead.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!userId) return;
    if (content.trim().length < 20) {
      setError("Resume text needs at least 20 characters");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          id: selectedId ?? undefined,
          title: title.trim() || "My Resume",
          content: content.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save resume");
      setNotice(selectedId ? "Resume updated" : "Resume saved");
      resetForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save resume");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!userId) return;
    setError(null);
    try {
      const res = await fetch(`/api/resumes?id=${id}&user_id=${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete resume");
      if (selectedId === id) resetForm();
      setNotice("Resume deleted");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete resume");
    }
  }

  async function handleMakeDefault(id: string) {
    if (!userId) return;
    const target = resumes.find((r) => r.id === id);
    if (!target) return;
    setError(null);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          id,
          title: target.title,
          content: target.content,
          is_default: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update resume");
      setNotice("Default resume updated");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update resume");
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h2 className="text-base font-semibold text-slate-900">Resume library</h2>
        {resumes.length > 0 && (
          <span className="tnum text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
            {resumes.length} saved
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Save your base resume once. The AI resume tailor uses it as the source for every job, so
        you never paste bullets twice.
      </p>

      {!loading && resumes.length > 0 && (
        <ul className="mb-4 space-y-2">
          {resumes.map((resume) => (
            <li
              key={resume.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{resume.title}</p>
                <p className="tnum text-xs text-slate-500">
                  {resume.content.length.toLocaleString()} characters
                </p>
              </div>
              {resume.is_default ? (
                <span className="tnum text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Default
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleMakeDefault(resume.id)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Make default
                </button>
              )}
              <button
                type="button"
                onClick={() => startEdit(resume)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(resume.id)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">
            {selectedId ? "Edit resume" : "Add a resume"}
          </p>
          {selectedId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          )}
        </div>

        <div>
          <label htmlFor="resume-title" className="block text-sm font-semibold text-slate-700 mb-1">
            Title
          </label>
          <input
            id="resume-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Backend Engineer CV"
            className={inputClass}
          />
        </div>

        <div>
          <span className="block text-sm font-semibold text-slate-700 mb-1">Source</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              id="resume-file"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Parsed in your browser, so the file never leaves your device. Or paste the text below.
          </p>
        </div>

        <div>
          <label htmlFor="resume-content" className="block text-sm font-semibold text-slate-700 mb-1">
            Resume text
          </label>
          <textarea
            id="resume-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Paste your full resume text, or upload a file above..."
            className={`${inputClass} resize-y leading-relaxed font-mono text-xs`}
          />
        </div>

        {parsing && <p className="text-xs font-medium text-slate-500">Reading file...</p>}
        {parseWarning && (
          <p className="text-xs font-medium text-amber-700">{parseWarning}</p>
        )}
        {error && (
          <p role="alert" className="text-xs font-medium text-rose-600">
            {error}
          </p>
        )}
        {notice && <p className="text-xs font-medium text-emerald-700">{notice}</p>}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving || parsing || !userId}>
            {saving ? "Saving..." : selectedId ? "Save changes" : "Save resume"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
