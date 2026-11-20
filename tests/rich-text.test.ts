import assert from "node:assert/strict";
import { test } from "node:test";
import { getSchema } from "@tiptap/react";
import { projectEditorExtensions } from "../lib/projects/editor-extensions.ts";
import { richTextDocumentSchema, richTextToPlainText, richTextAssetIds, plainTextDocument, optionalRichText, parseRichTextJson, readRichText, safeLinkSchema, RICH_TEXT_LIMITS } from "../lib/projects/rich-text.ts";
import { parseProjectContent, parseProjectSubmission } from "../lib/projects/input.ts";

const assetId = "f6fd871c-99e4-457a-89ae-9024cc27e668";
const schema = getSchema(projectEditorExtensions);
const paragraph = (value: string) => ({ type: "paragraph", content: [{ type: "text", text: value }] });

test("rich documents survive the actual editor schema including default attributes", () => {
  const document = { type: "doc", content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }, { type: "italic" }] }] },
    { type: "paragraph", content: [{ type: "text", text: "Repository", marks: [{ type: "link", attrs: { href: "https://example.com/repo" } }] }, { type: "hardBreak", marks: [{ type: "bold" }] }] },
    { type: "orderedList", content: [{ type: "listItem", content: [paragraph("First"), { type: "bulletList", content: [{ type: "listItem", content: [paragraph("Nested")] }] }] }] },
    { type: "blockquote", content: [paragraph("Quote")] },
    { type: "codeBlock", content: [{ type: "text", text: "const message = '<script>';" }] },
    { type: "horizontalRule" },
    { type: "image", attrs: { assetId, alt: "A diagram" } },
  ] };
  const serialized: unknown = schema.nodeFromJSON(document).toJSON();
  const parsed = richTextDocumentSchema.parse(serialized);
  assert.deepEqual(richTextAssetIds(parsed), [assetId]);
  const plain = richTextToPlainText(parsed);
  assert.ok(plain.includes("First\nNested"));
  assert.ok(plain.includes("<script>"));
  assert.ok(!plain.includes("https://"));
});

test("rich content rejects HTML, executable URLs, foreign images and unknown nodes or attributes", () => {
  const cases: unknown[] = [
    "<p>HTML</p>",
    { type: "doc", content: [{ type: "iframe", attrs: { src: "https://example.com" } }] },
    { type: "doc", content: [{ type: "paragraph", attrs: { onclick: "alert(1)" } }] },
    { type: "doc", content: [{ type: "image", attrs: { assetId, alt: "diagram", src: "https://example.com/tracker" } }] },
    { type: "doc", content: [{ type: "image", attrs: { assetId, alt: "" } }] },
    { type: "doc", content: [{ type: "image", attrs: { assetId: "../../admin", alt: "diagram" } }] },
    { type: "doc", content: [{ type: "heading", attrs: { level: 1 } }] },
    { type: "doc", content: [{ type: "codeBlock", attrs: { language: "<script>" } }] },
  ];
  for (const href of ["javascript:alert(1)", "data:image/png;base64,AAA", "//evil.test", "https://user:password@example.com", " https://example.com", "https://example.com/\npath"]) {
    cases.push({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Click", marks: [{ type: "link", attrs: { href } }] }] }] });
  }
  for (const value of cases) assert.equal(richTextDocumentSchema.safeParse(value).success, false);
});

test("rich content limits prevent oversized, cyclic and deeply nested input before recursive parsing", () => {
  assert.equal(richTextDocumentSchema.safeParse(plainTextDocument("🌱".repeat(RICH_TEXT_LIMITS.text))).success, false); // Byte limit is independent of character limit.
  assert.equal(richTextDocumentSchema.safeParse(plainTextDocument("a".repeat(RICH_TEXT_LIMITS.text))).success, true);
  assert.equal(richTextDocumentSchema.safeParse(plainTextDocument("a".repeat(RICH_TEXT_LIMITS.text + 1))).success, false);
  assert.equal(richTextDocumentSchema.safeParse({ type: "doc", content: Array.from({ length: 2001 }, () => paragraph("a")) }).success, false);
  const cyclic: { type: string; content: unknown[] } = { type: "doc", content: [] };
  cyclic.content.push(cyclic);
  assert.equal(richTextDocumentSchema.safeParse(cyclic).success, false);
  let nested: unknown = paragraph("deep");
  for (let i = 0; i < 100; i++) nested = { type: "bulletList", content: [{ type: "listItem", content: [paragraph("item"), nested] }] };
  assert.equal(richTextDocumentSchema.safeParse({ type: "doc", content: [nested] }).success, false);
  assert.equal(parseRichTextJson("x".repeat(RICH_TEXT_LIMITS.bytes + 1)).success, false);
  assert.equal(parseRichTextJson("{broken").success, false);
});

test("legacy text and line breaks are preserved and empty documents normalize to null", () => {
  const authored = "  First line\nSecond 🌱 line  ";
  assert.equal(richTextToPlainText(readRichText(null, authored)), authored);
  assert.equal(optionalRichText(plainTextDocument("  \n ")), null);
  assert.deepEqual(optionalRichText(richTextDocumentSchema.parse({ type: "doc", content: [{ type: "image", attrs: { assetId, alt: "diagram" } }] }))?.type, "doc");
  assert.throws(() => readRichText({ type: "malformed" }, "Do not hide invalid stored data"));
});

test("duplicate link marks cannot produce nested public anchors", () => {
  const link = { type: "link", attrs: { href: "https://example.com" } };
  const value: unknown = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "link", marks: [link, { ...link }] }] }] };
  assert.equal(richTextDocumentSchema.safeParse(value).success, false);
});

function contentForm() {
  const form = new FormData();
  form.set("name", "  Project  "); form.set("slug", "project");
  form.set("description_content", JSON.stringify(plainTextDocument("Description")));
  form.set("objectives_content", JSON.stringify(plainTextDocument(null)));
  form.set("repository_url", "");
  form.set("status", "development"); form.set("is_hidden", "false"); form.set("cancellation_reason", "");
  return form;
}

test("project content accepts optional information and rejects forged and duplicate values", () => {
  const form = contentForm();
  form.set("is_published", "true");
  const parsed = parseProjectContent(form);
  assert.ok(parsed.success);
  if (!parsed.success) return;
  assert.equal(parsed.data.name, "Project");
  assert.equal(parsed.data.objectives_content, null);
  assert.equal(parsed.data.repository_url, null);
  assert.ok(!("is_published" in parsed.data));
  for (const field of ["name", "slug", "description_content", "objectives_content", "repository_url"]) {
    const duplicate = contentForm(); duplicate.append(field, "duplicate");
    assert.equal(parseProjectContent(duplicate).success, false);
  }
  for (const url of ["http://example.com", "https://user:secret@example.com", "https://example.com/" + "x".repeat(2048)]) {
    const invalid = contentForm(); invalid.set("repository_url", url);
    assert.equal(parseProjectContent(invalid).success, false);
  }
  assert.equal(safeLinkSchema.safeParse("https://gitlab.com/example/project?ref=main#readme").success, true);
});


test("project submissions require explicit visibility and collect content and visibility errors", () => {
  for (const published of ["false", "true"]) {
    const form = contentForm();
    form.set("is_published", published);
    const result = parseProjectSubmission(form);
    assert.ok(result.success);
    if (result.success) assert.equal(result.data.is_published, published === "true");
  }
  for (const invalid of [undefined, "", "on", "1", "TRUE", new Blob(["true"])]) {
    const form = contentForm();
    if (invalid !== undefined) form.set("is_published", invalid);
    const result = parseProjectSubmission(form);
    assert.deepEqual(result, { success: false, errors: { is_published: "invalid" } });
  }
  const duplicate = contentForm();
  duplicate.append("is_published", "true");
  duplicate.append("is_published", "false");
  duplicate.set("name", " ");
  assert.deepEqual(parseProjectSubmission(duplicate), {
    success: false, errors: { name: "required", is_published: "invalid" },
  });
});
