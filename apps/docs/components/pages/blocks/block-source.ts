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

export type BlockImportKind =
  | "hook"
  | "primitive"
  | "component"
  | "runtime"
  | "type";

export type BlockImport = {
  name: string;
  source: string;
  kind: BlockImportKind;
  /** Members read off the import, as in `ThreadPrimitive.Root`. */
  parts: string[];
  files: string[];
};

const ASSISTANT_UI_IMPORT =
  /import\s+(type\s+)?\{([^}]*)\}\s*from\s*"(@assistant-ui\/[^"]+|@\/components\/assistant-ui\/[^"]+)"/g;

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

function importKind(name: string, source: string): BlockImportKind {
  if (source.startsWith("@/")) return "component";
  if (/^(?:unstable_)?use[A-Z]/.test(name)) return "hook";
  if (name.endsWith("Primitive")) return "primitive";
  return "runtime";
}

export function blockAssistantUi(files: readonly BlockFile[]): BlockImport[] {
  const found = new Map<string, BlockImport>();

  for (const file of files) {
    for (const [, typeImport, names = "", source = ""] of file.code.matchAll(
      ASSISTANT_UI_IMPORT,
    )) {
      for (const specifier of names.split(",")) {
        const typeOnly = Boolean(typeImport) || /^\s*type\s/.test(specifier);
        const [name = "", local = name] = specifier
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/);
        if (!name) continue;

        const key = `${source} ${name}`;
        const entry: BlockImport = found.get(key) ?? {
          name,
          source,
          kind: "type",
          parts: [],
          files: [],
        };
        if (!typeOnly) entry.kind = importKind(name, source);
        if (!entry.files.includes(file.path)) entry.files.push(file.path);
        for (const [, part = ""] of file.code.matchAll(
          new RegExp(`<${local}\\.([A-Z]\\w*)`, "g"),
        )) {
          if (!entry.parts.includes(part)) entry.parts.push(part);
        }
        found.set(key, entry);
      }
    }
  }

  return [...found.values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.name.localeCompare(b.name),
  );
}
