import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const fixture = (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "cloud-template-copy-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const script = path.join(
    root,
    "packages/cli/scripts/copy-cloud-harness-template.mjs",
  );
  mkdirSync(path.dirname(script), { recursive: true });
  cpSync(new URL("./copy-cloud-harness-template.mjs", import.meta.url), script);
  const write = (relative, text) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
  };
  return { root, script, write };
};

test("ships starter source and vendor archives without local build output or credentials", (t) => {
  const { root, script, write } = fixture(t);
  for (const name of [
    "app/page.tsx",
    "vendor/runtime.tgz",
    ".env.example",
    ".assistant-ui/template.json",
  ])
    write(`templates/cloud-harness/${name}`, "starter");
  for (const name of [
    ".next/cache/file",
    ".turbo/file",
    "dist/file",
    "coverage/file",
    "node_modules/file",
    ".env.local",
    ".DS_Store",
    ".assistant-ui/cloud.json",
  ])
    write(`templates/cloud-harness/${name}`, "excluded");
  execFileSync(process.execPath, [script]);
  const bundled = path.join(root, "packages/cli/templates/cloud-harness");
  assert.equal(
    readFileSync(path.join(bundled, "vendor/runtime.tgz"), "utf8"),
    "starter",
  );
  assert.equal(
    readFileSync(path.join(bundled, ".env.example"), "utf8"),
    "starter",
  );
  assert.equal(
    existsSync(path.join(bundled, ".assistant-ui/template.json")),
    true,
  );
  for (const name of [
    ".next",
    ".turbo",
    "dist",
    "coverage",
    "node_modules",
    ".env.local",
    ".DS_Store",
    ".assistant-ui/cloud.json",
  ])
    assert.equal(existsSync(path.join(bundled, name)), false, name);
});

test("a missing source preserves the last bundled starter and fails the build", (t) => {
  const { root, script, write } = fixture(t);
  write("packages/cli/templates/cloud-harness/keep.txt", "last good");
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.equal(
    readFileSync(
      path.join(root, "packages/cli/templates/cloud-harness/keep.txt"),
      "utf8",
    ),
    "last good",
  );
});
