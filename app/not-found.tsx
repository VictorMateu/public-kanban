import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageMessage } from "../components/shared/page-message";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  const common = await getTranslations("Common");
  return (
    <PageMessage eyebrow="404" title={t("title")} description={t("description")}>
      <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/15 bg-accent px-5 py-3 text-accent-foreground transition-colors hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">{common("backHome")}</Link>
    </PageMessage>
  );
}
