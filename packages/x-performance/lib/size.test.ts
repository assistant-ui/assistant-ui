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
import { describe, expect, it, vi } from "vitest";
import {
  budgetStatus,
  checkSizes,
  listEntries,
  measureEntry,
} from "./size.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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

describe("budgetStatus", () => {
  it("uses the 256 byte tolerance floor at its edges", () => {
    const budget = { min: 1_000, gzip: 1_000 };
    expect(budgetStatus(budget, { min: 0, gzip: 1_256 })).toBe("ok");
    expect(budgetStatus(budget, { min: 0, gzip: 1_257 })).toBe("over");
    expect(budgetStatus(budget, { min: 0, gzip: 744 })).toBe("ok");
    expect(budgetStatus(budget, { min: 0, gzip: 743 })).toBe("under");
  });

  it("uses a two percent tolerance for large budgets", () => {
    const budget = { min: 20_000, gzip: 20_000 };
    expect(budgetStatus(budget, { min: 0, gzip: 20_400 })).toBe("ok");
    expect(budgetStatus(budget, { min: 0, gzip: 20_401 })).toBe("over");
    expect(budgetStatus(budget, { min: 0, gzip: 19_600 })).toBe("ok");
    expect(budgetStatus(budget, { min: 0, gzip: 19_599 })).toBe("under");
  });

  it("reports entries without a budget or a numeric gzip as new", () => {
    expect(budgetStatus(undefined, { min: 1, gzip: 1 })).toBe("new");
    expect(budgetStatus(JSON.parse('{"min":100}'), { min: 1, gzip: 1 })).toBe(
      "new",
    );
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

describe("checkSizes", () => {
  const distFile = (subpath: string) =>
    `${subpath === "." ? "index" : subpath.slice(2)}.js`;

  const writePackage = (
    root: string,
    name: string,
    files: Record<string, string>,
  ) => {
    const dir = join(root, "packages", name);
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        name: `@aui-test/${name}`,
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

  const silenced = async <T>(run: () => Promise<T>) => {
    const table = vi.spyOn(console, "table").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      return await run();
    } finally {
      table.mockRestore();
      log.mockRestore();
    }
  };

  it("rewrites only the entries that moved past tolerance", async () => {
    const root = mkdtempSync(join(tmpdir(), "aui-size-"));
    try {
      writePackage(root, "kept", {
        ".": "export const kept = 1;\n",
        "./unbuilt": "",
      });
      const moved = writePackage(root, "moved", {
        ".": "export const moved = 2;\n",
        "./added": "export const added = 3;\n",
      });
      const budgetsPath = join(root, "size-budgets.json");
      writeFileSync(
        budgetsPath,
        JSON.stringify({
          "@aui-test/kept": {
            ".": { min: 100, gzip: 100 },
            "./unbuilt": { min: 5, gzip: 5 },
          },
          "@aui-test/moved": {
            ".": { min: 2_000, gzip: 1_000 },
            "./gone": { min: 1, gzip: 1 },
          },
          "@aui-test/removed": { ".": { min: 1, gzip: 1 } },
        }),
      );

      expect(
        await silenced(() => checkSizes({ repoRoot: root, budgetsPath })),
      ).toBe(false);
      expect(
        await silenced(() =>
          checkSizes({ repoRoot: root, budgetsPath, update: true }),
        ),
      ).toBe(true);

      expect(JSON.parse(readFileSync(budgetsPath, "utf8"))).toEqual({
        "@aui-test/kept": {
          ".": { min: 100, gzip: 100 },
          "./unbuilt": { min: 5, gzip: 5 },
        },
        "@aui-test/moved": {
          ".": await measureEntry(join(moved, "dist/index.js")),
          "./added": await measureEntry(join(moved, "dist/added.js")),
        },
      });
      expect(
        await silenced(() => checkSizes({ repoRoot: root, budgetsPath })),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
