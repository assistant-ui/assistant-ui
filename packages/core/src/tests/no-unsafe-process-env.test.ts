import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";

const SRC_DIR = resolve(__dirname, "..");

function findFiles(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFiles(full, ext));
    } else if (ext.some((e) => full.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

describe("no unsafe process.env access", () => {
  it("all process.env access for non-NODE_ENV vars must have a typeof process guard", () => {
    const files = findFiles(SRC_DIR, [".ts", ".tsx"]).filter(
      (f) => !f.includes("/tests/") && !f.includes(".test."),
    );

    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");

      // Check if file has process.env access beyond NODE_ENV
      // Match process.env, process?.env, process.env?, process?.env?
      const hasNonNodeEnvProcessAccess =
        /process\??\.env\??(?!\.NODE_ENV\b)/.test(
          content.replace(/process\??\.env\??\.NODE_ENV/g, ""),
        );

      if (!hasNonNodeEnvProcessAccess) continue;

      // File accesses process.env for non-NODE_ENV vars — must have typeof guard
      const hasTypeofGuard = /typeof process\s*!==\s*["']undefined["']/.test(
        content,
      );

      if (!hasTypeofGuard) {
        violations.push(relative(SRC_DIR, file));
      }
    }

    expect(
      violations,
      `These files access process.env (non-NODE_ENV) without a typeof process !== "undefined" guard.\n` +
        `@assistant-ui/core lacks @types/node, so bare process.env access crashes in Vite and other bundlers.\n` +
        `Add: typeof process !== "undefined" ? process.env?.["VAR_NAME"] : undefined\n\n` +
        `Files:\n${violations.map((f) => `  - ${f}`).join("\n")}`,
    ).toEqual([]);
  });
});
