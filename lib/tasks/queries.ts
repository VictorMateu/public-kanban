import "server-only";

import { getAdministrator } from "../auth/server";
import { createServerSupabaseClient } from "../supabase/server";

import type { z } from "zod";

import { createPublicSupabaseClient } from "../supabase/public";
import type { Database } from "../supabase/database.types";
import { richTextDocumentSchema, type RichTextDocument } from "../projects/rich-text";
import { taskPrioritySchema, taskTagsSchema } from "./schemas";

const prioritySchema = taskPrioritySchema.nullable();
// PostgreSQL TEXT CHECK constraints generate a string type; validate before narrowing it.
export type Task = Omit<Database["public"]["Tables"]["tasks"]["Row"], "priority" | "description_content"> & {
  priority: z.infer<typeof prioritySchema>;
  description_content: RichTextDocument | null;
};
const descriptionSchema = richTextDocumentSchema.nullable();

function parseTask(row: Database["public"]["Tables"]["tasks"]["Row"]): Task {
  return {
    ...row,
    priority: prioritySchema.parse(row.priority),
    description_content: descriptionSchema.parse(row.description_content),
    tags: taskTagsSchema.parse(row.tags),
  };
}

export async function listPublishedTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await createPublicSupabaseClient()
    .from("tasks").select("*").eq("project_id", projectId)
    .order("position").order("id");
  if (error) throw new Error("Unable to query tasks.", { cause: error });
  return data.map(parseTask);
}

export async function listManagedTasks(projectId: string, archived = false): Promise<Task[]> {
  const client = await createServerSupabaseClient();
  if (!await getAdministrator(client)) throw new Error("Administrator authorization required.");
  const query = client.from("tasks").select("*").eq("project_id", projectId);
  const { data, error } = await (archived
    ? query.not("archived_at", "is", null).order("archived_at", { ascending: false }).order("id")
    : query.is("archived_at", null).order("position").order("id"));
  if (error) throw new Error("Unable to query managed tasks.", { cause: error });
  return data.map(parseTask);
}
