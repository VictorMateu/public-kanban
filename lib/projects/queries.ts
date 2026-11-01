import "server-only";

import { createPublicSupabaseClient } from "../supabase/public";
import type { Database } from "../supabase/database.types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];

export async function listPublishedProjects(): Promise<Project[]> {
  const { data, error } = await createPublicSupabaseClient()
    .from("projects").select("*").eq("is_published", true)
    .order("position").order("id");
  if (error) throw new Error("No se pudieron consultar los proyectos.", { cause: error });
  return data;
}

export async function getPublishedProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await createPublicSupabaseClient()
    .from("projects").select("*").eq("is_published", true).eq("slug", slug).maybeSingle();
  if (error) throw new Error("No se pudo consultar el proyecto.", { cause: error });
  return data;
}
