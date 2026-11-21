"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { mutateTask } from "../../app/projects/task-actions";
import type { KanbanColumn } from "../../lib/columns/queries";
import type { Task } from "../../lib/tasks/queries";
import { taskPrioritySchema, type TaskMutation, type TaskMutationResult } from "../../lib/tasks/schemas";
import { ProjectDialog } from "../projects/project-dialog";
import { BoardColumns, type DropTarget } from "./board-columns";
import { TaskDateField } from "./task-date-field";
import styles from "./task-fields.module.css";
import { useTaskDrag } from "./use-task-drag";

type Editor = { id: string; task?: Task };
const fieldClass = "min-h-11 w-full min-w-0 rounded-xl border border-border/30 bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function ManagedBoard({ projectId, columns, tasks }: { projectId: string; columns: KanbanColumn[]; tasks: Task[] }) {
  const t = useTranslations("TaskManagement");
  const taskText = useTranslations("Task");
  const boardText = useTranslations("Board");
  const board = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [result, setResult] = useState<TaskMutationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const task = editor?.task;

  function submit(mutation: TaskMutation) {
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      const outcome = await mutateTask(mutation).catch(() => "unavailable" as const);
      setResult(outcome);
      if (outcome === "ok") {
        setEditor(null);
        if (mutation.operation !== "create") requestAnimationFrame(() => {
          const edit = board.current?.querySelector<HTMLButtonElement>(`[data-edit-task="${mutation.taskId}"]`);
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

  function open(button: HTMLButtonElement, item?: Task) {
    trigger.current = button;
    setResult(null);
    setConfirmArchive(false);
    setEditor({ id: item?.id ?? crypto.randomUUID(), task: item });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const fields = new FormData(event.currentTarget);
    const values = {
      projectId, taskId: editor.id, columnId: String(fields.get("columnId")),
      title: String(fields.get("title")), description: String(fields.get("description")),
      priority: fields.get("priority"), due_date: String(fields.get("due_date")), hidden: fields.has("hidden"),
    };
    const priority = values.priority === "" ? "" as const : taskPrioritySchema.safeParse(values.priority).data;
    if (priority === undefined) { setResult("invalid"); return; }
    const details = { ...values, priority };
    submit(task ? { ...details, operation: "edit", version: task.updated_at } : { ...details, operation: "create" });
  }

  const formId = "task-editor-form";
  return <div ref={board}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="text-sm">{!editor && result ? t(result) : ""}</p>
      <button type="button" data-new-task="" aria-haspopup="dialog" className="project-primary-action" disabled={columns.length === 0 || pending}
        onClick={(event) => open(event.currentTarget)}>{t("newTask")}</button>
    </div>
    <BoardColumns columns={columns} tasks={tasks} dropTarget={drag.preview?.target} renderActions={(item, index, columnTasks) => (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {item.is_hidden && <span className="text-sm">{t("hiddenBadge")}</span>}
        <div className="flex flex-wrap gap-1">
          <button type="button" data-edit-task={item.id} className="project-secondary-action"
            aria-label={t("editNamed", { title: item.title })} aria-haspopup="dialog" disabled={pending}
            onClick={(event) => open(event.currentTarget, item)}>{t("editTask")}</button>
          <button type="button" data-move-up="" className="editor-tool min-h-11 min-w-11"
            title={t("moveUp")} aria-label={t("moveUp")} disabled={pending || index === 0}
            onClick={() => { const previous = columnTasks[index - 1]; if (previous) move(item, { columnId: item.column_id, beforeId: previous.id }); }}>
            <span aria-hidden="true">↑</span>
          </button>
          <button type="button" data-move-down="" className="editor-tool min-h-11 min-w-11"
            title={t("moveDown")} aria-label={t("moveDown")} disabled={pending || index === columnTasks.length - 1}
            onClick={() => move(item, { columnId: item.column_id, beforeId: columnTasks[index + 2]?.id ?? null })}>
            <span aria-hidden="true">↓</span>
          </button>
          <span data-task-drag="" className="editor-tool min-h-11 min-w-11 touch-none cursor-grab select-none active:cursor-grabbing"
            title={t("dragTask", { title: item.title })} aria-hidden="true"
            onPointerDown={(event) => { if (!pending) drag.start(event, item); }}>⠿</span>
        </div>
      </div>
    )} />
    {drag.preview && <div aria-hidden="true" className="pointer-events-none fixed z-50 max-w-48 rounded-lg border border-focus bg-surface p-2 text-sm shadow-panel wrap-anywhere"
      style={{ left: Math.min(drag.preview.point.x + 12, window.innerWidth - 200), top: drag.preview.point.y + 12 }}>{drag.preview.task.title}</div>}

    <ProjectDialog id="task-editor" open={editor !== null} busy={pending} triggerRef={trigger}
      title={confirmArchive ? t("archiveTask") : task ? t("editTask") : t("newTask")}
      closeLabel={t("close")} onClose={() => setEditor(null)}
      leadingAction={task && !confirmArchive && <button type="button" data-archive-task="" disabled={pending}
        className="project-secondary-action me-auto"
        onClick={() => { setResult(null); setConfirmArchive(true); }}>{t("archiveTask")}</button>}
      actions={confirmArchive && task
        ? <button type="button" className="project-primary-action" disabled={pending} onClick={() => submit({
          operation: "archive", projectId, taskId: task.id, version: task.updated_at,
        })}>{t("archiveTask")}</button>
        : <button type="submit" form={formId} className="project-primary-action" disabled={pending}>{t(pending ? "saving" : "save")}</button>}>
      {confirmArchive ? <p>{t("archivePrompt", { title: task?.title ?? "" })}</p> : <form id={formId} key={editor?.id} onSubmit={save} className="space-y-4">
        <fieldset disabled={pending} className="grid gap-4">
          <label className="grid gap-1">{t("title")}
            <input className={fieldClass} name="title" required defaultValue={task?.title} />
          </label>
          <label className="grid gap-1">{t("description")}
            <textarea className={fieldClass} name="description" rows={4} defaultValue={task?.description ?? ""} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1">{t("stage")}
              <select className={`${fieldClass} ${styles.select}`} name="columnId" required defaultValue={task?.column_id}>
                {columns.map((column) => <option key={column.id} value={column.id}>{boardText(column.stage)}</option>)}
              </select>
            </label>
            <label className="grid gap-1">{taskText("priority")}
              <select className={`${fieldClass} ${styles.select}`} name="priority" defaultValue={task?.priority ?? ""}>
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
      {editor && result && result !== "ok" && <p role="alert" className="mt-3">{t(result)}</p>}
    </ProjectDialog>
  </div>;
}
