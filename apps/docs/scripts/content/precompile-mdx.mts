/**
 * Compiles every content page to a JS module under .source/mdx before
 * `next build`, so Turbopack bundles finished JS instead of running the MDX
 * loader (remark, rehype, Shiki) on ~670 pages inside the build. Pages whose
 * source and compiler are unchanged since the last run are skipped.
 *
 * The content manifest imports a compiled module only while its hash matches
 * the page source, so a stale or missing module falls back to the .mdx file.
 */
import { availableParallelism } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import glob from "fast-glob";
import { withDocs } from "@farming-labs/next/config";
import docsConfig from "../../docs.config.ts";
import { contentDirectories } from "../../content.config.ts";
import {
  PRECOMPILED_MDX_DIR,
  PRECOMPILED_MDX_INDEX,
  type PrecompiledMdxIndex,
  docsMdxOptions,
  hashMdxSource,
  mdxCompilerDigest,
  precompiledMdxPath,
} from "./mdx-options.mts";

type LoaderOptions = {
  remarkPlugins: unknown[];
  rehypePlugins: unknown[];
  recmaPlugins?: unknown[];
};

/** The exact options withDocs hands @next/mdx's loader under Turbopack. */
function loaderOptions(): LoaderOptions {
  const turbopack = process.env.TURBOPACK;
  process.env.TURBOPACK = "1";
  try {
    const config = withDocs({}, docsConfig, { mdx: docsMdxOptions });
    const rules = config.turbopack?.rules?.["{*,next-mdx-rule}"];
    const rule = (Array.isArray(rules) ? rules : [rules]).at(-1) as
      | { loaders: { loader: string; options: LoaderOptions }[] }
      | undefined;
    const loader = rule?.loaders.find(({ loader }) =>
      loader.includes("mdx-js-loader"),
    );
    if (!loader) throw new Error("withDocs did not configure @next/mdx");
    return loader.options;
  } finally {
    if (turbopack === undefined) delete process.env.TURBOPACK;
    else process.env.TURBOPACK = turbopack;
  }
}

async function readIndex(root: string): Promise<PrecompiledMdxIndex | null> {
  try {
    return JSON.parse(
      await readFile(resolve(root, PRECOMPILED_MDX_INDEX), "utf8"),
    );
  } catch {
    return null;
  }
}

export async function precompileMdx(root = process.cwd()) {
  const started = performance.now();
  const compiler = await mdxCompilerDigest();
  const previous = await readIndex(root);
  const pages: PrecompiledMdxIndex["pages"] = {};
  const stale: {
    key: string;
    source: string;
    destination: string;
    hash: string;
  }[] = [];

  for (const [collection, directory] of Object.entries(contentDirectories)) {
    const paths = (
      await glob("**/*.mdx", { cwd: resolve(root, directory) })
    ).sort();
    for (const path of paths) {
      const key = `${collection}/${path}`;
      const source = resolve(root, directory, path);
      const hash = hashMdxSource(await readFile(source, "utf8"));
      if (previous?.compiler === compiler && previous.pages[key] === hash) {
        pages[key] = hash;
        continue;
      }
      stale.push({
        key,
        source,
        destination: resolve(root, precompiledMdxPath(collection, path)),
        hash,
      });
    }
  }

  await mkdir(resolve(root, PRECOMPILED_MDX_DIR), { recursive: true });
  const total = Object.keys(pages).length + stale.length;
  if (stale.length > 0) {
    const options = loaderOptions();
    const cpus = Number(process.env.DOCS_BUILD_CPUS) || availableParallelism();
    const size = Math.max(1, Math.min(cpus, Math.ceil(stale.length / 8)));
    const queue = [...stale];
    const errors: string[] = [];
    const byPath = new Map(stale.map((page) => [page.source, page]));
    await Promise.all(
      Array.from(
        { length: size },
        () =>
          new Promise<void>((done, fail) => {
            const worker = new Worker(
              new URL("./precompile-mdx-worker.mjs", import.meta.url),
              { workerData: { root, options } },
            );
            const next = () => {
              const page = queue.shift();
              if (page) worker.postMessage(page);
              else void worker.terminate().then(() => done());
            };
            worker.on("error", fail);
            worker.on(
              "message",
              (message: { ready?: true; source?: string; error?: string }) => {
                if (message.error) errors.push(message.error);
                else if (message.source) {
                  const page = byPath.get(message.source)!;
                  pages[page.key] = page.hash;
                }
                next();
              },
            );
          }),
      ),
    );
    if (errors.length > 0) throw new Error(errors.join("\n\n"));
  }

  const index: PrecompiledMdxIndex = {
    compiler,
    pages: Object.fromEntries(Object.entries(pages).sort()),
  };
  await writeFile(
    resolve(root, PRECOMPILED_MDX_INDEX),
    `${JSON.stringify(index)}\n`,
  );
  console.log(
    `precompiled ${stale.length} of ${total} MDX pages in ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await precompileMdx();
