import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageMessage } from "../../../components/page-message";

export default function ProjectNotFound() {
  const t = useTranslations("Project");
  const common = useTranslations("Common");
  return (
    <PageMessage eyebrow="404" title={t("notFoundTitle")} description={t("notFoundDescription")}>
      <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/15 bg-accent px-5 py-3 text-accent-foreground transition-colors hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">{common("backHome")}</Link>
    </PageMessage>
  );
}
