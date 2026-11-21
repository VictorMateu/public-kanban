import { useLocale, useTranslations } from "next-intl";
import type { MouseEventHandler, PointerEventHandler, TouchEventHandler } from "react";
import type { Task } from "../../lib/tasks/queries";
import { formatDueDate } from "../../lib/tasks/due-date";
import styles from "./task-board.module.css";

const priorities = {
  low: "bg-surface-positive",
  medium: "bg-surface-highlight",
  high: "bg-surface-secondary",
};

export type TaskPreview = Pick<Task, "id" | "column_id" | "title" | "description" | "priority" | "due_date" | "completed_on" | "is_hidden">;

export type TaskCardControl = {
  onClick: MouseEventHandler<HTMLButtonElement>;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onTouchStart?: TouchEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

export function TaskMetadata({ task, detail = false }: { task: TaskPreview; detail?: boolean }) {
  const t = useTranslations("Task");
  const locale = useLocale();
  const priority = task.priority ? { color: priorities[task.priority], label: t(task.priority) } : null;
  const dueDate = task.due_date ? formatDueDate(task.due_date, locale) : null;
  const completedOn = detail && task.completed_on ? formatDueDate(task.completed_on, locale) : null;
  if (!(priority || dueDate || completedOn || task.is_hidden)) return null;

  return <dl className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
    {priority && <div className={`rounded-full px-2 py-0.5 ${priority.color}`}><dt className="sr-only">{t("priority")}</dt><dd>{t("priorityValue", { priority: priority.label })}</dd></div>}
    {dueDate && <div className="flex flex-wrap gap-x-1 text-foreground/85"><dt>{t("dueDate")}</dt><dd><time dateTime={task.due_date ?? undefined}>{dueDate}</time></dd></div>}
    {completedOn && <div className="flex flex-wrap gap-x-1 text-foreground/85"><dt>{t("completedOn")}</dt><dd><time dateTime={task.completed_on ?? undefined}>{completedOn}</time></dd></div>}
    {task.is_hidden && <div className="rounded-full bg-surface-warm px-2 py-0.5"><dt className="sr-only">{t("visibility")}</dt><dd>{t("hidden")}</dd></div>}
  </dl>;
}

export function TaskCard({ task, completed, control }: { task: TaskPreview; completed: boolean; control: TaskCardControl }) {
  const titleId = `task-${task.id}`;
  const t = useTranslations("Task");
  return <article aria-labelledby={titleId} className={`${styles.card} relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 rounded-2xl border bg-surface p-3`}>
    <span className={styles.taskMark} data-completed={completed || undefined} aria-hidden="true" />
    <div className="min-w-0">
      <h4 id={titleId} className={`font-sans text-lg font-normal leading-snug wrap-anywhere${completed ? " line-through" : ""}`}>{task.title}</h4>
      <TaskMetadata task={task} />
    </div>
    <button type="button" data-open-task={task.id} data-task-drag={control.onPointerDown ? "" : undefined}
      aria-label={t("openNamed", { title: task.title })} aria-haspopup="dialog"
      className={`${styles.cardControl} absolute inset-0 rounded-2xl ${control.onPointerDown ? "cursor-grab select-none active:cursor-grabbing" : "cursor-pointer"}`}
      {...control} />
  </article>;
}
