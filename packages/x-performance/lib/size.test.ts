import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  diffSizes,
  listEntries,
  measureEntry,
  measurePackages,
  renderSizeReport,
} from "./size.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const distFile = (subpath: string) =>
  `${subpath === "." ? "index" : subpath.slice(2)}.js`;

const writePackage = (
  root: string,
  name: string,
  files: Record<string, string>,
  options?: { private?: boolean },
) => {
  const dir = join(root, "packages", name);
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: `@aui-test/${name}`,
      ...(options?.private ? { private: true } : {}),
      exports: Object.fromEntries(
        Object.keys(files).map((subpath) => [
          subpath,
          `./dist/${distFile(subpath)}`,
        ]),
      ),
    }),
  );
  for (const [subpath, code] of Object.entries(files)) {
    if (code) writeFileSync(join(dir, "dist", distFile(subpath)), code);
  }
  return dir;
};

describe("listEntries", () => {
  it("resolves JavaScript exports in map order", () => {
    const entries = listEntries(
      {
        exports: {
          ".": "./dist/index.js",
          "./nested": {
            types: "./dist/nested.d.ts",
            import: {
              types: "./dist/nested-import.d.ts",
              default: "./dist/nested.mjs",
            },
            default: "./dist/nested-default.js",
          },
          "./*": "./dist/*.js",
          "./styles": "./dist/styles.css",
          "./package.json": "./package.json",
        },
      },
      "/package",
    );

    expect(entries).toEqual([
      { subpath: ".", file: "/package/dist/index.js" },
      { subpath: "./nested", file: "/package/dist/nested.mjs" },
    ]);
  });

  it("falls back to module before main when exports are absent", () => {
    expect(
      listEntries(
        { module: "./dist/module.js", main: "./dist/main.js" },
        "/package",
      ),
    ).toEqual([{ subpath: ".", file: "/package/dist/module.js" }]);
    expect(listEntries({ main: "./dist/main.js" }, "/package")).toEqual([
      { subpath: ".", file: "/package/dist/main.js" },
    ]);
  });
});

describe("measureEntry", () => {
  it("measures the built tap root entry deterministically", async () => {
    const tapDir = resolve(repoRoot, "packages/tap");
    const tapPackage = JSON.parse(
      readFileSync(resolve(tapDir, "package.json"), "utf8"),
    );
    const entry = listEntries(tapPackage, tapDir).find(
      ({ subpath }) => subpath === ".",
    );

    if (!entry) throw new Error("The tap root entry was not found");
    const first = await measureEntry(entry.file);
    const second = await measureEntry(entry.file);

    expect(first.min).toBeGreaterThan(0);
    expect(first.gzip).toBeGreaterThan(0);
    expect(first.gzip).toBeLessThan(first.min);
    expect(second).toEqual(first);
  });
});

describe("measurePackages", () => {
  it("measures the requested public package entries", async () => {
    const root = mkdtempSync(join(tmpdir(), "aui-size-"));
    try {
      const one = writePackage(root, "one", {
        ".": "export const one = 1;\n",
        "./extra": "export const extra = 2;\n",
      });
      writePackage(
        root,
        "private",
        { ".": "export const privateEntry = 3;\n" },
        { private: true },
      );

      expect(
        await measurePackages(root, [
          "@aui-test/one",
          "@aui-test/missing",
          "@aui-test/private",
        ]),
      ).toEqual(
        new Map([
          ["@aui-test/one .", await measureEntry(join(one, "dist/index.js"))],
          [
            "@aui-test/one ./extra",
            await measureEntry(join(one, "dist/extra.js")),
          ],
        ]),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects an exported entry that was not built", async () => {
    const root = mkdtempSync(join(tmpdir(), "aui-size-"));
    try {
      writePackage(root, "missing", { ".": "" });

      await expect(
        measurePackages(root, ["@aui-test/missing"]),
      ).rejects.toThrow("@aui-test/missing . was not built");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("diffSizes", () => {
  it("classifies and orders gzip changes", () => {
    const base = new Map([
      ["@aui-test/same .", { min: 10, gzip: 100 }],
      ["@aui-test/moved-b .", { min: 20, gzip: 200 }],
      ["@aui-test/moved-a .", { min: 30, gzip: 100 }],
      ["@aui-test/removed .", { min: 40, gzip: 70 }],
    ]);
    const head = new Map([
      ["@aui-test/same .", { min: 999, gzip: 100 }],
      ["@aui-test/moved-b .", { min: 21, gzip: 160 }],
      ["@aui-test/moved-a .", { min: 31, gzip: 140 }],
      ["@aui-test/new .", { min: 50, gzip: 100 }],
    ]);

    expect(diffSizes(base, head)).toEqual([
      {
        entry: "@aui-test/new .",
        base: null,
        head: 100,
        delta: 100,
        status: "new",
      },
      {
        entry: "@aui-test/removed .",
        base: 70,
        head: null,
        delta: -70,
        status: "removed",
      },
      {
        entry: "@aui-test/moved-a .",
        base: 100,
        head: 140,
        delta: 40,
        status: "moved",
      },
      {
        entry: "@aui-test/moved-b .",
        base: 200,
        head: 160,
        delta: -40,
        status: "moved",
      },
      {
        entry: "@aui-test/same .",
        base: 100,
        head: 100,
        delta: 0,
        status: "same",
      },
    ]);
  });
});

describe("renderSizeReport", () => {
  it("renders changed entries with byte and percentage changes", () => {
    const rows = diffSizes(
      new Map([
        ["@aui-test/grown .", { min: 100_000, gzip: 95_215 }],
        ["@aui-test/shrunk .", { min: 50_000, gzip: 47_000 }],
        ["@aui-test/removed .", { min: 3_000, gzip: 2_468 }],
        ["@aui-test/same .", { min: 1, gzip: 1 }],
      ]),
      new Map([
        ["@aui-test/grown .", { min: 101_000, gzip: 95_927 }],
        ["@aui-test/shrunk .", { min: 49_000, gzip: 46_940 }],
        ["@aui-test/new .", { min: 2_000, gzip: 1_234 }],
        ["@aui-test/same .", { min: 2, gzip: 1 }],
      ]),
    );

    expect(renderSizeReport(rows, { base: "abc1234", head: "def5678" }))
      .toBe(`<!-- aui-size-report -->
**Bundle size** of \`def5678\` against \`abc1234\`: 4 of 5 measured entries changed.

| Entry | Base | Head | Change |
| --- | ---: | ---: | ---: |
| \`@aui-test/removed .\` | 2,468 B |  | removed |
| \`@aui-test/new .\` |  | 1,234 B | new |
| \`@aui-test/grown .\` | 95,215 B | 95,927 B | +712 B (+0.7%) |
| \`@aui-test/shrunk .\` | 47,000 B | 46,940 B | -60 B (-0.1%) |

Gzip bytes of each published entry of the packages this change builds, minified by rolldown with every bare import external.
`);
  });

  it("uses the singular entry label for one measured entry", () => {
    const rows = diffSizes(
      new Map([["@aui-test/one .", { min: 10, gzip: 10 }]]),
      new Map([["@aui-test/one .", { min: 11, gzip: 11 }]]),
    );

    expect(renderSizeReport(rows, { base: "abc1234", head: "def5678" }))
      .toBe(`<!-- aui-size-report -->
**Bundle size** of \`def5678\` against \`abc1234\`: 1 of 1 measured entry changed.

| Entry | Base | Head | Change |
| --- | ---: | ---: | ---: |
| \`@aui-test/one .\` | 10 B | 11 B | +1 B (+10.0%) |

Gzip bytes of each published entry of the packages this change builds, minified by rolldown with every bare import external.
`);
  });
});
