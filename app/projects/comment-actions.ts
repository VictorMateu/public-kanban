"use server";

import { getAdministrator } from "../../lib/auth/server";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { INSUFFICIENT_PRIVILEGE } from "../../lib/supabase/sqlstate";
import { commentMutationSchema, commentResultSchema, type CommentResult } from "../../lib/tasks/comment-schemas";

export async function mutateTaskComment(input: unknown): Promise<CommentResult> {
  try {
    const client = await createServerSupabaseClient(true);
    if (!await getAdministrator(client)) return "unauthorized";
    const parsed = commentMutationSchema.safeParse(input);
    if (!parsed.success) return "invalid";
    const change = parsed.data;
    const { data, error } = await client.rpc("mutate_task_comment", {
      p_operation: change.operation, p_project: change.projectId, p_task: change.taskId, p_comment: change.commentId,
      ...("version" in change && { p_version: change.version }),
      ...(change.operation !== "delete" && { p_body: change.body, p_public: change.isPublic }),
    });
    if (error) return error.code === INSUFFICIENT_PRIVILEGE ? "unauthorized" : "unavailable";
    return commentResultSchema.safeParse(data).data ?? "unavailable";
  } catch {
    return "unavailable";
  }
}
