import { projectDetailsSchema, projectContentSchema, projectPublicationSchema, type ProjectDetails, type ProjectContentField } from "./schemas.ts";
import { parseRichTextJson } from "./rich-text.ts";

type ProjectField = keyof ProjectDetails;
type InputError = "required" | "invalid" | "tooLong";

export type ProjectDetailsResult =
  | { success: true; data: ProjectDetails }
  | { success: false; errors: Partial<Record<ProjectField, InputError>> };

function readField(formData: FormData, field: ProjectField): unknown {
  const entries = formData.getAll(field);
  // Preserve duplicates as an invalid value instead of choosing one arbitrarily.
  return entries.length <= 1 ? entries[0] : entries;
}

// Accept only editable details; publication, ordering and identity are separate operations.
export function parseProjectDetails(formData: FormData): ProjectDetailsResult {
  const result = projectDetailsSchema.safeParse({
    name: readField(formData, "name"),
    slug: readField(formData, "slug"),
    description: readField(formData, "description"),
  });
  if (result.success) return { success: true, data: result.data };

  const errors: Partial<Record<ProjectField, InputError>> = {};
  for (const issue of result.error.issues) {
    const [field] = issue.path;
    if (field !== "name" && field !== "slug" && field !== "description") continue;
    const code = issue.message;
    errors[field] ??= code === "required" || code === "tooLong" ? code : "invalid";
  }
  return { success: false, errors };
}

export type ProjectFormField = ProjectContentField | "is_published";

export type ProjectFormState = {
  errors?: Partial<Record<ProjectFormField, InputError>>;
  error?: "unauthorized" | "unavailable" | "slugTaken" | "stale" | "invalid";
};

export function parseProjectContent(form: FormData) {
  const field = (name: ProjectContentField): unknown => {
    const values = form.getAll(name);
    return values.length === 1 ? values[0] : undefined;
  };
  const rich = (name: "description_content" | "objectives_content"): unknown => {
    const parsed = parseRichTextJson(field(name));
    return parsed.success ? parsed.data : undefined;
  };
  const result = projectContentSchema.safeParse({
    name: field("name"), slug: field("slug"),
    description_content: rich("description_content"), objectives_content: rich("objectives_content"),
    repository_url: field("repository_url"),
  });
  if (result.success) return { success: true as const, data: result.data };
  const errors: Partial<Record<ProjectContentField, InputError>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key !== "name" && key !== "slug" && key !== "description_content" && key !== "objectives_content" && key !== "repository_url") continue;
    errors[key] ??= issue.message === "required" || issue.message === "tooLong" ? issue.message : "invalid";
  }
  return { success: false as const, errors };
}

export function parseProjectSubmission(form: FormData) {
  const content = parseProjectContent(form);
  const values = form.getAll("is_published");
  const publication = projectPublicationSchema.safeParse(values.length === 1 ? values[0] : undefined);
  if (!content.success || !publication.success) {
    const errors: Partial<Record<ProjectFormField, InputError>> = {
      ...(!content.success ? content.errors : {}),
      ...(!publication.success ? { is_published: "invalid" as const } : {}),
    };
    return { success: false as const, errors };
  }
  return { success: true as const, data: { ...content.data, is_published: publication.data } };
}
