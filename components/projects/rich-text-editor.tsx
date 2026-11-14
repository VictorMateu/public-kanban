"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { EditorImageUpload } from "./editor-image-upload";
import { projectEditorExtensions } from "../../lib/projects/editor-extensions";
import { richTextDocumentSchema, safeLinkSchema, type RichTextDocument } from "../../lib/projects/rich-text";


export function RichTextEditor({ label, initial, disabled, projectId, onBusyChange, onChange }: {
  label: string; initial: RichTextDocument; disabled: boolean;
  projectId?: string; onBusyChange: (busy: boolean) => void;
  onChange: (value: string, valid: boolean) => void;
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
    setInvalid(!parsed.success);
    onChange(JSON.stringify(document), parsed.success);
  };
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: projectEditorExtensions,
    content: initial,
    editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-labelledby": id + "-label", "aria-describedby": id + "-help", spellcheck: "true", class: "rich-text min-h-44 p-4 outline-none" } },
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
  const button = "min-h-11 rounded-lg border border-border/45 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 aria-pressed:bg-accent";
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
      <p id={id + "-label"} className="mb-2">{label}</p>
      <fieldset disabled={disabled || uploading} className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
        <legend className="sr-only">{label}</legend>
        <div role="group" aria-label={t("formatting")} className="flex flex-wrap gap-1 border-b border-border/25 p-2">
          {toggles.map((toggle) => <button key={toggle.key} type="button" className={button} aria-pressed={toggle.pressed} onMouseDown={(event) => event.preventDefault()} onClick={toggle.run}>{t(toggle.key)}</button>)}
          <button type="button" className={button} disabled={!editor} aria-expanded={linkOpen} aria-controls={id + "-link"} onClick={() => { setLinkOpen(!linkOpen); setLinkInvalid(false); }}>{t("link")}</button>
          <button type="button" className={button} disabled={!editor || !active?.link} onClick={() => editor?.chain().focus().unsetLink().run()}>{t("removeLink")}</button>
          <button type="button" className={button} disabled={!editor} onClick={() => editor?.chain().focus().setHorizontalRule().run()}>{t("divider")}</button>
          <button type="button" className={button} disabled={!active?.undo} onClick={() => editor?.chain().focus().undo().run()}>{t("undo")}</button>
          <button type="button" className={button} disabled={!active?.redo} onClick={() => editor?.chain().focus().redo().run()}>{t("redo")}</button>
        </div>
        {linkOpen && <div id={id + "-link"} className="flex flex-wrap items-end gap-2 border-b border-border/25 p-3">
          <label className="grow" htmlFor={id + "-url"}>{t("linkUrl")}<input autoFocus id={id + "-url"} type="url" value={link} maxLength={2048} aria-invalid={linkInvalid} className="mt-1 block min-h-11 w-full rounded border border-border/60 px-3" onChange={(event) => setLink(event.target.value)} /></label>
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
      <EditorImageUpload projectId={projectId} disabled={disabled || !editor} onBusyChange={(busy) => { setUploading(busy); onBusyChange(busy); }} onInsert={(assetId, alt) => {
        if (!editor) return false;
        const document: unknown = editor.getJSON();
        const parsed = richTextDocumentSchema.safeParse(document);
        if (!parsed.success || !richTextDocumentSchema.safeParse({ ...parsed.data, content: [...parsed.data.content, { type: "image", attrs: { assetId, alt } }] }).success) return false;
        // Image blocks belong at the document root, regardless of the current list/quote selection.
        return editor.chain().focus().insertContentAt(editor.state.doc.content.size, { type: "image", attrs: { assetId, alt } }).run();
      }} />
      <p id={id + "-help"} className="mt-2 text-sm">{t("help")}</p>
      {invalid && <p role="alert" className="mt-2">{t("invalidDocument")}</p>}
    </div>
  );
}
