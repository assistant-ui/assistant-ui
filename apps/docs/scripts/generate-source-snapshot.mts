import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SOURCE_SNAPSHOT_EXCLUDE } from "../lib/source-snapshot";

const DOCS_ROOT = process.cwd();
const REPO_ROOT = path.resolve(DOCS_ROOT, "../..");
const OUTPUT_DIR = path.join(DOCS_ROOT, "generated");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "source-snapshot.json");

async function main() {
  const files = listTrackedFiles()
    .map((filePath) => filePath.replace(/\\/g, "/"))
    .filter((filePath) => !SOURCE_SNAPSHOT_EXCLUDE.some((re) => re.test(filePath)));

  const snapshot = Object.fromEntries(
    await Promise.all(
      files.map(async (filePath) => [
        filePath,
        await fs.readFile(path.join(REPO_ROOT, filePath), "utf-8"),
      ]),
    ),
  );

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(snapshot));
}

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });

  return output.split("\0").filter(Boolean);
}

await main();
