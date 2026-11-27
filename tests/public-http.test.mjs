import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { htmlText, serverMarkup } from "./helpers/html.ts";
import { PROJECT_NOT_FOUND_HEADER } from "../lib/projects/urls.ts";

// Run only against local Next.js and Supabase; no passwords or user creation.
const origin = new URL(process.env.KANBAN_TEST_URL ?? "http://127.0.0.1:3000");
if (
  origin.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(origin.hostname) ||
  origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash
) throw new Error("Public tests require a local HTTP origin.");

function sql(query) {
  return execFileSync("docker", [
    "exec", "-i", "supabase_db_portfolio-kanban", "psql",
    "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "-At",
  ], { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function literal(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function population() {
  return sql(`SELECT json_build_array(
    (SELECT count(*) FROM public.projects),
    (SELECT count(*) FROM public.columns),
    (SELECT count(*) FROM public.tasks),
    (SELECT count(*) FROM auth.users),
    (SELECT count(*) FROM private.administrator)
  )::text;`);
}

async function page(path, headers = {}) {
  const response = await fetch(new URL(path, origin), { headers, redirect: "manual" });
  const html = await response.text();
  return { status: response.status, html, renderedHtml: serverMarkup(html), headers: response.headers };
}

function overviewCounts(result) {
  assert.equal(result.status, 200);
  const main = result.renderedHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main);
  const counts = [...main.matchAll(/<dd\b[^>]*>([\s\S]*?)<\/dd>/g)].map(([, value]) => {
    const text = htmlText(value);
    assert.match(text, /^\d[\d,]*$/);
    return Number(text.replaceAll(",", ""));
  });
  assert.equal(counts.length, 7);
  return counts;
}

function taskActivityCounts(result) {
  const buckets = [...result.renderedHtml.matchAll(/<li\b[^>]*title="[^"]*Created: ([\d,]+) · Completed: ([\d,]+)"/gu)];
  assert.equal(buckets.length, 6);
  return buckets.map(([, created, completed]) => [created, completed].map(count => Number(count.replaceAll(",", ""))));
}

test("public project pages use real local data and preserve existing users", async (context) => {
  const before = population();
  const initialOverview = await page("/");
  const initialCounts = overviewCounts(initialOverview);
  const initialActivity = taskActivityCounts(initialOverview);
  const marker = `public-check-${randomUUID()}`;
  const projects = Array.from({ length: 6 }, () => randomUUID());
  const tasks = Array.from({ length: 9 }, () => randomUUID());
  const names = { published: `Published project ${marker}`, draft: `Unpublished project ${marker}`, noTasks: `Project without tasks ${marker}` };
  const firstTask = `${marker}-first-task`;
  const secondTask = `${marker}-second-task`;
  const escapedTitle = `${marker} <script>alert("text only")</script>`;
  const privateTitle = `${marker}-hidden-task`;
  const archivedTitle = `${marker}-archived-task`;
  const tagSuffix = marker.slice(-12);
  const tags = ["public", "second", "extra", "hidden-task", "archived", "draft", "hidden-project"]
    .map((prefix) => `${prefix}-${tagSuffix}`);

  try {
    sql(`BEGIN;
      INSERT INTO public.projects (id, slug, name, description, is_published, position) VALUES
        ('${projects[0]}', '${marker}-published', ${literal(names.published)}, 'Descripción pública de prueba', TRUE, 1),
        ('${projects[1]}', '${marker}-draft', ${literal(names.draft)}, 'Descripción privada de prueba', FALSE, 0),
        ('${projects[2]}', '${marker}-no-tasks', ${literal(names.noTasks)}, NULL, TRUE, 3);
      UPDATE public.projects SET status = 'maintenance' WHERE id = '${projects[2]}';
      INSERT INTO public.projects (id, slug, name, status, cancellation_reason, is_published, is_hidden) VALUES
        ('${projects[3]}', '${marker}-completed', '${marker}-completed', 'completed', NULL, TRUE, FALSE),
        ('${projects[4]}', '${marker}-cancelled', '${marker}-cancelled', 'cancelled', 'Fixture cancellation', TRUE, FALSE),
        ('${projects[5]}', '${marker}-hidden', '${marker}-hidden', 'development', NULL, TRUE, TRUE);
      INSERT INTO public.tasks (id, project_id, column_id, title, description, priority, due_date, position, is_hidden, archived_at)
      SELECT v.id::UUID, c.project_id, c.id, v.title, v.description, v.priority, v.due_date::DATE,
        v.position, v.hidden, CASE WHEN v.archived THEN now() END
      FROM (VALUES
        ('${tasks[0]}', 'todo', ${literal(secondTask)}, NULL, 'low', NULL, 2, FALSE, FALSE),
        ('${tasks[1]}', 'todo', ${literal(firstTask)}, 'Descripción de tarea', 'high', '2026-11-01', 0, FALSE, FALSE),
        ('${tasks[2]}', 'review', ${literal(escapedTitle)}, NULL, 'medium', NULL, 0, FALSE, FALSE),
        ('${tasks[3]}', 'todo', ${literal(privateTitle)}, NULL, NULL, NULL, 3, TRUE, FALSE),
        ('${tasks[4]}', 'done', ${literal(archivedTitle)}, NULL, NULL, NULL, 4, FALSE, TRUE),
        ('${tasks[5]}', 'done', '${marker}-done-task', NULL, NULL, NULL, 0, FALSE, FALSE),
        ('${tasks[6]}', 'in_progress', '${marker}-in-progress-task', NULL, NULL, NULL, 0, FALSE, FALSE)
      ) v(id, stage, title, description, priority, due_date, position, hidden, archived)
      JOIN public.columns c ON c.stage = v.stage
        AND c.project_id = CASE WHEN v.stage = 'in_progress' THEN '${projects[3]}'::UUID ELSE '${projects[0]}'::UUID END;
      INSERT INTO public.tasks (id, project_id, column_id, title, position)
      SELECT CASE WHEN c.project_id = '${projects[1]}' THEN '${tasks[7]}'::UUID ELSE '${tasks[8]}'::UUID END,
        c.project_id, c.id, '${marker}-private-board-task', 0
      FROM public.columns c WHERE c.stage = 'done' AND c.project_id IN ('${projects[1]}', '${projects[5]}');
      UPDATE public.tasks SET tags = CASE id
        WHEN '${tasks[1]}' THEN ARRAY[${tags.slice(0, 3).map(literal).join(", ")}]
        WHEN '${tasks[3]}' THEN ARRAY[${literal(tags[3])}]
        WHEN '${tasks[4]}' THEN ARRAY[${literal(tags[4])}]
        WHEN '${tasks[7]}' THEN ARRAY[${literal(tags[5])}]
        WHEN '${tasks[8]}' THEN ARRAY[${literal(tags[6])}]
      END
      WHERE id IN ('${tasks[1]}', '${tasks[3]}', '${tasks[4]}', '${tasks[7]}', '${tasks[8]}');
      COMMIT;`);

    await context.test("counts public board projects and visible tasks without serializing fixture content", async () => {
      const result = await page("/");
      const addedCounts = [4, 2, 1, 1, 5, 4, 1];
      assert.deepEqual(overviewCounts(result), initialCounts.map((count, index) => count + addedCounts[index]));
      assert.deepEqual(taskActivityCounts(result), initialActivity.map(([created, completed], index) =>
        index === initialActivity.length - 1 ? [created + 5, completed + 1] : [created, completed]));
      assert.ok(!result.html.includes(marker), "The overview must not serialize project or task data");
      const main = result.renderedHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
      assert.ok(main);
      assert.doesNotMatch(main, /<(form|input|select)\b/);
      assert.doesNotMatch(result.renderedHtml, /href="\/projects\//);
    });

    await context.test("lists published projects in order on the projects route without exposing drafts", async () => {
      const result = await page("/projects");
      assert.equal(result.status, 200);
      for (const name of [names.published, names.noTasks]) assert.ok(result.html.includes(name));
      assert.ok(!result.html.includes(names.draft));
      assert.ok(!result.html.includes("Descripción privada de prueba"));
      assert.ok(result.html.indexOf(names.published) < result.html.indexOf(names.noTasks));
      assert.ok(result.html.includes(`/projects/${marker}-published`));
    });

    await context.test("renders columns, tasks, priorities, dates, and empty columns", async () => {
      const result = await page(`/projects/${marker}-published`);
      assert.equal(result.status, 200);
      const boardText = htmlText(result.renderedHtml);
      for (const text of [names.published, firstTask, secondTask, "Nov 1, 2026", "No tasks yet."]) {
        assert.ok(boardText.includes(text), `Missing public board content: ${text}`);
      }
      assert.ok(result.html.includes("Descripción de tarea"), "Task description should be available in the detail payload");
      for (const priority of ["high", "low", "medium"]) {
        assert.match(result.renderedHtml, new RegExp(`<dt\\b[^>]*>Priority</dt><dd>${priority}</dd>`, "u"));
      }
      assert.doesNotMatch(result.renderedHtml, />Read only<\/span>/);
      assert.match(boardText, /To do[\s\S]*In progress[\s\S]*In review[\s\S]*Done/);
      assert.ok(result.html.indexOf(firstTask) < result.html.indexOf(secondTask), "Task positions should define card order");
      assert.ok(result.html.includes('dateTime="2026-11-01"') || result.html.includes('datetime="2026-11-01"'), "Deadline should have a machine-readable date");
      assert.ok(!result.html.includes("draggable="), "Public cards must not expose editing interactions");
      assert.ok(!result.html.includes(privateTitle) && !result.html.includes(archivedTitle), "Private task data must be absent from HTML and React payloads");
      assert.ok(!result.html.includes("data-edit-task") && !result.html.includes("data-new-task"));
    });

    await context.test("escapes text content instead of interpreting it as HTML", async () => {
      const result = await page(`/projects/${marker}-published`);
      assert.ok(result.html.includes("&lt;script&gt;alert(&quot;text only&quot;)&lt;/script&gt;"), "Task title should be escaped");
      assert.ok(!result.html.includes('<script>alert("text only")</script>'), "Task title must not become an executable script");
    });

    await context.test("shows two public tags on the card and omits private tags from HTML and React", async () => {
      const path = `/projects/${marker}-published`;
      const html = await page(path);
      let flight = await page(path, { RSC: "1" });
      if (flight.status === 307) {
        const location = flight.headers.get("location");
        assert.ok(location);
        const canonical = new URL(location, origin);
        assert.equal(canonical.origin, origin.origin);
        assert.equal(canonical.pathname, path);
        assert.ok(canonical.searchParams.has("_rsc"));
        flight = await page(canonical, { RSC: "1" });
      }
      assert.equal(html.status, 200);
      assert.equal(flight.status, 200);
      assert.match(flight.headers.get("content-type") ?? "", /text\/x-component/);
      const boardText = htmlText(html.renderedHtml);
      for (const tag of tags.slice(0, 2)) assert.ok(boardText.includes(tag));
      assert.ok(boardText.includes("1 more tag"));
      assert.ok(!boardText.includes(tags[2]));
      for (const tag of tags.slice(0, 3)) assert.ok(flight.html.includes(tag), "The detail payload has all public tags");
      for (const tag of tags.slice(3)) {
        assert.ok(!html.html.includes(tag) && !flight.html.includes(tag), "Private tags must be absent on the public board");
      }
    });

    await context.test("provides keyboard navigation and labelled board regions", async () => {
      const result = await page(`/projects/${marker}-published`);
      const backLink = [...result.renderedHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].find(([, , body]) =>
        htmlText(body).trim() === "All projects",
      );
      assert.ok(backLink, "The board should expose a return link to the project listing");
      assert.match(backLink[1], /href="\/projects"/);
      assert.ok(result.html.includes('href="#main-content"'), "Skip link should target the main landmark");
      assert.ok(result.html.includes('id="main-content"'), "Main landmark should be identifiable");
      assert.ok(result.html.includes('aria-label="Board columns and tasks"'), "Board region should have an accessible name");
      assert.ok(result.html.includes('tabindex="0"') || result.html.includes('tabIndex="0"'), "Scrollable board should be keyboard-focusable");
    });

    await context.test("serves the same project 404 in HTML and React for drafts, hidden projects and unknown slugs", async () => {
      for (const slug of [`${marker}-draft`, `${marker}-hidden`, `${marker}-missing`, "InvalidSlug"]) {
        const path = `/projects/${slug}`;
        const result = await page(path);
        assert.equal(result.status, 404);
        assert.equal(result.headers.get("location"), null);
        assert.match(result.headers.get("cache-control") ?? "", /no-store/);
        assert.match(result.renderedHtml, /<h1\b[^>]*>Project not found<\/h1>/);
        assert.match(result.renderedHtml, /<meta name="robots" content="noindex/);

        const flight = await page(path, { RSC: "1" });
        assert.equal(flight.status, 404);
        assert.match(flight.headers.get("content-type") ?? "", /text\/x-component/);
        assert.ok(flight.html.includes("Project not found"));
        for (const body of [result.html, flight.html]) {
          assert.ok(!body.includes(names.draft), "Private project name must not appear in metadata or body");
          assert.ok(!body.includes("Descripción privada de prueba"));
          assert.ok(!body.includes(`${marker}-private-board-task`));
          for (const tag of tags.slice(5)) assert.ok(!body.includes(tag), "Private project tags must be absent from the 404");
        }
      }
      const published = await page(`/projects/${marker}-published`, { [PROJECT_NOT_FOUND_HEADER]: "1" });
      assert.equal(published.status, 200, "A request header cannot turn a visible project into a 404");
      assert.ok(published.renderedHtml.includes(names.published));
    });

    await context.test("ignores session cookies when reading public projects", async () => {
      const headers = { Cookie: "sb-127-auth-token=invalid-public-verification-cookie" };
      const published = await page(`/projects/${marker}-published`, headers);
      const draft = await page(`/projects/${marker}-draft`, headers);
      assert.equal(published.status, 200);
      assert.equal(draft.status, 404);
      assert.ok(!draft.html.includes(names.draft));
    });

    await context.test("seeds all four board columns for a project without tasks", async () => {
      const noTasks = await page(`/projects/${marker}-no-tasks`);
      assert.equal(noTasks.status, 200);
      assert.equal((noTasks.renderedHtml.match(/No tasks yet\./g) ?? []).length, 4);
    });

    await context.test("localizes board labels without translating data or exposing drafts", async () => {
      const labels = {
        en: ["Board columns and tasks", "2 tasks", "Priority", "high"],
        es: ["Columnas y tareas del tablero", "2 tareas", "Prioridad", "alta"],
        ca: ["Columnes i tasques del tauler", "2 tasques", "Prioritat", "alta"],
      };
      for (const [locale, [boardLabel, count, priorityLabel, priority]] of Object.entries(labels)) {
        const headers = { Cookie: `portfolio-kanban-locale=${locale}` };
        const result = await page(`/projects/${marker}-published`, headers);
        assert.equal(result.status, 200);
        assert.ok(result.html.includes(`<html lang="${locale}"`));
        for (const text of [names.published, boardLabel, count]) assert.ok(result.renderedHtml.includes(text), `Missing ${locale} board content: ${text}`);
        assert.ok(result.html.includes("Descripción de tarea"));
        assert.match(result.renderedHtml, new RegExp(`<dt\\b[^>]*>${priorityLabel}</dt><dd>${priority}</dd>`, "u"));
        const missing = await page(`/projects/${marker}-draft`, headers);
        assert.equal(missing.status, 404);
        assert.ok(!missing.html.includes(names.draft));
      }
    });

    await context.test("does not persistently cache the published project response", async () => {
      sql(`UPDATE public.projects SET is_published = FALSE WHERE id = '${projects[0]}'::uuid;`);
      const hidden = await page(`/projects/${marker}-published`);
      assert.equal(hidden.status, 404);
      assert.ok(!hidden.html.includes(names.published), "Previously published content must no longer be returned");
      const remainingCounts = [3, 1, 1, 1, 1, 1, 0];
      assert.deepEqual(overviewCounts(await page("/")), initialCounts.map((count, index) => count + remainingCounts[index]));
      sql(`UPDATE public.projects SET is_published = TRUE WHERE id = '${projects[0]}'::uuid;`);
      assert.equal((await page(`/projects/${marker}-published`)).status, 200);
    });
  } finally {
    // Delete only this run's fixture UUIDs; preserve administrator authorization.
    sql(`DELETE FROM public.projects WHERE id IN (${projects.map((id) => `${literal(id)}::uuid`).join(",")});`);
    assert.equal(population(), before, "Fixtures should be removed and existing data and users preserved");
  }

  await context.test("returns to the original overview counts after fixture cleanup", async () => {
    const result = await page("/");
    assert.deepEqual(overviewCounts(result), initialCounts);
    assert.deepEqual(taskActivityCounts(result), initialActivity);
    assert.ok(!result.html.includes(marker));
  });

  await context.test("shows the empty projects state after fixture cleanup", {
    skip: JSON.parse(before)[0] !== 0,
  }, async () => {
    const result = await page("/projects");
    assert.equal(result.status, 200);
    assert.ok(result.renderedHtml.includes("No published projects yet"));
    assert.ok(!result.renderedHtml.includes("Projects unavailable"));
  });
});
