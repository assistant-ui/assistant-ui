import { mkdir, readFile, writeFile } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";
import { DocsBuildCache, docsBuildCacheDigest } from "@farming-labs/docs/build";
import { dirname, resolve, relative } from "node:path";
import glob from "fast-glob";
import matter from "gray-matter";
import {
  contentDirectories,
  contentSchemas,
  navigationSchema,
} from "../../content.config.ts";
import { LITE_PAGES_FILE } from "../../lib/content-lite-pages.ts";

async function readContent(root: string) {
  return Promise.all(
    (
      Object.keys(contentDirectories) as (keyof typeof contentDirectories)[]
    ).map(async (collection) => {
      const directory = resolve(root, contentDirectories[collection]);
      const paths = (
        await glob(["**/*.mdx", "**/meta.json"], { cwd: directory })
      ).sort();
      const files = await Promise.all(
        paths.map(async (path) => ({
          path,
          absolute: resolve(directory, path),
          source: await readFile(resolve(directory, path), "utf8"),
        })),
      );
      return { collection, files };
    }),
  );
}

function serializeSourceLiteral(value: string | object) {
  return JSON.stringify(value).replace(
    /[<>\u2028\u2029]/gu,
    (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

export async function createContentManifest(root: string) {
  const { content, data } = await compileContent(root, await readContent(root));
  return { content, data };
}

type CompiledPage = {
  metadata: unknown;
  search: { structured: unknown; markdown?: string };
};

async function createContentProcessor() {
  const [
    { remark },
    { default: remarkMdx },
    { default: remarkGfm },
    { remarkStructure },
    { VFile },
    { createCanonicalDocsRemarkHeading: remarkHeading },
  ] = await Promise.all([
    import("remark"),
    import("remark-mdx"),
    import("remark-gfm"),
    import("fumadocs-core/mdx-plugins/remark-structure"),
    import("vfile"),
    import("@farming-labs/farmjs/vite"),
  ]);
  const processor = remark()
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkHeading)
    .use(remarkStructure);
  return { processor, VFile };
}

/**
 * On-demand dev (the `next dev` default): pages outside `compiled` load a placeholder
 * instead of their MDX, so Turbopack compiles only the pages someone opens.
 * See lib/content-lite.tsx.
 */
type LiteOptions = { compiled: ReadonlySet<string> };

async function readLitePages(root: string): Promise<string[]> {
  try {
    const pages: unknown = JSON.parse(
      await readFile(resolve(root, LITE_PAGES_FILE), "utf8"),
    );
    return Array.isArray(pages)
      ? pages.filter((page) => typeof page === "string").sort()
      : [];
  } catch {
    return [];
  }
}

async function compileContent(
  root: string,
  collections: Awaited<ReturnType<typeof readContent>>,
  cache?: { pages: DocsBuildCache<CompiledPage>; compiler: string },
  lite?: LiteOptions,
) {
  let compiler: Awaited<ReturnType<typeof createContentProcessor>> | undefined;
  const output = [
    'import { createContentSource } from "../lib/content-source";',
  ];
  const data: Record<string, string> = {};
  for (const { collection, files } of collections) {
    const pages = [];
    const metadata = [];
    const modules = [];
    const search: Record<string, unknown> = {};
    for (const { path, absolute, source } of files) {
      if (path.endsWith(".json")) {
        metadata.push({
          path,
          data: navigationSchema.parse(JSON.parse(source)),
        });
        continue;
      }
      const compile = async (): Promise<CompiledPage> => {
        compiler ??= await createContentProcessor();
        const { processor, VFile } = compiler;
        const parsed = matter(source);
        const metadata = contentSchemas[collection].parse(parsed.data);
        const file = new VFile({ value: parsed.content, path: absolute });
        const tree = await processor.run(processor.parse(file), file);
        tree.children = tree.children.filter(
          (node) => node.type !== "mdxjsEsm",
        );
        return {
          metadata,
          search: {
            structured: file.data.structuredData,
            ...(collection === "blog"
              ? { markdown: processor.stringify(tree) }
              : {}),
          },
        };
      };
      const page = cache
        ? await cache.pages.compile(
            `${collection}/${path}`,
            docsBuildCacheDigest(JSON.stringify([cache.compiler, source])),
            compile,
          )
        : await compile();
      pages.push({ path, metadata: page.metadata });
      search[path] = page.search;
      modules.push(
        lite && !lite.compiled.has(`${collection}/${path}`)
          ? `${serializeSourceLiteral(path)}: () => import("../lib/content-lite").then((module) => module.pendingPage(${serializeSourceLiteral(collection)}, ${serializeSourceLiteral(path)}))`
          : `${serializeSourceLiteral(path)}: () => import(${serializeSourceLiteral(`../${relative(root, absolute)}`)})`,
      );
    }
    output.push(
      `export const ${collection} = createContentSource(${serializeSourceLiteral(collection)}, ${serializeSourceLiteral(pages)}, ${serializeSourceLiteral(metadata)}, {${modules.join(",\n")}}, () => import("./content-data/${collection}").then((module) => module.default));`,
    );
    data[collection] = `export default ${serializeSourceLiteral(search)};\n`;
  }
  return { content: `${output.join("\n")}\n`, data };
}

async function writeIfChanged(destination: string, output: string) {
  const previous = await readFile(destination, "utf8").catch(() => undefined);
  if (previous !== output) await writeFile(destination, output);
}

export type ContentManifestOptions = {
  /** Compile only the pages listed in LITE_PAGES_FILE; dev only. */
  onDemand?: boolean;
};

export async function generateContentManifest(
  root: string,
  options: ContentManifestOptions = {},
) {
  const collections = await readContent(root);
  const lite = options.onDemand
    ? { compiled: new Set(await readLitePages(root)) }
    : undefined;
  const inputs = await Promise.all([
    // Farm bundles its config into a temporary file, so these resolve from the app root.
    readFile(resolve(root, "scripts/content/manifest.mts"), "utf8"),
    readFile(resolve(root, "content.config.ts"), "utf8"),
    readFile(resolve(root, "../../pnpm-lock.yaml"), "utf8"),
  ]);
  const compiler = docsBuildCacheDigest(
    JSON.stringify([process.version, ...inputs]),
  );
  const fingerprint = docsBuildCacheDigest(
    JSON.stringify([compiler, collections, lite ? [...lite.compiled] : null]),
  );
  const cache = new DocsBuildCache<Awaited<ReturnType<typeof compileContent>>>(
    resolve(root, ".farm/cache/aui-content-manifest.json"),
    { maxEntries: 1 },
  );
  const result = await cache.compile("manifest", fingerprint, async () => {
    const pages = new DocsBuildCache<CompiledPage>(
      resolve(root, ".farm/cache/aui-content-pages.json"),
    );
    const compiled = await compileContent(
      root,
      collections,
      { pages, compiler },
      lite,
    );
    await pages.flush();
    return compiled;
  });
  const { content, data } = result;
  await mkdir(resolve(root, ".source/content-data"), { recursive: true });
  await Promise.all(
    Object.entries(data).map(([collection, output]) =>
      writeIfChanged(
        resolve(root, `.source/content-data/${collection}.ts`),
        output,
      ),
    ),
  );
  await writeIfChanged(resolve(root, ".source/content.ts"), content);
  await cache.flush();
}

const watchers = new Map<string, FSWatcher>();

export function watchContentManifest(
  root: string,
  options: ContentManifestOptions = {},
) {
  const existing = watchers.get(root);
  if (existing) return existing;
  let queued = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const regenerate = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      queued = queued
        .then(() => generateContentManifest(root, options))
        .catch((error: unknown) => console.error(error));
    }, 100);
    timer.unref();
  };
  const watcher = watch(
    resolve(root, "content"),
    { recursive: true, persistent: false },
    regenerate,
  );
  if (options.onDemand) {
    // A placeholder page records itself in LITE_PAGES_FILE when it renders.
    // Watch the directory, since the file may not exist yet.
    const litePages = resolve(root, LITE_PAGES_FILE);
    const liteWatcher = watch(
      dirname(litePages),
      { persistent: false },
      (_event, file) => {
        // Some platforms omit the filename; regenerating is cheap.
        if (!file || file === relative(dirname(litePages), litePages))
          regenerate();
      },
    );
    watcher.on("close", () => liteWatcher.close());
  }
  watchers.set(root, watcher);
  return watcher;
}
