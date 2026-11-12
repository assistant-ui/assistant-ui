import { execFileSync } from "node:child_process";
import { isExecutedAsMain } from "./lib/main.mjs";

const options = {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
  maxBuffer: 64 * 1024 * 1024,
  timeout: 30_000,
};

export function planHasTasks(args, exec = execFileSync) {
  try {
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
    // An unavailable planner must not suppress a required check.
    return true;
  }
}

export function hasTasks(base, args, exec = execFileSync) {
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
        "scripts/typecheck.sh",
        ".github/workflows/code-quality.yaml",
      ],
      options,
    );
  } catch {
    // `git diff --quiet` exits non-zero for a workspace change and for an unavailable baseline, and both run the check.
    return true;
  }
  return planHasTasks(args, exec);
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const [base, ...args] = process.argv.slice(2);
  if (!base || args.length === 0)
    throw new Error(
      "Usage: ci-has-tasks.mjs <base> <task> [turbo options], or ci-has-tasks.mjs --plan <task> [turbo options] to ask Turbo even when workspace files changed",
    );
  console.log(base === "--plan" ? planHasTasks(args) : hasTasks(base, args));
}
