import { Node } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { z } from "zod";
import { projectImageUrl, safeLinkSchema } from "./rich-text.ts";

const imageAttributes = z.object({ assetId: z.uuid(), alt: z.string() });
const ProjectImage = Node.create({
  name: "image", group: "block", atom: true, draggable: true,
  addAttributes() { return { assetId: { default: null }, alt: { default: "" } }; },
  // Do not import external HTML src attributes into persisted image nodes.
  parseHTML() { return []; },
  renderHTML({ node }) {
    const attrs = imageAttributes.safeParse(node.attrs);
    return attrs.success ? ["img", { src: projectImageUrl(attrs.data.assetId, true), alt: attrs.data.alt }] : ["span"];
  },
});
const ParagraphQuote = Node.create({
  name: "blockquote", group: "block", content: "paragraph+", defining: true,
  parseHTML() { return [{ tag: "blockquote" }]; },
  renderHTML() { return ["blockquote", 0]; },
  addCommands() { return { toggleBlockquote: () => ({ commands }) => commands.toggleWrap(this.name) }; },
  addKeyboardShortcuts() { return { "Mod-Shift-b": () => this.editor.commands.toggleBlockquote() }; },
});

const ProjectListItem = Node.create({
  name: "listItem", content: "paragraph (paragraph | bulletList | orderedList)*", defining: true,
  parseHTML() { return [{ tag: "li" }]; },
  renderHTML() { return ["li", 0]; },
  addKeyboardShortcuts() { return {
    Enter: () => this.editor.commands.splitListItem(this.name),
    Tab: () => this.editor.commands.sinkListItem(this.name),
    "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
    "Mod-Shift-7": () => this.editor.commands.toggleOrderedList(),
    "Mod-Shift-8": () => this.editor.commands.toggleBulletList(),
  }; },
});

export const projectEditorExtensions = [StarterKit.configure({
  heading: { levels: [2, 3] }, underline: false, blockquote: false, listItem: false,
  link: { openOnClick: false, autolink: false, isAllowedUri: (url) => safeLinkSchema.safeParse(url).success },
}), ParagraphQuote, ProjectListItem, ProjectImage];
