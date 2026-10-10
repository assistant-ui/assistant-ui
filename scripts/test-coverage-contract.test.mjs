import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const coverageWorkflow = readFileSync(
  path.join(root, ".github/workflows/test-coverage.yaml"),
  "utf8",
);
const coverageSteps = coverageWorkflow.split(/^      - name: /m).slice(1);
const detectorStep = coverageSteps.find((step) =>
  step.startsWith("Detect coverage inputs\n"),
);
assert(detectorStep);
const detectorScript = detectorStep
  .split("        run: |\n")[1]
  .replace(/^ {10}/gm, "");

function coverageFixture(t) {
  const cwd = mkdtempSync(path.join(tmpdir(), "coverage-routing-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-q");
  git("config", "user.name", "Coverage Fixture");
  git("config", "user.email", "coverage@example.test");
  let revision = 0;
  const commit = (file) => {
    const destination = path.join(cwd, file);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, String(++revision));
    git("add", file);
    git("commit", "-qm", "fixture");
    return git("rev-parse", "HEAD");
  };
  const base = commit("README.md");
  return {
    base,
    commit,
    run(event, mergeBase = base) {
      const output = path.join(cwd, "output");
      writeFileSync(output, "");
      const script = detectorScript
        .replaceAll("${{ github.event_name }}", event)
        .replaceAll("${{ github.event.merge_group.base_sha }}", mergeBase);
      execFileSync("bash", ["-c", script], {
        cwd,
        env: { ...process.env, GITHUB_OUTPUT: output },
        stdio: "pipe",
      });
      return readFileSync(output, "utf8").trim();
    },
  };
}

for (const event of ["pull_request", "merge_group"]) {
  test(`coverage skips root Markdown changes for ${event}`, (t) => {
    const fixture = coverageFixture(t);
    fixture.commit("README.md");
    assert.equal(fixture.run(event), "run=false");
  });
  for (const file of [
    "packages/core/src/index.ts",
    "apps/docs/app/page.tsx",
    "examples/minimal/app/page.tsx",
    "templates/default/app/api/chat/route.ts",
    "evals/src/runner.ts",
    "scripts/coverage-summary.mjs",
    "scripts/coverage-summary.test.mjs",
    "scripts/test-coverage-contract.test.mjs",
    "scripts/lib/workspace.mjs",
    "turbo.json",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    ".github/workflows/test-coverage.yaml",
    ".github/workflows/code-quality.yaml",
  ]) {
    test(`coverage runs for ${file} in ${event}`, (t) => {
      const fixture = coverageFixture(t);
      fixture.commit(file);
      assert.equal(fixture.run(event), "run=true");
    });
  }
}

test("coverage uses the full merge group range and the PR first parent", (t) => {
  const fixture = coverageFixture(t);
  fixture.commit("packages/core/src/index.ts");
  fixture.commit("README.md");
  assert.equal(fixture.run("pull_request"), "run=false");
  assert.equal(fixture.run("merge_group"), "run=true");
});

test("coverage runs when the comparison base is unavailable", (t) => {
  const fixture = coverageFixture(t);
  assert.equal(fixture.run("pull_request"), "run=true");
  assert.equal(fixture.run("merge_group", "f".repeat(40)), "run=true");
  assert.equal(fixture.run("merge_group", ""), "run=true");
  assert.equal(fixture.run("push"), "run=true");
  assert.equal(fixture.run("workflow_dispatch"), "run=true");
});

test("coverage reports for all PRs and merge groups while gating expensive steps", () => {
  const triggers = coverageWorkflow.split("\npermissions:")[0];
  const prTrigger = triggers.match(
    /^  pull_request:\n([\s\S]*?)(?=^  \w+:)/m,
  )?.[1];
  assert(prTrigger);
  assert.doesNotMatch(prTrigger, /paths(?:-ignore)?:/);
  assert.match(triggers, /merge_group:\s+types: \[checks_requested\]/);
  assert.match(coverageSteps[0], /fetch-depth:.*merge_group.*&& '0' \|\| '2'/);
  assert(coverageSteps.length > 2);
  for (const step of coverageSteps.slice(2)) {
    assert.match(
      step,
      /if: (?:always\(\) && )?steps\.inputs\.outputs\.run == 'true'/,
      step.split("\n")[0],
    );
  }
  assert.match(
    coverageWorkflow,
    /node --test scripts\/test-coverage-contract\.test\.mjs scripts\/coverage-summary\.test\.mjs/,
  );
});

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
