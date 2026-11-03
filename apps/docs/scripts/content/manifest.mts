import { mkdir, readFile, writeFile } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";
import glob from "fast-glob";
import matter from "gray-matter";
import {
  contentDirectories,
  contentSchemas,
  navigationSchema,
} from "../../content.config.ts";

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
  fingerprint: string;
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
    { default: remarkHeading },
  ] = await Promise.all([
    import("remark"),
    import("remark-mdx"),
    import("remark-gfm"),
    import("fumadocs-core/mdx-plugins/remark-structure"),
    import("vfile"),
    import("@farming-labs/next/mdx-plugins/remark-heading"),
  ]);
  const processor = remark()
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkHeading)
    .use(remarkStructure);
  return { processor, VFile };
}

async function compileContent(
  root: string,
  collections: Awaited<ReturnType<typeof readContent>>,
  previousPages: Record<string, CompiledPage> = {},
) {
  let compiler: Awaited<ReturnType<typeof createContentProcessor>> | undefined;
  const compiledPages: Record<string, CompiledPage> = {};
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
      const key = `${collection}/${path}`;
      const fingerprint = createHash("sha256").update(source).digest("hex");
      let page = previousPages[key];
      if (page?.fingerprint !== fingerprint) {
        compiler ??= await createContentProcessor();
        const { processor, VFile } = compiler;
        const parsed = matter(source);
        const metadata = contentSchemas[collection].parse(parsed.data);
        const file = new VFile({ value: parsed.content, path: absolute });
        const tree = await processor.run(processor.parse(file), file);
        tree.children = tree.children.filter(
          (node) => node.type !== "mdxjsEsm",
        );
        page = {
          fingerprint,
          metadata,
          search: {
            structured: file.data.structuredData,
            ...(collection === "blog"
              ? { markdown: processor.stringify(tree) }
              : {}),
          },
        };
      }
      compiledPages[key] = page;
      pages.push({ path, metadata: page.metadata });
      search[path] = page.search;
      modules.push(
        `${serializeSourceLiteral(path)}: () => import(${serializeSourceLiteral(`../${relative(root, absolute)}`)})`,
      );
    }
    output.push(
      `export const ${collection} = createContentSource(${serializeSourceLiteral(collection)}, ${serializeSourceLiteral(pages)}, ${serializeSourceLiteral(metadata)}, {${modules.join(",\n")}}, () => import("./content-data/${collection}").then((module) => module.default));`,
    );
    data[collection] = `export default ${serializeSourceLiteral(search)};\n`;
  }
  return { content: `${output.join("\n")}\n`, data, compiledPages };
}

async function writeIfChanged(destination: string, output: string) {
  const previous = await readFile(destination, "utf8").catch(() => undefined);
  if (previous !== output) await writeFile(destination, output);
}

export async function generateContentManifest(root: string) {
  const collections = await readContent(root);
  const inputs = await Promise.all([
    readFile(new URL(import.meta.url)),
    readFile(new URL("../../content.config.ts", import.meta.url)),
    readFile(new URL("../../../../pnpm-lock.yaml", import.meta.url)),
  ]);
  const hash = createHash("sha256").update(process.version);
  for (const input of inputs) hash.update(input);
  const inputFingerprint = hash.copy().digest("hex");
  hash.update(JSON.stringify(collections));
  const fingerprint = hash.digest("hex");
  const cachePath = resolve(root, ".next/cache/aui-content-manifest.json");
  const pagesCachePath = resolve(root, ".next/cache/aui-content-pages.json");
  const cached = await readFile(cachePath, "utf8")
    .then(
      (source) =>
        JSON.parse(source) as {
          fingerprint: string;
          inputFingerprint: string;
          result: { content: string; data: Record<string, string> };
        },
    )
    .catch(() => undefined);
  let result: { content: string; data: Record<string, string> };
  let compiledPages: Record<string, CompiledPage> | undefined;
  if (cached?.fingerprint === fingerprint) {
    result = cached.result;
  } else {
    const cachedPages =
      cached?.inputFingerprint === inputFingerprint
        ? await readFile(pagesCachePath, "utf8")
            .then(
              (source) =>
                JSON.parse(source) as {
                  inputFingerprint: string;
                  pages: Record<string, CompiledPage>;
                },
            )
            .catch(() => undefined)
        : undefined;
    const compiled = await compileContent(
      root,
      collections,
      cachedPages?.inputFingerprint === inputFingerprint
        ? cachedPages.pages
        : undefined,
    );
    compiledPages = compiled.compiledPages;
    result = { content: compiled.content, data: compiled.data };
  }
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
  if (compiledPages) {
    await mkdir(resolve(root, ".next/cache"), { recursive: true });
    await writeFile(
      pagesCachePath,
      JSON.stringify({ inputFingerprint, pages: compiledPages }),
    );
    await writeFile(
      cachePath,
      JSON.stringify({ fingerprint, inputFingerprint, result }),
    );
  }
}

const watchers = new Map<string, FSWatcher>();

export function watchContentManifest(root: string) {
  const existing = watchers.get(root);
  if (existing) return existing;
  let queued = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watcher = watch(
    resolve(root, "content"),
    { recursive: true, persistent: false },
    () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        queued = queued
          .then(() => generateContentManifest(root))
          .catch((error: unknown) => console.error(error));
      }, 100);
      timer.unref();
    },
  );
  watchers.set(root, watcher);
  return watcher;
}
