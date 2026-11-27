import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { taskDetailsSchema, taskMutationRpcResultSchema, taskMutationSchema } from "../lib/tasks/schemas.ts";

const fields = { title: "  Ship the first release  ", description: "", priority: "", due_date: "" };

test("task RPC accepts only database mutation results, not action-only errors or unexpected payloads", () => {
  for (const value of ["ok", "invalid", "stale"]) assert.equal(taskMutationRpcResultSchema.parse(value), value);
  for (const value of ["unauthorized", "unavailable", "OK", null, { result: "ok" }]) {
    assert.equal(taskMutationRpcResultSchema.safeParse(value).success, false);
  }
});

test("task details normalize empty optional fields and preserve authored description", () => {
  assert.deepEqual(taskDetailsSchema.parse(fields), {
    title: "Ship the first release", description: null, priority: null, due_date: null,
  });
  const description = "First line\n  Second line";
  assert.equal(taskDetailsSchema.parse({ ...fields, description }).description, description);
});

test("task details validate database limits and calendar dates", () => {
  assert.equal(taskDetailsSchema.safeParse({ ...fields, title: "🌱".repeat(200), due_date: "2028-02-29" }).success, true);
  for (const variation of [
    { title: " \t" }, { title: "🌱".repeat(201) }, { description: "\0" },
    { description: "a".repeat(10001) }, { priority: "urgent" },
    { due_date: "2027-02-29" }, { due_date: "0000-01-01" },
  ]) {
    assert.equal(taskDetailsSchema.safeParse({ ...fields, ...variation }).success, false);
  }
});


test("task mutations validate rich descriptions and preserve image-only content", () => {
  const input = { ...fields, operation: "create", projectId: randomUUID(), taskId: randomUUID(), columnId: randomUUID(), hidden: false };
  const parse = (content: unknown[]) => taskMutationSchema.safeParse({
    ...input, descriptionContent: JSON.stringify({ type: "doc", content }),
  });
  const image = { type: "image", attrs: { assetId: randomUUID(), alt: "Task diagram" } };
  const result = parse([image]);
  assert.ok(result.success && result.data.operation === "create");
  assert.deepEqual(result.data.descriptionContent, { type: "doc", content: [image] });
  assert.equal(parse([{ ...image, attrs: { ...image.attrs, assetId: "external-image" } }]).success, false);
  assert.equal(parse([{ type: "paragraph", content: [{ type: "text", text: "a".repeat(10001) }] }]).success, false);
});

test("task mutations trim labels, preserve their order and distinguish omission from clearing", () => {
  const input = {
    ...fields, operation: "edit", projectId: randomUUID(), taskId: randomUUID(), columnId: randomUUID(),
    hidden: false, version: "2026-11-27T10:00:00Z",
  };
  const parse = (tags?: unknown) => {
    const result = taskMutationSchema.parse({ ...input, tags });
    assert.equal(result.operation, "edit");
    return result.tags;
  };
  assert.equal(parse(), undefined);
  assert.deepEqual(parse([]), []);
  const longTag = String.fromCodePoint(0x1f331).repeat(30);
  assert.deepEqual(parse(["  Accessibilité ", "UI", longTag, "QA", "Docs"]), ["Accessibilité", "UI", longTag, "QA", "Docs"]);
  for (const tags of [
    [" ÉTÉ", "été "], ["\u00a0", "UI"], [longTag + "x"], ["A", "B", "C", "D", "E", "F"], ["a\0b"], [null],
  ]) {
    assert.equal(taskMutationSchema.safeParse({ ...input, tags }).success, false);
  }
  assert.equal(taskMutationSchema.safeParse({
    operation: "archive", projectId: input.projectId, taskId: input.taskId, version: input.version, tags: [],
  }).success, false);
});
