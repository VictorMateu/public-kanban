import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { localeCookie, resolveLocale } from "./locales";
import { getLocaleMessages } from "./messages";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(localeCookie)?.value);
  return { locale, messages: getLocaleMessages(locale), timeZone: "UTC" };
});
