import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export async function AppShell({ children }: { children: ReactNode }) {
  const t = await getTranslations("Common");

  return (
    <div className="workspace-stage">
      <a href="#main-content" className="sr-only z-10 rounded-lg bg-accent px-4 py-3 text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
        {t("skipContent")}
      </a>
      <aside aria-label={t("sidebar")} className="workspace-sidebar">
        <div className="flex items-center justify-center gap-3 md:justify-start">
          <Image src="/brand/logo.svg" alt="" width={32} height={32} className="size-8 shrink-0 object-contain" />
          <p className="sr-only text-lg font-semibold tracking-tight md:not-sr-only">Portfolio Kanban</p>
        </div>
      </aside>
      <div className="workspace-content">{children}</div>
    </div>
  );
}
