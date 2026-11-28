import { randomUUID } from "node:crypto";
import { getAdministrator } from "../../lib/auth/server";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import { ImageInputError, normalizeProjectImage, readImageForm } from "../../lib/projects/image-processing";
import { IMAGE_LIMITS, PROJECT_IMAGE_MIME_TYPE, parseImageUploadForm, type ImageUploadResult } from "../../lib/projects/image-input";
import { PROJECT_IMAGE_BUCKET, READY_PROJECT_IMAGE } from "../../lib/projects/image-storage";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
const result = (value: ImageUploadResult, status: number) => Response.json(value, { status, headers });

export async function POST(request: Request) {
  // Cookie-authenticated uploads require a same-origin browser request.
  const source = request.headers.get("origin");
  let sameOrigin = false;
  try {
    const origin = new URL(source ?? "");
    // Next can use an internal hostname in request.url; the browser-facing Host is authoritative here.
    sameOrigin = origin.origin === source && origin.host === request.headers.get("host") && origin.protocol === new URL(request.url).protocol;
  } catch { /* Missing, null or malformed origins fail closed. */ }
  if (!sameOrigin) return result({ success: false, error: "unauthorized" }, 403);
  if (!isSupabaseConfigured()) return result({ success: false, error: "uploadUnavailable" }, 503);
  try {
    const client = await createServerSupabaseClient(true);
    if (!await getAdministrator(client)) return result({ success: false, error: "unauthorized" }, 401);
    const input = parseImageUploadForm(await readImageForm(request));
    if (!input) return result({ success: false, error: "invalidImage" }, 400);
    const { projectId, taskId, commentId, file } = input;
    if (file.size > IMAGE_LIMITS.sourceBytes) return result({ success: false, error: "imageTooLarge" }, 413);
    const project = await client.from("projects").select("id").eq("id", projectId).maybeSingle();
    if (project.error || !project.data) return result({ success: false, error: "invalidImage" }, 400);
    if (taskId) {
      const task = await client.from("tasks").select("project_id, archived_at").eq("id", taskId).maybeSingle();
      if (task.error || (commentId && !task.data) || (task.data && (task.data.project_id !== projectId || task.data.archived_at))) {
        return result({ success: false, error: "invalidImage" }, 400);
      }
      if (commentId) {
        const comment = await client.from("task_comments").select("task_id").eq("id", commentId).maybeSingle();
        if (comment.error || (comment.data && comment.data.task_id !== taskId)) {
          return result({ success: false, error: "invalidImage" }, 400);
        }
      }
    }
    const image = await normalizeProjectImage(Buffer.from(await file.arrayBuffer()), file.type);
    const assetId = randomUUID();
    const objectPath = projectId + "/" + assetId + ".webp";
    const inserted = await client.from("project_assets").insert({
      id: assetId, project_id: projectId, task_id: commentId ? null : taskId, comment_id: commentId,
      object_path: objectPath, byte_size: image.bytes.length, width: image.width, height: image.height,
    });
    if (inserted.error) return result({ success: false, error: "uploadUnavailable" }, 503);
    let ready = false;
    try {
      const upload = await client.storage.from(PROJECT_IMAGE_BUCKET).upload(objectPath, image.bytes, { contentType: PROJECT_IMAGE_MIME_TYPE, cacheControl: "0", upsert: false });
      if (upload.error) return result({ success: false, error: "uploadUnavailable" }, 503);
      const saved = await client.from("project_assets").update({ status: READY_PROJECT_IMAGE }).eq("id", assetId).eq("project_id", projectId).select("id").single();
      if (saved.error) return result({ success: false, error: "uploadUnavailable" }, 503);
      ready = true;
      return result({ success: true, assetId }, 201);
    } finally {
      if (!ready) {
        // Compensate only this request's new asset. Preserve its row if object removal fails.
        const removed = await client.storage.from(PROJECT_IMAGE_BUCKET).remove([objectPath]);
        if (!removed.error) await client.from("project_assets").delete().eq("id", assetId).eq("project_id", projectId);
      }
    }
  } catch (error) {
    if (error instanceof ImageInputError) return result({ success: false, error: error.code }, error.code === "imageTooLarge" ? 413 : 400);
    return result({ success: false, error: "uploadUnavailable" }, 503);
  }
}
