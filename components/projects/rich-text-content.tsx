import { Fragment, type ReactNode } from "react";
import type { RichTextDocument, RichTextInline, RichTextList, RichTextBlock } from "../../lib/projects/rich-text";
import { projectImageUrl } from "../../lib/projects/rich-text";

function inline(nodes: RichTextInline[] = []): ReactNode {
  return nodes.map((node, index) => {
    if (node.type === "hardBreak") return <br key={index} />;
    let content: ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold": content = <strong>{content}</strong>; break;
        case "italic": content = <em>{content}</em>; break;
        case "strike": content = <s>{content}</s>; break;
        case "code": content = <code>{content}</code>; break;
        case "link": content = <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer nofollow">{content}</a>; break;
      }
    }
    return <Fragment key={index}>{content}</Fragment>;
  });
}

function list(node: RichTextList): ReactNode {
  const items = node.content.map((item, index) => (
    <li key={index}>{item.content.map((child, childIndex) => (
      <Fragment key={childIndex}>{child.type === "paragraph" ? <p>{inline(child.content)}</p> : list(child)}</Fragment>
    ))}</li>
  ));
  return node.type === "bulletList" ? <ul>{items}</ul> : <ol start={node.attrs?.start ?? 1}>{items}</ol>;
}

function block(node: RichTextBlock, preview: boolean): ReactNode {
  switch (node.type) {
    case "paragraph": return <p>{inline(node.content)}</p>;
    case "heading": return node.attrs.level === 2 ? <h2>{inline(node.content)}</h2> : <h3>{inline(node.content)}</h3>;
    case "blockquote": return <blockquote>{node.content.map((child, index) => <p key={index}>{inline(child.content)}</p>)}</blockquote>;
    case "codeBlock": return <pre><code>{node.content?.map((child) => child.text).join("")}</code></pre>;
    case "bulletList": case "orderedList": return list(node);
    case "horizontalRule": return <hr />;
    case "image": return (
      // The controlled route checks visibility on each request; Next image caching would defeat hiding.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={projectImageUrl(node.attrs.assetId, preview)} alt={node.attrs.alt} loading="lazy" decoding="async" />
    );
  }
}

export function RichTextContent({ document, preview = false }: { document: RichTextDocument; preview?: boolean }) {
  return <div className="rich-text">{document.content.map((node, index) => <Fragment key={index}>{block(node, preview)}</Fragment>)}</div>;
}
