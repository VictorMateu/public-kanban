"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdministrator } from "../../lib/auth/server";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { parseProjectSubmission, type ProjectFormState } from "../../lib/projects/input";
import { projectIdentityFields, projectIdentitySchema, type ProjectDraftResult } from "../../lib/projects/schemas";
import { richTextAssetIds, richTextToPlainText } from "../../lib/projects/rich-text";
import { READY_PROJECT_IMAGE } from "../../lib/projects/image-storage";
import { savedProjectUrl } from "../../lib/projects/urls";
import { UNIQUE_VIOLATION } from "../../lib/supabase/sqlstate";

function single(form: FormData, name: string): unknown {
  const values = form.getAll(name);
  return values.length === 1 ? values[0] : undefined;
}

async function persistProject(form: FormData, draftOnly: boolean): Promise<ProjectDraftResult> {
  try {
    const client = await createServerSupabaseClient(true);
    if (!await getAdministrator(client)) return { success: false, state: { error: "unauthorized" } };
    const input = parseProjectSubmission(form);
    if (!input.success) return { success: false, state: { errors: input.errors } };
    const rawId = single(form, projectIdentityFields.id);
    const initialDraft = draftOnly && single(form, projectIdentityFields.updated_at) === "";
    const requestedId = initialDraft ? z.uuid().safeParse(rawId) : null;
    if (draftOnly && (input.data.is_published || rawId === "" || (requestedId && !requestedId.success))) return { success: false, state: { error: "invalid" } };
    const identity = rawId === "" || initialDraft ? null : projectIdentitySchema.safeParse({ id: rawId, updated_at: single(form, projectIdentityFields.updated_at) });
    if (identity && !identity.success) return { success: false, state: { error: "invalid" } };
    const id = identity?.success ? identity.data.id : requestedId?.success ? requestedId.data : null;
    const assets = [...new Set([...richTextAssetIds(input.data.description_content), ...richTextAssetIds(input.data.objectives_content)])];
    if (assets.length) {
      if (!id) return { success: false, state: { error: "invalid" } };
      const available = await client.from("project_assets").select("id").eq("project_id", id).is("task_id", null).eq("status", READY_PROJECT_IMAGE).in("id", assets);
      if (available.error || available.data.length !== assets.length) return { success: false, state: { error: "invalid" } };
    }
    const payload = {
      ...input.data,
      description: input.data.description_content ? [...richTextToPlainText(input.data.description_content)].slice(0, 5000).join("") || null : null,
    };
    const mutation = identity?.success
      ? (() => {
        const update = client.from("projects").update(payload).eq("id", identity.data.id).eq("updated_at", identity.data.updated_at);
        return (draftOnly ? update.eq("is_published", false) : update).select("id, updated_at, slug").maybeSingle();
      })()
      : client.from("projects").insert({ ...payload, ...(id ? { id } : {}) }).select("id, updated_at, slug").single();
    const result = await mutation;
    // The browser reuses this UUID if a successful draft response is lost.
    // Never overwrite an existing row or turn a published project into a draft.
    if (initialDraft && id && result.error?.code === UNIQUE_VIOLATION) {
      const existing = await client.from("projects").select("id, updated_at, created_at, slug").eq("id", id).eq("is_published", false).maybeSingle();
      if (!existing.error && existing.data) {
        if (existing.data.created_at !== existing.data.updated_at) return { success: false, state: { error: "stale" } };
        return { success: true, project: { id: existing.data.id, updated_at: existing.data.updated_at, slug: existing.data.slug } };
      }
    }
    if (result.error) return { success: false, state: { error: result.error.code === UNIQUE_VIOLATION ? "slugTaken" : "unavailable" } };
    if (!result.data) return { success: false, state: { error: "stale" } };
    return { success: true, project: result.data };
  } catch { return { success: false, state: { error: "unavailable" } }; }
}

export async function saveProjectDraft(form: FormData): Promise<ProjectDraftResult> {
  return persistProject(form, true);
}

export async function saveProject(_previous: ProjectFormState, form: FormData): Promise<ProjectFormState> {
  const result = await persistProject(form, false);
  if (!result.success) return result.state;
  revalidatePath("/projects", "layout");
  redirect(savedProjectUrl(result.project.slug));
}
