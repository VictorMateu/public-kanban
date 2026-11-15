import { imageUploadResultSchema, type ImageUploadResult } from "./image-input.ts";

export async function uploadProjectImage(projectId: string, file: File): Promise<ImageUploadResult> {
  try {
    const body = new FormData();
    body.set("project_id", projectId); body.set("file", file);
    const response = await fetch("/project-images", { method: "POST", body });
    const payload: unknown = await response.json();
    const parsed = imageUploadResultSchema.safeParse(payload);
    return parsed.success ? parsed.data : { success: false, error: "uploadUnavailable" };
  } catch { return { success: false, error: "uploadUnavailable" }; }
}
