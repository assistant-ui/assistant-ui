// Compiles MDX pages to JS the way @next/mdx's loader does inside Turbopack,
// so `next build` can bundle the result instead of running the loader.
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";

const { root, options } = workerData;
const require = createRequire(resolve(root, "package.json"));

const interopDefault = (module) => module.default ?? module;
const importPlugin = async (plugin) => {
  const [name, pluginOptions] = Array.isArray(plugin) ? plugin : [plugin];
  if (typeof name !== "string") return plugin;
  const module = interopDefault(
    await import(pathToFileURL(require.resolve(name)).href),
  );
  return pluginOptions === undefined ? module : [module, pluginOptions];
};

// Resolve @mdx-js/mdx through @next/mdx's loader so both compile with the
// same version.
const loaderRequire = createRequire(
  createRequire(require.resolve("@next/mdx")).resolve("@mdx-js/loader"),
);
const { createFormatAwareProcessors } = await import(
  pathToFileURL(
    loaderRequire.resolve(
      "@mdx-js/mdx/internal-create-format-aware-processors",
    ),
  ).href
);

// tsc checks .source/content.ts, which imports these modules.
const DECLARATION = `import type { ComponentType } from "react";
import type { MDXProps } from "mdx/types";
import type { TableOfContents } from "fumadocs-core/toc";
export declare const toc: TableOfContents;
declare const Content: ComponentType<MDXProps>;
export default Content;
`;

/** Points relative imports at the source file's directory again. */
function recmaRelocateImports() {
  return (tree, file) => {
    const from = dirname(file.data.precompiledFrom);
    const to = dirname(file.data.precompiledTo);
    for (const node of tree.body) {
      const source = node.source;
      if (!source || typeof source.value !== "string") continue;
      if (!source.value.startsWith("./") && !source.value.startsWith("../"))
        continue;
      let path = relative(to, resolve(from, source.value));
      if (!path.startsWith(".")) path = `./${path}`;
      source.value = path;
      delete source.raw;
    }
  };
}

const { process: compile } = createFormatAwareProcessors({
  ...options,
  development: false,
  SourceMapGenerator: undefined,
  remarkPlugins: await Promise.all(options.remarkPlugins.map(importPlugin)),
  rehypePlugins: await Promise.all(options.rehypePlugins.map(importPlugin)),
  recmaPlugins: [
    ...(await Promise.all((options.recmaPlugins ?? []).map(importPlugin))),
    recmaRelocateImports,
  ],
});

parentPort.on("message", async ({ source, destination }) => {
  try {
    const value = await readFile(source, "utf8");
    const file = await compile({
      value,
      path: source,
      data: { precompiledFrom: source, precompiledTo: destination },
    });
    await mkdir(dirname(destination), { recursive: true });
    await Promise.all([
      writeFile(destination, String(file.value)),
      writeFile(destination.replace(/\.js$/, ".d.ts"), DECLARATION),
    ]);
    parentPort.postMessage({ source });
  } catch (error) {
    parentPort.postMessage({
      source,
      error: `${relative(root, source)}: ${error?.stack ?? error}`,
    });
  }
});
parentPort.postMessage({ ready: true });
