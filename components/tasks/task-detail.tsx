import { useTranslations } from "next-intl";
import type { KanbanColumn } from "../../lib/columns/queries";
import { RichTextContent } from "../projects/rich-text-content";
import { TaskMetadata, type TaskPreview } from "./task-card";

export function TaskDetail({ task, stage, preview }: { task: TaskPreview; stage: KanbanColumn["stage"] | undefined; preview?: boolean }) {
  const t = useTranslations("Task");
  const board = useTranslations("Board");
  return <div className="space-y-4">
    {stage && <span className="inline-flex rounded-full bg-surface-warm px-3 py-1 text-sm">{board(stage)}</span>}
    {task.description_content ? <RichTextContent document={task.description_content} preview={preview} />
      : <p className="leading-relaxed whitespace-pre-wrap wrap-anywhere">{task.description || t("noDescription")}</p>}
    <TaskMetadata task={task} detail />
  </div>;
}
