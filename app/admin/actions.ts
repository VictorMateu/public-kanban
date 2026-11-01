"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authenticateAdministrator, type AuthFormState } from "../../lib/auth/password";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    const supabase = await createServerSupabaseClient(true);
    const authorized = await authenticateAdministrator(supabase, formData);
    if (!authorized) return { error: "No se pudo iniciar sesión con los datos proporcionados." };
  } catch {
    return { error: "No se pudo iniciar sesión. Comprueba la configuración y vuelve a intentarlo." };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function signOut(): Promise<AuthFormState> {
  try {
    const supabase = await createServerSupabaseClient(true);
    const { error } = await supabase.auth.signOut();
    if (error) return { error: "No se pudo cerrar la sesión. Vuelve a intentarlo." };
  } catch {
    return { error: "No se pudo cerrar la sesión. Vuelve a intentarlo." };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}
