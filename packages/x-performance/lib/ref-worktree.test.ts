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
import { distFingerprint, ensureRefWorktree } from "./ref-worktree.mjs";
import { pkgRoot } from "./suite.mjs";

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
          "--filter=@assistant-ui/tap...",
          "--filter=@assistant-ui/core...",
          "--filter=@assistant-ui/store...",
          "--filter=assistant-stream...",
          "--filter=@assistant-ui/react...",
          "--filter=@assistant-ui/react-markdown...",
        ],
        cwd: realpathSync(wt),
        CI: "true",
      },
      expect.objectContaining({
        args: [
          "turbo",
          "run",
          "build",
          "--filter=@assistant-ui/tap",
          "--filter=@assistant-ui/core",
          "--filter=@assistant-ui/store",
          "--filter=assistant-stream",
          "--filter=@assistant-ui/react",
          "--filter=@assistant-ui/react-markdown",
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

  it("changes with any file content or path", () => {
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
