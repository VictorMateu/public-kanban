import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import sharp from "sharp";
import { imageUploadResultSchema } from "../lib/projects/image-input.ts";
import type { Database } from "../lib/supabase/database.types.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const environment = z.object({
  KANBAN_TEST_URL: z.url().default("http://127.0.0.1:3000"), NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
}).parse(process.env);
const origin = new URL(environment.KANBAN_TEST_URL);
const supabaseUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);
for (const url of [origin, supabaseUrl]) {
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Project content integration tests require explicit local HTTP origins.");
  }
}
const docker = (args: string[]) => execFileSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const sql = (query: string) => docker(["exec", "supabase_db_portfolio-kanban", "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", query]);
const population = () => sql("SELECT json_build_array((SELECT count(*) FROM public.projects),(SELECT count(*) FROM public.project_assets),(SELECT count(*) FROM public.columns),(SELECT count(*) FROM public.tasks),(SELECT count(*) FROM auth.users),(SELECT count(*) FROM private.administrator))::TEXT;");

// Only the local test process uses the existing administrator identity and signing key.
// No credentials are logged, persisted, placed in command arguments, or sent off loopback.
function localAdministratorToken() {
  const id = z.uuid().parse(sql("SELECT user_id FROM private.administrator;"));
  const secret = docker(["exec", "supabase_auth_portfolio-kanban", "printenv", "GOTRUE_JWT_SECRET"]);
  if (!secret) throw new Error("Local JWT test configuration is unavailable.");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", role: "authenticated", iss: supabaseUrl.origin + "/auth/v1", iat: now, exp: now + 600 })).toString("base64url");
  return header + "." + payload + "." + createHmac("sha256", secret).update(header + "." + payload).digest("base64url");
}

test("rich project HTTP paths enforce image visibility without creating users", async (context) => {
  const before = population();
  const id = randomUUID(); const assetId = randomUUID();
  const slug = "rich-http-" + id;
  const objectPath = id + "/" + assetId + ".webp";
  const token = localAdministratorToken();
  const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const admin = createClient<Database>(supabaseUrl.origin, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
  const publicClient = createClient<Database>(supabaseUrl.origin, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const cookies: { name: string; value: string }[] = [];
  const sessionClient = createServerClient<Database>(supabaseUrl.origin, key, { cookies: { getAll: () => cookies, setAll: (values) => { cookies.splice(0, cookies.length, ...values); } } });
  const session = await sessionClient.auth.setSession({ access_token: token, refresh_token: randomUUID() });
  assert.equal(session.error, null, "Existing administrator token must validate locally");
  const cookie = cookies.map((entry) => entry.name + "=" + entry.value).join("; ");
  const image = Buffer.from("UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vz0AAA=", "base64");
  const document = { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Rich HTTP fixture", marks: [{ type: "bold" }] }] },
    { type: "image", attrs: { assetId, alt: "Fixture diagram" } },
  ] };
  let actionProjectId: string | null = null;
  const routeAssets: { id: string; objectPath: string }[] = [];
  let uploaded = false;
  let assetCreated = false;
  let projectCreated = false;
  try {
    const project = await admin.from("projects").insert({ id, slug, name: slug, description: "Rich HTTP fixture", description_content: document, repository_url: "https://example.com/repository" });
    assert.equal(project.error, null); projectCreated = true;
    const columnId = randomUUID();
    assert.equal((await admin.from("columns").insert({ id: columnId, project_id: id, name: "Private fixture column" })).error, null);
    assert.equal((await admin.from("tasks").insert({ id: randomUUID(), column_id: columnId, project_id: id, title: "Private board fixture task" })).error, null);
    const asset = await admin.from("project_assets").insert({ id: assetId, project_id: id, object_path: objectPath, byte_size: image.length, width: 1, height: 1 });
    assert.equal(asset.error, null); assetCreated = true;
    const upload = await admin.storage.from("project-images").upload(objectPath, image, { contentType: "image/webp", cacheControl: "0", upsert: false });
    assert.equal(upload.error, null); uploaded = true;
    assert.equal((await admin.from("project_assets").update({ status: "ready" }).eq("id", assetId)).error, null);
    const publicPath = "/project-images/" + assetId;
    await context.test("draft images remain private even when public requests carry administrator cookies", async () => {
      assert.equal((await fetch(origin.origin + publicPath)).status, 404);
      assert.equal((await fetch(origin.origin + publicPath, { headers: { Cookie: cookie } })).status, 404);
      assert.equal((await fetch(origin.origin + "/projects/" + slug)).status, 404);
      const preview = await fetch(origin.origin + publicPath + "?preview=1", { headers: { Cookie: cookie } });
      assert.equal(preview.status, 200);
      assert.deepEqual(Buffer.from(await preview.arrayBuffer()), image);
      assert.match(preview.headers.get("cache-control") ?? "", /no-store/);
      assert.equal((await fetch(origin.origin + publicPath + "?preview=1")).status, 404);
    });
    await context.test("shared project views expose owner controls and drafts only after authorization", async () => {
      const publicList = await fetch(origin.origin + "/projects");
      const publicHtml = await publicList.text();
      assert.ok(!publicHtml.includes(slug));
      assert.doesNotMatch(publicHtml, />New project<\/button>/);
      const ownerList = await fetch(origin.origin + "/projects", { headers: { Cookie: cookie } });
      assert.match(ownerList.headers.get("cache-control") ?? "", /no-store/);
      const ownerHtml = await ownerList.text();
      assert.ok(ownerHtml.includes(slug));
      assert.match(ownerHtml, />New project<\/button>/);
      const ownerDetail = await fetch(origin.origin + "/projects/" + slug + "?edit=1", { headers: { Cookie: cookie } });
      assert.equal(ownerDetail.status, 200);
      const detailHtml = await ownerDetail.text();
      assert.ok(detailHtml.includes('name="updated_at"'));
      assert.ok(detailHtml.includes("noindex"));
      assert.ok(detailHtml.includes("Private fixture column"));
      assert.ok(detailHtml.includes("Private board fixture task"));
      const publicRsc = await fetch(origin.origin + "/projects", { headers: { RSC: "1" } });
      assert.ok(!(await publicRsc.text()).includes(slug));
      const draftRsc = await fetch(origin.origin + "/projects/" + slug, { headers: { RSC: "1" } });
      const privateResponse = await draftRsc.text();
      assert.ok(!privateResponse.includes("Rich HTTP fixture"));
      assert.ok(!privateResponse.includes("Private board fixture task"));
      const adminEntry = await fetch(origin.origin + "/admin", { redirect: "manual", headers: { Cookie: cookie } });
      assert.equal(new URL(adminEntry.headers.get("location") ?? "", origin).pathname, "/projects");
    });
    await context.test("project Server Actions create, validate, update and change visibility in shared views", async () => {
      // Match the installed Next/React multipart Server Action protocol without another dependency.
      const manifest: unknown = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
      const actions = z.object({ node: z.record(z.string(), z.object({ exportedName: z.string() })) }).parse(manifest).node;
      const invoke = async (name: "saveProject", values: Record<string, string>, authenticated = true) => {
        const entry = Object.entries(actions).find(([, action]) => action.exportedName === name);
        assert.ok(entry, "Build must expose the tested Server Action");
        const body = new FormData();
        for (const [key, value] of Object.entries(values)) body.set("_1_" + key, value);
        body.set("0", JSON.stringify([{}, "$K1"]));
        return fetch(origin.origin + "/projects", { method: "POST", body, redirect: "manual", headers: {
          "Next-Action": entry[0], Origin: origin.origin, ...(authenticated ? { Cookie: cookie } : {}),
        } });
      };
      const actionSlug = "action-http-" + id;
      const empty = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
      const fields = { id: "", updated_at: "", name: actionSlug, slug: actionSlug, description_content: empty, objectives_content: empty, repository_url: "", is_published: "true", position: "999999" };
      const denied = await invoke("saveProject", fields, false);
      assert.ok((await denied.text()).includes('"unauthorized"'));
      assert.equal((await admin.from("projects").select("id").eq("slug", actionSlug)).data?.length, 0);
      const createdResponse = await invoke("saveProject", fields);
      const created = await admin.from("projects").select("*").eq("slug", actionSlug).single();
      actionProjectId = created.data?.id ?? null;
      assert.equal(created.error, null); assert.ok(created.data);
      assert.equal(createdResponse.status, 200);
      assert.ok(createdResponse.headers.get("x-action-redirect")?.includes("/projects/" + actionSlug));
      assert.equal(created.data.is_published, true); assert.equal(created.data.position, 0);
      assert.ok(!createdResponse.headers.get("x-action-redirect")?.includes("edit=1"));
      assert.equal((await fetch(origin.origin + "/projects/" + actionSlug)).status, 200);
      const original = created.data;
      const base = { ...fields, id: original.id, updated_at: original.updated_at, is_published: "false" };
      const foreignAsset = JSON.stringify({ type: "doc", content: [{ type: "image", attrs: { assetId, alt: "Foreign asset" } }] });
      const forged = await invoke("saveProject", { ...base, description_content: foreignAsset });
      assert.ok((await forged.text()).includes('"invalid"'));
      const changedSlug = actionSlug + "-edited";
      const updatedResponse = await invoke("saveProject", { ...base, slug: changedSlug, name: "Updated action fixture" });
      assert.equal(updatedResponse.status, 200);
      assert.ok(updatedResponse.headers.get("x-action-redirect")?.includes("/projects/" + changedSlug));
      const updated = await admin.from("projects").select("*").eq("id", original.id).single();
      assert.equal(updated.error, null); assert.ok(updated.data);
      assert.equal(updated.data.slug, changedSlug); assert.equal(updated.data.is_published, false);
      const stale = await invoke("saveProject", { ...base, name: "Stale overwrite" });
      assert.ok((await stale.text()).includes('"stale"'));
      assert.equal((await admin.from("projects").select("name").eq("id", original.id).single()).data?.name, "Updated action fixture");
      const published = await invoke("saveProject", { ...base, slug: changedSlug, name: "Updated action fixture", updated_at: updated.data.updated_at, is_published: "true" });
      assert.equal(published.status, 200);
      assert.equal((await fetch(origin.origin + "/projects/" + changedSlug)).status, 200);
      const current = await admin.from("projects").select("updated_at").eq("id", original.id).single();
      assert.ok(current.data);
      const hidden = await invoke("saveProject", { ...base, slug: changedSlug, name: "Updated action fixture", updated_at: current.data.updated_at, is_published: "false" });
      assert.equal(hidden.status, 200);
      assert.equal((await fetch(origin.origin + "/projects/" + changedSlug)).status, 404);
    });
    await context.test("upload endpoint authorizes, rejects hostile files and normalizes actual image bytes", async () => {
      const send = async (bytes: Buffer, type: string, options: { authenticated?: boolean; source?: string; project?: string } = {}) => {
        const body = new FormData();
        body.set("project_id", options.project ?? id);
        body.set("file", new Blob([Uint8Array.from(bytes)], { type }), "fixture");
        const headers = { Origin: options.source ?? origin.origin, ...(options.authenticated === false ? {} : { Cookie: cookie }) };
        return fetch(origin.origin + "/project-images", { method: "POST", headers, body });
      };
      assert.equal((await send(image, "image/webp", { authenticated: false })).status, 401);
      assert.equal((await send(image, "image/webp", { source: "https://example.com" })).status, 403);
      assert.equal((await send(Buffer.from("<svg/>"), "image/svg+xml")).status, 400);
      assert.equal((await send(image, "image/png")).status, 400);
      assert.equal((await send(image, "image/webp", { project: randomUUID() })).status, 400);
      const png = await sharp({ create: { width: 3, height: 2, channels: 3, background: "blue" } }).png().withMetadata().toBuffer();
      const response = await send(png, "image/png");
      assert.equal(response.status, 201);
      const payload: unknown = await response.json();
      const parsed = imageUploadResultSchema.parse(payload);
      assert.ok(parsed.success);
      routeAssets.push({ id: parsed.assetId, objectPath: id + "/" + parsed.assetId + ".webp" });
      const asset = await admin.from("project_assets").select("*").eq("id", parsed.assetId).single();
      assert.equal(asset.error, null); assert.ok(asset.data);
      assert.equal(asset.data.status, "ready"); assert.equal(asset.data.project_id, id);
      assert.equal((await fetch(origin.origin + "/project-images/" + parsed.assetId)).status, 404);
      const preview = await fetch(origin.origin + "/project-images/" + parsed.assetId + "?preview=1", { headers: { Cookie: cookie } });
      assert.equal(preview.status, 200);
      const output = await sharp(Buffer.from(await preview.arrayBuffer())).metadata();
      assert.equal(output.format, "webp"); assert.equal(output.width, 3); assert.equal(output.height, 2);
      assert.equal(output.exif, undefined); assert.equal(output.icc, undefined);
    });
    assert.equal((await admin.from("projects").update({ is_published: true }).eq("id", id)).error, null);
    await context.test("published detail shows the board and images remain available without redirects", async () => {
      const response = await fetch(origin.origin + "/projects/" + slug);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(!html.includes("<strong>Rich HTTP fixture</strong>"));
      assert.ok(!html.includes('alt="Fixture diagram"'));
      assert.ok(html.includes("Private board fixture task"));
      const result = await fetch(origin.origin + publicPath, { redirect: "manual" });
      assert.equal(result.status, 200);
      assert.equal(result.headers.get("location"), null);
      assert.equal(result.headers.get("content-type"), "image/webp");
      assert.match(result.headers.get("cache-control") ?? "", /no-store/);
      assert.deepEqual(Buffer.from(await result.arrayBuffer()), image);
      assert.ok((await publicClient.storage.from("project-images").createSignedUrl(objectPath, 60)).error);
      assert.ok((await admin.storage.from("project-images").createSignedUrl(objectPath, 60)).error);
    });
    assert.equal((await admin.from("projects").update({ is_published: false }).eq("id", id)).error, null);
    await context.test("hiding cuts off the same image URL immediately", async () => {
      assert.equal((await fetch(origin.origin + publicPath)).status, 404);
      assert.ok((await publicClient.storage.from("project-images").download(objectPath)).error);
      assert.equal((await fetch(origin.origin + "/projects/" + slug)).status, 404);
    });
  } finally {
    // Delete exactly this run's fixtures, object first; preserve all existing data/users.
    if (actionProjectId) assert.equal((await admin.from("projects").delete().eq("id", actionProjectId)).error, null);
    for (const asset of routeAssets) {
      assert.equal((await admin.storage.from("project-images").remove([asset.objectPath])).error, null);
      assert.equal((await admin.from("project_assets").delete().eq("id", asset.id).eq("project_id", id)).error, null);
    }
    if (uploaded) assert.equal((await admin.storage.from("project-images").remove([objectPath])).error, null);
    if (assetCreated) assert.equal((await admin.from("project_assets").delete().eq("id", assetId).eq("project_id", id)).error, null);
    if (projectCreated) assert.equal((await admin.from("projects").delete().eq("id", id)).error, null);
    assert.equal(population(), before);
  }
});
