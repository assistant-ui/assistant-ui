import assert from "node:assert/strict";
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
import { test } from "node:test";

const repo = resolve(import.meta.dirname, "..");

test("package README and CHANGELOG edits keep build cache keys", (t) => {
  const fixture = mkdtempSync(join(tmpdir(), "aui-package-docs-cache-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const write = (file, content) => {
    mkdirSync(dirname(join(fixture, file)), { recursive: true });
    writeFileSync(join(fixture, file), content);
  };
  const { packageManager } = JSON.parse(
    readFileSync(join(repo, "package.json")),
  );
  write(
    "package.json",
    JSON.stringify({ name: "docs-contract", private: true, packageManager }),
  );
  write("pnpm-workspace.yaml", "packages:\n  - packages/*\n  - templates/*\n");
  write(
    "pnpm-lock.yaml",
    "lockfileVersion: '9.0'\nimporters:\n  .: {}\n  packages/lib: {}\n  packages/consumer: {}\n  templates/site: {}\n",
  );
  write("turbo.json", readFileSync(join(repo, "turbo.json")));
  write(".gitignore", readFileSync(join(repo, ".gitignore")));
  const scripts = { build: "build", "test:coverage": "test" };
  write(
    "packages/lib/package.json",
    JSON.stringify({ name: "lib", private: true, scripts }),
  );
  write(
    "packages/consumer/package.json",
    JSON.stringify({
      name: "consumer",
      private: true,
      dependencies: { lib: "workspace:*" },
      scripts,
    }),
  );
  write(
    "templates/site/package.json",
    JSON.stringify({ name: "site", private: true, scripts }),
  );
  for (const directory of ["packages/lib", "packages/consumer"])
    write(`${directory}/src/index.ts`, "export const value = 1;\n");
  for (const file of [
    "packages/lib/README.md",
    "packages/lib/CHANGELOG.md",
    "templates/site/README.md",
  ])
    write(file, "# Before\n");
  const git = (...args) =>
    execFileSync("git", args, { cwd: fixture, stdio: "pipe" });
  git("init", "--quiet");
  git("add", ".");
  git(
    "-c",
    "user.name=Cache contract",
    "-c",
    "user.email=cache@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  );
  const plan = () =>
    new Map(
      JSON.parse(
        execFileSync(
          join(repo, "node_modules/.bin/turbo"),
          ["run", "build", "test:coverage", "--dry=json"],
          {
            cwd: fixture,
            encoding: "utf8",
            timeout: 30_000,
            maxBuffer: 4 * 1024 * 1024,
          },
        ),
      ).tasks.map((task) => [task.taskId, task.hash]),
    );
  const changedTasks = (before, after) =>
    [...after.keys()].filter((id) => after.get(id) !== before.get(id)).sort();

  const base = plan();
  write("packages/lib/README.md", "# After\n");
  write("packages/lib/CHANGELOG.md", "# After\n");
  const docsEdited = plan();
  // The package's own tests may read its Markdown; builds and dependents do not.
  assert.deepEqual(changedTasks(base, docsEdited), ["lib#test:coverage"]);

  write("packages/lib/src/index.ts", "export const value = 2;\n");
  assert.deepEqual(changedTasks(docsEdited, plan()), [
    "consumer#build",
    "consumer#test:coverage",
    "lib#build",
    "lib#test:coverage",
  ]);

  // Apps, examples and templates keep their README as a build input, because Tailwind scans it for class names.
  const beforeTemplate = plan();
  write("templates/site/README.md", "# After\n");
  assert.deepEqual(changedTasks(beforeTemplate, plan()), [
    "site#build",
    "site#test:coverage",
  ]);
});
