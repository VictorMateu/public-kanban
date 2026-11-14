"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const entries = [
  { href: "/", key: "overview", icon: "overview" },
  { href: "/projects", key: "projects", icon: "projects" },
] as const;

export function SidebarNavigation() {
  const pathname = usePathname();
  const t = useTranslations("Navigation");

  return (
    <nav aria-label={t("label")}>
      <ul className="space-y-3">
        {entries.map((entry) => {
          const active = pathname === entry.href || (entry.href !== "/" && pathname.startsWith(`${entry.href}/`));
          return (
            <li key={entry.href}>
              <Link
                href={entry.href}
                aria-current={active ? "page" : undefined}
                title={t(entry.key)}
                className={`flex min-h-14 items-center justify-start gap-4 rounded-xl border px-4 py-4 text-xl text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus ${active ? "border-border/15 bg-accent text-accent-foreground" : "border-transparent hover:border-border/15 hover:bg-surface-warm"}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false" className="size-6 shrink-0">
                  {entry.icon === "overview" ? (
                    <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>
                  ) : (
                    <><path d="M3 7V5.5A1.5 1.5 0 0 1 4.5 4H10l2 3h7.5A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V7Z" /><path d="M3 9h18" /></>
                  )}
                </svg>
                <span>{t(entry.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
