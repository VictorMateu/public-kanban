import { z } from "zod";
import { richTextDocumentSchema, optionalRichText, safeLinkSchema } from "./rich-text.ts";
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

export const projectContentSchema = projectDetailsSchema.pick({ name: true, slug: true }).extend({
  description_content: richTextDocumentSchema.transform(optionalRichText).nullable(),
  objectives_content: richTextDocumentSchema.transform(optionalRichText).nullable(),
  repository_url: z.union([z.literal(""), safeLinkSchema]).nullable().transform((value) => value || null),
});
export type ProjectContent = z.infer<typeof projectContentSchema>;
export type ProjectContentField = keyof ProjectContent;

export const projectIdentitySchema = z.strictObject({ id: z.uuid(), updated_at: z.iso.datetime({ offset: true }) });

export const projectPublicationSchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const projectStatusSchema = z.enum(["development", "maintenance", "completed", "cancelled"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectManagementSchema = z.strictObject({
  status: projectStatusSchema,
  is_hidden: projectPublicationSchema,
  cancellation_reason: requiredText().trim()
    .refine((value) => [...value].length <= 2000, { error: "tooLong" })
    .transform((value) => value || null),
}).superRefine((value, context) => {
  if (value.status === "cancelled" && !value.cancellation_reason) {
    context.addIssue({ code: "custom", path: ["cancellation_reason"], message: "required" });
  }
});

export const projectSummarySchema = z.strictObject({
  id: z.uuid(), slug: projectDetailsSchema.shape.slug.nullable(),
  name: projectDetailsSchema.shape.name, description: z.string().nullable(),
  status: projectStatusSchema, is_hidden: z.boolean(), is_published: z.boolean(),
  position: z.number().int().nonnegative(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export const publicProjectSummarySchema = projectSummarySchema.refine(
  (value) => value.is_published && (value.is_hidden
    ? value.slug === null && value.description === null
    : value.slug !== null),
);

export const projectFormFieldSchema = z.enum(["name", "slug", "description_content", "objectives_content", "repository_url", "is_published", "status", "is_hidden", "cancellation_reason"]);
export const projectFormStateSchema = z.strictObject({
  errors: z.partialRecord(projectFormFieldSchema, z.enum(["required", "invalid", "tooLong"])).optional(),
  error: z.enum(["unauthorized", "unavailable", "slugTaken", "stale", "invalid", "imageUploadFailed"]).optional(),
});
export const projectDraftResultSchema = z.discriminatedUnion("success", [
  z.strictObject({ success: z.literal(true), project: projectIdentitySchema.extend({ slug: projectDetailsSchema.shape.slug }) }),
  z.strictObject({ success: z.literal(false), state: projectFormStateSchema }),
]);
export type ProjectIdentity = z.infer<typeof projectIdentitySchema>;
export type ProjectDraftResult = z.infer<typeof projectDraftResultSchema>;
export type ProjectFormField = z.infer<typeof projectFormFieldSchema>;
export type ProjectFormState = z.infer<typeof projectFormStateSchema>;
