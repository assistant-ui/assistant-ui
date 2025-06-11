import { rm, mkdir, readdir, readFile, writeFile } from "fs/promises";
import { join, relative, extname } from "path";
import { logger } from "../utils/logger.js";
import { ROOT_DIR, EXAMPLES_PATH } from "../constants.js";

const OUTPUT_DIR = join(
  ROOT_DIR,
  "packages/mcp-docs-server/.docs/organized/code-examples",
);
const MAX_LINES = 10000;

interface FileContent {
  path: string;
  content: string;
}

async function scanDirectory(
  dir: string,
  baseDir: string,
): Promise<FileContent[]> {
  const files: FileContent[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const skipDirs = [
          "node_modules",
          "dist",
          "build",
          ".next",
          ".git",
          ".turbo",
        ];
        if (!skipDirs.includes(entry.name)) {
          const subFiles = await scanDirectory(fullPath, baseDir);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        const includeExts = [
          ".ts",
          ".tsx",
          ".js",
          ".jsx",
          ".json",
          ".css",
          ".md",
          ".mdx",
        ];
        const ext = extname(entry.name).toLowerCase();

        if (
          includeExts.includes(ext) ||
          entry.name === "package.json" ||
          entry.name === "tsconfig.json"
        ) {
          try {
            const content = await readFile(fullPath, "utf-8");
            const relativePath = relative(baseDir, fullPath);
            files.push({ path: relativePath, content });
          } catch (error) {
            logger.warn(`Failed to read file: ${fullPath}`, error);
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to scan directory: ${dir}`, error);
  }

  return files;
}

function getFileType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const extMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".json": "json",
    ".css": "css",
    ".md": "markdown",
    ".mdx": "mdx",
  };
  return extMap[ext] || "text";
}

export async function prepareCodeExamples(): Promise<void> {
  logger.info("Preparing code examples...");

  try {
    await rm(OUTPUT_DIR, { recursive: true, force: true });
    await mkdir(OUTPUT_DIR, { recursive: true });

    const exampleDirs = await readdir(EXAMPLES_PATH, { withFileTypes: true });

    for (const dir of exampleDirs) {
      if (dir.isDirectory() && !dir.name.startsWith(".")) {
        const examplePath = join(EXAMPLES_PATH, dir.name);
        logger.info(`Processing example: ${dir.name}`);

        let description = "";
        try {
          const packageJsonPath = join(examplePath, "package.json");
          const packageJson = JSON.parse(
            await readFile(packageJsonPath, "utf-8"),
          );
          description = packageJson.description || "";
        } catch (error: any) {
          if (error?.code !== "ENOENT") {
            logger.warn(`Failed to read package.json for ${dir.name}:`, error);
          } else {
            logger.debug(`No package.json found for example: ${dir.name}`);
          }
        }

        const files = await scanDirectory(examplePath, examplePath);

        files.sort((a, b) => a.path.localeCompare(b.path));

        let markdown = `# Example: ${dir.name}\n\n`;
        if (description) {
          markdown += `${description}\n\n`;
        }

        let totalLines = 0;
        for (const file of files) {
          const lines = file.content.split("\n").length;
          if (totalLines + lines > MAX_LINES) {
            markdown += `\n_Note: Additional files truncated due to size limits_\n`;
            break;
          }

          markdown += `## ${file.path}\n\n`;
          markdown += `\`\`\`${getFileType(file.path)}\n`;
          markdown += file.content;
          markdown += `\n\`\`\`\n\n`;

          totalLines += lines;
        }

        const outputPath = join(OUTPUT_DIR, `${dir.name}.md`);
        await writeFile(outputPath, markdown, "utf-8");
        logger.debug(`Created example: ${outputPath}`);
      }
    }

    logger.info("Code examples preparation complete");
  } catch (error) {
    logger.error("Failed to prepare code examples", error);
    throw error;
  }
}
