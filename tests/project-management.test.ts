import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProjectSubmission } from "../lib/projects/input.ts";
import { publicProjectSummarySchema } from "../lib/projects/schemas.ts";

function submission() {
  const form = new FormData();
  for (const [key, value] of Object.entries({ name: "Project", slug: "project", description_content: "null", objectives_content: "null", repository_url: "", is_published: "true", status: "development", is_hidden: "false", cancellation_reason: "" })) form.set(key, value);
  // Rich-text input is always an actual document, even when empty.
  const empty = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
  form.set("description_content", empty); form.set("objectives_content", empty);
  return form;
}

test("all project lifecycle states and publication/hidden combinations validate independently", () => {
  for (const status of ["development", "maintenance", "completed", "cancelled"]) {
    for (const published of ["false", "true"]) for (const hidden of ["false", "true"]) {
      const form = submission();
      form.set("status", status); form.set("is_published", published); form.set("is_hidden", hidden);
      form.set("cancellation_reason", "  Changed priorities  ");
      const result = parseProjectSubmission(form); assert.ok(result.success);
      assert.equal(result.data.status, status); assert.equal(result.data.is_hidden, hidden === "true");
      assert.equal(result.data.is_published, published === "true");
      assert.equal(result.data.cancellation_reason, "Changed priorities");
    }
  }
});

test("cancellation requires a nonblank reason while other states preserve a reason or accept none", () => {
  for (const value of ["", " \t\n", "\u00a0\ufeff"]) {
    const form = submission(); form.set("status", "cancelled"); form.set("cancellation_reason", value);
    assert.deepEqual(parseProjectSubmission(form), { success: false, errors: { cancellation_reason: "required" } });
  }
  assert.ok(parseProjectSubmission(submission()).success);
  for (const value of ["x".repeat(2000), "\u{1f331}".repeat(2000)]) {
    const form = submission(); form.set("status", "cancelled"); form.set("cancellation_reason", value);
    assert.ok(parseProjectSubmission(form).success);
    form.set("cancellation_reason", value + "x");
    assert.deepEqual(parseProjectSubmission(form), { success: false, errors: { cancellation_reason: "tooLong" } });
  }
});

test("missing, duplicate and forged management input fails at the runtime boundary", () => {
  for (const field of ["status", "is_hidden", "cancellation_reason"]) {
    for (const mode of ["missing", "duplicate", "file"]) {
      const form = submission();
      if (mode === "missing") form.delete(field);
      if (mode === "duplicate") form.append(field, "duplicate");
      if (mode === "file") form.set(field, new Blob(["forged"]));
      assert.equal(parseProjectSubmission(form).success, false, field + ": " + mode);
    }
  }
  const form = submission(); form.set("status", "archived"); form.set("is_hidden", "on"); form.set("cancellation_reason", "bad\0value");
  assert.deepEqual(parseProjectSubmission(form), { success: false, errors: { status: "invalid", is_hidden: "invalid", cancellation_reason: "invalid" } });
});

test("public summaries reject hidden content, missing visible links and draft exposure", () => {
  const summary = { id: "a655e963-5a33-45cc-b054-815ed6bc6965", slug: null, name: "Project", description: null, status: "development", is_hidden: true, is_published: true, position: 0 };
  assert.ok(publicProjectSummarySchema.safeParse(summary).success);
  for (const extra of [{ slug: "private-slug" }, { description: "Private content" }, { repository_url: "https://example.com" }, { is_published: false }, { is_hidden: false }]) {
    assert.equal(publicProjectSummarySchema.safeParse({ ...summary, ...extra }).success, false);
  }
});
