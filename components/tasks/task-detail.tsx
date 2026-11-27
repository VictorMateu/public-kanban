import { useTranslations } from "next-intl";
import type { KanbanColumn } from "../../lib/columns/queries";
import { RichTextContent } from "../projects/rich-text-content";
import { TaskMetadata, TaskTags, type TaskPreview } from "./task-card";

export function TaskDetail({ task, stage, preview }: { task: TaskPreview; stage: KanbanColumn["stage"] | undefined; preview?: boolean }) {
  const t = useTranslations("Task");
  const management = useTranslations("TaskManagement");
  const board = useTranslations("Board");
  return <div className="space-y-4">
    <TaskMetadata task={task} detail status={stage ? { label: management("stage"), value: board(stage) } : undefined} />
    <TaskTags tags={task.tags} detail />
    {task.description_content ? <RichTextContent document={task.description_content} preview={preview} />
      : <p className="leading-relaxed whitespace-pre-wrap wrap-anywhere">{task.description || t("noDescription")}</p>}
  </div>;
}
