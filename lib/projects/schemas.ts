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
