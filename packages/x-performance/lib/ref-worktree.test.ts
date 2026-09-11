import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { distFingerprint } from "./ref-worktree.mjs";

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
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
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
