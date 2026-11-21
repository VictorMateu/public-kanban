import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { Task } from "../../lib/tasks/queries";
import { formatDueDate } from "../../lib/tasks/due-date";
import styles from "./task-board.module.css";

const priorities = {
  low: "bg-surface-positive",
  medium: "bg-surface-highlight",
  high: "bg-surface-secondary",
};

export function TaskCard({ task, completed, actions }: { task: Task; completed: boolean; actions?: ReactNode }) {
  const t = useTranslations("Task");
  const locale = useLocale();
  const priority = task.priority ? { color: priorities[task.priority], label: t(task.priority) } : null;
  const dueDate = task.due_date ? formatDueDate(task.due_date, locale) : null;
  const completedOn = task.completed_on ? formatDueDate(task.completed_on, locale) : null;

  return (
    <article aria-labelledby={`task-${task.id}`} className={`${styles.card} grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 rounded-2xl border bg-surface p-3`}>
      <span className={styles.taskMark} data-completed={completed || undefined} aria-hidden="true" />
      <div className="min-w-0">
        <h4 id={`task-${task.id}`} className={`font-sans text-lg font-normal leading-snug wrap-anywhere${completed ? " line-through" : ""}`}>{task.title}</h4>
        {task.description && <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/85 wrap-anywhere">{task.description}</p>}
        {(priority || dueDate || completedOn) && (
          <dl className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
            {priority && <div className={`rounded-full px-2 py-0.5 font-normal ${priority.color}`}><dt className="sr-only">{t("priority")}</dt><dd>{t("priorityValue", { priority: priority.label })}</dd></div>}
            {dueDate && <div className="flex flex-wrap gap-x-1 text-foreground/85"><dt>{t("dueDate")}</dt><dd><time dateTime={task.due_date ?? undefined}>{dueDate}</time></dd></div>}
            {completedOn && <div className="flex flex-wrap gap-x-1 text-foreground/85"><dt>{t("completedOn")}</dt><dd><time dateTime={task.completed_on ?? undefined}>{completedOn}</time></dd></div>}
          </dl>
        )}
      </div>
      {actions && <div className="col-span-full mt-2 border-t border-border/10 pt-1">{actions}</div>}
    </article>
  );
}
