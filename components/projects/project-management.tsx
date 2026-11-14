"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Project } from "../../lib/projects/queries";
import { readRichText } from "../../lib/projects/rich-text";

function FormLoading() {
  const t = useTranslations("Editor");
  return <p role="status">{t("loading")}</p>;
}

const ProjectForm = dynamic(() => import("./project-form").then((module) => module.ProjectForm), { loading: FormLoading });
const PublicationForm = dynamic(() => import("./project-form").then((module) => module.PublicationForm));

export function ProjectManagement({ project = null, initiallyOpen = false }: {
  project?: Project | null; initiallyOpen?: boolean;
}) {
  const t = useTranslations("ProjectForm");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (open) heading.current?.focus(); }, [open]);
  return <div className="mt-6 w-full">
    <button type="button" disabled={busy} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
      className="min-h-11 rounded-xl border border-border/45 bg-accent px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      {t(open ? "closeForm" : project ? "edit" : "newProject")}
    </button>
    {!open && <div id={id} hidden />}
    {open && <section id={id} aria-labelledby={id + "-heading"} className="mt-5 max-w-4xl rounded-xl border border-border/30 bg-surface p-4 sm:p-6">
      <h2 ref={heading} tabIndex={-1} id={id + "-heading"} className="mb-6 text-2xl">{t(project ? "edit" : "create")}</h2>
      <ProjectForm onBusyChange={setBusy} project={project} description={readRichText(project?.description_content, project?.description)} objectives={readRichText(project?.objectives_content)} />
      {project && <PublicationForm disabled={busy} project={project} />}
    </section>}
  </div>;
}
