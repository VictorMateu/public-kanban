"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { mutateTask } from "../../app/projects/task-actions";
import type { KanbanColumn } from "../../lib/columns/queries";
import { plainTextDocument, RICH_TEXT_LIMITS, type RichTextDocument, type RichTextInline } from "../../lib/projects/rich-text";
import type { Task } from "../../lib/tasks/queries";
import { TASK_DESCRIPTION_LIMIT, taskPrioritySchema, taskTagsSchema, type TaskMutation, type TaskMutationResult } from "../../lib/tasks/schemas";
import { RichTextEditor } from "../projects/rich-text-editor";
import { ProjectDialog } from "../projects/project-dialog";
import selectStyles from "../shared/select.module.css";
import { ArchivedTasks } from "./archived-tasks";
import { BoardColumns, type DropTarget } from "./board-columns";
import { TaskDetail } from "./task-detail";
import { TaskDateField } from "./task-date-field";
import { TaskTagsField } from "./task-tags-field";
import boardStyles from "./task-board.module.css";
import { useTaskDrag } from "./use-task-drag";

type Editor = { id: string; columnId: string; task?: Task };
const fieldClass = "min-h-11 w-full min-w-0 rounded-xl border border-border/30 bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const taskFormFields = {
  columnId: "columnId", title: "title", priority: "priority", dueDate: "due_date", hidden: "hidden", tags: "tags", tagDraft: "tagDraft",
} as const;

function initialDescription(task?: Task): RichTextDocument {
  if (task?.description_content) return task.description_content;
  const legacy = task?.description ?? null;
  const content = (legacy ?? "").split(/\r\n?|\n/u).flatMap<RichTextInline>((line, index) => [
    ...(index ? [{ type: "hardBreak" } as const] : []),
    ...(line ? [{ type: "text", text: line } as const] : []),
  ]);
  // Leave room for the document and paragraph nodes when importing legacy text.
  if (content.length > RICH_TEXT_LIMITS.nodes - 2) return plainTextDocument(legacy);
  return { type: "doc", content: [{ type: "paragraph", content }] };
}

export function ManagedBoard({ projectId, columns, tasks, archived }: { projectId: string; columns: KanbanColumn[]; tasks: Task[]; archived: Task[] | null }) {
  const t = useTranslations("TaskManagement");
  const taskText = useTranslations("Task");
  const boardText = useTranslations("Board");
  const board = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusAfterMutation = useRef<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<Exclude<TaskMutationResult, "ok"> | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const reorderHintId = useId();
  const task = editor?.task;
  const taskColumn = columns.find(({ id }) => id === task?.column_id);

  useEffect(() => {
    const taskId = focusAfterMutation.current;
    if (pending || !taskId) return;
    focusAfterMutation.current = null;
    const card = board.current?.querySelector<HTMLButtonElement>(`[data-open-task="${taskId}"]`);
    if (card?.getClientRects().length) {
      card.focus();
    } else {
      const toggle = card?.closest("[data-board-column]")?.querySelector<HTMLButtonElement>("[data-column-toggle]");
      (toggle ?? board.current?.querySelector<HTMLElement>("[data-task-scroll]"))?.focus();
    }
  }, [pending]);

  function submit(mutation: TaskMutation) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const outcome = await mutateTask(mutation).catch(() => "unavailable" as const);
      if (outcome !== "ok") {
        setError(outcome);
        if (mutation.operation === "move") focusAfterMutation.current = mutation.taskId;
      } else {
        setEditor(null);
        if (mutation.operation !== "create") focusAfterMutation.current = mutation.taskId;
      }
    });
  }

  function move(item: Task, target: DropTarget) {
    const following = tasks.filter((candidate) => candidate.column_id === item.column_id);
    const index = following.findIndex((candidate) => candidate.id === item.id);
    if (target.columnId === item.column_id && target.beforeId === (following[index + 1]?.id ?? null)) return;
    submit({ operation: "move", projectId, taskId: item.id, version: item.updated_at, ...target });
  }

  function reorderWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, item: Task) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();

    const columnTasks = tasks.filter(({ column_id }) => column_id === item.column_id);
    const index = columnTasks.findIndex(({ id }) => id === item.id);
    const offset = event.key === "ArrowUp" ? -1 : 1;
    if (event.repeat || index < 0 || !columnTasks[index + offset]) return;
    const before = columnTasks[index + (offset < 0 ? -1 : 2)];
    move(item, { columnId: item.column_id, beforeId: before?.id ?? null });
  }

  const drag = useTaskDrag(board, move);

  function open(button: HTMLButtonElement, columnId: string, item?: Task) {
    trigger.current = button;
    setError(null);
    setConfirmArchive(false);
    setShowDetail(Boolean(item));
    setContent(null);
    setEditor({ id: item?.id ?? crypto.randomUUID(), columnId, task: item });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || task?.is_system || content === null || uploading) return;
    const fields = new FormData(event.currentTarget);
    const values = {
      projectId, taskId: editor.id, columnId: String(fields.get(taskFormFields.columnId)),
      title: String(fields.get(taskFormFields.title)), description: "", descriptionContent: content,
      priority: fields.get(taskFormFields.priority), due_date: String(fields.get(taskFormFields.dueDate)), hidden: fields.has(taskFormFields.hidden),
    };
    const priority = values.priority === "" ? "" as const : taskPrioritySchema.safeParse(values.priority).data;
    const tagDraft = String(fields.get(taskFormFields.tagDraft) ?? "").trim();
    const tags = taskTagsSchema.safeParse([...fields.getAll(taskFormFields.tags), ...(tagDraft ? [tagDraft] : [])]);
    if (priority === undefined || !tags.success) { setError("invalid"); return; }
    const details = { ...values, priority, tags: tags.data };
    submit(task ? { ...details, operation: "edit", version: task.updated_at } : { ...details, operation: "create" });
  }

  const formId = "task-editor-form";
  return <div ref={board} className="flex min-h-0 flex-1 flex-col">
    {!editor && error && <p role="alert" className="mb-3 shrink-0 text-sm">{t(error)}</p>}
    <div className="mb-2 flex shrink-0 justify-end"><ArchivedTasks tasks={archived} columns={columns} /></div>
    <p id={reorderHintId} className="sr-only">{t("reorderHint")}</p>
    <BoardColumns columns={columns} tasks={tasks} dropTarget={drag.preview?.target} draggedTaskId={drag.preview?.task.id} renderAddTask={(column) => (
      <button type="button" data-new-task="" aria-haspopup="dialog" aria-label={t("addTaskInColumn", { column: boardText(column.stage) })}
        className={`${boardStyles.addTask} flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-2 py-1`}
        disabled={pending} onClick={(event) => open(event.currentTarget, column.id)}>
        <span aria-hidden="true" className="text-xl leading-none">+</span>{t("addTask")}
      </button>
    )} cardControl={(item) => ({
      disabled: pending,
      onKeyDown: (event) => reorderWithKeyboard(event, item),
      "aria-keyshortcuts": "Alt+ArrowUp Alt+ArrowDown",
      "aria-describedby": reorderHintId,
      onClick: (event) => {
        if (!drag.suppressesClick(event)) open(event.currentTarget, item.column_id, item);
      },
      onPointerDown: (event) => drag.startPointer(event, item),
      onTouchStart: (event) => drag.startTouch(event, item),
    })} />
    {drag.preview && <div aria-hidden="true" className="pointer-events-none fixed z-50 max-w-48 rounded-lg border border-focus bg-surface p-2 text-sm shadow-panel wrap-anywhere"
      style={{ left: Math.min(drag.preview.point.x + 12, window.innerWidth - 200), top: drag.preview.point.y + 12 }}>{drag.preview.task.title}</div>}

    <ProjectDialog id="task-editor" open={editor !== null} busy={pending || uploading || commentBusy} triggerRef={trigger}
      title={confirmArchive ? t("archiveTask") : task?.title ?? t("newTask")}
      closeLabel={t("close")} onClose={() => setEditor(null)}
      leadingAction={task && !task.is_system && !confirmArchive && <button type="button" data-archive-task="" disabled={pending || uploading || commentBusy}
        className="project-secondary-action me-auto"
        onClick={() => { setError(null); setConfirmArchive(true); setContent(null); }}>{t("archiveTask")}</button>}
      actions={task?.is_system ? null : confirmArchive && task
        ? <button type="button" className="project-primary-action" disabled={pending} onClick={() => submit({
          operation: "archive", projectId, taskId: task.id, version: task.updated_at,
        })}>{t("archiveTask")}</button>
        : showDetail
          ? <button key="edit" type="button" data-edit-task="" className="project-primary-action" disabled={pending || commentBusy}
            onClick={() => { setShowDetail(false); document.getElementById("task-editor-heading")?.focus(); }}>{t("editTask")}</button>
          : <button key="save" type="submit" form={formId} className="project-primary-action" disabled={pending || uploading || content === null}>{t(pending ? "saving" : "save")}</button>}>
      {confirmArchive ? <p>{t("archivePrompt", { title: task?.title ?? "" })}</p> : showDetail && task ? (
        <TaskDetail key={task.id} task={task} stage={taskColumn?.stage} preview
          management={{ projectId, onBusyChange: setCommentBusy }} />
      ) : <form id={formId} key={editor?.id} onSubmit={save} className="space-y-4">
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <label className="grid gap-1">{t("title")}
            <input className={fieldClass} name={taskFormFields.title} required defaultValue={task?.title} />
          </label>
          {editor && <RichTextEditor label={t("description")} projectId={projectId} taskId={editor.id}
            initial={initialDescription(task)} maxTextLength={TASK_DESCRIPTION_LIMIT} disabled={pending}
            onBusyChange={setUploading} onChange={(value, valid) => setContent(valid ? value : null)} />}
          <TaskTagsField name={taskFormFields.tags} draftName={taskFormFields.tagDraft}
            initialTags={task?.tags ?? []} fieldClass={fieldClass} />
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1">{t("stage")}
              <select className={`${fieldClass} ${selectStyles.select}`} name={taskFormFields.columnId} required defaultValue={editor?.columnId}>
                {columns.map((column) => <option key={column.id} value={column.id}>{boardText(column.stage)}</option>)}
              </select>
            </label>
            <label className="grid gap-1">{taskText("priority")}
              <select className={`${fieldClass} ${selectStyles.select}`} name={taskFormFields.priority} defaultValue={task?.priority ?? ""}>
                <option value="">{t("noPriority")}</option>
                {taskPrioritySchema.options.map((priority) => <option key={priority} value={priority}>{taskText(priority)}</option>)}
              </select>
            </label>
            <TaskDateField name={taskFormFields.dueDate} fieldClass={fieldClass} initialDate={task?.due_date} />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border/20 bg-surface-warm/40 px-4 py-2 has-[:disabled]:cursor-default">
            <span>{t("hideTask")}</span>
            <input type="checkbox" role="switch" className="sr-only" name={taskFormFields.hidden} defaultChecked={task?.is_hidden} />
            <span aria-hidden="true" className="project-visibility-switch">
              <span className="project-visibility-thumb" />
            </span>
          </label>
        </fieldset>
      </form>}
      {editor && error && <p role="alert" className="mt-3">{t(error)}</p>}
    </ProjectDialog>
  </div>;
}
