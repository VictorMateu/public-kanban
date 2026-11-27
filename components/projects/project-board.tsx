import { listManagedColumns, listPublishedColumns } from "../../lib/columns/queries";
import { listManagedTasks, listPublishedTasks } from "../../lib/tasks/queries";
import { PublicBoard } from "../tasks/public-board";
import { ManagedBoard } from "../tasks/managed-board";

export async function ProjectBoard({ projectId, administrator = false }: { projectId: string; administrator?: boolean }) {
  const [columns, tasks, archived] = await Promise.all([
    administrator ? listManagedColumns(projectId) : listPublishedColumns(projectId),
    administrator ? listManagedTasks(projectId) : listPublishedTasks(projectId),
    administrator ? listManagedTasks(projectId, true).catch(() => null) : null,
  ]);

  return administrator
    ? <ManagedBoard projectId={projectId} columns={columns} tasks={tasks} archived={archived} />
    : <PublicBoard columns={columns} tasks={tasks.map(({ id, column_id, title, description, description_content, priority, due_date, completed_on, is_hidden, is_system, tags }) => ({
        id, column_id, title, description, description_content, priority, due_date, completed_on, is_hidden, is_system, tags,
      }))} />;
}
