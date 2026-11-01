import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getAdministrator } from "../../../lib/auth/server";
import { isSupabaseConfigured } from "../../../lib/supabase/env";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdministrator()) redirect("/admin");

  const t = await getTranslations("Auth");
  const common = await getTranslations("Common");
  return (
    <main className="mx-auto min-h-svh max-w-md px-5 py-12">
      <Link href="/" className="text-indigo-800 underline underline-offset-4">{common("backHome")}</Link>
      <h1 className="mt-8 text-3xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-slate-600">{t("description")}</p>
      {isSupabaseConfigured() ? <LoginForm /> : (
        <p role="status" className="mt-8 rounded-lg border border-slate-300 bg-white p-4">
          {t("notConfigured")}
        </p>
      )}
    </main>
  );
}
