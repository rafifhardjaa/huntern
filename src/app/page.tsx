"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { JobApplication, JobStatus } from "@/types/database";
import { Sidebar, type DashboardView } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { KanbanPreview } from "@/components/dashboard/KanbanPreview";
import { InterviewsCard } from "@/components/dashboard/InterviewsCard";
import { FilterBar, type SortOrder, type StatusFilter } from "@/components/dashboard/FilterBar";
import { isExpiringSoon, deadlineUrgency, formatRelativeDeadline } from "@/lib/date-utils";
import { Analytics } from "@/components/dashboard/Analytics";
import { LinksWidget } from "@/components/dashboard/LinksWidget";
import { PollsView } from "@/components/dashboard/PollsView";
import { DocumentsView } from "@/components/dashboard/DocumentsView";
import { ExpensesView } from "@/components/dashboard/ExpensesView";
import { DevApiSection } from "@/components/dashboard/DevApiSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ResumeManager } from "@/components/settings/ResumeManager";
import { InterviewDateModal } from "@/components/dashboard/InterviewDateModal";
import { AddJobModal, type NewJobInput } from "@/components/kanban/AddJobModal";
import { JobDetailModal, type JobPatch } from "@/components/kanban/JobDetailModal";

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden lg:block w-60 shrink-0 border-r border-slate-200 bg-white" />
      <div className="flex-1 p-4 md:p-6 space-y-4">
        <div className="h-20 rounded-xl bg-white border border-slate-200 animate-pulse" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-8 h-96 rounded-xl bg-white border border-slate-200 animate-pulse" />
          <div className="col-span-12 xl:col-span-4 h-96 rounded-xl bg-white border border-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const VIEW_TITLES: Record<DashboardView, string> = {
  dashboard: "Dashboard",
  applications: "Applications",
  interviews: "Interviews",
  "cover-letters": "Cover letters",
  polls: "Offer polls",
  documents: "Documents",
  expenses: "Expenses",
  settings: "Settings",
};

const VIEW_SUBTITLES: Record<DashboardView, string> = {
  dashboard: "Track every application in one place.",
  applications: "Drag cards between stages.",
  interviews: "Your upcoming interview schedule.",
  "cover-letters": "AI-generated letters for each role.",
  polls: "Let others vote on your offers.",
  documents: "Transcripts, IDs, and certificates.",
  expenses: "Money spent on career growth.",
  settings: "Account and board overview.",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toTitle(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Home() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dndError, setDndError] = useState<string | null>(null);
  const [migrationWarning, setMigrationWarning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState<"auto" | "open" | "closed">("auto");
  const [view, setView] = useState<DashboardView>("dashboard");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pendingInterviewId, setPendingInterviewId] = useState<string | null>(null);
  const [interviewSaving, setInterviewSaving] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          router.push("/login");
          return;
        }

        if (!cancelled) {
          setUserEmail(currentUser.email ?? null);
          setUserId(currentUser.id);
        }

        const { data, error: fetchError } = await supabase
          .from("job_applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        if (!cancelled) setApplications((data ?? []) as JobApplication[]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch applications");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const searchFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(
      (a) =>
        a.company_name.toLowerCase().includes(q) ||
        a.position_title.toLowerCase().includes(q)
    );
  }, [applications, query]);

  const statusCounts = useMemo(() => {
    const counts = { wishlist: 0, applied: 0, interview: 0, offered: 0, rejected: 0 } as Record<JobStatus, number>;
    for (const app of searchFiltered) counts[app.status] += 1;
    return counts;
  }, [searchFiltered]);

  const expiringCount = useMemo(
    () =>
      searchFiltered.filter(
        (a) => isExpiringSoon(a.deadline, 7) && !['offered', 'rejected'].includes(a.status)
      ).length,
    [searchFiltered]
  );

  const filtered = useMemo(() => {
    const list =
      statusFilter === "all"
        ? [...searchFiltered]
        : statusFilter === "expiring"
          ? searchFiltered.filter(
              (a) =>
                isExpiringSoon(a.deadline, 7) && !['offered', 'rejected'].includes(a.status)
            )
          : searchFiltered.filter((a) => a.status === statusFilter);
    if (sort === "oldest") {
      list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    } else if (sort === "az") {
      list.sort((a, b) => a.position_title.localeCompare(b.position_title));
    } else {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return list;
  }, [searchFiltered, statusFilter, sort]);

  const selectedApp = selectedId
    ? applications.find((a) => a.id === selectedId) ?? null
    : null;

  const interviewApps = filtered.filter((a) => a.status === "interview");

  const notifications = useMemo(
    () =>
      [...interviewApps]
        .sort((a, b) => {
          if (a.interview_date && b.interview_date) {
            return a.interview_date.localeCompare(b.interview_date);
          }
          if (a.interview_date) return -1;
          if (b.interview_date) return 1;
          return b.updated_at.localeCompare(a.updated_at);
        })
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          title: `${a.position_title} · ${a.company_name}`,
          subtitle: a.interview_date
            ? new Date(a.interview_date).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "No date set",
        })),
    [interviewApps]
  );
  const letterApps = filtered.filter((a) => a.ai_cover_letter);

  function toggleSidebar() {
    const desktop = window.innerWidth >= 1024;
    setSidebar((prev) => {
      const effectiveOpen = desktop ? prev !== "closed" : prev === "open";
      if (effectiveOpen) return "closed";
      return desktop ? "auto" : "open";
    });
  }

  function handleNavigate(next: DashboardView) {
    setView(next);
    setSidebar((prev) => (prev === "open" ? "closed" : prev));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleAddJob() {
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleCreateJob(input: NewJobInput) {
    setSaving(true);
    setSaveError(null);
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }

        const { data, error: insertError } = await supabase
          .from("job_applications")
          .insert({
            user_id: currentUser.id,
            company_name: input.company_name,
            position_title: input.position_title,
            status: input.status,
            job_description: input.job_description,
            ai_cover_letter: input.ai_cover_letter,
            deadline: input.deadline,
          })
          .select()
          .single();

      if (insertError) throw insertError;
      setApplications((prev) => [data as JobApplication, ...prev]);
      setModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  async function persistJobUpdate(
    id: string,
    patch: Record<string, unknown>
  ): Promise<{ error: string | null; dateSkipped: boolean }> {
    const first = await supabase.from("job_applications").update(patch).eq("id", id);
    if (!first.error) return { error: null, dateSkipped: false };
    if (!/interview_date/i.test(first.error.message)) {
      return { error: first.error.message, dateSkipped: false };
    }
    const rest: Record<string, unknown> = { ...patch };
    delete rest.interview_date;
    const second = await supabase.from("job_applications").update(rest).eq("id", id);
    if (second.error) return { error: second.error.message, dateSkipped: false };
    return { error: null, dateSkipped: true };
  }

  async function handleStatusChange(id: string, status: JobStatus) {
    const previous = applications;
    setDndError(null);
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status } : app))
    );

    const { error: updateError } = await supabase
      .from("job_applications")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      setApplications(previous);
      setDndError(`Move failed: ${updateError.message}`);
    } else if (status === "interview") {
      setInterviewError(null);
      setPendingInterviewId(id);
    }
  }

  async function handleSaveInterviewDate(id: string, interviewDate: string | null) {
    const previous = applications;
    setInterviewSaving(true);
    setInterviewError(null);
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, interview_date: interviewDate } : app))
    );

    const { error: message, dateSkipped } = await persistJobUpdate(id, {
      interview_date: interviewDate,
    });

    setInterviewSaving(false);
    if (message) {
      setApplications(previous);
      setInterviewError(message);
    } else if (dateSkipped) {
      const prevDate = previous.find((a) => a.id === id)?.interview_date ?? null;
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, interview_date: prevDate } : app))
      );
      setMigrationWarning(true);
      setPendingInterviewId(null);
    } else {
      setPendingInterviewId(null);
    }
  }

  function handleSelectJob(app: JobApplication) {
    setDetailError(null);
    setSelectedId(app.id);
  }

  async function handleUpdateJob(id: string, patch: JobPatch) {
    const previous = applications;
    setDetailSaving(true);
    setDetailError(null);
    setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, ...patch } : app)));

    const { error: message, dateSkipped } = await persistJobUpdate(id, { ...patch });

    setDetailSaving(false);
    if (message) {
      setApplications(previous);
      setDetailError(message);
    } else {
      if (dateSkipped) {
        const prevDate = previous.find((a) => a.id === id)?.interview_date ?? null;
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, interview_date: prevDate } : app))
        );
        setMigrationWarning(true);
      }
      setSelectedId(null);
    }
  }

  async function handleDeleteJob(id: string) {
    const previous = applications;
    setDetailSaving(true);
    setDetailError(null);
    setApplications((prev) => prev.filter((app) => app.id !== id));

    const { error: deleteError } = await supabase
      .from("job_applications")
      .delete()
      .eq("id", id);

    setDetailSaving(false);
    if (deleteError) {
      setApplications(previous);
      setDetailError(deleteError.message);
    } else {
      setSelectedId(null);
    }
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center rounded-2xl bg-white border border-slate-200 shadow-xl p-8 max-w-md">
          <p className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</p>
          <p className="text-sm text-rose-600 mb-6">{error}</p>
          <Button variant="dark" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </main>
    );
  }

  const showFilter = view === "dashboard" || view === "applications" || view === "cover-letters";

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-x-clip">
      <Sidebar
        userEmail={userEmail}
        active={view}
        mode={sidebar}
        onClose={() => setSidebar("closed")}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <div
        aria-hidden="true"
        onClick={() => setSidebar("closed")}
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity duration-300 ease-in-out motion-reduce:transition-none lg:hidden ${
          sidebar === "open" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        className={`flex-1 min-w-0 flex flex-col transition-[margin] duration-300 ease-in-out motion-reduce:transition-none ${
          sidebar === "closed" ? "" : "lg:ml-60"
        }`}
      >
        <Header
          query={query}
          onQueryChange={setQuery}
          userEmail={userEmail}
          sidebarOpen={sidebar !== "closed"}
          onToggleSidebar={toggleSidebar}
          onAddJob={handleAddJob}
          notifications={notifications}
          onOpenInterviews={() => setView("interviews")}
        />

        <main className="flex-1 p-4 md:p-6 xl:p-8 space-y-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {VIEW_TITLES[view]}
            </h1>
            <p className="tnum text-sm text-slate-500 mt-1">
              {VIEW_SUBTITLES[view]} · {filtered.length} of {applications.length} applications
            </p>
          </div>

          {dndError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-2"
            >
              <p className="text-sm font-medium text-rose-600">{dndError}</p>
              <button
                type="button"
                onClick={() => setDndError(null)}
                className="text-sm font-medium text-slate-500 underline hover:text-slate-900"
              >
                Dismiss
              </button>
            </div>
          )}

          {migrationWarning && (
            <div
              role="alert"
              className="rounded-xl bg-amber-50 border border-amber-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-2"
            >
              <p className="text-sm font-medium text-amber-800">
                Interview date not saved — missing column. Run this once in Supabase SQL Editor:
                ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS interview_date
                TIMESTAMPTZ NULL;
              </p>
              <button
                type="button"
                onClick={() => setMigrationWarning(false)}
                className="text-sm font-medium text-slate-500 underline hover:text-slate-900"
              >
                Dismiss
              </button>
            </div>
          )}

          {showFilter && (
            <FilterBar
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sort={sort}
              onSortChange={setSort}
              counts={statusCounts}
              total={searchFiltered.length}
              expiringCount={expiringCount}
            />
          )}

          {view === "dashboard" && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <StatsGrid applications={filtered} />
              </div>
              <div className="col-span-12">
                <Analytics applications={filtered} />
              </div>
              <div className="col-span-12">
                <LinksWidget userId={userId} />
              </div>
              <div id="kanban-board" className="col-span-12 xl:col-span-8 scroll-mt-24">
                {filtered.length === 0 ? (
                  <EmptyState
                    title={applications.length > 0 ? "No matches" : "No applications yet"}
                    hint={
                      applications.length > 0
                        ? "Try a different search or filter."
                        : "Add your first job to start tracking."
                    }
                    showAdd={applications.length === 0}
                    onAdd={handleAddJob}
                  />
                ) : (
                  <KanbanPreview
                    applications={filtered}
                    onStatusChange={handleStatusChange}
                    onSelectJob={handleSelectJob}
                  />
                )}
              </div>
              <div className="col-span-12 xl:col-span-4">
                <InterviewsCard applications={filtered} onSelectJob={handleSelectJob} />
              </div>
            </div>
          )}

          {view === "applications" && (
            <div className="grid grid-cols-12 gap-4">
              <div id="kanban-board" className="col-span-12 scroll-mt-24">
                {filtered.length === 0 ? (
                  <EmptyState
                    title={applications.length > 0 ? "No matches" : "No applications yet"}
                    hint={
                      applications.length > 0
                        ? "Try a different search or filter."
                        : "Add your first job to start tracking."
                    }
                    showAdd={applications.length === 0}
                    onAdd={handleAddJob}
                  />
                ) : (
                  <KanbanPreview
                    applications={filtered}
                    onStatusChange={handleStatusChange}
                    onSelectJob={handleSelectJob}
                  />
                )}
              </div>
            </div>
          )}

          {view === "interviews" && (
            <div className="space-y-3">
              {interviewApps.length === 0 ? (
                <EmptyState
                  title="No interviews"
                  hint="Move a card to the Interview column to track it here."
                  showAdd={false}
                  onAdd={handleAddJob}
                />
              ) : (
                interviewApps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleSelectJob(app)}
                    className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition-all duration-200 ease-in-out"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{app.position_title}</h3>
                      <div className="flex items-center gap-1.5">
                        {app.deadline && (
                          <span
                            className={`tnum text-xs font-semibold px-2 py-0.5 rounded-full ${
                              deadlineUrgency(app.deadline) === 'danger'
                                ? 'bg-rose-50 text-rose-700'
                                : deadlineUrgency(app.deadline) === 'warning'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {formatRelativeDeadline(app.deadline)}
                          </span>
                        )}
                        <span className="tnum text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                          {formatDate(app.updated_at)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{app.company_name}</p>
                    {app.job_description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{app.job_description}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {view === "cover-letters" && (
            <div className="space-y-3">
              {letterApps.length === 0 ? (
                <EmptyState
                  title="No cover letters"
                  hint="Generate one with AI from the Add Job modal."
                  showAdd={false}
                  onAdd={handleAddJob}
                />
              ) : (
                letterApps.map((app) => (
                  <Card key={app.id} hoverable className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {app.position_title} · {app.company_name}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {toTitle(app.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {app.ai_cover_letter}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectJob(app)}
                      className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Open details →
                    </button>
                  </Card>
                ))
              )}
            </div>
          )}

          {view === "polls" && (
            <PollsView
              userId={userId}
              offeredJobs={applications.filter((a) => a.status === "offered")}
            />
          )}

          {view === "documents" && <DocumentsView userId={userId} />}

          {view === "expenses" && <ExpensesView userId={userId} />}

          {view === "settings" && (
            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-12 md:col-span-6 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-3">Account</h2>
                <p className="text-sm text-slate-900 break-all">{userEmail ?? "Guest"}</p>
                <p className="tnum text-sm text-slate-500 mt-2">
                  {applications.length} application{applications.length === 1 ? "" : "s"} tracked
                </p>
                <div className="mt-4">
                  <Button variant="dark" onClick={handleLogout}>
                    Log out
                  </Button>
                </div>
              </Card>
              <Card className="col-span-12 md:col-span-6 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-3">Board summary</h2>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusCounts) as JobStatus[]).map((s) => (
                    <span
                      key={s}
                      className="tnum text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                    >
                      {toTitle(s)} · {statusCounts[s]}
                    </span>
                  ))}
                </div>
              </Card>
              <div className="col-span-12">
                <DevApiSection />
              </div>
              <div className="col-span-12">
                <ResumeManager userId={userId} />
              </div>
              <div className="col-span-12">
                <ClipperSetupCard userId={userId} />
              </div>
            </div>
          )}
        </main>
      </div>

      {modalOpen && (
        <AddJobModal
          open={modalOpen}
          saving={saving}
          serverError={saveError}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreateJob}
        />
      )}

      {selectedApp && (
        <JobDetailModal
          key={selectedApp.id}
          application={selectedApp}
          userId={userId}
          saving={detailSaving}
          serverError={detailError}
          onClose={() => setSelectedId(null)}
          onSave={handleUpdateJob}
          onDelete={handleDeleteJob}
        />
      )}

      {pendingInterviewId &&
        (() => {
          const pendingApp = applications.find((a) => a.id === pendingInterviewId);
          return pendingApp ? (
            <InterviewDateModal
              application={pendingApp}
              saving={interviewSaving}
              serverError={interviewError}
              onClose={() => setPendingInterviewId(null)}
              onSave={handleSaveInterviewDate}
            />
          ) : null;
        })()}
    </div>
  );
}

function ClipperSetupCard({ userId }: { userId: string | null }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!userId) return;
    navigator.clipboard.writeText(userId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-1">
        Clipper Setup
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        Paste this User ID once into the Huntern Chrome Extension popup to connect it.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="tnum flex-1 min-w-52 text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 break-all">
          {userId ?? "—"}
        </code>
        <Button variant="secondary" onClick={handleCopy} disabled={!userId}>
          {copied ? "Copied!" : "Copy ID"}
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  hint,
  showAdd,
  onAdd,
}: {
  title: string;
  hint: string;
  showAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-8 text-center h-full">
      <p className="text-lg font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-sm text-slate-500 mb-4">{hint}</p>
      {showAdd && (
        <Button variant="primary" onClick={onAdd}>
          + Add job
        </Button>
      )}
    </div>
  );
}
