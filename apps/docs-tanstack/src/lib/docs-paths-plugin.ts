import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";

/** Applies apps/docs/tsconfig.json `paths` to every importer under apps/docs, MDX included. */
export function docsPathsPlugin(tsconfigPath: string): Plugin {
  const base = dirname(tsconfigPath);
  const { compilerOptions } = JSON.parse(readFileSync(tsconfigPath, "utf8"));
  const entries = Object.entries(compilerOptions.paths as Record<string, string[]>).map(([k, v]) => ({
    prefix: k.replace(/\*$/, ""),
    wildcard: k.endsWith("*"),
    targets: v.map((t) => resolve(base, t)),
  }));
  // longest prefix first, like TypeScript
  entries.sort((a, b) => b.prefix.length - a.prefix.length);
  return {
    name: "spike-docs-paths",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || !importer.startsWith(base + "/")) return null;
      if (importer.includes("/node_modules/")) return null;
      for (const e of entries) {
        const hit = e.wildcard ? source.startsWith(e.prefix) : source === e.prefix;
        if (!hit) continue;
        const rest = e.wildcard ? source.slice(e.prefix.length) : "";
        for (const t of e.targets) {
          const cand = e.wildcard ? t.replace(/\*$/, "") + rest : t;
          const r = await this.resolve(cand, importer, { ...options, skipSelf: true });
          if (r) return r;
        }
      }
      return null;
    },
  };
}
