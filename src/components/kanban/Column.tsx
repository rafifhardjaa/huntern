import { useDroppable } from "@dnd-kit/core";
import type { JobApplication } from "@/types/database";
import { JobCard } from "@/components/kanban/JobCard";

const EMPTY_MESSAGES: Record<string, string> = {
  wishlist: "No wishes yet — dream big!",
  applied: "Nothing applied — shoot your shot!",
  interview: "No interviews yet — keep going!",
  offered: "No offers yet — keep going!",
  rejected: "No rejections — stay sharp!",
};

function toTitleCase(s: string): string {
  return s
    .split(/[\s_]+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface ColumnProps {
  status: string;
  applications: JobApplication[];
  onSelectJob?: (application: JobApplication) => void;
}

export function Column({ status, applications, onSelectJob }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      aria-label={`${toTitleCase(status)} column`}
      className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 flex flex-col"
    >
      <header className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-slate-900">
          {toTitleCase(status)}
        </h2>
        <span className="tnum text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          {applications.length}
        </span>
      </header>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-24 p-1 rounded-lg transition-all duration-200 ease-in-out ${
          isOver ? "bg-indigo-50 ring-2 ring-indigo-200" : ""
        }`}
      >
        {applications.length === 0 ? (
          <p className="text-xs font-medium text-slate-500 border border-dashed border-slate-300 rounded-lg p-4 text-center bg-white">
            {isOver ? "Drop here" : (EMPTY_MESSAGES[status] ?? "No jobs yet.")}
          </p>
        ) : (
          applications.map((app) => (
            <JobCard key={app.id} application={app} onSelect={onSelectJob} />
          ))
        )}
      </div>
    </section>
  );
}
