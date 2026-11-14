import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { SidebarNavigation } from "./sidebar-navigation";
import { SidebarIllustration } from "../illustrations/sidebar-illustration";
import { LanguageSwitcher } from "../shared/language-switcher";
import { getAdministrator } from "../../lib/auth/server";

export async function AppShell({ children }: { children: ReactNode }) {
  const t = await getTranslations("Common");
  const auth = await getTranslations("Auth");
  // An unavailable Auth service must not prevent browsing public content.
  const administrator = await getAdministrator().catch(() => null);

  return (
    <div className="workspace-stage">
      <a href="#main-content" className="sr-only z-10 rounded-lg bg-accent px-4 py-3 text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
        {t("skipContent")}
      </a>
      <WorkspaceSidebar
        label={t("sidebar")}
        brand={
          <Link href="/" title={t("backHome")} className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus md:gap-4">
            <Image src="/brand/logo.svg" alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
            <p className="font-heading text-2xl font-semibold md:text-3xl">{t("appName")}</p>
          </Link>
        }
      >
        <SidebarNavigation />
        <div className="mt-auto flex shrink-0 flex-col gap-4 pt-6">
          <SidebarIllustration />
          <LanguageSwitcher />
        </div>
      </WorkspaceSidebar>
      <div className="workspace-content">
        {administrator && (
          <div className="flex shrink-0 justify-end px-4 pt-4 sm:px-8">
            <span role="img" aria-label={auth("sessionActive")} title={auth("sessionActive")} className="flex size-11 items-center justify-center rounded-full border border-border/30 bg-positive text-foreground">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false" className="size-6">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
              </svg>
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
