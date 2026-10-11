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

const runScript = (dir, baseSha, headSha) =>
  spawnSync(
    process.execPath,
    [path.join(root, "scripts/check-public-surface-removals.mjs"), dir],
    {
      encoding: "utf8",
      env: { ...process.env, BASE_SHA: baseSha, HEAD_SHA: headSha },
    },
  );

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
    {
      package: "@assistant-ui/core",
      entry: "entry_root",
      name: "useFoo",
      requiresOwnerBypass: false,
    },
  ]);
  const execute = (head) => runScript(dir, before, head);
  const failed = execute(removed);
  assert.equal(failed.status, 1);
  assert.match(
    failed.stderr,
    /@assistant-ui\/core entry_root: removed export useFoo/,
  );
  assert.match(
    failed.stderr,
    /Add a changeset for each affected package with <!-- caret-break: intended -->/,
  );
  assert.doesNotMatch(failed.stderr, /owner bypass/);
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

test("only newly added marked changesets acknowledge a removal", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "aui-surface-check-added-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  const put = (file, text) => {
    const target = path.join(dir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  const marked =
    '---\n"@assistant-ui/core": patch\n---\n<!-- caret-break: intended -->\n';
  const draft = '---\n"@assistant-ui/core": patch\n---\nDraft.\n';
  const expected = [
    {
      package: "@assistant-ui/core",
      entry: "entry_root",
      name: "useFoo",
      requiresOwnerBypass: false,
    },
  ];
  git("init", "-q");
  put(
    "packages/core/package.json",
    JSON.stringify({ name: "@assistant-ui/core" }),
  );
  put("api-surface/assistant-ui__core.ts", base);
  put(".changeset/marked.md", marked);
  git("add", "-A");
  const alreadyMarked = git("write-tree");
  put(
    "api-surface/assistant-ui__core.ts",
    base.replace("useFoo, useBar", "useBar"),
  );
  git("add", "-A");
  assert.deepEqual(runCheck(dir, alreadyMarked, git("write-tree")), expected);

  put("api-surface/assistant-ui__core.ts", base);
  put(".changeset/draft.md", draft);
  git("add", "-A");
  const draftBase = git("write-tree");
  put(
    "api-surface/assistant-ui__core.ts",
    base.replace("useFoo, useBar", "useBar"),
  );
  put(".changeset/draft.md", marked);
  git("add", "-A");
  assert.deepEqual(runCheck(dir, draftBase, git("write-tree")), expected);

  put(".changeset/draft.md", draft);
  put(".changeset/中文.md", marked);
  git("add", "-A");
  assert.deepEqual(runCheck(dir, draftBase, git("write-tree")), []);
});

test("a renamed changeset with a new marker acknowledges a removal", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "aui-surface-check-rename-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  const put = (file, text) => {
    const target = path.join(dir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  const oldNote =
    '---\n"@assistant-ui/core": patch\n---\n' +
    "This change updates the package surface.\n".repeat(10);
  git("init", "-q");
  put(
    "packages/core/package.json",
    JSON.stringify({ name: "@assistant-ui/core" }),
  );
  put("api-surface/assistant-ui__core.ts", base);
  put(".changeset/old-note.md", oldNote);
  git("add", "-A");
  const before = git("write-tree");
  put(
    "api-surface/assistant-ui__core.ts",
    base.replace("useFoo, useBar", "useBar"),
  );
  rmSync(path.join(dir, ".changeset/old-note.md"));
  put(".changeset/new-note.md", `${oldNote}<!-- caret-break: intended -->\n`);
  git("add", "-A");
  const after = git("write-tree");

  assert.match(
    git("diff", "-M", "--name-status", before, after, "--", ".changeset"),
    /^R\d{3}\s+\.changeset\/old-note\.md\s+\.changeset\/new-note\.md$/,
  );
  assert.deepEqual(runCheck(dir, before, after), []);
});

test("reports the shipped surface when a public package is deleted", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "aui-surface-check-deleted-"));
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
  put("api-surface/assistant-ui__core.ts", base);
  git("add", "-A");
  const before = git("write-tree");
  rmSync(path.join(dir, "packages/core/package.json"));
  git("add", "-A");

  const after = git("write-tree");
  assert.deepEqual(runCheck(dir, before, after), [
    {
      package: "@assistant-ui/core",
      entry: "entry_root",
      name: "useBar",
      requiresOwnerBypass: true,
    },
    {
      package: "@assistant-ui/core",
      entry: "entry_root",
      name: "useFoo",
      requiresOwnerBypass: true,
    },
  ]);
  const result = runScript(dir, before, after);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /owner bypass/);
});

test("reports the shipped surface when a public package becomes private", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "aui-surface-check-private-"));
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
  put("api-surface/assistant-ui__core.ts", base);
  git("add", "-A");
  const before = git("write-tree");
  put(
    "packages/core/package.json",
    JSON.stringify({
      name: "@assistant-ui/core",
      version: "1.0.0",
      private: true,
    }),
  );
  git("add", "-A");

  const after = git("write-tree");
  assert.deepEqual(runCheck(dir, before, after), [
    {
      package: "@assistant-ui/core",
      entry: "entry_root",
      name: "useBar",
      requiresOwnerBypass: true,
    },
    {
      package: "@assistant-ui/core",
      entry: "entry_root",
      name: "useFoo",
      requiresOwnerBypass: true,
    },
  ]);
  const result = runScript(dir, before, after);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /owner bypass/);
});
