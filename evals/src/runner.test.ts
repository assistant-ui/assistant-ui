import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { runCase } from "./runner.ts";
import type { Suite, SuiteCandidate, SuiteCase } from "./types.ts";

const c: SuiteCase = { id: "case", description: "a case" };

const fakeSuite = (
  ...outcomes: (() => boolean | Promise<boolean>)[]
): Suite<SuiteCase, SuiteCandidate, boolean> => {
  let calls = 0;
  return {
    id: "fake",
    cases: [c],
    candidates: [{ label: "a" }],
    run: () => outcomes[calls++ % outcomes.length]!(),
    view: (pass) => ({
      mark: pass ? "." : "x",
      verdict: pass ? "PASS" : "FAIL",
      artifact: "files",
    }),
    summarize: (trials) =>
      `${trials.filter((t) => !t.error && t.outcome).length}/${trials.length}`,
    report: () => "",
  };
};

const captureOutput = (t: TestContext, dump: string | undefined) => {
  const previous = process.env.DUMP;
  const setDump = (value: string | undefined) => {
    if (value === undefined) delete process.env.DUMP;
    else process.env.DUMP = value;
  };
  setDump(dump);
  t.after(() => setDump(previous));
  let output = "";
  t.mock.method(process.stdout, "write", (chunk: string) => {
    output += chunk;
    return true;
  });
  return () => output;
};

test("records each candidate's trials in order", async (t) => {
  captureOutput(t, undefined);
  const suite = fakeSuite(
    () => true,
    () => false,
  );
  const result = await runCase(suite, c, [{ label: "a" }, { label: "b" }], 2);
  assert.deepEqual(result, {
    case: c,
    variants: [
      {
        candidate: { label: "a" },
        trials: [{ outcome: true }, { outcome: false }],
      },
      {
        candidate: { label: "b" },
        trials: [{ outcome: true }, { outcome: false }],
      },
    ],
  });
});

test("records a throwing trial as an error and keeps going", async (t) => {
  const output = captureOutput(t, undefined);
  const suite = fakeSuite(
    () => true,
    () => {
      throw new Error("timed out");
    },
    async () => false,
  );
  const result = await runCase(suite, c, suite.candidates, 3);
  assert.deepEqual(result.variants[0]?.trials, [
    { outcome: true },
    { error: true, message: "timed out" },
    { outcome: false },
  ]);
  assert.equal(output(), `  ${"a".padEnd(14)} .Ex  1/3\n`);
});

test("prints every trial's verdict and artifact with DUMP", async (t) => {
  const output = captureOutput(t, "1");
  const suite = fakeSuite(
    () => true,
    () => {
      throw new Error("timed out");
    },
  );
  await runCase(suite, c, suite.candidates, 2);
  assert.equal(
    output(),
    [
      `  ${"a".padEnd(14)} .`,
      "--- a trial 1 (PASS) ---",
      "files",
      "E",
      "--- a trial 2 (ERROR: timed out) ---",
      "",
      "  1/2",
      "",
    ].join("\n"),
  );
});
