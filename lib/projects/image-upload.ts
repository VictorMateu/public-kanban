import { IMAGE_UPLOAD_FIELDS, imageUploadResultSchema, type ImageUploadResult } from "./image-input.ts";
import { PROJECT_IMAGE_UPLOAD_PATH } from "./urls.ts";

export async function uploadProjectImage(projectId: string, file: File, taskId?: string, commentId?: string): Promise<ImageUploadResult> {
  try {
    const body = new FormData();
    body.set(IMAGE_UPLOAD_FIELDS.projectId, projectId);
    body.set(IMAGE_UPLOAD_FIELDS.file, file);
    if (taskId) body.set(IMAGE_UPLOAD_FIELDS.taskId, taskId);
    if (commentId) body.set(IMAGE_UPLOAD_FIELDS.commentId, commentId);
    const response = await fetch(PROJECT_IMAGE_UPLOAD_PATH, { method: "POST", body });
    const payload: unknown = await response.json();
    const parsed = imageUploadResultSchema.safeParse(payload);
    return parsed.success ? parsed.data : { success: false, error: "uploadUnavailable" };
  } catch { return { success: false, error: "uploadUnavailable" }; }
}
