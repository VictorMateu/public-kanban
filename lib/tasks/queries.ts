import "server-only";

import { createPublicSupabaseClient } from "../supabase/public";
import type { Database } from "../supabase/database.types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];

export async function listPublishedTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await createPublicSupabaseClient()
    .from("tasks").select("*").eq("project_id", projectId)
    .order("position").order("id");
  if (error) throw new Error("No se pudieron consultar las tareas.", { cause: error });
  return data;
}
