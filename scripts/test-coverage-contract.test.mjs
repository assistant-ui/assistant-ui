import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, globSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const { manifests } = readWorkspaceManifestEntries(root);
const turbo = path.join(root, "node_modules/.bin/turbo");
const turboReady =
  existsSync(turbo) &&
  existsSync(path.join(root, "node_modules/turbo/bin/turbo"));
let plannedTasks;
const executableTasks = () =>
  (plannedTasks ??= JSON.parse(
    execFileSync(
      turbo,
      [
        "run",
        "build",
        "test",
        "test:coverage",
        "typecheck",
        "test:peer-react18",
        "test:types:peer-react18",
        "test:react-compiler",
        "--dry=json",
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    ),
  ).tasks.filter((task) => task.command !== "<NONEXISTENT>"));

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

test(
  "coverage retains the selected workspaces and their build dependencies",
  {
    skip: !turboReady && "Install dependencies before testing the Turbo graph",
  },
  () => {
    const tasks = (name) =>
      new Map(
        executableTasks()
          .filter((task) => task.task === name)
          .map((task) => [task.package, task.dependencies.toSorted()]),
      );
    assert.deepEqual(tasks("test:coverage"), tasks("test"));
  },
);

test(
  "peer configs invalidate their checks without invalidating library builds",
  {
    skip: !turboReady && "Install dependencies before testing the Turbo graph",
  },
  () => {
    let excluded = 0;
    let included = 0;
    for (const { manifest, pkg } of manifests) {
      const directory = path.dirname(manifest);
      const configs = globSync("vitest.peer-*.config.ts", {
        cwd: path.join(root, directory),
      });
      for (const task of executableTasks().filter(
        (task) => task.package === pkg.name,
      )) {
        for (const config of configs) {
          const libraryBuild =
            task.task === "build" && directory.startsWith("packages/");
          assert.equal(
            Object.hasOwn(task.inputs, config),
            !libraryBuild,
            `${task.taskId}: ${config}`,
          );
          if (libraryBuild) excluded++;
          else included++;
        }
      }
    }
    assert(excluded > 0);
    assert(included > 0);
  },
);

test(
  "base configs and the docs source snapshot remain build inputs",
  {
    skip: !turboReady && "Install dependencies before testing the Turbo graph",
  },
  () => {
    const docsBuild = executableTasks().find(
      (task) => task.taskId === "@assistant-ui/docs#build",
    );
    assert(docsBuild);
    for (const task of executableTasks().filter(
      (task) => task.task === "build",
    )) {
      for (const config of globSync("vitest*.config.ts", {
        cwd: path.join(root, task.directory),
      })) {
        if (!config.startsWith("vitest.peer-")) {
          assert(
            Object.hasOwn(task.inputs, config),
            `${task.taskId}: ${config}`,
          );
        }
      }
    }
    for (const config of globSync("packages/*/vitest.peer-*.config.ts", {
      cwd: root,
    })) {
      const input = path
        .relative(docsBuild.directory, config)
        .replaceAll("\\", "/");
      assert(Object.hasOwn(docsBuild.inputs, input), config);
    }
  },
);
