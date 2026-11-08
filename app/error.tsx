"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageMessage } from "../components/page-message";

export default function Error() {
  const t = useTranslations("Error");
  const common = useTranslations("Common");
  return (
    <PageMessage announce title={t("title")} description={t("description")}>
      <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl border border-border/15 bg-accent px-5 py-3 text-accent-foreground transition-colors hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">{common("retry")}</button>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border border-border/30 px-5 py-3 text-foreground transition-colors hover:bg-surface-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">{common("backHome")}</Link>
    </PageMessage>
  );
}
