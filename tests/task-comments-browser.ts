import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import sharp from "sharp";
import { commentPageSchema } from "../lib/tasks/comment-schemas.ts";
import { richTextAssetIds, plainTextDocument } from "../lib/projects/rich-text.ts";
import type { Database } from "../lib/supabase/database.types.ts";
import { launchBrowser, waitFor } from "./support/image-browser.ts";
import { environment, localAdministratorToken, origin, population, removeLocalProjectFixture, supabaseUrl } from "./support/local-project.ts";

test("the task dialog manages rich comments and public image access", { timeout: 120_000 }, async () => {
  const before = population();
  const projectId = randomUUID();
  const taskId = randomUUID();
  const slug = "task-browser-" + projectId;
  const boardUrl = new URL("/projects/" + slug, origin);
  const commentsUrl = new URL("/task-comments/" + taskId, origin);
  const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = localAdministratorToken();
  const admin = createClient<Database>(supabaseUrl.origin, key, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } },
  });
  const anon = createClient<Database>(supabaseUrl.origin, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const cookies: { name: string; value: string }[] = [];
  const auth = createServerClient<Database>(supabaseUrl.origin, key, {
    cookies: { getAll: () => cookies, setAll: (values) => { cookies.splice(0, cookies.length, ...values); } },
  });
  assert.equal((await auth.auth.setSession({ access_token: token, refresh_token: randomUUID() })).error, null);
  const cookieHeader = cookies.map(({ name, value }) => name + "=" + value).join("; ");
  const previewUrl = new URL("?preview=1", commentsUrl);
  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;

  async function publicComments(url = commentsUrl) {
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/u);
    const data: unknown = await response.json();
    return commentPageSchema.parse(data);
  }

  try {
    assert.equal((await admin.from("projects").insert({ id: projectId, slug, name: "Comment fixture", is_published: true })).error, null);
    const todo = await admin.from("columns").select("id").eq("project_id", projectId).eq("stage", "todo").single();
    assert.ok(todo.data);
    assert.equal((await admin.rpc("mutate_task", { p_operation: "create", p_project: projectId, p_task: taskId,
      p_column: todo.data.id, p_title: "Task with comments", p_hidden: false })).data, "ok");

    browser = await launchBrowser();
    const { send, evaluate, click } = browser;
    const section = "dialog:modal [data-task-comments]";
    const card = `[data-open-task="${taskId}"]`;
    const textbox = section + " [contenteditable=true]";
    const descriptionTab = 'dialog:modal [data-task-tab="description"]';
    const commentsTab = 'dialog:modal [data-task-tab="comments"]';
    const badge = commentsTab + " span";
    const submit = section + " form button[type=submit]";
    const attach = section + " button[aria-controls$='-attachment']";
    const viewport = (width: number, height: number) => send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile: width < 500,
    });
    const exists = async (selector: string) => Boolean(await evaluate("function(selector) { return document.querySelector(selector) !== null; }", [selector]));
    const has = (selector: string) => waitFor(() => exists(selector), selector);
    const countIs = (count: number) => waitFor(async () => await evaluate(
      "function(selector) { return document.querySelector(selector)?.textContent.trim() ?? null; }", [badge],
    ) === String(count), "comment count " + count);
    const text = async () => String(await evaluate("function(selector) { return document.querySelector(selector)?.textContent ?? ''; }", [section]));
    const press = async (key: string, windowsVirtualKeyCode: number, modifiers = 0) => {
      const code = key === " " ? "Space" : key;
      const text = modifiers ? "" : key === "Enter" ? "\r" : key === " " ? " " : "";
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode, modifiers, text });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode, modifiers });
    };
    const open = async () => {
      await has(card);
      await waitFor(async () => {
        if (!await exists(descriptionTab)) {
          await evaluate("function(selector) { document.querySelector(selector).focus(); }", [card]);
          await press("Enter", 13);
        }
        return exists(descriptionTab);
      }, "open task by keyboard");
      assert.equal(await exists(descriptionTab + '[aria-selected="true"]'), true);
      assert.equal(await exists(section), false);
      await has(badge);
      await evaluate("function(selector) { document.querySelector(selector).focus(); }", [descriptionTab]);
      await press("ArrowRight", 39);
      await has(commentsTab + '[aria-selected="true"]:focus');
      await has(section);
    };
    const close = async () => {
      await press("Escape", 27);
      await waitFor(async () => !await exists("dialog:modal"), "close task by keyboard");
      assert.equal(await exists(card + ":focus"), true);
    };
    await viewport(1440, 900);
    await send("Network.setCookies", { cookies: cookies.map(({ name, value }) => ({ name, value, url: origin.origin })) });
    await send("Page.navigate", { url: boardUrl.href });
    await has(card);
    await evaluate(`(() => {
      const original = window.fetch;
      window.fetch = (...args) => {
        if (!String(args[0]).startsWith('/task-comments/') || String(args[0]).includes('count=1')) return original(...args);
        window.fetch = original;
        return new Promise(resolve => setTimeout(() => resolve(new Response(null, { status: 503 })), 900));
      };
    })()`);
    await open();
    await countIs(0);
    assert.match(await text(), /Loading comments/u);
    await waitFor(async () => (await text()).includes("Comments could not be loaded"), "comment loading error");
    await click(section + " section [role=alert] + button");
    await waitFor(async () => (await text()).includes("There are no comments yet"), "comments reload after retry");
    assert.match(await text(), /There are no comments yet/u);
    await has(textbox);
    assert.equal(await exists(submit + ":disabled"), true, "empty comments cannot be posted");
    const visibility = section + " [role=switch]";
    assert.equal(await exists(visibility + ":not(:checked)"), true, "new comments are private");
    assert.equal(await evaluate(`function(attachmentSelector, switchSelector) {
      const attach = document.querySelector(attachmentSelector);
      const label = document.querySelector(switchSelector).closest('label');
      const attachmentBounds = attach.getBoundingClientRect();
      const labelBounds = label.getBoundingClientRect();
      const midpoint = (bounds) => bounds.top + bounds.height / 2;
      return attach.parentElement === label.parentElement && Math.abs(midpoint(attachmentBounds) - midpoint(labelBounds)) < 1
        && attachmentBounds.right < labelBounds.left;
    }`, [attach, visibility]), true, "attachment and visibility share the editor footer");
    await evaluate("function(selector) { document.querySelector(selector).focus(); }", [visibility]);
    await press(" ", 32);
    await has(visibility + ":checked:focus");
    await press(" ", 32);
    await has(visibility + ":not(:checked):focus");
    await has(textbox);
    assert.equal(await evaluate(`function(selector) {
      const form = document.querySelector(selector + ' form');
      const listHeading = document.querySelector(selector + ' section h3');
      const toolbar = form.querySelector('.editor-toolbar');
      const editor = form.querySelector('[contenteditable="true"]');
      return listHeading.getBoundingClientRect().bottom < form.getBoundingClientRect().top
        && toolbar.getBoundingClientRect().bottom <= editor.getBoundingClientRect().top;
    }`, [section]), true);
    await click(textbox);
    await send("Input.insertText", { text: "Diagram explaining the scope" });
    await click(descriptionTab);
    await click(commentsTab);
    assert.equal(await evaluate("function(selector) { return document.querySelector(selector).textContent; }", [textbox]), "Diagram explaining the scope");
    await evaluate("function(selector) { const editor = document.querySelector(selector); editor.focus(); }", [textbox]);
    await press("Enter", 13);
    assert.equal(await exists(textbox + " p:nth-of-type(2)"), true, "plain Enter adds a line without posting");
    await has(attach + '[aria-expanded="false"]');
    await click(attach);
    await has(attach + '[aria-expanded="true"]');
    const png = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#cba56b" } }).png().toBuffer();
    await evaluate(`function(selector, bytes) {
      const field = document.querySelector(selector + ' input[type=file]');
      const files = new DataTransfer();
      files.items.add(new File([Uint8Array.from(bytes)], 'comment-diagram.png', { type: 'image/png' }));
      field.files = files.files;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }`, [section, [...png]]);
    assert.equal(await exists(submit + ":disabled"), true, "an uninserted image blocks posting");
    const upload = section + " [role=group]:has(input[type=file])";
    await click(upload + " input:not([type=file])");
    await send("Input.insertText", { text: "A diagram of the task" });
    await press("Enter", 13);
    await has(textbox + ' img[alt="A diagram of the task"]');
    await has(attach + '[aria-expanded="false"]');
    const staged = await admin.from("project_assets").select("id").eq("project_id", projectId).single();
    assert.ok(staged.data);
    const imageUrl = new URL("/project-images/" + staged.data.id, origin);
    assert.equal((await fetch(imageUrl)).status, 404);
    await evaluate("function(selector) { document.querySelector(selector).focus(); }", [textbox]);
    await press("Enter", 13, 2);
    await waitFor(async () => await exists(section + " li") && await exists(submit + ":disabled"), "Ctrl+Enter saves and resets the composer");
    await countIs(1);
    const publicCount = await fetch(new URL("?count=1", commentsUrl), { headers: { Cookie: cookieHeader } });
    assert.deepEqual(await publicCount.json(), { count: 0 }, "the public counter excludes private comments with an owner cookie");
    assert.equal((await fetch(new URL("?count=1&preview=1", commentsUrl))).status, 404);
    assert.deepEqual((await publicComments()).comments, []);
    assert.equal((await fetch(previewUrl)).status, 404);
    const ownerResponse = await fetch(previewUrl, { headers: { Cookie: cookieHeader } });
    assert.equal(ownerResponse.status, 200);
    const ownerPayload: unknown = await ownerResponse.json();
    const [comment] = commentPageSchema.parse(ownerPayload).comments;
    assert.ok(comment && !comment.is_public);
    assert.deepEqual(richTextAssetIds(comment.body), [staged.data.id]);
    const publicCookieResponse = await fetch(commentsUrl, { headers: { Cookie: cookieHeader } });
    assert.deepEqual(await publicCookieResponse.json(), { comments: [], next: null });
    for (const headers of [new Headers(), new Headers({ RSC: "1" })]) {
      const board = await fetch(boardUrl, { headers });
      assert.equal(board.status, 200);
      assert.doesNotMatch(await board.text(), /Diagram explaining the scope|A diagram of the task/u);
    }
    const storagePath = projectId + "/" + staged.data.id + ".webp";
    assert.ok((await anon.storage.from("project-images").download(storagePath)).error);

    await viewport(390, 844);
    await has(section + ' li button[aria-label="Edit comment"] svg');
    await has(section + ' li button[aria-label="Delete comment"] svg');
    await click(section + ' li button[aria-label="Edit comment"]');
    await has(section + " form h4:focus");
    assert.equal(await evaluate(`(() => {
      const section = document.querySelector('dialog:modal [data-task-comments]');
      const footer = section.querySelector('li button[aria-controls$="-attachment"]').parentElement;
      return section.scrollWidth <= section.clientWidth && footer.scrollWidth <= footer.clientWidth
        && document.documentElement.scrollWidth === innerWidth;
    })()`), true);
    const editVisibility = section + " li [role=switch]";
    await evaluate("function(selector) { document.querySelector(selector).focus(); }", [editVisibility]);
    await press(" ", 32);
    await has(editVisibility + ":checked");
    await click(section + " li form button[type=submit]");
    await waitFor(async () => (await publicComments()).comments.length === 1, "public comment becomes visible");
    await has(section + " li");
    assert.match(await text(), /Edited/u);
    assert.equal((await fetch(imageUrl)).status, 200);
    assert.equal((await anon.storage.from("project-images").download(storagePath)).error, null);
    await close();

    await send("Network.clearBrowserCookies");
    await send("Page.navigate", { url: boardUrl.href });
    await open();
    await countIs(1);
    await waitFor(async () => (await text()).includes("Diagram explaining the scope"), "visitor sees public comment");
    await has(section + ' img[alt="A diagram of the task"]');
    assert.equal(await exists(section + " button"), false);
    await close();

    await send("Network.setCookies", { cookies: cookies.map(({ name, value }) => ({ name, value, url: origin.origin })) });
    await send("Page.navigate", { url: boardUrl.href });
    await open();
    const deleteButton = section + ' li button[aria-label="Delete comment"]';
    await has(deleteButton);
    await click(deleteButton);
    assert.match(await text(), /Permanently delete this comment/u);
    await click(section + " li .project-primary-action");
    await waitFor(async () => (await text()).includes("There are no comments yet"), "delete refreshes the discussion");
    await countIs(0);
    assert.equal((await fetch(imageUrl)).status, 404);
    assert.ok((await anon.storage.from("project-images").download(storagePath)).error);

    const body = plainTextDocument("Pagination fixture");
    for (let index = 0; index < 21; index++) {
      assert.equal((await admin.rpc("mutate_task_comment", {
        p_operation: "create", p_project: projectId, p_task: taskId, p_comment: randomUUID(), p_body: body, p_public: true,
      })).data, "ok");
    }
    const newest = await publicComments();
    assert.equal(newest.comments.length, 20);
    assert.ok(newest.next);
    const older = await publicComments(new URL("?" + new URLSearchParams({
      before: newest.next.created_at, beforeId: newest.next.id,
    }), commentsUrl));
    assert.equal(older.comments.length, 1);
    assert.equal(older.next, null);
    assert.equal(new Set([...newest.comments, ...older.comments].map(({ id }) => id)).size, 21);

    await close();
    const task = await admin.from("tasks").select("updated_at").eq("id", taskId).single();
    assert.ok(task.data);
    assert.equal((await admin.rpc("mutate_task", {
      p_operation: "archive", p_project: projectId, p_task: taskId, p_version: task.data.updated_at,
    })).data, "ok");
    assert.deepEqual((await publicComments()).comments, []);
    await send("Page.navigate", { url: boardUrl.href });
    await has("[data-open-archive]");
    await waitFor(async () => {
      if (!await exists("dialog:modal")) await click("[data-open-archive]");
      return exists("dialog:modal details summary");
    }, "open the archive");
    await click("dialog:modal details summary");
    await countIs(21);
    await click(commentsTab);
    await has(section + " li");
    assert.equal(await exists(section + " li button, " + section + " form"), false);
    assert.equal(await evaluate(`document.querySelectorAll('${section} li').length`), 20);
    await click(section + " section > button");
    await waitFor(async () => await evaluate(`document.querySelectorAll('${section} li').length`) === 21, "load earlier archived comments");
  } finally {
    await browser?.close();
    const assets = await admin.from("project_assets").select("id, object_path").eq("project_id", projectId);
    assert.equal(assets.error, null);
    if (assets.data?.length) {
      assert.equal((await admin.storage.from("project-images").remove(assets.data.map(({ object_path }) => object_path))).error, null);
      assert.equal((await admin.from("project_assets").delete().eq("project_id", projectId).in("id", assets.data.map(({ id }) => id))).error, null);
    }
    removeLocalProjectFixture(projectId, [slug]);
    assert.equal(population(), before);
  }
});
