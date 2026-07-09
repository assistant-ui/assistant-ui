import { visit } from "unist-util-visit";

interface CodeNode {
  type: "code";
  lang?: string | null;
  value: string;
}

interface Parent {
  children: Array<{ type: string }>;
}

interface MdxJsxFlowElement {
  type: "mdxJsxFlowElement";
  name: string;
  attributes: never[];
  children: Array<{ type: "text"; value: string }>;
}

export function remarkMermaid() {
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

        const element: MdxJsxFlowElement = {
          type: "mdxJsxFlowElement",
          name: "MermaidDiagram",
          attributes: [],
          children: [{ type: "text", value: node.value }],
        };

        parent.children[index] = element;
      },
    );
  };
}

export default remarkMermaid;
