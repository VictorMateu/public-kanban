import "server-only";

import { getAdministrator } from "../auth/server";
import { createServerSupabaseClient } from "../supabase/server";

import { createPublicSupabaseClient } from "../supabase/public";
import type { Database } from "../supabase/database.types";
import { richTextDocumentSchema } from "./rich-text";
import { projectStatusSchema, publicProjectSummarySchema, projectSummarySchema, type ProjectStatus, type ProjectSummary } from "./schemas";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type Project = Omit<ProjectRow, "status"> & { status: ProjectStatus };
export type ListedProject = ProjectSummary & { cover: { assetId: string; alt: string } | null };
const readProject = (project: ProjectRow): Project => ({ ...project, status: projectStatusSchema.parse(project.status) });

function descriptionCover(content: unknown): ListedProject["cover"] {
  if (content === null) return null;
  const document = richTextDocumentSchema.safeParse(content);
  return document.success ? document.data.content.find((node) => node.type === "image")?.attrs ?? null : null;
}

export async function listPublishedProjects(): Promise<ListedProject[]> {
  const client = createPublicSupabaseClient();
  const { data, error } = await client.rpc("list_project_summaries");
  if (error) throw new Error("Unable to query projects.", { cause: error });
  const summaries = publicProjectSummarySchema.array().parse(data);
  const visibleIds = summaries.filter((summary) => !summary.is_hidden).map((summary) => summary.id);

  // The RPC can list hidden projects. Fetch covers only from rows allowed by the public RLS policy.
  // Batch IDs to keep each PostgREST URL small and let missing covers fall back independently.
  const reads = [];
  for (let offset = 0; offset < visibleIds.length; offset += 100) {
    reads.push(client.from("projects").select("id, description, description_content")
      .eq("is_published", true).eq("is_hidden", false).in("id", visibleIds.slice(offset, offset + 100)));
  }
  const results = await Promise.all(reads);
  const descriptions = new Map(results.flatMap(({ data }) => data?.map((row) => [row.id, row] as const) ?? []));
  return summaries.map((summary) => {
    const row = descriptions.get(summary.id);
    return {
      ...summary,
      description: row ? row.description : summary.description,
      cover: row ? descriptionCover(row.description_content) : null,
    };
  });
}

export async function getPublishedProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await createPublicSupabaseClient()
    .from("projects").select("*").eq("is_published", true).eq("is_hidden", false).eq("slug", slug).maybeSingle();
  if (error) throw new Error("Unable to query the project.", { cause: error });
  return data ? readProject(data) : null;
}

// Private queries authorize independently; public queries above always stay anonymous.
export async function listManagedProjects(): Promise<ListedProject[]> {
  const client = await createServerSupabaseClient();
  if (!await getAdministrator(client)) throw new Error("Administrator authorization required.");
  const { data, error } = await client.from("projects").select("id, slug, name, description, status, is_hidden, is_published, position, description_content").order("position").order("id");
  if (error) throw new Error("Unable to query managed projects.", { cause: error });
  return data.map(({ description_content, ...summary }) => ({
    ...projectSummarySchema.parse(summary),
    cover: descriptionCover(description_content),
  }));
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
