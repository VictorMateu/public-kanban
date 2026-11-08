import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { isProjectSlug } from "../lib/projects/slug.ts";
import { formatDueDate } from "../lib/tasks/due-date.ts";

test("project URLs accept the formats and maximum length allowed by the SQL schema", () => {
  for (const slug of ["portfolio", "portfolio-kanban", "project-2026", "123", "a".repeat(100)]) {
    assert.equal(isProjectSlug(slug), true);
  }
});

test("invalid project slugs are rejected before looking up public data", () => {
  for (const slug of ["", "Uppercase", "with spaces", "with/slash", "-prefix", "suffix-", "double--dash", "áccent", "a".repeat(101)]) {
    assert.equal(isProjectSlug(slug), false);
  }
});

test("date-only deadlines use the requested locale and default to English", () => {
  assert.equal(formatDueDate("2026-11-01"), "Nov 1, 2026");
  assert.equal(formatDueDate("2026-11-01", "es"), "1 nov 2026");
  assert.equal(formatDueDate("2026-11-01", "ca"), "1 de nov. 2026");
  assert.equal(formatDueDate("2000-02-29", "en"), "Feb 29, 2000");
});

test("date-only formatting does not shift the day in a negative UTC offset", () => {
  const moduleUrl = new URL("../lib/tasks/due-date.ts", import.meta.url).href;
  const code = `import { formatDueDate } from ${JSON.stringify(moduleUrl)}; process.stdout.write(formatDueDate('2026-01-01'));`;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8",
    env: { ...process.env, TZ: "America/Los_Angeles" },
  });
  assert.equal(output, "Jan 1, 2026");
});

test("invalid deadlines cannot crash the task renderer or roll into another month", () => {
  for (const value of ["", "invalid", "infinity", "2026-02-30", "1900-02-29", "2026-13-01", "2026-11-01T00:00:00Z"]) {
    assert.equal(formatDueDate(value), null);
  }
});
