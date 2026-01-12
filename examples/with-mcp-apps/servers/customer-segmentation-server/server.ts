import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { startServer } from "./server-utils.js";
import {
  generateCustomers,
  generateSegmentSummaries,
} from "./src/data-generator.ts";
import { SEGMENTS, type Customer, type SegmentSummary } from "./src/types.ts";

const DIST_DIR = path.join(import.meta.dirname, "dist");

// Schemas - types are derived from these using z.infer
const GetCustomerDataInputSchema = z.object({
  segment: z
    .enum(["All", ...SEGMENTS])
    .optional()
    .describe("Filter by segment (default: All)"),
});

// Cache generated data for session consistency
let cachedCustomers: Customer[] | null = null;
let cachedSegments: SegmentSummary[] | null = null;

function getCustomerData(segmentFilter?: string): {
  customers: Customer[];
  segments: SegmentSummary[];
} {
  // Generate data on first call
  if (!cachedCustomers) {
    cachedCustomers = generateCustomers(250);
    cachedSegments = generateSegmentSummaries(cachedCustomers);
  }

  // Filter by segment if specified
  let customers = cachedCustomers;
  if (segmentFilter && segmentFilter !== "All") {
    customers = cachedCustomers.filter((c) => c.segment === segmentFilter);
  }

  return {
    customers,
    segments: cachedSegments!,
  };
}

/**
 * Creates a new MCP server instance with tools and resources registered.
 * Each HTTP session needs its own server instance because McpServer only supports one transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "Customer Segmentation Server",
    version: "1.0.0",
  });

  // Register the get-customer-data tool and its associated UI resource
  {
    const resourceUri = "ui://customer-segmentation/mcp-app.html";

    registerAppTool(
      server,
      "get-customer-data",
      {
        title: "Get Customer Data",
        description:
          "Returns customer data with segment information for visualization. Optionally filter by segment.",
        inputSchema: GetCustomerDataInputSchema.shape,
        _meta: { [RESOURCE_URI_META_KEY]: resourceUri },
      },
      async ({ segment }): Promise<CallToolResult> => {
        const data = getCustomerData(segment);

        return {
          content: [{ type: "text", text: JSON.stringify(data) }],
        };
      },
    );

    registerAppResource(
      server,
      resourceUri,
      resourceUri,
      {
        mimeType: RESOURCE_MIME_TYPE,
        description: "Customer Segmentation Explorer UI",
      },
      async (): Promise<ReadResourceResult> => {
        const html = await fs.readFile(
          path.join(DIST_DIR, "mcp-app.html"),
          "utf-8",
        );

        return {
          contents: [
            {
              uri: resourceUri,
              mimeType: RESOURCE_MIME_TYPE,
              text: html,
            },
          ],
        };
      },
    );
  }

  return server;
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await createServer().connect(new StdioServerTransport());
  } else {
    const port = parseInt(process.env.PORT ?? "3105", 10);
    await startServer(createServer, {
      port,
      name: "Customer Segmentation Server",
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
