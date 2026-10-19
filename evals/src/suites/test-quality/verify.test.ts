import assert from "node:assert/strict";
import test from "node:test";
import { cases } from "./cases.ts";
import { verify } from "./verify.ts";

for (const c of cases) {
  test(`${c.id}: the reference test catches the fault`, () => {
    assert.equal(verify(c, c.referenceTest).pass, true);
  });
  test(`${c.id}: the seed exposes the intended evaluation boundary`, () => {
    assert.equal(verify(c, c.seedTest).pass, c.seedCatchesFault ?? false);
  });
}

test("broken imports are not regression evidence", () => {
  const verdict = verify(cases[0]!, 'import "./missing.mjs";');
  assert.equal(verdict.pass, false);
  assert.match(verdict.reason, /fails on correct code/);
});

test("unconditional failures are not regression evidence", () => {
  const verdict = verify(
    cases[0]!,
    'import assert from "node:assert/strict"; assert.fail("broken");',
  );
  assert.equal(verdict.pass, false);
});

test("disabled tests do not detect faults", () => {
  const verdict = verify(
    cases[0]!,
    'import test from "node:test"; test.skip("disabled", () => {});',
  );
  assert.equal(verdict.pass, false);
  assert.match(verdict.reason, /passes with the known fault/);
});

test("a runtime crash is not credited as an assertion failure", () => {
  const c = {
    ...cases[0]!,
    faultySource: 'throw new Error("provider crashed");',
  };
  const verdict = verify(c, c.referenceTest);
  assert.equal(verdict.pass, false);
  assert.match(verdict.reason, /without assertion evidence/);
});

test("a test that leaks a handle is a scored failure", () => {
  const verdict = verify(cases[0]!, "setInterval(() => {}, 1000);", {
    timeoutMs: 500,
  });
  assert.equal(verdict.pass, false);
  assert.match(verdict.reason, /did not complete/);
});

test("files produced by the correct run cannot become the faulty run's expectations", () => {
  const artifact = `import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { convert } from "./runtime.mjs";
test("conversion", () => {
const actual = convert({ role: "assistant", text: "hello" });
const expected = existsSync("expected.json") ? JSON.parse(readFileSync("expected.json", "utf8")) : actual;
writeFileSync("expected.json", JSON.stringify(actual));
assert.deepEqual(actual, expected);
});
`;
  assert.equal(verify(cases[0]!, artifact).pass, false);
});
