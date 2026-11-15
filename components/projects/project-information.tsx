"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ProjectDialog } from "./project-dialog";

export function ProjectInformation({ children }: { children: ReactNode }) {
  const t = useTranslations("ProjectInformation");
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label={t("open")} title={t("open")} onClick={() => setOpen(true)}
      className="editor-tool rounded-full border border-border/25 bg-surface/70">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false" className="size-6"><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.5" r=".75" fill="currentColor" stroke="none" /></svg>
    </button>
    <ProjectDialog id={id} title={t("title")} closeLabel={t("close")} open={open} onClose={() => setOpen(false)} triggerRef={trigger}>
      {children}
    </ProjectDialog>
  </>;
}
