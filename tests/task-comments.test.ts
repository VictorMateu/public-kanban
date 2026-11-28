import assert from "node:assert/strict";
import { test } from "node:test";
import { plainTextDocument } from "../lib/projects/rich-text.ts";
import { commentMutationSchema, commentPageSchema } from "../lib/tasks/comment-schemas.ts";

const commentId = "9c030518-c28f-411f-b67f-b7be1b0cdf27";
const taskId = "15a7ce21-b18d-42bc-be57-ee331cc56315";
const projectId = "f115b285-d741-4177-837d-b003b95e6774";
const assetId = "06030f42-4426-42af-8d8c-fd1716ed878a";
const version = "2026-11-27T13:46:54.122337+00:00";
const image = { type: "doc", content: [{ type: "image", attrs: { assetId, alt: "Task diagram" } }] };
const create = { operation: "create", commentId, taskId, projectId, isPublic: false };

test("comment validation accepts formatting and image-only comments but rejects empty or unsafe documents", () => {
  const parsed = commentMutationSchema.parse({ ...create, body: JSON.stringify(image) });
  assert.equal(parsed.operation, "create");
  assert.deepEqual(parsed.body, image);
  for (const body of [
    plainTextDocument(" \n\t "), { type: "doc", content: [{ type: "horizontalRule" }] },
    { type: "doc", content: [{ type: "paragraph", content: [
      { type: "text", text: "Link", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
    ] }] },
  ]) {
    assert.equal(commentMutationSchema.safeParse({ ...create, body: JSON.stringify(body) }).success, false);
  }
  assert.equal(commentMutationSchema.safeParse({ ...create, isPublic: "true", body: JSON.stringify(image) }).success, false);
});

test("edit and delete require the stored timestamp and reject unrelated input fields", () => {
  const { isPublic, ...identity } = create;
  const change = { ...identity, operation: "edit", isPublic, body: JSON.stringify(image) };
  const deletion = { ...identity, operation: "delete", version };
  assert.equal(commentMutationSchema.safeParse(change).success, false);
  assert.equal(commentMutationSchema.safeParse({ ...change, version }).success, true);
  assert.equal(commentMutationSchema.safeParse(deletion).success, true);
  assert.equal(commentMutationSchema.safeParse({ ...deletion, body: change.body }).success, false);
  assert.equal(commentMutationSchema.safeParse({ ...deletion, version: "missing" }).success, false);
});

test("response validation accepts PostgREST timestamps and rejects foreign fields and invalid cursors", () => {
  const cursor = { id: commentId, created_at: version };
  const comment = { ...cursor, body: image, is_public: true, updated_at: version };
  assert.equal(commentPageSchema.safeParse({ comments: [comment], next: cursor }).success, true);
  assert.equal(commentPageSchema.safeParse({ comments: [{ ...comment, task_id: taskId }], next: null }).success, false);
  assert.equal(commentPageSchema.safeParse({ comments: [], next: { ...cursor, id: "," } }).success, false);
});
