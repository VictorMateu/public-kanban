"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ProjectDialog } from "./project-dialog";

export function ProjectCancellationDialog({ projectName, reason }: { projectName: string; reason: string }) {
  const t = useTranslations("ProjectInformation");
  const form = useTranslations("ProjectForm");
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return <>
    <button ref={trigger} type="button" data-open-cancellation="" aria-controls={id} aria-expanded={open} aria-haspopup="dialog"
      aria-label={t("openCancellationFor", { project: projectName })} className="project-secondary-action" onClick={() => setOpen(true)}>
      {t("openCancellation")}
    </button>
    <ProjectDialog id={id} title={form("cancellationReason")} closeLabel={t("close")} open={open} triggerRef={trigger} onClose={() => setOpen(false)}>
      <p className="mb-3 text-lg wrap-anywhere">{projectName}</p>
      <p className="whitespace-pre-wrap wrap-anywhere">{reason}</p>
    </ProjectDialog>
  </>;
}
