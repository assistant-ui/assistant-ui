import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  areasOf,
  isDecisionPath,
  isGeneratedPath,
  isLowRiskPath,
  isTestPath,
  loadReviewPolicy,
  overrideSignal,
  parseTitleType,
  tierLabel,
  validateReviewPolicy,
} from "./review-policy.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const policy = loadReviewPolicy(repoRoot);

test("the committed policy is valid", () => {
  assert.equal(policy.repository, "assistant-ui/assistant-ui");
  assert.ok(policy.areas.length > 0);
});

test("an invalid policy lists every problem", () => {
  assert.throws(
    () =>
      validateReviewPolicy({
        ...policy,
        areas: [],
        openPullRequestCap: { withWriteAccess: 5 },
      }),
    (error) =>
      error.message.includes("areas must be a non-empty array") &&
      error.message.includes(
        "openPullRequestCap.withoutWriteAccess must be a positive integer",
      ),
  );
});

test("malformed areas and empty required checks are reported, not thrown", () => {
  for (const areas of [{}, [null], ["reactivity"]]) {
    assert.throws(
      () => validateReviewPolicy({ ...policy, areas }),
      /Invalid review policy/,
    );
  }
  assert.throws(
    () => validateReviewPolicy({ ...policy, requiredChecks: [] }),
    /requiredChecks must be a non-empty array/,
  );
});

test("enforcing the review tier needs the check's integration id", () => {
  const withMode = (mode, integrationId) => ({
    ...policy,
    reviewTierCheck: { name: "review-tier", integrationId, mode },
  });
  assert.throws(
    () => validateReviewPolicy(withMode("enforce", null)),
    /reviewTierCheck\.mode must be "shadow", or "enforce" with an integrationId/,
  );
  assert.throws(
    () => validateReviewPolicy(withMode("off", 905)),
    /reviewTierCheck\.mode/,
  );
  assert.doesNotThrow(() => validateReviewPolicy(withMode("enforce", 905)));
  assert.doesNotThrow(() => validateReviewPolicy(withMode("shadow", null)));
});

test("merge queue parameters must be an object", () => {
  assert.throws(
    () =>
      validateReviewPolicy({
        ...policy,
        mergeQueue: { enabled: true, parameters: [] },
      }),
    /mergeQueue needs a boolean enabled and a parameters object/,
  );
});

test("a repeated area id is rejected", () => {
  assert.throws(
    () =>
      validateReviewPolicy({
        ...policy,
        areas: [policy.areas[0], policy.areas[0]],
      }),
    /is repeated/,
  );
});

test("areasOf matches area paths and contract docs", () => {
  const ids = (file) => areasOf(policy, file).map((area) => area.id);
  assert.deepEqual(ids("packages/tap/src/core/scheduler.ts"), ["reactivity"]);
  assert.deepEqual(ids("apps/docs/content/docs/tap/outside-react.mdx"), [
    "reactivity",
  ]);
  assert.deepEqual(ids("api-surface/assistant-ui__react.ts"), ["public-api"]);
  assert.deepEqual(ids("scripts/lib/review-policy.mjs"), ["ci-policy"]);
  assert.deepEqual(ids("packages/react/src/index.ts"), []);
});

test("path classes follow the policy patterns", () => {
  assert.ok(isDecisionPath(policy, ".github/review-policy.json"));
  assert.ok(isDecisionPath(policy, "scripts/lib/review-tier-signals.mjs"));
  assert.ok(!isDecisionPath(policy, ".github/workflows/code-quality.yaml"));
  assert.ok(isLowRiskPath(policy, "README.md"));
  assert.ok(isLowRiskPath(policy, "examples/with-ai-sdk-v7/app/page.tsx"));
  assert.ok(isLowRiskPath(policy, ".changeset/quiet-owls-sing.md"));
  assert.ok(!isLowRiskPath(policy, ".changeset/config.json"));
  assert.ok(isTestPath(policy, "packages/react/src/a.test.ts"));
  assert.ok(isTestPath(policy, "packages/tap/src/__tests__/scheduler.ts"));
  assert.ok(isGeneratedPath(policy, "api-surface/assistant-ui__react.ts"));
  assert.ok(!isGeneratedPath(policy, "packages/react/src/index.ts"));
});

test("parseTitleType reads conventional titles and GitHub reverts", () => {
  assert.equal(parseTitleType(policy, "fix(tap): keep the mount"), "fix");
  assert.equal(parseTitleType(policy, "feat!: drop the old adapter"), "feat");
  assert.equal(parseTitleType(policy, 'Revert "fix(tap): x"'), "revert");
  assert.equal(parseTitleType(policy, "update the readme"), null);
  assert.equal(parseTitleType(policy, "wip(tap): something"), null);
  assert.equal(parseTitleType(policy, "fix:no space"), null);
});

test("labels follow the policy prefixes", () => {
  assert.equal(tierLabel(policy, 2), "tier/2");
  assert.equal(overrideSignal(policy, "review-tier/override: size"), "size");
  assert.equal(overrideSignal(policy, "review-tier/override: tier"), null);
  assert.equal(overrideSignal(policy, "tier/2"), null);
});
