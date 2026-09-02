import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const DOCS_ROOT = process.cwd();
const REPO_ROOT = path.resolve(DOCS_ROOT, "../..");
const OUTPUT_DIR = path.join(DOCS_ROOT, "generated");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "source-snapshot.json");
const READ_CONCURRENCY = 32;
// Every serverless instance parses the snapshot at module scope and the repo sandbox materializes it again, costing roughly 14x its byte size in resident memory.
const SNAPSHOT_BYTE_BUDGET = 64_000_000;
const BUDGET_REPORT_ENTRIES = 15;
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
    throw new Error(formatBudgetError(snapshot, size));
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

function formatBudgetError(snapshot: Record<string, string>, size: number) {
  const largest = Object.entries(snapshot)
    .map(([filePath, contents]) => ({
      filePath,
      bytes: Buffer.byteLength(contents, "utf-8"),
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, BUDGET_REPORT_ENTRIES)
    .map(
      ({ filePath, bytes }) =>
        `  ${formatBytes(bytes).padStart(9)}  ${filePath}`,
    )
    .join("\n");

  return [
    `Source snapshot is ${formatBytes(size)} across ${Object.keys(snapshot).length} files, over the ${formatBytes(SNAPSHOT_BYTE_BUDGET)} budget.`,
    "",
    "Prefer excluding files the docs assistant does not need to read, by adding a SOURCE_SNAPSHOT_EXCLUDE pattern in this script, over raising the budget.",
    "",
    "Largest entries:",
    largest,
  ].join("\n");
}

function formatBytes(bytes: number) {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.round(bytes / 1_000)} KB`;
}

await main();
