import "server-only";

import { createPublicSupabaseClient } from "../supabase/public";
import type { Database } from "../supabase/database.types";

export type KanbanColumn = Database["public"]["Tables"]["columns"]["Row"];

export async function listPublishedColumns(projectId: string): Promise<KanbanColumn[]> {
  // The anonymous client and RLS prevent returning private-project columns.
  const { data, error } = await createPublicSupabaseClient()
    .from("columns").select("*").eq("project_id", projectId)
    .order("position").order("id");
  if (error) throw new Error("Unable to query columns.", { cause: error });
  return data;
}
