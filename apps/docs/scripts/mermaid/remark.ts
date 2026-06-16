import { visit } from "unist-util-visit";
import { DIAGRAM_PUBLIC_PREFIX, hashMermaid } from "./shared";

interface CodeNode {
  type: "code";
  lang?: string | null;
  meta?: string | null;
  value: string;
}

interface MdxJsxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value: string;
}

interface MdxJsxFlowElement {
  type: "mdxJsxFlowElement";
  name: string;
  attributes: MdxJsxAttribute[];
  children: never[];
}

interface Parent {
  children: Array<{ type: string }>;
}

/**
 * Parse `key=value` options from a code fence's meta string, e.g.
 * ```` ```mermaid width=380 ```` -> `{ width: "380" }`.
 */
function parseMeta(meta: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of (meta ?? "").matchAll(/(\w+)=("[^"]*"|'[^']*'|\S+)/g)) {
    const key = match[1];
    const raw = match[2];
    if (key === undefined || raw === undefined) continue;
    out[key] = raw.replace(/^['"]|['"]$/g, "");
  }
  return out;
}

/** Turn a width option into a CSS length (bare numbers become px). */
function toCssLength(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value;
}

/**
 * Replaces ```mermaid fenced code blocks with a `<MermaidFigure>` element
 * (registered in `mdx-components.tsx`) pointing at the light/dark SVGs that
 * `scripts/mermaid/render.mts` produces in `public/diagrams/`. Both sides
 * derive the filename from `hashMermaid(node.value)`, so they always line up
 * without a shared manifest.
 *
 * Per-diagram sizing is configurable from the page via the fence meta, e.g.
 * ```` ```mermaid width=380 ```` caps the rendered width.
 */
export function remarkMermaidTldraw() {
  return (tree: unknown) => {
    visit(
      tree as never,
      "code",
      (
        node: CodeNode,
        index: number | undefined,
        parent: Parent | undefined,
      ) => {
        if (
          node.lang !== "mermaid" ||
          parent === undefined ||
          index === undefined
        )
          return;

        const hash = hashMermaid(node.value);
        const width = toCssLength(parseMeta(node.meta)["width"]);

        const attributes: MdxJsxAttribute[] = [
          {
            type: "mdxJsxAttribute",
            name: "light",
            value: `${DIAGRAM_PUBLIC_PREFIX}/${hash}.svg`,
          },
          {
            type: "mdxJsxAttribute",
            name: "dark",
            value: `${DIAGRAM_PUBLIC_PREFIX}/${hash}.dark.svg`,
          },
        ];
        if (width)
          attributes.push({
            type: "mdxJsxAttribute",
            name: "width",
            value: width,
          });

        const element: MdxJsxFlowElement = {
          type: "mdxJsxFlowElement",
          name: "MermaidFigure",
          attributes,
          children: [],
        };

        parent.children[index] = element;
      },
    );
  };
}

export default remarkMermaidTldraw;
