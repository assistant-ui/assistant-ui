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
  const names = coverageShards()[index];
  if (names.length === 0) throw new Error("Coverage shard has no workspaces");
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
