import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  const common = await getTranslations("Common");
  return (
    <main id="main-content" className="mx-auto w-full max-w-2xl px-5 py-20 text-center">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-4 text-slate-600">{t("description")}</p>
      <Link href="/" className="mt-6 inline-block text-indigo-800 underline">{common("backHome")}</Link>
    </main>
  );
}
