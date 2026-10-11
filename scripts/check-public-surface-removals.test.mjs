import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  intendedChangesetPackages,
  removedSurfaceNames,
  runCheck,
} from "./check-public-surface-removals.mjs";

const root = path.resolve(import.meta.dirname, "..");
const base =
  "declare const useFoo: number; declare const useBar: number; declare namespace entry_root_exports { export { useFoo, useBar }; } export { entry_root_exports as entry_root };";

test("detects removed names, including a deleted entry or snapshot", () => {
  const head = base.replace("useFoo, useBar", "useBar");
  assert.deepEqual(removedSurfaceNames(base, head), [
    { entry: "entry_root", name: "useFoo" },
  ]);
  assert.deepEqual(removedSurfaceNames(base, null), [
    { entry: "entry_root", name: "useBar" },
    { entry: "entry_root", name: "useFoo" },
  ]);
  assert.deepEqual(
    removedSurfaceNames(base, base + "\ndeclare const extra: string;"),
    [],
  );
});

test("only a named package in a marked changeset is acknowledged", () => {
  const marked =
    '---\n"@assistant-ui/core": patch\n"@assistant-ui/store": minor\n---\n<!-- caret-break: intended -->\n';
  assert.deepEqual(intendedChangesetPackages(marked), [
    "@assistant-ui/core",
    "@assistant-ui/store",
  ]);
  assert.deepEqual(
    intendedChangesetPackages(
      marked.replace("<!-- caret-break: intended -->", "ordinary change"),
    ),
    [],
  );
  assert.deepEqual(
    intendedChangesetPackages(
      '---\n"@assistant-ui/core": none\n---\n<!-- caret-break: intended -->',
    ),
    [],
  );
});

test("executable requires the comparison revisions", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts/check-public-surface-removals.mjs")],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BASE_SHA: "", HEAD_SHA: "" },
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /BASE_SHA and HEAD_SHA are required/);
});

test("compares Git snapshots and accepts only an added marked changeset for the package", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "aui-surface-check-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  const put = (file, text) => {
    const target = path.join(dir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  git("init", "-q");
  put(
    "packages/core/package.json",
    JSON.stringify({ name: "@assistant-ui/core", version: "1.0.0" }),
  );
  put(
    "packages/private/package.json",
    JSON.stringify({ name: "@assistant-ui/private", private: true }),
  );
  put("api-surface/assistant-ui__core.ts", base);
  put("api-surface/assistant-ui__private.ts", base);
  git("add", "-A");
  const before = git("write-tree");
  put(
    "api-surface/assistant-ui__core.ts",
    base.replace("useFoo, useBar", "useBar"),
  );
  put(
    "api-surface/assistant-ui__private.ts",
    base.replace("useFoo, useBar", "useBar"),
  );
  git("add", "-A");
  const removed = git("write-tree");
  assert.deepEqual(runCheck(dir, before, removed), [
    { package: "@assistant-ui/core", entry: "entry_root", name: "useFoo" },
  ]);
  const execute = (head) =>
    spawnSync(
      process.execPath,
      [path.join(root, "scripts/check-public-surface-removals.mjs"), dir],
      {
        encoding: "utf8",
        env: { ...process.env, BASE_SHA: before, HEAD_SHA: head },
      },
    );
  const failed = execute(removed);
  assert.equal(failed.status, 1);
  assert.match(
    failed.stderr,
    /@assistant-ui\/core entry_root: removed export useFoo/,
  );
  put(
    ".changeset/intent.md",
    '---\n"@assistant-ui/store": patch\n---\n<!-- caret-break: intended -->\n',
  );
  git("add", "-A");
  assert.equal(runCheck(dir, before, git("write-tree")).length, 1);
  put(
    ".changeset/intent.md",
    '---\n"@assistant-ui/core": patch\n---\n<!-- caret-break: intended -->\n',
  );
  git("add", "-A");
  const acknowledged = git("write-tree");
  assert.deepEqual(runCheck(dir, before, acknowledged), []);
  assert.equal(execute(acknowledged).status, 0);
});
