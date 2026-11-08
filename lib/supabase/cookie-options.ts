import type { CookieOptions } from "@supabase/ssr";

export function getAuthCookieOptions(environment = process.env.NODE_ENV): CookieOptions {
  return { secure: environment === "production" };
}
