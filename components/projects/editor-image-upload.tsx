"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PROJECT_IMAGE_ACCEPT, IMAGE_LIMITS, imageAltSchema } from "../../lib/projects/image-input";

import { uploadProjectImage } from "../../lib/projects/image-upload";
import type { ProjectImageStaging } from "../../lib/projects/image-staging";

export function EditorImageUpload({ projectId, taskId, imageStaging, disabled, onInsert, onBusyChange }: {
  projectId?: string; taskId?: string; imageStaging?: ProjectImageStaging; disabled: boolean;
  onInsert: (assetId: string, alt: string) => boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const t = useTranslations("Editor");
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const altInput = useRef<HTMLInputElement>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [inserted, setInserted] = useState(false);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
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
        const uploaded = await uploadProjectImage(projectId ?? "", file, taskId);
        if (!uploaded.success) { setError(uploaded.error); return; }
        if (!onInsert(uploaded.assetId, description.data)) { setError("imageLimit"); return; }
      }
      setAlt("");
      setSelectedName(null);
      setInserted(true);
      if (fileInput.current) fileInput.current.value = "";
    } catch { setError("uploadUnavailable"); }
    finally { setBusy(false); onBusyChange(false); }
  }
  if (!projectId && !imageStaging) return <p className="border-t border-border/15 bg-surface-warm/40 px-5 py-3 text-sm text-foreground/75">{t("saveBeforeImage")}</p>;
  return <div role="group" aria-label={t("image")} className="space-y-3 border-t border-border/15 bg-surface-warm/40 p-5">
    <p id={id + "-help"} className="text-sm">{t(imageStaging ? "stagedImageHelp" : "imageHelp")}</p>
    <label htmlFor={id + "-file"} className="block">{t("imageFile")}</label>
    <input ref={fileInput} id={id + "-file"} type="file" accept={PROJECT_IMAGE_ACCEPT} disabled={disabled || busy} onChange={(event) => { setSelectedName(event.target.files?.[0]?.name ?? null); setError(null); }} aria-describedby={id + "-help"} className="block min-h-11 w-full max-w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-border/45 file:px-3 file:py-2" />
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
      }}>{t("clearImageSelection")}</button>}
    </div>
    <p role="status" className="text-sm">{busy ? t("uploading") : selectedName ? t("imageSelected", { name: selectedName }) : inserted ? t(imageStaging ? "imageStaged" : "imageUploaded") : t(imageStaging ? "stagedImages" : "saveImages")}</p>
    {error && <p id={id + "-error"} role="alert">{t(error)}</p>}
  </div>;
}
