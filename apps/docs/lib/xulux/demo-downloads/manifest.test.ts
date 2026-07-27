import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDemoFileMap } from "./create-demo-zip";

const ROOT = path.resolve(__dirname, "../../../../..");

const snapshot = new Proxy({} as Record<string, string>, {
  get: (_target, key) => readFileSync(path.join(ROOT, String(key)), "utf8"),
});

const sidebarDemoSlugs = [
  "base",
  "chatgpt",
  "claude",
  "gemini",
  "grok",
  "perplexity",
] as const;

describe("sidebar demo download file maps", () => {
  it.each(sidebarDemoSlugs)(
    "builds a self-contained file map with the sidebar for %s",
    async (slug) => {
      const files = await createDemoFileMap(slug, snapshot);
      const keys = Object.keys(files);

      expect(keys).toContain("components/examples/clone-thread-shell.tsx");
      expect(keys).toContain("components/assistant-ui/thread-list.tsx");

      for (const [file, content] of Object.entries(files)) {
        if (!/\.(tsx|ts)$/.test(file) || typeof content !== "string") continue;
        for (const match of content.matchAll(/from "(@\/[^"]+)"/g)) {
          const spec = match[1]!.slice(2);
          const resolved = keys.some(
            (key) =>
              key === spec ||
              key === `${spec}.ts` ||
              key === `${spec}.tsx` ||
              key.startsWith(`${spec}/index.`),
          );
          expect
            .soft(resolved, `${file} imports unresolved ${match[1]}`)
            .toBe(true);
        }
        expect
          .soft(
            /@\/components\/ui\/(radix|base)\//.test(content),
            `${file} has flavor-dir residue`,
          )
          .toBe(false);
      }
    },
  );
});
