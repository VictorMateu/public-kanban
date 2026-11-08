import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: `${t("adminTitle")} | Portfolio Kanban`, robots: { index: false, follow: false } };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
