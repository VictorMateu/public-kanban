import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdministrator } from "../../../lib/auth/server";
import { isSupabaseConfigured } from "../../../lib/supabase/env";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdministrator()) redirect("/admin");

  return (
    <main className="mx-auto min-h-svh max-w-md px-5 py-12">
      <Link href="/" className="text-indigo-800 underline underline-offset-4">Volver al inicio</Link>
      <h1 className="mt-8 text-3xl font-bold">Acceso del administrador</h1>
      <p className="mt-3 text-slate-600">Acceso exclusivo del propietario de Portfolio Kanban.</p>
      {isSupabaseConfigured() ? <LoginForm /> : (
        <p role="status" className="mt-8 rounded-lg border border-slate-300 bg-white p-4">
          El acceso todavía no está configurado. Consulta los pasos de configuración en el README.
        </p>
      )}
    </main>
  );
}
