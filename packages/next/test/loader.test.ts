import { expect, test } from "vitest";
import loader from "../src/loader";

/** Drives the loader's synchronous callback path and returns the emitted code. */
function run(
  resourcePath: string,
  source: string,
  opts: { resourceQuery?: string; options?: { path?: string } } = {},
): string {
  let out = "";
  let threw: unknown;
  const ctx = {
    resourcePath,
    resourceQuery: opts.resourceQuery ?? "",
    sourceMap: false,
    getOptions: () => opts.options ?? {},
    async() {
      return (err: unknown, code?: string) => {
        if (err) threw = err;
        else out = code ?? "";
      };
    },
  };
  (loader as (this: typeof ctx, source: string) => void).call(ctx, source);
  if (threw) throw threw;
  return out;
}

const GENERATIVE =
  '"use generative";\n' +
  'import { defineToolkit } from "@assistant-ui/react";\n' +
  "export default defineToolkit({});\n";

/** The facade's import specifier for the conditional indirection. */
function indirectionSpecifier(facade: string): string {
  const match = facade.match(/from\s+"([^"]*bundler-redirect[^"]*)"/);
  if (!match)
    throw new Error(`no bundler-redirect import in facade:\n${facade}`);
  return match[1]!;
}

test("a bare generative import compiles to the indirection facade", () => {
  const facade = run("/project/toolkit.tsx", GENERATIVE);
  expect(facade).toContain("bundler-redirect");
  expect(facade).toContain("export default toolkit");
});

test("each generative module's facade carries a distinct indirection identity", () => {
  // Turbopack keys runtime modules by resolved path (+ query), ignoring loader
  // options — so two facades that import the *same* specifier collapse to one
  // module (last write wins). The specifier must differ per module.
  const a = indirectionSpecifier(run("/project/a.tsx", GENERATIVE));
  const b = indirectionSpecifier(run("/project/b.tsx", GENERATIVE));
  expect(a).not.toBe(b);
});

test("the indirection identity is stable for a given module path", () => {
  const first = indirectionSpecifier(run("/project/a.tsx", GENERATIVE));
  const second = indirectionSpecifier(run("/project/a.tsx", GENERATIVE));
  expect(first).toBe(second);
});

test("a non-generative module passes through untouched", () => {
  const source = "export const x = 1;\n";
  expect(run("/project/plain.ts", source)).toBe(source);
});
