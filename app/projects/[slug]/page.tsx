import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { readRichText, richTextToPlainText } from "../../../lib/projects/rich-text";
import { ProjectBoard } from "../../../components/projects/project-board";
import { getAdministrator } from "../../../lib/auth/server";
import { ProjectInformation } from "../../../components/projects/project-information";
import { RichTextContent } from "../../../components/projects/rich-text-content";
import { getManagedProjectBySlug, getPublishedProjectBySlug } from "../../../lib/projects/queries";
import { isProjectSlug } from "../../../lib/projects/slug";
import { ENABLED_QUERY_FLAG, PROJECT_SAVED_PARAM } from "../../../lib/projects/urls";
import { isSupabaseConfigured } from "../../../lib/supabase/env";

type ProjectPageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ edit?: string; [PROJECT_SAVED_PARAM]?: string }> };
const getProject = cache(getPublishedProjectBySlug);
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("Project");
  const common = await getTranslations("Common");
  if (!isProjectSlug(slug) || !isSupabaseConfigured()) return { title: `${t("label")} | ${common("appName")}` };
  const project = await getProject(slug);
  return {
    ...(!project ? { robots: { index: false, follow: false } } : {}),
    title: `${project ? project.name : t("notFoundTitle")} | ${common("appName")}`,
    ...(project?.description ? { description: richTextToPlainText(readRichText(project.description_content, project.description)).replace(/\s+/gu, " ").slice(0, 300) } : {}),
  };
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { slug } = await params;
  if (!isProjectSlug(slug)) notFound();
  const t = await getTranslations("Project");
  if (!isSupabaseConfigured()) {
    return (
      <main id="main-content" className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <h1 className="text-3xl font-bold">{t("unavailableTitle")}</h1>
        <p role="status" className="mt-4 leading-relaxed text-slate-600">{t("unavailableDescription")}</p>
      </main>
    );
  }
  const administrator = Boolean(await getAdministrator());
  const project = administrator ? await getManagedProjectBySlug(slug) : await getProject(slug);
  const form = await getTranslations("ProjectForm");
  const information = await getTranslations("ProjectInformation");
  const { edit, [PROJECT_SAVED_PARAM]: saved } = await searchParams;
  if (!project) notFound();
  const cancelled = project.status === "cancelled";
  return (
    <main id="main-content" data-project-board-page="" className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-5 pt-2 pb-5 sm:px-8 sm:pt-3 sm:pb-6">
      <div className="shrink-0">
        <Link href="/projects" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
          <span aria-hidden="true">←</span> {t("allProjects")}
        </Link>
      </div>
      <div className="mt-1 flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className={`flex min-w-0 items-center gap-x-3${cancelled ? " flex-wrap" : ""}`}>
          <h1 className="min-w-0 text-3xl wrap-anywhere sm:text-4xl">{project.name}</h1>
          <ProjectInformation key={project.updated_at} cancelled={cancelled} project={administrator ? project : undefined} initiallyEditing={administrator && edit === "1"}>
            <div className="space-y-6">
              <p>{form("status")}: {form(project.status)}</p>
              {cancelled && project.cancellation_reason && <section>
                <h3 className="mb-3 text-2xl">{form("cancellationReason")}</h3>
                <p className="whitespace-pre-wrap wrap-anywhere">{project.cancellation_reason}</p>
              </section>}
              <p className="text-2xl wrap-anywhere">{project.name}</p>
              {project.description_content || project.description ? <section><h3 className="mb-3 text-2xl">{information("description")}</h3><RichTextContent preview={administrator} document={readRichText(project.description_content, project.description)} /></section> : null}
              {project.objectives_content && <section><h3 className="mb-3 text-2xl">{t("objectives")}</h3><RichTextContent preview={administrator} document={readRichText(project.objectives_content)} /></section>}
              {project.repository_url && <a href={project.repository_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">{t("repository")}</a>}
              {!cancelled && !project.description_content && !project.description && !project.objectives_content && !project.repository_url && <p>{information("empty")}</p>}
            </div>
          </ProjectInformation>
        </div>
        {administrator && <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {!cancelled && <span className="rounded-full border border-border/20 bg-surface/70 px-3 py-1 text-sm">{form(project.status)}</span>}
          <span className="rounded-full border border-border/20 bg-surface/70 px-3 py-1 text-sm">{form(project.is_published ? "published" : "draft")}</span>
          {project.is_hidden && <span className="rounded-full border border-border/20 bg-surface/70 px-3 py-1 text-sm">{form("hidden")}</span>}
        </div>}
      </div>
      {administrator && saved === ENABLED_QUERY_FLAG && <p role="status" className="sr-only">{form("saved")}</p>}
      <section aria-labelledby="board-heading" className="mt-3 flex min-h-0 flex-1 flex-col border-t border-border/20 pt-3 sm:mt-4 sm:pt-4">
        <h2 id="board-heading" className="sr-only">{t("board")}</h2>
        <Suspense fallback={<p role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">{t("loading")}</p>}>
          <ProjectBoard projectId={project.id} administrator={administrator} />
        </Suspense>
      </section>
    </main>
  );
}
