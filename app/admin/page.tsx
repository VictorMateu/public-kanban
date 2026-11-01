import { getTranslations } from "next-intl/server";
import { requireAdministrator } from "../../lib/auth/server";
import { SignOutForm } from "./sign-out-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdministrator();
  const t = await getTranslations("Auth");
  return (
    <main className="mx-auto min-h-svh max-w-2xl px-5 py-12">
      <h1 className="text-3xl font-bold">{t("adminTitle")}</h1>
      <p className="mt-4 text-slate-600">
        {t("verified")}
      </p>
      <SignOutForm />
    </main>
  );
}
