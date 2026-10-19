import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Verdict } from "../comment-hygiene/types.ts";
import type { QualityCase } from "./cases.ts";

export function verify(c: QualityCase, artifact: string): Verdict {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const dir = mkdtempSync(join(tmpdir(), "aui-test-quality-"));
  try {
    writeFileSync(join(dir, "runtime.test.mjs"), artifact);
    const run = (source: string) => {
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
      if (result.error) throw result.error;
      if (result.status === null)
        throw new Error(`Test runner terminated: ${result.signal}`);
      return { code: result.status, output: result.stdout + result.stderr };
    };
    const correct = run(c.source);
    if (correct.code !== 0) {
      return {
        pass: false,
        reason: `Test fails on correct code:\n${correct.output}`,
      };
    }
    const faulty = run(c.faultySource);
    if (faulty.code === 0)
      return {
        pass: false,
        reason: "Test passes with the known fault present.",
      };
    if (!/^\s+code: ['"]ERR_ASSERTION['"]$/m.test(faulty.output)) {
      return {
        pass: false,
        reason: `Faulty code fails without assertion evidence:\n${faulty.output}`,
      };
    }
    return {
      pass: true,
      reason:
        "Test passes correct code and detects the fault with an assertion.",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
