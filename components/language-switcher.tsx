import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "../i18n/actions";

export async function LanguageSwitcher() {
  const locale = await getLocale();
  const t = await getTranslations("Language");

  return (
    <form action={setLocale} className="flex items-center gap-2">
      <label>
        <span className="sr-only">{t("label")}</span>
        <select name="locale" defaultValue={locale} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700">
          <option value="en" lang="en">English</option>
          <option value="es" lang="es">Español</option>
          <option value="ca" lang="ca">Català</option>
        </select>
      </label>
      <button type="submit" className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700">{t("apply")}</button>
    </form>
  );
}
