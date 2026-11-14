import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { RichTextContent } from "../../../components/projects/rich-text-content";
import { readRichText, richTextToPlainText } from "../../../lib/projects/rich-text";
import { ProjectBoard } from "../../../components/projects/project-board";
import { getAdministrator } from "../../../lib/auth/server";
import { ProjectManagement } from "../../../components/projects/project-management";
import { getManagedProjectBySlug, getPublishedProjectBySlug } from "../../../lib/projects/queries";
import { isProjectSlug } from "../../../lib/projects/slug";
import { isSupabaseConfigured } from "../../../lib/supabase/env";

type ProjectPageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ edit?: string; saved?: string }> };
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
  const { edit, saved } = await searchParams;
  if (!project) notFound();
  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/projects" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-normal text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700">
        <span aria-hidden="true">←</span> {t("allProjects")}
      </Link>
      {administrator && <><p className="mt-4 text-sm">{form(project.is_published ? "published" : "draft")}</p>{saved === "1" && <p role="status" className="mt-4">{form("saved")}</p>}<ProjectManagement key={project.updated_at} project={project} initiallyOpen={edit === "1"} /></>}
      <header className="mt-7 max-w-3xl">
        <p className="mb-3 text-sm font-normal tracking-widest text-indigo-700 uppercase">{t("label")}</p>
        <h1 className="text-3xl font-bold text-balance wrap-anywhere sm:text-5xl">{project.name}</h1>
        {project.description_content || project.description ? <div className="mt-5"><RichTextContent preview={administrator} document={readRichText(project.description_content, project.description)} /></div> : null}
        {project.objectives_content && <section aria-labelledby="objectives-heading" className="mt-8"><h2 id="objectives-heading" className="mb-4 text-2xl">{t("objectives")}</h2><RichTextContent preview={administrator} document={readRichText(project.objectives_content)} /></section>}
        {project.repository_url && <a href={project.repository_url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">{t("repository")}</a>}
      </header>
      <section aria-labelledby="board-heading" className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 id="board-heading" className="text-2xl font-semibold">{t("board")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("boardDescription")}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-normal text-slate-600">{t("readOnly")}</span>
        </div>
        <Suspense fallback={<p role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">{t("loading")}</p>}>
          <ProjectBoard projectId={project.id} administrator={administrator} />
        </Suspense>
      </section>
    </main>
  );
}
