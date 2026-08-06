import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIST_DIR = resolve(__dirname, "../../dist");
const DIST_ENTRY = resolve(DIST_DIR, "index.js");

describe("@assistant-ui/vue dist graph", () => {
  it.skipIf(!existsSync(DIST_ENTRY))(
    "contains no react, react-shim, or compiler-runtime references",
    () => {
      const visited = new Set<string>();
      const pending = [DIST_ENTRY];
      const violations: string[] = [];

      while (pending.length > 0) {
        const file = pending.pop()!;
        if (visited.has(file)) continue;
        visited.add(file);

        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(
          /(?:from\s+|import\s+)["']([^"']+)["']/g,
        )) {
          const specifier = match[1]!;
          if (
            specifier === "react" ||
            specifier.startsWith("react/") ||
            specifier.includes("react-shim") ||
            specifier.includes("compiler-runtime")
          ) {
            violations.push(`${relative(DIST_DIR, file)} -> ${specifier}`);
            continue;
          }
          if (specifier.startsWith(".")) {
            pending.push(resolve(dirname(file), specifier));
          }
        }
      }

      expect(
        violations,
        `The vue bridge must build without the react compiler: aui-build's compiler gate requires a react peer, and this package must never declare one. Violations:\n` +
          violations.map((v) => `  - ${v}`).join("\n"),
      ).toEqual([]);
    },
  );
});
