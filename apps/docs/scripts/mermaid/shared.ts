import { createHash } from "node:crypto";
import { fromMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";

/**
 * Bump this whenever the rendering logic (harness, export options) or tldraw
 * version changes the visual output. It is NOT part of the filename — it is
 * written as a marker inside each SVG so the renderer can detect stale files
 * and re-render in place, keeping the public URL stable (see render.mts).
 */
export const RENDER_VERSION = "tldraw-5.1.1-r1";

/** Marker line embedded in each rendered SVG to track the render version. */
export function renderMarker(version = RENDER_VERSION): string {
  return `<!-- tldraw-mermaid render:${version} -->`;
}

/** Public URL prefix and on-disk folder (under `public/`) for rendered SVGs. */
export const DIAGRAM_DIR = "diagrams";
export const DIAGRAM_PUBLIC_PREFIX = `/${DIAGRAM_DIR}`;

/**
 * Stable filename for a given mermaid source. Depends ONLY on the diagram
 * source, so the URL never changes when render logic changes — that avoids
 * desyncing with the MDX content render cache. The remark plugin and the
 * renderer both call this with the exact mdast `code` node value, so they
 * always agree.
 */
export function hashMermaid(source: string): string {
  const normalized = source.replace(/\r\n/g, "\n").trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/** Extract every fenced ```mermaid block from a markdown / MDX string. */
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
