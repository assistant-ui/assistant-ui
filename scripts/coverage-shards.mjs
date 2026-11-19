import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { median } from "./coverage-runtimes.mjs";
import { isExecutedAsMain } from "./lib/main.mjs";
import { readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const recordedRuntimesMs = JSON.parse(
  readFileSync(new URL("./coverage-runtimes.json", import.meta.url), "utf8"),
);

function coverageWorkspaces(root) {
  return readWorkspaceManifestEntries(root)
    .manifests.filter(({ pkg }) => pkg.scripts?.["test:coverage"])
    .map(({ pkg }) => pkg.name);
}

export function coverageShards(
  root = repoRoot,
  runtimesMs = recordedRuntimesMs,
  cached = new Set(),
) {
  const durations = Object.values(runtimesMs);
  if (
    durations.length === 0 ||
    durations.some((duration) => !Number.isFinite(duration) || duration <= 0)
  ) {
    throw new Error(
      "Coverage runtimes must contain positive millisecond values. Refresh scripts/coverage-runtimes.json from successful CI logs.",
    );
  }
  const unmeasuredRuntimeMs = Math.round(median(durations));
  const weighted = coverageWorkspaces(root)
    .map((name) => ({
      name,
      weight: cached.has(name)
        ? 0
        : Object.hasOwn(runtimesMs, name)
          ? runtimesMs[name]
          : unmeasuredRuntimeMs,
    }))
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
  const shards = [[], []];
  const weights = [0, 0];
  for (const entry of weighted) {
    const index =
      weights[0] === weights[1]
        ? shards[0].length <= shards[1].length
          ? 0
          : 1
        : weights[0] < weights[1]
          ? 0
          : 1;
    shards[index].push(entry.name);
    weights[index] += entry.weight;
  }
  return shards;
}

export function cachedCoverageWorkspaces(plan) {
  const tasks = plan.tasks?.filter(
    (task) => task.task === "test:coverage" && task.command !== "<NONEXISTENT>",
  );
  if (!tasks?.length) {
    throw new Error(
      "Turbo's dry run listed no test:coverage tasks. Check that `pnpm run test:coverage --dry=json` still prints `tasks`.",
    );
  }
  const unknown = tasks.filter(
    (task) => !["HIT", "MISS"].includes(task.cache?.status),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Turbo's dry run reported no cache status for ${unknown.map((task) => task.package).join(", ")}. Check that \`pnpm run test:coverage --dry=json\` still prints \`tasks[].cache.status\`.`,
    );
  }
  return new Set(
    tasks
      .filter((task) => task.cache.status === "HIT")
      .map((task) => task.package),
  );
}

export function parseCoverageShards(json, root = repoRoot) {
  if (!json) {
    throw new Error(
      "Pass the split that `node scripts/coverage-shards.mjs --plan` printed.",
    );
  }
  const shards = JSON.parse(json);
  if (
    !Array.isArray(shards) ||
    shards.length !== 2 ||
    !shards.every((names) => Array.isArray(names) && names.length > 0)
  ) {
    throw new Error(`Expected two non-empty workspace lists, got ${json}`);
  }
  const assigned = shards.flat();
  const expected = coverageWorkspaces(root);
  const problems = [
    ["missing", expected.filter((name) => !assigned.includes(name))],
    [
      "duplicated",
      assigned.filter((name, index) => assigned.indexOf(name) !== index),
    ],
    ["unknown", assigned.filter((name) => !expected.includes(name))],
  ].filter(([, names]) => names.length > 0);
  if (problems.length > 0) {
    throw new Error(
      `The coverage split must assign every workspace with a test:coverage script exactly once (${problems.map(([kind, names]) => `${kind}: ${names.join(", ")}`).join("; ")}).`,
    );
  }
  return shards;
}

function buildFilters(filters, index) {
  const commands = [["test:coverage", ...filters]];
  if (index === 0) commands.push(["test:react-compiler"]);
  return [
    ...new Set(
      commands.flatMap(([script, ...args]) => {
        const plan = JSON.parse(
          execFileSync(
            "pnpm",
            ["--silent", "run", script, "--dry=json", ...args],
            {
              cwd: repoRoot,
              encoding: "utf8",
              maxBuffer: 64 * 1024 * 1024,
            },
          ),
        );
        return plan.tasks
          .filter(
            (task) => task.task === "build" && task.command !== "<NONEXISTENT>",
          )
          .map((task) => `--filter=${task.package}`);
      }),
    ),
  ].sort();
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const [mode, argument] = process.argv.slice(2);
  if (mode === "--plan") {
    const cached = argument
      ? cachedCoverageWorkspaces(JSON.parse(readFileSync(argument, "utf8")))
      : new Set();
    const shards = coverageShards(repoRoot, recordedRuntimesMs, cached);
    const unmeasured = shards
      .flat()
      .filter((name) => !Object.hasOwn(recordedRuntimesMs, name));
    if (unmeasured.length > 0) {
      console.error(
        `No recorded coverage runtime for ${unmeasured.join(", ")}; assigning the median recorded runtime. Refresh scripts/coverage-runtimes.json after CI completes.`,
      );
    }
    console.log(JSON.stringify(shards));
  } else if (mode === "--verify") {
    parseCoverageShards(argument);
  } else {
    const index = Number(mode);
    if (![0, 1].includes(index)) {
      throw new Error(
        "Expected shard 0 or 1, --plan [turbo-dry-run.json], or --verify <split>",
      );
    }
    const names = parseCoverageShards(process.env.COVERAGE_SHARDS)[index];
    const filters = names.map((name) => `--filter=${name}`);
    if (process.argv.includes("--build")) {
      const builds = buildFilters(filters, index);
      if (builds.length > 0) {
        execFileSync("pnpm", ["exec", "turbo", "build", ...builds], {
          cwd: repoRoot,
          stdio: "inherit",
        });
      }
    } else {
      for (const filter of filters) console.log(filter);
    }
  }
}
