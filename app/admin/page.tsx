import { requireAdministrator } from "../../lib/auth/server";
import { SignOutForm } from "./sign-out-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdministrator();
  return (
    <main className="mx-auto min-h-svh max-w-2xl px-5 py-12">
      <h1 className="text-3xl font-bold">Administración</h1>
      <p className="mt-4 text-slate-600">
        Sesión de administrador verificada. La gestión del tablero se implementará en una fase posterior.
      </p>
      <SignOutForm />
    </main>
  );
}
