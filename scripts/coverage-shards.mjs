import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./lib/main.mjs";
import { readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
export function coverageShards(root = repoRoot, durations = {}) {
  const weighted = readWorkspaceManifestEntries(root)
    .manifests.filter(({ pkg }) => pkg.scripts?.["test:coverage"])
    .map(({ manifest, pkg }) => ({
      name: pkg.name,
      weight:
        durations[pkg.name] ??
        Math.max(
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

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const index = Number(process.argv[2]);
  if (![0, 1].includes(index)) throw new Error("Expected shard 0 or 1");
  const durations = JSON.parse(
    readFileSync(new URL("./coverage-durations.json", import.meta.url), "utf8"),
  ).seconds;
  const names = coverageShards(repoRoot, durations)[index];
  if (names.length === 0) throw new Error("Coverage shard has no workspaces");
  for (const name of names) console.log(`--filter=${name}`);
}
