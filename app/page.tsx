import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "../components/language-switcher";

export default async function Home() {
  const t = await getTranslations("Construction");
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12 sm:px-8">
      <section
        aria-labelledby="page-title"
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-12"
      >
        <div className="mb-6 flex justify-end"><LanguageSwitcher /></div>
        <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-800">
          <span aria-hidden="true" className="size-2 rounded-full bg-indigo-600" />
          {t("status")}
        </p>
        <h1
          id="page-title"
          className="text-4xl font-bold tracking-tight text-balance sm:text-5xl"
        >
          Portfolio Kanban
        </h1>
        <p className="mt-5 max-w-prose text-lg leading-relaxed text-pretty text-slate-600">
          {t("description")}
        </p>
      </section>
    </main>
  );
}
