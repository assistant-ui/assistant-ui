import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const REDIS_TEST_PACKAGES = ["assistant-stream", "@assistant-ui/docs"];

export function needsRedisTestService(plan) {
  if (
    !Array.isArray(plan?.tasks) ||
    plan.tasks.some(
      (task) =>
        typeof task?.package !== "string" || typeof task?.task !== "string",
    )
  ) {
    throw new Error("Expected a Turbo task plan");
  }
  return plan.tasks.some(
    (task) =>
      task.task === "test" && REDIS_TEST_PACKAGES.includes(task.package),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(
    `${needsRedisTestService(JSON.parse(readFileSync(0, "utf8")))}\n`,
  );
}
