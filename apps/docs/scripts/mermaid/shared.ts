import { createHash } from "node:crypto";
import { fromMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";

export const RENDER_VERSION = "tldraw-5.1.1-r1";

export function renderMarker(version = RENDER_VERSION): string {
  return `<!-- tldraw-mermaid render:${version} -->`;
}

export const DIAGRAM_DIR = "diagrams";
export const DIAGRAM_PUBLIC_PREFIX = `/${DIAGRAM_DIR}`;

export function hashMermaid(source: string): string {
  const normalized = source.replace(/\r\n/g, "\n").trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export function extractMermaidBlocks(markdown: string): string[] {
  const tree = fromMarkdown(markdown);
  const blocks: string[] = [];
  visit(tree, "code", (node) => {
    if (node.lang === "mermaid" && node.value.trim()) {
      blocks.push(node.value);
    }
  });
  return blocks;
}
