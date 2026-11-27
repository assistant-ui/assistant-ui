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
import { coverageShards } from "./coverage-shards.mjs";
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
  .split("\n  shards:")[0]
  .replace(/^ {10}/gm, "");
const pushPaths = coverageWorkflow.match(
  /^  push:\n[\s\S]*?^    paths:\n((?:      - .*\n)+)/m,
)?.[1];
assert(pushPaths);
const pushPatterns = [...pushPaths.matchAll(/- "([^"]+)"/g)].map(
  (match) => match[1],
);
const sharedTestInputs = JSON.parse(
  readFileSync(path.join(root, "turbo.json"), "utf8"),
)
  .tasks["test:coverage"].inputs.filter((input) =>
    input.startsWith("$TURBO_ROOT$/"),
  )
  .flatMap((input) =>
    globSync(input.slice("$TURBO_ROOT$/".length), { cwd: root }),
  )
  .map((input) => input.replaceAll("\\", "/"))
  .filter((input) => /\.[cm]?[jt]sx?$/.test(input));
assert(
  sharedTestInputs.length > 0,
  "shared executable test inputs are discovered",
);

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
    git,
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

function matchesMainPush(file) {
  return pushPatterns.reduce((included, pattern) => {
    const negative = pattern.startsWith("!");
    return path.posix.matchesGlob(file, negative ? pattern.slice(1) : pattern)
      ? !negative
      : included;
  }, false);
}

test("coverage skips root Markdown changes on main, PRs and merge groups", (t) => {
  const fixture = coverageFixture(t);
  fixture.commit("README.md");
  assert.equal(matchesMainPush("README.md"), false);
  for (const event of ["pull_request", "merge_group"]) {
    assert.equal(fixture.run(event), "run=false", event);
  }
});

const snapshot = "api-surface/assistant-ui__react.ts";

for (const event of ["pull_request", "merge_group"]) {
  test(`coverage runs for snapshot edits, renames and deletions in ${event}`, (t) => {
    const fixture = coverageFixture(t);
    fixture.commit("api-surface/assistant-ui__core.ts");
    const added = fixture.commit(snapshot);
    const edited = fixture.commit(snapshot);
    assert.equal(fixture.run(event, added), "run=true");

    fixture.git("mv", snapshot, "old-snapshot.txt");
    fixture.git("commit", "-qm", "move snapshot out of api-surface");
    assert.equal(fixture.run(event, edited), "run=true");

    const restored = fixture.commit(snapshot);
    fixture.git("rm", snapshot);
    fixture.git("commit", "-qm", "delete snapshot");
    assert.equal(fixture.run(event, restored), "run=true");
  });
}

test("a snapshot change triggers coverage on main", () => {
  assert.equal(matchesMainPush(snapshot), true);
});

for (const file of [
  "api-surface/package.json",
  "api-surface/nested/example.ts",
]) {
  test(`coverage skips ${file} on main, PRs and merge groups`, (t) => {
    const fixture = coverageFixture(t);
    fixture.commit(file);
    assert.equal(matchesMainPush(file), false);
    for (const event of ["pull_request", "merge_group"]) {
      assert.equal(fixture.run(event), "run=false", event);
    }
  });
}

for (const file of [
  "packages/core/src/index.ts",
  "apps/docs/app/page.tsx",
  "examples/minimal/app/page.tsx",
  "templates/default/app/api/chat/route.ts",
  "evals/src/runner.ts",
  "python/assistant-stream/src/assistant_stream/create_run.py",
  "python/assistant-stream/README.md",
  "scripts/coverage-shards.mjs",
  "scripts/coverage-shards.test.mjs",
  "scripts/coverage-runtimes.mjs",
  "scripts/coverage-runtimes.test.mjs",
  "scripts/coverage-runtimes.json",
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
  test(`coverage runs for ${file} in PRs and merge groups`, (t) => {
    const fixture = coverageFixture(t);
    fixture.commit(file);
    for (const event of ["pull_request", "merge_group"]) {
      assert.equal(fixture.run(event), "run=true", event);
    }
  });
}

for (const file of [".gitignore", ...sharedTestInputs]) {
  for (const event of ["pull_request", "merge_group"]) {
    test(`test input ${file} runs coverage for ${event}`, (t) => {
      const fixture = coverageFixture(t);
      fixture.commit(file);
      assert.equal(fixture.run(event), "run=true");
    });
  }

  test(`test input ${file} triggers coverage on main`, () => {
    assert.equal(matchesMainPush(file), true);
  });
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
  assert.match(
    coverageWorkflow,
    /needs: plan\n    if: needs\.plan\.outputs\.run == 'true'/,
  );
  assert.match(coverageWorkflow, /fail-fast: false/);
  assert.match(coverageWorkflow, /needs: \[plan, shards\]\n    if: always\(\)/);
  assert.match(
    coverageWorkflow,
    /node --test scripts\/test-coverage-contract\.test\.mjs scripts\/coverage-summary\.test\.mjs scripts\/coverage-shards\.test\.mjs/,
  );
});

test("the push trigger watches the paths the detector compares", () => {
  const detectorPaths = detectorScript
    .split('git diff --quiet "$BASE" HEAD -- \\\n')[1]
    ?.split("; then")[0];
  assert(detectorPaths);
  assert.deepEqual(
    pushPaths
      .trim()
      .split("\n")
      .map((line) => line.replace(/^\s*- "(.*)"$/, "$1").replace(/\/\*\*$/, ""))
      .sort(),
    detectorPaths
      .split("\\\n")
      .map((line) => line.trim().replace(/^':\(glob\)(.+)'$/, "$1"))
      .filter(Boolean)
      .sort(),
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

test(
  "the durable example runs in the normal test and coverage graph",
  {
    skip: !turboReady && "Install dependencies before testing the Turbo graph",
  },
  () => {
    const name = "with-pydantic-ai-durable";
    const { pkg } = manifests.find(({ pkg }) => pkg.name === name);
    assert.equal(typeof pkg.scripts.test, "string");
    assert.equal(typeof pkg.scripts["test:coverage"], "string");
    assert.deepEqual(
      coverageShards(root)
        .flat()
        .filter((pkg) => pkg === name),
      [name],
    );
    for (const task of ["test", "test:coverage"]) {
      assert.ok(
        executableTasks().some((entry) => entry.taskId === `${name}#${task}`),
        `${name}#${task} must execute`,
      );
    }
  },
);

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
      (task) => task.taskId === "@assistant-ui/docs-site#build",
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

test("the required coverage check rejects failed, cancelled, or missing shards", () => {
  const step = coverageSteps.find((step) =>
    step.startsWith("Verify coverage jobs\n"),
  );
  const script = step.split("        run: |\n")[1].replace(/^ {10}/gm, "");
  for (const plan of ["success", "failure", "cancelled", "skipped"]) {
    for (const run of ["true", "false", ""]) {
      for (const shard of ["success", "failure", "cancelled", "skipped"]) {
        const shouldPass =
          plan === "success" &&
          ((run === "true" && shard === "success") ||
            (run === "false" && shard === "skipped"));
        const execute = () =>
          execFileSync("bash", ["-e", "-c", script], {
            env: {
              ...process.env,
              PLAN_RESULT: plan,
              RUN: run,
              SHARD_RESULT: shard,
            },
            stdio: "pipe",
          });
        if (shouldPass) assert.doesNotThrow(execute);
        else assert.throws(execute);
      }
    }
  }
});

const jobSteps = (job) =>
  new Map(
    coverageWorkflow
      .split(`\n  ${job}:\n`)[1]
      .split(/\n  [a-z]+:\n/)[0]
      .split(/^      - name: /m)
      .slice(1)
      .map((step) => [step.split("\n")[0], step]),
  );

test("pull requests split coverage once from main's restored caches, and both shards run that split", () => {
  const plan = jobSteps("plan");
  const shards = jobSteps("shards");
  const save = shards.get("Save the Turbo cache for pull requests");
  assert(save);
  assert.match(save, /if: github\.event_name == 'push' && !cancelled\(\)\n/);
  assert.match(save, /uses: actions\/cache\/save@/);
  assert.match(save, /^ {10}path: \.turbo\/cache$/m);
  const key = (text) => text.match(/^ {10}key: (.+)$/m)?.[1];
  assert.doesNotMatch(
    coverageWorkflow,
    /fail-on-cache-miss|lookup-only|turbo-cache-/,
  );
  for (const [steps, gate, consumer] of [
    [
      plan,
      "github.event_name == 'pull_request' && steps.inputs.outputs.run == 'true'",
      "Split coverage workspaces",
    ],
    [shards, "github.event_name == 'pull_request'", "Build packages"],
  ]) {
    const names = [...steps.keys()];
    for (const shard of [0, 1]) {
      const name = `Restore main's coverage Turbo cache, shard ${shard}`;
      const restore = steps.get(name);
      assert(restore, name);
      assert(restore.includes(`\n        if: ${gate}\n`), name);
      assert.match(restore, /uses: actions\/cache\/restore@/);
      assert.match(restore, /^ {10}path: \.turbo\/cache$/m);
      assert.equal(
        key(restore),
        key(save).replace("${{ matrix.shard }}", String(shard)),
      );
      assert.equal(
        restore.match(/^ {10}restore-keys: (.+)$/m)?.[1],
        key(restore).replace("${{ github.sha }}", ""),
      );
      assert(names.indexOf(name) < names.indexOf(consumer), name);
    }
  }

  const planNames = [...plan.keys()];
  const setup = plan.get("Setup pnpm and node.js");
  const split = plan.get("Split coverage workspaces");
  assert(setup && split);
  assert.match(setup, /^ {10}install: false$/m);
  assert(
    planNames.indexOf("Setup pnpm and node.js") <
      planNames.indexOf("Split coverage workspaces"),
  );
  assert.doesNotMatch(
    coverageWorkflow.split("\n  plan:\n")[1].split("\n  shards:\n")[0],
    /pnpm install/,
  );
  assert.match(
    coverageWorkflow,
    /^ {6}shards: \$\{\{ steps\.split\.outputs\.shards \}\}$/m,
  );
  assert.match(split, /^ {8}id: split$/m);
  assert.match(split, /^ {8}if: steps\.inputs\.outputs\.run == 'true'$/m);
  assert.match(split, /^ {10}if \[ -d \.turbo\/cache \]; then$/m);
  assert.match(
    split,
    /pnpm --filter=\. list turbo --lockfile-only --depth=0 --json/,
  );
  assert.match(
    split,
    /pnpm dlx "turbo@\$turbo" run test:coverage --dry=json --cache=local:r > "\$RUNNER_TEMP\/coverage-dry-run\.json"/,
  );
  assert.match(
    split,
    /shards=\$\(node scripts\/coverage-shards\.mjs --plan "\$RUNNER_TEMP\/coverage-dry-run\.json"\)/,
  );
  assert.match(split, /shards=\$\(node scripts\/coverage-shards\.mjs --plan\)/);
  assert.match(split, /echo "shards=\$shards" >> "\$GITHUB_OUTPUT"/);

  const shardsJob = coverageWorkflow
    .split("\n  shards:\n")[1]
    .split("\n  coverage:\n")[0];
  const shardRedis = shardsJob.match(/^ {6}REDIS_URL: (.+)$/m)?.[1];
  assert(shardRedis);
  assert.equal(split.match(/^ {10}REDIS_URL: (.+)$/m)?.[1], shardRedis);
  assert.doesNotMatch(shardsJob, /--plan|--dry=json/);
  for (const name of [
    "Build packages",
    "Run assigned packages with coverage",
  ]) {
    const step = shards.get(name);
    assert(step, name);
    assert.match(
      step,
      /^ {10}COVERAGE_SHARDS: \$\{\{ needs\.plan\.outputs\.shards \}\}$/m,
    );
    assert.match(
      step,
      /node scripts\/coverage-shards\.mjs "\$\{\{ matrix\.shard \}\}"/,
    );
  }
  const shardNames = [...shards.keys()];
  assert(
    shardNames.indexOf("Save the Turbo cache for pull requests") >
      shardNames.indexOf("Run assigned packages with coverage"),
  );
});

test("the required coverage check fails unless the planned split ran every coverage workspace exactly once", () => {
  const steps = jobSteps("coverage");
  const names = [...steps.keys()];
  const verify = steps.get("Verify every coverage workspace ran");
  assert(verify);
  assert(
    names.indexOf("Checkout code repository") <
      names.indexOf("Verify every coverage workspace ran"),
  );
  assert.match(
    steps.get("Checkout code repository"),
    /if: needs\.plan\.outputs\.run == 'true'\n/,
  );
  assert.match(verify, /if: needs\.plan\.outputs\.run == 'true'\n/);
  assert.match(
    verify,
    /^ {10}SHARDS: \$\{\{ needs\.plan\.outputs\.shards \}\}$/m,
  );
  const command = verify.match(/^ {8}run: (.+)$/m)?.[1];
  assert.equal(command, 'node scripts/coverage-shards.mjs --verify "$SHARDS"');
  const execute = (shards) => () =>
    execFileSync("bash", ["-e", "-c", command], {
      cwd: root,
      env: { ...process.env, SHARDS: JSON.stringify(shards) },
      stdio: "pipe",
    });
  const [first, second] = coverageShards(root);
  assert.doesNotThrow(execute([first, second]));
  assert.throws(execute([first.slice(1), second]), /missing/);
  assert.throws(execute([first, [...second, first[0]]]), /duplicated/);
  assert.throws(execute([[...first, ...second], []]), /non-empty/);
});

test(
  "coverage shards preserve every executable Turbo coverage task exactly once",
  {
    skip: !turboReady && "Install dependencies before testing the Turbo graph",
  },
  () => {
    const baseline = executableTasks()
      .filter((task) => task.task === "test:coverage")
      .map((task) => task.taskId)
      .sort();
    const selected = coverageShards(root)
      .flatMap((names) =>
        JSON.parse(
          execFileSync(
            turbo,
            [
              "run",
              "test:coverage",
              "--dry=json",
              ...names.map((name) => `--filter=${name}`),
            ],
            {
              cwd: root,
              encoding: "utf8",
              maxBuffer: 32 * 1024 * 1024,
            },
          ),
        )
          .tasks.filter(
            (task) =>
              task.task === "test:coverage" && task.command !== "<NONEXISTENT>",
          )
          .map((task) => task.taskId),
      )
      .sort();
    assert.deepEqual(selected, baseline);
  },
);
