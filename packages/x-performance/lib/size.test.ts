import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { budgetStatus, listEntries, measureEntry } from "./size.mjs";

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

  it("reports entries without a budget as new", () => {
    expect(budgetStatus(undefined, { min: 1, gzip: 1 })).toBe("new");
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
