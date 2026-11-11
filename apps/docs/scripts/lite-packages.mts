// `pnpm dev:lite` resolves the workspace SDK packages to their built `dist`
// instead of compiling their sources. tsconfig.json maps them to `src`, so
// this writes a copy of it without those paths for Turbopack to read.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export const LITE_TSCONFIG = ".source/tsconfig.lite.json";

type Paths = Record<string, string[]>;

/** The workspace package a tsconfig path target points into, if it is one with a dist build. */
function builtPackage(root: string, target: string) {
  const match = /^\.\.\/\.\.\/packages\/([^/]+)\/src(?:\/|$)/.exec(target);
  if (!match) return undefined;
  // `@assistant-ui/*` maps every package; the dist check below covers them.
  if (match[1] === "*") return { name: "*", dir: undefined };
  const dir = resolve(root, "../../packages", match[1]!);
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  // Packages that publish their sources (such as @assistant-ui/ui) stay as they are.
  if (!JSON.stringify(manifest.exports ?? manifest.main ?? "").includes("dist"))
    return undefined;
  return { name: manifest.name as string, dir: dir as string | undefined };
}

export function writeLiteTsconfig(root: string) {
  const tsconfig = JSON.parse(
    readFileSync(resolve(root, "tsconfig.json"), "utf8"),
  );
  const paths: Paths = tsconfig.compilerOptions?.paths ?? {};
  const kept: Paths = {};
  let dropped = 0;
  for (const [key, targets] of Object.entries(paths)) {
    // `@/` aliases are the app's own files and the copied UI sources.
    const packages = key.startsWith("@/")
      ? []
      : targets.map((target) => builtPackage(root, target));
    if (packages.length && packages.every(Boolean)) {
      dropped++;
      continue;
    }
    kept[key] = targets;
  }

  // Every workspace dependency that publishes a dist build must have one.
  const docs = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const built = new Map<string, string>();
  for (const [name, version] of Object.entries<string>({
    ...docs.dependencies,
    ...docs.devDependencies,
  })) {
    if (!version.startsWith("workspace:")) continue;
    const link = resolve(root, "node_modules", name, "package.json");
    if (!existsSync(link)) continue;
    const manifest = JSON.parse(readFileSync(link, "utf8"));
    if (
      JSON.stringify(manifest.exports ?? manifest.main ?? "").includes("dist")
    )
      built.set(name, dirname(link));
  }
  const missing = [...built].filter(
    ([, dir]) => !existsSync(join(dir, "dist")),
  );
  if (missing.length)
    throw new Error(
      `pnpm dev:lite uses the built SDK packages, but ${missing
        .map(([name]) => name)
        .join(", ")} ${missing.length === 1 ? "has" : "have"} no dist yet. ` +
        "Run `pnpm docs:dev:lite` from the repo root (it builds them first), " +
        "or `pnpm turbo run build --filter=@assistant-ui/docs-site^...`.",
    );

  // Paths without a baseUrl resolve against the file that declares them.
  const file = resolve(root, LITE_TSCONFIG);
  const rebase = (target: string) =>
    relative(dirname(file), resolve(root, target)) || ".";
  const output = {
    extends: relative(dirname(file), resolve(root, "tsconfig.json")),
    compilerOptions: {
      paths: Object.fromEntries(
        Object.entries(kept).map(([key, targets]) => [
          key,
          targets.map(rebase),
        ]),
      ),
    },
    include: (tsconfig.include ?? []).map(rebase),
    exclude: (tsconfig.exclude ?? []).map(rebase),
  };
  mkdirSync(dirname(file), { recursive: true });
  const text = `${JSON.stringify(output, null, 2)}\n`;
  if (!existsSync(file) || readFileSync(file, "utf8") !== text)
    writeFileSync(file, text);
  return { tsconfigPath: LITE_TSCONFIG, droppedPaths: dropped };
}
