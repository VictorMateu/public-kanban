import assert from "node:assert/strict";
import { test } from "node:test";
import { hasPassedPushGate, isCurrentMain, migrationStatus } from "../scripts/ci/release-policy.ts";

const candidate = "a".repeat(40);
const previous = "b".repeat(40);
const successfulPush = {
  head_sha: candidate,
  head_branch: "main",
  event: "push",
  status: "completed",
  conclusion: "success",
};

test("a successful push only qualifies while its SHA is the main tip", () => {
  assert.equal(hasPassedPushGate({ workflow_runs: [successfulPush] }, candidate), true);
  assert.equal(isCurrentMain({ object: { sha: candidate } }, candidate), true);
  assert.equal(isCurrentMain({ object: { sha: previous } }, candidate), false);
});

test("an old success cannot override an unfinished or failed run", () => {
  for (const latest of [
    { status: "in_progress", conclusion: null },
    { conclusion: "failure" },
    { conclusion: "cancelled" },
    { event: "schedule" },
    { head_branch: "feature" },
    { head_sha: previous },
  ]) {
    assert.equal(hasPassedPushGate({
      workflow_runs: [{ ...successfulPush, ...latest }, successfulPush],
    }, candidate), false);
  }
  assert.equal(hasPassedPushGate({ workflow_runs: [] }, candidate), false);
});

const first = "20261024000100";
const second = "20261024000200";
const files = [`${second}_authorize.sql`, `${first}_create.sql`, "README.md"];

test("only an exact production migration history permits release", () => {
  assert.equal(migrationStatus(files, [{ version: second }, { version: first }]), "current");
  assert.equal(migrationStatus(files, [{ version: first }]), "pending");
  assert.equal(migrationStatus(files, []), "pending");
  assert.equal(migrationStatus(files, [{ version: second }]), "diverged");
  assert.equal(migrationStatus(files, [{ version: first }, { version: first }]), "diverged");
  assert.equal(migrationStatus([], []), "diverged");
  assert.throws(() => migrationStatus(files, { migrations: [] }));
});
