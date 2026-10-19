import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Verdict } from "../comment-hygiene/types.ts";
import type { QualityCase } from "./cases.ts";

export function verify(c: QualityCase, artifact: string): Verdict {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = (source: string) => {
    const dir = mkdtempSync(join(tmpdir(), "aui-test-quality-"));
    try {
      writeFileSync(join(dir, "runtime.test.mjs"), artifact);
      writeFileSync(join(dir, "runtime.mjs"), source);
      const result = spawnSync(
        process.execPath,
        ["--test", "--test-reporter=tap", "runtime.test.mjs"],
        {
          cwd: dir,
          env,
          encoding: "utf8",
          timeout: 10_000,
          maxBuffer: 1024 * 1024,
        },
      );
      if (
        result.error &&
        !["ETIMEDOUT", "ENOBUFS"].includes(
          (result.error as NodeJS.ErrnoException).code ?? "",
        )
      )
        throw result.error;
      return {
        completed: !result.error && result.status !== null,
        code: result.status,
        output: `${result.error?.message ?? result.signal ?? ""}\n${result.stdout}${result.stderr}`,
      };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const correct = run(c.source);
  if (!correct.completed)
    return {
      pass: false,
      reason: `Test did not complete on correct code:\n${correct.output.slice(0, 4000)}`,
    };
  if (correct.code !== 0)
    return {
      pass: false,
      reason: `Test fails on correct code:\n${correct.output}`,
    };
  const faulty = run(c.faultySource);
  if (!faulty.completed)
    return {
      pass: false,
      reason: `Test did not complete on faulty code:\n${faulty.output.slice(0, 4000)}`,
    };
  if (faulty.code === 0)
    return { pass: false, reason: "Test passes with the known fault present." };
  if (!/^\s+code: ['"]ERR_ASSERTION['"]$/m.test(faulty.output)) {
    return {
      pass: false,
      reason: `Faulty code fails without assertion evidence:\n${faulty.output}`,
    };
  }
  return {
    pass: true,
    reason: "Test passes correct code and detects the fault with an assertion.",
  };
}
