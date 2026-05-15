import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const benchDir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(benchDir)
  .filter((f) => /\.bench\.tsx?$/.test(f))
  .sort();

if (files.length === 0) {
  console.log("no bench files found");
  process.exit(0);
}

let exitCode = 0;
for (const f of files) {
  console.log(`\n=== ${f} ===`);
  const r = spawnSync("tsx", [join(benchDir, f)], { stdio: "inherit" });
  if (r.status !== 0 && exitCode === 0) exitCode = r.status ?? 1;
}

process.exit(exitCode);
