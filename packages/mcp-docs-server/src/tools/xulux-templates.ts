import { z } from "zod/v3";
import { logger } from "../utils/logger.js";
import { formatMCPResponse } from "../utils/mcp-format.js";
import { getXuluxCatalog } from "../xulux/catalog-client.js";
import {
  createTemplatePreview,
  getTemplateDetails,
  listTemplates,
} from "../xulux/template-service.js";

const emptyInputSchema = z.object({});

const detailsInputSchema = z.object({
  templateId: z
    .string()
    .describe("The template id from assistantUITemplates"),
  versionId: z
    .string()
    .optional()
    .describe(
      "Optional version id. When provided, exampleConfig reflects that version's resolved defaults.",
    ),
});

const previewInputSchema = z.object({
  templateId: z
    .string()
    .describe("The template id from assistantUITemplates"),
  versionId: z
    .string()
    .optional()
    .describe("Version id to use. Uses the template default if omitted."),
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Customization config for the preview. Must contain only the top-level keys: hostUi, assistant, and brandTheme. " +
        "Use the schemas from assistantUITemplateDetails.configRoots as the source of truth for each root. " +
        "Do not pass any other root keys.",
    ),
});

function withDegradedNote<T extends Record<string, unknown>>(
  payload: T,
  degraded: boolean,
  degradedReason?: string,
): T & { catalogDegraded?: true; catalogDegradedReason?: string } {
  if (!degraded) return payload;
  return {
    ...payload,
    catalogDegraded: true,
    ...(degradedReason ? { catalogDegradedReason: degradedReason } : {}),
  };
}

export const xuluxTemplatesListTool = {
  name: "assistantUITemplates",
  description:
    "List the available assistant-ui hosted app templates and fixed demos with their features, customizable surfaces, and versions. " +
    "Call this first for any assistant-ui app-building request. Use the features and customizable fields to decide which template fits. " +
    "If customizable is empty, the entry is a fixed demo that should be used as-is rather than configured. " +
    "Call assistantUITemplateDetails on the chosen template before requesting a preview.",
  parameters: emptyInputSchema.shape,
  execute: async (_args: z.infer<typeof emptyInputSchema>) => {
    logger.info("Listing assistant-ui templates");
    try {
      const { catalog, degraded, degradedReason } = await getXuluxCatalog();
      return formatMCPResponse(
        withDegradedNote(listTemplates(catalog), degraded, degradedReason),
      );
    } catch (error) {
      logger.error("Failed to list assistant-ui templates", error);
      return formatMCPResponse({
        error: "Failed to list assistant-ui templates",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

export const xuluxTemplateDetailsTool = {
  name: "assistantUITemplateDetails",
  description:
    "Get the full authoring surface for a specific assistant-ui hosted template. " +
    "Returns configRoots schemas (with types, defaults, and enums), rules, built-in tool input/outputShape, renderer contracts, and an exampleConfig. " +
    "Fixed demos return no configRoots; use those as-is without config. " +
    "Use this before calling assistantUITemplatePreview to understand exactly what config to write. " +
    "If assistantUITemplatePreview returns validationWarnings, call this again and cross-reference configRoots to correct the config.",
  parameters: detailsInputSchema.shape,
  execute: async (args: z.infer<typeof detailsInputSchema>) => {
    logger.info(`Getting assistant-ui template details for: ${args.templateId}`);
    try {
      const { catalog, degraded, degradedReason } = await getXuluxCatalog();
      const details = await getTemplateDetails(catalog, args);
      return formatMCPResponse(
        withDegradedNote(
          details as unknown as Record<string, unknown>,
          degraded,
          degradedReason,
        ),
      );
    } catch (error) {
      logger.error("Failed to get assistant-ui template details", error);
      return formatMCPResponse({
        error: "Failed to get assistant-ui template details",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

export const xuluxTemplatePreviewTool = {
  name: "assistantUITemplatePreview",
  description:
    "Return preview and download URLs for a selected assistant-ui hosted template. " +
    "The previewUrl is a hosted app URL; show it to the user first, or open it with an available browser/in-app-browser tool if your client provides one. " +
    "If you pass config, a preview session is created on the hosted template sandbox and the returned URLs reflect that configuration. " +
    "Do not pass config for fixed demos that have no configRoots in assistantUITemplateDetails. " +
    "This tool only returns URLs.",
  parameters: previewInputSchema.shape,
  execute: async (args: z.infer<typeof previewInputSchema>) => {
    logger.info(`Creating assistant-ui template preview for: ${args.templateId}`);
    try {
      const { catalog, degraded, degradedReason } = await getXuluxCatalog();
      const result = await createTemplatePreview(catalog, args);
      return formatMCPResponse(
        withDegradedNote(
          result as unknown as Record<string, unknown>,
          degraded,
          degradedReason,
        ),
      );
    } catch (error) {
      logger.error("Failed to create assistant-ui template preview", error);
      return formatMCPResponse({
        error: "Failed to create assistant-ui template preview",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
