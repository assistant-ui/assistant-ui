import { cacheLife } from "next/cache";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Block } from "@/lib/blocks";
import { highlightElementSource } from "@/lib/element-source";

export type BlockFileSource = {
  /** Where the file lands in the project that installs the block. */
  path: string;
  code: string;
  html: string;
};

/** Reads one file of a block from the registry app, by its path inside the block directory. */
export async function readBlockSource(
  slug: string,
  source: string,
): Promise<string> {
  "use cache";
  cacheLife("max");
  // A literal prefix keeps the build's file tracing to the block sources.
  const root = path.join(process.cwd(), "../registry/blocks", slug);
  const file = path.join(process.cwd(), "../registry/blocks", slug, source);
  if (path.relative(root, file).startsWith("..")) {
    throw new Error(`Block source escapes its directory: ${slug}/${source}`);
  }
  return (await fs.readFile(file, "utf8")).trimEnd();
}

/** The README from its first section on; the page header already carries the title and summary. */
export async function readBlockReadme(slug: string): Promise<string> {
  const readme = await readBlockSource(slug, "README.md");
  const firstSection = readme.indexOf("\n## ");
  return firstSection === -1 ? "" : readme.slice(firstSection + 1);
}

/** Every file a block installs, with its source highlighted for the viewer. */
export function loadBlockFiles(block: Block): Promise<BlockFileSource[]> {
  return Promise.all(
    block.files.map(async (file) => {
      const code = await readBlockSource(block.slug, file.source ?? file.path);
      return {
        path: file.path,
        code,
        html: await highlightElementSource(
          code,
          file.path.endsWith(".md") ? "markdown" : "tsx",
        ),
      };
    }),
  );
}
