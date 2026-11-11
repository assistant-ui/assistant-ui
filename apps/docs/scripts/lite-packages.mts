// `pnpm dev:lite` resolves the workspace SDK packages to their built `dist`
// instead of compiling their sources. tsconfig.json maps them to `src`, and
// Turbopack reads only that file, so each package export is aliased to its
// built file instead.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

type Exports = string | null | { [key: string]: Exports };

/** The build output an export resolves to outside React Server Components. */
function defaultTarget(entry: Exports): string | undefined {
  if (typeof entry === "string") return entry;
  if (!entry) return undefined;
  return defaultTarget(entry.default ?? null);
}

function hasCondition(entry: Exports, condition: string): boolean {
  if (!entry || typeof entry === "string") return false;
  return Object.entries(entry).some(
    ([key, value]) => key === condition || hasCondition(value, condition),
  );
}

const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));

/**
 * Workspace packages the docs site depends on, directly or not; turbo builds
 * these first. pnpm links a workspace package for a plain semver range too,
 * so any dependency named like one counts.
 */
function workspaceDependencies(root: string, byName: Map<string, unknown>) {
  const seen = new Set<string>();
  const visit = (manifest: Record<string, Record<string, string>>) => {
    for (const name of Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    })) {
      const dependency = byName.get(name);
      if (!dependency || seen.has(name)) continue;
      seen.add(name);
      visit(dependency as typeof manifest);
    }
  };
  visit(readJson(resolve(root, "package.json")));
  return seen;
}

export function liteAliases(root: string) {
  const packagesDir = resolve(root, "../../packages");
  const manifests = new Map<string, { dir: string; manifest: any }>();
  for (const name of readdirSync(packagesDir)) {
    const file = join(packagesDir, name, "package.json");
    if (existsSync(file))
      manifests.set(readJson(file).name, {
        dir: join(packagesDir, name),
        manifest: readJson(file),
      });
  }
  const dependencies = workspaceDependencies(
    root,
    new Map([...manifests].map(([name, { manifest }]) => [name, manifest])),
  );
  const aliases: Record<string, string> = {};
  const missing: string[] = [];
  for (const { dir, manifest } of manifests.values()) {
    const exports: Exports =
      typeof manifest.exports === "string"
        ? { ".": manifest.exports }
        : (manifest.exports ?? null);
    if (!exports || typeof exports === "string") continue;
    // Packages that ship their sources (@assistant-ui/ui) stay as they are,
    // and an alias cannot pick a react-server build, so those stay too.
    const targets = Object.entries(exports)
      .map(([key, entry]) => [key, defaultTarget(entry)] as const)
      .filter(([, target]) => target?.startsWith("./dist/"));
    if (!targets.length || hasCondition(exports, "react-server")) continue;
    if (!existsSync(join(dir, "dist"))) {
      // Packages outside the docs dependencies are not built first; their
      // imports (in code samples, say) keep compiling from source.
      if (dependencies.has(manifest.name)) missing.push(manifest.name);
      continue;
    }
    for (const [key, target] of targets) {
      const specifier =
        key === "." ? manifest.name : `${manifest.name}/${key.slice(2)}`;
      const path = relative(root, join(dir, target!));
      aliases[specifier] = path.startsWith(".") ? path : `./${path}`;
    }
  }
  if (missing.length)
    throw new Error(
      `pnpm dev:lite uses the built SDK packages, but ${missing.join(", ")} ` +
        `${missing.length === 1 ? "has" : "have"} no dist yet. Run ` +
        "`pnpm docs:dev:lite` from the repo root, which builds them first, " +
        "or `pnpm turbo run build --filter=@assistant-ui/docs-site^...`.",
    );
  return aliases;
}
