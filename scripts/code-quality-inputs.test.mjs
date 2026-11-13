import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const read = (file) => readFileSync(path.join(repoRoot, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
const workflow = read(".github/workflows/code-quality.yaml");

// The suites this workflow runs through an npm script. A test file listed here
// is one the workflow executes, so a change to it has to re-run the workflow --
// on a pull request and on `main` alike.
const SUITES = ["api-surface:test", "review-policy:test"];

const pushPaths = (() => {
  const trigger = workflow
    .split("\n  push:\n")[1]
    ?.split("\n  pull_request:")[0];
  assert.ok(trigger, "the workflow has a push trigger");
  return [...trigger.matchAll(/- "([^"]+)"/g)].map((match) => match[1]);
})();

const triggers = (file) =>
  pushPaths.some(
    (entry) =>
      entry === file ||
      (entry.endsWith("/**") && file.startsWith(entry.slice(0, -2))),
  );

const suiteTargets = (script) =>
  [...(packageJson.scripts[script] ?? "").matchAll(/node --test ([^&|;\n]+)/g)]
    .flatMap((match) => match[1].trim().split(/\s+/))
    .filter((file) => file.endsWith(".mjs"));

test("the workflow still runs every suite this guard covers", () => {
  for (const suite of SUITES) {
    assert.match(
      workflow,
      new RegExp(
        `run: (?:pnpm run|node --run) ${suite.replace(":", "\\:")}\\b`,
      ),
      `the workflow no longer runs \`${suite}\`; update SUITES`,
    );
  }
});

test("a change to a file those suites run re-runs Code Quality on main", () => {
  const untriggered = [];
  for (const suite of SUITES) {
    for (const target of suiteTargets(suite)) {
      // Both the test and the script it exercises: either one can regress the
      // suite without the workflow noticing.
      for (const file of [target, target.replace(/\.test\.mjs$/, ".mjs")]) {
        if (!triggers(file)) {
          untriggered.push(`${file} (\`${suite}\`)`);
        }
      }
    }
  }
  assert.deepEqual(
    untriggered,
    [],
    "add these to `on.push.paths` in .github/workflows/code-quality.yaml",
  );
});
