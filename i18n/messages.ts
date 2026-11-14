import en from "../messages/en.json" with { type: "json" };
import es from "../messages/es.json" with { type: "json" };
import ca from "../messages/ca.json" with { type: "json" };
import type { Locale } from "./locales";

type MessageCatalog = Record<string, Record<string, string>>;
type PartialCatalog<T extends MessageCatalog> = { [K in keyof T]?: Partial<T[K]> };

// Catalogs use namespaces containing string messages; missing translations use English.
export function mergeMessages<T extends MessageCatalog>(base: T, translated: PartialCatalog<T>): T {
  const result = { ...base };
  for (const namespace in base) {
    result[namespace] = { ...base[namespace], ...translated[namespace] };
  }
  return result;
}

const translations = { en, es, ca };
export function getLocaleMessages(locale: Locale) {
  return mergeMessages(en, translations[locale]);
}
