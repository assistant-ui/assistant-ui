import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import type { createRepoSourceReader } from "@/lib/repo-source";
import { createDemoZip } from "./create-demo-zip";

const ROOT = path.resolve(__dirname, "../../../../..");

const { createReader } = vi.hoisted(() => ({
  createReader: vi.fn<typeof createRepoSourceReader>(),
}));

vi.mock("@/lib/repo-source", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/repo-source")>();
  return {
    ...original,
    createRepoSourceReader: createReader.mockImplementation(() =>
      original.createRepoSourceReader(ROOT),
    ),
  };
});

const sidebarDemoSlugs = [
  "base",
  "chatgpt",
  "claude",
  "gemini",
  "grok",
  "perplexity",
] as const;

describe("sidebar demo download archives", () => {
  it.each(sidebarDemoSlugs)(
    "builds a self-contained archive with the sidebar for %s",
    async (slug) => {
      const files = unzipSync(await createDemoZip(slug));
      const keys = Object.keys(files);

      expect(keys).toContain("components/examples/clone-thread-shell.tsx");
      expect(keys).toContain(
        "components/assistant-ui/elements/thread-list.aui.tsx",
      );

      for (const [file, bytes] of Object.entries(files)) {
        if (!/\.(tsx|ts)$/.test(file)) continue;
        const content = strFromU8(bytes);
        for (const match of content.matchAll(
          /from "((?:@\/|\.\.?\/)[^"]+)"/g,
        )) {
          const raw = match[1]!;
          const spec = raw.startsWith("@/")
            ? raw.slice(2)
            : path.posix.normalize(
                path.posix.join(path.posix.dirname(file), raw),
              );
          const resolved = keys.some(
            (key) =>
              key === spec ||
              key === `${spec}.ts` ||
              key === `${spec}.tsx` ||
              key.startsWith(`${spec}/index.`),
          );
          expect.soft(resolved, `${file} imports unresolved ${raw}`).toBe(true);
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
