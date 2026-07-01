import { readFile, lstat } from "node:fs/promises";
import matter from "gray-matter";
import { MAX_FILE_SIZE } from "../constants.js";
import { logger } from "./logger.js";

interface MDXContent {
  content: string;
  frontmatter: Record<string, any>;
  excerpt?: string;
}

export async function readMDXFile(
  filePath: string,
): Promise<MDXContent | null> {
  try {
    const fileContent = await readFile(filePath, "utf-8");
    const { content, data } = matter(fileContent);

    const excerptMatch = content.match(/^(.+?)(?:\n\n|$)/);
    const excerpt =
      excerptMatch?.[1] !== undefined
        ? excerptMatch[1].replace(/^#+ /, "")
        : undefined;

    return {
      content,
      frontmatter: data,
      ...(excerpt !== undefined && { excerpt }),
    };
  } catch (error) {
    logger.error(`Failed to read MDX file: ${filePath}`, error);
    return null;
  }
}

export async function readMDXFileSafe(
  filePath: string,
): Promise<MDXContent | null> {
  try {
    const stats = await lstat(filePath);
    if (stats.isSymbolicLink()) {
      logger.warn(`Attempted to read symlink: ${filePath}`);
      return null;
    }
    if (stats.size > MAX_FILE_SIZE) {
      logger.warn(`File size exceeds limit: ${filePath} (${stats.size} bytes)`);
      return null;
    }
  } catch {
    return null;
  }
  return readMDXFile(filePath);
}

export function formatMDXContent(mdxContent: MDXContent): string {
  const { content, frontmatter } = mdxContent;

  return matter.stringify(content, frontmatter);
}
