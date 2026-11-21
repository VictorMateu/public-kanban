import { parseProjectSubmission, type ProjectFormState } from "./input.ts";
import { richTextAssetIds, plainTextDocument } from "./rich-text.ts";
import { projectFormFields, projectIdentityFields, projectDraftResultSchema, type ProjectIdentity } from "./schemas.ts";
import type { ProjectImageStaging } from "./image-staging.ts";
import type { ImageUploadResult } from "./image-input.ts";

export type CreationImageSession = { attemptId?: string; project?: ProjectIdentity };

export async function prepareCreationImages(form: FormData, images: ProjectImageStaging, session: CreationImageSession, operations: {
  saveDraft: (form: FormData) => Promise<unknown>;
  upload: (projectId: string, file: File) => Promise<ImageUploadResult>;
  onDraftSaved: (identity: ProjectIdentity) => void;
}) {
  const input = parseProjectSubmission(form);
  if (!input.success) return { success: false, state: { errors: input.errors } } as const;
  const ids = [...new Set([...richTextAssetIds(input.data.description_content), ...richTextAssetIds(input.data.objectives_content)])];
  if (!ids.some((id) => images.get(id)) && !session.project && !session.attemptId) return { success: true, form } as const;
  const attemptId = session.attemptId ??= crypto.randomUUID();
  const resolved = () => {
    const result = new FormData();
    for (const [key, value] of form) result.append(key, value);
    result.set(projectIdentityFields.id, session.project?.id ?? attemptId);
    result.set(projectIdentityFields.updated_at, session.project?.updated_at ?? "");
    result.set(projectFormFields.description_content, JSON.stringify(images.resolve(input.data.description_content ?? plainTextDocument(null))));
    result.set(projectFormFields.objectives_content, JSON.stringify(images.resolve(input.data.objectives_content ?? plainTextDocument(null))));
    return result;
  };
  async function saveDraft(): Promise<ProjectFormState | null> {
    const draft = resolved(); draft.set(projectFormFields.is_published, "false");
    const parsed = projectDraftResultSchema.safeParse(await operations.saveDraft(draft));
    if (!parsed.success) return { error: "unavailable" };
    if (!parsed.data.success) return parsed.data.state;
    // Never accept a response for another creation attempt.
    if (parsed.data.project.id !== attemptId) return { error: "invalid" };
    session.project = parsed.data.project;
    operations.onDraftSaved(parsed.data.project);
    return null;
  }
  try {
    if (!session.project) {
      const error = await saveDraft();
      if (error) return { success: false, state: error } as const;
    }
    const projectId = session.project?.id;
    if (!projectId) return { success: false, state: { error: "invalid" } } as const;
    for (const id of ids) {
      const image = images.get(id);
      if (!image || image.uploadedId) continue;
      const uploaded = await operations.upload(projectId, image.file);
      if (!uploaded.success) {
        // Keep successful references in the private draft as well as the retry cache.
        const error = await saveDraft();
        return { success: false, state: error ?? { error: uploaded.error === "unauthorized" ? "unauthorized" : "imageUploadFailed" } } as const;
      }
      images.uploaded(id, uploaded.assetId);
    }
    const error = await saveDraft();
    if (error) return { success: false, state: error } as const;
    return { success: true, form: resolved() } as const;
  } catch { return { success: false, state: { error: "unavailable" } } as const; }
}
