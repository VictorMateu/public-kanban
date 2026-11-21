import { z } from "zod";

export const RICH_TEXT_LIMITS = { bytes: 200_000, nodes: 2000, depth: 24, text: 50_000, images: 20 } as const;
const text = z.string().refine((value) => !value.includes("\0"));
export const safeLinkSchema = text.max(2048).refine((value) => {
  if (!/^https:\/\//iu.test(value) || /[\s\u0000-\u001f\u007f]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}).transform((value) => new URL(value).href).refine((value) => value.length <= 2048);
const markSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("bold") }),
  z.strictObject({ type: z.literal("italic") }),
  z.strictObject({ type: z.literal("strike") }),
  z.strictObject({ type: z.literal("code") }),
  z.strictObject({ type: z.literal("link"), attrs: z.strictObject({
    href: safeLinkSchema,
    target: z.literal("_blank").nullable().optional(),
    rel: z.string().nullable().optional(),
    class: z.null().optional(),
    title: text.max(300).nullable().optional(),
  }) }),
]);
const inlineSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("text"), text: text.min(1), marks: z.array(markSchema).max(5).refine((marks) => new Set(marks.map((mark) => mark.type)).size === marks.length).optional() }),
  z.strictObject({ type: z.literal("hardBreak"), marks: z.array(markSchema).max(5).refine((marks) => new Set(marks.map((mark) => mark.type)).size === marks.length).optional() }),
]);
const paragraphSchema = z.strictObject({ type: z.literal("paragraph"), content: z.array(inlineSchema).optional() });
type Paragraph = z.infer<typeof paragraphSchema>;
// Only lists are recursive; leaf node and mark contracts are inferred from Zod.
type ListItem = { type: "listItem"; content: [Paragraph, ...(Paragraph | List)[]] };
type List = { type: "bulletList"; content: ListItem[] } | {
  type: "orderedList"; attrs?: { start: number; type?: null }; content: ListItem[];
};
const listItemSchema: z.ZodType<ListItem> = z.strictObject({
  type: z.literal("listItem"),
  content: z.tuple([paragraphSchema]).rest(z.union([paragraphSchema, z.lazy(() => listSchema)])),
});
const listSchema: z.ZodType<List> = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("bulletList"), content: z.array(listItemSchema).min(1) }),
  z.strictObject({ type: z.literal("orderedList"), content: z.array(listItemSchema).min(1),
    attrs: z.strictObject({ start: z.number().int().min(1).max(1_000_000), type: z.null().optional() }).optional() }),
]);
const imageSchema = z.strictObject({ type: z.literal("image"), attrs: z.strictObject({
  assetId: z.uuid(), alt: text.trim().min(1).max(300),
}) });
const blockSchema = z.union([
  paragraphSchema,
  z.strictObject({ type: z.literal("heading"), attrs: z.strictObject({ level: z.union([z.literal(2), z.literal(3)]) }), content: z.array(inlineSchema).optional() }),
  z.strictObject({ type: z.literal("blockquote"), content: z.array(paragraphSchema).min(1) }),
  z.strictObject({ type: z.literal("codeBlock"), attrs: z.strictObject({ language: z.string().regex(/^[a-z0-9_+#.-]{1,40}$/iu).nullable() }).optional(),
    content: z.array(z.strictObject({ type: z.literal("text"), text: text.min(1) })).optional() }),
  z.strictObject({ type: z.literal("horizontalRule") }),
  listSchema,
  imageSchema,
]);
const documentShape = z.strictObject({ type: z.literal("doc"), content: z.array(blockSchema).min(1) });

function withinBudget(value: unknown): boolean {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  const seen = new WeakSet<object>();
  let nodes = 0;
  let characters = 0;
  let contentNodes = 0;
  let images = 0;
  while (pending.length) {
    const entry = pending.pop();
    if (!entry) break;
    if (entry.depth > RICH_TEXT_LIMITS.depth || ++nodes > RICH_TEXT_LIMITS.nodes * 12) return false;
    if (typeof entry.value === "string") {
      characters += entry.value.length;
      if (characters > RICH_TEXT_LIMITS.bytes) return false;
    } else if (typeof entry.value === "object" && entry.value !== null) {
      if (seen.has(entry.value)) return false;
      seen.add(entry.value);
      if ("type" in entry.value && ++contentNodes > RICH_TEXT_LIMITS.nodes) return false;
      if ("type" in entry.value && entry.value.type === "image" && ++images > RICH_TEXT_LIMITS.images) return false;
      for (const child of Object.values(entry.value)) pending.push({ value: child, depth: entry.depth + 1 });
    }
  }
  try { return new TextEncoder().encode(JSON.stringify(value)).length <= RICH_TEXT_LIMITS.bytes; }
  catch { return false; }
}

export const richTextDocumentSchema = z.unknown().refine(withinBudget, { error: "tooLong" }).pipe(documentShape)
  .refine((document) => [...richTextToPlainText(document)].length <= RICH_TEXT_LIMITS.text, { error: "tooLong" });
export type RichTextDocument = z.infer<typeof documentShape>;
export type RichTextBlock = RichTextDocument["content"][number];
export type RichTextInline = z.infer<typeof inlineSchema>;
export type RichTextMark = z.infer<typeof markSchema>;
export type RichTextList = List;

export function richTextToPlainText(document: RichTextDocument): string {
  function read(node: RichTextBlock | RichTextInline | ListItem): string {
    if (node.type === "text") return node.text;
    if (node.type === "hardBreak") return "\n";
    if (node.type === "image" || node.type === "horizontalRule") return "";
    const separator = node.type === "paragraph" || node.type === "heading" || node.type === "codeBlock" ? "" : "\n";
    return (node.content ?? []).map(read).join(separator);
  }
  return document.content.map(read).join("\n");
}

export function richTextAssetIds(document: RichTextDocument | null): string[] {
  return document?.content.flatMap((node) => node.type === "image" ? [node.attrs.assetId] : []) ?? [];
}

export function plainTextDocument(value: string | null): RichTextDocument {
  return { type: "doc", content: [{ type: "paragraph", ...(value ? { content: [{ type: "text", text: value }] } : {}) }] };
}

export function parseRichTextJson(value: unknown) {
  if (typeof value !== "string" || new TextEncoder().encode(value).length > RICH_TEXT_LIMITS.bytes) {
    return richTextDocumentSchema.safeParse(undefined);
  }
  try {
    const document: unknown = JSON.parse(value);
    return richTextDocumentSchema.safeParse(document);
  } catch { return richTextDocumentSchema.safeParse(undefined); }
}

export function optionalRichText(document: RichTextDocument): RichTextDocument | null {
  return richTextToPlainText(document).trim() || richTextAssetIds(document).length ? document : null;
}


export function readRichText(value: unknown, fallback: string | null = null): RichTextDocument {
  if (value === null || value === undefined) return plainTextDocument(fallback);
  const result = richTextDocumentSchema.safeParse(value);
  if (!result.success) throw new Error("Invalid stored project content.");
  return result.data;
}
