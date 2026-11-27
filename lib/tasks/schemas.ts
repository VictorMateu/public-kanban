import { z } from "zod";
import { optionalRichText, parseRichTextJson, richTextToPlainText } from "../projects/rich-text.ts";
import type { Database } from "../supabase/database.types.ts";

export const TASK_DESCRIPTION_LIMIT = 10000;
export const TASK_TAG_LIMIT = 5;
export const TASK_TAG_LENGTH_LIMIT = 30;
export const taskTagsSchema = z.array(z.string().trim().min(1)
  .refine((tag) => !tag.includes("\0") && [...tag].length <= TASK_TAG_LENGTH_LIMIT))
  .max(TASK_TAG_LIMIT)
  .refine((tags) => new Set(tags.map((tag) => tag.toLowerCase())).size === tags.length);
export const taskPrioritySchema = z.enum(["low", "medium", "high"]);
export const boardStageSchema = z.enum(["todo", "in_progress", "review", "done"]);

// PostgreSQL checks character limits in Unicode code points.
export const taskDetailsSchema = z.strictObject({
  title: z.string().trim().min(1)
    .refine((value) => !value.includes("\0") && [...value].length <= 200),
  description: z.string()
    .refine((value) => !value.includes("\0") && [...value].length <= TASK_DESCRIPTION_LIMIT)
    .transform((value) => value.trim() ? value : null),
  priority: z.union([z.literal(""), taskPrioritySchema]).transform((value) => value || null),
  due_date: z.union([z.literal(""), z.iso.date().refine((value) => !value.startsWith("0000-"))])
    .transform((value) => value || null),
}) satisfies z.ZodType<Pick<Database["public"]["Tables"]["tasks"]["Insert"], "title" | "description" | "priority" | "due_date">>;

const taskIdentity = { projectId: z.uuid(), taskId: z.uuid() };
const taskVersion = { ...taskIdentity, version: z.iso.datetime({ offset: true }) };
const taskDescriptionContent = z.string().transform((value, context) => {
  const parsed = parseRichTextJson(value);
  if (!parsed.success || [...richTextToPlainText(parsed.data)].length > TASK_DESCRIPTION_LIMIT) {
    context.issues.push({ code: "custom", input: value, message: "Invalid task description" });
    return z.NEVER;
  }
  return optionalRichText(parsed.data);
});
const taskFields = {
  ...taskDetailsSchema.shape, descriptionContent: taskDescriptionContent.optional(), columnId: z.uuid(), hidden: z.boolean(),
  tags: taskTagsSchema.optional(),
};

export const taskMutationSchema = z.discriminatedUnion("operation", [
  z.strictObject({ operation: z.literal("create"), ...taskIdentity, ...taskFields }),
  z.strictObject({ operation: z.literal("edit"), ...taskVersion, ...taskFields }),
  z.strictObject({ operation: z.literal("move"), ...taskVersion, columnId: z.uuid(), beforeId: z.uuid().nullable() }),
  z.strictObject({ operation: z.literal("archive"), ...taskVersion }),
]);

export type TaskMutation = z.input<typeof taskMutationSchema>;
export const taskMutationRpcResultSchema = z.enum(["ok", "invalid", "stale"]);
export type TaskMutationResult = z.infer<typeof taskMutationRpcResultSchema> | "unauthorized" | "unavailable";
