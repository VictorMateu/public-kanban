import { defaultLocale, type Locale } from "../../i18n/locales.ts";

export function formatDueDate(value: string, locale: Locale = defaultLocale): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  // PostgreSQL date values have no time; UTC preserves their displayed calendar day.
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
