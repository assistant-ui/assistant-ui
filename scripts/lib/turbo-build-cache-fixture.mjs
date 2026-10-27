import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const repo = resolve(import.meta.dirname, "../..");

/**
 * @param {import("node:test").TestContext} t
 * @param {string} directory
 * @param {string[]} artifacts
 * @param {string[]} excluded
 */
export function assertBuildCacheRestores(
  t,
  directory,
  artifacts,
  excluded = [],
) {
  const fixture = mkdtempSync(join(tmpdir(), "aui-build-cache-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  /** @param {string} file @param {string | Uint8Array} content */
  const write = (file, content) => {
    mkdirSync(dirname(join(fixture, file)), { recursive: true });
    writeFileSync(join(fixture, file), content);
  };
  const source = join(repo, directory);
  const { packageManager } = JSON.parse(
    readFileSync(join(repo, "package.json"), "utf8"),
  );
  write(
    "package.json",
    JSON.stringify({ name: "cache-contract", private: true, packageManager }),
  );
  write(
    "pnpm-workspace.yaml",
    "packages:\n  - app\nverifyDepsBeforeRun: false\n",
  );
  write(
    "pnpm-lock.yaml",
    "lockfileVersion: '9.0'\nimporters:\n  .: {}\n  app: {}\n",
  );
  write("turbo.json", readFileSync(join(repo, "turbo.json")));
  write(".gitignore", readFileSync(join(repo, ".gitignore")));
  if (existsSync(join(source, ".gitignore")))
    write("app/.gitignore", readFileSync(join(source, ".gitignore")));
  if (existsSync(join(source, "turbo.json")))
    write("app/turbo.json", readFileSync(join(source, "turbo.json")));
  write(
    "app/package.json",
    JSON.stringify({
      name: "cache-app",
      private: true,
      type: "module",
      scripts: { build: "node build.mjs" },
    }),
  );
  write(
    "app/build.mjs",
    `import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
for (const file of ${JSON.stringify([...artifacts, ...excluded])}) {
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, 'built: ' + file);
}`,
  );
  /** @param {string[]} args */
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
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env, TURBO_TELEMETRY_DISABLED: "1" };
  delete env.TURBO_TOKEN;
  delete env.TURBO_TEAM;
  const build = () => {
    const summaries = join(fixture, ".turbo/runs");
    const previous = new Set(
      existsSync(summaries) ? readdirSync(summaries) : [],
    );
    execFileSync(
      join(repo, "node_modules/.bin/turbo"),
      ["run", "build", "--filter=cache-app", "--cache=local:rw", "--summarize"],
      { cwd: fixture, env, stdio: "pipe", timeout: 30_000 },
    );
    const summary = readdirSync(summaries).find((file) => !previous.has(file));
    assert.ok(summary, "Turbo writes a fresh run summary");
    /** @type {{tasks: {taskId: string, hash: string, cache: {status: string}}[]}} */
    const result = JSON.parse(readFileSync(join(summaries, summary), "utf8"));
    const task = result.tasks.find(
      (entry) => entry.taskId === "cache-app#build",
    );
    assert.ok(task);
    return task;
  };
  const warm = build();
  assert.equal(warm.cache.status, "MISS");
  for (const file of [...artifacts, ...excluded]) {
    assert.equal(
      readFileSync(join(fixture, "app", file), "utf8"),
      `built: ${file}`,
    );
    rmSync(join(fixture, "app", file));
  }
  const cached = build();
  assert.equal(cached.hash, warm.hash);
  assert.equal(cached.cache.status, "HIT");
  for (const file of artifacts)
    assert.equal(
      readFileSync(join(fixture, "app", file), "utf8"),
      `built: ${file}`,
    );
  for (const file of excluded)
    assert.equal(existsSync(join(fixture, "app", file)), false, file);
}
