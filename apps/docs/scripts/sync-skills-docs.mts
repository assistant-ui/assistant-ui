import { promises as fs } from "node:fs";
import path from "node:path";

const DOCS_ROOT = process.cwd();
const REPO_ROOT = path.resolve(DOCS_ROOT, "../..");
const GENERATED_HEADER =
  "<!-- Generated from apps/docs content. Do not edit directly. -->";

const CHECK_MODE = process.argv.includes("--check");

const GENERATED_REFERENCES = [
  {
    sourcePath: "apps/docs/content/docs/(docs)/architecture.mdx",
    outputPath:
      "packages/cli/plugin/skills/assistant-ui/references/architecture.md",
  },
  {
    sourcePath: "apps/docs/content/docs/(docs)/cli.mdx",
    outputPath: "packages/cli/plugin/skills/assistant-ui/references/cli.md",
  },
] as const;

async function renderReference(sourcePath: string) {
  const content = await fs.readFile(path.join(REPO_ROOT, sourcePath), "utf-8");
  return `${GENERATED_HEADER}\n<!-- Source: ${sourcePath} -->\n\n${content.trim()}\n`;
}

async function syncReference(config: (typeof GENERATED_REFERENCES)[number]) {
  const outputPath = path.join(REPO_ROOT, config.outputPath);
  const nextContent = await renderReference(config.sourcePath);

  if (CHECK_MODE) {
    let currentContent: string;
    try {
      currentContent = await fs.readFile(outputPath, "utf-8");
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new Error(`${config.outputPath} does not exist. Run sync first.`);
      }

      throw error;
    }

    if (currentContent !== nextContent) {
      throw new Error(`${config.outputPath} is stale. Run skills:sync-docs.`);
    }

    return;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, nextContent);
}

async function main() {
  for (const config of GENERATED_REFERENCES) {
    await syncReference(config);
  }

  console.log(
    CHECK_MODE
      ? "Skill docs references are up to date."
      : "Skill docs references synced.",
  );
}

await main();
