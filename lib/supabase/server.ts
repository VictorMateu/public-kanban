import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseConfig } from "./env";

// writableCookies solo en Server Actions/Route Handlers; cada llamada crea un cliente.
export async function createServerSupabaseClient(writableCookies = false) {
  const { url, key } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
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
