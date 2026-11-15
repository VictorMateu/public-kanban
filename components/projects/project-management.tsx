"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
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
  const [formBusy, setFormBusy] = useState(false);
  const [publicationBusy, setPublicationBusy] = useState(false);
  const busy = formBusy || publicationBusy;
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
    if (event.key === "Escape" && busy) {
      event.preventDefault();
      return;
    }
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

  return <div className="mt-6 flex w-full justify-start text-left">
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}
      className="min-h-11 rounded-xl border border-border/45 bg-accent px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      {t(project ? "edit" : "newProject")}
    </button>
    <dialog ref={dialog} id={id} aria-labelledby={id + "-heading"} onKeyDown={handleDialogKeyDown} closedby={busy ? "none" : "closerequest"}
      onCancel={(event) => { event.preventDefault(); if (!busy) setOpen(false); }}
      onClose={() => {
        if (!dialog.current?.open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-border/30 bg-surface p-0 text-left text-foreground shadow-panel backdrop:bg-foreground/45">
      {open && <>
        <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b border-border/25 bg-surface p-4 sm:px-6">
          <h2 ref={heading} tabIndex={-1} id={id + "-heading"} className="text-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">{t(project ? "edit" : "create")}</h2>
          <button type="button" disabled={busy} onClick={() => setOpen(false)}
            className="min-h-11 rounded-xl border border-border/45 px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50">
            {t("closeForm")}
          </button>
        </div>
        <div className="min-w-0 p-4 sm:p-6">
          <ProjectForm onBusyChange={setFormBusy} disabled={publicationBusy} project={project} description={readRichText(project?.description_content, project?.description)} objectives={readRichText(project?.objectives_content)} />
          {project && <PublicationForm onBusyChange={setPublicationBusy} disabled={formBusy} project={project} />}
        </div>
      </>}
    </dialog>
  </div>;
}
