import { listManagedColumns, listPublishedColumns } from "../../lib/columns/queries";
import { listManagedTasks, listPublishedTasks } from "../../lib/tasks/queries";
import { PublicBoard } from "../tasks/public-board";
import { ManagedBoard } from "../tasks/managed-board";

export async function ProjectBoard({ projectId, administrator = false }: { projectId: string; administrator?: boolean }) {
  const [columns, tasks] = await Promise.all([
    administrator ? listManagedColumns(projectId) : listPublishedColumns(projectId),
    administrator ? listManagedTasks(projectId) : listPublishedTasks(projectId),
  ]);

  return administrator
    ? <ManagedBoard projectId={projectId} columns={columns} tasks={tasks} />
    : <PublicBoard columns={columns} tasks={tasks.map(({ id, column_id, title, description, priority, due_date, completed_on, is_hidden }) => ({
        id, column_id, title, description, priority, due_date, completed_on, is_hidden,
      }))} />;
}
