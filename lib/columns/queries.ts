import "server-only";

import { getAdministrator } from "../auth/server";
import { createServerSupabaseClient } from "../supabase/server";

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

export async function listManagedColumns(projectId: string): Promise<KanbanColumn[]> {
  const client = await createServerSupabaseClient();
  if (!await getAdministrator(client)) throw new Error("Administrator authorization required.");
  const { data, error } = await client.from("columns").select("*").eq("project_id", projectId).order("position").order("id");
  if (error) throw new Error("Unable to query managed columns.", { cause: error });
  return data;
}
