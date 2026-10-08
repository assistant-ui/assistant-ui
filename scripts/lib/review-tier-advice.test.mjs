import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { loadReviewPolicy } from "./review-policy.mjs";
import { advise, sectionText } from "./review-tier-advice.mjs";

const policy = loadReviewPolicy(path.resolve(import.meta.dirname, "../.."));
const issue = (number, ...pullRequests) => ({ number, pullRequests });
const pr = (number, state = "OPEN") => ({ number, state });
const complete =
  "## Problem\nIt broke.\n\n## Verification\npnpm test\n\n## AI use\nNone.\n";
const adviceFor = (overrides = {}) =>
  advise(
    {
      number: 12,
      title: "fix(react): keep the composer focused",
      body: complete,
      authorIsBot: false,
      hasLinkedIssue: true,
      closingIssues: [],
      ...overrides,
    },
    policy,
  );

test("a section's text ends at the next heading and is null without the heading", () => {
  assert.equal(sectionText(complete, "Verification").trim(), "pnpm test");
  assert.equal(sectionText(complete, "ai use").trim(), "None.");
  assert.equal(sectionText(complete, "Decision"), null);
});

test("a complete description draws no advice", () => {
  assert.deepEqual(adviceFor(), []);
});

test("another open or merged pull request for the same issue is named", () => {
  assert.deepEqual(
    adviceFor({ closingIssues: [issue(42, pr(12), pr(15), pr(9, "MERGED"))] }),
    ["#15 is also open for #42", "#9 already merged for #42"],
  );
});

test("the pull request itself and closed attempts are not parallel work", () => {
  assert.deepEqual(
    adviceFor({
      closingIssues: [issue(42, pr(12), pr(7, "CLOSED")), issue(43)],
    }),
    [],
  );
});

test("a feat without a linked issue is told to link one", () => {
  const title = "feat(react): expose runtime metadata mutation";
  assert.match(
    adviceFor({ title, hasLinkedIssue: false })[0],
    /^a `feat` links the issue/,
  );
  assert.deepEqual(adviceFor({ title }), []);
  assert.deepEqual(adviceFor({ hasLinkedIssue: false }), []);
});

test("types that make a verifiable claim need Verification text", () => {
  const body = "## Verification\n\n## AI use\nNone.\n";
  assert.match(adviceFor({ body })[0], /no Verification text/);
  assert.deepEqual(adviceFor({ body, title: "docs: fix a typo" }), []);
});

test("a human author states AI use and a bot does not need to", () => {
  const body = "## Verification\npnpm test\n";
  assert.match(adviceFor({ body })[0], /no AI use text/);
  assert.deepEqual(adviceFor({ body, authorIsBot: true }), []);
});
