import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "../../i18n/actions";

const languages = [
  { locale: "en", label: "english" },
  { locale: "es", label: "spanish" },
  { locale: "ca", label: "catalan" },
] as const;

export async function LanguageSwitcher() {
  const locale = await getLocale();
  const t = await getTranslations("Language");

  return (
    <form action={setLocale} aria-label={t("label")} className="flex w-full flex-col gap-1 self-center rounded-full border border-border/15 bg-surface/70 p-1 md:w-fit md:flex-row">
      {languages.map((language) => {
        const active = locale === language.locale;
        return (
          <button
            key={language.locale}
            type="submit"
            name="locale"
            value={language.locale}
            lang={language.locale}
            aria-label={t(language.label)}
            aria-pressed={active}
            title={t(language.label)}
            className={`flex min-h-11 min-w-0 items-center justify-center rounded-full px-1 py-1 text-base text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:min-w-14 md:px-3 ${active ? "bg-accent" : "hover:bg-surface-warm"}`}
          >
            <span>{language.locale.toUpperCase()}</span>
          </button>
        );
      })}
    </form>
  );
}
