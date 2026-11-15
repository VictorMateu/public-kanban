import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "../shared/empty-state";
import { ProjectCard } from "./project-card";
import { listManagedProjects, listPublishedProjects } from "../../lib/projects/queries";
import { getAdministrator } from "../../lib/auth/server";
import { ProjectManagement } from "./project-management";
import { isSupabaseConfigured } from "../../lib/supabase/env";

async function Projects({ administrator }: { administrator: boolean }) {
  const t = await getTranslations("Home");
  if (!isSupabaseConfigured()) {
    return <EmptyState title={t("unavailableTitle")} description={t("unavailableDescription")} />;
  }
  const projects = administrator ? await listManagedProjects() : await listPublishedProjects();
  if (!projects.length) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }
  return (
    <ul aria-label={t(administrator ? "managedProjects" : "publishedProjects")} className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => <li key={project.id}><ProjectCard project={project} showVisibility={administrator} /></li>)}
    </ul>
  );
}

export async function ProjectList() {
  const t = await getTranslations("Home");
  const administrator = Boolean(await getAdministrator());
  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-5 pt-10 pb-16 sm:px-10 sm:pt-14">
      <div className="max-w-3xl">
        <p className="mb-4 text-sm tracking-widest text-foreground/75 uppercase">{t("eyebrow")}</p>
        <h1 className="text-4xl text-balance sm:text-5xl">{t("projects")}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-foreground/80">{t("introduction")}</p>
      </div>
      {administrator && <ProjectManagement />}
      <section aria-labelledby="projects-heading" className="mt-10">
        <h2 id="projects-heading" className="sr-only">{t(administrator ? "managedProjects" : "publishedProjects")}</h2>
        <p className="mb-6 text-sm text-foreground/80">{t("openProject")}</p>
        <Suspense fallback={<p role="status" className="rounded-2xl border border-border/15 bg-surface/90 p-6 text-foreground/80">{t("loading")}</p>}>
          <Projects administrator={administrator} />
        </Suspense>
      </section>
    </main>
  );
}
