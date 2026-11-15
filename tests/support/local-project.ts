import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createHmac } from "node:crypto";
import { z } from "zod";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export const environment = z.object({
  KANBAN_TEST_URL: z.url().default("http://127.0.0.1:3000"), NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
}).parse(process.env);
export const origin = new URL(environment.KANBAN_TEST_URL);
export const supabaseUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);
for (const url of [origin, supabaseUrl]) {
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Project integration tests require explicit local HTTP origins.");
  }
}
const docker = (args: string[]) => execFileSync("docker", args, { encoding: "utf8", windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }).trim();
const sql = (query: string) => docker(["exec", "supabase_db_portfolio-kanban", "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", query]);
export const population = () => sql("SELECT json_build_array((SELECT count(*) FROM public.projects),(SELECT count(*) FROM public.project_assets),(SELECT count(*) FROM public.columns),(SELECT count(*) FROM public.tasks),(SELECT count(*) FROM auth.users),(SELECT count(*) FROM private.administrator))::TEXT;");

// Use only the existing local administrator. Never log/persist credentials or create users.
export function localAdministratorToken() {
  const id = z.uuid().parse(sql("SELECT user_id FROM private.administrator;"));
  const secret = docker(["exec", "supabase_auth_portfolio-kanban", "printenv", "GOTRUE_JWT_SECRET"]);
  if (!secret) throw new Error("Local JWT test configuration is unavailable.");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", role: "authenticated", iss: supabaseUrl.origin + "/auth/v1", iat: now, exp: now + 600 })).toString("base64url");
  return header + "." + payload + "." + createHmac("sha256", secret).update(header + "." + payload).digest("base64url");
}
