import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPERIMENTAL_BOILERPLATE as BOILERPLATE,
  addDays,
  parseDeprecatedTag,
  reviewDate,
} from "./lib/experimental-annotations.mjs";
import { checkSource, collectDeclarations } from "./check-experimental.mjs";

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

test("reads a tag that wraps across comment lines", () => {
  const [decl] = collectDeclarations(
    "a.ts",
    [
      "/**",
      " * @deprecated Experimental since",
      " * 2026-09-05. Rest.",
      " */",
      "export const unstable_a = 1;",
    ].join("\n"),
  );
  assert.equal(decl.name, "unstable_a");
  assert.equal(decl.deprecated, "Experimental since 2026-09-05. Rest.");
});

test("reads a tag on the statement above a const declarator", () => {
  const [decl] = collectDeclarations(
    "a.ts",
    `/** @deprecated ${canonical("2026-08-01")} */\nexport const unstable_a = 1;\n`,
  );
  assert.equal(decl.deprecated, canonical("2026-08-01"));
});

test("passes a live experimental annotation", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-08-01")} */\nexport const unstable_a = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("errors on an unstable_ declaration with no annotation", () => {
  const result = check("export const unstable_a = 1;\n");
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /no @deprecated annotation/);
});

test("a name annotated elsewhere does not vouch for this declaration", () => {
  const annotated = check(
    `interface A {\n  /** @deprecated ${canonical("2026-08-01")} */\n  unstable_on(): void;\n}\n`,
  );
  assert.deepEqual(annotated.errors, []);
  const bare = check("interface B {\n  unstable_on(): void;\n}\n");
  assert.equal(bare.errors.length, 1);
  assert.match(bare.errors[0], /unstable_on/);
});

test("errors once the window has closed", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-01-01")} */\nexport const unstable_a = 1;\n`,
  );
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /window closed 2026-04-01/);
});

test("an extension reopens a closed window", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-01-01", "2026-12-05")} */\nexport const unstable_a = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
});

test("warns about an API experimental for over a year", () => {
  const result = check(
    `/** @deprecated ${canonical("2024-09-01", "2026-12-05")} */\nexport const unstable_a = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0].detail, /experimental since 2024-09-01/);
});

test("warns once an API has been extended twice", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-06-01", "2026-09-01", "2026-12-05")} */\nexport const unstable_a = 1;\n`,
  );
  assert.match(result.warnings[0].detail, /extended 2 times/);
});

test("reports an experimental API that never took the prefix", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-08-01")} */\nexport const helper = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.misnamed.length, 1);
});

test("an ordinary removal notice counts as annotation", () => {
  const result = check(
    "interface A {\n  /** @deprecated Removal after 2027-01-01. Use `move()`. */\n  unstable_queueClear?: boolean;\n}\n",
  );
  assert.deepEqual(result.errors, []);
});

test("rejects free-prose experimental wording on an unstable symbol", () => {
  const result = check(
    "interface A {\n  /** @deprecated Unstable / Experimental (not actually removed). */\n  unstable_on(): void;\n}\n",
  );
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /free prose/);
});

test("leaves ordinary deprecations on stable symbols alone", () => {
  const result = check(
    "/** @deprecated Use `next()`. */\nexport const helper = 1;\n",
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.misnamed, []);
});

test("an empty @deprecated is not an annotation", () => {
  const result = check("/** @deprecated */\nexport const unstable_a = 1;\n");
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /carries no text/);
});

test("rejects a ship date in the future", () => {
  const result = check(
    `/** @deprecated ${canonical("2027-01-01")} */\nexport const unstable_a = 1;\n`,
  );
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /ships in the future/);
});

test("the window closes on its stated review date", () => {
  const onTheDay = check(
    `/** @deprecated ${canonical("2026-06-07")} */\nexport const unstable_a = 1;\n`,
  );
  assert.equal(onTheDay.errors.length, 1);
  assert.match(onTheDay.errors[0], /window closed 2026-09-05/);
  const dayBefore = check(
    `/** @deprecated ${canonical("2026-06-08")} */\nexport const unstable_a = 1;\n`,
  );
  assert.deepEqual(dayBefore.errors, []);
});

test("a renaming export specifier must carry the annotation", () => {
  const bare = check(
    'export { convertMessages as unstable_convertMessages } from "./x";\n',
  );
  assert.equal(bare.errors.length, 1);
  assert.match(bare.errors[0], /unstable_convertMessages/);
  const annotated = check(
    `/** @deprecated ${canonical("2026-08-01")} */\nexport { convertMessages as unstable_convertMessages } from "./x";\n`,
  );
  assert.deepEqual(annotated.errors, []);
});

test("a plain re-export defers to the declaration it points at", () => {
  const result = check('export { unstable_useFoo } from "./x";\n');
  assert.deepEqual(result.errors, []);
});

test("reads an annotation placed on the specifier itself", () => {
  const result = check(
    `export {\n  /** @deprecated ${canonical("2026-08-01")} */\n  convertMessages as unstable_convertMessages,\n} from "./x";\n`,
  );
  assert.deepEqual(result.errors, []);
});

test("accepts a ship date one day ahead of UTC", () => {
  const result = check(
    `/** @deprecated ${canonical("2026-09-06")} */\nexport const unstable_a = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
});

test("validates an annotation on a plain re-export without requiring one", () => {
  const bare = check('export { unstable_useFoo } from "./x";\n');
  assert.deepEqual(bare.errors, []);
  const malformed = check(
    'export {\n  /** @deprecated Experimental since yesterday. */\n  unstable_useFoo,\n} from "./x";\n',
  );
  assert.equal(malformed.errors.length, 1);
  assert.match(malformed.errors[0], /Experimental since/);
});

test("an annotated plain re-export is not reported as misnamed", () => {
  const result = check(
    `export {\n  /** @deprecated ${canonical("2026-08-01")} */\n  unstable_useFoo,\n} from "./x";\n`,
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.misnamed, []);
});

test("rejects a description that repeats the stability contract", () => {
  const result = check(
    `/**\n * Unstable / Experimental, may change in any release.\n * @deprecated ${canonical("2026-08-01")}\n */\nexport const unstable_a = 1;\n`,
  );
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /repeats the stability contract/);
});

test("leaves an ordinary description alone", () => {
  const result = check(
    `/**\n * Renders the message with the given id.\n * @deprecated ${canonical("2026-08-01")}\n */\nexport const unstable_a = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
});

test("catches other stability wordings that open a description", () => {
  for (const opener of [
    "Experimental API; may change in any release.",
    "Under active development.",
    "This hook is still experimental.",
  ]) {
    const result = check(
      `/**\n * ${opener}\n * @deprecated ${canonical("2026-08-01")}\n */\nexport const unstable_a = 1;\n`,
    );
    assert.equal(result.errors.length, 1, opener);
  }
});

test("a description that mentions change in passing is fine", () => {
  const result = check(
    `/**\n * Renders the parts, which may change as the run streams.\n * @deprecated ${canonical("2026-08-01")}\n */\nexport const unstable_a = 1;\n`,
  );
  assert.deepEqual(result.errors, []);
});
