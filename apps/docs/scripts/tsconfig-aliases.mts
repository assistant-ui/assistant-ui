import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

type Alias = { find: RegExp; replacement: string };

const escape = (literal: string) =>
  literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const moduleName = (file: string) => file.replace(/\.(?:tsx?|jsx?|mjs)$/, "");

const exact = (specifier: string, replacement: string): Alias => ({
  find: new RegExp(`^${escape(specifier)}$`),
  replacement,
});

/**
 * tsconfig `paths` as Vite aliases, applied to every module rather than only the
 * files the app's tsconfig includes, so the shared UI sources in packages/ui
 * resolve the SDK packages to the same copies the app does. Farm's own `@`
 * alias would otherwise claim every `@/` specifier first. A wildcard resolves
 * per module to the first target that has it, as TypeScript does.
 */
export function tsconfigAliases(root: string): Alias[] {
  const { compilerOptions } = JSON.parse(
    readFileSync(path.join(root, "tsconfig.json"), "utf8"),
  ) as { compilerOptions: { paths: Record<string, string[]> } };
  const entries = Object.entries(compilerOptions.paths)
    .filter(([pattern]) => pattern !== "@/*")
    .sort(([a], [b]) => {
      const byPrefix = b.split("*")[0]!.length - a.split("*")[0]!.length;
      return byPrefix || Number(a.includes("*")) - Number(b.includes("*"));
    });

  return entries.flatMap(([pattern, targets]): Alias[] => {
    const resolved = targets.map((target) => path.resolve(root, target));
    if (!pattern.includes("*")) return [exact(pattern, resolved[0]!)];

    const [prefix, suffix] = pattern.split("*") as [string, string];
    if (suffix)
      throw new Error(
        `tsconfig.json path \`${pattern}\` has text after its wildcard, which the docs aliases do not support.`,
      );

    // `@assistant-ui/*` -> `packages/*/src`: one alias per package that has the target.
    const [head, tail] = resolved[0]!.split("*") as [string, string];
    if (resolved.length === 1 && tail) {
      return readdirSync(head, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .filter((entry) => existsSync(head + entry.name + tail))
        .map((entry) => exact(prefix + entry.name, head + entry.name + tail));
    }

    const directories = resolved.map((target) => target.slice(0, -2));
    if (directories.length === 1)
      return [
        {
          find: new RegExp(`^${escape(prefix)}(.*)$`),
          replacement: `${directories[0]}/$1`,
        },
      ];

    const owners = new Map<string, string>();
    for (const directory of directories) {
      if (!existsSync(directory))
        throw new Error(
          `tsconfig.json maps \`${pattern}\` to ${directory}, which does not exist.`,
        );
      for (const file of readdirSync(directory)) {
        const name = moduleName(file);
        if (!owners.has(name)) owners.set(name, path.join(directory, name));
      }
    }
    return [...owners].map(([name, target]) => exact(prefix + name, target));
  });
}
