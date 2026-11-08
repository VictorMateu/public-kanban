import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProjectList } from "../../components/project-list";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Navigation");
  const common = await getTranslations("Common");
  return { title: `${t("projects")} | ${common("appName")}` };
}

export default function ProjectsPage() {
  return <ProjectList />;
}
