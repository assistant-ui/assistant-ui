import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPERIMENTAL_NAME,
  experimentalTag,
  parseDeprecatedTag,
} from "./experimental-annotations.mjs";

test("parses the canonical experimental tag", () => {
  assert.deepEqual(parseDeprecatedTag(experimentalTag("2026-06-23")), {
    kind: "experimental",
    since: "2026-06-23",
  });
});

test("rejects text after the tag, which TypeScript reads as part of it", () => {
  assert.equal(
    parseDeprecatedTag(
      `${experimentalTag("2026-06-23")}\n\nHeadless bridge to the composer.`,
    ).kind,
    "invalid",
  );
});

test("keeps an ordinary removal notice apart from the experimental tag", () => {
  assert.deepEqual(parseDeprecatedTag("Use `TriggerMatcher` instead."), {
    kind: "deprecated",
  });
  assert.deepEqual(parseDeprecatedTag("  \n "), { kind: "empty" });
});

test("rejects an experimental tag that drifts from the grammar", () => {
  for (const text of [
    "Experimental, API may change.",
    "Experimental since 2026-06-23.",
    "Experimental since 2026-6-23. Not scheduled for removal; the API may change in any release.",
    "Experimental since 2026-06-23, extended 2026-12-05. Not scheduled for removal; the API may change in any release.",
  ]) {
    assert.equal(parseDeprecatedTag(text).kind, "invalid", text);
  }
  assert.deepEqual(parseDeprecatedTag(experimentalTag("2026-02-30")), {
    kind: "invalid",
    reason: "2026-02-30 is not a calendar date",
  });
});

test("names a declaration experimental by its prefix or its flattened primitive form", () => {
  for (const name of [
    "unstable_useInteractable",
    "Unstable_TriggerPopover",
    "experimental_onSchemaValidationError",
    "ThreadPrimitiveUnstable_MessageById",
  ]) {
    assert.equal(EXPERIMENTAL_NAME.test(name), true, name);
  }
  for (const name of [
    "useInteractable",
    "isUnstable_",
    "ThreadPrimitiveRoot",
  ]) {
    assert.equal(EXPERIMENTAL_NAME.test(name), false, name);
  }
});
