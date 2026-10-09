import { readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { countGroups } from "./markers";

const SKIP = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".vercel",
]);
const SOURCE = /\.(tsx|jsx|js|mdx)$/;

/** Every source file under `root` that may contain JSX. */
export async function* sourceFiles(root: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP.has(entry.name)) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (entry.isFile() && SOURCE.test(entry.name)) yield path;
  }
}

/** Resolves `path` and refuses anything outside `root`, symlinks included. */
export const confine = async (root: string, path: string) => {
  const base = await realpath(resolve(root));
  const target = await realpath(resolve(base, path));
  const inside = relative(base, target);
  if (inside.split(sep)[0] === ".." || isAbsolute(inside))
    throw new Error("path outside the project root");
  return target;
};

export type Located =
  | { ok: true; file: string; source: string }
  | { ok: false; status: number; error: string };

/** Finds the one file that declares `<Variants id={group}>`. */
export const locateGroup = async (
  root: string,
  group: string,
): Promise<Located> => {
  const found: { file: string; source: string }[] = [];
  for await (const file of sourceFiles(root)) {
    const source = await readFile(file, "utf8");
    if (!source.includes(group) || !source.includes("<Variants")) continue;
    if (countGroups(source, group) > 0) found.push({ file, source });
    if (found.length > 1) break;
  }
  if (found.length === 0)
    return {
      ok: false,
      status: 404,
      error: `<Variants id="${group}"> not found`,
    };
  if (found.length > 1)
    return {
      ok: false,
      status: 409,
      error: `<Variants id="${group}"> appears in more than one file; group ids must be unique`,
    };
  const { file, source } = found[0]!;
  return { ok: true, file: await confine(root, file), source };
};

export const writeSource = async (root: string, file: string, source: string) =>
  writeFile(await confine(root, file), source, "utf8");
