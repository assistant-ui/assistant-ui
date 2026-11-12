import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/scheduled-failure-issue.yaml", import.meta.url),
  "utf8",
);
// The step's block scalar, dedented the way YAML reads it.
const script = workflow
  .split("      - name: Update the tracking issue\n")[1]
  .split("        run: |\n")[1]
  .split("\n")
  .map((line) => line.replace(/^ {10}/, ""))
  .join("\n");

// Stands in for gh: records each call, and answers `issue list` with the fixture
// issues run through the step's own --jq filter, as gh does.
const fakeGh = `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const args = process.argv.slice(2);
appendFileSync(process.env.GH_CALLS, JSON.stringify(args) + "\\n");
if (args[0] === "issue" && args[1] === "list") {
  const filter = args[args.indexOf("--jq") + 1];
  process.stdout.write(
    execFileSync("jq", ["-r", filter], { input: process.env.GH_ISSUES }),
  );
}
`;

const title = "Docs Links workflow is failing";
const runUrl = "https://github.com/fixture/fixture/actions/runs/456";
const botIssue = {
  number: 123,
  title,
  author: { login: "app/github-actions" },
};

function report({ failed, issues }) {
  const dir = mkdtempSync(join(tmpdir(), "scheduled-failure-issue-"));
  try {
    writeFileSync(join(dir, "gh"), fakeGh);
    chmodSync(join(dir, "gh"), 0o755);
    const calls = join(dir, "calls");
    writeFileSync(calls, "");
    execFileSync("bash", ["-c", script], {
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH}`,
        GH_CALLS: calls,
        GH_ISSUES: JSON.stringify(issues),
        TITLE: title,
        FAILED: String(failed),
        RUN_URL: runUrl,
        WORKFLOW_REF:
          "fixture/fixture/.github/workflows/linkinator.yaml@refs/heads/main",
      },
    });
    const [list, ...rest] = readFileSync(calls, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(list.slice(0, 2), ["issue", "list"]);
    assert.equal(list[list.indexOf("--author") + 1], "app/github-actions");
    return rest;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a failure with no tracking issue opens one", () => {
  const [create, ...rest] = report({ failed: true, issues: [] });
  assert.deepEqual(rest, []);
  assert.deepEqual(create.slice(0, 9), [
    "issue",
    "create",
    "--title",
    title,
    "--label",
    "maintenance",
    "--type",
    "Task",
    "--body",
  ]);
  const body = create[9];
  assert.match(body, /^### Problem\n\nThe scheduled run failed: (\S+)\n/);
  assert.ok(body.includes(runUrl));
  assert.ok(body.includes("`.github/workflows/linkinator.yaml`"));
});

test("a failure comments on the open tracking issue", () => {
  assert.deepEqual(report({ failed: true, issues: [botIssue] }), [
    [
      "issue",
      "comment",
      "123",
      "--body",
      `The scheduled run failed again: ${runUrl}`,
    ],
  ]);
});

test("a pass closes the open tracking issue", () => {
  assert.deepEqual(report({ failed: false, issues: [botIssue] }), [
    [
      "issue",
      "close",
      "123",
      "--comment",
      `The scheduled run passed again: ${runUrl}`,
    ],
  ]);
});

test("a pass with no tracking issue does nothing", () => {
  assert.deepEqual(report({ failed: false, issues: [] }), []);
});

test("issues a person opened or with another title are not the tracking issue", () => {
  const issues = [
    { number: 7, title, author: { login: "someone" } },
    { number: 8, title: `${title} too`, author: botIssue.author },
  ];
  assert.deepEqual(report({ failed: false, issues }), []);
  assert.deepEqual(report({ failed: true, issues })[0].slice(0, 2), [
    "issue",
    "create",
  ]);
});
