import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  attributeRows,
  benchCoverage,
  benchFileOf,
  closure,
  importedPackages,
  workspaceGraph,
} from "./attribution.mjs";

const pkgRoot = process.cwd();
const repoRoot = resolve(pkgRoot, "../..");

describe("importedPackages", () => {
  it("collects measured packages from bare and subpath imports", () => {
    const source = `
      import { resource } from "@assistant-ui/tap";
      import { shim } from '@assistant-ui/tap/react-shim';
      import { createRoot } from "react-dom/client";
      const utils = await import("assistant-stream/utils");
      import { bench } from "vitest";
    `;
    expect([...importedPackages(source)].sort()).toEqual([
      "@assistant-ui/tap",
      "assistant-stream",
    ]);
  });

  it("counts side-effect imports and skips statement-level type imports", () => {
    const source = `
      import "@assistant-ui/tap/react-shim";
      import type { Foo } from "@assistant-ui/core";
      import { type Bar, baz } from "@assistant-ui/store";
    `;
    expect([...importedPackages(source)].sort()).toEqual([
      "@assistant-ui/store",
      "@assistant-ui/tap",
    ]);
  });

  it("counts runtime re-exports and rejects relative imports", () => {
    expect([
      ...importedPackages('export { x } from "@assistant-ui/core";'),
    ]).toEqual(["@assistant-ui/core"]);
    expect([
      ...importedPackages('export type { T } from "@assistant-ui/core";'),
    ]).toEqual([]);
    expect(() =>
      importedPackages('import { helper } from "./helper";'),
    ).toThrow(/public package entries only/);
  });

  it("does not confuse a package with a longer name sharing a prefix", () => {
    expect(importedPackages('import x from "@assistant-ui/tapestry";')).toEqual(
      new Set(),
    );
  });
});

describe("closure", () => {
  it("follows workspace edges transitively", () => {
    const graph = new Map([
      ["core", ["store", "stream"]],
      ["store", ["tap"]],
      ["tap", []],
      ["stream", []],
    ]);
    expect([...closure(["core"], graph)].sort()).toEqual([
      "core",
      "store",
      "stream",
      "tap",
    ]);
    expect([...closure(["store"], graph)].sort()).toEqual(["store", "tap"]);
  });
});

describe("against the real workspace", () => {
  const graph = workspaceGraph(repoRoot);
  const coverage = benchCoverage(`${pkgRoot}/bench`, graph);

  it("reads the measured packages' workspace edges", () => {
    expect(graph.get("@assistant-ui/tap")).toEqual([]);
    expect(graph.get("@assistant-ui/store")).toEqual(["@assistant-ui/tap"]);
    expect([...(graph.get("@assistant-ui/core") ?? [])].sort()).toEqual([
      "@assistant-ui/store",
      "@assistant-ui/tap",
      "assistant-stream",
    ]);
    expect(
      [...(graph.get("@assistant-ui/react-markdown") ?? [])].sort(),
    ).toEqual(["@assistant-ui/react"]);
  });

  it("attributes each bench file to the dists it exercises", () => {
    const covers = (file: string) => [...(coverage.get(file) ?? [])].sort();
    expect(covers("bench/accumulator.bench.ts")).toEqual(["assistant-stream"]);
    expect(covers("bench/data-stream.bench.ts")).toEqual(["assistant-stream"]);
    expect(covers("bench/tree.bench.tsx")).toEqual(["@assistant-ui/tap"]);
    expect(covers("bench/useResources.bench.tsx")).toEqual([
      "@assistant-ui/tap",
    ]);
    expect(covers("bench/from-thread-message-like.bench.ts")).toEqual([
      "@assistant-ui/core",
      "@assistant-ui/store",
      "@assistant-ui/tap",
      "assistant-stream",
    ]);
    expect(covers("bench/thread-scaling.bench.tsx")).toEqual([
      "@assistant-ui/core",
      "@assistant-ui/store",
      "@assistant-ui/tap",
      "assistant-stream",
    ]);
    expect(covers("bench/markdown-streaming.bench.tsx")).toEqual([
      "@assistant-ui/core",
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
      "@assistant-ui/store",
      "@assistant-ui/tap",
      "assistant-stream",
    ]);
  });

  it("splits rows into measured and control by the changed dists", () => {
    const rows = [
      { id: "bench/accumulator.bench.ts > g > 100 deltas" },
      { id: "bench/tree.bench.tsx > g > react" },
      { id: "bench/from-thread-message-like.bench.ts > g > 1 text parts" },
    ];
    const out = attributeRows(rows, coverage, ["@assistant-ui/tap"]);
    expect(out.map((r) => [r.measured, r.touched])).toEqual([
      [false, []],
      [true, ["@assistant-ui/tap"]],
      [true, ["@assistant-ui/tap"]],
    ]);
    expect(attributeRows(rows, coverage, []).every((r) => !r.measured)).toBe(
      true,
    );
  });
});

describe("benchCoverage", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  it("walks nested bench directories and keys entries the way row ids are prefixed", () => {
    const dir = mkdtempSync(join(tmpdir(), "aui-perf-bench-"));
    dirs.push(dir);
    mkdirSync(join(dir, "nested"));
    writeFileSync(
      join(dir, "top.bench.ts"),
      'import { x } from "@assistant-ui/tap";',
    );
    writeFileSync(
      join(dir, "nested", "deep.bench.tsx"),
      'import "@assistant-ui/store";',
    );
    writeFileSync(join(dir, "helper.ts"), 'import "@assistant-ui/core";');
    const graph = new Map([
      ["@assistant-ui/tap", []],
      ["@assistant-ui/store", ["@assistant-ui/tap"]],
    ]);
    const coverage = benchCoverage(dir, graph);
    expect([...coverage.keys()]).toEqual([
      "bench/nested/deep.bench.tsx",
      "bench/top.bench.ts",
    ]);
    expect(
      [...(coverage.get("bench/nested/deep.bench.tsx") ?? [])].sort(),
    ).toEqual(["@assistant-ui/store", "@assistant-ui/tap"]);
  });

  it("refuses rows whose bench file has no coverage entry", () => {
    expect(() =>
      attributeRows([{ id: "bench/unknown.bench.ts > g > x" }], new Map(), []),
    ).toThrow(/no coverage entry for bench\/unknown\.bench\.ts/);
  });
});

describe("benchFileOf", () => {
  it("returns the id prefix up to the first group separator", () => {
    expect(benchFileOf("bench/tree.bench.tsx > a > b > c")).toBe(
      "bench/tree.bench.tsx",
    );
  });
});
