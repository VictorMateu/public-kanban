import "server-only";

import { getAdministrator } from "../auth/server";
import { createServerSupabaseClient } from "../supabase/server";

import type { z } from "zod";

import { createPublicSupabaseClient } from "../supabase/public";
import type { Database } from "../supabase/database.types";
import { taskPrioritySchema } from "./schemas";

const prioritySchema = taskPrioritySchema.nullable();
// PostgreSQL TEXT CHECK constraints generate a string type; validate before narrowing it.
export type Task = Omit<Database["public"]["Tables"]["tasks"]["Row"], "priority"> & { priority: z.infer<typeof prioritySchema> };

export async function listPublishedTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await createPublicSupabaseClient()
    .from("tasks").select("*").eq("project_id", projectId)
    .order("position").order("id");
  if (error) throw new Error("Unable to query tasks.", { cause: error });
  return data.map((row) => ({ ...row, priority: prioritySchema.parse(row.priority) }));
}

export async function listManagedTasks(projectId: string): Promise<Task[]> {
  const client = await createServerSupabaseClient();
  if (!await getAdministrator(client)) throw new Error("Administrator authorization required.");
  const { data, error } = await client.from("tasks").select("*").eq("project_id", projectId)
    .is("archived_at", null).order("position").order("id");
  if (error) throw new Error("Unable to query managed tasks.", { cause: error });
  return data.map((row) => ({ ...row, priority: prioritySchema.parse(row.priority) }));
}
