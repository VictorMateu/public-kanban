import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";

export async function getAdministrator(client?: SupabaseClient<Database>) {
  if (!isSupabaseConfigured()) return null;
  const supabase = client ?? await createServerSupabaseClient();

  // getUser verifies the session with Auth; getSession and metadata are not trusted.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const authorization = await supabase.rpc("is_admin");
  if (authorization.error || authorization.data !== true) return null;
  return user;
}

export async function requireAdministrator() {
  const user = await getAdministrator();
  if (!user) redirect("/admin/login");
  return user;
}
