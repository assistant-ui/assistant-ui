import { readFileSync } from "node:fs";
import { join } from "node:path";

import { REF_PACKAGE_DIRS } from "./ref-packages.mjs";

type ExportsValue = string | { [condition: string]: ExportsValue } | undefined;

const pickConditional = (value: ExportsValue): string | undefined => {
  if (typeof value === "string") return value;
  if (value == null || typeof value !== "object") return undefined;
  for (const key of ["import", "default"]) {
    const picked = pickConditional(value[key]);
    if (picked) return picked;
  }
  return undefined;
};

/**
 * Resolves a bare specifier for one of the measured packages against the ref
 * worktree's own exports map, so subpath imports (react shims,
 * assistant-stream/utils) stay inside the ref instead of silently falling
 * back to the current tree.
 */
export const resolveRefSpecifier = (
  refRoot: string,
  source: string,
): string | undefined => {
  for (const [name, dir] of Object.entries(REF_PACKAGE_DIRS)) {
    if (source !== name && !source.startsWith(`${name}/`)) continue;
    const pkgDir = join(refRoot, dir);
    const pkg = JSON.parse(
      readFileSync(join(pkgDir, "package.json"), "utf8"),
    ) as { exports?: Record<string, ExportsValue> };
    const subpath =
      source === name ? "." : `./${source.slice(name.length + 1)}`;
    const entry = pickConditional(pkg.exports?.[subpath]);
    if (!entry) {
      throw new Error(
        `ref run: ${source} has no exports entry for ${subpath} in ${pkgDir}/package.json`,
      );
    }
    return join(pkgDir, entry);
  }
  return undefined;
};
