"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { KanbanColumn } from "../../lib/columns/queries";
import { commentCountSchema } from "../../lib/tasks/comment-schemas";
import type { TaskPreview } from "../../lib/tasks/queries";
import { RichTextContent } from "../projects/rich-text-content";
import { TaskComments, type TaskCommentsManagement } from "./task-comments";
import { TaskMetadata } from "./task-metadata";
import { TaskTags } from "./task-tags";

const tabs = ["description", "comments"] as const;
type Tab = typeof tabs[number];

export function TaskDetail({ task, stage, preview, management, expanded = true }: {
  task: TaskPreview; stage: KanbanColumn["stage"] | undefined; preview?: boolean; management?: TaskCommentsManagement; expanded?: boolean;
}) {
  const t = useTranslations("Task");
  const taskManagement = useTranslations("TaskManagement");
  const board = useTranslations("Board");
  const comments = useTranslations("TaskComments");
  const format = useFormatter();
  const id = useId();
  const [active, setActive] = useState<Tab>("description");
  const [openedComments, setOpenedComments] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [countVersion, setCountVersion] = useState(0);

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    const search = new URLSearchParams({ count: "1", ...(preview && { preview: "1" }) });
    void fetch(`/task-comments/${task.id}?${search}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to count comments.");
      const data: unknown = await response.json();
      const result = commentCountSchema.parse(data);
      if (!controller.signal.aborted) setCount(result.count);
    }).catch(() => { if (!controller.signal.aborted) setCount(null); });
    return () => controller.abort();
  }, [task.id, expanded, preview, countVersion]);

  function select(tab: Tab) {
    setActive(tab);
    if (tab === "comments") setOpenedComments(true);
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, tab: Tab) {
    const next = event.key === "Home" ? "description" : event.key === "End" ? "comments"
      : event.key === "ArrowLeft" || event.key === "ArrowRight" ? (tab === "description" ? "comments" : "description") : null;
    if (!next) return;
    event.preventDefault();
    select(next);
    document.getElementById(id + "-" + next)?.focus();
  }

  return <div className="min-w-0">
    <div className="space-y-3">
      <TaskMetadata task={task} detail status={stage ? { label: taskManagement("stage"), value: board(stage) } : undefined} />
      <TaskTags tags={task.tags} detail />
    </div>
    <div role="tablist" aria-label={t("detailSections")} className="mt-3 flex flex-wrap gap-x-3 border-b border-border/20">
      {tabs.map((tab) => <button key={tab} type="button" role="tab" id={id + "-" + tab} aria-selected={active === tab}
        aria-controls={id + "-" + tab + "-panel"} tabIndex={active === tab ? 0 : -1} data-task-tab={tab}
        className="min-h-11 border-b-2 border-transparent px-2 text-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus aria-selected:border-foreground aria-selected:font-semibold"
        onKeyDown={(event) => navigate(event, tab)} onClick={() => select(tab)}>
        {tab === "description" ? taskManagement("description") : comments("heading")}
        {tab === "comments" && count !== null && <span className="ms-2 inline-block min-w-7 rounded-full bg-surface-warm px-1.5 text-center text-sm tabular-nums">
          {format.number(count)}
        </span>}
      </button>)}
    </div>
    <div role="tabpanel" id={id + "-description-panel"} aria-labelledby={id + "-description"} hidden={active !== "description"} tabIndex={0} className="pt-4">
      {task.description_content ? <RichTextContent document={task.description_content} preview={preview} />
        : <p className="leading-relaxed whitespace-pre-wrap wrap-anywhere">{task.description || t("noDescription")}</p>}
    </div>
    <div role="tabpanel" id={id + "-comments-panel"} aria-labelledby={id + "-comments"} hidden={active !== "comments"} tabIndex={0} className="pt-4">
      {openedComments && <TaskComments taskId={task.id} preview={preview} management={management}
        onCountChange={() => setCountVersion((version) => version + 1)} />}
    </div>
  </div>;
}
