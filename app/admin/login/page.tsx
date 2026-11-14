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
    <main id="main-content" className="flex min-w-0 flex-1 items-center justify-center px-4 py-10 sm:px-8">
      <section aria-labelledby="sign-in-title" className="w-full max-w-md rounded-3xl border border-border/15 bg-surface/90 p-5 shadow-panel sm:p-8">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-foreground/80 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
          <span aria-hidden="true">←</span>{common("backHome")}
        </Link>
        <h1 id="sign-in-title" className="mt-5 text-3xl wrap-anywhere sm:text-4xl">{t("title")}</h1>
        <p className="mt-4 leading-relaxed text-foreground/80">{t("description", { appName: common("appName") })}</p>
        {isSupabaseConfigured() ? <LoginForm /> : (
          <p role="status" className="mt-8 rounded-xl border border-border/20 bg-surface-warm p-4 text-foreground">
            {t("notConfigured")}
          </p>
        )}
      </section>
    </main>
  );
}
