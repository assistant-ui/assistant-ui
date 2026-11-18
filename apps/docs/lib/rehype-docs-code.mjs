// Code fences compile to `<DocsCodeBlock lang code meta />`, which highlights
// them when the page renders (lib/docs-code.tsx). Highlighting here put every
// token's <span style> into the page module, so Turbopack held megabytes of
// spans per page in dev and in `next build`.

function textOf(node) {
  if ("children" in node) return node.children.map(textOf).join("");
  return "value" in node && typeof node.value === "string" ? node.value : "";
}

// Mirrors the `pre > code.language-*` match of fumadocs' rehypeCode, which
// this plugin replaces at compile time.
function parseCodeBlock(pre) {
  const code = pre.children[0];
  if (!code || code.type !== "element" || code.tagName !== "code") return;
  const classes = code.properties?.className;
  const languageClass = Array.isArray(classes)
    ? classes.find((c) => typeof c === "string" && c.startsWith("language-"))
    : undefined;
  return {
    lang: languageClass ? languageClass.slice("language-".length) : "plaintext",
    code: textOf(code),
    meta: code.data?.meta ?? code.properties?.metastring?.toString() ?? "",
  };
}

function walk(node, visit, index, parent) {
  if (visit(node, index, parent) === "skip" || !node.children) return;
  for (let i = 0; i < node.children.length; i++)
    walk(node.children[i], visit, i, node);
}

const attribute = (name, value) => ({ type: "mdxJsxAttribute", name, value });

export default function rehypeDocsCode() {
  return (tree) => {
    walk(tree, (node, index, parent) => {
      if (node.type !== "element" || node.tagName !== "pre") return;
      if (!parent || index == null) return;
      const block = parseCodeBlock(node);
      if (!block) return "skip";
      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "DocsCodeBlock",
        attributes: [
          attribute("lang", block.lang),
          attribute("code", block.code),
          ...(block.meta ? [attribute("meta", block.meta)] : []),
        ],
        children: [],
      };
      return "skip";
    });
  };
}
