import { listManagedColumns, listPublishedColumns } from "../../lib/columns/queries";
import { listManagedTasks, listPublishedTasks } from "../../lib/tasks/queries";
import { BoardColumns } from "../tasks/board-columns";
import { ManagedBoard } from "../tasks/managed-board";

export async function ProjectBoard({ projectId, administrator = false }: { projectId: string; administrator?: boolean }) {
  const [columns, tasks] = await Promise.all([
    administrator ? listManagedColumns(projectId) : listPublishedColumns(projectId),
    administrator ? listManagedTasks(projectId) : listPublishedTasks(projectId),
  ]);

  return administrator
    ? <ManagedBoard projectId={projectId} columns={columns} tasks={tasks} />
    : <BoardColumns columns={columns} tasks={tasks} />;
}
