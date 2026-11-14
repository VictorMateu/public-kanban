import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdministrator } from "../../lib/auth/server";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import { ImageInputError, normalizeProjectImage, readImageForm } from "../../lib/projects/image-processing";
import { IMAGE_LIMITS, type ImageUploadResult } from "../../lib/projects/image-input";

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
    const form = await readImageForm(request);
    if ([...form.keys()].some((key) => key !== "project_id" && key !== "file")) return result({ success: false, error: "invalidImage" }, 400);
    const projectId = z.uuid().safeParse(form.getAll("project_id").length === 1 ? form.get("project_id") : undefined);
    const files = form.getAll("file");
    const file = files.length === 1 ? files[0] : null;
    if (!projectId.success || !(file instanceof File) || !file.size) return result({ success: false, error: "invalidImage" }, 400);
    if (file.size > IMAGE_LIMITS.sourceBytes) return result({ success: false, error: "imageTooLarge" }, 413);
    const project = await client.from("projects").select("id").eq("id", projectId.data).maybeSingle();
    if (project.error || !project.data) return result({ success: false, error: "invalidImage" }, 400);
    const image = await normalizeProjectImage(Buffer.from(await file.arrayBuffer()), file.type);
    const assetId = randomUUID();
    const objectPath = projectId.data + "/" + assetId + ".webp";
    const inserted = await client.from("project_assets").insert({ id: assetId, project_id: projectId.data, object_path: objectPath, byte_size: image.bytes.length, width: image.width, height: image.height });
    if (inserted.error) return result({ success: false, error: "uploadUnavailable" }, 503);
    let ready = false;
    try {
      const upload = await client.storage.from("project-images").upload(objectPath, image.bytes, { contentType: "image/webp", cacheControl: "0", upsert: false });
      if (upload.error) return result({ success: false, error: "uploadUnavailable" }, 503);
      const saved = await client.from("project_assets").update({ status: "ready" }).eq("id", assetId).eq("project_id", projectId.data).select("id").single();
      if (saved.error) return result({ success: false, error: "uploadUnavailable" }, 503);
      ready = true;
      return result({ success: true, assetId }, 201);
    } finally {
      if (!ready) {
        // Compensate only this request's new asset. Preserve its row if object removal fails.
        const removed = await client.storage.from("project-images").remove([objectPath]);
        if (!removed.error) await client.from("project_assets").delete().eq("id", assetId).eq("project_id", projectId.data);
      }
    }
  } catch (error) {
    if (error instanceof ImageInputError) return result({ success: false, error: error.code }, error.code === "imageTooLarge" ? 413 : 400);
    return result({ success: false, error: "uploadUnavailable" }, 503);
  }
}
