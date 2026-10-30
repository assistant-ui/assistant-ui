import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/template-metrics.yaml", import.meta.url),
  "utf8",
);
const step = (name) =>
  workflow.split(`      - name: ${name}\n`)[1]?.split("\n      - name:")[0];
const command = (name) =>
  step(name)
    .split("        run: ")[1]
    .trim()
    .replace(/^\|\n/, "")
    .replace(/^ {10}/gm, "");
const install = command("Install dependencies");

const installArgs = (templates) => {
  const result = spawnSync("bash", [], {
    input: `pnpm() { printf '%s\\n' "$@"; }\n${install}`,
    env: { ...process.env, BUNDLE_TEMPLATES: templates },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split("\n");
};

test("installs each measured template's dependency graph and aliased UI sources", () => {
  const templates = workflow.match(/BUNDLE_TEMPLATES: "([^"]+)"/)[1];
  assert.deepEqual(installArgs(templates), [
    "install",
    "--frozen-lockfile",
    "--filter=.",
    "--filter=@assistant-ui/ui...",
    "--filter=@assistant-ui/react-devtools...",
    ...templates
      .split(/\s+/)
      .map((name) => `--filter={./templates/${name}}...`),
  ]);
});

test("install selection follows BUNDLE_TEMPLATES without a second hardcoded list", () => {
  const args = installArgs("minimal future-template");
  assert.ok(args.includes("--filter={./templates/minimal}..."));
  assert.ok(args.includes("--filter={./templates/future-template}..."));
  assert.ok(!args.some((arg) => arg.includes("/default")));
});

test("the selection contract runs in the workflow and triggers its own changes", () => {
  assert.match(workflow, /- "scripts\/template-metrics-install\.test\.mjs"/);
  assert.match(
    workflow,
    /run: node --test scripts\/template-metrics-install\.test\.mjs/,
  );
  assert.match(workflow, /cache: false/);
});

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "template-metrics-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, source) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), source);
  };
  for (const name of ["default", "minimal", "nuxt"]) {
    write(`templates/${name}/package.json`, JSON.stringify({ name }));
    write(`templates/${name}/app.ts`, "export const title = 'Chat';\n");
  }
  mkdirSync(path.join(root, "scripts"));
  cpSync(
    new URL("./template-metrics.mjs", import.meta.url),
    path.join(root, "scripts/template-metrics.mjs"),
  );
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const commit = () => {
    git("add", ".");
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.com",
      "commit",
      "-qm",
      "fixture",
    );
  };
  git("init", "-q");
  commit();
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  return { root, write, git, commit };
}

function buildsBundles(root, templates = "default minimal") {
  let run;
  const output = path.join(root, "outputs");
  if (step("Detect bundle inputs")) {
    writeFileSync(output, "");
    execFileSync(
      "bash",
      ["-e", "-o", "pipefail", "-c", command("Detect bundle inputs")],
      {
        cwd: root,
        env: {
          ...process.env,
          BUNDLE_TEMPLATES: templates,
          GITHUB_OUTPUT: output,
        },
        stdio: "pipe",
      },
    );
    run = readFileSync(output, "utf8").trim();
    assert.match(run, /^run=(true|false)$/);
  }
  const condition = step("Build templates (bundle subset)").match(
    /        if: (.*)/,
  )?.[1];
  if (!condition) return true;
  assert.equal(condition, "steps.bundles.outputs.run == 'true'");
  return run === "run=true";
}

test("unrelated template edits skip bundle builds while the selected subset still builds", (t) => {
  const { root, write, commit } = fixture(t);
  write("templates/nuxt/app.ts", "export const title = 'Nuxt chat';\n");
  commit();
  assert.equal(buildsBundles(root), false);
  assert.equal(buildsBundles(root, "nuxt"), true);
});

for (const file of [
  "templates/default/app.ts",
  "templates/minimal/app.ts",
  "packages/ui/src/components/native/thread.test.tsx",
  "packages/ui/src/components/vue/thread.vue",
  "pnpm-lock.yaml",
  "scripts/template-metrics.mjs",
  "templates/shared/config.ts",
  "templates/nuxt/package.json",
]) {
  test(`bundle builds retain ${file} alongside unrelated template edits`, (t) => {
    const { root, write, commit } = fixture(t);
    write("templates/nuxt/app.ts", "export const title = 'Nuxt chat';\n");
    if (file.endsWith("package.json"))
      write(file, JSON.stringify({ name: "nuxt", private: true }));
    else if (file === "scripts/template-metrics.mjs") {
      write(file, `${readFileSync(path.join(root, file), "utf8")}\n`);
    } else write(file, "export const changed = true;\n");
    commit();
    assert.equal(buildsBundles(root), true);
  });
}

test("renaming a measured source into an unrelated template still builds bundles", (t) => {
  const { root, git, commit } = fixture(t);
  git("mv", "templates/default/app.ts", "templates/nuxt/moved app.ts");
  commit();
  assert.equal(buildsBundles(root), true);
});

test("empty and unknown bundle subsets fail instead of skipping builds", (t) => {
  const { root } = fixture(t);
  assert.throws(() => buildsBundles(root, ""));
  assert.throws(() => buildsBundles(root, "missing-template"));
});

test("an unavailable merge base fails instead of silently skipping bundle builds", (t) => {
  const { root, git } = fixture(t);
  git("update-ref", "-d", "refs/remotes/origin/main");
  assert.throws(() => buildsBundles(root));
});

test("only dependency setup and bundle builds are conditional; LOC measurement and reporting always run", () => {
  for (const name of [
    "Setup pnpm and node.js",
    "Install dependencies",
    "Build templates (bundle subset)",
  ]) {
    assert.match(step(name), /if: steps\.bundles\.outputs\.run == 'true'/);
  }
  for (const name of [
    "Compare against merge-base",
    "Measure metrics",
    "Build report",
    "Post / update PR comment",
  ]) {
    assert.doesNotMatch(step(name), /\n        if:/);
  }
});

test("an unmeasured template still contributes LOC, a report, and footprint failures", (t) => {
  const { root, write, commit } = fixture(t);
  write(
    "templates/nuxt/app.ts",
    Array.from(
      { length: 302 },
      (_, i) => `export const value${i} = ${i};`,
    ).join("\n") + "\n",
  );
  commit();
  assert.equal(buildsBundles(root), false);
  const metrics = (...args) =>
    spawnSync(process.execPath, ["scripts/template-metrics.mjs", ...args], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        MAX_LOC_INCREASE: "50",
        MAX_LOC_HARD_INCREASE: "300",
      },
    });
  for (const args of [
    ["measure", ".", "head.json"],
    ["measure-base", ".", "base.json"],
    ["report", "base.json", "head.json", "report.md", "comment.txt"],
  ]) {
    const result = metrics(...args);
    assert.equal(result.status, 0, result.stderr);
  }
  const measured = JSON.parse(
    readFileSync(path.join(root, "head.json"), "utf8"),
  );
  assert.deepEqual(
    measured.map(({ name }) => name),
    ["default", "minimal", "nuxt"],
  );
  assert.equal(measured.find(({ name }) => name === "nuxt").ownLoc, 302);
  assert.ok(measured.every(({ bundleGzip }) => bundleGzip === null));
  assert.match(
    readFileSync(path.join(root, "report.md"), "utf8"),
    /\| nuxt \|.*302/,
  );
  assert.equal(readFileSync(path.join(root, "comment.txt"), "utf8"), "post");
  const check = metrics("check", ".");
  assert.equal(check.status, 1);
  assert.match(check.stderr, /nuxt: \+301 LOC > 300/);
});

test("Vue component growth counts toward the template footprint limit", (t) => {
  const { root, write, git, commit } = fixture(t);
  const file = "templates/nuxt/app.vue";
  write(file, "<template>\n</template>\n");
  commit();
  git("update-ref", "refs/remotes/origin/main", "HEAD");

  write(
    file,
    "<template>\n" +
      Array.from(
        { length: 301 },
        (_, i) => `  <p>Example message ${i}</p>\n`,
      ).join("") +
      "</template>\n",
  );
  commit();

  const check = spawnSync(
    process.execPath,
    ["scripts/template-metrics.mjs", "check", "."],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, MAX_LOC_HARD_INCREASE: "300" },
    },
  );
  assert.equal(check.status, 1, check.stdout + check.stderr);
  assert.match(check.stderr, /nuxt: \+301 LOC > 300/);
});
