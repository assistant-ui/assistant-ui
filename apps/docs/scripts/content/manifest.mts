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
  return compileContent(root, await readContent(root));
}

async function compileContent(
  root: string,
  collections: Awaited<ReturnType<typeof readContent>>,
) {
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
    import("fumadocs-core/mdx-plugins"),
    import("vfile"),
    import("@farming-labs/next/mdx-plugins/remark-heading"),
  ]);
  const processor = remark()
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkHeading)
    .use(remarkStructure);
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
      const parsed = matter(source);
      const data = contentSchemas[collection].parse(parsed.data);
      const file = new VFile({ value: parsed.content, path: absolute });
      const tree = await processor.run(processor.parse(file), file);
      tree.children = tree.children.filter((node) => node.type !== "mdxjsEsm");
      pages.push({ path, metadata: data });
      search[path] = {
        structured: file.data.structuredData,
        ...(collection === "blog"
          ? { markdown: processor.stringify(tree) }
          : {}),
      };
      modules.push(
        `${serializeSourceLiteral(path)}: () => import(${serializeSourceLiteral(`../${relative(root, absolute)}`)})`,
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

export async function generateContentManifest(root: string) {
  const collections = await readContent(root);
  const inputs = await Promise.all([
    readFile(new URL(import.meta.url)),
    readFile(new URL("../../content.config.ts", import.meta.url)),
    readFile(new URL("../../../../pnpm-lock.yaml", import.meta.url)),
  ]);
  const hash = createHash("sha256").update(process.version);
  for (const input of inputs) hash.update(input);
  hash.update(JSON.stringify(collections));
  const fingerprint = hash.digest("hex");
  const cachePath = resolve(root, ".next/cache/aui-content-manifest.json");
  const cached = await readFile(cachePath, "utf8")
    .then(
      (source) =>
        JSON.parse(source) as {
          fingerprint: string;
          result: Awaited<ReturnType<typeof createContentManifest>>;
        },
    )
    .catch(() => undefined);
  const result =
    cached?.fingerprint === fingerprint
      ? cached.result
      : await compileContent(root, collections);
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
  if (cached?.fingerprint !== fingerprint) {
    await mkdir(resolve(root, ".next/cache"), { recursive: true });
    await writeFile(cachePath, JSON.stringify({ fingerprint, result }));
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
