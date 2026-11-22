import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "../shared/empty-state";
import { ProjectCard } from "./project-card";
import { listCancellationReasons, listManagedProjects, listPublishedProjects } from "../../lib/projects/queries";
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
    return <EmptyState title={t(administrator ? "managedEmptyTitle" : "emptyTitle")} description={t(administrator ? "managedEmptyDescription" : "emptyDescription")} />;
  }
  const cancelledIds = projects.filter((project) => project.status === "cancelled" && (administrator || !project.is_hidden)).map(({ id }) => id);
  const reasons = await listCancellationReasons(cancelledIds, administrator);
  return (
    <ul aria-label={t(administrator ? "managedProjects" : "publishedProjects")} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18.75rem),1fr))] gap-5">
      {projects.map((project, index) => <li key={project.id} className="min-w-0"><ProjectCard project={project} showVisibility={administrator} cancellationReason={reasons.get(project.id)} coverVariant={index % 3} /></li>)}
    </ul>
  );
}

export async function ProjectList() {
  const t = await getTranslations("Home");
  const administrator = Boolean(await getAdministrator());
  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-5 pt-7 pb-12 sm:px-10 sm:pt-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl text-balance sm:text-5xl">{t("projects")}</h1>
          <p className="mt-2 max-w-2xl text-lg leading-relaxed text-pretty text-foreground/90">{t("introduction")}</p>
        </div>
        {administrator && <ProjectManagement className="lg:shrink-0" triggerClassName="w-full lg:w-auto" />}
      </header>
      <section aria-labelledby="projects-heading" className="mt-6 sm:mt-8">
        <h2 id="projects-heading" className="sr-only">{t(administrator ? "managedProjects" : "publishedProjects")}</h2>
        <Suspense fallback={<p role="status" className="rounded-2xl border border-border/15 bg-surface/90 p-6 text-foreground/80">{t("loading")}</p>}>
          <Projects administrator={administrator} />
        </Suspense>
      </section>
    </main>
  );
}
