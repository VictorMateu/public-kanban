import { useTranslations } from "next-intl";
import type { KeyboardEventHandler, MouseEventHandler, PointerEventHandler, TouchEventHandler } from "react";
import type { TaskPreview } from "../../lib/tasks/queries";
import styles from "./task-board.module.css";
import { TaskMetadata } from "./task-metadata";
import { TaskTags } from "./task-tags";

export type TaskCardControl = {
  onClick: MouseEventHandler<HTMLButtonElement>;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onTouchStart?: TouchEventHandler<HTMLButtonElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  "aria-describedby"?: string;
  "aria-keyshortcuts"?: string;
  disabled?: boolean;
};

export function TaskCard({ task, completed, control }: { task: TaskPreview; completed: boolean; control: TaskCardControl }) {
  const titleId = `task-${task.id}`;
  const tagsId = task.tags.length ? `${titleId}-tags` : undefined;
  const descriptionIds = [tagsId, control["aria-describedby"]].filter(Boolean).join(" ");
  const t = useTranslations("Task");
  return <article aria-labelledby={titleId} className={`${styles.card} relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 rounded-2xl border bg-surface px-3.5 py-3`}>
    <span className={styles.taskMark} data-completed={completed || undefined} aria-hidden="true" />
    <div className="min-w-0">
      <h4 id={titleId} className={`font-sans text-lg font-normal leading-snug wrap-anywhere${completed ? " line-through" : ""}`}>{task.title}</h4>
      <TaskMetadata task={task} />
      <TaskTags id={tagsId} tags={task.tags} />
    </div>
    <button type="button" data-open-task={task.id} data-task-drag={control.onPointerDown ? "" : undefined}
      aria-label={t("openNamed", { title: task.title })} aria-haspopup="dialog"
      className={`${styles.cardControl} absolute inset-0 rounded-2xl ${control.onPointerDown ? "cursor-grab select-none active:cursor-grabbing" : "cursor-pointer"}`}
      {...control} aria-describedby={descriptionIds || undefined} />
  </article>;
}
