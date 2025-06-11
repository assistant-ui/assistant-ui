import { rm, mkdir, readdir, copyFile } from "fs/promises";
import { join, extname } from "path";
import { logger } from "../utils/logger.js";
import { ROOT_DIR } from "../constants.js";

const DOCS_SOURCE = join(ROOT_DIR, "apps/docs/content/docs");
const BLOG_SOURCE = join(ROOT_DIR, "apps/docs/content/blog");
const DOCS_DEST = join(ROOT_DIR, "packages/mcp-docs-server/.docs/raw");

async function copyDir(src: string, dest: string): Promise<void> {
  try {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (ext === ".mdx" || ext === ".md") {
          await copyFile(srcPath, destPath);
          logger.debug(`Copied: ${srcPath} -> ${destPath}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to copy directory: ${src}`, error);
    throw error;
  }
}

export async function copyRaw(): Promise<void> {
  logger.info("Copying raw documentation files...");

  try {
    await rm(DOCS_DEST, { recursive: true, force: true });
    await mkdir(DOCS_DEST, { recursive: true });

    const docsPath = join(DOCS_DEST, "docs");
    await copyDir(DOCS_SOURCE, docsPath);
    logger.info(`Copied documentation to ${docsPath}`);

    const blogPath = join(DOCS_DEST, "blog");
    await copyDir(BLOG_SOURCE, blogPath);
    logger.info(`Copied blog posts to ${blogPath}`);

    logger.info("Raw documentation copy complete");
  } catch (error) {
    logger.error("Failed to copy raw documentation", error);
    throw error;
  }
}
