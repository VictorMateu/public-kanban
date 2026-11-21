"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, localeCookie, localeFormField } from "./locales";

export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get(localeFormField);
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
}
