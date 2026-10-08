import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const { manifests } = readWorkspaceManifestEntries(root);

function commands(script, scripts) {
  return script.split(/\s*&&\s*/).flatMap((command) => {
    const alias = /^pnpm run ([\w:-]+)$/.exec(command);
    if (alias) return commands(scripts[alias[1]], scripts);
    return command.replace(/ --coverage(?:\.[\w.]+=[^\s]+)?/g, "");
  });
}

for (const { pkg } of manifests) {
  if (!pkg.scripts?.test) continue;
  test(`${pkg.name} coverage preserves its complete test command`, () => {
    assert.equal(typeof pkg.scripts["test:coverage"], "string");
    assert.deepEqual(
      commands(pkg.scripts["test:coverage"], pkg.scripts),
      commands(pkg.scripts.test, pkg.scripts),
    );
  });
}

test("coverage retains the selected workspaces and their build dependencies", () => {
  const plan = JSON.parse(
    execFileSync(
      `${root}node_modules/.bin/turbo`,
      ["run", "test", "test:coverage", "--dry=json"],
      { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    ),
  );
  const tasks = (name) =>
    new Map(
      plan.tasks
        .filter(
          (task) => task.task === name && task.command !== "<NONEXISTENT>",
        )
        .map((task) => [task.package, task.dependencies.toSorted()]),
    );
  assert.deepEqual(tasks("test:coverage"), tasks("test"));
});
