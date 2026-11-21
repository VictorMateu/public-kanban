"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ProjectDialog } from "./project-dialog";

export function ProjectCancellationDialog({ projectName, reason, badgeClassName }: { projectName: string; reason: string; badgeClassName: string }) {
  const t = useTranslations("ProjectInformation");
  const form = useTranslations("ProjectForm");
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const status = form("cancelled");
  return <>
    <button ref={trigger} type="button" data-open-cancellation="" aria-controls={id} aria-expanded={open} aria-haspopup="dialog"
      aria-label={`${status}: ${t("openCancellationFor", { project: projectName })}`} title={form("cancellationReason")}
      className={`${badgeClassName} relative z-20 cursor-pointer hover:border-border/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
      onClick={() => setOpen(true)}>
      {status}
    </button>
    <ProjectDialog id={id} title={form("cancellationReason")} closeLabel={t("close")} open={open} triggerRef={trigger} onClose={() => setOpen(false)}>
      <p className="mb-3 text-lg wrap-anywhere">{projectName}</p>
      <p className="whitespace-pre-wrap wrap-anywhere">{reason}</p>
    </ProjectDialog>
  </>;
}
