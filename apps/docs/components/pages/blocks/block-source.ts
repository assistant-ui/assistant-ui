import { cacheLife } from "next/cache";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { BlockSource } from "@/lib/blocks";

export type BlockFile = {
  path: string;
  code: string;
};

export type BlockDependency = {
  name: string;
  range: string;
};

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|json|css|mdx?)$/;
const ENV_FILE = /^\.env(?:\.|$)/;
const ENV_TEMPLATE = ".env.example";

export async function readBlockSource(
  source: BlockSource,
): Promise<BlockFile[]> {
  "use cache";
  cacheLife("max");
  // Routes that read these files list them in `outputFileTracingIncludes`.
  return readBlockFiles(
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "..",
      "..",
      source.directory,
    ),
    source.include,
  );
}

export async function readBlockFiles(
  root: string,
  include: readonly string[],
): Promise<BlockFile[]> {
  const filePaths = (
    await Promise.all(
      include.map(async (entry) => {
        const stats = await fs.stat(path.join(root, entry));
        return stats.isDirectory() ? listSourceFiles(root, entry) : [entry];
      }),
    )
  )
    .flat()
    .filter(
      (filePath) =>
        !ENV_FILE.test(path.basename(filePath)) ||
        path.basename(filePath) === ENV_TEMPLATE,
    )
    .sort();

  return Promise.all(
    filePaths.map(async (filePath) => ({
      path: filePath,
      code: (await fs.readFile(path.join(root, filePath), "utf8")).trimEnd(),
    })),
  );
}

async function listSourceFiles(
  root: string,
  directory: string,
): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith(".") || entry.name === "node_modules")
        return [];
      const entryPath = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return listSourceFiles(root, entryPath);
      return entry.isFile() && SOURCE_FILE.test(entry.name) ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

export function blockDependencies(
  files: readonly BlockFile[],
): BlockDependency[] {
  const manifest = files.find((file) => file.path === "package.json");
  if (!manifest) return [];
  const { dependencies = {} } = JSON.parse(manifest.code) as {
    dependencies?: Record<string, string>;
  };
  return Object.entries(dependencies).map(([name, range]) => ({ name, range }));
}
