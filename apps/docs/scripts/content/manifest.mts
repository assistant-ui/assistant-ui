import { mkdir, readFile, writeFile } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";
import { resolve, relative } from "node:path";
import glob from "fast-glob";
import matter from "gray-matter";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";
import { remarkStructure } from "fumadocs-core/mdx-plugins";
import { VFile } from "vfile";
import {
  contentDirectories,
  contentSchemas,
  navigationSchema,
} from "../../content.config.ts";

export async function createContentManifest(root: string) {
  const { default: remarkHeading } =
    await import("@farming-labs/next/mdx-plugins/remark-heading");
  const processor = remark()
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkHeading)
    .use(remarkStructure);
  const output = [
    'import { createContentSource } from "../lib/content-source";',
  ];
  const data: Record<string, string> = {};
  for (const collection of Object.keys(
    contentDirectories,
  ) as (keyof typeof contentDirectories)[]) {
    const directory = resolve(root, contentDirectories[collection]);
    const paths = (
      await glob(["**/*.mdx", "**/meta.json"], { cwd: directory })
    ).sort();
    const pages = [];
    const metadata = [];
    const modules = [];
    const search: Record<string, unknown> = {};
    for (const path of paths) {
      const absolute = resolve(directory, path);
      const source = await readFile(absolute, "utf8");
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
        `${JSON.stringify(path)}: () => import(${JSON.stringify(`../${relative(root, absolute)}`)})`,
      );
    }
    output.push(
      `export const ${collection} = createContentSource(${JSON.stringify(collection)}, ${JSON.stringify(pages)}, ${JSON.stringify(metadata)}, {${modules.join(",\n")}}, () => import("./content-data/${collection}").then((module) => module.default));`,
    );
    data[collection] = `export default ${JSON.stringify(search)};\n`;
  }
  return { content: `${output.join("\n")}\n`, data };
}

async function writeIfChanged(destination: string, output: string) {
  const previous = await readFile(destination, "utf8").catch(() => undefined);
  if (previous !== output) await writeFile(destination, output);
}

export async function generateContentManifest(root: string) {
  const { content, data } = await createContentManifest(root);
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
