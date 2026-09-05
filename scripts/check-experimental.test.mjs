import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPERIMENTAL_BOILERPLATE as BOILERPLATE,
  addDays,
  parseDeprecatedTag,
  reviewDate,
} from "./lib/experimental-annotations.mjs";
import {
  checkSource,
  collectSurfaceNames,
  extractDeprecatedTags,
} from "./check-experimental.mjs";

const canonical = (since, ...extended) =>
  `Experimental since ${since}${extended.map((date) => `, extended ${date}`).join("")}. ${BOILERPLATE}`;

const check = (source, now = "2026-09-05") =>
  checkSource({
    file: "packages/x/src/a.ts",
    source,
    now,
    windowDays: 90,
    staleAfterDays: 365,
  });

test("parses the canonical experimental tag", () => {
  assert.deepEqual(parseDeprecatedTag(canonical("2026-09-05")), {
    kind: "experimental",
    since: "2026-09-05",
    extended: [],
    prose: undefined,
  });
});

test("parses extensions and trailing prose", () => {
  const parsed = parseDeprecatedTag(
    `${canonical("2026-01-05", "2026-06-05", "2026-12-05")} Prefer useFoo.`,
  );
  assert.equal(parsed.kind, "experimental");
  assert.deepEqual(parsed.extended, ["2026-06-05", "2026-12-05"]);
  assert.equal(parsed.prose, "Prefer useFoo.");
});

test("classifies an ordinary deprecation by its first word", () => {
  assert.deepEqual(parseDeprecatedTag("Use `moveQueueItem()` instead."), {
    kind: "deprecated",
    prose: "Use `moveQueueItem()` instead.",
  });
  assert.equal(
    parseDeprecatedTag("Removal after 2026-11-05. Use `move()`.").kind,
    "deprecated",
  );
});

test("rejects malformed experimental tags", () => {
  for (const text of [
    "Experimental since 2026-06-14.",
    `Experimental since 14-06-2026. ${BOILERPLATE}`,
    `Experimental since 2026-02-30. ${BOILERPLATE}`,
    canonical("2026-06-14", "2026-01-01"),
    `Experimental. ${BOILERPLATE}`,
  ]) {
    assert.equal(parseDeprecatedTag(text).kind, "invalid", text);
  }
});

test("review date falls one window after the ship date", () => {
  assert.equal(
    reviewDate(parseDeprecatedTag(canonical("2026-09-05")), 90),
    "2026-12-04",
  );
});

test("the last extension overrides the computed review date", () => {
  assert.equal(
    reviewDate(parseDeprecatedTag(canonical("2026-01-05", "2027-01-05")), 90),
    "2027-01-05",
  );
});

test("addDays crosses month and year boundaries in UTC", () => {
  assert.equal(addDays("2026-12-30", 5), "2027-01-04");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
});

test("folds a tag body that wraps across comment lines", () => {
  const tags = extractDeprecatedTags(
    [
      "/**",
      " * @deprecated Experimental since",
      " * 2026-09-05. Rest.",
      " */",
      "export const a = 1;",
    ].join("\n"),
  );
  assert.equal(tags.length, 1);
  assert.equal(tags[0].text, "Experimental since 2026-09-05. Rest.");
  assert.equal(tags[0].symbol, "a");
});

test("stops a tag body at the next block tag", () => {
  const tags = extractDeprecatedTags(
    ["/**", " * @deprecated Gone.", " * @see other", " */", "type A = 1;"].join(
      "\n",
    ),
  );
  assert.equal(tags[0].text, "Gone.");
  assert.equal(tags[0].symbol, "A");
});

test("passes a live experimental annotation", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-08-01")} */\nexport const a = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("errors once the window has closed", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-01-01")} */\nexport const a = 1;\n`,
  );
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /window closed 2026-04-01/);
});

test("an extension reopens a closed window", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-01-01", "2026-12-05")} */\nexport const a = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
});

test("warns about an API experimental for over a year", () => {
  const result = check(
    `/** @deprecated ${canonical("2024-09-01", "2026-12-05")} */\nexport const a = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0].detail, /experimental since 2024-09-01/);
});

test("warns once an API has been extended twice", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-06-01", "2026-09-01", "2026-12-05")} */\nexport const a = 1;\n`,
  );
  assert.match(result.warnings[0].detail, /extended 2 times/);
});

test("leaves ordinary deprecations alone", () => {
  const result = check(
    "/** @deprecated Use `move()` instead. */\nexport const a = 1;\n",
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("collects experimental names from a surface file", () => {
  const { names } = collectSurfaceNames([
    "declare const unstable_useFoo: () => void;",
    "interface A {\n  unstable_on(): void;\n  stable: string;\n}",
  ]);
  assert.deepEqual([...names].sort(), ["unstable_on", "unstable_useFoo"]);
});

test("maps an aliased export back to its local declaration", () => {
  const { names, aliasSource } = collectSurfaceNames([
    "export { convertMessages as unstable_convertMessages, Thumb as unstable_Thumb };",
  ]);
  assert.deepEqual([...names].sort(), [
    "unstable_Thumb",
    "unstable_convertMessages",
  ]);
  assert.equal(aliasSource.get("unstable_convertMessages"), "convertMessages");
});

test("ignores stable names and partial matches", () => {
  const { names } = collectSurfaceNames([
    "declare const useUnstableThing: () => void;\ndeclare const unstable: number;",
  ]);
  assert.deepEqual([...names], []);
});

test("an ordinary removal notice counts as annotation", () => {
  const result = check(
    "/** @deprecated Removal after 2027-01-01. Use `move()`. */\nunstable_queueClear?: boolean;\n",
  );
  assert.deepEqual(result.errors, []);
  assert.ok(result.annotated.has("unstable_queueClear"));
});

test("rejects free-prose experimental wording on an unstable symbol", () => {
  const result = check(
    "/** @deprecated Unstable / Experimental (not actually removed). */\nunstable_on(): void;\n",
  );
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /free prose/);
});

test("leaves free-prose wording on a stable symbol alone", () => {
  const result = check(
    "/** @deprecated This may change without notice. */\nexport const helper = 1;\n",
  );
  assert.deepEqual(result.errors, []);
});

test("an ordinary deprecation on a stable symbol is not an experimental claim", () => {
  const result = check(
    "/** @deprecated Use `next()`. */\nexport const helper = 1;\n",
  );
  assert.equal(result.experimental.size, 0);
  assert.ok(result.annotated.has("helper"));
});
