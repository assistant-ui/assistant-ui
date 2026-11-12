import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Element, Root } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { MDXComponents } from "mdx/types";
import { cacheLife } from "next/cache";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import rehypeCode from "@farming-labs/next/mdx-plugins/rehype-code";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { transformerMetaHighlight } from "@shikijs/transformers";

const themes = { light: "catppuccin-latte", dark: "catppuccin-mocha" };

// Bump `v` when the options below change. next.config.mts sets the package
// versions, so an upgrade of the highlighting stack drops cached highlights.
const CACHE_SALT = JSON.stringify({
  v: 1,
  themes,
  versions: process.env.DOCS_CODE_VERSIONS,
});

/** The options the MDX pipeline used when it highlighted at compile time. */
export const docsCodeOptions = {
  lazy: true,
  themes,
  transformers: [
    ...(rehypeCodeDefaultOptions.transformers ?? []),
    {
      name: "line-numbers",
      pre(node) {
        node.properties["data-line-numbers"] = "";
      },
    },
    transformerMetaHighlight(),
  ],
} satisfies Parameters<typeof rehypeCode>[0];

// One highlighter per server process, shared by every code block.
const highlightTree = rehypeCode.call(
  undefined as never,
  docsCodeOptions,
) as unknown as (tree: Root, file: undefined) => Promise<void>;

const CACHE_DIR = path.join(process.cwd(), ".next/cache/docs-code");

function codeTree(lang: string, meta: string, code: string): Root {
  const codeElement: Element = {
    type: "element",
    tagName: "code",
    properties: { className: [`language-${lang}`] },
    data: { meta } as Element["data"],
    children: [{ type: "text", value: code }],
  };
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [codeElement],
      },
    ],
  };
}

// Drops shiki's scratch data and positions, which the renderer never reads.
const plain = (tree: Root): Root =>
  JSON.parse(
    JSON.stringify(tree, (key, value) =>
      key === "data" || key === "position" ? undefined : value,
    ),
  );

// Highlighted trees persist in .next/cache, so a rebuild or a dev restart
// skips shiki for every block it has seen. A miss or a read-only disk just
// highlights again.
async function highlightCached(lang: string, meta: string, code: string) {
  const key = createHash("sha256")
    .update(JSON.stringify([CACHE_SALT, lang, meta, code]))
    .digest("hex");
  const file = path.join(CACHE_DIR, key.slice(0, 2), `${key}.json`);
  try {
    return JSON.parse(await readFile(file, "utf8")) as Root;
  } catch {}
  const tree = codeTree(lang, meta, code);
  await highlightTree(tree, undefined);
  const result = plain(tree);
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(result));
  } catch {}
  return result;
}

async function highlightDocsCode(lang: string, meta: string, code: string) {
  "use cache";
  // Code never changes without a rebuild, so the cache must not give the
  // page a revalidate time it did not have.
  cacheLife({ stale: Infinity, revalidate: Infinity, expire: Infinity });
  return highlightCached(lang, meta, code);
}

export type DocsCodeBlockProps = {
  lang: string;
  code: string;
  meta?: string;
};

async function DocsCodeBlock({
  lang,
  code,
  meta = "",
  components,
}: DocsCodeBlockProps & { components: MDXComponents }) {
  const tree = await highlightDocsCode(lang, meta, code);
  // Render the block itself, not a fragment around it, and without the keys
  // toJsxRuntime adds, so the RSC payload matches the compiled-MDX output.
  const node = tree.children.length === 1 ? tree.children[0]! : tree;
  return toJsxRuntime(node, {
    Fragment,
    jsx: (type, props) => jsx(type, props),
    jsxs: (type, props) => jsxs(type, props),
    components: components as never,
    // A `tab="…"` fence comes back wrapped in an MDX `<Tab>` element, whose
    // name resolves through this map like any MDX component.
    createEvaluater: () => ({
      evaluateExpression(expression) {
        if (expression.type === "Identifier" && expression.name in components)
          return components[expression.name];
        throw new Error(`Unknown component in code block: ${expression.type}`);
      },
      evaluateProgram() {
        throw new Error("Code blocks cannot contain MDX ESM");
      },
    }),
  });
}

/**
 * Code fences compile to `<DocsCodeBlock>` (lib/rehype-docs-code.mjs). Bind it
 * to the final component map so the highlighted `pre` renders through that
 * map's `pre`, as it did when highlighting happened at compile time.
 */
export function withDocsCodeBlock<T extends MDXComponents>(components: T): T {
  const bound = components as MDXComponents;
  bound.DocsCodeBlock = (props: DocsCodeBlockProps) => (
    <DocsCodeBlock {...props} components={bound} />
  );
  return components;
}
