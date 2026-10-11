import assert from "node:assert/strict";
import test from "node:test";
import { candidates } from "./suites/comment-hygiene/candidates.ts";
import { cases } from "./suites/comment-hygiene/cases/index.ts";

test("registers five distinct comment-hygiene cases with complete definitions", () => {
  assert.deepEqual(
    cases.map((item) => item.id),
    [
      "pr-review-comments",
      "bugfix-comments",
      "registry-source-of-truth",
      "optional-host-sdk-dependency",
      "verbose-new-code",
    ],
  );
  assert.equal(new Set(cases.map((item) => item.id)).size, cases.length);

  for (const item of cases) {
    assert.notEqual(item.description.trim(), "");
    assert.notEqual(item.task.trim(), "");
    assert.match(item.rubric, /PASS/);
    assert.match(item.rubric, /FAIL/);
    assert.ok(item.seed.length > 0);
    assert.ok(item.inspect.length > 0);
    const applicable = candidates.filter(
      (candidate) => !candidate.caseIds || candidate.caseIds.includes(item.id),
    );
    assert.ok(applicable.some((candidate) => candidate.label === "baseline"));
    assert.ok(applicable.length >= 2);
  }
});
