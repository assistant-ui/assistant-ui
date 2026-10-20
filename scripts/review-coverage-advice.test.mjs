import assert from "node:assert/strict";
import test from "node:test";
import { coverageAdvice } from "./review-coverage-advice.mjs";

const path = "packages/react-langchain/vitest.config.ts";
const config = (coverage) =>
  `export default defineConfig({ test: { coverage: ${coverage} } });`;
const advice = (before, after) =>
  coverageAdvice({ path, base: config(before), head: config(after) });

test("a lower threshold names the metric, values, and config", () => {
  const lines = advice(
    "{ thresholds: { branches: 86 } }",
    "{ thresholds: { branches: 0 } }",
  );
  assert.equal(lines.length, 1);
  assert.match(lines[0], /coverage.thresholds.branches.*86 to 0/);
  assert.ok(lines[0].includes(path));
});

test("raising a percentage or tightening an uncovered-count limit stays quiet", () => {
  assert.deepEqual(
    advice(
      "{ thresholds: { branches: 86, lines: -10 } }",
      "{ thresholds: { branches: 87, lines: -5 } }",
    ),
    [],
  );
  assert.match(
    advice(
      "{ thresholds: { lines: -5 } }",
      "{ thresholds: { lines: -10 } }",
    )[0],
    /-5 to -10/,
  );
});

test("switching threshold units asks for review rather than comparing unlike limits", () => {
  assert.match(
    advice("{ thresholds: { lines: 80 } }", "{ thresholds: { lines: -5 } }")[0],
    /percentage versus uncovered-count/,
  );
});

test("removed thresholds and per-file changes remain visible", () => {
  const lines = advice(
    '{ thresholds: { branches: 86, "src/**": { lines: 90 }, perFile: true } }',
    '{ thresholds: { "src/**": { lines: 80 }, perFile: false } }',
  );
  assert.equal(lines.length, 3);
  assert.ok(lines.some((line) => /branches.*removed.*86/.test(line)));
  assert.ok(lines.some((line) => /src\/\*\*.lines.*90 to 80/.test(line)));
  assert.ok(lines.some((line) => /perFile.*changed/.test(line)));
});

test("the numeric 100 percent shorthand stays quiet when added and reports removal", () => {
  assert.deepEqual(
    advice("{ thresholds: {} }", "{ thresholds: { 100: true } }"),
    [],
  );
  assert.match(
    advice("{ thresholds: { 100: true } }", "{ thresholds: {} }")[0],
    /coverage.thresholds.100.*removed.*true/,
  );
});

test("coverage file selections show the old and new values", () => {
  const lines = advice(
    '{ include: ["src/**"], exclude: [] }',
    '{ include: ["src/helpers/**"], exclude: ["src/convertMessages.ts"] }',
  );
  assert.equal(lines.length, 2);
  assert.ok(
    lines.some(
      (line) =>
        line.includes("coverage.include") && line.includes("src/helpers/**"),
    ),
  );
  assert.ok(
    lines.some(
      (line) =>
        line.includes("coverage.exclude") &&
        line.includes("src/convertMessages.ts"),
    ),
  );
});

test("formatting, quotes, comments, and test-selection changes do not draw coverage advice", () => {
  assert.deepEqual(
    advice(
      '{ include: ["src/**"], thresholds: { branches: 86 } }',
      "{ include: [\n'src/**',\n], thresholds: { branches: 86 /* same */ } }",
    ),
    [],
  );
  assert.deepEqual(
    coverageAdvice({
      path,
      base: 'export default { test: { include: ["a"] } }',
      head: 'export default { test: { include: ["b"] } }',
    }),
    [],
  );
});

test("disabled and removed coverage configurations are reported", () => {
  assert.match(
    advice(
      "{ thresholds: { lines: 80 } }",
      "{ enabled: false, thresholds: { lines: 80 } }",
    )[0],
    /coverage disabled/,
  );
  assert.match(
    coverageAdvice({
      path,
      base: config("{ thresholds: { lines: 80 } }"),
      head: null,
    })[0],
    /coverage configuration removed/,
  );
});

test("removing explicit coverage enablement asks whether coverage still runs", () => {
  const lines = advice(
    "{ enabled: true, thresholds: { lines: 80 } }",
    "{ thresholds: { lines: 80 } }",
  );
  assert.equal(lines.length, 1);
  assert.match(
    lines[0],
    /coverage.enabled.*true.*default.*confirm coverage still runs/,
  );
});

test("replacing explicit enablement with a computed value asks for review", () => {
  const lines = advice(
    "{ enabled: true }",
    '{ enabled: process.env.CI === "true" }',
  );
  assert.equal(lines.length, 1);
  assert.match(
    lines[0],
    /coverage.enabled.*process.*confirm coverage still runs/,
  );
});

test("new configs do not claim that prior protection was weakened", () => {
  assert.deepEqual(
    coverageAdvice({
      path,
      base: null,
      head: config("{ thresholds: { lines: 80 } }"),
    }),
    [],
  );
});

test("computed values and invalid syntax request manual review without executing code", () => {
  assert.match(
    advice(
      "{ thresholds: { lines: 80 } }",
      "{ thresholds: { lines: (() => { throw new Error('must not run'); })() } }",
    )[0],
    /verify the coverage gate/,
  );
  assert.match(advice("defaults", "replacement")[0], /computed coverage/);
  assert.match(
    coverageAdvice({ path, base: config("{}"), head: "export default {" })[0],
    /could not be parsed/,
  );
});

test("adding an explicit disabled coverage setting is reported", () => {
  const lines = coverageAdvice({
    path,
    base: "export default { test: {} }",
    head: config("{ enabled: false }"),
  });
  assert.match(lines[0], /coverage disabled/);
});

test("new computed threshold spreads are sent to manual review", () => {
  const lines = advice(
    "{ thresholds: { lines: 94 } }",
    "{ thresholds: { lines: 94, ...(process.env.CI ? {} : { lines: 0 }) } }",
  );
  assert.equal(lines.length, 1);
  assert.match(lines[0], /adds computed settings/);
});

test("an unchanged later spread does not hide changes to an earlier spread", () => {
  const lines = advice(
    "{ thresholds: { ...base, ...overrides } }",
    "{ thresholds: { ...weaker, ...overrides } }",
  );
  assert.equal(lines.length, 1);
  assert.match(lines[0], /coverage gate/);
});
