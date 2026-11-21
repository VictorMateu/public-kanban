import Link from "next/link";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { PageMessage } from "../components/shared/page-message";
import { PROJECT_NOT_FOUND_HEADER } from "../lib/projects/urls";
import ProjectNotFound from "./projects/[slug]/not-found";

export default async function NotFound() {
  if ((await headers()).get(PROJECT_NOT_FOUND_HEADER) === "1") return <ProjectNotFound />;
  const t = await getTranslations("NotFound");
  const common = await getTranslations("Common");
  return (
    <PageMessage eyebrow="404" title={t("title")} description={t("description")}>
      <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/15 bg-accent px-5 py-3 text-accent-foreground transition-colors hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">{common("backHome")}</Link>
    </PageMessage>
  );
}
