import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

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
  return { response, html, renderedHtml: html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "") };
}

for (const locale of ["en", "es", "ca"]) {
  test(`cookie preference renders ${locale} on unchanged public and sign-in URLs`, async () => {
    const headers = { Cookie: `${cookieName}=${locale}` };
    const home = await page("/", headers);
    assert.equal(home.response.status, 200);
    assert.ok(home.html.includes(`<html lang="${locale}"`));
    assert.ok(home.html.includes(`name="description" content="${catalogs[locale].Metadata.description.replaceAll("'", "&#x27;")}"`));
    assert.ok(home.renderedHtml.includes(catalogs[locale].Construction.status));
    assert.match(home.html, new RegExp(`<option(?=[^>]*value="${locale}")(?=[^>]*selected="")[^>]*>`));
    assert.ok(!home.response.headers.has("set-cookie"), "Reading a page must not create a preference cookie");

    const login = await page("/admin/login", headers);
    assert.equal(login.response.status, 200);
    assert.ok(login.html.includes(`<html lang="${locale}"`));
    assert.ok(login.renderedHtml.includes(catalogs[locale].Auth.email));
    assert.ok(login.renderedHtml.includes(catalogs[locale].Auth.password));
    assert.match(login.response.headers.get("cache-control") ?? "", /no-store/);

    const unknown = await page("/unknown-i18n-test-route", headers);
    assert.equal(unknown.response.status, 404);
    assert.ok(unknown.renderedHtml.includes(catalogs[locale].NotFound.title));
  });
}

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

test("the native language form persists a validated preference and ignores unsupported values", async () => {
  const home = await page("/");
  const action = home.html.match(/name="(\$ACTION_ID_[^"]+)"/);
  assert.ok(action, "Language selection should work through a native Server Action form");
  const body = new FormData();
  body.set(action[1], "");
  body.set("locale", "ca");
  const changed = await fetch(origin, { method: "POST", headers: { Origin: origin.origin }, body, redirect: "manual" });
  assert.equal(changed.status, 200);
  await changed.text();
  const cookie = changed.headers.getSetCookie().find(value => value.startsWith(`${cookieName}=`));
  assert.ok(cookie);
  assert.match(cookie, /^portfolio-kanban-locale=ca;/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, /Path=\//i);
  assert.match(cookie, /Max-Age=31536000/i);
  assert.match(cookie, /Secure/i);
  const persisted = await page("/admin/login", { Cookie: cookie.split(";")[0] });
  assert.ok(persisted.html.includes('<html lang="ca"'));

  body.set("locale", "fr");
  const invalid = await fetch(origin, { method: "POST", headers: { Origin: origin.origin, Cookie: `${cookieName}=es` }, body, redirect: "manual" });
  assert.equal(invalid.status, 200);
  await invalid.text();
  assert.ok(!invalid.headers.getSetCookie().some(value => value.startsWith(`${cookieName}=`)));
});

test("invalid sign-in feedback is localized without creating users or granting access", async () => {
  const decode = value => value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
  for (const locale of ["en", "es", "ca"]) {
    const headers = { Cookie: `${cookieName}=${locale}` };
    const login = await page("/admin/login", headers);
    const form = [...login.html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].find(match => match[0].includes('name="email"'));
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
    const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    assert.ok(decode(html).includes(catalogs[locale].Auth.invalidCredentials));
    assert.ok(!response.headers.getSetCookie().some(cookie => cookie.startsWith("sb-")));
    assert.equal((await page("/admin", headers)).response.status, 307);
  }
});
