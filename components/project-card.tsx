import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Project } from "../lib/projects/queries";

export function ProjectCard({ project }: { project: Project }) {
  const t = useTranslations("Common");
  return (
    <article className="h-full">
      <Link
        href={`/projects/${encodeURIComponent(project.slug)}`}
        aria-labelledby={`project-${project.id}`}
        className="group flex h-full flex-col rounded-2xl border border-border/15 bg-surface/90 p-6 shadow-panel transition-colors hover:border-border/35 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
      >
        <h3 id={`project-${project.id}`} className="text-2xl font-semibold wrap-anywhere">{project.name}</h3>
        {project.description && <p className="mt-3 leading-relaxed whitespace-pre-wrap text-foreground/80 wrap-anywhere">{project.description}</p>}
        <span className="mt-auto flex items-center justify-between gap-4 pt-8 text-sm text-foreground">
          {t("exploreBoard")}
          <span aria-hidden="true" className="text-lg">→</span>
        </span>
      </Link>
    </article>
  );
}
