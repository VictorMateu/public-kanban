"use server";

import { revalidatePath } from "next/cache";
import { richTextToPlainText } from "../../lib/projects/rich-text";
import { getAdministrator } from "../../lib/auth/server";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { taskMutationSchema, type TaskMutationResult } from "../../lib/tasks/schemas";

export async function mutateTask(input: unknown): Promise<TaskMutationResult> {
  try {
    const client = await createServerSupabaseClient(true);
    if (!await getAdministrator(client)) return "unauthorized";
    const parsed = taskMutationSchema.safeParse(input);
    if (!parsed.success) return "invalid";

    const task = parsed.data;
    const { data, error } = await client.rpc("mutate_task", {
      p_operation: task.operation,
      p_project: task.projectId,
      p_task: task.taskId,
      ...("version" in task && { p_version: task.version }),
      ...("columnId" in task && { p_column: task.columnId }),
      ...(task.operation === "move" && task.beforeId && { p_before: task.beforeId }),
      ...((task.operation === "create" || task.operation === "edit") && {
        p_title: task.title,
        p_description: task.descriptionContent === undefined ? task.description ?? undefined
          : task.descriptionContent ? richTextToPlainText(task.descriptionContent).trim() || undefined : undefined,
        p_description_content: task.descriptionContent ?? undefined,
        p_priority: task.priority ?? undefined, p_due_date: task.due_date ?? undefined, p_hidden: task.hidden,
      }),
    });
    if (error) return error.code === "42501" ? "unauthorized" : "unavailable";
    if (data === "ok" || data === "stale") revalidatePath("/projects/[slug]", "page");
    return data === "ok" || data === "invalid" || data === "stale" ? data : "unavailable";
  } catch {
    return "unavailable";
  }
}
