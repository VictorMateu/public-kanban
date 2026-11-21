import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { KanbanColumn } from "../../lib/columns/queries";
import type { Task } from "../../lib/tasks/queries";
import { EmptyState } from "../shared/empty-state";
import { TaskCard } from "./task-card";

export type DropTarget = { columnId: string; beforeId: string | null };

export function BoardColumns({ columns, tasks, renderActions, dropTarget }: {
  columns: KanbanColumn[];
  tasks: Task[];
  renderActions?: (task: Task, index: number, columnTasks: Task[]) => ReactNode;
  dropTarget?: DropTarget | null;
}) {
  const t = useTranslations("Board");
  if (columns.length === 0) return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;

  return (
    <div data-task-scroll="" role="region" aria-label={t("region")} tabIndex={0}
      className="overflow-x-auto rounded-xl pb-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      <div className="grid auto-cols-[minmax(16rem,1fr)] grid-flow-col gap-5">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.column_id === column.id);
          const active = dropTarget?.columnId === column.id;
          return (
            <section key={column.id} data-board-column={column.id} aria-labelledby={`column-${column.id}`}
              className="min-w-0 rounded-2xl border border-border/25 bg-surface-warm/50 p-3">
              <div className="flex items-start justify-between gap-3 px-1 pb-4">
                <h3 id={`column-${column.id}`} className="text-2xl wrap-anywhere">{t(column.stage)}</h3>
                <span aria-label={t("taskCount", { count: columnTasks.length })} className="rounded-md border border-border/20 bg-surface px-2 py-0.5 text-sm">{columnTasks.length}</span>
              </div>
              {columnTasks.length ? (
                <ul className="space-y-3">
                  {columnTasks.map((task, index) => (
                    <li key={task.id} data-board-task={task.id}
                      data-drop-before={active && dropTarget.beforeId === task.id || undefined}
                      className="relative data-[drop-before]:before:absolute data-[drop-before]:before:inset-x-0 data-[drop-before]:before:-top-1.5 data-[drop-before]:before:h-1 data-[drop-before]:before:rounded data-[drop-before]:before:bg-focus">
                      <TaskCard task={task} actions={renderActions?.(task, index, columnTasks)} />
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-xl border border-dashed border-border/30 bg-surface/70 p-4 text-sm">{t("emptyColumn")}</p>}
              {active && dropTarget.beforeId === null && <div data-drop-end="" aria-hidden="true" className="mt-2 h-1 rounded bg-focus" />}
            </section>
          );
        })}
      </div>
    </div>
  );
}
