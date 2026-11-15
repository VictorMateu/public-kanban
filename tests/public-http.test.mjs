import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

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
  return { status: response.status, html, renderedHtml: html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ""), headers: response.headers };
}

test("public project pages use real local data and preserve existing users", async (context) => {
  const before = population();
  const marker = `public-check-${randomUUID()}`;
  const projects = Array.from({ length: 4 }, () => randomUUID());
  const columns = Array.from({ length: 4 }, () => randomUUID());
  const tasks = Array.from({ length: 3 }, () => randomUUID());
  const names = { published: `Published project ${marker}`, draft: `Unpublished project ${marker}`, noColumns: `Project without columns ${marker}`, noTasks: `Project without tasks ${marker}` };
  const firstTask = `${marker}-first-task`;
  const secondTask = `${marker}-second-task`;
  const escapedTitle = `${marker} <script>alert("text only")</script>`;

  try {
    sql(`BEGIN;
      INSERT INTO public.projects (id, slug, name, description, is_published, position) VALUES
        ('${projects[0]}', '${marker}-published', ${literal(names.published)}, 'Descripción pública de prueba', TRUE, 1),
        ('${projects[1]}', '${marker}-draft', ${literal(names.draft)}, 'Descripción privada de prueba', FALSE, 0),
        ('${projects[2]}', '${marker}-no-columns', ${literal(names.noColumns)}, NULL, TRUE, 2),
        ('${projects[3]}', '${marker}-no-tasks', ${literal(names.noTasks)}, NULL, TRUE, 3);
      INSERT INTO public.columns (id, project_id, name, position) VALUES
        ('${columns[0]}', '${projects[0]}', '${marker}-later-column', 2),
        ('${columns[1]}', '${projects[0]}', '${marker}-first-column', 0),
        ('${columns[2]}', '${projects[0]}', '${marker}-empty-column', 1),
        ('${columns[3]}', '${projects[3]}', '${marker}-no-tasks-column', 0);
      INSERT INTO public.tasks (id, project_id, column_id, title, description, priority, due_date, position) VALUES
        ('${tasks[0]}', '${projects[0]}', '${columns[1]}', ${literal(secondTask)}, NULL, 'low', NULL, 2),
        ('${tasks[1]}', '${projects[0]}', '${columns[1]}', ${literal(firstTask)}, 'Descripción de tarea', 'high', '2026-11-01', 0),
        ('${tasks[2]}', '${projects[0]}', '${columns[0]}', ${literal(escapedTitle)}, NULL, 'medium', NULL, 0);
      COMMIT;`);

    await context.test("keeps overview metrics pending without serializing project data", async () => {
      const result = await page("/");
      assert.equal(result.status, 200);
      for (const name of Object.values(names)) assert.ok(!result.html.includes(name), "The pending overview must not serialize project data");
      const main = result.renderedHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
      assert.ok(main);
      assert.doesNotMatch(main, /<(form|input|select)\b/);
      assert.doesNotMatch(result.renderedHtml, /href="\/projects\//);
      assert.equal((main.match(/<dd\b/g) ?? []).length, 8);
      assert.equal((main.match(/<span aria-hidden="true">—<\/span>/g) ?? []).length, 8);
    });

    await context.test("lists published projects in order on the projects route without exposing drafts", async () => {
      const result = await page("/projects");
      assert.equal(result.status, 200);
      for (const name of [names.published, names.noColumns, names.noTasks]) assert.ok(result.html.includes(name));
      assert.ok(!result.html.includes(names.draft));
      assert.ok(!result.html.includes("Descripción privada de prueba"));
      assert.ok(result.html.indexOf(names.published) < result.html.indexOf(names.noColumns));
      assert.ok(result.html.includes(`/projects/${marker}-published`));
    });

    await context.test("renders columns, tasks, priorities, dates, and empty columns", async () => {
      const result = await page(`/projects/${marker}-published`);
      assert.equal(result.status, 200);
      const htmlWithoutComments = result.renderedHtml.replace(/<!--[\s\S]*?-->/g, "");
      for (const text of [names.published, firstTask, secondTask, "Descripción de tarea", "Priority high", "Priority low", "Priority medium", "Nov 1, 2026", "No tasks yet.", "Read only"]) {
        assert.ok(htmlWithoutComments.includes(text), "Expected public board content should be rendered");
      }
      assert.ok(result.html.indexOf(`${marker}-first-column`) < result.html.indexOf(`${marker}-empty-column`), "Column positions should define board order");
      assert.ok(result.html.indexOf(`${marker}-empty-column`) < result.html.indexOf(`${marker}-later-column`), "Later columns should follow earlier columns");
      assert.ok(result.html.indexOf(firstTask) < result.html.indexOf(secondTask), "Task positions should define card order");
      assert.ok(result.html.includes('dateTime="2026-11-01"') || result.html.includes('datetime="2026-11-01"'), "Deadline should have a machine-readable date");
      assert.ok(!result.html.includes("draggable="), "Public cards must not expose editing interactions");
    });

    await context.test("escapes text content instead of interpreting it as HTML", async () => {
      const result = await page(`/projects/${marker}-published`);
      assert.ok(result.html.includes("&lt;script&gt;alert(&quot;text only&quot;)&lt;/script&gt;"), "Task title should be escaped");
      assert.ok(!result.html.includes('<script>alert("text only")</script>'), "Task title must not become an executable script");
    });

    await context.test("provides keyboard navigation and labelled board regions", async () => {
      const result = await page(`/projects/${marker}-published`);
      const backLink = [...result.renderedHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].find(([, , body]) =>
        body.replace(/<span\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, "")
          .replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, "").trim() === "All projects",
      );
      assert.ok(backLink, "The board should expose a return link to the project listing");
      assert.match(backLink[1], /href="\/projects"/);
      assert.ok(result.html.includes('href="#main-content"'), "Skip link should target the main landmark");
      assert.ok(result.html.includes('id="main-content"'), "Main landmark should be identifiable");
      assert.ok(result.html.includes('aria-label="Board columns and tasks"'), "Board region should have an accessible name");
      assert.ok(result.html.includes('tabindex="0"') || result.html.includes('tabIndex="0"'), "Scrollable board should be keyboard-focusable");
    });

    await context.test("returns the same not-found state for drafts and unknown slugs", async () => {
      for (const slug of [`${marker}-draft`, `${marker}-missing`, "InvalidSlug"]) {
        const result = await page(`/projects/${slug}`);
        assert.equal(result.status, 404);
        assert.ok(result.html.includes('children\\\":\\\"Project not found'), "The React response should contain the generic not-found heading");
        assert.ok(!result.html.includes(names.draft), "Private project name must not appear in metadata or body");
        assert.ok(!result.html.includes("Descripción privada de prueba"), "Private description must not appear in metadata or body");
      }
    });

    await context.test("ignores session cookies when reading public projects", async () => {
      const headers = { Cookie: "sb-127-auth-token=invalid-public-verification-cookie" };
      const published = await page(`/projects/${marker}-published`, headers);
      const draft = await page(`/projects/${marker}-draft`, headers);
      assert.equal(published.status, 200);
      assert.equal(draft.status, 404);
      assert.ok(!draft.html.includes(names.draft));
    });

    await context.test("supports projects without columns and columns without tasks", async () => {
      const noColumns = await page(`/projects/${marker}-no-columns`);
      const noTasks = await page(`/projects/${marker}-no-tasks`);
      assert.equal(noColumns.status, 200);
      assert.equal(noTasks.status, 200);
      assert.ok(noColumns.renderedHtml.includes("This board has no columns yet"));
      assert.ok(noTasks.renderedHtml.includes("No tasks yet."));
    });

    await context.test("localizes board labels without translating data or exposing drafts", async () => {
      const labels = {
        en: ["Board columns and tasks", "Priority high", "2 tasks"],
        es: ["Columnas y tareas del tablero", "Prioridad alta", "2 tareas"],
        ca: ["Columnes i tasques del tauler", "Prioritat alta", "2 tasques"],
      };
      for (const [locale, texts] of Object.entries(labels)) {
        const headers = { Cookie: `portfolio-kanban-locale=${locale}` };
        const result = await page(`/projects/${marker}-published`, headers);
        assert.equal(result.status, 200);
        assert.ok(result.html.includes(`<html lang="${locale}"`));
        for (const text of [names.published, "Descripción de tarea", ...texts]) assert.ok(result.renderedHtml.includes(text));
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
      sql(`UPDATE public.projects SET is_published = TRUE WHERE id = '${projects[0]}'::uuid;`);
      assert.equal((await page(`/projects/${marker}-published`)).status, 200);
    });
  } finally {
    // Delete only this run's fixture UUIDs; preserve administrator authorization.
    sql(`DELETE FROM public.projects WHERE id IN (${projects.map((id) => `${literal(id)}::uuid`).join(",")});`);
    assert.equal(population(), before, "Fixtures should be removed and existing data and users preserved");
  }

  await context.test("keeps overview metrics pending after fixture cleanup", async () => {
    const result = await page("/");
    assert.equal(result.status, 200);
    const main = result.renderedHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    assert.ok(main, "The overview should retain its main landmark after cleanup");
    assert.equal((main.match(/<dd\b/g) ?? []).length, 8);
    assert.equal((main.match(/<span aria-hidden="true">—<\/span>/g) ?? []).length, 8);
    for (const name of Object.values(names)) assert.ok(!result.html.includes(name), "Cleaned fixtures must not appear in HTML or React payloads");
    assert.ok(!result.renderedHtml.includes("No published projects yet"));
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
