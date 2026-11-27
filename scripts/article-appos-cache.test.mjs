import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
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
const app = "examples/with-article-assistant";
const name = "with-article-assistant";
const taskName = "build:appos";
const bundle = ".next-appos/example.wbn";
const intermediate = ".next-appos/appos/index.html";

test("the appOS cache restores only the bundle and tracks its build inputs", (t) => {
  const fixture = mkdtempSync(join(tmpdir(), "aui-appos-cache-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const write = (file, contents) => {
    const target = join(fixture, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  };
  const { packageManager } = JSON.parse(
    readFileSync(join(repo, "package.json"), "utf8"),
  );
  write("package.json", JSON.stringify({ private: true, packageManager }));
  write(
    "pnpm-workspace.yaml",
    `packages:\n  - ${app}\nverifyDepsBeforeRun: false\n`,
  );
  write(
    "pnpm-lock.yaml",
    `lockfileVersion: '9.0'\nimporters:\n  .: {}\n  ${app}: {}\n`,
  );
  for (const file of ["turbo.json", ".gitignore", `${app}/.gitignore`]) {
    write(file, readFileSync(join(repo, file)));
  }
  const inputs = new Map([
    ["next.config.ts", readFileSync(join(repo, app, "next.config.ts"), "utf8")],
    [
      "scripts/pack-appos.mjs",
      readFileSync(join(repo, app, "scripts/pack-appos.mjs"), "utf8"),
    ],
    [".env.local", "NEXT_PUBLIC_APPOS_FIXTURE=before\n"],
  ]);
  for (const [file, contents] of inputs) write(`${app}/${file}`, contents);
  write("README.md", "# Before\n");
  write(
    `${app}/package.json`,
    JSON.stringify({
      name,
      private: true,
      scripts: { [taskName]: "node build.mjs" },
    }),
  );
  write(
    `${app}/build.mjs`,
    `import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
for (const file of ${JSON.stringify([bundle, intermediate])}) {
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, 'built: ' + file);
}`,
  );
  const turbo = (...args) =>
    execFileSync(
      join(repo, "node_modules/.bin/turbo"),
      ["run", taskName, `--filter=${name}`, "--cache=local:rw", ...args],
      {
        cwd: fixture,
        encoding: "utf8",
        env: { ...process.env, TURBO_TELEMETRY_DISABLED: "1" },
        stdio: "pipe",
        timeout: 30_000,
      },
    );
  const plan = () => {
    const task = JSON.parse(turbo("--dry=json")).tasks.find(
      (entry) => entry.taskId === `${name}#${taskName}`,
    );
    assert.ok(task);
    return task;
  };

  const baseline = plan();
  assert.deepEqual(baseline.outputs, [bundle]);
  assert.equal(baseline.cache.status, "MISS");
  turbo();
  assert.ok(existsSync(join(fixture, app, intermediate)));
  rmSync(join(fixture, app, ".next-appos"), { recursive: true });
  assert.equal(plan().cache.status, "HIT");
  turbo();
  assert.equal(
    readFileSync(join(fixture, app, bundle), "utf8"),
    `built: ${bundle}`,
  );
  assert.equal(existsSync(join(fixture, app, intermediate)), false);

  for (const [file, contents] of inputs) {
    write(`${app}/${file}`, `${contents}\n`);
    assert.notEqual(
      plan().hash,
      baseline.hash,
      `${file} changes the task hash`,
    );
    write(`${app}/${file}`, contents);
  }
  write("README.md", "# After\n");
  assert.equal(
    plan().hash,
    baseline.hash,
    "a root README edit keeps the task hash",
  );
});
