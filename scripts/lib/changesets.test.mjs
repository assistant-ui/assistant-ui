import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBumpLine,
  parseReleaseLine,
  readChangesetSource,
} from "./changesets.mjs";

test("release parsing keeps none while bump parsing excludes it", () => {
  assert.deepEqual(parseReleaseLine('"@scope/pkg": none # held'), {
    name: "@scope/pkg",
    bump: "none",
  });
  assert.equal(parseBumpLine('"@scope/pkg": none'), null);
  assert.deepEqual(parseBumpLine("'@scope/pkg': patch"), {
    name: "@scope/pkg",
    bump: "patch",
  });
});

test("readChangesetSource accepts CRLF and preserves the body", () => {
  assert.deepEqual(
    readChangesetSource('---\r\n"@scope/pkg": patch\r\n---\r\n\r\nBody\n'),
    { frontmatter: '\r\n"@scope/pkg": patch', body: "\r\n\r\nBody\n" },
  );
  assert.equal(readChangesetSource("no frontmatter"), null);
});
