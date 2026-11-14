import assert from "node:assert/strict";
import { test } from "node:test";
import { createTranslator } from "next-intl";
import { defaultLocale, isLocale, locales, resolveLocale } from "../i18n/locales.ts";
import { getLocaleMessages, mergeMessages } from "../i18n/messages.ts";

test("only supported cookie values select a locale; everything else defaults to English", () => {
  assert.equal(defaultLocale, "en");
  for (const locale of locales) {
    assert.equal(isLocale(locale), true);
    assert.equal(resolveLocale(locale), locale);
  }
  for (const value of [undefined, null, "", "fr", "EN", "es-ES", "../../en", 1, {}, new FormData()]) {
    assert.equal(isLocale(value), false);
    assert.equal(resolveLocale(value), "en");
  }
});

test("progressive translations fall back to English within each namespace without mutating catalogs", () => {
  const base = { Common: { save: "Save", cancel: "Cancel" }, Error: { title: "Unavailable" } };
  const translated = { Common: { save: "Desa" } };
  assert.deepEqual(mergeMessages(base, translated), {
    Common: { save: "Desa", cancel: "Cancel" }, Error: { title: "Unavailable" },
  });
  assert.equal(base.Common.save, "Save");
  assert.deepEqual(translated, { Common: { save: "Desa" } });
});

test("current catalogs cover interface, authentication and error messages in all three languages", () => {
  const english = getLocaleMessages("en");
  for (const locale of locales) {
    const messages = getLocaleMessages(locale);
    for (const [namespace, entries] of Object.entries(english)) {
      assert.deepEqual(Object.keys(messages[namespace as keyof typeof messages]).sort(), Object.keys(entries).sort());
    }
    for (const error of ["invalidCredentials", "signInUnavailable", "signOutFailed"] as const) {
      assert.ok(messages.Auth[error].trim());
    }
    assert.ok(messages.Error.title.trim());
    assert.ok(messages.Project.notFoundTitle.trim());
  }
  assert.notEqual(getLocaleMessages("ca").Auth.signIn, english.Auth.signIn);
  assert.notEqual(getLocaleMessages("es").Home.projects, english.Home.projects);
});

test("task counts use ICU singular and plural messages in English, Spanish and Catalan", () => {
  const expected = { en: ["0 tasks", "1 task", "2 tasks"], es: ["0 tareas", "1 tarea", "2 tareas"], ca: ["0 tasques", "1 tasca", "2 tasques"] };
  for (const locale of locales) {
    const t = createTranslator({ locale, messages: getLocaleMessages(locale), namespace: "Board" });
    for (const count of [0, 1, 2]) assert.equal(t("taskCount", { count }), expected[locale][count]);
  }
});
