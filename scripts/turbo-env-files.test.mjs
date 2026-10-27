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
const apps = ["templates/cloud", "examples/with-cloud"];

test("Cloud environment files invalidate only the consuming app build", (t) => {
  const fixture = mkdtempSync(join(tmpdir(), "aui-env-cache-"));
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
    JSON.stringify({ name: "env-contract", private: true, packageManager }),
  );
  write("pnpm-workspace.yaml", "packages:\n  - examples/*\n  - templates/*\n");
  write(
    "pnpm-lock.yaml",
    "lockfileVersion: '9.0'\nimporters:\n  .: {}\n  templates/cloud: {}\n  examples/with-cloud: {}\n",
  );
  write("turbo.json", readFileSync(join(repo, "turbo.json")));
  write(".gitignore", readFileSync(join(repo, ".gitignore")));
  const names = new Map();
  for (const directory of apps) {
    const source = join(repo, directory);
    const { name, scripts } = JSON.parse(
      readFileSync(join(source, "package.json")),
    );
    names.set(directory, name);
    write(
      `${directory}/package.json`,
      JSON.stringify({
        name,
        private: true,
        scripts: { build: scripts.build },
      }),
    );
    write(
      `${directory}/src/page.tsx`,
      'export default function Page() { return "Cloud"; }',
    );
    for (const file of ["turbo.json", ".gitignore"]) {
      if (existsSync(join(source, file)))
        write(`${directory}/${file}`, readFileSync(join(source, file)));
    }
  }
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
          ["run", "build", "--dry=json"],
          {
            cwd: fixture,
            encoding: "utf8",
            timeout: 30_000,
            maxBuffer: 4 * 1024 * 1024,
          },
        ),
      ).tasks.map((task) => [task.package, task]),
    );
  for (const directory of apps) {
    const name = names.get(directory);
    for (const file of [
      ".env",
      ".env.local",
      ".env.production",
      ".env.production.local",
    ]) {
      write(
        `${directory}/${file}`,
        "NEXT_PUBLIC_ASSISTANT_BASE_URL=https://before.example.invalid\n",
      );
      const before = plan();
      write(
        `${directory}/${file}`,
        "NEXT_PUBLIC_ASSISTANT_BASE_URL=https://after.example.invalid\n",
      );
      const after = plan();
      assert.notEqual(
        after.get(name).hash,
        before.get(name).hash,
        `${directory}/${file}`,
      );
      assert.ok(file in after.get(name).inputs, file);
      assert.ok(
        "src/page.tsx" in after.get(name).inputs,
        "Inherited source inputs remain hashed",
      );
      for (const other of names.values()) {
        if (other !== name)
          assert.equal(after.get(other).hash, before.get(other).hash, other);
      }
    }
  }
});
