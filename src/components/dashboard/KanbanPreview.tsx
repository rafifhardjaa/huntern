import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { JobApplication, JobStatus } from "@/types/database";
import { Column } from "@/components/kanban/Column";
import { JobCard } from "@/components/kanban/JobCard";
import { JOB_STATUSES } from "@/types/database";

interface KanbanPreviewProps {
  applications: JobApplication[];
  onStatusChange: (id: string, status: JobStatus) => void;
  onSelectJob?: (application: JobApplication) => void;
}

export function KanbanPreview({ applications, onStatusChange, onSelectJob }: KanbanPreviewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const grouped = JOB_STATUSES.reduce(
    (acc, status: JobStatus) => {
      acc[status] = applications.filter((app) => app.status === status);
      return acc;
    },
    {} as Record<JobStatus, JobApplication[]>
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const fromStatus = active.data.current?.status as JobStatus | undefined;
    const toStatus = over.id as JobStatus;

    if (!fromStatus || !JOB_STATUSES.includes(toStatus)) return;
    if (fromStatus === toStatus) return;

    onStatusChange(String(active.id), toStatus);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeApp = activeId
    ? applications.find((a) => a.id === activeId) ?? null
    : null;

  return (
    <section
      aria-label="Kanban board"
      className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col"
    >
      <header className="flex items-center justify-between p-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">
          Kanban board
        </h2>
        <span className="tnum text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
          {applications.length} total
        </span>
      </header>
      <div className="p-4 flex-1 min-w-0">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2">
            {JOB_STATUSES.map((status) => (
              <div key={status} className="w-80 min-w-[300px] shrink-0">
                <Column status={status} applications={grouped[status]} onSelectJob={onSelectJob} />
              </div>
            ))}
          </div>
          <DragOverlay>
            {activeApp ? <JobCard application={activeApp} overlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </section>
  );
}
