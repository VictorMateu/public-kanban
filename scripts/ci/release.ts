import { appendFileSync, readdirSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { z } from "zod";
import { hasPassedPushGate, isCurrentMain, migrationStatus } from "./release-policy.ts";

const commit = z.string().regex(/^[a-f0-9]{40}$/);
const identifier = z.string().regex(/^[A-Za-z0-9_-]+$/);
class ReleaseError extends Error {}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new ReleaseError("Required release configuration is missing.");
  return value;
}

async function request(url: URL, token: string, body?: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new ReleaseError(`Release API at ${url.hostname} returned HTTP ${response.status}.`);
  }
  const data: unknown = await response.json();
  return data;
}

async function approvedCommit() {
  const candidate = commit.parse(required("RELEASE_SHA"));
  const repository = z.string().regex(/^[\w.-]+\/[\w.-]+$/).parse(required("GITHUB_REPOSITORY"));
  const github = (path: string) =>
    request(new URL(`https://api.github.com/repos/${repository}/${path}`), required("GH_TOKEN"));
  const outcomes = await Promise.all(["ci.yml", "security.yml"].map((workflow) =>
    github(`actions/workflows/${workflow}/runs?event=push&branch=main&head_sha=${candidate}&per_page=1`)
  ));
  return outcomes.every((outcome) => hasPassedPushGate(outcome, candidate)) &&
    isCurrentMain(await github("git/ref/heads/main"), candidate);
}

function supabaseRef() {
  return z.string().regex(/^[a-z]{20}$/).parse(required("SUPABASE_PROJECT_REF"));
}

async function checkMigrations() {
  const remote = await request(
    new URL(`https://api.supabase.com/v1/projects/${supabaseRef()}/database/migrations`),
    required("SUPABASE_HISTORY_TOKEN"),
  );
  const state = migrationStatus(readdirSync("supabase/migrations"), remote);
  if (state === "diverged") throw new ReleaseError("Production migration history diverges; investigate before releasing.");
  if (state === "pending") throw new ReleaseError("Production migrations are pending; run the approved migration operation first.");
}

async function deploy() {
  const sha = commit.parse(required("RELEASE_SHA"));
  const project = identifier.parse(required("VERCEL_PROJECT_ID"));
  const name = z.string().regex(/^[a-z0-9._-]+$/).parse(required("VERCEL_PROJECT_NAME"));
  const scope = identifier.parse(required("VERCEL_TEAM_ID"));
  const repoId = z.string().regex(/^\d+$/).parse(required("GITHUB_REPOSITORY_ID"));
  const token = required("VERCEL_TOKEN");
  const key = z.string().regex(/^sb_publishable_[A-Za-z0-9_-]+$/).parse(required("SUPABASE_PUBLISHABLE_KEY"));
  const vercel = (path: string, body?: unknown) => {
    const url = new URL(`https://api.vercel.com/${path}`);
    url.searchParams.set("teamId", scope);
    return request(url, token, body);
  };
  if (!await approvedCommit()) throw new ReleaseError("The commit is no longer eligible for release.");
  const variables = await vercel(`v10/projects/${project}/env?upsert=true`, [
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: `https://${supabaseRef()}.supabase.co`, type: "plain", target: ["production"] },
    { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: key, type: "plain", target: ["production"] },
  ]);
  const result = z.object({
    created: z.array(z.object({ key: z.string() })),
    failed: z.array(z.unknown()),
  }).parse(variables);
  if (result.failed.length ||
      !["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
        .every((name) => result.created.some(({ key }) => key === name))) {
    throw new ReleaseError("Vercel did not save both production variables.");
  }
  if (!await approvedCommit()) throw new ReleaseError("The commit changed eligibility before deployment.");
  const created = z.object({ id: identifier }).parse(await vercel("v13/deployments", {
    name,
    project,
    target: "production",
    gitSource: { type: "github", repoId, ref: "main", sha },
  }));
  for (let attempt = 0; attempt < 90; attempt++) {
    const deployment = z.object({
      readyState: z.string(),
      aliasAssigned: z.boolean().optional(),
    }).parse(
      await vercel(`v13/deployments/${created.id}`),
    );
    if (deployment.readyState === "READY" && deployment.aliasAssigned) {
      console.log("Vercel reports the production deployment is ready.");
      return;
    }
    if (["ERROR", "CANCELED", "BLOCKED"].includes(deployment.readyState)) {
      throw new ReleaseError("Vercel did not complete the deployment; inspect the project dashboard.");
    }
    await setTimeout(10_000);
  }
  throw new ReleaseError("Timed out waiting for Vercel; inspect the project dashboard.");
}

async function main() {
  switch (process.argv[2]) {
    case "qualify": {
      const eligible = await approvedCommit();
      appendFileSync(required("GITHUB_OUTPUT"), `eligible=${eligible}\n`);
      if (!eligible && process.env.GITHUB_EVENT_NAME === "workflow_dispatch") {
        throw new ReleaseError("Both main push workflows must pass for the current commit.");
      }
      if (!eligible) console.log("Waiting for both main push workflows on the current commit.");
      break;
    }
    case "require-eligible":
      if (!await approvedCommit()) throw new ReleaseError("The commit is no longer eligible for release.");
      break;
    case "check-migrations":
      await checkMigrations();
      break;
    case "deploy":
      await deploy();
      break;
    default:
      throw new ReleaseError("Unknown release operation.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof ReleaseError ? error.message : "Release configuration or API response is invalid.");
  process.exitCode = 1;
});
