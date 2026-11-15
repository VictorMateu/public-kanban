import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { checkCodeqlDirectory, countCodeqlAlerts } from "../scripts/ci/check-codeql.ts";

function report(results: unknown[] = []) {
  return {
    version: "2.1.0",
    runs: [{ tool: { driver: { name: "CodeQL" } }, results }],
  };
}

test("CodeQL gate accepts a complete analysis with no alerts", () => {
  assert.equal(countCodeqlAlerts(report()), 0);
});

test("CodeQL gate counts every alert regardless of severity, baseline or suppression", () => {
  const alerts = [
    { level: "error" },
    { level: "warning", baselineState: "unchanged" },
    { level: "note", suppressions: [{ status: "accepted" }] },
  ];
  assert.equal(countCodeqlAlerts(report(alerts)), 3);
});

test("CodeQL gate checks every run instead of accepting a clean first run", () => {
  const analysis = report();
  analysis.runs.push(...report([{}]).runs);
  assert.equal(countCodeqlAlerts(analysis), 1);
});

test("CodeQL gate rejects missing, malformed and non-CodeQL results", () => {
  for (const analysis of [
    null, [], {}, { version: "2.1.0", runs: [] },
    { ...report(), version: "2.0.0" },
    { version: "2.1.0", runs: [{}] },
    { version: "2.1.0", runs: [{ tool: { driver: { name: "Other" } }, results: [] }] },
    report([null]),
  ]) assert.throws(() => countCodeqlAlerts(analysis));
});

test("CodeQL gate rejects unsuccessful analyses and analyzer errors", () => {
  for (const invocations of [
    "invalid", [null], [{ executionSuccessful: false }],
    [{ toolExecutionNotifications: [{ level: "error" }] }],
    [{ toolConfigurationNotifications: [{ level: "error" }] }],
    [{ toolExecutionNotifications: "invalid" }],
  ]) {
    const analysis = report();
    const run = { ...analysis.runs[0], invocations };
    assert.throws(() => countCodeqlAlerts({ ...analysis, runs: [run] }));
  }
});

test("CodeQL gate permits informational diagnostics from a successful analyzer", () => {
  const analysis = report();
  const run = {
    ...analysis.runs[0],
    invocations: [{ executionSuccessful: true, toolExecutionNotifications: [{ level: "note" }] }],
  };
  assert.equal(countCodeqlAlerts({ ...analysis, runs: [run] }), 0);
});

test("CodeQL CLI fails closed without disclosing raw reports", () => {
  const directory = mkdtempSync(join(tmpdir(), "garden-codeql-test-"));
  const script = fileURLToPath(new URL("../scripts/ci/check-codeql.ts", import.meta.url));
  const execute = () => spawnSync(process.execPath, [script, directory], { encoding: "utf8" });
  try {
    assert.throws(() => checkCodeqlDirectory(directory));
    assert.equal(execute().status, 1);

    writeFileSync(join(directory, "javascript.sarif"), JSON.stringify(report()));
    assert.equal(execute().status, 0);

    writeFileSync(join(directory, "actions.sarif"), JSON.stringify(report([{ level: "note" }])));
    assert.equal(execute().status, 1);

    const privateMarker = "private-fixture-value-do-not-log";
    writeFileSync(join(directory, "actions.sarif"), JSON.stringify(report([{
      ruleId: "js/bad-tag-filter",
      level: "warning",
      message: { text: privateMarker },
      locations: [{ physicalLocation: {
        artifactLocation: { uri: "tests/fixture.mjs" },
        region: { startLine: 12, snippet: { text: privateMarker } },
      } }],
      codeFlows: [{ privateMarker }],
    }])));
    const findings = execute();
    assert.equal(findings.status, 1);
    assert.ok(findings.stderr.includes('"rule":"js/bad-tag-filter"'));
    assert.ok(findings.stderr.includes('"file":"tests/fixture.mjs","line":12'));
    assert.ok(!(findings.stdout + findings.stderr).includes(privateMarker));

    writeFileSync(join(directory, "actions.sarif"), privateMarker + "{");
    const failed = execute();
    assert.equal(failed.status, 1);
    assert.ok(!(failed.stdout + failed.stderr).includes(privateMarker));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
