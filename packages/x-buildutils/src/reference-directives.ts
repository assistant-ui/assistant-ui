import { open } from "node:fs/promises";
import type { Plugin } from "rolldown";

const TRIPLE_SLASH_RE =
  /^\s*\/\/\/\s*<reference\s+(?<kind>path|types)\s*=\s*"(?<value>[^"]+)"\s*\/>/;

/**
 * Extracts leading `/// <reference path|types="..." />` directives from a
 * source file and returns them rewritten for the emitted declaration file
 * (path refs have their `.ts(x)` extensions swapped to `.d.ts`).
 *
 * TypeScript only treats triple-slash directives at the top of the file
 * (before any statement) as actual directives — we only need the first
 * 1KB and stop at the first non-comment, non-blank line.
 */
async function extractDirectives(srcFile: string): Promise<string[]> {
  let head: string;
  try {
    const handle = await open(srcFile, "r");
    try {
      const buffer = Buffer.alloc(1024);
      const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
      head = buffer.toString("utf-8", 0, bytesRead);
    } finally {
      await handle.close();
    }
  } catch {
    return [];
  }

  const directives: string[] = [];
  for (const line of head.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    if (!trimmed.startsWith("//")) break;
    const match = trimmed.match(TRIPLE_SLASH_RE);
    if (!match?.groups) continue;
    const { kind, value } = match.groups;
    if (kind === "path") {
      directives.push(
        `/// <reference path="${value!.replace(/\.tsx?$/, ".d.ts")}" />`,
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
      const [ts, tsx] = await Promise.all([
        extractDirectives(`${base}.ts`),
        extractDirectives(`${base}.tsx`),
      ]);
      const directives = ts.length > 0 ? ts : tsx;
      if (directives.length === 0) return null;
      return { code: `${directives.join("\n")}\n${code}`, map: null };
    },
  };
}
