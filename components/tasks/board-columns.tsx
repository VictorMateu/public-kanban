import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { KanbanColumn } from "../../lib/columns/queries";
import type { Task } from "../../lib/tasks/queries";
import { EmptyState } from "../shared/empty-state";
import { TaskCard } from "./task-card";
import styles from "./task-board.module.css";

export type DropTarget = { columnId: string; beforeId: string | null };

export function BoardColumns({ columns, tasks, renderActions, renderAddTask, dropTarget }: {
  columns: KanbanColumn[];
  tasks: Task[];
  renderActions?: (task: Task, index: number, columnTasks: Task[]) => ReactNode;
  renderAddTask?: (column: KanbanColumn) => ReactNode;
  dropTarget?: DropTarget | null;
}) {
  const t = useTranslations("Board");
  if (columns.length === 0) return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;

  return (
    <div data-task-scroll="" role="region" aria-label={t("region")} tabIndex={0}
      className="overflow-x-auto rounded-2xl pb-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus">
      <div className="grid auto-cols-[minmax(14rem,1fr)] grid-flow-col gap-4">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.column_id === column.id);
          const active = dropTarget?.columnId === column.id;
          return (
            <section key={column.id} data-board-column={column.id} data-stage={column.stage} aria-labelledby={`column-${column.id}`}
              className={`${styles.column} min-h-60 min-w-0 rounded-3xl border`}>
              <header className={`${styles.columnHeader} flex min-h-14 items-center gap-2 rounded-t-3xl px-3 py-2`}>
                <span aria-hidden="true" className={styles.stageMark} />
                <h3 id={`column-${column.id}`} className="min-w-0 grow text-2xl wrap-anywhere">{t(column.stage)}</h3>
                <span className={`${styles.taskCount} grid min-w-7 shrink-0 place-items-center rounded-full px-1.5 text-sm`}>
                  <span className="sr-only">{t("taskCount", { count: columnTasks.length })}</span>
                  <span aria-hidden="true">{columnTasks.length}</span>
                </span>
              </header>
              <div className="grid gap-2.5 p-2.5">
                {columnTasks.length ? (
                  <ul className="space-y-2.5">
                    {columnTasks.map((task, index) => (
                      <li key={task.id} data-board-task={task.id}
                        data-drop-before={active && dropTarget.beforeId === task.id || undefined}
                        className="relative data-[drop-before]:before:absolute data-[drop-before]:before:inset-x-0 data-[drop-before]:before:-top-1.5 data-[drop-before]:before:h-1 data-[drop-before]:before:rounded data-[drop-before]:before:bg-focus">
                        <TaskCard task={task} completed={column.stage === "done"} actions={renderActions?.(task, index, columnTasks)} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="rounded-xl border border-dashed border-border/25 bg-surface/55 px-3 py-2 text-sm">{t("emptyColumn")}</p>}
                {active && dropTarget.beforeId === null && <div data-drop-end="" aria-hidden="true" className="h-1 rounded bg-focus" />}
                {renderAddTask?.(column)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
