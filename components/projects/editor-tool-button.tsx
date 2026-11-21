import type { ButtonHTMLAttributes } from "react";

type EditorTool = "bold" | "italic" | "strike" | "code" | "heading2" | "heading3" | "bulletList" | "orderedList" | "blockquote" | "codeBlock" | "link" | "removeLink" | "divider" | "undo" | "redo";
const paths = {
  bold: "M7 4h6a4 4 0 0 1 0 8H7m0-8v16h7a4 4 0 0 0 0-8H7",
  italic: "M10 4h8M6 20h8M15 4 9 20",
  strike: "M17 6c-2-3-9-3-10 1-.5 2 1 3 3 4m-3 5c1 4 10 4 10 0M4 12h16",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16",
  bulletList: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  orderedList: "M10 6h10M10 12h10M10 18h10M3 4h1v5M2 12c0-2 4-2 4 0 0 1-4 3-4 4h4",
  blockquote: "M10 5C5 5 3 8 3 12v7h7v-7H4m17-7c-5 0-7 3-7 7v7h7v-7h-6",
  link: "m10 13 4-4m-7 6-2 2a3.5 3.5 0 0 0 5 5l4-4a3.5 3.5 0 0 0 0-5m-4-2a3.5 3.5 0 0 1 0-5l4-4a3.5 3.5 0 0 1 5 5l-2 2",
  removeLink: "M8 15 5 18a3 3 0 0 0 4 4l4-4m-2-7 4-4a3 3 0 0 1 4 4l-2 2M3 3l18 18",
  divider: "M4 12h16M12 4v3M12 17v3",
  undo: "m8 5-5 5 5 5M3 10h10a7 7 0 0 1 7 7v2",
  redo: "m16 5 5 5-5 5m5-5H11a7 7 0 0 0-7 7v2",
} satisfies Record<Exclude<EditorTool, "heading2" | "heading3" | "codeBlock">, string>;

function EditorToolIcon({ tool }: { tool: EditorTool }) {
  if (tool === "heading2" || tool === "heading3" || tool === "codeBlock") {
    return <span aria-hidden="true" className="font-serif text-lg font-semibold leading-none">{tool === "heading2" ? <>H<sub className="text-xs">2</sub></> : tool === "heading3" ? <>H<sub className="text-xs">3</sub></> : "{ }"}</span>;
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="size-5"><path d={paths[tool]} /></svg>;
}

export function EditorToolButton({ tool, label, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "className" | "title" | "aria-label"> & { tool: EditorTool; label: string }) {
  return <button type="button" className="editor-tool" title={label} aria-label={label} {...props}><EditorToolIcon tool={tool} /></button>;
}
