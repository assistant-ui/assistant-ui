import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  SNAPSHOT_BYTE_BUDGET,
  formatBudgetError,
} from "./source-snapshot-budget.mts";

const DOCS_ROOT = process.cwd();
const REPO_ROOT = path.resolve(DOCS_ROOT, "../..");
const OUTPUT_DIR = path.join(DOCS_ROOT, "generated");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "source-snapshot.json");
const READ_CONCURRENCY = 32;
const SOURCE_SNAPSHOT_EXCLUDE = [
  /pnpm-lock\.yaml$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /uv\.lock$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.ico$/,
  /\.svg$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.mp[34]$/,
  /\.webm$/,
  /\.webp$/,
  /\.pdf$/,
  /\.zip$/,
  /\.tar$/,
  /\.gz$/,
  /\/dist\//,
  /\/\.next\//,
];

async function main() {
  const files = listTrackedFiles()
    .map((filePath) => filePath.replace(/\\/g, "/"))
    .filter(
      (filePath) => !SOURCE_SNAPSHOT_EXCLUDE.some((re) => re.test(filePath)),
    );

  const snapshot = await buildSnapshot(files);
  const serialized = JSON.stringify(snapshot);
  const size = Buffer.byteLength(serialized, "utf-8");

  if (size > SNAPSHOT_BYTE_BUDGET) {
    console.error(formatBudgetError(snapshot, size));
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, serialized);
}

async function buildSnapshot(files: string[]) {
  const snapshot: Record<string, string> = {};
  let index = 0;

  async function worker() {
    while (true) {
      const currentIndex = index++;
      if (currentIndex >= files.length) return;

      const filePath = files[currentIndex]!;
      try {
        snapshot[filePath] = await fs.readFile(
          path.join(REPO_ROOT, filePath),
          "utf-8",
        );
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          continue;
        }

        throw error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(READ_CONCURRENCY, files.length) }, () =>
      worker(),
    ),
  );

  return snapshot;
}

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });

  return output.split("\0").filter(Boolean);
}

await main();
