"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { optionalRichText, plainTextDocument } from "../../lib/projects/rich-text";
import type { TaskComment } from "../../lib/tasks/comment-schemas";
import { RichTextEditor } from "../projects/rich-text-editor";

export function TaskCommentForm({ projectId, taskId, commentId, comment, pending, autoFocus, onBusyChange, onCancel, onSave }: {
  projectId: string;
  taskId: string;
  commentId: string;
  comment?: TaskComment;
  pending: boolean;
  autoFocus?: boolean;
  onBusyChange: (busy: boolean) => void;
  onCancel?: () => void;
  onSave: (body: string, isPublic: boolean) => void;
}) {
  const t = useTranslations("TaskComments");
  const visibilityHelpId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [body, setBody] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(comment?.is_public ?? false);
  const [uploading, setUploading] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);
  const busy = pending || uploading;
  const canSubmit = !busy && !imageSelected && body !== null;
  useEffect(() => { if (comment) heading.current?.focus(); }, [comment]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit && body !== null) onSave(body, isPublic);
  }

  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey) || event.shiftKey || event.altKey ||
      event.nativeEvent.isComposing || !(event.target instanceof HTMLElement) || !event.target.closest('[contenteditable="true"]')) return;
    event.preventDefault();
    if (!event.repeat && canSubmit) event.currentTarget.requestSubmit();
  }

  return <form onSubmit={submit} onKeyDownCapture={handleShortcut} className="min-w-0 space-y-3">
    {comment && <h4 ref={heading} tabIndex={-1} className="text-2xl">{t("edit")}</h4>}
    <RichTextEditor label={t(comment ? "content" : "add")} initial={comment?.body ?? plainTextDocument(null)}
      projectId={projectId} taskId={taskId} commentId={commentId} disabled={pending}
      autoFocus={autoFocus} onImageSelectionChange={setImageSelected}
      attachmentActions={<>
        <label className="ms-auto inline-flex min-h-11 min-w-0 cursor-pointer flex-wrap items-center gap-3 has-[:disabled]:cursor-default">
          <span>{t("visibility")}</span>
          <input type="checkbox" role="switch" className="sr-only" aria-describedby={isPublic ? visibilityHelpId : undefined}
            disabled={busy} checked={isPublic} onChange={(event) => setIsPublic(event.currentTarget.checked)} />
          <span aria-hidden="true" className="project-visibility-switch"><span className="project-visibility-thumb" /></span>
          <span aria-hidden="true">{t(isPublic ? "public" : "private")}</span>
        </label>
        {isPublic && <p id={visibilityHelpId} className="basis-full text-sm">{t("publicHelp")}</p>}
      </>}
      onBusyChange={(value) => { setUploading(value); onBusyChange(value); }}
      onChange={(value, valid, document) => setBody(valid && document && optionalRichText(document) ? value : null)} />
    {imageSelected && <p className="text-sm">{t("imagePending")}</p>}
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="me-auto text-sm text-foreground/80">{t("shortcut")}</span>
      {onCancel && <button type="button" className="project-secondary-action" disabled={busy} onClick={onCancel}>{t("cancel")}</button>}
      <button type="submit" className="project-primary-action" disabled={!canSubmit} aria-keyshortcuts="Control+Enter Meta+Enter">
        {t(pending ? "saving" : comment ? "save" : "post")}
      </button>
    </div>
  </form>;
}
