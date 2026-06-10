import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as nodePath from "node:path";
import loader from "../src/loader";

const pkg = JSON.parse(
  readFileSync(
    nodePath.join(
      nodePath.dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    ),
    "utf8",
  ),
) as { name: string; exports: Record<string, Record<string, string>> };

/** The wildcard subpath the facade resolves through. */
const SUBPATH = "./bundler-redirect/*";

/**
 * Matches a subpath against an `exports` key with one `*`, returning the text the
 * `*` captured (or null) — the same prefix/suffix rule Node/Turbopack apply.
 */
function matchPattern(pattern: string, subpath: string): string | null {
  const star = pattern.indexOf("*");
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  if (
    subpath.length >= prefix.length + suffix.length &&
    subpath.startsWith(prefix) &&
    subpath.endsWith(suffix)
  ) {
    return subpath.slice(prefix.length, subpath.length - suffix.length);
  }
  return null;
}

/** Drives the loader's synchronous callback path and returns the emitted code. */
function runLoader(resourcePath: string, source: string): string {
  let out = "";
  const ctx = {
    resourcePath,
    resourceQuery: "",
    sourceMap: false,
    getOptions: () => ({}),
    async() {
      return (err: unknown, code?: string) => {
        if (err) throw err;
        out = code ?? "";
      };
    },
  };
  (loader as (this: typeof ctx, source: string) => void).call(ctx, source);
  return out;
}

const GENERATIVE =
  '"use generative";\n' +
  'import { defineToolkit } from "@assistant-ui/react";\n' +
  "export default defineToolkit({});\n";

describe("bundler-redirect exports map", () => {
  const entry = pkg.exports[SUBPATH];

  test("exposes the wildcard subpath with both conditions", () => {
    expect(entry).toBeTruthy();
    expect(entry).toHaveProperty("react-server");
    expect(entry).toHaveProperty("default");
  });

  test("each condition threads the wildcard into a query", () => {
    // The `*` must ride a query on the resolved file — that query is what gives
    // Turbopack a unique module key per generative module.
    expect(entry["react-server"]).toMatch(
      /bundler-redirect\.server\.js\?[^*]*\*/,
    );
    expect(entry["default"]).toMatch(/bundler-redirect\.client\.js\?[^*]*\*/);
  });

  test("distinct tokens resolve to distinct module ids per condition", () => {
    for (const condition of ["react-server", "default"] as const) {
      const target = entry[condition]!;
      const a = target.replace("*", "tokenA");
      const b = target.replace("*", "tokenB");
      expect(a).toContain("tokenA");
      expect(b).toContain("tokenB");
      expect(a).not.toBe(b);
    }
  });

  test("the loader's facade specifier matches the exports subpath pattern", () => {
    // Cross-check so the loader and the exports map can't drift apart silently.
    const facade = runLoader("/project/toolkit.tsx", GENERATIVE);
    const specifier = facade.match(/from\s+"([^"]+)"/)?.[1];
    expect(specifier).toBeTruthy();
    expect(specifier!.startsWith(`${pkg.name}/`)).toBe(true);

    const subpath = `./${specifier!.slice(pkg.name.length + 1)}`;
    const token = matchPattern(SUBPATH, subpath);
    expect(token).toBeTruthy();
    expect(token!.length).toBeGreaterThan(0);
  });
});
