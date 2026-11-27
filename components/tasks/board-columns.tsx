import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import type { KanbanColumn } from "../../lib/columns/queries";
import type { TaskPreview } from "../../lib/tasks/queries";
import { EmptyState } from "../shared/empty-state";
import { TaskCard, type TaskCardControl } from "./task-card";
import styles from "./task-board.module.css";

const stageIcons = {
  todo: <>
    <rect x="8" y="3" width="8" height="4" rx="1.4" />
    <path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5v13A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 5H16M7.5 11h.1m3 0h6m-9.1 3.5h.1m3 0h6m-9.1 3.5h.1m3 0h6" />
  </>,
  in_progress: <path d="M5 3h14M5 21h14M7 3v3c0 3 2.5 4.5 5 6-2.5 1.5-5 3-5 6v3m10-18v3c0 3-2.5 4.5-5 6 2.5 1.5 5 3 5 6v3M8 19l4-3 4 3" />,
  review: <>
    <path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l4 4v2m-4-6v4h4M6.5 10.5h4m-4 4h2.5m-2.5 4h2" />
    <circle cx="16" cy="15" r="4" />
    <path d="m19 18 3 3" />
  </>,
  done: <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.7 2.7L16 9.5" />
  </>,
} satisfies Record<KanbanColumn["stage"], ReactNode>;

export type DropTarget = { columnId: string; beforeId: string | null };

export function BoardColumns<T extends TaskPreview>({ columns, tasks, cardControl, renderAddTask, dropTarget, draggedTaskId }: {
  columns: KanbanColumn[];
  tasks: T[];
  cardControl: (task: T) => TaskCardControl;
  draggedTaskId?: string;
  renderAddTask?: (column: KanbanColumn) => ReactNode;
  dropTarget?: DropTarget | null;
}) {
  const t = useTranslations("Board");
  const [expandedColumns, setExpandedColumns] = useState(() => {
    const first = columns.find(({ id }) => tasks.some(({ column_id }) => column_id === id)) ?? columns[0];
    return new Set(first ? [first.id] : []);
  });

  function toggleColumn(id: string) {
    setExpandedColumns((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (columns.length === 0) return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;

  return (
    <div data-task-scroll="" role="region" aria-label={t("region")} tabIndex={0}
      className={`${styles.boardScroll} min-h-0 flex-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus`}>
      <div className={`${styles.columns} grid gap-4`}>
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.column_id === column.id);
          const active = dropTarget?.columnId === column.id;
          const expanded = expandedColumns.has(column.id);
          const headingId = `column-${column.id}`;
          const countId = `${headingId}-count`;
          const listId = `${headingId}-tasks`;
          return (
            <section key={column.id} data-board-column={column.id} data-stage={column.stage} data-expanded={expanded} aria-labelledby={headingId}
              className={`${styles.column} min-w-0 rounded-3xl border`}>
              <header className={`${styles.columnHeader} relative flex min-h-14 items-center gap-2 rounded-t-3xl px-3 py-2`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true" focusable="false" className="size-6 shrink-0">
                  {stageIcons[column.stage]}
                </svg>
                <h3 id={headingId} className="min-w-0 grow text-2xl wrap-anywhere">{t(column.stage)}</h3>
                <span className={`${styles.taskCount} relative grid min-w-7 shrink-0 place-items-center rounded-full px-1.5 text-sm`}>
                  <span id={countId} className="sr-only">{t("taskCount", { count: columnTasks.length })}</span>
                  <span aria-hidden="true">{columnTasks.length}</span>
                </span>
                <button type="button" data-column-toggle="" aria-labelledby={`${headingId} ${countId}`} aria-expanded={expanded}
                  aria-controls={listId} onClick={() => toggleColumn(column.id)}
                  className={`${styles.columnToggle} absolute inset-0 items-center justify-end rounded-3xl px-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true" focusable="false" className="size-5">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </header>
              <div id={listId} data-column-scroll="" role="region" aria-label={t("columnTasks", { column: t(column.stage) })}
                tabIndex={0} className={`${styles.columnScroll} min-h-0 p-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus`}>
                {columnTasks.length ? (
                  <ul className="space-y-2.5">
                    {columnTasks.map((task) => (
                      <li key={task.id} data-board-task={task.id}
                        data-dragging={draggedTaskId === task.id || undefined}
                        data-drop-before={active && dropTarget.beforeId === task.id || undefined}
                        className="relative data-[dragging]:opacity-45 data-[drop-before]:before:absolute data-[drop-before]:before:inset-x-0 data-[drop-before]:before:-top-1.5 data-[drop-before]:before:h-1 data-[drop-before]:before:rounded data-[drop-before]:before:bg-focus">
                        <TaskCard task={task} completed={column.stage === "done"} control={cardControl(task)} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="rounded-xl border border-dashed border-border/25 bg-surface/55 px-3 py-2 text-sm">{t("emptyColumn")}</p>}
                {active && dropTarget.beforeId === null && <div data-drop-end="" aria-hidden="true" className="mt-1.5 h-1 rounded bg-focus" />}
                {renderAddTask && <div className="mt-2.5">{renderAddTask(column)}</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
