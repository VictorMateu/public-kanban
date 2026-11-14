"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdministrator } from "../../lib/auth/server";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { parseProjectContent, projectIdentitySchema, type ProjectFormState } from "../../lib/projects/input";
import { richTextAssetIds, richTextToPlainText } from "../../lib/projects/rich-text";

function single(form: FormData, name: string): unknown {
  const values = form.getAll(name);
  return values.length === 1 ? values[0] : undefined;
}

export async function saveProject(_previous: ProjectFormState, form: FormData): Promise<ProjectFormState> {
  let destination: string;
  try {
    const client = await createServerSupabaseClient(true);
    if (!await getAdministrator(client)) return { error: "unauthorized" };
    const input = parseProjectContent(form);
    if (!input.success) return { errors: input.errors };
    const rawId = single(form, "id");
    const identity = rawId === "" ? null : projectIdentitySchema.safeParse({ id: rawId, updated_at: single(form, "updated_at") });
    if (identity && !identity.success) return { error: "invalid" };
    const id = identity?.success ? identity.data.id : null;
    const assets = [...new Set([...richTextAssetIds(input.data.description_content), ...richTextAssetIds(input.data.objectives_content)])];
    if (assets.length) {
      if (!id) return { error: "invalid" };
      const available = await client.from("project_assets").select("id").eq("project_id", id).eq("status", "ready").in("id", assets);
      if (available.error || available.data.length !== assets.length) return { error: "invalid" };
    }
    const payload = {
      ...input.data,
      description: input.data.description_content ? [...richTextToPlainText(input.data.description_content)].slice(0, 5000).join("") || null : null,
    };
    const mutation = id && identity?.success
      ? client.from("projects").update(payload).eq("id", id).eq("updated_at", identity.data.updated_at).select("id").maybeSingle()
      : client.from("projects").insert(payload).select("id").single();
    const result = await mutation;
    if (result.error) return { error: result.error.code === "23505" ? "slugTaken" : "unavailable" };
    if (!result.data) return { error: "stale" };
    destination = "/projects/" + encodeURIComponent(input.data.slug) + "?edit=1&saved=1";
  } catch { return { error: "unavailable" }; }
  revalidatePath("/projects", "layout");
  redirect(destination);
}

export async function setProjectPublication(_previous: ProjectFormState, form: FormData): Promise<ProjectFormState> {
  const identity = projectIdentitySchema.safeParse({ id: single(form, "id"), updated_at: single(form, "updated_at") });
  let destination: string;
  const published = z.enum(["true", "false"]).safeParse(single(form, "is_published"));
  if (!identity.success || !published.success) return { error: "invalid" };
  try {
    const client = await createServerSupabaseClient(true);
    if (!await getAdministrator(client)) return { error: "unauthorized" };
    const { data, error } = await client.from("projects").update({ is_published: published.data === "true" })
      .eq("id", identity.data.id).eq("updated_at", identity.data.updated_at).select("slug").maybeSingle();
    if (error) return { error: "unavailable" };
    if (!data) return { error: "stale" };
    destination = "/projects/" + encodeURIComponent(data.slug);
  } catch { return { error: "unavailable" }; }
  revalidatePath("/projects", "layout");
  redirect(destination);
}
