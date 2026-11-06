import { useDraggable } from "@dnd-kit/core";
import type { JobApplication, JobStatus } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { deadlineUrgency, formatRelativeDeadline } from "@/lib/date-utils";

interface JobCardProps {
  application: JobApplication;
  overlay?: boolean;
  onSelect?: (application: JobApplication) => void;
}

export function JobCard({ application, overlay = false, onSelect }: JobCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
    data: { status: application.status },
  });

  const showDeadline =
    application.deadline && !['offered', 'rejected'].includes(application.status);

  return (
    <Card
      hoverable={!overlay}
      className={`p-4 touch-none select-none ${isDragging ? "opacity-40" : ""} ${
        overlay ? "shadow-lg" : ""
      }`}
    >
      <div
        ref={overlay ? undefined : setNodeRef}
        {...(overlay ? {} : listeners)}
        {...(overlay ? {} : attributes)}
        role={overlay || !onSelect ? undefined : "button"}
        tabIndex={overlay || !onSelect ? undefined : 0}
        aria-label={`Drag ${application.position_title} at ${application.company_name}. Press Enter to open details.`}
        onClick={overlay || !onSelect ? undefined : () => onSelect(application)}
        onKeyDown={
          overlay || !onSelect
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(application);
                }
              }
        }
        className={overlay ? "" : "cursor-grab active:cursor-grabbing"}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-slate-900 text-sm">
            {application.position_title}
          </h3>
          <Badge tone={application.status}>{application.status}</Badge>
        </div>
        <p className="text-xs text-slate-500 mb-2">{application.company_name}</p>
        {showDeadline && (
          <p className="mb-2">
            <Badge tone={deadlineUrgency(application.deadline!)}>
              {formatRelativeDeadline(application.deadline!)}
            </Badge>
          </p>
        )}
      </div>
      {application.ai_cover_letter ? (
        <p className="text-xs line-clamp-2 text-slate-500">
          {application.ai_cover_letter}
        </p>
      ) : (
        <Badge tone="neutral">No cover letter</Badge>
      )}
    </Card>
  );
}

export type { JobStatus };
