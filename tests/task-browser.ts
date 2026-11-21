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
    const [todo, progress, review, done] = columns.data ?? [];
    assert.ok(todo && progress && review && done);
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
    await send("Page.navigate", { url: origin.origin + pathname + "?edit=1" });
    const exists = async (selector: string) => z.boolean().parse(await evaluate("function(selector) { return Boolean(document.querySelector(selector)); }", [selector]));
    const has = (selector: string) => waitFor(() => exists(selector), selector);
    const card = (id: string) => `[data-board-task="${id}"]`;
    const column = (id: string) => `[data-board-column="${id}"]`;
    const open = (id: string) => `[data-open-task="${id}"]`;
    const dialog = "dialog:modal";
    const editable = `${dialog} [name=title]`;
    async function edit(id: string) {
      await click(open(id));
      await click(dialog + " [data-edit-task]");
      await has(editable + ":not(:disabled)");
      assert.equal(await exists(dialog + " [data-edit-task]"), false);
    }
    const confirm = `${dialog} .project-primary-action`;
    async function assertBoardFitsViewport() {
      const bounds = await evaluate(`(() => {
        const root = document.documentElement;
        const board = document.querySelector("[data-task-scroll]");
        const boardBounds = board.getBoundingClientRect();
        return {
          pageFits: root.scrollHeight === root.clientHeight,
          boardFits: boardBounds.top >= 0 && root.clientHeight - boardBounds.bottom >= 20,
          addActionsAreInline: [...board.querySelectorAll("[data-new-task]")].every(button =>
            button.closest("[data-column-scroll]") && button.parentElement.previousElementSibling?.matches("ul, p")),
        };
      })()`);
      assert.deepEqual(bounds, { pageFits: true, boardFits: true, addActionsAreInline: true });
    }
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
      assert.equal(await evaluate("function(selector, point) { return document.querySelector(selector).contains(document.elementFromPoint(point.x, point.y)); }", [fromSelector, from]), true, "Drag surface is reachable");
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
    const projectStatus = `${dialog} #project-status`;
    await has(projectStatus);
    await evaluate("function(selector) { document.querySelector(selector).focus(); }", [projectStatus]);
    await press("Enter", 13);
    await has(projectStatus + ":open");
    assert.equal(await evaluate("function(selector) { return getComputedStyle(document.querySelector(selector), '::picker(select)').appearance; }", [projectStatus]), "base-select");
    await press("Escape", 27);
    await waitFor(async () => !await exists(projectStatus + ":open"), "Escape closes the project status picker");
    assert.equal(await exists(projectStatus + ":focus"), true);
    await press("Enter", 13);
    await has(projectStatus + ":open");
    await press("End", 35);
    await press("Enter", 13);
    await has(`${dialog} textarea[name=cancellation_reason]:required`);
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "dismiss project edit without saving");

    await has("[data-new-task]");
    const boardTop = async () => z.number().parse(await evaluate('document.querySelector("[data-task-scroll]").getBoundingClientRect().top'));
    await waitFor(async () => await boardTop() > 0, "board is laid out below the project header");
    await evaluate("document.fonts.ready.then(() => true)");
    const initialBoardTop = await boardTop();
    const alpha = await create("Task Alpha");
    assert.equal(await boardTop(), initialBoardTop);
    const beta = await create("Task Beta");
    const addInProgress = column(progress.id) + " [data-new-task]";
    assert.equal(await evaluate("document.querySelectorAll('[data-new-task]').length"), 4);
    assert.equal(await evaluate("new Set([...document.querySelectorAll('[data-stage]')].map(column => getComputedStyle(column).backgroundImage)).size"), 4);
    await click(addInProgress);
    await has(editable);
    assert.equal(await evaluate("document.querySelector('dialog:modal [name=columnId]').value"), progress.id);
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "dismiss the column task editor");
    assert.equal(await exists(addInProgress + ":focus"), true);
    await drag(card(beta) + " [data-task-drag]", card(alpha), 0.2);
    await has(column(todo.id) + " li:first-child" + card(beta));
    assert.deepEqual([(await task(beta)).position, (await task(alpha)).position], [0, 1]);
    await has("[data-new-task]:not(:disabled)");
    assert.equal(await boardTop(), initialBoardTop);

    // Use the keyboard alternative for ordering and the editor for changing stages.
    await waitFor(async () => !await exists(dialog), "drag does not open the task");
    await evaluate("function(selector) { document.querySelector(selector).focus(); }", [open(beta)]);
    await press("Enter", 13);
    await has(dialog + " [data-edit-task]");
    const moveDown = dialog + " [data-move-down]:not(:disabled)";
    await has(moveDown);
    await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    await evaluate("function(selector) { document.querySelector(selector).focus(); }", [moveDown]);
    assert.equal(await evaluate("document.activeElement?.hasAttribute('data-move-down')"), true);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
    await has(column(todo.id) + " li:first-child" + card(alpha));
    await edit(alpha);
    const status = `${dialog} select[name=columnId]`;
    await click(status);
    await has(status + ":open");
    assert.equal(await evaluate("function(selector) { return getComputedStyle(document.querySelector(selector), '::picker(select)').appearance; }", [status]), "base-select");
    await press("End", 35);
    await press("Enter", 13);
    await waitFor(async () => !await exists(status + ":open"), "select status and dismiss menu");
    await click(confirm);
    await has(column(done.id) + " " + card(alpha));
    await has(card(alpha) + " [data-completed]");
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
    await has("[data-dragging=true]");
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pointSchema.parse(touchTo)] });
    await has(column(progress.id) + " [data-drop-end]");
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await has(column(progress.id) + " " + card(alpha));
    assert.equal((await task(alpha)).column_id, progress.id);
    assert.equal(await evaluate("document.documentElement.scrollWidth === document.documentElement.clientWidth"), true);
    await waitFor(async () => !await exists(dialog), "touch drag does not open the task");
    await evaluate('function(selector) { document.querySelector(selector).scrollIntoView({block:"nearest",inline:"center"}); }', [open(alpha)]);
    const tapPoint = await point(open(alpha));
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [tapPoint] });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await has(dialog + " [data-edit-task]");
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "dismiss the detail opened with a tap");
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });

    await edit(alpha);
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
    const cardDate = `${card(alpha)} time[datetime="${selectedDate}"]`;
    await has(cardDate);
    assert.equal(await evaluate(`function(selector) {
      const date = document.querySelector(selector);
      const bounds = date.closest("article").getBoundingClientRect();
      const dateBounds = date.getBoundingClientRect();
      const label = date.closest("dd").previousElementSibling;
      return dateBounds.left >= bounds.left && dateBounds.right <= bounds.right && label.textContent === "Due date:";
    }`, [cardDate]), true);
    await click(open(alpha));
    await has(`${dialog} time[datetime="${selectedDate}"]`);
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "return from the task detail");
    assert.equal(await exists(open(alpha) + ":focus"), true);

    await edit(alpha);
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

    await click(open(beta));
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

    // Only the list scrolls. A quick swipe starting on a card must scroll it without moving that task.
    const visibleTask = randomUUID();
    for (let i = 0; i < 15; i += 1) {
      assert.equal((await admin.rpc("mutate_task", { p_operation: "create", p_project: projectId,
        p_task: i === 0 ? visibleTask : randomUUID(), p_column: review.id, p_title: "Review task " + i,
        p_description: "Review task details " + i, p_hidden: i !== 0 })).data, "ok");
    }
    await send("Page.navigate", { url: origin.origin + pathname });
    await has(open(visibleTask));
    await waitFor(async () => await evaluate("document.readyState") === "complete", "owner board finishes loading");
    await evaluate("document.fonts.ready.then(() => true)");
    for (const [width, height, mobile] of [[1920, 1080, false], [1280, 540, false], [390, 480, true], [390, 844, true]] as const) {
      await setViewport(width, height, mobile);
      await assertBoardFitsViewport();
    }
    const reviewList = column(review.id) + " [data-column-scroll]";
    const addInReview = column(review.id) + " [data-new-task]";
    assert.equal(await evaluate("new Set([...document.querySelectorAll('[data-stage]')].map(column => column.getBoundingClientRect().height)).size"), 1);
    await waitFor(async () => z.boolean().parse(await evaluate(
      "function(selector) { const list = document.querySelector(selector); return list.scrollHeight > list.clientHeight; }", [reviewList],
    )), "review tasks overflow their column");
    await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    let swipeStart = { x: 0, y: 0 };
    await waitFor(async () => {
      await evaluate('function(selector) { document.querySelector(selector).scrollIntoView({block:"nearest",inline:"center",behavior:"instant"}); }', [open(visibleTask)]);
      const center = await point(open(visibleTask));
      swipeStart = { x: center.x, y: center.y + 15 };
      return z.boolean().parse(await evaluate("function(selector, point) { return document.elementFromPoint(point.x, point.y) === document.querySelector(selector); }",
        [open(visibleTask), swipeStart]));
    }, "swipe starts on the task card");
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [swipeStart] });
    for (const distance of [20, 44, 68]) {
      await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: swipeStart.x, y: swipeStart.y - distance }] });
    }
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitFor(async () => z.boolean().parse(await evaluate("function(selector) { return document.querySelector(selector).scrollTop > 0; }", [reviewList])), "swipe scrolls the task list");
    assert.equal(await evaluate("window.scrollY"), 0);
    await assertBoardFitsViewport();
    assert.equal(await exists(dialog + ", [data-dragging=true]"), false);
    assert.equal((await task(visibleTask)).position, 0);
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await click(addInReview);
    await has(editable);
    assert.equal(await evaluate("document.querySelector('dialog:modal [name=columnId]').value"), review.id);
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "dismiss the inline add-task editor");
    assert.equal(await exists(addInReview + ":focus"), true);

    await send("Network.clearBrowserCookies");
    await send("Page.navigate", { url: origin.origin + pathname });
    await waitFor(async () => {
      if (!await exists(open(visibleTask)) || await exists("[data-new-task]") || await evaluate("document.readyState") !== "complete") return false;
      if (!await exists(dialog)) {
        await evaluate("function(selector) { document.querySelector(selector).focus(); }", [open(visibleTask)]);
        await press("Enter", 13);
      }
      return exists(dialog);
    }, "public task detail opens after hydration");
    assert.equal(await evaluate("document.querySelector('dialog:modal').textContent.includes('Review task details 0')"), true);
    assert.equal(await evaluate("document.querySelectorAll('[data-open-task]').length"), 1);
    assert.equal(await exists("[data-task-drag], [data-new-task], [data-edit-task], [data-archive-task]"), false);
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "public task detail closes with Escape");
    assert.equal(await exists(open(visibleTask) + ":focus"), true);
    await assertBoardFitsViewport();
  } finally {
    await browser?.close();
    removeLocalProjectFixture(projectId, [slug]);
    assert.equal(population(), before);
  }
});
