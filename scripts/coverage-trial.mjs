import { globSync } from "node:fs";
import path from "node:path";
import { readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const root = path.resolve(import.meta.dirname, "..");
const entries = readWorkspaceManifestEntries(root)
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
for (const entry of entries) {
  const index = weights[0] <= weights[1] ? 0 : 1;
  shards[index].push(entry.name);
  weights[index] += entry.weight;
}
const index = Number(process.argv[2]);
if (![0, 1].includes(index)) throw new Error("Expected shard 0 or 1");
for (const name of shards[index]) console.log(`--filter=${name}`);
