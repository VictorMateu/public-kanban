import { z } from "zod";

const commit = z.string().regex(/^[a-f0-9]{40}$/);
const branch = z.object({ object: z.object({ sha: commit }) });
const runs = z.object({
  workflow_runs: z.array(z.object({
    head_sha: commit,
    head_branch: z.string(),
    event: z.string(),
    status: z.string(),
    conclusion: z.string().nullable(),
  })),
});
const migrationVersion = z.string().regex(/^\d{14}$/);
const migrations = z.array(z.object({ version: migrationVersion }));

export function isCurrentMain(ref: unknown, candidate: string) {
  return branch.parse(ref).object.sha === commit.parse(candidate);
}

export function hasPassedPushGate(response: unknown, candidate: string) {
  const latest = runs.parse(response).workflow_runs[0];
  return latest?.head_sha === candidate && latest.head_branch === "main" &&
    latest.event === "push" && latest.status === "completed" && latest.conclusion === "success";
}

export function migrationStatus(files: string[], response: unknown) {
  const local = files.filter((file) => file.endsWith(".sql")).map((file) =>
    migrationVersion.parse(/^(\d{14})_.+\.sql$/.exec(file)?.[1])
  ).sort();
  const remote = migrations.parse(response).map(({ version }) => version).sort();
  if (!local.length || new Set(local).size !== local.length ||
      remote.some((version, index) => version !== local[index])) {
    return "diverged";
  }
  return local.length === remote.length ? "current" : "pending";
}
