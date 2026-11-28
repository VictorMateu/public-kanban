"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { KanbanColumn } from "../../lib/columns/queries";
import type { TaskPreview } from "../../lib/tasks/queries";
import { ProjectDialog } from "../projects/project-dialog";
import { BoardColumns } from "./board-columns";
import { TaskDetail } from "./task-detail";

export function PublicBoard({ columns, tasks }: { columns: KanbanColumn[]; tasks: TaskPreview[] }) {
  const t = useTranslations("TaskManagement");
  const trigger = useRef<HTMLButtonElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const task = tasks.find(({ id }) => id === selectedId);
  return <>
    <BoardColumns columns={columns} tasks={tasks} cardControl={(item) => ({
      onClick: (event) => {
        trigger.current = event.currentTarget;
        setSelectedId(item.id);
      },
    })} />
    <ProjectDialog id="task-detail" title={task?.title ?? ""} open={Boolean(task)} closeLabel={t("close")}
      onClose={() => setSelectedId(null)} triggerRef={trigger}>
      {task && <TaskDetail key={task.id} task={task} stage={columns.find(({ id }) => id === task.column_id)?.stage} />}
    </ProjectDialog>
  </>;
}
