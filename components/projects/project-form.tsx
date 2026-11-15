"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { saveProject, setProjectPublication } from "../../app/projects/actions";
import type { ProjectFormState } from "../../lib/projects/input";
import type { ProjectContentField } from "../../lib/projects/schemas";
import type { RichTextDocument } from "../../lib/projects/rich-text";
import { RichTextEditor } from "./rich-text-editor";

type EditableProject = { id: string; name: string; slug: string; repository_url: string | null; updated_at: string; is_published: boolean };
const control = "mt-2 min-h-11 w-full rounded-2xl border border-border/30 bg-surface px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const actionClass = "project-secondary-action";

export type ProjectFormStatus = { busy: boolean; pending: boolean; canSubmit: boolean };

export function ProjectForm({ project, description, objectives, formId, onStatusChange, disabled = false }: {
  formId: string;
  onStatusChange: (status: ProjectFormStatus) => void;
  disabled?: boolean;
  project: EditableProject | null; description: RichTextDocument; objectives: RichTextDocument;
}) {
  const t = useTranslations("ProjectForm");
  const [state, action, pending] = useActionState(saveProject, {} satisfies ProjectFormState);
  const [uploading, setUploading] = useState({ description: false, objectives: false });
  const busy = uploading.description || uploading.objectives;
  const [content, setContent] = useState({ description: JSON.stringify(description), objectives: JSON.stringify(objectives), descriptionValid: false, objectivesValid: false });
  const canSubmit = !pending && !busy && !disabled && content.descriptionValid && content.objectivesValid;
  useEffect(() => { onStatusChange({ busy: busy || pending, pending, canSubmit }); }, [busy, pending, canSubmit, onStatusChange]);
  const errorFor = (field: ProjectContentField) => state.errors?.[field] ? <p id={field + "-error"} role="alert" className="mt-1 text-sm">{t(state.errors[field])}</p> : null;
  return (
    <form id={formId} action={action} className="space-y-6" aria-label={t(project ? "edit" : "create")}>
      <fieldset disabled={pending || disabled} className="min-w-0 space-y-6">
        <legend className="sr-only">{t("details")}</legend>
        <input type="hidden" name="id" value={project?.id ?? ""} />
        <input type="hidden" name="updated_at" value={project?.updated_at ?? ""} />
        <div><label htmlFor="project-name">{t("name")}</label><input id="project-name" name="name" defaultValue={project?.name} required className={control} aria-invalid={Boolean(state.errors?.name)} aria-describedby={state.errors?.name ? "name-error" : undefined} />{errorFor("name")}</div>
        <div><label htmlFor="project-slug">{t("slug")}</label><input id="project-slug" name="slug" defaultValue={project?.slug} required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={control} aria-invalid={Boolean(state.errors?.slug)} aria-describedby="slug-help" /><p id="slug-help" className="mt-1 text-sm">{t("slugHelp")}</p>{errorFor("slug")}</div>
        <input type="hidden" name="description_content" value={content.description} />
        <RichTextEditor projectId={project?.id} onBusyChange={(value) => setUploading((previous) => ({ ...previous, description: value }))} label={t("description")} initial={description} disabled={pending || disabled} onChange={(value, valid) => setContent((previous) => ({ ...previous, description: value, descriptionValid: valid }))} />
        {errorFor("description_content")}
        <input type="hidden" name="objectives_content" value={content.objectives} />
        <RichTextEditor projectId={project?.id} onBusyChange={(value) => setUploading((previous) => ({ ...previous, objectives: value }))} label={t("objectives")} initial={objectives} disabled={pending || disabled} onChange={(value, valid) => setContent((previous) => ({ ...previous, objectives: value, objectivesValid: valid }))} />
        {errorFor("objectives_content")}
        <div><label htmlFor="repository-url">{t("repository")}</label><input id="repository-url" name="repository_url" type="url" maxLength={2048} defaultValue={project?.repository_url ?? ""} className={control} aria-invalid={Boolean(state.errors?.repository_url)} aria-describedby="repository-help" /><p id="repository-help" className="mt-1 text-sm">{t("repositoryHelp")}</p>{errorFor("repository_url")}</div>
        {state.error && <p role="alert">{t(state.error)}</p>}
      </fieldset>
    </form>
  );
}

export function PublicationForm({ project, disabled = false, onBusyChange }: { project: EditableProject; disabled?: boolean; onBusyChange: (busy: boolean) => void }) {
  const t = useTranslations("ProjectForm");
  const [state, action, pending] = useActionState(setProjectPublication, {} satisfies ProjectFormState);
  useEffect(() => { onBusyChange(pending); }, [pending, onBusyChange]);
  return <form action={action} className="mt-8 space-y-3 border-t border-border/30 pt-6">
    <input type="hidden" name="id" value={project.id} /><input type="hidden" name="updated_at" value={project.updated_at} />
    <input type="hidden" name="is_published" value={project.is_published ? "false" : "true"} />
    <p>{t(project.is_published ? "publishedHelp" : "draftHelp")}</p>
    {state.error && <p role="alert">{t(state.error)}</p>}
    <div className="flex justify-end"><button type="submit" disabled={pending || disabled} className={actionClass}>{t(pending ? "saving" : project.is_published ? "hide" : "publish")}</button></div>
  </form>;
}
