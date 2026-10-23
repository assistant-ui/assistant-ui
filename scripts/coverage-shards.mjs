import { execFileSync } from "node:child_process";
import { globSync } from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./lib/main.mjs";
import { readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
export function coverageShards(root = repoRoot) {
  const weighted = readWorkspaceManifestEntries(root)
    .manifests.filter(({ pkg }) => pkg.scripts?.["test:coverage"])
    .map(({ manifest, pkg }) => ({
      name: pkg.name,
      weight: Math.max(
        1,
        globSync("**/*.{test,spec}.{ts,tsx,js,mjs}", {
          cwd: path.join(root, path.dirname(manifest)),
          exclude: ["node_modules/**", "dist/**", ".next/**"],
        }).length,
      ),
    }))
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
  const shards = [[], []];
  const weights = [0, 0];
  for (const entry of weighted) {
    const index = weights[0] <= weights[1] ? 0 : 1;
    shards[index].push(entry.name);
    weights[index] += entry.weight;
  }
  return shards;
}

export function coverageBuildFilters(names, tasks, root = repoRoot) {
  const packages = readWorkspaceManifestEntries(root)
    .manifests.filter(
      ({ manifest, pkg }) =>
        manifest.startsWith("packages/") &&
        names.includes(pkg.name) &&
        pkg.scripts?.build,
    )
    .map(({ pkg }) => pkg.name);
  const prerequisites = tasks
    .filter((task) => task.task === "build" && task.command !== "<NONEXISTENT>")
    .map((task) => task.package);
  return [...new Set([...packages, ...prerequisites])]
    .sort()
    .map((name) => `--filter=${name}`);
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const index = Number(process.argv[2]);
  if (![0, 1].includes(index)) throw new Error("Expected shard 0 or 1");
  const names = coverageShards()[index];
  if (names.length === 0) throw new Error("Coverage shard has no workspaces");
  const coverageFilters = names.map((name) => `--filter=${name}`);
  const filters =
    process.argv[3] === "build"
      ? coverageBuildFilters(
          names,
          JSON.parse(
            execFileSync(
              "pnpm",
              [
                "exec",
                "turbo",
                "test:coverage",
                "--dry=json",
                ...coverageFilters,
              ],
              { cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
            ),
          ).tasks,
        )
      : coverageFilters;
  for (const filter of filters) console.log(filter);
}
