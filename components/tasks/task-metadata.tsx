import { useLocale, useTranslations } from "next-intl";
import { formatDueDate } from "../../lib/tasks/due-date";
import type { TaskPreview } from "../../lib/tasks/queries";
import fieldStyles from "./task-fields.module.css";

const priorities = {
  low: "bg-surface-positive",
  medium: "bg-surface-highlight",
  high: "bg-surface-secondary",
};

export function TaskMetadata({ task, detail = false, status }: {
  task: TaskPreview;
  detail?: boolean;
  status?: { label: string; value: string };
}) {
  const t = useTranslations("Task");
  const locale = useLocale();
  const priority = task.priority ? { color: priorities[task.priority], label: t(task.priority) } : null;
  const dueDate = task.due_date ? formatDueDate(task.due_date, locale) : null;
  const completedOn = detail && task.completed_on ? formatDueDate(task.completed_on, locale) : null;
  if (!(status || priority || dueDate || completedOn || task.is_hidden || task.is_system)) return null;

  const badgeClass = detail ? "px-2.5 py-0.5" : "px-2 leading-5";
  return <dl className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${detail ? "" : "mt-1.5"}`}>
    {status && <div className={`rounded-full bg-surface-warm ${badgeClass}`}>
      <dt className="sr-only">{status.label}</dt>
      <dd>{status.value}</dd>
    </div>}
    {priority && <div className={`rounded-full ${badgeClass} ${priority.color}`}>
      <dt className="sr-only">{t("priority")}</dt>
      <dd>{detail ? t("priorityValue", { priority: priority.label }) : priority.label}</dd>
    </div>}
    {dueDate && <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-foreground/85">
      <dt className={detail ? undefined : "sr-only"}>{t("dueDate")}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">
        {!detail && <span aria-hidden="true" className={`${fieldStyles.calendarIcon} shrink-0`} />}
        <time className="wrap-anywhere" dateTime={task.due_date ?? undefined}>{dueDate}</time>
      </dd>
    </div>}
    {task.is_system && <div className={`rounded-full bg-surface-highlight ${badgeClass}`}>
      <dt className="sr-only">{t("kind")}</dt>
      <dd>{t("systemTask")}</dd>
    </div>}
    {task.is_hidden && <div className={`rounded-full bg-surface-warm ${badgeClass}`}>
      <dt className="sr-only">{t("visibility")}</dt>
      <dd>{t("hidden")}</dd>
    </div>}
    {completedOn && <div className="flex flex-wrap gap-x-1 text-foreground/85"><dt>{t("completedOn")}</dt><dd><time dateTime={task.completed_on ?? undefined}>{completedOn}</time></dd></div>}
  </dl>;
}
