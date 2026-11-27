import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { posixPath, readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const read = (file) => readFileSync(path.join(repoRoot, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
const workflow = read(".github/workflows/code-quality.yaml");

// Suites the workflow runs through an npm script in a job that also runs on a
// push to `main`, so a change to a file they run has to trigger that push.
const SUITES = ["api-surface:test"];

const pushPaths = (() => {
  const trigger = workflow
    .split("\n  push:\n")[1]
    ?.split("\n  pull_request:")[0];
  assert.ok(trigger, "the workflow has a push trigger");
  return [...trigger.matchAll(/- "([^"]+)"/g)].map((match) => match[1]);
})();

const triggers = (file) =>
  pushPaths.some((pattern) => path.posix.matchesGlob(file, pattern));

const suiteTargets = (script) =>
  [...(packageJson.scripts[script] ?? "").matchAll(/node --test ([^&|;\n]+)/g)]
    .flatMap((match) => match[1].trim().split(/\s+/))
    .map((target) => target.replace(/^"|"$/g, ""))
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

test("main pushes cover the manifest and source of every typechecked workspace", () => {
  const { manifests } = readWorkspaceManifestEntries(repoRoot);
  const inputs = manifests
    .filter(({ pkg }) => pkg.scripts?.typecheck)
    .flatMap(({ manifest }) => {
      const file = posixPath(manifest);
      return [file, path.posix.join(path.posix.dirname(file), "src/index.ts")];
    });
  assert.ok(inputs.length > 0, "expected workspaces with a typecheck script");
  assert.deepEqual(
    inputs.filter((file) => !triggers(file)),
    [],
  );
});

for (const file of [".oxlintrc.json", ".oxfmtrc.json"]) {
  test(`a main push changing only ${file} runs Code Quality`, () => {
    assert.equal(triggers(file), true);
  });
}

test("unrelated root Markdown stays outside the main push filter", () => {
  assert.equal(triggers("README.md"), false);
});

// An event condition must lead the expression as one `github.event_name ==`
// comparison or an `||` group of them, optionally followed by `&& <rest>`
// where the rest never mentions the event name and has no top-level `||`.
// Anything else (negation, `!=`, two event comparisons joined by `&&`) fails
// instead of guessing.
const eventEquality = "github\\.event_name == '\\w+'";
const eventGroup = `${eventEquality}(?: \\|\\| ${eventEquality})*`;
const eventCondition = new RegExp(
  `^(?:(${eventGroup})|\\((${eventGroup})\\)(?: && (.+))?|(${eventEquality}) && (.+))$`,
);
const runsOn = (condition = "", event) => {
  const expression = condition.replace(/^\$\{\{\s*|\s*\}\}$/g, "").trim();
  if (!expression.includes("github.event_name")) return true;
  const [, whole, grouped, groupRest, single, singleRest] =
    expression.match(eventCondition) ?? [];
  const rest = groupRest ?? singleRest ?? "";
  assert.ok(
    (whole ?? grouped ?? single) &&
      !rest.includes("github.event_name") &&
      !rest.includes("||"),
    `unsupported event condition: ${condition}`,
  );
  return [...(whole ?? grouped ?? single).matchAll(/'(\w+)'/g)]
    .map(([, name]) => name)
    .includes(event);
};

test("the shared helper guard reads only leading event equality conditions", () => {
  assert.equal(runsOn(undefined, "pull_request"), true);
  assert.equal(runsOn("${{ !cancelled() }}", "merge_group"), true);
  const either =
    "(github.event_name == 'pull_request' || github.event_name == 'merge_group') && steps.x.outputs.run == 'true'";
  assert.equal(runsOn(either, "merge_group"), true);
  assert.equal(runsOn(either, "push"), false);
  assert.equal(
    runsOn(
      "github.event_name == 'pull_request' || github.event_name == 'merge_group'",
      "merge_group",
    ),
    true,
  );
  assert.equal(runsOn("github.event_name == 'push'", "pull_request"), false);
  assert.equal(
    runsOn(
      "github.event_name == 'pull_request' && steps.x.outputs.run == 'true'",
      "pull_request",
    ),
    true,
  );
  for (const unsupported of [
    "github.event_name != 'pull_request'",
    "${{ !(github.event_name == 'pull_request' || github.event_name == 'merge_group') }}",
    "github.event_name == 'pull_request' && github.event_name == 'merge_group'",
    "github.event_name == 'push' && steps.x.outputs.run == 'true' || always()",
  ]) {
    assert.throws(
      () => runsOn(unsupported, "pull_request"),
      /unsupported event condition/,
    );
  }
});

test("a required check runs every shared helper test on pull requests and in the merge queue", () => {
  const required = new Set(
    JSON.parse(read(".github/review-policy.json")).requiredChecks.map(
      ({ context }) => context,
    ),
  );
  const jobs = workflow.split("\njobs:\n")[1]?.split(/\n {2}[\w-]+:\n/);
  assert.ok(jobs, "the workflow has jobs");
  const helpers = readdirSync(path.join(repoRoot, "scripts/lib"))
    .filter((file) => file.endsWith(".test.mjs"))
    .map((file) => `scripts/lib/${file}`);
  for (const event of ["pull_request", "merge_group"]) {
    const globs = jobs
      .filter((job) => required.has(job.match(/^ {4}name: (.+)$/m)?.[1]))
      .filter((job) => runsOn(job.match(/^ {4}if: (.+)$/m)?.[1], event))
      .flatMap((job) => job.split("\n      - ").slice(1))
      .filter((step) => runsOn(step.match(/^ {8}if: (.+)$/m)?.[1], event))
      .flatMap((step) =>
        [
          ...step.matchAll(
            /^ {8}run: (?:node --test ([^\n]+)|(?:pnpm run|node --run) ([\w:-]+))/gm,
          ),
        ].flatMap(([, targets, script]) =>
          script
            ? suiteTargets(script)
            : targets
                .trim()
                .split(/\s+/)
                .map((target) => target.replace(/^"|"$/g, "")),
        ),
      );
    assert.deepEqual(
      helpers.filter(
        (file) => !globs.some((glob) => path.posix.matchesGlob(file, glob)),
      ),
      [],
      `${event}: run these in a job listed under \`requiredChecks\` in .github/review-policy.json`,
    );
  }
});

test("Workspace Ranges and Review Policy Scripts split the shared helper tests without overlap", () => {
  const job = workflow
    .split("\n  workspace-ranges:\n")[1]
    ?.split(/\n  [\w-]+:\n/)[0];
  assert.ok(job, "the workflow has a Workspace Ranges job");
  const steps = [
    ...job.matchAll(
      /\n {8}(?:if: github\.event_name == '(\w+)'\n {8})?run: node --test "(scripts\/lib\/[^"]+)"/g,
    ),
  ].map(([, event, glob]) => ({ event, glob }));
  const reviewPolicy = suiteTargets("review-policy:test");
  const reviewPolicyJob = workflow
    .split("\n  review-policy:\n")[1]
    ?.split(/\n  [\w-]+:\n/)[0];
  assert.ok(reviewPolicyJob, "the workflow has a Review Policy Scripts job");
  const reviewPolicyEvents = [
    ...(reviewPolicyJob.match(/\n {4}if: ([^\n]+)/)?.[1] ?? "").matchAll(
      /github\.event_name == '(\w+)'/g,
    ),
  ].map(([, event]) => event);
  const helpers = readdirSync(path.join(repoRoot, "scripts/lib"))
    .filter((file) => file.endsWith(".test.mjs"))
    .map((file) => `scripts/lib/${file}`);
  for (const event of ["push", "pull_request", "merge_group"]) {
    const globs = [
      ...steps.filter((step) => !step.event || step.event === event),
      ...(reviewPolicyEvents.includes(event)
        ? reviewPolicy.map((glob) => ({ glob }))
        : []),
    ].map((step) => step.glob);
    for (const file of helpers) {
      assert.equal(
        globs.filter((glob) => path.posix.matchesGlob(file, glob)).length,
        1,
        `${event}: ${file}`,
      );
    }
  }
});
