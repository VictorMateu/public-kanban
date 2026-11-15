"use client";

import { useId, useRef, useState } from "react";
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

export function ProjectManagement({ project = null, initiallyOpen = false, className = "mt-6 w-full", triggerClassName = "" }: {
  project?: Project | null; initiallyOpen?: boolean; className?: string; triggerClassName?: string;
}) {
  const t = useTranslations("ProjectForm");
  const [formStatus, setFormStatus] = useState<ProjectFormStatus>({ busy: false, pending: false, canSubmit: false });
  const busy = formStatus.busy;
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);

  return <div className={`flex justify-end text-left ${className}`}>
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}
      className={`project-primary-action ${triggerClassName}`}>
      {t(project ? "edit" : "newProject")}
    </button>
    <ProjectDialog id={id} title={t(project ? "edit" : "create")} closeLabel={t("closeForm")} open={open} busy={busy} triggerRef={trigger}
      onClose={() => setOpen(false)} onAfterClose={() => setFormStatus({ busy: false, pending: false, canSubmit: false })}
      actions={<button type="submit" form={id + "-form"} disabled={!formStatus.canSubmit} className="project-primary-action">{t(formStatus.pending ? "saving" : project ? "save" : "create")}</button>}>
      <ProjectForm formId={id + "-form"} onStatusChange={setFormStatus} project={project} description={readRichText(project?.description_content, project?.description)} objectives={readRichText(project?.objectives_content)} />
    </ProjectDialog>
  </div>;
}
