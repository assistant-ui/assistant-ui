import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { RegistryFlavor } from "./component-source";
import { buildDownloadCommand, packagedFileUrl } from "./packaged-file-url";

const REGISTRY_DIST = resolve(process.cwd(), "../registry/dist");

// files/ holds the packaged bytes themselves, base/ is walked as its own root,
// and vue/ is a staged flavor the packaged-file URLs do not serve.
const FLAVOR_ROOTS = ["files", "base", "vue"];

const itemJsonPaths = (root: string): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (FLAVOR_ROOTS.includes(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (entry.name.endsWith(".json")) {
        out.push(join(dir, entry.name));
      }
    }
  };
  walk(root);
  return out;
};

type EmittedFile = { path: string; target?: string; content: string };
type EmittedItem = { name: string; files?: EmittedFile[] };

const emittedItems = (root: string): EmittedItem[] =>
  itemJsonPaths(root)
    .map((jsonPath) => JSON.parse(readFileSync(jsonPath, "utf8")) as unknown)
    .filter(
      (item): item is EmittedItem =>
        typeof item === "object" &&
        item !== null &&
        Array.isArray((item as EmittedItem).files),
    );

const distPathOf = (url: string, origin: string): string =>
  url.slice(origin.length).split("/").map(decodeURIComponent).join("/");

describe.each([
  ["radix", REGISTRY_DIST, "https://r.assistant-ui.com/files/"],
  [
    "base",
    join(REGISTRY_DIST, "base"),
    "https://r.assistant-ui.com/base/files/",
  ],
] as [RegistryFlavor, string, string][])(
  "%s packaged-file URLs against the built registry",
  (flavor, distRoot, origin) => {
    it("resolves every emitted file to the bytes the registry shipped", () => {
      const items = emittedItems(distRoot);
      expect(items.length).toBeGreaterThan(50);

      const broken: string[] = [];
      for (const item of items) {
        for (const file of item.files ?? []) {
          const url = packagedFileUrl(flavor, {
            name: item.name,
            path: file.target ?? file.path,
          });
          if (!url.startsWith(origin)) {
            broken.push(`${item.name}: ${url} is not under ${origin}`);
            continue;
          }
          const onDisk = join(distRoot, "files", distPathOf(url, origin));
          let served: string;
          try {
            served = readFileSync(onDisk, "utf8");
          } catch {
            broken.push(`${item.name}: ${url} has no file at ${onDisk}`);
            continue;
          }
          if (served !== file.content) {
            broken.push(`${item.name}: ${url} serves stale content`);
          }
        }
      }
      expect(broken).toEqual([]);
    });
  },
);

describe("the curl the manual install block prints", () => {
  it("percent-encodes and quotes the shipped bracketed route", () => {
    const resumable = emittedItems(REGISTRY_DIST).find(
      (item) => item.name === "ai-sdk-backend-resumable",
    );
    const bracketed = resumable?.files?.find((file) =>
      (file.target ?? file.path).includes("[streamId]"),
    );
    expect(bracketed).toBeDefined();

    const command = buildDownloadCommand(
      [{ name: resumable!.name, path: bracketed!.target ?? bracketed!.path }],
      "radix",
    );
    expect(command).toContain(
      "-o 'app/api/chat/resume/[streamId]/route.ts' https://r.assistant-ui.com/files/ai-sdk-backend-resumable/app/api/chat/resume/%5BstreamId%5D/route.ts",
    );
  });
});
