export const locales = ["en", "es", "ca"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const localeCookie = "portfolio-kanban-locale";
export const localeFormField = "locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.some((locale) => locale === value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}
