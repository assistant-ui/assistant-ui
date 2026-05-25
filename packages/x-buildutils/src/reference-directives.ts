import { promises as fs } from "node:fs";
import path from "node:path";
import { glob } from "tinyglobby";

/**
 * Extracts leading `/// <reference path|types="..." />` directives from a
 * source file and returns them rewritten for the emitted declaration file
 * (path refs have their `.ts(x)` extensions swapped to `.d.ts`).
 *
 * TypeScript only treats triple-slash directives that appear at the top of
 * the file (before any statement) as actual directives — we honor that by
 * stopping at the first non-comment, non-blank line.
 */
async function collectReferenceDirectives(srcFile: string): Promise<string[]> {
  let content: string;
  try {
    content = await fs.readFile(srcFile, "utf-8");
  } catch {
    return [];
  }

  const directives: string[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    if (!trimmed.startsWith("//")) break;
    const match = trimmed.match(
      /^\/\/\/\s*<reference\s+(path|types)\s*=\s*"([^"]+)"\s*\/>/,
    );
    if (!match) continue;
    const [, kind, value] = match as unknown as [string, string, string];
    if (kind === "path") {
      directives.push(
        `/// <reference path="${value.replace(/\.tsx?$/, ".d.ts")}" />`,
      );
    } else {
      directives.push(`/// <reference types="${value}" />`);
    }
  }
  return directives;
}

/**
 * Re-inject `/// <reference>` directives into emitted `.d.ts` files. The
 * TypeScript declaration emitter drops these by default, but they are
 * needed to keep module-augmentation files in the `.d.ts` import graph.
 */
export async function restoreReferenceDirectives(): Promise<void> {
  const srcFiles = await glob("src/**/*.{ts,tsx}");
  for (const src of srcFiles) {
    const directives = await collectReferenceDirectives(src);
    if (directives.length === 0) continue;

    const dtsPath = src
      .replace(/^src\//, "dist/")
      .replace(/\.tsx?$/, ".d.ts");
    try {
      const existing = await fs.readFile(dtsPath, "utf-8");
      await fs.writeFile(dtsPath, `${directives.join("\n")}\n${existing}`);
    } catch {
      // .d.ts file may not exist (e.g. test-only source files)
    }
  }
}
