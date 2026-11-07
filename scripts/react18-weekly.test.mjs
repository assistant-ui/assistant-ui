import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const workflow = readFileSync(
  new URL("../.github/workflows/react18-weekly.yaml", import.meta.url),
  "utf8",
);
const reporter = workflow.split(
  "      - name: Report to the tracking issue\n",
)[1];
const script = reporter
  .split("          script: |\n")[1]
  .split("\n")
  .map((line) => line.replace(/^            /, ""))
  .join("\n");

async function report(types, tests, open = true) {
  const calls = [];
  const steps = { types: { outcome: types }, tests: { outcome: tests } };
  const env = Object.fromEntries(
    [...reporter.matchAll(/^          (\w+): \$\{\{ (.+) \}\}$/gm)].map(
      ([, key, expression]) => [
        key,
        String(runInNewContext(expression, { steps })),
      ],
    ),
  );
  const issues = {
    listForRepo: async () => ({ data: open ? [{ number: 123 }] : [] }),
  };
  for (const method of ["createComment", "create", "update"]) {
    issues[method] = async (args) => {
      calls.push({ method, ...args });
    };
  }
  await runInNewContext(`(async () => {\n${script}\n})()`, {
    github: { rest: { issues } },
    context: {
      serverUrl: "https://github.com",
      repo: { owner: "fixture", repo: "fixture" },
      runId: 456,
    },
    process: { env },
  });
  return calls;
}

const runUrl = "https://github.com/fixture/fixture/actions/runs/456";

test("skipped declarations and passing runtime tests do not report recovery", async () => {
  const calls = await report("skipped", "success");
  assert.equal(
    calls.some((call) => call.state === "closed"),
    false,
  );
  assert.equal(
    calls.some((call) => call.body?.includes("passed again")),
    false,
  );
});

test("a failure in either check keeps the tracking issue open", async () => {
  for (const outcomes of [
    ["failure", "success"],
    ["success", "failure"],
  ]) {
    const calls = await report(...outcomes);
    assert.deepEqual(calls, [
      {
        method: "createComment",
        owner: "fixture",
        repo: "fixture",
        issue_number: 123,
        body: `The weekly React 18 run failed: ${runUrl}`,
      },
    ]);
  }
});

test("both checks passing reports recovery and closes the tracking issue", async () => {
  assert.deepEqual(await report("success", "success"), [
    {
      method: "createComment",
      owner: "fixture",
      repo: "fixture",
      issue_number: 123,
      body: `The weekly React 18 run passed again: ${runUrl}`,
    },
    {
      method: "update",
      owner: "fixture",
      repo: "fixture",
      issue_number: 123,
      state: "closed",
    },
  ]);
});

test("a failed run opens a tracking issue when none exists", async () => {
  const calls = await report("success", "failure", false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "create");
  assert.equal(calls[0].title, "React 18 peer tests are failing");
  assert.equal(
    calls[0].body,
    `The weekly React 18 run failed: ${runUrl}\n\nThe next passing weekly run closes this issue.`,
  );
  assert.deepEqual(Array.from(calls[0].labels), ["react18-weekly"]);
});

test("a passing run without a tracking issue makes no writes", async () => {
  assert.deepEqual(await report("success", "success", false), []);
});

test("only uncancelled scheduled runs report to the tracking issue", () => {
  const condition = reporter.match(/        if: \$\{\{ (.+) \}\}/)[1];
  for (const [event, cancelled, expected] of [
    ["schedule", false, true],
    ["schedule", true, false],
    ["workflow_dispatch", false, false],
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
