import type { BlockNode, InlineNode, ListItemNode } from "../ast";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      default:
        return "&quot;";
    }
  });

const inlineHtml = (nodes: InlineNode[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "codeSpan":
          return node.type === "text"
            ? escapeHtml(node.value)
            : `<code>${escapeHtml(node.value)}</code>`;
        case "emphasis":
          return `<em>${inlineHtml(node.children)}</em>`;
        case "strong":
          return `<strong>${inlineHtml(node.children)}</strong>`;
        case "strikethrough":
          return `<s>${inlineHtml(node.children)}</s>`;
        case "link":
          return `<a href="${escapeHtml(node.url)}"${node.title === undefined ? "" : ` title="${escapeHtml(node.title)}"`}>${inlineHtml(node.children)}</a>`;
        case "image":
          return `<img src="${escapeHtml(node.url)}" alt="${escapeHtml(node.alt)}"${node.title === undefined ? "" : ` title="${escapeHtml(node.title)}"`} />`;
        case "htmlInline":
          return node.value;
        case "hardBreak":
          return "<br />\n";
        case "softBreak":
          return "\n";
      }
    })
    .join("");

const listItemHtml = (item: ListItemNode, tight: boolean): string => {
  if (!tight) {
    return `<li>${item.children.length ? `\n${toHtml(item.children)}` : ""}</li>\n`;
  }
  const content = item.children
    .map((child, index) => {
      if (child.type === "paragraph") {
        return `${inlineHtml(child.children)}${index < item.children.length - 1 ? "\n" : ""}`;
      }
      return toHtml([child]);
    })
    .join("");
  return `<li>${item.children[0]?.type === "paragraph" || !item.children.length ? "" : "\n"}${content}</li>\n`;
};

export const toHtml = (blocks: BlockNode[]): string =>
  blocks
    .map((node) => {
      switch (node.type) {
        case "paragraph":
          return `<p>${inlineHtml(node.children)}</p>\n`;
        case "heading":
          return `<h${node.depth}>${inlineHtml(node.children)}</h${node.depth}>\n`;
        case "thematicBreak":
          return "<hr />\n";
        case "blockquote":
          return `<blockquote>${node.children.length ? `\n${toHtml(node.children)}` : ""}</blockquote>\n`;
        case "list": {
          const tag = node.ordered ? "ol" : "ul";
          const start =
            node.ordered && node.start !== 1 ? ` start="${node.start}"` : "";
          return `<${tag}${start}>\n${node.children.map((item) => listItemHtml(item, node.tight)).join("")}</${tag}>\n`;
        }
        case "codeBlock":
          return `<pre><code${node.lang === undefined ? "" : ` class="language-${escapeHtml(node.lang)}"`}>${escapeHtml(node.value)}</code></pre>\n`;
        case "htmlBlock":
          return node.value;
        case "table":
          throw new Error("CommonMark does not contain tables");
      }
    })
    .join("");
