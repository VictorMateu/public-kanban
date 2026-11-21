import Link from "next/link";
import { useTranslations } from "next-intl";
import { ProjectCancellationDialog } from "./project-cancellation-dialog";
import type { ProjectSummary } from "../../lib/projects/schemas";

export function ProjectCard({ project, showVisibility = false, cancellationReason }: { project: ProjectSummary; showVisibility?: boolean; cancellationReason?: string }) {
  const t = useTranslations("Common");
  const form = useTranslations("ProjectForm");
  const accessible = Boolean(project.slug) && (showVisibility || !project.is_hidden);
  const label = "project-" + project.id;
  const content = <>
    <h3 id={label} className="text-2xl font-semibold wrap-anywhere">{project.name}</h3>
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
      <span>{form(project.status)}</span>
      {showVisibility && <span>{form(project.is_published ? "published" : "draft")}</span>}
      {project.is_hidden && <span>{form("hidden")}</span>}
    </div>
    {project.description && <p className="mt-3 leading-relaxed whitespace-pre-wrap text-foreground/80 wrap-anywhere">{[...project.description].slice(0, 240).join("")}</p>}
    <span className="mt-auto flex items-center justify-between gap-4 pt-8 text-sm text-foreground">
      {accessible ? t("exploreBoard") : form("hiddenCard")}
      {accessible && <span aria-hidden="true" className="text-lg">→</span>}
    </span>
  </>;
  const classes = "flex h-full flex-col rounded-2xl border border-border/15 bg-surface/90 p-6 shadow-panel";
  if (accessible && project.slug && cancellationReason) {
    return <article className={classes}>
      <Link href={"/projects/" + encodeURIComponent(project.slug)} aria-labelledby={label}
        className="flex flex-1 flex-col rounded-lg underline-offset-4 hover:[&_h3]:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">{content}</Link>
      <div className="mt-3"><ProjectCancellationDialog projectName={project.name} reason={cancellationReason} /></div>
    </article>;
  }
  return <article className="h-full">
    {accessible && project.slug ? <Link href={"/projects/" + encodeURIComponent(project.slug)} aria-labelledby={label} className={classes + " transition-colors hover:border-border/35 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"}>{content}</Link>
      : <div aria-labelledby={label} className={classes}>{content}</div>}
  </article>;
}
