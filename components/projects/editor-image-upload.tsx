"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IMAGE_LIMITS, imageAltSchema } from "../../lib/projects/image-input";

import { uploadProjectImage } from "../../lib/projects/image-upload";
import type { ProjectImageStaging } from "../../lib/projects/image-staging";

export function EditorImageUpload({ projectId, imageStaging, disabled, onInsert, onBusyChange }: {
  projectId?: string; imageStaging?: ProjectImageStaging; disabled: boolean;
  onInsert: (assetId: string, alt: string) => boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const t = useTranslations("Editor");
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"unauthorized" | "invalidImage" | "imageTooLarge" | "uploadUnavailable" | "invalidAlt" | "imageLimit" | "stagingTooLarge" | null>(null);
  async function upload() {
    const description = imageAltSchema.safeParse(alt);
    const file = fileInput.current?.files?.[0];
    if (!description.success) { setError("invalidAlt"); return; }
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
        const uploaded = await uploadProjectImage(projectId ?? "", file);
        if (!uploaded.success) { setError(uploaded.error); return; }
        if (!onInsert(uploaded.assetId, description.data)) { setError("imageLimit"); return; }
      }
      setAlt("");
      if (fileInput.current) fileInput.current.value = "";
    } catch { setError("uploadUnavailable"); }
    finally { setBusy(false); onBusyChange(false); }
  }
  if (!projectId && !imageStaging) return <p className="border-t border-border/15 bg-surface-warm/40 px-5 py-3 text-sm text-foreground/75">{t("saveBeforeImage")}</p>;
  return <div role="group" aria-label={t("image")} className="space-y-3 border-t border-border/15 bg-surface-warm/40 p-5">
    <p id={id + "-help"} className="text-sm">{t(imageStaging ? "stagedImageHelp" : "imageHelp")}</p>
    <label htmlFor={id + "-file"} className="block">{t("imageFile")}</label>
    <input ref={fileInput} id={id + "-file"} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} aria-describedby={id + "-help"} className="block min-h-11 w-full max-w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-border/45 file:px-3 file:py-2" />
    <label htmlFor={id + "-alt"} className="block">{t("imageAlt")}</label>
    <input id={id + "-alt"} value={alt} maxLength={300} disabled={disabled || busy} onChange={(event) => setAlt(event.target.value)} className="min-h-11 w-full rounded-lg border border-border/60 px-3 py-2" />
    <div className="flex justify-end"><button type="button" onClick={() => void upload()} disabled={disabled || busy} className="project-secondary-action">{t(busy ? "uploading" : "insertImage")}</button></div>
    <p role="status" className="text-sm">{busy ? t("uploading") : t(imageStaging ? "stagedImages" : "saveImages")}</p>
    {error && <p role="alert">{t(error)}</p>}
  </div>;
}
