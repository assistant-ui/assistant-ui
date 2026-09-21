import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CATALOG,
  estimateAgentMinutes,
  formatMinutes,
  resolveProducts,
} from "./index";

const catalogDirectory = dirname(fileURLToPath(import.meta.url));

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });

const importSpecifierPattern =
  /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;

const promptModulePattern =
  /(?:^|\/)(?:agent-prompts|build-install-prompt)(?:\.|$)|\.agent(?:\.|$)/;

describe("catalog registry", () => {
  it("has unique slugs that match their route form", () => {
    const slugs = CATALOG.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("keeps catalog order and drops unknown slugs when resolving", () => {
    const products = resolveProducts([
      "cloud",
      "nope",
      "assistant-ui",
      "cloud",
    ]);
    expect(products.map((product) => product.slug)).toEqual([
      "assistant-ui",
      "cloud",
    ]);
  });

  it("sums the bounds of every product and formats a range", () => {
    const both = estimateAgentMinutes(
      resolveProducts(["assistant-ui", "cloud"]),
    );
    expect(both).toEqual([10, 25]);
    expect(formatMinutes(both)).toBe("10–25 min");
    expect(formatMinutes([5, 5])).toBe("5 min");
    expect(estimateAgentMinutes([])).toEqual([0, 0]);
  });

  it("keeps prompt modules out of client-reachable catalog sources", () => {
    const files = sourceFiles(catalogDirectory).filter((file) => {
      const name = file.slice(catalogDirectory.length + 1);
      return (
        !name.endsWith("agent-prompts.ts") &&
        !name.endsWith("build-install-prompt.ts") &&
        !name.endsWith(".agent.ts") &&
        !/\.test\.[cm]?[jt]sx?$/.test(name)
      );
    });

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(importSpecifierPattern)) {
        expect(match[1]).not.toMatch(promptModulePattern);
      }
    }
  });
});
