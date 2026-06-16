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

function toCssLength(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value;
}

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
          !node.value.trim() ||
          parent === undefined ||
          index === undefined
        )
          return;

        const hash = hashMermaid(node.value);
        const meta = parseMeta(node.meta);
        const width = toCssLength(meta["width"]);
        const alt = meta["alt"];

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
        if (alt)
          attributes.push({
            type: "mdxJsxAttribute",
            name: "alt",
            value: alt,
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
