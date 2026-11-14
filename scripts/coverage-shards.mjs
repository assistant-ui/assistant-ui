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
  const weighted = readWorkspaceManifestEntries(root)
    .manifests.filter(({ pkg }) => pkg.scripts?.["test:coverage"])
    .map(({ pkg }) => ({
      name: pkg.name,
      weight: cached.has(pkg.name)
        ? 0
        : Object.hasOwn(runtimesMs, pkg.name)
          ? runtimesMs[pkg.name]
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

export function cachedCoverageWorkspaces(root = repoRoot) {
  const plan = JSON.parse(
    execFileSync(
      "pnpm",
      ["--silent", "run", "test:coverage", "--dry=json", "--cache=local:r"],
      { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    ),
  );
  const tasks = plan.tasks?.filter(
    (task) => task.task === "test:coverage" && task.command !== "<NONEXISTENT>",
  );
  const unknown = tasks?.filter(
    (task) => !["HIT", "MISS"].includes(task.cache?.status),
  );
  if (!tasks || unknown.length > 0) {
    throw new Error(
      `Turbo's dry run reported no cache status for ${unknown?.map((task) => task.package).join(", ") || "any test:coverage task"}. Check that \`pnpm run test:coverage --dry=json\` still prints \`tasks[].cache.status\`.`,
    );
  }
  return new Set(
    tasks
      .filter((task) => task.cache.status === "HIT")
      .map((task) => task.package),
  );
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
  const index = Number(process.argv[2]);
  if (![0, 1].includes(index)) throw new Error("Expected shard 0 or 1");
  const names = coverageShards(
    repoRoot,
    recordedRuntimesMs,
    cachedCoverageWorkspaces(),
  )[index];
  if (names.length === 0) throw new Error("Coverage shard has no workspaces");
  const unmeasured = names.filter(
    (name) => !Object.hasOwn(recordedRuntimesMs, name),
  );
  if (unmeasured.length > 0) {
    console.error(
      `No recorded coverage runtime for ${unmeasured.join(", ")}; assigning the median recorded runtime. Refresh scripts/coverage-runtimes.json after CI completes.`,
    );
  }
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
