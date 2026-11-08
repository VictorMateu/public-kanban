import { getTranslations } from "next-intl/server";
import { listPublishedColumns } from "../lib/columns/queries";
import { listPublishedTasks } from "../lib/tasks/queries";
import { EmptyState } from "./empty-state";
import { TaskCard } from "./task-card";

export async function ProjectBoard({ projectId }: { projectId: string }) {
  const t = await getTranslations("Board");
  const [columns, tasks] = await Promise.all([
    listPublishedColumns(projectId),
    listPublishedTasks(projectId),
  ]);

  if (!columns.length) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div
      role="region"
      aria-label={t("region")}
      tabIndex={0}
      className="overflow-x-auto rounded-xl pb-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700"
    >
      <div className="grid auto-cols-[minmax(16rem,1fr)] grid-flow-col items-start gap-5">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.column_id === column.id);
          return (
            <section key={column.id} aria-labelledby={`column-${column.id}`} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
              <div className="flex items-start justify-between gap-3 px-1 pt-1 pb-4">
                <h3 id={`column-${column.id}`} className="text-2xl font-semibold wrap-anywhere">{column.name}</h3>
                <span aria-label={t("taskCount", { count: columnTasks.length })} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-sm font-normal text-slate-600">{columnTasks.length}</span>
              </div>
              {columnTasks.length ? (
                <ul className="space-y-3">
                  {columnTasks.map((task) => <li key={task.id}><TaskCard task={task} /></li>)}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">{t("emptyColumn")}</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
