import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function hasTasks(base, args, exec = execFileSync) {
  const options = {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 64 * 1024 * 1024,
    timeout: 30_000,
  };
  try {
    exec(
      "git",
      [
        "diff",
        "--quiet",
        base,
        "HEAD",
        "--",
        "packages",
        "apps",
        "examples",
        "templates",
        "scripts/ci-has-tasks.mjs",
        "scripts/ci-has-tasks.test.mjs",
        ".github/workflows/code-quality.yaml",
      ],
      options,
    );
    const [root] = JSON.parse(
      exec(
        "pnpm",
        [
          "--filter=.",
          "list",
          "turbo",
          "--lockfile-only",
          "--depth=0",
          "--json",
        ],
        options,
      ),
    );
    const version = root.devDependencies.turbo.version;
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version))
      return true;
    const plan = JSON.parse(
      exec("pnpm", ["dlx", `turbo@${version}`, "run", ...args, "--dry=json"], {
        ...options,
        timeout: 120_000,
      }),
    );
    if (!Array.isArray(plan.tasks)) return true;
    return plan.tasks.some((task) => task.command !== "<NONEXISTENT>");
  } catch {
    // An unavailable baseline or planner must not suppress a required check.
    return true;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [base, ...args] = process.argv.slice(2);
  if (!base || args.length === 0)
    throw new Error("Usage: ci-has-tasks.mjs <base> <task> [turbo options]");
  console.log(hasTasks(base, args));
}
