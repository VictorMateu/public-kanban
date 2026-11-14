"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getAuthCookieOptions } from "./cookie-options";
import { getSupabaseConfig } from "./env";

export function createBrowserSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient<Database>(url, key, {
    cookieOptions: getAuthCookieOptions(),
  });
}
