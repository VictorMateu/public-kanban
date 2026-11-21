import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ListedProject } from "../../lib/projects/queries";
import type { ProjectStatus } from "../../lib/projects/schemas";
import { projectImageUrl } from "../../lib/projects/rich-text";
import { ProjectCancellationDialog } from "./project-cancellation-dialog";
import { ProjectCoverImage } from "./project-cover-image";
import styles from "./project-card.module.css";

const statusTone = {
  development: "bg-surface-highlight",
  maintenance: "bg-surface-warm",
  completed: "bg-surface-positive",
  cancelled: "bg-surface-secondary",
} satisfies Record<ProjectStatus, string>;

const card = "relative isolate flex h-full min-w-0 flex-col rounded-2xl border border-border/20";

export function ProjectCard({ project, showVisibility = false, cancellationReason }: {
  project: ListedProject;
  showVisibility?: boolean;
  cancellationReason?: string;
}) {
  const t = useTranslations("Common");
  const form = useTranslations("ProjectForm");
  const slug = showVisibility || !project.is_hidden ? project.slug : null;
  const reason = slug && project.status === "cancelled" ? cancellationReason : undefined;
  const headingId = "project-" + project.id;
  const actionId = headingId + "-action";
  const statusBadge = `rounded-full border border-border/15 px-2.5 py-0.5 ${statusTone[project.status]}`;
  const src = slug && project.cover
    ? projectImageUrl(project.cover.assetId, !project.is_published || project.is_hidden)
    : null;

  const heading = <h3 id={headingId} className="text-2xl font-semibold wrap-anywhere">{project.name}</h3>;
  const surface = slug ? "bg-surface shadow-panel motion-safe:transition-colors has-[a:hover]:border-border/55 has-[a:hover]:bg-surface-warm" : "bg-surface/85";

  return (
    <article aria-labelledby={headingId} className={`${card} ${surface}`}>
      <div className={`${styles.cover} relative aspect-[16/9] overflow-hidden rounded-t-[calc(1rem-1px)] border-b border-border/15`}>
        {src && project.cover && <ProjectCoverImage key={src} src={src} alt={project.cover.alt} />}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        {slug ? (
          <Link href={"/projects/" + encodeURIComponent(slug)} aria-labelledby={`${headingId} ${actionId}`}
            className="rounded-md after:absolute after:inset-0 after:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            {heading}
          </Link>
        ) : heading}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          {reason ? <ProjectCancellationDialog projectName={project.name} reason={reason} badgeClassName={statusBadge} />
            : <span className={statusBadge}>{form(project.status)}</span>}
          {showVisibility && <span className="rounded-full border border-border/25 px-2.5 py-0.5">{form(project.is_published ? "published" : "draft")}</span>}
          {project.is_hidden && <span className="rounded-full border border-border/25 px-2.5 py-0.5">{form("hidden")}</span>}
        </div>
        {project.description && <p className="line-clamp-3 leading-relaxed text-foreground/85 wrap-anywhere">{project.description.trim()}</p>}
        <div className="mt-auto pt-1">
          <span id={actionId} className="flex items-center justify-between gap-3 border-t border-border/15 pt-3 text-sm">
            {slug ? <span className="underline decoration-border/45 underline-offset-4">{t("exploreBoard")}</span> : form("hiddenCard")}
            {slug && <span aria-hidden="true" className="text-lg leading-none">→</span>}
          </span>
        </div>
      </div>
    </article>
  );
}
