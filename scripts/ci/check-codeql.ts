import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function countCodeqlAlerts(report: unknown): number {
  if (
    !isRecord(report) || report.version !== "2.1.0" ||
    !Array.isArray(report.runs) || report.runs.length === 0
  ) throw new Error("A complete SARIF 2.1.0 report is required.");

  let alerts = 0;
  for (const run of report.runs) {
    if (
      !isRecord(run) || !isRecord(run.tool) || !isRecord(run.tool.driver) ||
      run.tool.driver.name !== "CodeQL" || !Array.isArray(run.results) ||
      !run.results.every(isRecord)
    ) throw new Error("Every run must contain CodeQL results.");

    if (run.invocations !== undefined) {
      if (!Array.isArray(run.invocations)) throw new Error("Invalid CodeQL invocations.");
      for (const invocation of run.invocations) {
        if (!isRecord(invocation) || invocation.executionSuccessful === false) {
          throw new Error("CodeQL analysis did not complete successfully.");
        }
        for (const key of ["toolExecutionNotifications", "toolConfigurationNotifications"]) {
          const notifications = invocation[key];
          if (notifications !== undefined && (
            !Array.isArray(notifications) ||
            notifications.some(notification => !isRecord(notification) || notification.level === "error")
          )) throw new Error("CodeQL reported an analysis error.");
        }
      }
    }

    alerts += run.results.length;
  }
  return alerts;
}

export function checkCodeqlDirectory(directory: string): number {
  const files = readdirSync(directory).filter(name => name.endsWith(".sarif"));
  if (files.length === 0) throw new Error("No CodeQL SARIF files were produced.");

  return files.reduce((alerts, name) => {
    const report: unknown = JSON.parse(readFileSync(join(directory, name), "utf8"));
    return alerts + countCodeqlAlerts(report);
  }, 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const directory = process.argv[2];
    if (!directory || process.argv.length !== 3) throw new Error("A report directory is required.");
    const alerts = checkCodeqlDirectory(directory);
    console.log(`CodeQL gate: ${alerts} finding(s).`);
    if (alerts > 0) process.exitCode = 1;
  } catch {
    console.error("CodeQL gate failed: missing, malformed or unsuccessful analysis; report content is not logged.");
    process.exitCode = 1;
  }
}
