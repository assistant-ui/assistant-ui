import { readFile } from "fs/promises";
import matter from "gray-matter";
import { logger } from "./logger.js";

export interface MDXContent {
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
    const excerpt = excerptMatch
      ? excerptMatch[1].replace(/^#+ /, "")
      : undefined;

    return {
      content,
      frontmatter: data,
      excerpt,
    };
  } catch (error) {
    logger.error(`Failed to read MDX file: ${filePath}`, error);
    return null;
  }
}

export function formatMDXContent(mdxContent: MDXContent): string {
  const { content, frontmatter } = mdxContent;

  return matter.stringify(content, frontmatter);
}
