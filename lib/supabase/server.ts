import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getAuthCookieOptions } from "./cookie-options";
import { getSupabaseConfig } from "./env";

// Enable writableCookies only in Server Actions/Route Handlers; each call creates a client.
export async function createServerSupabaseClient(writableCookies = false) {
  const { url, key } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookieOptions: getAuthCookieOptions(),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: writableCookies
        ? (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          }
        : undefined,
    },
  });
}
