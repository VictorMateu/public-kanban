import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "../../components/language-switcher";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: `${t("adminTitle")} | Portfolio Kanban`, robots: { index: false, follow: false } };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <><div className="mx-auto flex max-w-7xl justify-end px-5 pt-5 sm:px-8"><LanguageSwitcher /></div>{children}</>;
}
