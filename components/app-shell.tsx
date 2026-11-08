import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SidebarNavigation } from "./sidebar-navigation";

export async function AppShell({ children }: { children: ReactNode }) {
  const t = await getTranslations("Common");

  return (
    <div className="workspace-stage">
      <a href="#main-content" className="sr-only z-10 rounded-lg bg-accent px-4 py-3 text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
        {t("skipContent")}
      </a>
      <aside aria-label={t("sidebar")} className="workspace-sidebar">
        <Link href="/" title={t("backHome")} className="flex items-center justify-center gap-4 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus md:justify-start">
          <Image src="/brand/logo.svg" alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
          <p className="sr-only font-heading text-3xl font-semibold md:not-sr-only">{t("appName")}</p>
        </Link>
        <SidebarNavigation />
      </aside>
      <div className="workspace-content">{children}</div>
    </div>
  );
}
