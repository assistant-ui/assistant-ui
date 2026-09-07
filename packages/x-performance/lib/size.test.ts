import { execFileSync } from "node:child_process";
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
  changedPackageNames,
  checkSizes,
  listEntries,
  measureEntry,
} from "./size.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

// The fixtures are isolated from the developer's own git configuration: an
// inherited commit.gpgsign or core.hooksPath would otherwise prompt or run
// repository hooks from inside the suite.
const gitEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@t",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@t",
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

describe("changedPackageNames", () => {
  it("falls back when the root is not a work tree root", () => {
    const outer = mkdtempSync(join(tmpdir(), "aui-size-outer-"));
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: outer, encoding: "utf8", env: gitEnv });
    try {
      git("init", "--quiet");
      git("commit", "--allow-empty", "-qm", "base");
      git("update-ref", "refs/remotes/origin/main", "HEAD");
      // The outer repository resolves a merge base, so without the work tree
      // root check the nested root reads as an empty set rather than null.
      const nested = join(outer, "nested");
      mkdirSync(join(nested, "packages"), { recursive: true });

      expect(changedPackageNames(nested)).toBeNull();
      expect(changedPackageNames(outer)).toEqual(new Set());
    } finally {
      rmSync(outer, { recursive: true, force: true });
    }
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

  it("keeps drifted entries of packages unchanged vs origin/main, still records new ones", async () => {
    const root = mkdtempSync(join(tmpdir(), "aui-size-git-"));
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8", env: gitEnv });
    try {
      const touched = writePackage(root, "touched", {
        ".": "export const touched = 1;\n",
      });
      const dirty = writePackage(root, "dirty", {
        ".": "export const dirty = 3;\n",
      });
      writePackage(root, "stale", {
        ".": "export const stale = 2;\n",
      });
      const fresh = writePackage(root, "fresh", {
        ".": "export const fresh = 4;\n",
      });
      const budgetsPath = join(root, "size-budgets.json");
      const staleBudget = { min: 5_000, gzip: 5_000 };
      writeFileSync(
        budgetsPath,
        JSON.stringify({
          "@aui-test/touched": { ".": { min: 6_000, gzip: 6_000 } },
          "@aui-test/dirty": { ".": { min: 7_000, gzip: 7_000 } },
          "@aui-test/stale": { ".": staleBudget },
        }),
      );

      git("init", "--quiet");
      git("commit", "--allow-empty", "-qm", "base");
      git("add", "-A");
      git("commit", "-qm", "all");
      git("update-ref", "refs/remotes/origin/main", "HEAD");
      // touched changes through a commit (the merge-base diff path), dirty
      // through an untracked file (the porcelain path).
      writeFileSync(join(touched, "src.ts"), "changed\n");
      git("add", "-A");
      git("commit", "-qm", "touch");
      writeFileSync(join(dirty, "untracked.ts"), "changed\n");

      expect(
        await silenced(() =>
          checkSizes({ repoRoot: root, budgetsPath, update: true }),
        ),
      ).toBe(true);

      const written = JSON.parse(readFileSync(budgetsPath, "utf8"));
      expect(written["@aui-test/touched"]["."]).toEqual(
        await measureEntry(join(touched, "dist/index.js")),
      );
      expect(written["@aui-test/dirty"]["."]).toEqual(
        await measureEntry(join(dirty, "dist/index.js")),
      );
      expect(written["@aui-test/stale"]["."]).toEqual(staleBudget);
      expect(written["@aui-test/fresh"]["."]).toEqual(
        await measureEntry(join(fresh, "dist/index.js")),
      );

      expect(
        await silenced(() =>
          checkSizes({
            repoRoot: root,
            budgetsPath,
            update: true,
            updateAll: true,
          }),
        ),
      ).toBe(true);
      const rewritten = JSON.parse(readFileSync(budgetsPath, "utf8"));
      expect(rewritten["@aui-test/stale"]["."]).not.toEqual(staleBudget);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
