import {
  remarkCodeTab,
  remarkImage,
  remarkNpm,
} from "fumadocs-core/mdx-plugins";
import { visit } from "unist-util-visit";

function remarkMermaid() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (
        node.lang !== "mermaid" ||
        !node.value.trim() ||
        !parent ||
        index === undefined
      )
        return;
      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "MermaidDiagram",
        attributes: [],
        children: [{ type: "text", value: node.value }],
      };
    });
  };
}

export default function remarkDocs() {
  const image = remarkImage.call(this);
  const codeTab = remarkCodeTab.call(this);
  const npm = remarkNpm.call(this);
  const mermaid = remarkMermaid();
  return async (tree, file) => {
    await image(tree, file);
    codeTab(tree, file);
    npm(tree, file);
    mermaid(tree, file);
  };
}
