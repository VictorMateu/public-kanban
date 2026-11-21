import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { htmlText, serverMarkup } from "./helpers/html.ts";

const origin = new URL(process.env.KANBAN_TEST_URL ?? "http://127.0.0.1:3000");
if (
  origin.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(origin.hostname) ||
  origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash
) throw new Error("Internationalization tests require a local HTTP origin.");

const cookieName = "portfolio-kanban-locale";
const catalogs = Object.fromEntries(["en", "es", "ca"].map(locale => [
  locale, JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")),
]));

async function page(path, headers = {}) {
  const response = await fetch(new URL(path, origin), { headers, redirect: "manual" });
  const html = await response.text();
  return { response, html, renderedHtml: serverMarkup(html) };
}

function assertSharedLayout(html) {
  assert.equal((html.match(/<aside\b/g) ?? []).length, 1, "The shared sidebar should appear once");
  assert.equal((html.match(/<nav\b/g) ?? []).length, 1, "The shared navigation should appear once");
  assert.match(html, /<img\b[^>]*src="\/brand\/logo\.svg"/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main\b[^>]*id="main-content"/);
}

for (const locale of ["en", "es", "ca"]) {
  test(`cookie preference renders ${locale} on unchanged public and sign-in URLs`, async () => {
    const headers = { Cookie: `${cookieName}=${locale}` };
    const home = await page("/", headers);
    assert.equal(home.response.status, 200);
    assert.match(home.response.headers.get("cache-control") ?? "", /private/);
    assert.match(home.response.headers.get("cache-control") ?? "", /no-store/);
    assertSharedLayout(home.renderedHtml);
    assert.ok(home.html.includes(`<html lang="${locale}"`));
    assert.ok(home.html.includes(`name="description" content="${catalogs[locale].Metadata.description.replaceAll("'", "&#x27;")}"`));
    const main = home.renderedHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
    assert.ok(main, "The overview should have a main landmark");
    const mainText = htmlText(main[1]);
    assert.ok(mainText.includes(catalogs[locale].Overview.title));
    assert.ok(mainText.includes(catalogs[locale].Overview.description));
    assert.match(main[1], /href="https:\/\/victormateulopez\.com"/);
    const values = [...main[1].matchAll(/<dd\b[^>]*>([\s\S]*?)<\/dd>/g)].map(([, value]) => htmlText(value));
    assert.equal(values.length, 7, "The overview contains four project and three task metrics");
    assert.ok(mainText.includes(catalogs[locale].Overview.publicBoardScope));
    if (mainText.includes(catalogs[locale].Overview.metricsUnavailable)) {
      assert.deepEqual(values, Array(7).fill(catalogs[locale].Overview.unavailableValue));
      assert.ok(mainText.includes(catalogs[locale].Overview.activityUnavailable));
    } else {
      assert.ok(values.every(value => /^\p{Decimal_Number}[\p{Decimal_Number}.,\s]*$/u.test(value)));
      assert.ok(main[1].includes(`aria-label="${catalogs[locale].Overview.activityLastMonths}"`));
    }
    assert.ok(mainText.includes(catalogs[locale].Overview.taskActivityMonths));
    assert.doesNotMatch(main[1], /<video\b|<canvas\b/, "The provisional overview must not render media or a simulated chart");
    assert.ok(home.renderedHtml.includes(`aria-label="${catalogs[locale].Common.mainContent}"`));
    assert.equal((home.renderedHtml.match(/<button\b[^>]*name="locale"/g) ?? []).length, 3);
    assert.ok(!home.renderedHtml.includes(`aria-label="${catalogs[locale].Auth.accountMenu}"`), "Anonymous visitors must not receive account controls");
    assert.ok(!home.renderedHtml.includes(`aria-label="${catalogs[locale].Auth.sessionActive}"`), "Anonymous visitors must not receive a mobile administrator indicator");
    const sidebar = home.renderedHtml.match(/<aside\b[^>]*>([\s\S]*?)<\/aside>/)?.[1];
    assert.ok(sidebar, "The shared sidebar should contain the mobile disclosure and language form");
    const disclosure = sidebar.match(/<button\b(?=[^>]*aria-expanded="false")(?=[^>]*aria-controls="([^"]+)")[^>]*>/);
    assert.ok(disclosure, "The mobile menu must start collapsed and identify its panel");
    const disclosureContent = sidebar.slice(sidebar.indexOf(disclosure[0]) + disclosure[0].length).split("</button>")[0];
    assert.match(disclosureContent, /<svg\b[^>]*aria-hidden="true"/);
    assert.equal(htmlText(disclosureContent).trim(), "", "The mobile toggle uses an icon without a visible Menu label");
    assert.ok(disclosure[0].includes(`aria-label="${catalogs[locale].Navigation.openMenu}"`));
    assert.ok(sidebar.includes(`id="${disclosure[1]}" data-open="false"`));
    assert.doesNotMatch(sidebar, /<video\b|<img\b[^>]*src="[^"]*illustrations\//, "Initial HTML must not load decorative media before the desktop viewport is known");
    assert.equal((sidebar.match(/<button\b/g) ?? []).length, 4, "The sidebar contains the disclosure and three language controls");
    assert.match(sidebar, new RegExp(`<button\\b(?=[^>]*value="${locale}")(?=[^>]*aria-pressed="true")[^>]*>`));
    assert.equal((sidebar.match(/aria-pressed="true"/g) ?? []).length, 1);
    for (const name of ["English", "Español", "Català"]) assert.ok(sidebar.includes(`aria-label="${name}"`));
    assert.doesNotMatch(home.renderedHtml, /href="\/projects\//);
    assert.match(home.renderedHtml, /<a\b(?=[^>]*href="\/")(?=[^>]*aria-current="page")[^>]*>/);
    assert.ok(!home.response.headers.has("set-cookie"), "Reading a page must not create a preference cookie");

    const projects = await page("/projects", headers);
    assert.equal(projects.response.status, 200);
    assertSharedLayout(projects.renderedHtml);
    assert.ok(projects.renderedHtml.includes(`>${catalogs[locale].Home.projects}</h1>`));
    assert.ok(projects.renderedHtml.includes(catalogs[locale].Navigation.overview));
    assert.match(projects.renderedHtml, /<a\b(?=[^>]*href="\/projects")(?=[^>]*aria-current="page")[^>]*>/);

    const login = await page("/admin/login", headers);
    assert.equal(login.response.status, 200);
    assertSharedLayout(login.renderedHtml);
    assert.ok(!login.renderedHtml.includes(`aria-label="${catalogs[locale].Auth.accountMenu}"`), "The anonymous login page must not expose account controls");
    assert.ok(!login.renderedHtml.includes(`aria-label="${catalogs[locale].Auth.sessionActive}"`), "Anonymous visitors must not receive a mobile administrator indicator");
    assert.doesNotMatch(login.renderedHtml, /aria-current="page"/);
    assert.equal((login.renderedHtml.match(/<button\b[^>]*name="locale"/g) ?? []).length, 3);
    assert.ok(login.html.includes(`<html lang="${locale}"`));
    if (htmlText(login.renderedHtml).includes(catalogs[locale].Auth.notConfigured)) {
      assert.doesNotMatch(login.renderedHtml, /name="(email|password)"/);
    } else {
      assert.ok(login.renderedHtml.includes(catalogs[locale].Auth.email));
      assert.ok(login.renderedHtml.includes(catalogs[locale].Auth.password));
    }
    assert.match(login.response.headers.get("cache-control") ?? "", /no-store/);

    const missing = await page("/projects/InvalidSlug", headers);
    assert.equal(missing.response.status, 404);
    assertSharedLayout(missing.renderedHtml);
    assert.match(missing.renderedHtml, new RegExp(`<html lang="${locale}"`));
    const missingHeading = missing.renderedHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    assert.equal(htmlText(missingHeading ?? ""), catalogs[locale].Project.notFoundTitle);
    const missingMain = missing.renderedHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
    assert.ok(htmlText(missingMain).includes(catalogs[locale].Project.notFoundDescription));
    assert.match(missingMain, /<a\b[^>]*href="\/"/);
    const unknown = await page("/unknown-i18n-test-route", headers);
    assert.equal(unknown.response.status, 404);
    assertSharedLayout(unknown.renderedHtml);
    assert.ok(unknown.renderedHtml.includes(catalogs[locale].NotFound.title));
  });
}

test("sidebar videos are served as WebM and support partial playback requests", async () => {
  for (const name of ["typing-v6", "drinking-v5"]) {
    const url = new URL(`/illustrations/${name}.webm`, origin);
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^video\/webm\b/);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 4)], [0x1a, 0x45, 0xdf, 0xa3], "The media must have a WebM/EBML header");
    assert.equal(Number(response.headers.get("content-length")), bytes.length);

    const partial = await fetch(url, { headers: { Range: "bytes=0-31" } });
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get("content-range"), `bytes 0-31/${bytes.length}`);
    assert.deepEqual(new Uint8Array(await partial.arrayBuffer()), bytes.slice(0, 32));
  }
});

test("missing and unsupported cookies default to English without browser-language detection", async () => {
  for (const cookie of [undefined, `${cookieName}=fr`, `${cookieName}=../../es`]) {
    const headers = { "Accept-Language": "es,ca;q=0.9" };
    if (cookie) headers.Cookie = cookie;
    const result = await page("/", headers);
    assert.equal(result.response.status, 200);
    assert.ok(result.html.includes('<html lang="en"'));
  }
});

test("locale responses stay isolated between visitors and do not change authentication redirects", async () => {
  const results = await Promise.all(["es", "ca", "en", "es"].map(locale => page("/", { Cookie: `${cookieName}=${locale}` })));
  for (const [index, locale] of ["es", "ca", "en", "es"].entries()) {
    assert.ok(results[index].html.includes(`<html lang="${locale}"`));
  }
  const admin = await page("/admin", { Cookie: `${cookieName}=ca` });
  assert.equal(admin.response.status, 307);
  assert.equal(new URL(admin.response.headers.get("location"), origin).pathname, "/admin/login");
});

test("pages share one language selector without creating preference cookies on reads", async () => {
  for (const path of ["/", "/projects", "/admin/login", "/unknown-i18n-test-route"]) {
    const result = await page(path);
    const forms = [...result.renderedHtml.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
      .filter(match => match[0].includes('name="locale"'));
    assert.equal(forms.length, 1);
    assert.equal((forms[0][0].match(/<button\b[^>]*name="locale"/g) ?? []).length, 3);
    assert.ok(!result.response.headers.getSetCookie().some(value => value.startsWith(cookieName + "=")));
  }
});

test("the language form validates and persists selection without changing the URL or granting access", async () => {
  const initial = await page("/projects");
  const form = [...initial.renderedHtml.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
    .find(match => match[0].includes('name="locale"'))?.[0];
  assert.ok(form, "Language selection must work as a native form");
  for (const locale of ["es", "ca", "en", "fr"]) {
    const body = new FormData();
    for (const input of form.matchAll(/<input\b[^>]*>/g)) {
      const name = input[0].match(/name="([^"]*)"/);
      if (input[0].includes('type="hidden"') && name) {
        body.set(name[1], input[0].match(/value="([^"]*)"/)?.[1] ?? "");
      }
    }
    body.set("locale", locale);
    const response = await fetch(new URL("/projects", origin), {
      method: "POST", headers: { Origin: origin.origin }, body, redirect: "manual",
    });
    assert.equal(response.status, 200);
    const cookies = response.headers.getSetCookie();
    assert.ok(!cookies.some(cookie => cookie.startsWith("sb-")));
    const preference = cookies.find(cookie => cookie.startsWith(cookieName + "="));
    if (locale === "fr") {
      assert.equal(preference, undefined, "Unsupported locales must not be persisted");
      continue;
    }
    assert.ok(preference?.startsWith(`${cookieName}=${locale};`));
    assert.match(preference, /HttpOnly/i);
    assert.match(preference, /SameSite=lax/i);
    assert.match(preference, /Path=\//i);
    const selected = await page("/projects", { Cookie: preference.split(";")[0] });
    assert.ok(selected.html.includes(`<html lang="${locale}"`));
    assert.equal((await page("/admin", { Cookie: preference.split(";")[0] })).response.status, 307);
  }
});

test("invalid sign-in feedback is localized without creating users or granting access", async (context) => {
  const decode = value => value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
  for (const locale of ["en", "es", "ca"]) {
    const headers = { Cookie: `${cookieName}=${locale}` };
    const login = await page("/admin/login", headers);
    const form = [...login.html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].find(match => match[0].includes('name="email"'));
    if (!form && decode(login.renderedHtml).includes(catalogs[locale].Auth.notConfigured)) {
      context.skip("Supabase configuration is required to render the sign-in form");
      return;
    }
    assert.ok(form);
    const body = new FormData();
    for (const input of form[0].matchAll(/<input\b[^>]*>/g)) {
      const name = input[0].match(/name="([^"]*)"/);
      if (input[0].includes('type="hidden"') && name) {
        body.set(decode(name[1]), decode(input[0].match(/value="([^"]*)"/)?.[1] ?? ""));
      }
    }
    body.set("email", "invalid-address");
    body.set("password", "not-a-real-password");
    const response = await fetch(new URL("/admin/login", origin), {
      method: "POST", headers: { ...headers, Origin: origin.origin }, body, redirect: "manual",
    });
    assert.equal(response.status, 200);
    const feedback = htmlText(await response.text());
    assert.ok(feedback.includes(catalogs[locale].Auth.invalidCredentials));
    assert.ok(!response.headers.getSetCookie().some(cookie => cookie.startsWith("sb-")));
    assert.equal((await page("/admin", headers)).response.status, 307);
  }
});
