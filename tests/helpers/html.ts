import { parse, parseFragment, serialize, type DefaultTreeAdapterTypes } from "parse5";

type HtmlNode = DefaultTreeAdapterTypes.Node;
const payloadElements = new Set(["script", "style", "template"]);

function omitPayloads(node: HtmlNode): void {
  if (!("childNodes" in node)) return;
  node.childNodes = node.childNodes.filter(child =>
    child.nodeName !== "#comment" && !("tagName" in child && payloadElements.has(child.tagName)),
  );
  for (const child of node.childNodes) omitPayloads(child);
}

export function serverMarkup(html: string): string {
  const document = parse(html);
  omitPayloads(document);
  return serialize(document);
}

function nodeText(node: HtmlNode): string {
  if ("tagName" in node && (
    payloadElements.has(node.tagName) ||
    node.attrs.some(attribute => attribute.name === "aria-hidden" && attribute.value === "true")
  )) return "";
  if (node.nodeName === "#text" && "value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(nodeText).join("") : "";
}

export function htmlText(html: string): string {
  return nodeText(parseFragment(html));
}
