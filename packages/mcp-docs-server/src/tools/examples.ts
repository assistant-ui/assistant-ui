import { z } from "zod";
import { readFile, readdir, lstat } from "fs/promises";
import { join, extname } from "path";
import { CODE_EXAMPLES_PATH, MAX_FILE_SIZE } from "../constants.js";
import { logger } from "../utils/logger.js";
import { formatMCPResponse } from "../utils/mcp-format.js";
import { sanitizePath } from "../utils/security.js";

const examplesInputSchema = z.object({
  example: z
    .string()
    .optional()
    .describe(
      'Example name (e.g., "with-ai-sdk"). Leave empty to list all examples.',
    ),
});

async function listCodeExamples(): Promise<string[]> {
  try {
    const files = await readdir(CODE_EXAMPLES_PATH);
    return files
      .filter((file) => extname(file) === ".md")
      .map((file) => file.replace(".md", ""))
      .sort();
  } catch (error) {
    logger.error("Failed to list code examples", error);
    return [];
  }
}

async function readCodeExample(exampleName: string): Promise<string | null> {
  try {
    const sanitized = sanitizePath(exampleName);
    const filePath = join(CODE_EXAMPLES_PATH, `${sanitized}.md`);

    const stats = await lstat(filePath);
    if (stats.isSymbolicLink()) {
      logger.warn(`Attempted to read symlink: ${filePath}`);
      return null;
    }

    if (stats.size > MAX_FILE_SIZE) {
      logger.warn(`File size exceeds limit: ${filePath} (${stats.size} bytes)`);
      return null;
    }

    const content = await readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    logger.error(`Failed to read example: ${exampleName}`, error);
    return null;
  }
}

export const examplesTools = {
  name: "assistantUIExamples",
  description:
    "List available examples or retrieve complete code for a specific example",
  parameters: examplesInputSchema.shape,
  execute: async ({ example }: z.infer<typeof examplesInputSchema>) => {
    try {
      if (!example) {
        logger.info("Listing all available examples");
        const examples = await listCodeExamples();

        if (examples.length === 0) {
          return formatMCPResponse({
            error:
              "No examples found. Please run documentation preparation first.",
            hint: "Run: pnpm prepare-docs",
          });
        }

        return formatMCPResponse({
          type: "list",
          examples,
          total: examples.length,
          hint: "Use example parameter to get complete code for any example",
        });
      }

      logger.info(`Retrieving example: ${example}`);
      const content = await readCodeExample(example);

      if (!content) {
        const availableExamples = await listCodeExamples();
        return formatMCPResponse({
          error: `Example not found: ${example}`,
          availableExamples,
          hint: "Use without example parameter to list all available examples",
        });
      }

      return formatMCPResponse({
        type: "example",
        name: example,
        content,
      });
    } catch (error) {
      logger.error("Failed to retrieve examples", error);
      return formatMCPResponse({
        error: "Failed to retrieve examples",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
