"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { mutateTask } from "../../app/projects/task-actions";
import type { KanbanColumn } from "../../lib/columns/queries";
import { plainTextDocument, RICH_TEXT_LIMITS, type RichTextDocument, type RichTextInline } from "../../lib/projects/rich-text";
import type { Task } from "../../lib/tasks/queries";
import { TASK_DESCRIPTION_LIMIT, taskPrioritySchema, type TaskMutation, type TaskMutationResult } from "../../lib/tasks/schemas";
import { RichTextEditor } from "../projects/rich-text-editor";
import { ProjectDialog } from "../projects/project-dialog";
import selectStyles from "../shared/select.module.css";
import { BoardColumns, type DropTarget } from "./board-columns";
import { TaskDetail } from "./task-detail";
import { TaskDateField } from "./task-date-field";
import boardStyles from "./task-board.module.css";
import { useTaskDrag } from "./use-task-drag";

type Editor = { id: string; columnId: string; task?: Task };
const fieldClass = "min-h-11 w-full min-w-0 rounded-xl border border-border/30 bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

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

export function ManagedBoard({ projectId, columns, tasks }: { projectId: string; columns: KanbanColumn[]; tasks: Task[] }) {
  const t = useTranslations("TaskManagement");
  const taskText = useTranslations("Task");
  const boardText = useTranslations("Board");
  const board = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<Exclude<TaskMutationResult, "ok"> | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const task = editor?.task;
  const taskColumn = columns.find(({ id }) => id === task?.column_id);
  const columnTasks = showDetail && task ? tasks.filter(({ column_id }) => column_id === task.column_id) : [];
  const taskIndex = columnTasks.findIndex(({ id }) => id === task?.id);
  const previousTask = columnTasks[taskIndex - 1];

  function submit(mutation: TaskMutation) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const outcome = await mutateTask(mutation).catch(() => "unavailable" as const);
      if (outcome !== "ok") {
        setError(outcome);
      } else {
        setEditor(null);
        if (mutation.operation !== "create") requestAnimationFrame(() => {
          const edit = board.current?.querySelector<HTMLButtonElement>(`[data-open-task="${mutation.taskId}"]`);
          (edit ?? board.current?.querySelector<HTMLElement>("[data-task-scroll]"))?.focus();
        });
      }
    });
  }

  function move(item: Task, target: DropTarget) {
    const following = tasks.filter((candidate) => candidate.column_id === item.column_id);
    const index = following.findIndex((candidate) => candidate.id === item.id);
    if (target.columnId === item.column_id && target.beforeId === (following[index + 1]?.id ?? null)) return;
    submit({ operation: "move", projectId, taskId: item.id, version: item.updated_at, ...target });
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
    if (!editor || content === null || uploading) return;
    const fields = new FormData(event.currentTarget);
    const values = {
      projectId, taskId: editor.id, columnId: String(fields.get("columnId")),
      title: String(fields.get("title")), description: "", descriptionContent: content,
      priority: fields.get("priority"), due_date: String(fields.get("due_date")), hidden: fields.has("hidden"),
    };
    const priority = values.priority === "" ? "" as const : taskPrioritySchema.safeParse(values.priority).data;
    if (priority === undefined) { setError("invalid"); return; }
    const details = { ...values, priority };
    submit(task ? { ...details, operation: "edit", version: task.updated_at } : { ...details, operation: "create" });
  }

  const formId = "task-editor-form";
  return <div ref={board} className="flex min-h-0 flex-1 flex-col">
    {!editor && error && <p role="alert" className="mb-3 shrink-0 text-sm">{t(error)}</p>}
    <BoardColumns columns={columns} tasks={tasks} dropTarget={drag.preview?.target} draggedTaskId={drag.preview?.task.id} renderAddTask={(column) => (
      <button type="button" data-new-task="" aria-haspopup="dialog" aria-label={t("addTaskInColumn", { column: boardText(column.stage) })}
        className={`${boardStyles.addTask} flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-2 py-1`}
        disabled={pending} onClick={(event) => open(event.currentTarget, column.id)}>
        <span aria-hidden="true" className="text-xl leading-none">+</span>{t("addTask")}
      </button>
    )} cardControl={(item) => ({
      disabled: pending,
      onClick: (event) => {
        if (!drag.suppressesClick(event)) open(event.currentTarget, item.column_id, item);
      },
      onPointerDown: (event) => drag.startPointer(event, item),
      onTouchStart: (event) => drag.startTouch(event, item),
    })} />
    {drag.preview && <div aria-hidden="true" className="pointer-events-none fixed z-50 max-w-48 rounded-lg border border-focus bg-surface p-2 text-sm shadow-panel wrap-anywhere"
      style={{ left: Math.min(drag.preview.point.x + 12, window.innerWidth - 200), top: drag.preview.point.y + 12 }}>{drag.preview.task.title}</div>}

    <ProjectDialog id="task-editor" open={editor !== null} busy={pending || uploading} triggerRef={trigger}
      title={confirmArchive ? t("archiveTask") : task?.title ?? t("newTask")}
      closeLabel={t("close")} onClose={() => setEditor(null)}
      leadingAction={task && !confirmArchive && <button type="button" data-archive-task="" disabled={pending || uploading}
        className="project-secondary-action me-auto"
        onClick={() => { setError(null); setConfirmArchive(true); setContent(null); }}>{t("archiveTask")}</button>}
      actions={confirmArchive && task
        ? <button type="button" className="project-primary-action" disabled={pending} onClick={() => submit({
          operation: "archive", projectId, taskId: task.id, version: task.updated_at,
        })}>{t("archiveTask")}</button>
        : showDetail
          ? <button key="edit" type="button" data-edit-task="" className="project-primary-action" disabled={pending}
            onClick={() => { setShowDetail(false); document.getElementById("task-editor-heading")?.focus(); }}>{t("editTask")}</button>
          : <button key="save" type="submit" form={formId} className="project-primary-action" disabled={pending || uploading || content === null}>{t(pending ? "saving" : "save")}</button>}>
      {confirmArchive ? <p>{t("archivePrompt", { title: task?.title ?? "" })}</p> : showDetail && task ? <>
        <TaskDetail task={task} stage={taskColumn?.stage} preview />
        {columnTasks.length > 1 && <fieldset disabled={pending} className="mt-4 flex flex-wrap gap-2">
          <legend className="mb-1">{t("order")}</legend>
          <button type="button" data-move-up="" className="project-secondary-action" disabled={!previousTask}
            onClick={() => { if (previousTask) move(task, { columnId: task.column_id, beforeId: previousTask.id }); }}>{t("moveUp")}</button>
          <button type="button" data-move-down="" className="project-secondary-action" disabled={taskIndex >= columnTasks.length - 1}
            onClick={() => move(task, { columnId: task.column_id, beforeId: columnTasks[taskIndex + 2]?.id ?? null })}>{t("moveDown")}</button>
        </fieldset>}
      </> : <form id={formId} key={editor?.id} onSubmit={save} className="space-y-4">
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <label className="grid gap-1">{t("title")}
            <input className={fieldClass} name="title" required defaultValue={task?.title} />
          </label>
          {editor && <RichTextEditor label={t("description")} projectId={projectId} taskId={editor.id}
            initial={initialDescription(task)} maxTextLength={TASK_DESCRIPTION_LIMIT} disabled={pending}
            onBusyChange={setUploading} onChange={(value, valid) => setContent(valid ? value : null)} />}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1">{t("stage")}
              <select className={`${fieldClass} ${selectStyles.select}`} name="columnId" required defaultValue={editor?.columnId}>
                {columns.map((column) => <option key={column.id} value={column.id}>{boardText(column.stage)}</option>)}
              </select>
            </label>
            <label className="grid gap-1">{taskText("priority")}
              <select className={`${fieldClass} ${selectStyles.select}`} name="priority" defaultValue={task?.priority ?? ""}>
                <option value="">{t("noPriority")}</option>
                {taskPrioritySchema.options.map((priority) => <option key={priority} value={priority}>{taskText(priority)}</option>)}
              </select>
            </label>
            <TaskDateField fieldClass={fieldClass} initialDate={task?.due_date} />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border/20 bg-surface-warm/40 px-4 py-2 has-[:disabled]:cursor-default">
            <span>{t("hideTask")}</span>
            <input type="checkbox" role="switch" className="sr-only" name="hidden" defaultChecked={task?.is_hidden} />
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
