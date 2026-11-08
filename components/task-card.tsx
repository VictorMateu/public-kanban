import { useLocale, useTranslations } from "next-intl";
import type { Task } from "../lib/tasks/queries";
import { formatDueDate } from "../lib/tasks/due-date";

const priorities = {
  low: { color: "border-slate-200 bg-slate-50 text-slate-700" },
  medium: { color: "border-amber-200 bg-amber-50 text-amber-900" },
  high: { color: "border-rose-200 bg-rose-50 text-rose-800" },
};

export function TaskCard({ task }: { task: Task }) {
  const t = useTranslations("Task");
  const locale = useLocale();
  const priority = task.priority ? { ...priorities[task.priority], label: t(task.priority) } : null;
  const dueDate = task.due_date ? formatDueDate(task.due_date, locale) : null;

  return (
    <article aria-labelledby={`task-${task.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 id={`task-${task.id}`} className="font-sans text-lg font-normal leading-snug wrap-anywhere">{task.title}</h4>
      {task.description && <p className="mt-3 text-base leading-relaxed whitespace-pre-wrap text-slate-600 wrap-anywhere">{task.description}</p>}
      {(priority || dueDate) && (
        <dl className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {priority && <div className={`rounded-full border px-2.5 py-1 font-normal ${priority.color}`}><dt className="sr-only">{t("priority")}</dt><dd>{t("priorityValue", { priority: priority.label })}</dd></div>}
          {dueDate && <div className="flex gap-1 text-slate-600"><dt>{t("dueDate")}</dt><dd><time dateTime={task.due_date ?? undefined}>{dueDate}</time></dd></div>}
        </dl>
      )}
    </article>
  );
}
