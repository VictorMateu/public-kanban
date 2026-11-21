"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Project } from "../../lib/projects/queries";
import { readRichText } from "../../lib/projects/rich-text";
import type { ProjectFormStatus } from "./project-form";
import { ProjectDialog } from "./project-dialog";

function FormLoading() {
  const t = useTranslations("Editor");
  return <p role="status">{t("loading")}</p>;
}

const ProjectForm = dynamic(() => import("./project-form").then((module) => module.ProjectForm), { loading: FormLoading });

export function ProjectInformation({ children, project, initiallyEditing = false }: {
  children: ReactNode; project?: Project; initiallyEditing?: boolean;
}) {
  const t = useTranslations("ProjectInformation");
  const form = useTranslations("ProjectForm");
  const [open, setOpen] = useState(Boolean(project && initiallyEditing));
  const [editing, setEditing] = useState(Boolean(project && initiallyEditing));
  const [formStatus, setFormStatus] = useState<ProjectFormStatus>({ busy: false, pending: false, canSubmit: false });
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label={t("open")} title={t("open")} onClick={() => setOpen(true)}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false" className="size-6"><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.5" r=".75" fill="currentColor" stroke="none" /></svg>
    </button>
    <ProjectDialog id={id} title={editing ? form("edit") : t("title")} closeLabel={editing ? form("closeForm") : t("close")} open={open} busy={formStatus.busy}
      onClose={() => {
        setOpen(false);
        setEditing(false);
        setFormStatus({ busy: false, pending: false, canSubmit: false });
      }} triggerRef={trigger}
      actions={project && (editing
        ? <button type="submit" form={id + "-form"} disabled={!formStatus.canSubmit} className="project-primary-action">{form(formStatus.pending ? "saving" : "save")}</button>
        : <button type="button" onClick={() => setEditing(true)} className="project-primary-action">{form("edit")}</button>)}>
      {editing && project
        ? <ProjectForm formId={id + "-form"} onStatusChange={setFormStatus} project={project} description={readRichText(project.description_content, project.description)} objectives={readRichText(project.objectives_content)} />
        : children}
    </ProjectDialog>
  </>;
}
