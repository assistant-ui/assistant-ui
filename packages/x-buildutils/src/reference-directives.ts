import { promises as fs } from "node:fs";
import type { Plugin } from "rolldown";

const TRIPLE_SLASH_RE =
  /^\s*\/\/\/\s*<reference\s+(path|types)\s*=\s*"([^"]+)"\s*\/>/;

/**
 * Extracts leading `/// <reference path|types="..." />` directives from a
 * source file and returns them rewritten for the emitted declaration file
 * (path refs have their `.ts(x)` extensions swapped to `.d.ts`).
 *
 * TypeScript only treats triple-slash directives at the top of the file
 * (before any statement) as actual directives — we honor that by stopping
 * at the first non-comment, non-blank line.
 */
async function extractDirectives(srcFile: string): Promise<string[]> {
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
    const match = trimmed.match(TRIPLE_SLASH_RE);
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
 * Re-injects `/// <reference>` directives that the TypeScript declaration
 * emitter drops. tsdown's dts pipeline (via rolldown-plugin-dts) calls tsc
 * to produce `.d.ts` content, and tsc strips triple-slash directives
 * before any plugin sees them — so we recover them straight from the
 * original source file and prepend them in `renderChunk`.
 */
export function preserveReferenceDirectives(): Plugin {
  return {
    name: "preserve-reference-directives",
    async renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith(".d.ts") || !chunk.facadeModuleId) {
        return null;
      }
      const base = chunk.facadeModuleId.replace(/\.d\.ts$/, "");
      let directives = await extractDirectives(`${base}.ts`);
      if (directives.length === 0) {
        directives = await extractDirectives(`${base}.tsx`);
      }
      if (directives.length === 0) return null;
      return { code: `${directives.join("\n")}\n${code}`, map: null };
    },
  };
}
