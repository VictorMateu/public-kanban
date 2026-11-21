import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import type { Database } from "../lib/supabase/database.types.ts";
import { launchBrowser, waitFor } from "./support/image-browser.ts";
import { environment, localAdministratorToken, origin, population, removeLocalProjectFixture, supabaseUrl } from "./support/local-project.ts";

test("owner manages tasks with the dialog, keyboard, pointer and touch", { timeout: 120_000 }, async () => {
  const before = population();
  const projectId = randomUUID();
  const slug = "task-browser-" + projectId;
  const pathname = "/projects/" + slug;
  const token = localAdministratorToken();
  const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const admin = createClient<Database>(supabaseUrl.origin, key, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } },
  });
  const anon = createClient<Database>(supabaseUrl.origin, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const cookies: { name: string; value: string }[] = [];
  const auth = createServerClient<Database>(supabaseUrl.origin, key, {
    cookies: { getAll: () => cookies, setAll: (values) => { cookies.splice(0, cookies.length, ...values); } },
  });
  assert.equal((await auth.auth.setSession({ access_token: token, refresh_token: randomUUID() })).error, null);
  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  try {
    assert.equal((await admin.from("projects").insert({ id: projectId, slug, name: "Task browser fixture", is_published: true })).error, null);
    const columns = await admin.from("columns").select("id, stage").eq("project_id", projectId).order("position");
    assert.equal(columns.error, null);
    assert.deepEqual(columns.data?.map((column) => column.stage), ["todo", "in_progress", "review", "done"]);
    const [todo, progress, , done] = columns.data ?? [];
    assert.ok(todo && progress && done);
    const denied = await anon.rpc("mutate_task", { p_operation: "create", p_project: projectId, p_task: randomUUID(),
      p_column: todo.id, p_title: "Denied", p_hidden: false });
    assert.equal(denied.error?.code, "42501");

    browser = await launchBrowser();
    const { send, evaluate, click } = browser;
    const setViewport = (width: number, height: number, mobile: boolean) => send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile,
    });
    await setViewport(1600, 880, false);
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await send("Network.setCookies", { cookies: cookies.map(({ name, value }) => ({ name, value, url: origin.origin })) });
    await send("Page.navigate", { url: origin.origin + pathname });
    const exists = async (selector: string) => z.boolean().parse(await evaluate("function(selector) { return Boolean(document.querySelector(selector)); }", [selector]));
    const has = (selector: string) => waitFor(() => exists(selector), selector);
    const card = (id: string) => `[data-board-task="${id}"]`;
    const column = (id: string) => `[data-board-column="${id}"]`;
    const edit = (id: string) => `[data-edit-task="${id}"]`;
    const dialog = "dialog:modal";
    const editable = `${dialog} [name=title]`;
    const confirm = `${dialog} .project-primary-action`;
    const pointSchema = z.object({ x: z.number(), y: z.number() });
    const point = async (selector: string, fraction = 0.5) => pointSchema.parse(await evaluate(
      "function(selector, fraction) {const r=document.querySelector(selector).getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height*fraction)};}",
      [selector, fraction],
    ));
    async function create(title: string) {
      await waitFor(async () => {
        if (!await exists("[data-new-task]")) return false;
        if (!await exists(editable)) await click("[data-new-task]");
        return exists(editable);
      }, "open task editor after hydration");
      assert.equal(await evaluate("document.activeElement.id"), "task-editor-heading");
      assert.equal(await exists(dialog + " [data-archive-task]"), false);
      await click(editable);
      await send("Input.insertText", { text: title });
      await click(confirm);
      await waitFor(async () => !await exists(dialog), "save task and close editor");
      const response = await admin.from("tasks").select("id").eq("project_id", projectId).eq("title", title).single();
      assert.ok(response.data);
      await has(card(response.data.id));
      return response.data.id;
    }
    async function task(id: string) {
      const response = await admin.from("tasks").select("*").eq("id", id).single();
      assert.equal(response.error, null);
      assert.ok(response.data);
      return response.data;
    }
    async function drag(fromSelector: string, destination: string, fraction: number) {
      await has("[data-new-task]:not(:disabled)");
      await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      await evaluate('function(selector) { document.querySelector(selector).scrollIntoView({block:"nearest",inline:"nearest"}); }', [fromSelector]);
      const from = await point(fromSelector);
      const to = await point(destination, fraction);
      assert.equal(await evaluate("function(selector, point) { return document.elementFromPoint(point.x, point.y) === document.querySelector(selector); }", [fromSelector, from]), true, "Drag handle is reachable");
      assert.equal(await evaluate("function(selector, point) { return document.querySelector(selector).contains(document.elementFromPoint(point.x, point.y)); }", [destination, to]), true, "Drop destination is reachable");
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...from });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", ...from, button: "left", buttons: 1, clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...to, buttons: 1 });
      await has("[data-drop-before=true], [data-drop-end]");
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...to, button: "left", buttons: 0, clickCount: 1 });
    }

    async function press(key: string, windowsVirtualKeyCode: number) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode, text: key === "Enter" ? "\r" : "" });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode });
    }
    const calendar = `${dialog} [popover]:popover-open`;
    const calendarTrigger = `${dialog} [popovertarget]`;
    const dateInput = `${dialog} [name=due_date]`;
    const alpha = await create("Task Alpha");
    const beta = await create("Task Beta");
    await drag(card(beta) + " [data-task-drag]", card(alpha), 0.2);
    await has(column(todo.id) + " li:first-child" + card(beta));
    assert.deepEqual([(await task(beta)).position, (await task(alpha)).position], [0, 1]);

    // Use the keyboard alternative for ordering and the editor for changing stages.
    const moveDown = card(beta) + " [data-move-down]:not(:disabled)";
    await has(moveDown);
    await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    await evaluate("function(selector) { document.querySelector(selector).focus(); }", [moveDown]);
    assert.equal(await evaluate("document.activeElement?.hasAttribute('data-move-down')"), true);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
    await has(column(todo.id) + " li:first-child" + card(alpha));
    await click(edit(alpha));
    const status = `${dialog} select[name=columnId]`;
    await click(status);
    await has(status + ":open");
    assert.equal(await evaluate("function(selector) { return getComputedStyle(document.querySelector(selector), '::picker(select)').appearance; }", [status]), "base-select");
    await press("End", 35);
    await press("Enter", 13);
    await waitFor(async () => !await exists(status + ":open"), "select status and dismiss menu");
    await click(confirm);
    await has(column(done.id) + " " + card(alpha));
    assert.equal((await task(alpha)).completed_on, new Date().toISOString().slice(0, 10));

    await drag(card(alpha) + " [data-task-drag]", column(todo.id), 0.12);
    await has(column(todo.id) + " " + card(alpha));
    assert.equal((await task(alpha)).completed_on, null);

    await setViewport(390, 844, true);
    await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    // Scroll the board so both the handle and a slice of the destination are in view.
    const position = await evaluate('function(from, to) { const scroller=document.querySelector("[data-task-scroll]"); const handle=document.querySelector(from); const next=document.querySelector(to); scroller.scrollLeft+=next.getBoundingClientRect().left-innerWidth+125; return handle.getBoundingClientRect().right < innerWidth && next.getBoundingClientRect().left < innerWidth; }',
      [card(alpha) + " [data-task-drag]", column(progress.id)]);
    assert.equal(position, true);
    const touchFrom = await point(card(alpha) + " [data-task-drag]");
    const touchTo = await evaluate('function(selector) { const r=document.querySelector(selector).getBoundingClientRect(); return {x:Math.round(r.left+45),y:Math.round(r.top+50)}; }', [column(progress.id)]);
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchFrom] });
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pointSchema.parse(touchTo)] });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await has(column(progress.id) + " " + card(alpha));
    assert.equal((await task(alpha)).column_id, progress.id);
    assert.equal(await evaluate("document.documentElement.scrollWidth === innerWidth"), true);
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });

    await click(edit(alpha));
    await click(calendarTrigger);
    await has(calendar + " [data-calendar-day]:focus");
    const focusedDay = () => evaluate("document.activeElement?.dataset.calendarDay ?? null");
    const initialDay = z.iso.date().parse(await focusedDay());
    await press("PageDown", 34);
    await waitFor(async () => {
      const focused = await focusedDay();
      return typeof focused === "string" && focused.slice(0, 7) !== initialDay.slice(0, 7);
    }, "keyboard advances one calendar month");
    const nextMonthDay = await focusedDay();
    await press("ArrowRight", 39);
    await waitFor(async () => {
      const focused = await focusedDay();
      return typeof focused === "string" && focused !== nextMonthDay;
    }, "keyboard advances one calendar day");
    assert.equal(await evaluate("function(selector) { const r = document.querySelector(selector).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }", [calendar]), true);
    const selectedDate = z.iso.date().parse(await evaluate("document.activeElement?.dataset.calendarDay"));
    await press("Enter", 13);
    await waitFor(async () => !await exists(calendar), "select date and dismiss calendar");
    assert.equal(await evaluate("function(selector) { return document.querySelector(selector).value; }", [dateInput]), selectedDate);
    await click(calendarTrigger);
    await has(`${calendar} [data-calendar-day="${selectedDate}"]:focus[aria-pressed=true]`);
    await press("Escape", 27);
    await waitFor(async () => !await exists(calendar), "Escape dismisses the calendar");
    await has(dialog);
    await click(confirm);
    await waitFor(async () => !await exists(dialog), "save expected completion date");
    assert.equal((await task(alpha)).due_date, selectedDate);

    await click(edit(alpha));
    const hiddenSwitch = `${dialog} input[name=hidden][role=switch]`;
    await evaluate("function(selector) { document.querySelector(selector).focus(); }", [hiddenSwitch]);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
    await has(hiddenSwitch + ":checked");
    await click(confirm);
    await waitFor(async () => !await exists(dialog), "save hidden task");
    assert.equal((await task(alpha)).is_hidden, true);
    const publicTasks = await anon.from("tasks").select("id").eq("project_id", projectId);
    assert.deepEqual(publicTasks.data, [{ id: beta }]);

    await click(edit(beta));
    const archiveButton = `${dialog} footer [data-archive-task]`;
    await has(archiveButton);
    assert.equal(await evaluate("function(selector) { const footer = document.querySelector(selector); return footer.scrollWidth === footer.clientWidth; }", [`${dialog} footer`]), true);
    await click(archiveButton);
    assert.equal(await exists(archiveButton), false);
    assert.equal((await task(beta)).archived_at, null);
    await click(confirm);
    await waitFor(async () => !await exists(card(beta)), "archived task leaves the board");
    assert.ok((await task(beta)).archived_at);
    for (const headers of [new Headers(), new Headers({ RSC: "1" })]) {
      const response = await fetch(origin.origin + pathname, { headers });
      assert.equal(response.status, 200);
      assert.doesNotMatch(await response.text(), /Task Alpha|Task Beta|data-edit-task/);
    }
  } finally {
    await browser?.close();
    removeLocalProjectFixture(projectId, [slug]);
    assert.equal(population(), before);
  }
});
