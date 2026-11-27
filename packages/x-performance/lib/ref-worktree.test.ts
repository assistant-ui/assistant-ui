// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { createRequire } from "node:module";
import { delimiter, dirname, join } from "node:path";
import {
  changedPackages,
  distFingerprint,
  ensureRefWorktree,
} from "./ref-worktree.mjs";
import { pkgRoot } from "./suite.mjs";
import { REF_PACKAGE_DIRS } from "./ref-packages.mjs";

const mocks = vi.hoisted(() => ({ sha: "", root: "" }));
vi.mock("./suite.mjs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./suite.mjs")>()),
  git: () => mocks.sha,
  repoRoot: () => mocks.root,
}));

const dirs: string[] = [];
const dist = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "aui-perf-fp-"));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return dir;
};

afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

const refFixture = () => {
  const dir = mkdtempSync(join(tmpdir(), "aui-perf-ref-test-"));
  mocks.sha = dir.slice(`${join(tmpdir(), "aui-perf-ref-")}`.length);
  mocks.root = dir;
  dirs.push(dir, `${dir}.built`);
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const tool = join(bin, "pnpm");
  writeFileSync(
    tool,
    `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
appendFileSync(${JSON.stringify(join(dir, "commands.jsonl"))}, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), CI: process.env.CI }) + "\\n");
if (process.env.AUI_PERF_TEST_INSTALL_FAIL === "1") process.exit(1);
`,
  );
  chmodSync(tool, 0o755);
  vi.stubEnv("PATH", `${bin}${delimiter}${process.env["PATH"]}`);
  return dir;
};

const commands = (dir: string) => {
  const log = join(dir, "commands.jsonl");
  return existsSync(log)
    ? readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .map(
          (line) =>
            JSON.parse(line) as { args: string[]; cwd: string; CI: string },
        )
    : [];
};

describe("ensureRefWorktree", () => {
  it("installs the performance dependency graph using the ref's lockfile", () => {
    const wt = refFixture();
    ensureRefWorktree("base");
    expect(commands(wt)).toEqual([
      {
        args: [
          "install",
          "--frozen-lockfile",
          "--filter=.",
          "--filter=@assistant-ui/react-devtools...",
          ...Object.keys(REF_PACKAGE_DIRS).map((name) => `--filter=${name}...`),
        ],
        cwd: realpathSync(wt),
        CI: "true",
      },
      expect.objectContaining({
        args: [
          "turbo",
          "run",
          "build",
          ...Object.keys(REF_PACKAGE_DIRS).map((name) => `--filter=${name}`),
        ],
        cwd: realpathSync(wt),
      }),
    ]);
    expect(existsSync(`${wt}.built`)).toBe(true);
    const require = createRequire(join(pkgRoot, "package.json"));
    for (const dependency of ["react", "react-dom"]) {
      expect(
        realpathSync(join(wt, "packages/core/node_modules", dependency)),
      ).toBe(
        realpathSync(dirname(require.resolve(`${dependency}/package.json`))),
      );
    }
  });

  it("does not install or build a trace-only reference", () => {
    const wt = refFixture();
    ensureRefWorktree("base", { build: false });
    expect(commands(wt)).toEqual([]);
    expect(existsSync(`${wt}.built`)).toBe(false);
  });

  it("reuses a built reference without reinstalling", () => {
    const wt = refFixture();
    writeFileSync(`${wt}.built`, mocks.sha);
    ensureRefWorktree("base");
    expect(commands(wt)).toEqual([]);
  });

  it("does not mark a failed install as built", () => {
    const wt = refFixture();
    vi.stubEnv("AUI_PERF_TEST_INSTALL_FAIL", "1");
    expect(() => ensureRefWorktree("base")).toThrow(
      "Command failed: pnpm install",
    );
    expect(commands(wt)).toHaveLength(1);
    expect(existsSync(`${wt}.built`)).toBe(false);
  });
});

describe("distFingerprint", () => {
  it("is stable across write order and ignores sourcemaps", () => {
    const a = dist({
      "index.mjs": "export const x = 1;",
      "nested/util.mjs": "export const y = 2;",
      "index.mjs.map": '{"sources":["/tree-a/src/index.ts"]}',
    });
    const b = dist({
      "nested/util.mjs": "export const y = 2;",
      "index.mjs.map": '{"sources":["/tree-b/src/index.ts"]}',
      "index.mjs": "export const x = 1;",
    });
    expect(distFingerprint(a)).toBe(distFingerprint(b));
  });

  it.each(["d.ts", "d.mts", "d.cts"])("ignores .%s declarations", (suffix) => {
    const runtime = { "index.js": "export const x = 1;" };
    expect(
      distFingerprint(
        dist({
          ...runtime,
          [`nested/index.${suffix}`]: "export declare const x: number;",
        }),
      ),
    ).toBe(distFingerprint(dist(runtime)));
  });

  it("changes with runtime file content or path", () => {
    const base = distFingerprint(dist({ "index.mjs": "export const x = 1;" }));
    expect(
      distFingerprint(dist({ "index.mjs": "export const x = 2;" })),
    ).not.toBe(base);
    expect(
      distFingerprint(dist({ "main.mjs": "export const x = 1;" })),
    ).not.toBe(base);
  });

  it("is null for a missing dist", () => {
    expect(distFingerprint(join(tmpdir(), "aui-perf-fp-missing"))).toBeNull();
  });
});

describe("changedPackages", () => {
  const a = "./dist/a.js";
  const b = "./dist/b.js";
  const tree = (exports: unknown, manifest = {}) =>
    dist({
      "packages/tap/package.json": JSON.stringify({
        name: "@assistant-ui/tap",
        type: "module",
        exports,
        ...manifest,
      }),
      "packages/tap/dist/a.js": "export default () => 1;",
      "packages/tap/dist/b.js": "export default () => 2;",
    });

  it("detects a redirected root export with byte-identical dist files", () => {
    const base = tree({ ".": { default: a } });
    const head = tree({ ".": { default: b } });
    expect(changedPackages(head, base)).toEqual(["@assistant-ui/tap"]);
  });

  it("detects adding and removing a runtime subpath", () => {
    const base = tree({ ".": a });
    const head = tree({ ".": a, "./extra": a });
    expect(changedPackages(head, base)).toEqual(["@assistant-ui/tap"]);
    expect(changedPackages(base, head)).toEqual(["@assistant-ui/tap"]);
  });

  it("preserves nested condition targets and their priority", () => {
    const base = tree({
      "./extra": { node: { import: a, default: b }, default: a },
    });
    const redirected = tree({
      "./extra": { node: { import: b, default: b }, default: a },
    });
    const reordered = tree({
      "./extra": { node: { default: b, import: a }, default: a },
    });
    expect(changedPackages(redirected, base)).toEqual(["@assistant-ui/tap"]);
    expect(changedPackages(reordered, base)).toEqual(["@assistant-ui/tap"]);
  });

  it("detects an internal import redirect in externalized dist code", () => {
    const base = tree(
      { ".": a },
      { imports: { "#helper": { node: a, default: b } } },
    );
    const head = tree(
      { ".": a },
      { imports: { "#helper": { node: b, default: b } } },
    );
    expect(changedPackages(head, base)).toEqual(["@assistant-ui/tap"]);
  });

  it("detects a measured package appearing or disappearing", () => {
    const base = dist({});
    const head = tree(a);
    expect(changedPackages(head, base)).toEqual(["@assistant-ui/tap"]);
    expect(changedPackages(base, head)).toEqual(["@assistant-ui/tap"]);
  });

  it("tracks module format and the entry point for packages without exports", () => {
    const base = tree(undefined, { main: a });
    expect(changedPackages(tree(undefined, { main: b }), base)).toEqual([
      "@assistant-ui/tap",
    ]);
    expect(
      changedPackages(tree(undefined, { main: a, type: "commonjs" }), base),
    ).toEqual(["@assistant-ui/tap"]);
    expect(changedPackages(tree(a, { main: b }), tree(a, { main: a }))).toEqual(
      [],
    );
  });

  it("ignores a new types-only subpath when no runtime entry could match it", () => {
    const base = tree({ ".": a });
    const head = tree({
      ".": a,
      "./special": { types: "./dist/special.d.ts" },
    });
    expect(changedPackages(head, base)).toEqual([]);
    expect(changedPackages(base, head)).toEqual([]);
  });

  it("detects a types-only subpath shadowing a wildcard at runtime", () => {
    const base = tree({ ".": a, "./*": b });
    const head = tree({
      ".": a,
      "./*": b,
      "./special": { types: "./dist/special.d.ts" },
    });
    const resolveSpecial = (root: string) =>
      createRequire(join(root, "packages/tap/package.json")).resolve(
        "@assistant-ui/tap/special",
      );
    expect(resolveSpecial(base)).toBe(
      realpathSync(join(base, "packages/tap/dist/b.js")),
    );
    expect(() => resolveSpecial(head)).toThrow(
      expect.objectContaining({ code: "ERR_PACKAGE_PATH_NOT_EXPORTED" }),
    );
    expect(changedPackages(head, base)).toEqual(["@assistant-ui/tap"]);
    expect(changedPackages(base, head)).toEqual(["@assistant-ui/tap"]);
  });

  it("ignores type conditions and subpath key order", () => {
    const base = tree({
      ".": { import: { types: "./dist/a.d.mts", default: a } },
      "./extra": b,
    });
    const head = tree(
      {
        "./extra": b,
        ".": {
          import: {
            "types@>=5": "./dist/b.d.mts",
            types: "./dist/b.d.ts",
            default: a,
          },
        },
      },
      { version: "2.0.0" },
    );
    expect(changedPackages(head, base)).toEqual([]);
  });
});
