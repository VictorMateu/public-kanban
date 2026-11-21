import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import sharp from "sharp";
import { imageUploadResultSchema } from "../lib/projects/image-input.ts";
import type { Database } from "../lib/supabase/database.types.ts";
import { environment, origin, supabaseUrl, population, localAdministratorToken, hasLocalAdministrator, removeLocalProjectFixture } from "./support/local-project.ts";

test("rich project HTTP paths enforce image visibility without creating users", { skip: !hasLocalAdministrator() && "Requires an existing local administrator; never creates users." }, async (context) => {
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
  const draftProjectId = randomUUID();
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
      assert.equal(new URL(adminEntry.headers.get("location") ?? "", origin).pathname, "/");
    });
    await context.test("project Server Actions create, validate, update and change visibility in shared views", async () => {
      // Match the installed Next/React multipart Server Action protocol without another dependency.
      const manifest: unknown = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
      const actions = z.object({ node: z.record(z.string(), z.object({ exportedName: z.string() })) }).parse(manifest).node;
      const invoke = async (name: "saveProject" | "saveProjectDraft", values: Record<string, string>, authenticated = true) => {
        const entry = Object.entries(actions).find(([, action]) => action.exportedName === name);
        assert.ok(entry, "Build must expose the tested Server Action");
        const body = new FormData();
        for (const [key, value] of Object.entries(values)) body.set("_1_" + key, value);
        body.set("0", JSON.stringify(name === "saveProjectDraft" ? ["$K1"] : [{}, "$K1"]));
        return fetch(origin.origin + "/projects", { method: "POST", body, redirect: "manual", headers: {
          "Next-Action": entry[0], Origin: origin.origin, ...(authenticated ? { Cookie: cookie } : {}),
        } });
      };
      const actionSlug = "action-http-" + id;
      const empty = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
      const fields = { id: "", updated_at: "", name: actionSlug, slug: actionSlug, description_content: empty, objectives_content: empty, repository_url: "", is_published: "true", position: "999999", status: "development", is_hidden: "false", cancellation_reason: "" };
      const draftFields = { ...fields, id: draftProjectId, slug: "draft-" + actionSlug, is_published: "false" };
      assert.ok((await (await invoke("saveProjectDraft", draftFields, false)).text()).includes('"unauthorized"'));
      assert.ok((await (await invoke("saveProjectDraft", { ...draftFields, is_published: "true" })).text()).includes('"invalid"'));
      assert.equal((await admin.from("projects").select("id").eq("id", draftProjectId)).data?.length, 0);
      const prepared = await invoke("saveProjectDraft", draftFields);
      assert.ok((await prepared.text()).includes('"success":true'));
      const draft = await admin.from("projects").select("*").eq("id", draftProjectId).single();
      assert.ok(draft.data); assert.equal(draft.data.is_published, false);
      assert.equal((await fetch(origin.origin + "/projects/" + draftFields.slug)).status, 404);
      const replay = await invoke("saveProjectDraft", draftFields);
      assert.ok((await replay.text()).includes('"success":true'));
      assert.equal((await admin.from("projects").select("id").eq("id", draftProjectId)).data?.length, 1);
      assert.equal((await admin.from("projects").select("updated_at").eq("id", draftProjectId).single()).data?.updated_at, draft.data.updated_at);
      const foreignDraft = JSON.stringify({ type: "doc", content: [{ type: "image", attrs: { assetId, alt: "Other project's asset" } }] });
      assert.ok((await (await invoke("saveProjectDraft", { ...draftFields, updated_at: draft.data.updated_at, description_content: foreignDraft })).text()).includes('"invalid"'));
      const draftUpdate = await invoke("saveProjectDraft", { ...draftFields, updated_at: draft.data.updated_at, name: "Retained draft fixture" });
      assert.ok((await draftUpdate.text()).includes('"success":true'));
      assert.ok((await (await invoke("saveProjectDraft", { ...draftFields, updated_at: draft.data.updated_at })).text()).includes('"stale"'));
      assert.ok((await (await invoke("saveProjectDraft", draftFields)).text()).includes('"stale"'), "Initial replay cannot bypass later edits");
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
      const forceDraft = await invoke("saveProjectDraft", { ...fields, id: created.data.id, updated_at: created.data.updated_at, is_published: "false" });
      assert.ok((await forceDraft.text()).includes('"stale"'), "Draft preparation cannot unpublish an existing project");
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
      for (const status of ["development", "maintenance", "completed", "cancelled"]) {
        const currentRow = await admin.from("projects").select("updated_at").eq("id", original.id).single(); assert.ok(currentRow.data);
        const result = await invoke("saveProject", { ...base, slug: changedSlug, updated_at: currentRow.data.updated_at, status, cancellation_reason: "Changed priorities", is_hidden: "true", is_published: "true" });
        assert.ok(result.headers.get("x-action-redirect"));
        const savedRow = await admin.from("projects").select("status,cancellation_reason,is_hidden,is_published,updated_at").eq("id", original.id).single(); assert.ok(savedRow.data);
        assert.equal(savedRow.data.status, status); assert.equal(savedRow.data.cancellation_reason, "Changed priorities");
        assert.equal(savedRow.data.is_hidden, true); assert.equal(savedRow.data.is_published, true);
        const invalidReason = await invoke("saveProject", { ...base, slug: changedSlug, updated_at: savedRow.data.updated_at, status: "cancelled", cancellation_reason: " " });
        assert.ok((await invalidReason.text()).includes('"cancellation_reason":"required"'));
        const invalidStatus = await invoke("saveProject", { ...base, slug: changedSlug, updated_at: savedRow.data.updated_at, status: "archived" });
        assert.ok((await invalidStatus.text()).includes('"status":"invalid"'));
        assert.equal((await admin.from("projects").select("updated_at").eq("id", original.id).single()).data?.updated_at, savedRow.data.updated_at);
      }
      const cancelled = await admin.from("projects").select("updated_at").eq("id", original.id).single(); assert.ok(cancelled.data);
      await invoke("saveProject", { ...base, slug: changedSlug, updated_at: cancelled.data.updated_at, status: "development", cancellation_reason: "Changed priorities" });
      const reopened = await admin.from("projects").select("status,cancellation_reason").eq("id", original.id).single();
      assert.equal(reopened.data?.status, "development"); assert.equal(reopened.data.cancellation_reason, "Changed priorities");
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
      assert.ok(html.includes('aria-label="View project information"'));
      assert.doesNotMatch(html, />Read only<\/span>/);
      assert.doesNotMatch(html, />Edit project<\/button>/);
      const result = await fetch(origin.origin + publicPath, { redirect: "manual" });
      assert.equal(result.status, 200);
      assert.equal(result.headers.get("location"), null);
      assert.equal(result.headers.get("content-type"), "image/webp");
      assert.match(result.headers.get("cache-control") ?? "", /no-store/);
      assert.deepEqual(Buffer.from(await result.arrayBuffer()), image);
      assert.ok((await publicClient.storage.from("project-images").createSignedUrl(objectPath, 60)).error);
      assert.ok((await admin.storage.from("project-images").createSignedUrl(objectPath, 60)).error);
    });
    await context.test("hidden cards remain listed while all detail and data paths deny visitors", async () => {
      const cardName = "Lifecycle hidden card " + id;
      for (const published of [false, true]) for (const hidden of [false, true]) {
        assert.equal((await admin.from("projects").update({ name: cardName, is_published: published, is_hidden: hidden }).eq("id", id)).error, null);
        const summaries = await publicClient.rpc("list_project_summaries"); assert.equal(summaries.error, null);
        const summary = summaries.data?.find((item) => item.id === id);
        assert.equal(Boolean(summary), published);
        if (summary) {
          assert.deepEqual(Object.keys(summary).sort(), ["id", "slug", "name", "description", "status", "is_hidden", "is_published", "position"].sort());
          assert.equal(summary.slug, hidden ? null : slug);
          assert.equal(summary.description, hidden ? null : "Rich HTTP fixture");
        }
        const accessible = published && !hidden;
        const directProject = await publicClient.from("projects").select("*").eq("id", id);
        const columns = await publicClient.from("columns").select("*").eq("project_id", id);
        const tasks = await publicClient.from("tasks").select("*").eq("project_id", id);
        const assets = await publicClient.from("project_assets").select("*").eq("id", assetId);
        for (const result of [directProject, columns, tasks, assets]) {
          assert.equal(result.error, null); assert.equal(result.data?.length, accessible ? 1 : 0);
        }
        const list = await (await fetch(origin.origin + "/projects")).text();
        const listRsc = await (await fetch(origin.origin + "/projects", { headers: { RSC: "1" } })).text();
        for (const body of [list, listRsc]) {
          assert.equal(body.includes(cardName), published);
          if (hidden || !published) { assert.ok(!body.includes(slug)); assert.ok(!body.includes("Rich HTTP fixture")); }
        }
        const detail = await fetch(origin.origin + "/projects/" + slug); assert.equal(detail.status, accessible ? 200 : 404);
        if (!accessible) {
          for (const body of [await detail.text(), await (await fetch(origin.origin + "/projects/" + slug, { headers: { RSC: "1" } })).text()]) {
            for (const secret of [cardName, "Rich HTTP fixture", "Private board fixture task", "https://example.com/repository", assetId]) assert.ok(!body.includes(secret), "Private detail leaked: " + secret);
          }
        }
        assert.equal((await fetch(origin.origin + publicPath)).status, accessible ? 200 : 404);
        assert.equal((await fetch(origin.origin + publicPath, { headers: { Cookie: cookie } })).status, accessible ? 200 : 404);
        assert.equal(Boolean((await publicClient.storage.from("project-images").download(objectPath)).error), !accessible);
        assert.equal((await fetch(origin.origin + "/projects/" + slug + "?edit=1", { headers: { Cookie: cookie } })).status, 200);
        assert.equal((await fetch(origin.origin + publicPath + "?preview=1", { headers: { Cookie: cookie } })).status, 200);
      }
      const deniedDelete = await admin.from("projects").delete().eq("id", id); assert.ok(deniedDelete.error);
      assert.equal((await admin.from("projects").select("id").eq("id", id)).data?.length, 1);
    });
    assert.equal((await admin.from("projects").update({ is_published: false }).eq("id", id)).error, null);
    await context.test("unpublishing cuts off the same image URL immediately", async () => {
      assert.equal((await fetch(origin.origin + publicPath)).status, 404);
      assert.ok((await publicClient.storage.from("project-images").download(objectPath)).error);
      assert.equal((await fetch(origin.origin + "/projects/" + slug)).status, 404);
    });
  } finally {
    // Delete exactly this run's fixtures, object first; preserve all existing data/users.
    removeLocalProjectFixture(draftProjectId, ["draft-action-http-" + id]);
    if (actionProjectId) removeLocalProjectFixture(actionProjectId, ["action-http-" + id, "action-http-" + id + "-edited"]);
    for (const asset of routeAssets) {
      assert.equal((await admin.storage.from("project-images").remove([asset.objectPath])).error, null);
      assert.equal((await admin.from("project_assets").delete().eq("id", asset.id).eq("project_id", id)).error, null);
    }
    if (uploaded) assert.equal((await admin.storage.from("project-images").remove([objectPath])).error, null);
    if (assetCreated) assert.equal((await admin.from("project_assets").delete().eq("id", assetId).eq("project_id", id)).error, null);
    if (projectCreated) removeLocalProjectFixture(id, [slug]);
    assert.equal(population(), before);
  }
});
