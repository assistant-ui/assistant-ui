import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/** The MDX plugins this app adds to the ones @farming-labs/next configures. */
export const docsMdxOptions = {
  remarkPlugins: [
    fileURLToPath(new URL("../../lib/remark-docs.mjs", import.meta.url)),
  ],
  codeHighlighter: fileURLToPath(
    new URL("../../lib/rehype-docs-code.mjs", import.meta.url),
  ),
};

/** Where `pnpm precompile:mdx` writes each page's compiled module. */
export const PRECOMPILED_MDX_DIR = ".source/mdx";
export const PRECOMPILED_MDX_INDEX = `${PRECOMPILED_MDX_DIR}/index.json`;

export type PrecompiledMdxIndex = {
  compiler: string;
  /** `collection/path` → hash of the page source. */
  pages: Record<string, string>;
};

export const hashMdxSource = (source: string) =>
  createHash("sha256").update(source).digest("hex").slice(0, 32);

/**
 * Changes when anything that shapes the compiled output changes: the plugins,
 * the compile script, the docs config, and every package version.
 */
export async function mdxCompilerDigest() {
  const inputs = await Promise.all(
    [
      "./precompile-mdx.mts",
      "./precompile-mdx-worker.mjs",
      "./mdx-options.mts",
      "../../lib/remark-docs.mjs",
      "../../lib/rehype-docs-code.mjs",
      "../../docs.config.ts",
      "../../../../pnpm-lock.yaml",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
  return hashMdxSource(JSON.stringify([process.version, ...inputs]));
}

/** Path of a page's compiled module, relative to the app root. */
export const precompiledMdxPath = (collection: string, path: string) =>
  `${PRECOMPILED_MDX_DIR}/${collection}/${path.replace(/\.mdx?$/, "")}.js`;
