"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { mutateTaskComment } from "../../app/projects/comment-actions";
import { commentPageSchema, type CommentMutation, type CommentPage, type CommentResult, type TaskComment } from "../../lib/tasks/comment-schemas";
import { RichTextContent } from "../projects/rich-text-content";
import { TaskCommentForm } from "./task-comment-form";

export type TaskCommentsManagement = { projectId: string; onBusyChange: (busy: boolean) => void };
type Cursor = NonNullable<CommentPage["next"]>;

async function readComments(taskId: string, preview: boolean, before?: Cursor, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (preview) search.set("preview", "1");
  if (before) {
    search.set("before", before.created_at);
    search.set("beforeId", before.id);
  }
  const response = await fetch(`/task-comments/${taskId}?${search}`, { signal });
  if (!response.ok) throw new Error("Unable to read comments.");
  const data: unknown = await response.json();
  return commentPageSchema.parse(data);
}

export function TaskComments({ taskId, preview = false, management, onCountChange }: {
  taskId: string; preview?: boolean; management?: TaskCommentsManagement; onCountChange: () => void;
}) {
  const t = useTranslations("TaskComments");
  const format = useFormatter();
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<CommentPage | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderFailed, setOlderFailed] = useState(false);
  const [draft, setDraft] = useState(() => ({ id: crypto.randomUUID(), afterPost: false }));
  const [editor, setEditor] = useState<TaskComment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Exclude<CommentResult, "ok"> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void readComments(taskId, preview, undefined, controller.signal).then((result) => {
      if (!controller.signal.aborted) setPage(result);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadFailed(true);
    });
    return () => controller.abort();
  }, [taskId, preview, attempt]);

  function reload() {
    setPage(null);
    setLoadFailed(false);
    setOlderFailed(false);
    setAttempt((value) => value + 1);
  }

  async function loadOlder() {
    if (!page?.next || loadingOlder) return;
    setOlderFailed(false);
    setLoadingOlder(true);
    try {
      const older = await readComments(taskId, preview, page.next);
      setPage({ comments: [...older.comments, ...page.comments], next: older.next });
    } catch {
      setOlderFailed(true);
    } finally {
      setLoadingOlder(false);
    }
  }

  function closeEditor() {
    setEditor(null);
    setConfirmDelete(null);
    setError(null);
    heading.current?.focus();
  }

  async function mutate(change: CommentMutation) {
    if (!management || pending || uploading || loadingOlder) return;
    setError(null);
    setPending(true);
    management.onBusyChange(true);
    try {
      const status = await mutateTaskComment(change);
      if (status === "ok") {
        if (change.operation === "create") setDraft({ id: crypto.randomUUID(), afterPost: true });
        else closeEditor();
        if (change.operation !== "edit") onCountChange();
        reload();
      } else {
        setError(status);
      }
    } catch {
      setError("unavailable");
    } finally {
      setPending(false);
      management.onBusyChange(false);
    }
  }

  function handleUploadBusy(busy: boolean) {
    setUploading(busy);
    management?.onBusyChange(busy);
  }

  const available = Boolean(management && page && !pending && !uploading && !loadingOlder && !editor && !confirmDelete);
  return <div data-task-comments="" className="min-w-0 space-y-5">
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 ref={heading} id={headingId} tabIndex={-1} className="text-2xl">{t("history")}</h3>
      {loadFailed ? <div>
        <p role="alert">{t("loadFailed")}</p>
        <button type="button" className="project-secondary-action mt-2" onClick={reload}>{t("retry")}</button>
      </div> : !page ? <p role="status">{t("loading")}</p> : <>
        {page.next && <button type="button" className="project-secondary-action"
          disabled={loadingOlder || pending || uploading || Boolean(editor || confirmDelete)} onClick={() => void loadOlder()}>
          {t(loadingOlder ? "loading" : "loadOlder")}
        </button>}
        {olderFailed && <p role="alert">{t("loadFailed")}</p>}
        {page.comments.length === 0 ? <p>{t("empty")}</p> : <ol className="divide-y divide-border/20">
          {page.comments.map((comment) => <li key={comment.id} className="min-w-0 space-y-2 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/80">
                <time dateTime={comment.created_at}>{format.dateTime(new Date(comment.created_at), { dateStyle: "medium", timeStyle: "short" })}</time>
                {comment.updated_at !== comment.created_at && <span>{t("edited")}</span>}
                {preview && <span>{t(comment.is_public ? "public" : "private")}</span>}
              </div>
              {management && editor?.id !== comment.id && confirmDelete !== comment.id && <div className="ms-auto flex shrink-0 gap-1">
                <button type="button" className="editor-tool" disabled={!available} aria-label={t("edit")} title={t("edit")} onClick={() => setEditor(comment)}>
                  <svg aria-hidden="true" focusable="false" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 5 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20Z" />
                  </svg>
                </button>
                <button type="button" className="editor-tool" disabled={!available} aria-label={t("delete")} title={t("delete")} onClick={() => setConfirmDelete(comment.id)}>
                  <svg aria-hidden="true" focusable="false" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
                  </svg>
                </button>
              </div>}
            </div>
            {editor?.id !== comment.id && <RichTextContent document={comment.body} preview={preview} />}
            {management && confirmDelete === comment.id && <div className="space-y-2">
              <p role="status">{t("deletePrompt")}</p>
              <div className="flex flex-wrap gap-2">
                <button autoFocus type="button" className="project-secondary-action" disabled={pending} onClick={closeEditor}>{t("cancel")}</button>
                <button type="button" className="project-primary-action" disabled={pending} onClick={() => void mutate({
                  operation: "delete", projectId: management.projectId, taskId, commentId: comment.id, version: comment.updated_at,
                })}>{t(pending ? "deleting" : "delete")}</button>
              </div>
            </div>}
            {management && editor?.id === comment.id && <TaskCommentForm projectId={management.projectId} taskId={taskId}
              commentId={comment.id} comment={editor} pending={pending} onBusyChange={handleUploadBusy}
              onCancel={closeEditor} onSave={(body, isPublic) => void mutate({
                operation: "edit", projectId: management.projectId, taskId, commentId: comment.id, version: comment.updated_at, body, isPublic,
              })} />}
          </li>)}
        </ol>}
      </>}
    </section>
    {error && <div>
      <p role="alert">{t(error)}</p>
      {error === "stale" && <button type="button" className="project-secondary-action mt-2"
        onClick={() => { closeEditor(); reload(); }}>{t("reload")}</button>}
    </div>}
    {management && <div hidden={Boolean(editor || confirmDelete)} className="border-t border-border/20 pt-4">
      <TaskCommentForm key={draft.id} projectId={management.projectId} taskId={taskId} commentId={draft.id}
        pending={pending || loadingOlder} autoFocus={draft.afterPost} onBusyChange={handleUploadBusy}
        onSave={(body, isPublic) => void mutate({
          operation: "create", projectId: management.projectId, taskId, commentId: draft.id, body, isPublic,
        })} />
    </div>}
  </div>;
}
