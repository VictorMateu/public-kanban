import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProjectDetails, projectDetailsSchema } from "../lib/projects/input.ts";

function details() {
  const data = new FormData();
  data.set("name", "  Project Garden  ");
  data.set("slug", "project-garden");
  data.set("description", "First line\n  Second line  ");
  return data;
}

test("project details preserve authored description and exclude protected fields", () => {
  const data = details();
  data.set("id", "forged-id");
  data.set("is_published", "true");
  data.set("position", "-1");
  data.set("created_at", "2000-01-01");
  assert.deepEqual(parseProjectDetails(data), {
    success: true,
    data: { name: "Project Garden", slug: "project-garden", description: "First line\n  Second line  " },
  });
});

test("project details report all missing required fields together", () => {
  assert.deepEqual(parseProjectDetails(new FormData()), {
    success: false, errors: { name: "required", slug: "required" },
  });
  const data = details();
  data.set("name", " \n\t ");
  assert.deepEqual(parseProjectDetails(data), { success: false, errors: { name: "required" } });
});

test("an omitted or empty optional description is represented as null", () => {
  for (const description of [undefined, ""]) {
    const data = details();
    if (description === undefined) data.delete("description");
    else data.set("description", description);
    const result = parseProjectDetails(data);
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.description, null);
  }
});

test("project text limits match PostgreSQL for supplementary Unicode characters", () => {
  const data = details();
  data.set("name", "🌱".repeat(120));
  data.set("description", "🌱".repeat(5000));
  assert.equal(parseProjectDetails(data).success, true);
  data.set("name", "🌱".repeat(121));
  data.set("description", "🌱".repeat(5001));
  assert.deepEqual(parseProjectDetails(data), {
    success: false, errors: { name: "tooLong", description: "tooLong" },
  });
});

test("project details reject URL-unsafe slugs instead of silently changing URLs", () => {
  for (const slug of ["../admin", "Project", "with spaces", " project ", "-project", "project--garden", "a".repeat(101)]) {
    const data = details();
    data.set("slug", slug);
    assert.deepEqual(parseProjectDetails(data), { success: false, errors: { slug: "invalid" } });
  }
});

test("project details reject duplicate fields, files and PostgreSQL-incompatible null bytes", () => {
  for (const field of ["name", "slug", "description"] as const) {
    for (const invalid of ["duplicate", "file", "null-byte"]) {
      const data = details();
      if (invalid === "duplicate") data.append(field, "second value");
      else if (invalid === "file") data.set(field, new Blob(["unexpected upload"]));
      else data.set(field, "value\0value");
      assert.deepEqual(parseProjectDetails(data), { success: false, errors: { [field]: "invalid" } });
    }
  }
});

test("the project schema rejects unknown object shapes, type coercion and protected fields", () => {
  const inputs: unknown[] = [
    null,
    [],
    { name: 123, slug: "project" },
    { name: "Project", slug: 123 },
    { name: "Project", slug: "project", description: false },
    { name: "Project", slug: "project", is_published: true },
    { name: "Project", slug: "project", id: "forged-id" },
  ];
  for (const input of inputs) assert.equal(projectDetailsSchema.safeParse(input).success, false);
});
