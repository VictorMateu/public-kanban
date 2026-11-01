import "server-only";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";

export async function getAdministrator() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();

  // getUser verifica la sesión contra Auth; no se confía en getSession ni metadata.
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
