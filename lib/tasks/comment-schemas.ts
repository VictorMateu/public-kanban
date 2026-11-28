import { z } from "zod";
import { optionalRichText, parseRichTextJson, richTextDocumentSchema } from "../projects/rich-text.ts";

const versionSchema = z.iso.datetime({ offset: true });
const identity = { projectId: z.uuid(), taskId: z.uuid(), commentId: z.uuid() };
const content = {
  body: z.string().transform((value, context) => {
    const parsed = parseRichTextJson(value);
    if (parsed.success && optionalRichText(parsed.data)) return parsed.data;
    context.addIssue({ code: "custom", message: "Invalid comment content" });
    return z.NEVER;
  }),
  isPublic: z.boolean(),
};

export const commentMutationSchema = z.discriminatedUnion("operation", [
  z.strictObject({ operation: z.literal("create"), ...identity, ...content }),
  z.strictObject({ operation: z.literal("edit"), ...identity, ...content, version: versionSchema }),
  z.strictObject({ operation: z.literal("delete"), ...identity, version: versionSchema }),
]);
export type CommentMutation = z.input<typeof commentMutationSchema>;

export const commentResultSchema = z.enum(["ok", "invalid", "stale", "unauthorized", "unavailable"]);
export type CommentResult = z.infer<typeof commentResultSchema>;

export const commentCursorSchema = z.strictObject({ id: z.uuid(), created_at: versionSchema });
export const commentCountSchema = z.strictObject({ count: z.number().int().nonnegative() });
const taskCommentSchema = commentCursorSchema.extend({
  body: richTextDocumentSchema,
  is_public: z.boolean(),
  updated_at: versionSchema,
});
export const commentPageSchema = z.strictObject({
  comments: z.array(taskCommentSchema),
  next: commentCursorSchema.nullable(),
});
export type TaskComment = z.infer<typeof taskCommentSchema>;
export type CommentPage = z.infer<typeof commentPageSchema>;
