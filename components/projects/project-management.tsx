"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Project } from "../../lib/projects/queries";
import { readRichText } from "../../lib/projects/rich-text";
import type { ProjectFormStatus } from "./project-form";

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
  const [formStatus, setFormStatus] = useState<ProjectFormStatus>({ busy: false, pending: false, canSubmit: false });
  const [publicationBusy, setPublicationBusy] = useState(false);
  const busy = formStatus.busy || publicationBusy;
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    if (!open) {
      if (modal.open) {
        modal.close();
        trigger.current?.focus();
      }
      return;
    }
    if (!modal.open) modal.showModal();
    heading.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || event.defaultPrevented) return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex], [contenteditable="true"]',
    )].filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) {
      event.preventDefault();
      heading.current?.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return <div className="mt-6 flex w-full justify-end text-left">
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}
      className="project-primary-action">
      {t(project ? "edit" : "newProject")}
    </button>
    <dialog ref={dialog} id={id} aria-labelledby={id + "-heading"} onKeyDown={handleDialogKeyDown} closedby={busy ? "none" : "closerequest"}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) setOpen(false);
        }
      }}
      onCancel={(event) => { event.preventDefault(); if (!busy) setOpen(false); }}
      onClose={() => {
        if (!dialog.current?.open) {
          setOpen(false);
          setFormStatus({ busy: false, pending: false, canSubmit: false });
          trigger.current?.focus();
        }
      }}
      className="project-dialog m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-hidden rounded-3xl border border-border/20 bg-surface p-0 text-left text-foreground shadow-panel backdrop:bg-foreground/40">
      {open && <>
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/15 bg-surface-warm/60 px-5 py-4 sm:px-7">
          <h2 ref={heading} tabIndex={-1} id={id + "-heading"} className="text-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">{t(project ? "edit" : "create")}</h2>
          <button type="button" disabled={busy} onClick={() => setOpen(false)} aria-label={t("closeForm")} title={t("closeForm")}
            className="editor-tool project-close-icon shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false" className="size-5"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="project-dialog-body min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
          <ProjectForm formId={id + "-form"} onStatusChange={setFormStatus} disabled={publicationBusy} project={project} description={readRichText(project?.description_content, project?.description)} objectives={readRichText(project?.objectives_content)} />
          {project && <PublicationForm onBusyChange={setPublicationBusy} disabled={formStatus.busy} project={project} />}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-border/15 bg-surface-warm/60 px-5 py-4 sm:px-7">
          <button type="button" disabled={busy} onClick={() => setOpen(false)} className="project-secondary-action">{t("closeForm")}</button>
          <button type="submit" form={id + "-form"} disabled={!formStatus.canSubmit || publicationBusy} className="project-primary-action">{t(formStatus.pending ? "saving" : project ? "save" : "createDraft")}</button>
        </div>
      </>}
    </dialog>
  </div>;
}
