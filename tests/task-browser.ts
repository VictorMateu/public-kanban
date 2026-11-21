import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import sharp from "sharp";
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
    const starters = await admin.from("tasks").select("id, title, description").eq("column_id", todo.id).order("position");
    assert.equal(starters.error, null);
    assert.ok(starters.data);
    const starterCount = starters.data.length;
    assert.equal(starterCount, 5);
    const architecture = starters.data.find(({ title }) => title === "Define the architecture and its boundaries");
    assert.ok(architecture);
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
    const toggle = (id: string) => `${column(id)} [data-column-toggle]`;
    const list = (id: string) => `${column(id)} [data-column-scroll]`;
    const open = (id: string) => `[data-open-task="${id}"]`;
    const visible = async (selector: string) => z.boolean().parse(await evaluate(
      "function(selector) { return Boolean(document.querySelector(selector)?.getClientRects().length); }", [selector],
    ));
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
    async function create(title: string, fillDescription?: () => Promise<void>) {
      await waitFor(async () => {
        if (!await exists("[data-new-task]")) return false;
        if (!await exists(editable)) await click("[data-new-task]");
        return exists(editable);
      }, "open task editor after hydration");
      assert.equal(await evaluate("document.activeElement.id"), "task-editor-heading");
      assert.equal(await exists(dialog + " [data-archive-task]"), false);
      await click(editable);
      await send("Input.insertText", { text: title });
      await fillDescription?.();
      await has(confirm + ":enabled");
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
    const archiveTrigger = "[data-open-archive]";
    await click(archiveTrigger);
    await has(dialog);
    assert.match(z.string().parse(await evaluate("document.querySelector('dialog:modal').textContent")), /No tasks have been archived yet/);
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "close the empty archive");
    assert.equal(await exists(archiveTrigger + ":focus"), true);
    const boardTop = async () => z.number().parse(await evaluate('document.querySelector("[data-task-scroll]").getBoundingClientRect().top'));
    await waitFor(async () => await boardTop() > 0, "board is laid out below the project header");
    await evaluate("document.fonts.ready.then(() => true)");
    const initialBoardTop = await boardTop();
    const descriptionEditor = `${dialog} [contenteditable=true][role=textbox]`;
    assert.match(z.string().parse(await evaluate("function(selector) { return document.querySelector(selector).closest('article').textContent; }", [open(architecture.id)])), /System task/u);
    await click(open(architecture.id));
    await has(`${dialog} dl + .rich-text h3`);
    await has(`${dialog} .rich-text ul li`);
    assert.deepEqual(await evaluate("[...document.querySelectorAll('dialog:modal dl dd')].map(item => item.textContent)"), ["To do", "System task", "Hidden"]);
    assert.equal(await exists(`${dialog} fieldset, ${dialog} [data-edit-task], ${dialog} [data-archive-task]`), false);
    const starterDescription = `${dialog} .rich-text`;
    assert.deepEqual(await evaluate("function(selector) { return [...document.querySelectorAll(selector + ' h3')].map(heading => heading.textContent); }", [starterDescription]), ["Objective", "Steps", "Done when"]);
    assert.match(z.string().parse(await evaluate("function(selector) { return document.querySelector(selector).textContent; }", [starterDescription])), /modular monolith.*microservices/u);
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "dismiss starter task details");
    const descriptionImage = `${dialog} .rich-text img[alt="Task diagram"]`;
    const png = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#cba56b" } }).png().toBuffer();
    let imagePath = "";
    const alpha = await create("Task Alpha", async () => {
      await has(descriptionEditor);
      await click(descriptionEditor);
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "b", code: "KeyB", modifiers: 2 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "b", code: "KeyB", modifiers: 2 });
      await send("Input.insertText", { text: "Task with a diagram" });
      await has(descriptionEditor + " strong");
      const file = `${dialog} input[type=file]`;
      const uploadGroup = `${dialog} [role=group]:has(input[type=file])`;
      await has(file + ":enabled");
      await evaluate(`function(selector, png) {
        const field = document.querySelector(selector);
        const files = new DataTransfer();
        files.items.add(new File([Uint8Array.from(atob(png), symbol => symbol.charCodeAt(0))], "diagram.png", { type: "image/png" }));
        field.files = files.files;
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }`, [file, png.toString("base64")]);
      await click(`${uploadGroup} input[aria-required=true]`);
      await send("Input.insertText", { text: "Task diagram" });
      await click(`${uploadGroup} button:first-of-type`);
      await has(descriptionImage);
      const preview = z.string().parse(await evaluate("function(selector) { return document.querySelector(selector).src; }", [descriptionImage]));
      imagePath = new URL(preview).pathname;
      assert.equal((await fetch(preview)).status, 404, "Anonymous requests cannot use the preview URL");
      assert.equal(await evaluate("async function(src) { return (await fetch(src)).status; }", [preview]), 200);
      assert.equal((await fetch(origin.origin + imagePath)).status, 404, "An upload is private before saving the task");
    });
    async function assertImageVisibility(visible: boolean) {
      const response = await fetch(origin.origin + imagePath);
      assert.equal(response.status, visible ? 200 : 404);
      const assetId = imagePath.split("/").at(-1);
      assert.ok(assetId);
      const file = await anon.storage.from("project-images").download(`${projectId}/${assetId}.webp`);
      assert.equal(file.error === null, visible);
      if (visible) assert.equal(response.headers.get("content-type"), "image/webp");
      await response.body?.cancel();
    }
    await assertImageVisibility(true);
    const alphaDocument = (await task(alpha)).description_content;
    assert.ok(alphaDocument);
    assert.equal((await task(alpha)).description, "Task with a diagram");
    assert.equal((await admin.rpc("mutate_task", { p_operation: "create", p_project: projectId, p_task: randomUUID(),
      p_column: todo.id, p_title: "Image belongs to another task", p_hidden: false, p_description_content: alphaDocument })).data, "invalid");
    await click(open(alpha));
    await has(`${dialog} .rich-text strong`);
    await has(descriptionImage);
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "close formatted task detail");
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
    const firstAdded = `${column(todo.id)} li:nth-child(${starterCount + 1})`;
    await has(firstAdded + card(beta));
    assert.deepEqual([(await task(beta)).position, (await task(alpha)).position], [starterCount, starterCount + 1]);
    await has("[data-new-task]:not(:disabled)");
    assert.equal(await boardTop(), initialBoardTop);

    // Reorder from the focused card, then change its stage in the editor.
    await waitFor(async () => !await exists(dialog), "drag does not open the task");
    await evaluate("function(selector) { document.querySelector(selector).focus(); }", [open(beta)]);
    assert.equal(await exists(open(beta) + '[aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"]:focus'), true);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowDown", code: "ArrowDown", modifiers: 1, windowsVirtualKeyCode: 40 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", code: "ArrowDown", modifiers: 1, windowsVirtualKeyCode: 40 });
    await has(firstAdded + card(alpha));
    await has(open(beta) + ":focus");
    assert.equal(await exists(dialog), false);
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
    await waitFor(() => visible(toggle(todo.id) + '[aria-expanded="true"]'), "the first populated column is expanded on mobile");
    assert.equal(await visible(list(progress.id)), false);
    await evaluate('function(selector) { document.querySelector(selector).scrollIntoView({block:"center",behavior:"instant"}); }', [toggle(progress.id)]);
    const togglePoint = await point(toggle(progress.id));
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [togglePoint] });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitFor(() => visible(list(progress.id)), "tapping opens a second column");
    assert.equal(await visible(list(todo.id)), true);
    const touchHandle = card(alpha) + " [data-task-drag]";
    await evaluate('function(selector) { document.querySelector(selector).scrollIntoView({block:"center",behavior:"instant"}); }', [touchHandle]);
    const touchFrom = await point(touchHandle);
    assert.equal(await evaluate("function(selector, point) { return document.elementFromPoint(point.x, point.y) === document.querySelector(selector); }", [touchHandle, touchFrom]), true, "Touch drag surface is reachable");
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchFrom] });
    await has("[data-dragging=true]");
    const beforeDragScroll = z.number().parse(await evaluate("window.scrollY"));
    const viewportBottom = z.number().parse(await evaluate("window.innerHeight"));
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touchFrom.x, y: viewportBottom - 12 }] });
    await waitFor(async () => z.boolean().parse(await evaluate(
      "function(selector, before) { return window.scrollY > before && document.querySelector(selector).getBoundingClientRect().top < innerHeight - 110; }",
      [list(progress.id), beforeDragScroll],
    )), "dragging near the edge scrolls the page to the lower column");
    const touchTo = await point(list(progress.id), 0.25);
    assert.equal(await evaluate(`function(selector, point) {
      return document.elementFromPoint(point.x, point.y)?.closest('[data-column-scroll]') === document.querySelector(selector);
    }`, [list(progress.id), touchTo]), true, `Touch destination is reachable at ${JSON.stringify(touchTo)}`);
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [touchTo] });
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
    await click(status);
    await has(status + ":open");
    await press("End", 35);
    await press("Enter", 13);
    await waitFor(async () => !await exists(status + ":open"), "select the collapsed destination");
    await click(confirm);
    await has(`${toggle(done.id)}[aria-expanded="false"]:focus`);
    assert.equal((await task(alpha)).column_id, done.id);
    assert.equal(await visible(open(alpha)), false);
    await press("Enter", 13);
    await waitFor(() => visible(open(alpha)), "keyboard opens the focused destination");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
    await waitFor(async () => !await visible(open(alpha)), "keyboard closes the focused column");
    await press("Enter", 13);
    await waitFor(() => visible(open(alpha)), "keyboard reopens the focused column");

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
    await assertImageVisibility(false);

    await edit(alpha);
    await has(descriptionEditor + " strong");
    await has(descriptionImage);
    await click(`${dialog} label:has(input[name=hidden])`);
    await click(confirm);
    await waitFor(async () => !await exists(dialog), "show the task again");
    await assertImageVisibility(true);
    await click(open(alpha));
    await click(`${dialog} footer [data-archive-task]`);
    await click(confirm);
    await waitFor(async () => !await exists(card(alpha)), "archive the task with an image");
    await assertImageVisibility(false);

    await click(open(beta));
    const archiveButton = `${dialog} footer [data-archive-task]`;
    await has(archiveButton);
    assert.equal(await evaluate("function(selector) { const footer = document.querySelector(selector); return footer.scrollWidth === footer.clientWidth; }", [`${dialog} footer`]), true);
    await click(archiveButton);
    assert.equal(await exists(archiveButton), false);
    assert.equal((await task(beta)).archived_at, null);
    await click(confirm);
    await waitFor(async () => !await exists(card(beta)), "archived task leaves the board");
    const archivedBeta = (await task(beta)).archived_at;
    assert.ok(archivedBeta);
    await evaluate("document.querySelector('[data-open-archive]').focus()");
    await press("Enter", 13);
    await has(`${dialog} summary`);
    assert.deepEqual(await evaluate("[...document.querySelectorAll('dialog:modal summary')].map(item => item.firstElementChild.textContent)"), ["Task Beta", "Task Alpha"]);
    assert.equal(await exists(`${dialog} time[datetime="${archivedBeta}"]`), true);
    await evaluate("document.querySelectorAll('dialog:modal summary')[1].focus()");
    await press("Enter", 13);
    await has(`${dialog} details[open] .rich-text strong`);
    assert.equal(await evaluate("document.querySelector('dialog:modal details[open] img').getAttribute('src').endsWith('?preview=1')"), true);
    assert.equal(await exists(`${dialog} [data-edit-task], ${dialog} [data-archive-task]`), false);
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "close the archive detail");
    assert.equal(await exists(archiveTrigger + ":focus"), true);
    for (const headers of [new Headers(), new Headers({ RSC: "1" })]) {
      const response = await fetch(origin.origin + pathname, { headers });
      assert.equal(response.status, 200);
      assert.doesNotMatch(await response.text(), /Task Alpha|Task Beta|Task with a diagram|data-edit-task|data-open-archive/);
    }

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
    const reviewList = list(review.id);
    const addInReview = column(review.id) + " [data-new-task]";
    for (const [width, height] of [[1920, 1080], [1440, 540]] as const) {
      await setViewport(width, height, false);
      await assertBoardFitsViewport();
      assert.equal(await visible(toggle(review.id)), false);
      assert.equal(await visible(reviewList), true);
    }
    assert.equal(await evaluate("new Set([...document.querySelectorAll('[data-stage]')].map(column => column.getBoundingClientRect().height)).size"), 1);
    await waitFor(async () => z.boolean().parse(await evaluate(
      "function(selector) { const list = document.querySelector(selector); return list.scrollHeight > list.clientHeight; }", [reviewList],
    )), "review tasks overflow their column");
    for (const [width, height, mobile] of [[1280, 540, false], [390, 480, true], [390, 844, true]] as const) {
      await setViewport(width, height, mobile);
      await waitFor(() => visible(toggle(review.id)), "compact column toggles are visible");
      assert.deepEqual(await evaluate(`(() => {
        const columns = [...document.querySelectorAll('[data-board-column]')].map(column => column.getBoundingClientRect());
        return {
          stacked: columns.every((column, index) => index === 0 || column.top >= columns[index - 1].bottom && column.left === columns[0].left),
          noHorizontalOverflow: document.documentElement.scrollWidth === document.documentElement.clientWidth,
        };
      })()`), { stacked: true, noHorizontalOverflow: true });
    }
    assert.equal(await visible(reviewList), false);
    await click(toggle(review.id));
    await waitFor(() => visible(reviewList), "open the review column before scrolling");
    await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    let swipeStart = { x: 0, y: 0 };
    await waitFor(async () => {
      await evaluate('function(selector) { document.querySelector(selector).scrollIntoView({block:"nearest",inline:"center",behavior:"instant"}); }', [open(visibleTask)]);
      const center = await point(open(visibleTask));
      swipeStart = { x: center.x, y: center.y + 15 };
      return z.boolean().parse(await evaluate("function(selector, point) { return document.elementFromPoint(point.x, point.y) === document.querySelector(selector); }",
        [open(visibleTask), swipeStart]));
    }, "swipe starts on the task card");
    const beforeSwipe = z.number().parse(await evaluate("window.scrollY"));
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [swipeStart] });
    for (const distance of [20, 44, 68]) {
      await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: swipeStart.x, y: swipeStart.y - distance }] });
    }
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitFor(async () => z.number().parse(await evaluate("window.scrollY")) > beforeSwipe, "swipe scrolls the page");
    assert.equal(await evaluate("function(selector) { const list = document.querySelector(selector); return list.scrollHeight === list.clientHeight && list.scrollTop === 0; }", [reviewList]), true);
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
    assert.equal(await visible(`${toggle(review.id)}[aria-expanded="true"]`), true);

    const reason = "Cancelled because the fixture finished";
    const reasonTrigger = "[data-open-cancellation]";
    assert.equal(await exists(reasonTrigger), false);
    assert.equal((await admin.from("projects").update({ status: "cancelled", cancellation_reason: reason }).eq("id", projectId)).error, null);

    async function openReason(selector: string, expectedPath: string) {
      await waitFor(async () => {
        if (!await exists(selector) || await evaluate("document.readyState") !== "complete") return false;
        if (!await exists(dialog)) {
          await evaluate("function(selector) { document.querySelector(selector).focus(); }", [selector]);
          await press("Enter", 13);
        }
        return exists(dialog);
      }, "cancellation reason opens from the keyboard");
      assert.equal(await evaluate("location.pathname"), expectedPath);
      assert.match(z.string().parse(await evaluate("document.querySelector('dialog:modal').textContent")), new RegExp(reason, "u"));
      await press("Escape", 27);
      await waitFor(async () => !await exists(dialog), "close the cancellation reason");
      assert.equal(await exists(selector + ":focus"), true);
    }

    await send("Page.navigate", { url: origin.origin + pathname });
    await openReason(reasonTrigger, pathname);
    const catalogCard = `article:has(#project-${projectId})`;
    const catalogTrigger = `${catalogCard} button${reasonTrigger}`;
    await send("Page.navigate", { url: origin.origin + "/projects" });
    await openReason(catalogTrigger, "/projects");
    assert.equal(await evaluate("function(selector) { return document.querySelector(selector).textContent.trim(); }", [catalogTrigger]), "Cancelled");
    assert.equal(await exists(`${catalogCard} a ${reasonTrigger}`), false);

    await evaluate('function(selector) { document.querySelector(selector).scrollIntoView({block:"center",behavior:"instant"}); }', [catalogTrigger]);
    await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [await point(catalogTrigger)] });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await has(dialog);
    assert.equal(await evaluate("location.pathname"), "/projects");
    await press("Escape", 27);
    await waitFor(async () => !await exists(dialog), "close the reason after tapping the badge");

    const catalogAction = `#project-${projectId}-action`;
    await evaluate('function(selector) { document.querySelector(selector).scrollIntoView({block:"center",behavior:"instant"}); }', [catalogAction]);
    const boardLink = await evaluate("function({x, y}) { return document.elementFromPoint(x, y).closest('a')?.pathname; }", [await point(catalogAction)]);
    assert.equal(boardLink, pathname);

    const hiddenExcerpt = "Hidden project description for cancellation fixture".padEnd(240, "x");
    const hiddenDescriptionTail = "Text beyond the public excerpt";
    assert.equal((await admin.from("projects").update({ is_hidden: true, description: hiddenExcerpt + hiddenDescriptionTail }).eq("id", projectId)).error, null);
    for (const headers of [new Headers(), new Headers({ RSC: "1" })]) {
      const listing = await fetch(origin.origin + "/projects", { headers });
      assert.equal(listing.status, 200);
      const body = await listing.text();
      assert.match(body, new RegExp(projectId, "u"));
      assert.doesNotMatch(body, new RegExp(reason, "u"));
      assert.ok(body.includes(hiddenExcerpt));
      assert.ok(!body.includes(hiddenDescriptionTail));
    }
    await send("Page.navigate", { url: origin.origin + "/projects" });
    await has(`#project-${projectId}`);
    assert.equal(await exists(catalogTrigger), false);
    assert.equal((await fetch(origin.origin + pathname)).status, 404);

    await send("Network.setCookies", { cookies: cookies.map(({ name, value }) => ({ name, value, url: origin.origin })) });
    await send("Page.navigate", { url: origin.origin + "/projects" });
    await openReason(catalogTrigger, "/projects");

    assert.equal((await admin.from("projects").update({ is_hidden: false, is_published: false }).eq("id", projectId)).error, null);
    const draftListing = await fetch(origin.origin + "/projects", { headers: { RSC: "1" } });
    assert.equal(draftListing.status, 200);
    assert.doesNotMatch(await draftListing.text(), new RegExp(`${projectId}|${reason}`, "u"));
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
