"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authenticateAdministrator, type AuthFormState } from "../../lib/auth/password";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    const supabase = await createServerSupabaseClient(true);
    const authorized = await authenticateAdministrator(supabase, formData);
    if (!authorized) return { error: "invalidCredentials" };
  } catch {
    return { error: "signInUnavailable" };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function signOut(): Promise<AuthFormState> {
  try {
    const supabase = await createServerSupabaseClient(true);
    const { error } = await supabase.auth.signOut();
    if (error) return { error: "signOutFailed" };
  } catch {
    return { error: "signOutFailed" };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}
