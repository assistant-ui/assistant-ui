import type { InlineNode } from "./ast";

export const plainText = (nodes: InlineNode[]): string =>
  nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "codeSpan":
        case "mathInline":
        case "htmlInline":
          return node.value;
        case "image":
          return node.alt;
        case "softBreak":
        case "hardBreak":
          return "\n";
        default:
          return plainText(node.children);
      }
    })
    .join("");
