"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PROJECT_IMAGE_ACCEPT, IMAGE_LIMITS, imageAltSchema } from "../../lib/projects/image-input";

import { uploadProjectImage } from "../../lib/projects/image-upload";
import type { ProjectImageStaging } from "../../lib/projects/image-staging";

export function EditorImageUpload({ projectId, taskId, commentId, imageStaging, disabled, actions, onInsert, onBusyChange, onSelectionChange }: {
  projectId?: string; taskId?: string; commentId?: string; imageStaging?: ProjectImageStaging; disabled: boolean;
  onInsert: (assetId: string, alt: string) => boolean;
  onBusyChange: (busy: boolean) => void;
  actions?: ReactNode;
  onSelectionChange?: (selected: boolean) => void;
}) {
  const t = useTranslations("Editor");
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const altInput = useRef<HTMLInputElement>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [inserted, setInserted] = useState(false);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<"unauthorized" | "invalidImage" | "imageTooLarge" | "uploadUnavailable" | "invalidAlt" | "imageLimit" | "stagingTooLarge" | null>(null);
  async function upload() {
    const description = imageAltSchema.safeParse(alt);
    const file = fileInput.current?.files?.[0];
    if (!description.success) { setError("invalidAlt"); altInput.current?.focus(); return; }
    if (!file || (!projectId && !imageStaging)) { setError("invalidImage"); return; }
    if (file.size > IMAGE_LIMITS.sourceBytes) { setError("imageTooLarge"); return; }
    setBusy(true); onBusyChange(true); setError(null);
    try {
      if (imageStaging) {
        const staged = imageStaging.stage(file);
        if (!staged.success) { setError(staged.error); return; }
        if (!onInsert(staged.id, description.data)) {
          imageStaging.discard(staged.id); setError("imageLimit"); return;
        }
      } else {
        const uploaded = await uploadProjectImage(projectId ?? "", file, taskId, commentId);
        if (!uploaded.success) { setError(uploaded.error); return; }
        if (!onInsert(uploaded.assetId, description.data)) { setError("imageLimit"); return; }
      }
      setAlt("");
      setSelectedName(null);
      onSelectionChange?.(false);
      setInserted(true);
      setOpen(false);
      if (fileInput.current) fileInput.current.value = "";
    } catch { setError("uploadUnavailable"); }
    finally { setBusy(false); onBusyChange(false); }
  }
  if (!projectId && !imageStaging) return <p className="border-t border-border/15 bg-surface-warm/40 px-5 py-3 text-sm text-foreground/75">{t("saveBeforeImage")}</p>;
  return <>
    {onSelectionChange && <div className="flex flex-wrap items-center gap-2 border-t border-border/15 px-3 py-2">
      <button type="button" className="project-secondary-action" aria-expanded={open} aria-controls={id + "-attachment"}
        disabled={disabled || busy} onClick={() => setOpen(!open)}>{t("attachImage")}</button>
      {selectedName && !open && <span className="text-sm wrap-anywhere">{selectedName}</span>}
      {actions}
      <span role="status" className="sr-only">{inserted && !open ? t("imageUploaded") : ""}</span>
    </div>}
    <div id={id + "-attachment"} hidden={Boolean(onSelectionChange && !open)} role="group" aria-label={t("image")} className="space-y-3 border-t border-border/15 bg-surface-warm/40 p-5">
      <p id={id + "-help"} className="text-sm">{t(imageStaging ? "stagedImageHelp" : "imageHelp")}</p>
      <label htmlFor={id + "-file"} className="block">{t("imageFile")}</label>
      <input ref={fileInput} id={id + "-file"} type="file" accept={PROJECT_IMAGE_ACCEPT} disabled={disabled || busy} onChange={(event) => {
        const selected = event.currentTarget.files?.[0]?.name ?? null;
        setSelectedName(selected);
        if (onSelectionChange) setInserted(false);
        onSelectionChange?.(selected !== null);
        setError(null);
      }} aria-describedby={id + "-help"} className="block min-h-11 w-full max-w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-border/45 file:px-3 file:py-2" />
      <label htmlFor={id + "-alt"} className="block">{t("imageAlt")}</label>
      <input ref={altInput} id={id + "-alt"} value={alt} maxLength={300} aria-required="true" aria-invalid={error === "invalidAlt"} aria-describedby={id + "-alt-help" + (error === "invalidAlt" ? " " + id + "-error" : "")} disabled={disabled || busy}
        onChange={(event) => { setAlt(event.target.value); if (error === "invalidAlt") setError(null); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!event.repeat && !busy && !disabled) void upload();
          }
        }} className="min-h-11 w-full rounded-lg border border-border/60 px-3 py-2" />
      <p id={id + "-alt-help"} className="text-sm">{t("imageAltHelp")}</p>
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={() => void upload()} disabled={disabled || busy} className="project-secondary-action">{t(busy ? "uploading" : imageStaging ? "stageImage" : "insertImage")}</button>
        {selectedName && <button type="button" disabled={disabled || busy} className="project-secondary-action" onClick={() => {
          if (fileInput.current) fileInput.current.value = "";
          setSelectedName(null); setError(null);
          onSelectionChange?.(false);
        }}>{t("clearImageSelection")}</button>}
      </div>
      <p role="status" className="text-sm">{busy ? t("uploading") : selectedName ? t("imageSelected", { name: selectedName }) : inserted ? t(imageStaging ? "imageStaged" : "imageUploaded") : t(imageStaging ? "stagedImages" : "saveImages")}</p>
      {error && <p id={id + "-error"} role="alert">{t(error)}</p>}
    </div>
  </>;
}
