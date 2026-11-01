import "server-only";

import { createPublicSupabaseClient } from "../supabase/public";
import type { Database } from "../supabase/database.types";

export type KanbanColumn = Database["public"]["Tables"]["columns"]["Row"];

export async function listPublishedColumns(projectId: string): Promise<KanbanColumn[]> {
  // El cliente anónimo y RLS impiden devolver columnas de proyectos privados.
  const { data, error } = await createPublicSupabaseClient()
    .from("columns").select("*").eq("project_id", projectId)
    .order("position").order("id");
  if (error) throw new Error("No se pudieron consultar las columnas.", { cause: error });
  return data;
}
