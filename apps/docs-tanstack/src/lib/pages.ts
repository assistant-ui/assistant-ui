import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT = fileURLToPath(
  new URL("../../../docs/content", import.meta.url),
);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : f.endsWith(".mdx") ? [p] : [];
  });
}

export function slugsOf(file: string) {
  const parts = file
    .replace(/\.mdx$/, "")
    .split("/")
    .filter((s) => !/^\(.*\)$/.test(s));
  if (parts.at(-1) === "index") parts.pop();
  return parts;
}

export const COLLECTIONS = {
  docs: "/docs",
  "docs-sites": "", // /<site>/docs/...
  elements: "/elements",
  design: "/design",
  examples: "/examples",
  blog: "/blog",
  careers: "/careers",
} as const;

export function prerenderPages(): string[] {
  const out = new Set<string>();
  for (const [dir, base] of Object.entries(COLLECTIONS)) {
    const root = join(CONTENT, dir);
    for (const f of walk(root)) {
      const slugs = slugsOf(relative(root, f));
      if (dir === "docs-sites") {
        const [site, ...rest] = slugs;
        out.add(`/${site}/docs${rest.length ? "/" + rest.join("/") : ""}`);
      } else out.add(`${base}${slugs.length ? "/" + slugs.join("/") : ""}`);
    }
  }
  return [...out].sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = prerenderPages();
  console.log(p.length, p.slice(0, 5));
}
