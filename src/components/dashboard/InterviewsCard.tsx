import type { JobApplication } from "@/types/database";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface InterviewsCardProps {
  applications: JobApplication[];
  onSelectJob?: (application: JobApplication) => void;
}

export function InterviewsCard({ applications, onSelectJob }: InterviewsCardProps) {
  const interviews = applications
    .filter((a) => a.status === "interview")
    .sort((a, b) => {
      if (a.interview_date && b.interview_date) {
        return a.interview_date.localeCompare(b.interview_date);
      }
      if (a.interview_date) return -1;
      if (b.interview_date) return 1;
      return b.updated_at.localeCompare(a.updated_at);
    })
    .slice(0, 5);

  return (
    <section
      aria-label="Upcoming interviews"
      className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col"
    >
      <header className="p-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">
          Upcoming interviews
        </h2>
        <p className="tnum text-xs text-slate-500 mt-0.5">
          {interviews.length} scheduled
        </p>
      </header>
      <div className="p-4 space-y-3 flex-1">
        {interviews.length === 0 ? (
          <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50">
            No interviews yet — move a card to Interview.
          </p>
        ) : (
          interviews.map((app) => (
            <article
              key={app.id}
              role={onSelectJob ? "button" : undefined}
              tabIndex={onSelectJob ? 0 : undefined}
              onClick={onSelectJob ? () => onSelectJob(app) : undefined}
              onKeyDown={
                onSelectJob
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectJob(app);
                      }
                    }
                  : undefined
              }
              aria-label={onSelectJob ? `Open details for ${app.position_title}` : undefined}
              className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow ${
                onSelectJob ? "cursor-pointer" : ""
              }`}
            >
              <h3 className="font-semibold text-slate-900 text-sm">
                {app.position_title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {app.company_name}
              </p>
              {app.interview_date ? (
                <p className="tnum inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {formatDateTime(app.interview_date)}
                </p>
              ) : (
                <p className="tnum inline-block mt-2 text-xs text-slate-400">
                  No date set — click to add
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
