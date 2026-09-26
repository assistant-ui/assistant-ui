import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  compareSizes,
  diffSizes,
  listEntries,
  measureEntry,
  measurePackages,
  renderSizeReport,
} from "./size.mjs";

const sizeMocks = vi.hoisted(() => ({
  git: new Map<string, string>(),
  stamp: undefined as { sha: string; dirty: boolean } | undefined,
  refRoot: undefined as string | undefined,
  ensureRefWorktreeCalls: 0,
}));

vi.mock("./suite.mjs", async (importOriginal) => {
  const original = await importOriginal<typeof import("./suite.mjs")>();
  return {
    ...original,
    git: (args: string[], cwd?: string) => {
      const key = args.join(" ");
      return sizeMocks.git.has(key)
        ? (sizeMocks.git.get(key) ?? "")
        : original.git(args, cwd);
    },
    envStamp: (root?: string) =>
      sizeMocks.stamp
        ? { ...original.envStamp(), ...sizeMocks.stamp }
        : original.envStamp(root),
  };
});

vi.mock("./ref-worktree.mjs", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ref-worktree.mjs")>();
  return {
    ...original,
    ensureRefWorktree: (ref: string, options?: { build?: boolean }) => {
      if (!sizeMocks.refRoot) return original.ensureRefWorktree(ref, options);
      sizeMocks.ensureRefWorktreeCalls += 1;
      return { wt: sizeMocks.refRoot, sha: "base123", marker: "" };
    },
  };
});

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

const resetSizeMocks = () => {
  sizeMocks.git.clear();
  sizeMocks.stamp = undefined;
  sizeMocks.refRoot = undefined;
  sizeMocks.ensureRefWorktreeCalls = 0;
};

const writeExecutable = (file: string, source: string) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, source);
  chmodSync(file, 0o755);
};

const writeToolStubs = (
  roots: string[],
  packages: string[],
  log: string,
  bin: string,
) => {
  const turbo = `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const args = process.argv.slice(2);
if (args.includes("--dry=json")) {
  process.stdout.write(${JSON.stringify(JSON.stringify({ packages }))});
} else {
  appendFileSync(${JSON.stringify(log)}, JSON.stringify({ tool: "turbo", cwd: process.cwd(), args }) + "\\n");
}
`;
  for (const root of roots)
    writeExecutable(join(root, "node_modules", ".bin", "turbo"), turbo);
  writeExecutable(
    join(bin, "pnpm"),
    `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(log)}, JSON.stringify({ tool: "pnpm", cwd: process.cwd(), args, CI: process.env.CI }) + "\\n");
`,
  );
};

const readToolLog = (log: string) =>
  existsSync(log)
    ? readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(
          (line) =>
            JSON.parse(line) as {
              tool: "turbo" | "pnpm";
              cwd: string;
              args: string[];
              CI?: string;
            },
        )
    : [];

const silenceConsole = () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const table = vi.spyOn(console, "table").mockImplementation(() => {});
  return {
    log,
    table,
    restore: () => {
      log.mockRestore();
      table.mockRestore();
    },
  };
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

describe("compareSizes", () => {
  it("measures a merge checkout and reports removed base packages", async () => {
    resetSizeMocks();
    const consoleOutput = silenceConsole();
    const head = realpathSync(mkdtempSync(join(tmpdir(), "aui-size-")));
    const baseRoot = realpathSync(mkdtempSync(join(tmpdir(), "aui-size-")));
    const bin = mkdtempSync(join(tmpdir(), "aui-size-bin-"));
    const log = join(head, "tool-log.jsonl");
    const report = join(head, "size.md");
    const base = "0123456789abcdef0123456789abcdef01234567";
    try {
      writePackage(head, "kept", {
        ".": 'export const kept = "the longer bundle payload makes this entry larger";\n',
      });
      writePackage(head, "same", { ".": "export const same = 1;\n" });
      writePackage(
        head,
        "gone",
        { ".": "export const gone = 1;\n" },
        { private: true },
      );
      writePackage(baseRoot, "kept", { ".": "export const kept = 1;\n" });
      writePackage(baseRoot, "same", { ".": "export const same = 1;\n" });
      writePackage(baseRoot, "gone", { ".": "export const gone = 1;\n" });
      writeToolStubs(
        [head, baseRoot],
        ["//", "@aui-test/kept", "@aui-test/same", "@aui-test/gone"],
        log,
        bin,
      );
      sizeMocks.git.set("merge-base HEAD HEAD^1", base);
      sizeMocks.git.set("rev-parse HEAD^1", base);
      sizeMocks.git.set("rev-parse --short HEAD^2", "prhead1");
      sizeMocks.git.set(`rev-parse --short ${base}`, "base123");
      sizeMocks.git.set(
        `diff --name-only ${base} -- packages/*/package.json`,
        "packages/gone/package.json",
      );
      sizeMocks.stamp = { sha: "head123", dirty: false };
      sizeMocks.refRoot = baseRoot;
      vi.stubEnv("PATH", `${bin}${delimiter}${process.env["PATH"] ?? ""}`);

      await compareSizes({ root: head, ref: "HEAD^1", report });

      const tools = readToolLog(log);
      const builds = tools
        .filter(
          (tool) =>
            tool.tool === "turbo" &&
            tool.args[0] === "run" &&
            tool.args[1] === "build",
        )
        .map(({ cwd, args }) => ({
          cwd,
          filters: args.filter((arg) => arg.startsWith("--filter=")),
        }));
      expect(sizeMocks.ensureRefWorktreeCalls).toBe(1);
      expect(builds).toHaveLength(2);
      expect(builds[0]).toEqual({
        cwd: head,
        filters: ["--filter=@aui-test/kept", "--filter=@aui-test/same"],
      });
      expect(
        tools
          .filter((tool) => tool.tool === "pnpm")
          .map(({ cwd, args, CI }) => ({ cwd, args, CI })),
      ).toEqual([{ cwd: baseRoot, args: ["install"], CI: "true" }]);
      expect(builds[1]?.cwd).toBe(baseRoot);
      expect([...(builds[1]?.filters ?? [])].sort()).toEqual([
        "--filter=@aui-test/gone",
        "--filter=@aui-test/kept",
        "--filter=@aui-test/same",
      ]);
      expect(existsSync(report)).toBe(true);
      const contents = readFileSync(report, "utf8");
      expect(contents.split("\n")[1]).toBe(
        "**Bundle size** of `prhead1` against `base123`: 2 of 3 measured entries changed.",
      );
      const goneRow = contents
        .split("\n")
        .find((row) => row.includes("@aui-test/gone ."));
      const keptRow = contents
        .split("\n")
        .find((row) => row.includes("@aui-test/kept ."));
      if (!goneRow || !keptRow)
        throw new Error("The size report is incomplete");
      expect(goneRow).toContain("| removed |");
      expect(keptRow).toMatch(/\| \+[\d,]+ B \(\+[\d.]+%\) \|$/);
      expect(contents).not.toContain("@aui-test/same .");
    } finally {
      vi.unstubAllEnvs();
      rmSync(head, { recursive: true, force: true });
      rmSync(baseRoot, { recursive: true, force: true });
      rmSync(bin, { recursive: true, force: true });
      consoleOutput.restore();
    }
  });

  it("skips the base checkout when no published package changed", async () => {
    resetSizeMocks();
    const consoleOutput = silenceConsole();
    const head = realpathSync(mkdtempSync(join(tmpdir(), "aui-size-")));
    const baseRoot = realpathSync(mkdtempSync(join(tmpdir(), "aui-size-")));
    const bin = mkdtempSync(join(tmpdir(), "aui-size-bin-"));
    const log = join(head, "tool-log.jsonl");
    const report = join(head, "size.md");
    const base = "0123456789abcdef0123456789abcdef01234567";
    try {
      writePackage(
        head,
        "private",
        { ".": "export const privateEntry = 1;\n" },
        { private: true },
      );
      writePackage(
        baseRoot,
        "private",
        { ".": "export const privateEntry = 1;\n" },
        { private: true },
      );
      writeFileSync(report, "stale report");
      writeToolStubs([head, baseRoot], ["//", "@aui-test/private"], log, bin);
      sizeMocks.git.set("merge-base HEAD HEAD^1", base);
      sizeMocks.git.set("rev-parse HEAD^1", "head-parent");
      sizeMocks.git.set(`rev-parse --short ${base}`, "base123");
      sizeMocks.git.set(
        `diff --name-only ${base} -- packages/*/package.json`,
        "",
      );
      sizeMocks.stamp = { sha: "head123", dirty: false };
      sizeMocks.refRoot = baseRoot;
      vi.stubEnv("PATH", `${bin}${delimiter}${process.env["PATH"] ?? ""}`);

      await compareSizes({ root: head, ref: "HEAD^1", report });

      const tools = readToolLog(log);
      expect(sizeMocks.ensureRefWorktreeCalls).toBe(0);
      expect(tools.filter((tool) => tool.tool === "pnpm")).toEqual([]);
      expect(
        tools.filter(
          (tool) =>
            tool.tool === "turbo" &&
            tool.args[0] === "run" &&
            tool.args[1] === "build",
        ),
      ).toEqual([]);
      expect(existsSync(report)).toBe(false);
      expect(consoleOutput.log).toHaveBeenCalledWith(
        "no published package changed against base123",
      );
    } finally {
      vi.unstubAllEnvs();
      rmSync(head, { recursive: true, force: true });
      rmSync(baseRoot, { recursive: true, force: true });
      rmSync(bin, { recursive: true, force: true });
      consoleOutput.restore();
    }
  });

  it("leaves no report for an unchanged plain checkout", async () => {
    resetSizeMocks();
    const consoleOutput = silenceConsole();
    const head = realpathSync(mkdtempSync(join(tmpdir(), "aui-size-")));
    const baseRoot = realpathSync(mkdtempSync(join(tmpdir(), "aui-size-")));
    const bin = mkdtempSync(join(tmpdir(), "aui-size-bin-"));
    const log = join(head, "tool-log.jsonl");
    const report = join(head, "size.md");
    const base = "0123456789abcdef0123456789abcdef01234567";
    try {
      writePackage(head, "same", { ".": "export const same = 1;\n" });
      writePackage(baseRoot, "same", {
        ".": "export const same = 1;\n",
      });
      writeFileSync(report, "stale report");
      writeToolStubs([head, baseRoot], ["//", "@aui-test/same"], log, bin);
      sizeMocks.git.set("merge-base HEAD HEAD^1", base);
      sizeMocks.git.set("rev-parse HEAD^1", "head-parent");
      sizeMocks.git.set(`rev-parse --short ${base}`, "base123");
      sizeMocks.git.set(
        `diff --name-only ${base} -- packages/*/package.json`,
        "",
      );
      sizeMocks.stamp = { sha: "head123", dirty: true };
      sizeMocks.refRoot = baseRoot;
      vi.stubEnv("PATH", `${bin}${delimiter}${process.env["PATH"] ?? ""}`);

      await compareSizes({ root: head, ref: "HEAD^1", report });

      expect(existsSync(report)).toBe(false);
      expect(consoleOutput.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /^bundle size of head123, dirty against base123: 0 of/,
        ),
      );
    } finally {
      vi.unstubAllEnvs();
      rmSync(head, { recursive: true, force: true });
      rmSync(baseRoot, { recursive: true, force: true });
      rmSync(bin, { recursive: true, force: true });
      consoleOutput.restore();
    }
  });
});
