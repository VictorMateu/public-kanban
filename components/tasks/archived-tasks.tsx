"use client";

import { useId, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { KanbanColumn } from "../../lib/columns/queries";
import type { Task } from "../../lib/tasks/queries";
import { ProjectDialog } from "../projects/project-dialog";
import { TaskDetail } from "./task-detail";

export function ArchivedTasks({ tasks, columns }: { tasks: Task[] | null; columns: KanbanColumn[] }) {
  const t = useTranslations("TaskManagement");
  const format = useFormatter();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return <>
    <button ref={trigger} type="button" data-open-archive="" aria-haspopup="dialog" aria-controls={id} aria-expanded={open}
      className="project-secondary-action" onClick={() => setOpen(true)}>{t("archivedTasks")}</button>
    <ProjectDialog id={id} title={t("archivedTasks")} closeLabel={t("close")} open={open} triggerRef={trigger} onClose={() => setOpen(false)}>
      {tasks === null ? <p role="status">{t("archiveUnavailable")}</p> : tasks.length === 0 ? <p>{t("archiveEmpty")}</p> : (
        <ul className="space-y-2">
          {tasks.map((task) => <li key={task.id}>
            <details className="rounded-2xl border border-border/20 bg-surface-warm/40">
              <summary className="min-h-11 cursor-pointer rounded-2xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-focus">
                <span className="wrap-anywhere">{task.title}</span>
                {task.archived_at && <span className="mt-1 block text-sm text-foreground/80">
                  {t("archivedOn")} <time dateTime={task.archived_at}>{format.dateTime(new Date(task.archived_at), { dateStyle: "medium", timeZone: "UTC" })}</time>
                </span>}
              </summary>
              <div className="min-w-0 border-t border-border/15 px-4 py-3">
                <TaskDetail task={task} stage={columns.find(({ id }) => id === task.column_id)?.stage} preview />
              </div>
            </details>
          </li>)}
        </ul>
      )}
    </ProjectDialog>
  </>;
}
