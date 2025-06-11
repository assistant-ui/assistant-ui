import { z } from "zod";
import { stat } from "fs/promises";
import { join, extname } from "path";
import { DOCS_PATH, MDX_EXTENSION } from "../constants.js";
import { logger } from "../utils/logger.js";
import {
  listDirContents,
  getAvailablePaths,
  findNearestPaths,
  pathExists,
} from "../utils/paths.js";
import { readMDXFile, formatMDXContent } from "../utils/mdx.js";
import { formatMCPResponse } from "../utils/mcp-format.js";

const docsInputSchema = z.object({
  paths: z
    .array(z.string())
    .min(1)
    .describe(
      'Documentation paths to retrieve (e.g., ["getting-started", "api-reference/primitives/Thread"])',
    ),
});

interface DocResult {
  path: string;
  found: boolean;
  type?: "file" | "directory";
  content?: string;
  files?: string[];
  directories?: string[];
  suggestions?: string[];
}

async function readDocumentation(docPath: string): Promise<DocResult> {
  logger.debug(`Reading documentation for path: ${docPath}`);

  if (docPath === "/" || docPath === "") {
    const { directories, files } = await listDirContents(DOCS_PATH);
    return {
      path: "/",
      found: true,
      type: "directory",
      directories,
      files: files.map((f) => f.replace(MDX_EXTENSION, "")),
    };
  }

  const fullPath = join(DOCS_PATH, docPath);

  if (await pathExists(fullPath)) {
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      const { directories, files } = await listDirContents(fullPath);

      const contents: Record<string, string> = {};
      for (const file of files) {
        const mdxContent = await readMDXFile(join(fullPath, file));
        if (mdxContent) {
          const fileName = file.replace(MDX_EXTENSION, "");
          contents[fileName] = formatMDXContent(mdxContent);
        }
      }

      return {
        path: docPath,
        found: true,
        type: "directory",
        directories,
        files: files.map((f) => f.replace(MDX_EXTENSION, "")),
        content:
          Object.keys(contents).length > 0
            ? JSON.stringify(contents, null, 2)
            : undefined,
      };
    }
  }

  const mdxPath =
    extname(fullPath) === MDX_EXTENSION
      ? fullPath
      : `${fullPath}${MDX_EXTENSION}`;
  if (await pathExists(mdxPath)) {
    const mdxContent = await readMDXFile(mdxPath);

    if (mdxContent) {
      return {
        path: docPath,
        found: true,
        type: "file",
        content: formatMDXContent(mdxContent),
      };
    }
  }

  const availablePaths = await getAvailablePaths();
  const suggestions = findNearestPaths(docPath, availablePaths);

  return {
    path: docPath,
    found: false,
    suggestions,
  };
}

export const docsTools = {
  name: "assistantUIDocs",
  description:
    'Retrieve assistant-ui documentation by path. Use "/" to list all sections. Supports multiple paths in a single request.',
  parameters: docsInputSchema.shape,
  execute: async ({ paths }: z.infer<typeof docsInputSchema>) => {
    logger.info(`Retrieving documentation for paths: ${paths.join(", ")}`);

    try {
      const results = await Promise.all(
        paths.map((path) => readDocumentation(path)),
      );

      if (results.length === 1) {
        const result = results[0];
        if (!result.found) {
          return formatMCPResponse({
            error: `Documentation not found for path: ${result.path}`,
            suggestions: result.suggestions,
            hint: 'Use "/" to list all available documentation sections',
          });
        }
        return formatMCPResponse(result);
      }

      return formatMCPResponse({
        results,
        summary: `Retrieved ${results.filter((r) => r.found).length} of ${results.length} requested paths`,
      });
    } catch (error) {
      logger.error("Failed to retrieve documentation", error);
      return formatMCPResponse({
        error: "Failed to retrieve documentation",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
