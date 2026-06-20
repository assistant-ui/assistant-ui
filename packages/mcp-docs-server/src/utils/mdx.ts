import { readFile } from "node:fs/promises";
import yaml from "js-yaml";
import { logger } from "./logger.js";

interface MDXContent {
  content: string;
  frontmatter: Record<string, any>;
  excerpt?: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseMDXContent(fileContent: string): MDXContent {
  const match = fileContent.match(FRONTMATTER_PATTERN);

  if (!match) {
    return {
      content: fileContent,
      frontmatter: {},
    };
  }

  const parsed = yaml.load(match[1] ?? "") ?? {};
  const frontmatter =
    typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : {};

  return {
    content: fileContent.slice(match[0].length),
    frontmatter,
  };
}

export async function readMDXFile(
  filePath: string,
): Promise<MDXContent | null> {
  try {
    const fileContent = await readFile(filePath, "utf-8");
    const { content, frontmatter } = parseMDXContent(fileContent);

    const excerptMatch = content.match(/^(.+?)(?:\n\n|$)/);
    const excerpt =
      excerptMatch?.[1] !== undefined
        ? excerptMatch[1].replace(/^#+ /, "")
        : undefined;

    return {
      content,
      frontmatter,
      ...(excerpt !== undefined && { excerpt }),
    };
  } catch (error) {
    logger.error(`Failed to read MDX file: ${filePath}`, error);
    return null;
  }
}

export function formatMDXContent(mdxContent: MDXContent): string {
  const { content, frontmatter } = mdxContent;

  if (Object.keys(frontmatter).length === 0) {
    return content;
  }

  return `---\n${yaml.dump(frontmatter)}---\n\n${content}`;
}
