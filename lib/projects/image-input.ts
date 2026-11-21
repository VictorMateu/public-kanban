import { z } from "zod";

export const IMAGE_LIMITS = { sourceBytes: 8 * 1024 * 1024, stagedBytes: 32 * 1024 * 1024, requestBytes: 8 * 1024 * 1024 + 65536, pixels: 25_000_000, outputBytes: 2 * 1024 * 1024, dimension: 4096 } as const;
export const IMAGE_UPLOAD_FIELDS = { projectId: "project_id", taskId: "task_id", file: "file" } as const;
const imageUploadFieldNames = new Set<string>(Object.values(IMAGE_UPLOAD_FIELDS));
const imageUploadFormSchema = z.strictObject({
  projectId: z.uuid(),
  taskId: z.uuid().optional(),
  file: z.instanceof(File).refine((file) => file.size > 0),
});

export function parseImageUploadForm(form: FormData) {
  const { projectId, taskId, file } = IMAGE_UPLOAD_FIELDS;
  if ([...form.keys()].some((key) => !imageUploadFieldNames.has(key))) return null;
  const projectIds = form.getAll(projectId);
  const taskIds = form.getAll(taskId);
  const files = form.getAll(file);
  if (projectIds.length !== 1 || taskIds.length > 1 || files.length !== 1) return null;
  const parsed = imageUploadFormSchema.safeParse({ projectId: projectIds[0], taskId: taskIds[0], file: files[0] });
  return parsed.success ? parsed.data : null;
}
export const imageAltSchema = z.string().trim().min(1).max(300).refine((text) => !text.includes("\0"));
export const imageUploadResultSchema = z.discriminatedUnion("success", [
  z.strictObject({ success: z.literal(true), assetId: z.uuid() }),
  z.strictObject({ success: z.literal(false), error: z.enum(["unauthorized", "invalidImage", "imageTooLarge", "uploadUnavailable"]) }),
]);
export type ImageUploadResult = z.infer<typeof imageUploadResultSchema>;

export const PROJECT_IMAGE_MIME_TYPE = "image/webp";
const inputMimeTypes = z.enum(["image/jpeg", "image/png", PROJECT_IMAGE_MIME_TYPE]);
export const PROJECT_IMAGE_ACCEPT = inputMimeTypes.options.join(",");
export const stagedImageFileSchema = z.instanceof(File).refine((file) => file.size > 0 && inputMimeTypes.safeParse(file.type).success);
