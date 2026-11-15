"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { saveProject, saveProjectDraft } from "../../app/projects/actions";
import type { ProjectFormState, ProjectFormField } from "../../lib/projects/input";
import type { RichTextDocument } from "../../lib/projects/rich-text";
import { RichTextEditor } from "./rich-text-editor";
import { ProjectImageStaging } from "../../lib/projects/image-staging";
import { prepareCreationImages, type CreationImageSession } from "../../lib/projects/create-project-with-images";
import { uploadProjectImage } from "../../lib/projects/image-upload";
import type { ProjectIdentity } from "../../lib/projects/schemas";

type EditableProject = { id: string; name: string; slug: string; repository_url: string | null; updated_at: string; is_published: boolean };
const control = "mt-2 min-h-11 w-full rounded-2xl border border-border/30 bg-surface px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export type ProjectFormStatus = { busy: boolean; pending: boolean; canSubmit: boolean };

export function ProjectForm({ project, description, objectives, formId, onStatusChange, disabled = false }: {
  formId: string;
  onStatusChange: (status: ProjectFormStatus) => void;
  disabled?: boolean;
  project: EditableProject | null; description: RichTextDocument; objectives: RichTextDocument;
}) {
  const t = useTranslations("ProjectForm");
  const [imageStaging] = useState(() => project ? undefined : new ProjectImageStaging());
  const creation = useRef<CreationImageSession>({});
  const [draft, setDraft] = useState<ProjectIdentity | null>(null);
  useEffect(() => () => imageStaging?.dispose(), [imageStaging]);
  const [state, action, pending] = useActionState(async (previous: ProjectFormState, form: FormData): Promise<ProjectFormState> => {
    if (!imageStaging) return saveProject(previous, form);
    const prepared = await prepareCreationImages(form, imageStaging, creation.current, {
      saveDraft: saveProjectDraft, upload: uploadProjectImage, onDraftSaved: setDraft,
    });
    if (!prepared.success) return prepared.state;
    return saveProject(previous, prepared.form);
  }, {} satisfies ProjectFormState);
  const [details, setDetails] = useState({ name: project?.name ?? "", slug: project?.slug ?? "", repository: project?.repository_url ?? "" });
  const [published, setPublished] = useState(project?.is_published ?? false);
  const [uploading, setUploading] = useState({ description: false, objectives: false });
  const busy = uploading.description || uploading.objectives;
  const [content, setContent] = useState({ description: JSON.stringify(description), objectives: JSON.stringify(objectives), descriptionValid: false, objectivesValid: false });
  const canSubmit = !pending && !busy && !disabled && content.descriptionValid && content.objectivesValid;
  useEffect(() => { onStatusChange({ busy: busy || pending, pending, canSubmit }); }, [busy, pending, canSubmit, onStatusChange]);
  const errorFor = (field: ProjectFormField) => state.errors?.[field] ? <p id={field + "-error"} role="alert" className="mt-1 text-sm">{t(state.errors[field])}</p> : null;
  return (
    <form id={formId} action={action} className="space-y-6" aria-label={t(project ? "edit" : "create")}>
      {draft && !pending && (state.error || state.errors) && <p role="status" className="rounded-2xl border border-border/20 bg-surface-warm/40 p-4">{t("draftRetained")}</p>}
      <fieldset disabled={pending || disabled} className="min-w-0 space-y-6">
        <legend className="sr-only">{t("details")}</legend>
        <input type="hidden" name="id" value={project?.id ?? ""} />
        <input type="hidden" name="updated_at" value={project?.updated_at ?? ""} />
        <div><label htmlFor="project-name">{t("name")}</label><input id="project-name" name="name" value={details.name} onChange={(event) => setDetails((previous) => ({ ...previous, name: event.target.value }))} required className={control} aria-invalid={Boolean(state.errors?.name)} aria-describedby={state.errors?.name ? "name-error" : undefined} />{errorFor("name")}</div>
        <div><label htmlFor="project-slug">{t("slug")}</label><input id="project-slug" name="slug" value={details.slug} onChange={(event) => setDetails((previous) => ({ ...previous, slug: event.target.value }))} required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={control} aria-invalid={Boolean(state.errors?.slug)} aria-describedby="slug-help" /><p id="slug-help" className="mt-1 text-sm">{t("slugHelp")}</p>{errorFor("slug")}</div>
        <input type="hidden" name="description_content" value={content.description} />
        <RichTextEditor projectId={project?.id} imageStaging={imageStaging} onBusyChange={(value) => setUploading((previous) => ({ ...previous, description: value }))} label={t("description")} initial={description} disabled={pending || disabled} onChange={(value, valid) => setContent((previous) => ({ ...previous, description: value, descriptionValid: valid }))} />
        {errorFor("description_content")}
        <input type="hidden" name="objectives_content" value={content.objectives} />
        <RichTextEditor projectId={project?.id} imageStaging={imageStaging} onBusyChange={(value) => setUploading((previous) => ({ ...previous, objectives: value }))} label={t("objectives")} initial={objectives} disabled={pending || disabled} onChange={(value, valid) => setContent((previous) => ({ ...previous, objectives: value, objectivesValid: valid }))} />
        {errorFor("objectives_content")}
        <div><label htmlFor="repository-url">{t("repository")}</label><input id="repository-url" name="repository_url" type="url" maxLength={2048} value={details.repository} onChange={(event) => setDetails((previous) => ({ ...previous, repository: event.target.value }))} className={control} aria-invalid={Boolean(state.errors?.repository_url)} aria-describedby="repository-help" /><p id="repository-help" className="mt-1 text-sm">{t("repositoryHelp")}</p>{errorFor("repository_url")}</div>
        <div className="rounded-2xl border border-border/20 bg-surface-warm/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="project-published">{t("visibility")}</label>
            <button id="project-published" type="button" role="switch" aria-checked={published} aria-describedby="project-visibility-help" aria-invalid={Boolean(state.errors?.is_published)} onClick={() => setPublished(!published)} className="project-visibility-switch" data-state={published ? "checked" : "unchecked"}>
              <span aria-hidden="true" className="project-visibility-thumb" />
            </button>
          </div>
          <input type="hidden" name="is_published" value={String(published)} />
          <p id="project-visibility-help" className="mt-2 text-sm text-foreground/80">{t(published ? "publishOnSave" : "draftOnSave")}</p>
          {errorFor("is_published")}
        </div>
        {state.error && <p role="alert">{t(state.error)}</p>}
      </fieldset>
    </form>
  );
}
