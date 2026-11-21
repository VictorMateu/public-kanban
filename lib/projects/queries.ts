import "server-only";

import { getAdministrator } from "../auth/server";
import { createServerSupabaseClient } from "../supabase/server";

import { createPublicSupabaseClient } from "../supabase/public";
import type { Database } from "../supabase/database.types";
import { projectStatusSchema, publicProjectSummarySchema, projectSummarySchema, type ProjectStatus, type ProjectSummary } from "./schemas";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type Project = Omit<ProjectRow, "status"> & { status: ProjectStatus };
const readProject = (project: ProjectRow): Project => ({ ...project, status: projectStatusSchema.parse(project.status) });

export async function listPublishedProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await createPublicSupabaseClient().rpc("list_project_summaries");
  if (error) throw new Error("Unable to query projects.", { cause: error });
  // Local instances may include the excerpt projection from another branch.
  // Preserve this catalog's hidden-project boundary before parsing the response.
  const summaries = data.map((project) => project.is_hidden === true ? { ...project, description: null } : project);
  return publicProjectSummarySchema.array().parse(summaries);
}

export async function getPublishedProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await createPublicSupabaseClient()
    .from("projects").select("*").eq("is_published", true).eq("is_hidden", false).eq("slug", slug).maybeSingle();
  if (error) throw new Error("Unable to query the project.", { cause: error });
  return data ? readProject(data) : null;
}

// Private queries authorize independently; public queries above always stay anonymous.
export async function listManagedProjects(): Promise<ProjectSummary[]> {
  const client = await createServerSupabaseClient();
  if (!await getAdministrator(client)) throw new Error("Administrator authorization required.");
  const { data, error } = await client.from("projects").select("id, slug, name, description, status, is_hidden, is_published, position").order("position").order("id");
  if (error) throw new Error("Unable to query managed projects.", { cause: error });
  return projectSummarySchema.array().parse(data);
}

export async function listCancellationReasons(projectIds: string[], administrator: boolean): Promise<Map<string, string>> {
  if (projectIds.length === 0) return new Map();
  const client = administrator ? await createServerSupabaseClient() : createPublicSupabaseClient();
  if (administrator && !await getAdministrator(client)) throw new Error("Administrator authorization required.");
  const query = client.from("projects").select("id, cancellation_reason").eq("status", "cancelled").in("id", projectIds);
  const { data, error } = await (administrator ? query : query.eq("is_published", true).eq("is_hidden", false));
  if (error) throw new Error("Unable to query project cancellation reasons.", { cause: error });
  return new Map(data.flatMap(({ id, cancellation_reason }) => cancellation_reason ? [[id, cancellation_reason]] : []));
}

export async function getManagedProjectBySlug(slug: string): Promise<Project | null> {
  const client = await createServerSupabaseClient();
  if (!await getAdministrator(client)) throw new Error("Administrator authorization required.");
  const { data, error } = await client.from("projects").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error("Unable to query the managed project.", { cause: error });
  return data ? readProject(data) : null;
}
