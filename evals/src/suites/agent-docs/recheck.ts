import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAndStart, useBin } from "./app.ts";
import { CheckFailure, openDriver } from "./browser.ts";
import { startMockLLM } from "./mock-llm.ts";
import { tasks } from "./tasks.ts";

// `node src/suites/agent-docs/recheck.ts <run-dir> <task>`: run a task's check again on an app an agent already built.
const [runDir, taskId] = process.argv.slice(2);
const task = tasks.find((t) => t.id === taskId);
if (!runDir || !task) {
  throw new Error(
    `Usage: recheck.ts <run-dir> <task>. Tasks: ${tasks.map((t) => t.id).join(", ")}`,
  );
}
const prompt = readFileSync(join(runDir, "prompt.md"), "utf8");
const port = Number(/127\.0\.0\.1:(\d+)\/v1/.exec(prompt)?.[1] ?? 0);
const mock = await startMockLLM(port, join(runDir, "mock-recheck.jsonl"));
useBin(join(runDir, "bin"));
const app = await buildAndStart(
  join(runDir, "app"),
  join(runDir, "recheck.log"),
).catch((error: unknown) => {
  console.log(`FAIL ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
const page = await openDriver(app.url);
try {
  await task.check(page, mock);
  console.log("PASS");
} catch (error) {
  console.log(
    `FAIL ${error instanceof CheckFailure ? error.message : String(error)}`,
  );
  console.log((await page.bodyText().catch(() => "")).slice(0, 1500));
} finally {
  await page.close();
  app.stop();
  await mock.close();
}
