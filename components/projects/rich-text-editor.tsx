"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { EditorImageUpload } from "./editor-image-upload";
import { EditorToolButton } from "./editor-tool-button";
import type { ProjectImageStaging } from "../../lib/projects/image-staging";
import { projectEditorExtensions, projectEditorExtensionsWithPreviews } from "../../lib/projects/editor-extensions";
import { richTextDocumentSchema, richTextToPlainText, safeLinkSchema, type RichTextDocument } from "../../lib/projects/rich-text";


export function RichTextEditor({ label, initial, disabled, projectId, taskId, commentId, imageStaging, maxTextLength, autoFocus, attachmentActions, onImageSelectionChange, onBusyChange, onChange }: {
  label: string; initial: RichTextDocument; disabled: boolean;
  projectId?: string; taskId?: string; commentId?: string; imageStaging?: ProjectImageStaging; onBusyChange: (busy: boolean) => void;
  maxTextLength?: number;
  autoFocus?: boolean;
  attachmentActions?: ReactNode;
  onImageSelectionChange?: (selected: boolean) => void;
  onChange: (value: string, valid: boolean, document: RichTextDocument | null) => void;
}) {
  const t = useTranslations("Editor");
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const report = (document: unknown) => {
    const parsed = richTextDocumentSchema.safeParse(document);
    const valid = parsed.success && (maxTextLength === undefined || [...richTextToPlainText(parsed.data)].length <= maxTextLength);
    setInvalid(!valid);
    onChange(JSON.stringify(document), valid, parsed.success ? parsed.data : null);
  };
  const extensions = useMemo(() => imageStaging ? projectEditorExtensionsWithPreviews(imageStaging.previewUrl) : projectEditorExtensions, [imageStaging]);
  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ?? false,
    editable: !disabled,
    extensions,
    content: initial,
    editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-labelledby": id + "-label", "aria-describedby": id + "-help", "data-placeholder": t("placeholder"), spellcheck: "true", class: "rich-text editor-writing-area outline-none" } },
    onCreate: ({ editor: created }) => report(created.getJSON()),
    onUpdate: ({ editor: updated }) => report(updated.getJSON()),
  });
  useEffect(() => { editor?.setEditable(!disabled && !uploading); }, [editor, disabled, uploading]);
  const active = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current?.isActive("bold") ?? false, italic: current?.isActive("italic") ?? false,
    strike: current?.isActive("strike") ?? false, code: current?.isActive("code") ?? false,
    heading2: current?.isActive("heading", { level: 2 }) ?? false,
    heading3: current?.isActive("heading", { level: 3 }) ?? false,
    bulletList: current?.isActive("bulletList") ?? false, orderedList: current?.isActive("orderedList") ?? false,
    blockquote: current?.isActive("blockquote") ?? false, codeBlock: current?.isActive("codeBlock") ?? false,
    link: current?.isActive("link") ?? false,
    undo: current?.can().undo() ?? false, redo: current?.can().redo() ?? false,
  }) });
  const button = "project-secondary-action";
  const compact = Boolean(onImageSelectionChange);
  const toggles = editor && active ? [
    { key: "bold", pressed: active.bold, run: () => editor.chain().focus().toggleBold().run() },
    { key: "italic", pressed: active.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { key: "strike", pressed: active.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { key: "code", pressed: active.code, run: () => editor.chain().focus().toggleCode().run() },
    { key: "heading2", pressed: active.heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: "heading3", pressed: active.heading3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: "bulletList", pressed: active.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { key: "orderedList", pressed: active.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    { key: "blockquote", pressed: active.blockquote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { key: "codeBlock", pressed: active.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
  ] as const : [];
  return (
    <div>
      <p id={id + "-label"} className="mb-3 text-lg">{label}</p>
      <div className="editor-shell" data-compact={compact ? "" : undefined}>
        <fieldset disabled={disabled || uploading} className="min-w-0">
          <legend className="sr-only">{label}</legend>
          <div role="group" aria-label={t("formatting")} className="editor-toolbar">
            {[toggles.slice(0, 4), toggles.slice(4, 6), toggles.slice(6, 8), toggles.slice(8)].map((group, index) => <div key={index} className="editor-tool-group">
              {group.map((toggle) => <EditorToolButton key={toggle.key} tool={toggle.key} label={t(toggle.key)} aria-pressed={toggle.pressed} onMouseDown={(event) => event.preventDefault()} onClick={toggle.run} />)}
            </div>)}
            <div className="editor-tool-group">
              <EditorToolButton tool="link" label={t("link")} disabled={!editor} aria-expanded={linkOpen} aria-controls={id + "-link"} onClick={() => { setLinkOpen(!linkOpen); setLinkInvalid(false); }} />
              <EditorToolButton tool="removeLink" label={t("removeLink")} disabled={!editor || !active?.link} onClick={() => editor?.chain().focus().unsetLink().run()} />
              <EditorToolButton tool="divider" label={t("divider")} disabled={!editor} onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
            </div>
            <div className="editor-tool-group sm:ml-auto">
              <EditorToolButton tool="undo" label={t("undo")} disabled={!active?.undo} onClick={() => editor?.chain().focus().undo().run()} />
              <EditorToolButton tool="redo" label={t("redo")} disabled={!active?.redo} onClick={() => editor?.chain().focus().redo().run()} />
            </div>
          </div>
          {linkOpen && <div id={id + "-link"} className="flex flex-wrap items-end justify-end gap-2 border-b border-border/15 bg-surface-warm/35 p-4">
            <label className="min-w-0 basis-full sm:grow sm:basis-auto" htmlFor={id + "-url"}>{t("linkUrl")}<input autoFocus id={id + "-url"} type="url" value={link} maxLength={2048} aria-invalid={linkInvalid} className="mt-1 block min-h-11 w-full rounded-xl border border-border/35 bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" onChange={(event) => setLink(event.target.value)} /></label>
            <button type="button" className={button} onClick={() => {
              const parsed = safeLinkSchema.safeParse(link);
              if (!parsed.success) { setLinkInvalid(true); return; }
              editor?.chain().focus().extendMarkRange("link").setLink({ href: parsed.data }).run();
              setLinkOpen(false);
            }}>{t("applyLink")}</button>
            <button type="button" className={button} onClick={() => { setLinkOpen(false); editor?.commands.focus(); }}>{t("cancel")}</button>
            {linkInvalid && <p role="alert" className="w-full">{t("invalidLink")}</p>}
          </div>}
          {!editor && <p role="status" className="p-4">{t("loading")}</p>}
          <EditorContent editor={editor} />
        </fieldset>
        <EditorImageUpload projectId={projectId} taskId={taskId} commentId={commentId} imageStaging={imageStaging}
          disabled={disabled || !editor} actions={attachmentActions} onSelectionChange={onImageSelectionChange}
          onBusyChange={(busy) => { setUploading(busy); onBusyChange(busy); }} onInsert={(assetId, alt) => {
          if (!editor) return false;
          const document: unknown = editor.getJSON();
          const parsed = richTextDocumentSchema.safeParse(document);
          if (!parsed.success || !richTextDocumentSchema.safeParse({ ...parsed.data, content: [...parsed.data.content, { type: "image", attrs: { assetId, alt } }] }).success) return false;
          // Image blocks belong at the document root, regardless of the current list/quote selection.
          return editor.chain().focus().insertContentAt(editor.state.doc.content.size, { type: "image", attrs: { assetId, alt } }).run();
        }} />
      </div>
      <p id={id + "-help"} className="mt-3 text-sm leading-relaxed text-foreground/75">{t("help")}</p>
      {invalid && <p role="alert" className="mt-2">{t("invalidDocument")}</p>}
    </div>
  );
}
