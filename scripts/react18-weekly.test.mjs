import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const workflow = readFileSync(
  new URL("../.github/workflows/react18-weekly.yaml", import.meta.url),
  "utf8",
);
const shared = readFileSync(
  new URL("../.github/workflows/scheduled-failure-issue.yaml", import.meta.url),
  "utf8",
);
const [react18, report] = workflow
  .split("\njobs:\n")[1]
  .split("  react18:\n")[1]
  .split("\n  report:\n");
const suppliedInputs = Object.fromEntries(
  [...report.split("    with:\n")[1].matchAll(/^      (\w+): (.+)$/gm)].map(
    ([, name, value]) => [name, value],
  ),
);

test("the React 18 reporter calls the shared workflow with its declared inputs", () => {
  const declarations = shared.split("    inputs:\n")[1].split("\npermissions:\n")[0];
  const declaredInputs = Object.fromEntries(
    [...declarations.matchAll(/^      (\w+):\n((?:        .*\n)*)/gm)].map(
      ([, name, body]) => [
        name,
        {
          required: /^        required: true$/m.test(body),
          type: body.match(/^        type: (\w+)$/m)?.[1],
        },
      ],
    ),
  );
  assert.deepEqual(declaredInputs, {
    title: { required: true, type: "string" },
    failed: { required: true, type: "boolean" },
  });
  assert.match(
    report,
    /^    uses: \.\/\.github\/workflows\/scheduled-failure-issue\.yaml$/m,
  );
  assert.deepEqual(Object.keys(suppliedInputs).sort(), Object.keys(declaredInputs).sort());
  assert.equal(suppliedInputs.title, "React 18 peer tests are failing");
  assert.equal(report.match(/^    needs: (.+)$/m)?.[1], "react18");
});

test("only uncancelled scheduled runs call the reporter", () => {
  const condition = report.match(/^    if: \$\{\{ (.+) \}\}$/m)?.[1];
  assert.ok(condition);
  for (const [event, cancelled, expected] of [
    ["schedule", false, true],
    ["schedule", true, false],
    ["workflow_dispatch", false, false],
    ["pull_request", false, false],
  ]) {
    assert.equal(
      runInNewContext(condition, {
        github: { event_name: event },
        cancelled: () => cancelled,
      }),
      expected,
    );
  }
});

test("only the reporting job can write issues", () => {
  const header = workflow.split("\njobs:\n")[0];
  assert.match(header, /^permissions:\n  contents: read$/m);
  assert.doesNotMatch(header, /issues: write/);
  assert.match(react18, /^      - name: Install dependencies$/m);
  assert.doesNotMatch(react18, /issues: write/);
  assert.match(report, /^    permissions:\n      issues: write$/m);
});

test("a failed or incomplete React 18 job reports failure and a successful job reports recovery", () => {
  const expression = suppliedInputs.failed.match(/^\$\{\{ (.+) \}\}$/)?.[1];
  assert.ok(expression);
  for (const [result, expected] of [
    ["success", false],
    ["failure", true],
    ["skipped", true],
    ["cancelled", true],
  ]) {
    assert.equal(
      runInNewContext(expression, { needs: { react18: { result } } }),
      expected,
    );
  }
});
