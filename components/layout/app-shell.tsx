import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { SidebarNavigation } from "./sidebar-navigation";
import { SidebarIllustration } from "../illustrations/sidebar-illustration";
import { LanguageSwitcher } from "../shared/language-switcher";
import { getAdministrator } from "../../lib/auth/server";
import { AccountMenu } from "../auth/account-menu";
import { SessionIndicator } from "../auth/account-icon";
import { SignOutForm } from "../auth/sign-out-form";

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
        mobileStatus={administrator ? <SessionIndicator label={auth("sessionActive")} /> : undefined}
        brand={
          <Link href="/" title={t("backHome")} className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus min-[360px]:gap-3 md:gap-4">
            <Image src="/brand/logo.svg" alt="" width={40} height={40} className="size-8 shrink-0 object-contain min-[360px]:size-10" />
            <p className="font-heading text-xl font-semibold min-[360px]:text-2xl md:text-3xl">{t("appName")}</p>
          </Link>
        }
      >
        <SidebarNavigation />
        <div className="mt-auto flex shrink-0 flex-col gap-4 pt-6">
          <SidebarIllustration />
          <LanguageSwitcher />
          {administrator && <SignOutForm className="md:hidden" />}
        </div>
      </WorkspaceSidebar>
      <div className="workspace-content">
        {administrator && (
          <div className="hidden shrink-0 justify-end px-4 pt-4 sm:px-8 md:flex">
            <AccountMenu>
              <SignOutForm />
            </AccountMenu>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
