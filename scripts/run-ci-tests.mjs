import { spawnSync } from "node:child_process";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";

const testTasks = (plan) =>
  plan.tasks.filter(
    (task) => task.task === "test" && task.command !== "<NONEXISTENT>",
  );

export function runCiTests(
  args,
  { run = spawnSync, cpus = availableParallelism(), env = process.env } = {},
) {
  let parallel = false;
  // Worker caps slow narrow or mostly cached selections; the measured win is a full uncached suite on four CPUs.
  if (cpus === 4) {
    const plan = (filters) => {
      const result = run(
        "pnpm",
        ["exec", "turbo", "run", "test", "--dry=json", ...filters],
        { env, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
      );
      if (result.status !== 0) throw new Error("Test planning failed");
      return testTasks(JSON.parse(result.stdout));
    };
    try {
      const selected = plan(args);
      if (
        selected.length > 1 &&
        selected.every((task) => task.cache.status === "MISS")
      ) {
        const all = plan([]);
        const ids = new Set(selected.map((task) => task.taskId));
        parallel =
          all.length === ids.size && all.every((task) => ids.has(task.taskId));
      }
    } catch {
      console.warn("Could not plan test scheduling; using serial tasks.");
    }
  }

  console.log(
    parallel
      ? "Full uncached suite: 2 test tasks with 2 Vitest workers each."
      : "Using serial test tasks with the existing worker settings.",
  );
  return (
    run(
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "test",
        `--concurrency=${parallel ? 2 : 1}`,
        ...args,
      ],
      {
        stdio: "inherit",
        env: parallel ? { ...env, VITEST_MAX_WORKERS: "2" } : env,
      },
    ).status ?? 1
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runCiTests(process.argv.slice(2)));
}
