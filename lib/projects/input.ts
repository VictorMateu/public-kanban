import { z } from "zod";
import { richTextDocumentSchema, parseRichTextJson, optionalRichText, safeLinkSchema } from "./rich-text.ts";
import { isProjectSlug } from "./slug.ts";
import type { Database } from "../supabase/database.types.ts";

const requiredText = () => z.string({
  error: (issue) => issue.input === undefined ? "required" : "invalid",
}).refine((value) => !value.includes("\0"), { error: "invalid" });

export const projectDetailsSchema = z.strictObject({
  name: requiredText().trim().min(1, { error: "required" })
    // PostgreSQL char_length counts Unicode code points rather than UTF-16 code units.
    .refine((value) => [...value].length <= 120, { error: "tooLong" }),
  slug: requiredText().min(1, { error: "required" })
    .refine(isProjectSlug, { error: "invalid" }),
  description: z.string({ error: "invalid" })
    .refine((value) => !value.includes("\0"), { error: "invalid" })
    .refine((value) => [...value].length <= 5000, { error: "tooLong" })
    .transform((value) => value || null)
    .nullable().default(null),
}) satisfies z.ZodType<Pick<Database["public"]["Tables"]["projects"]["Insert"], "name" | "slug" | "description">>;

export type ProjectDetailsInput = z.input<typeof projectDetailsSchema>;
export type ProjectDetails = z.output<typeof projectDetailsSchema>;
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


export const projectContentSchema = projectDetailsSchema.pick({ name: true, slug: true }).extend({
  description_content: richTextDocumentSchema.transform(optionalRichText).nullable(),
  objectives_content: richTextDocumentSchema.transform(optionalRichText).nullable(),
  repository_url: z.union([z.literal(""), safeLinkSchema]).nullable().transform((value) => value || null),
});
export type ProjectContent = z.infer<typeof projectContentSchema>;
export type ProjectContentField = keyof ProjectContent;
export type ProjectFormState = {
  errors?: Partial<Record<ProjectContentField, InputError>>;
  error?: "unauthorized" | "unavailable" | "slugTaken" | "stale" | "invalid";
};
export const projectIdentitySchema = z.strictObject({ id: z.uuid(), updated_at: z.iso.datetime({ offset: true }) });

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
