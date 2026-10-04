import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  API_REFERENCE_INPUTS,
  hasApiReferenceInputs,
} from "./api-reference-inputs.mjs";

const root = process.cwd();
const sample = Number(process.env.SAMPLE);
const out = join(root, "bench-results");
mkdirSync(out, { recursive: true });
const results = [];
const save = () =>
  writeFileSync(join(out, "results.json"), JSON.stringify(results, null, 2));
const run = (cmd, args, cwd = root) =>
  execFileSync(cmd, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
const git = (cwd, ...args) => run("git", args, cwd).trim();
const hash = (data) => createHash("sha256").update(data).digest("hex");
const order =
  sample % 2
    ? ["candidate", "baseline", "baseline", "candidate"]
    : ["baseline", "candidate", "candidate", "baseline"];

if (process.argv[2] === "checkout") {
  const remote = "https://github.com/assistant-ui/assistant-ui.git";
  const head = "c14368b77cab2ae1f94380382e73d0272b5babf0";
  const base = "1f77d04435f71476172a6d1ffca871da1a0c933a";
  let reference;
  for (const [index, variant] of order.entries()) {
    const cwd = mkdtempSync(join(tmpdir(), "aui-checkout-bench-"));
    const start = performance.now();
    git(cwd, "init", "--quiet");
    git(cwd, "remote", "add", "origin", remote);
    git(cwd, "config", "gc.auto", "0");
    if (variant === "baseline") {
      git(
        cwd,
        "fetch",
        "--quiet",
        "--no-tags",
        "--prune",
        "--no-recurse-submodules",
        "origin",
        "+refs/heads/*:refs/remotes/origin/*",
        "+refs/tags/*:refs/tags/*",
        `+${head}:refs/remotes/pull/8782/merge`,
      );
    } else {
      git(
        cwd,
        "fetch",
        "--quiet",
        "--no-tags",
        "--prune",
        "--no-recurse-submodules",
        "--depth=2",
        "origin",
        `+${head}:refs/remotes/pull/8782/merge`,
      );
    }
    git(cwd, "checkout", "--quiet", "--detach", head);
    if (variant === "candidate") {
      git(
        cwd,
        "fetch",
        "--quiet",
        "--no-tags",
        "--depth=2",
        "origin",
        `+${base}:refs/remotes/origin/benchmark-base`,
      );
    } else {
      git(cwd, "update-ref", "refs/remotes/origin/benchmark-base", base);
    }
    assert.equal(git(cwd, "merge-base", "HEAD", "origin/benchmark-base"), base);
    const seconds = (performance.now() - start) / 1000;
    const verifyStart = performance.now();
    const diff = git(
      cwd,
      "diff",
      "--name-status",
      "--no-renames",
      "origin/benchmark-base",
      "HEAD",
    );
    const install = JSON.parse(
      run(
        "pnpm",
        [
          "list",
          "--filter=...[origin/benchmark-base]...",
          "--depth=-1",
          "--json",
        ],
        cwd,
      ),
    )
      .map((p) => p.name)
      .sort();
    const plan = JSON.parse(
      run(
        join(root, "node_modules/.bin/turbo"),
        [
          "run",
          "build",
          "test",
          "typecheck",
          "--filter=...[origin/benchmark-base]",
          "--dry=json",
        ],
        cwd,
      ),
    );
    const tasks = plan.tasks
      .map((t) => ({
        id: t.taskId,
        hash: t.hash,
        command: t.command,
        dependencies: t.dependencies.toSorted(),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const fingerprint = {
      tree: git(cwd, "rev-parse", "HEAD^{tree}"),
      diff: hash(diff),
      install,
      tasks,
    };
    if (reference) assert.deepEqual(fingerprint, reference);
    reference = fingerprint;
    const row = {
      sample,
      index,
      variant,
      seconds,
      verificationSeconds: (performance.now() - verifyStart) / 1000,
      executableTasks: tasks.filter((t) => t.command !== "<NONEXISTENT>")
        .length,
      installedWorkspaces: install.length,
      fingerprint: hash(JSON.stringify(fingerprint)),
      objects: git(cwd, "count-objects", "-v"),
    };
    results.push(row);
    save();
    console.log(row);
  }
} else if (process.argv[2] === "docs") {
  const source = join(root, "apps/docs/scripts/generated-docs/extract.mts");
  const baseline = readFileSync(source, "utf8");
  const target = "_project.addSourceFilesAtPaths(glob);";
  assert.ok(baseline.includes(target));
  const candidate = baseline.replace(
    target,
    '_project.addSourceFilesAtPaths([glob, "!**/*.{test,spec,bench}.{ts,tsx}", "!**/__tests__/**", "!**/tests/**"]);',
  );
  const generated = join(
    root,
    "apps/docs/content/docs/(reference)/api-reference",
  );
  const fingerprint = () =>
    readdirSync(generated, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => {
        const file = join(e.parentPath, e.name);
        return [file.slice(generated.length), hash(readFileSync(file))];
      })
      .sort(([a], [b]) => a.localeCompare(b));
  let expected;
  try {
    for (const [index, variant] of order.entries()) {
      writeFileSync(source, variant === "baseline" ? baseline : candidate);
      const start = performance.now();
      const result = spawnSync(
        join(root, "apps/docs/node_modules/.bin/tsx"),
        ["apps/docs/scripts/generate-api-reference.mts", "--strict"],
        { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
      );
      const seconds = (performance.now() - start) / 1000;
      writeFileSync(
        join(out, `${index}-${variant}.log`),
        result.stdout + result.stderr,
      );
      assert.equal(result.status, 0, result.stderr);
      const files = fingerprint();
      if (expected) assert.deepEqual(files, expected);
      expected = files;
      const row = {
        sample,
        index,
        variant,
        seconds,
        files: files.length,
        fingerprint: hash(JSON.stringify(files)),
      };
      results.push(row);
      save();
      console.log(row);
    }
    writeFileSync(source, baseline);
    appendFileSync(
      join(root, "packages/core/README.md"),
      "\nCI benchmark README-only edit.\n",
    );
    run(join(root, "apps/docs/node_modules/.bin/tsx"), [
      "apps/docs/scripts/generate-api-reference.mts",
      "--strict",
    ]);
    assert.deepEqual(fingerprint(), expected);
    console.log("README-only edit: all generated files unchanged");
  } finally {
    writeFileSync(source, baseline);
  }
} else if (process.argv[2] === "readme-plan") {
  const generated = "apps/docs/content/docs/(reference)/api-reference";
  writeFileSync(
    join(out, "pages-before.json"),
    JSON.stringify(
      readdirSync(generated, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => {
          const file = join(entry.parentPath, entry.name);
          return [file, hash(readFileSync(file))];
        })
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
  appendFileSync(
    "packages/core/README.md",
    "\nCI benchmark README-only edit.\n",
  );
  const files = git(root, "diff", "--name-only", "--no-renames", "-z")
    .split("\0")
    .filter(Boolean);
  assert.deepEqual(files, ["packages/core/README.md"]);
  const variant = process.env.VARIANT;
  const selected =
    variant === "candidate"
      ? hasApiReferenceInputs(files)
      : files.some((file) =>
          API_REFERENCE_INPUTS.some(
            (input) => file === input || file.startsWith(`${input}/`),
          ),
        );
  assert.equal(selected, variant === "baseline");
  appendFileSync(process.env.GITHUB_OUTPUT, `run=${selected}\n`);
  writeFileSync(
    join(out, "plan.json"),
    JSON.stringify({ variant, files, selected }),
  );
  console.log({ variant, files, selected });
} else if (process.argv[2] === "readme-verify") {
  const before = JSON.parse(
    readFileSync(join(out, "pages-before.json"), "utf8"),
  );
  for (const [file, digest] of before)
    assert.equal(hash(readFileSync(file)), digest, file);
  assert.equal(
    git(
      root,
      "status",
      "--porcelain",
      "--",
      "apps/docs/content/docs/(reference)/api-reference",
    ),
    "",
  );
  console.log(`All ${before.length} generated files unchanged.`);
} else {
  throw new Error("Expected checkout, docs, readme-plan, or readme-verify");
}
