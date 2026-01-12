import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import * as cheerio from "cheerio";
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

const DIST_DIR = path.join(import.meta.dirname, "dist");

type PageInfo = { url: string; title: string };

// Helper to derive title from Wikipedia URL
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const title = path.replace("/wiki/", "");
    return decodeURIComponent(title).replace(/_/g, " ");
  } catch {
    return url; // Fallback to URL if parsing fails
  }
}

// Wikipedia namespace prefixes to exclude from link extraction
const EXCLUDED_PREFIXES = [
  "Wikipedia:",
  "Help:",
  "File:",
  "Special:",
  "Talk:",
  "Template:",
  "Category:",
  "Portal:",
  "Draft:",
  "Module:",
  "MediaWiki:",
  "User:",
  "Main_Page",
];

// Extract wiki links from HTML, filtering out special pages and self-links
function extractWikiLinks(pageUrl: URL, html: string): PageInfo[] {
  const $ = cheerio.load(html);

  return [
    ...new Set(
      $('a[href^="/wiki/"]')
        .map((_, el) => $(el).attr("href"))
        .get()
        .filter(
          (href): href is string =>
            href !== undefined &&
            href !== pageUrl.pathname &&
            !href.includes("#") &&
            !EXCLUDED_PREFIXES.some((prefix) => href.includes(prefix)),
        ),
    ),
  ].map((href) => ({
    url: `${pageUrl.origin}${href}`,
    title: extractTitleFromUrl(`${pageUrl.origin}${href}`),
  }));
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Wiki Explorer",
    version: "1.0.0",
  });

  // Register the get-first-degree-links tool and its associated UI resource
  const resourceUri = "ui://wiki-explorer/mcp-app.html";

  registerAppTool(
    server,
    "get-first-degree-links",
    {
      title: "Get First-Degree Links",
      description:
        "Returns all Wikipedia pages that the given page links to directly.",
      inputSchema: z.object({
        url: z
          .string()
          .url()
          .default("https://en.wikipedia.org/wiki/Model_Context_Protocol")
          .describe("Wikipedia page URL"),
      }),
      _meta: { [RESOURCE_URI_META_KEY]: resourceUri },
    },
    async ({ url }): Promise<CallToolResult> => {
      let title = url;

      try {
        if (!url.match(/^https?:\/\/[a-z]+\.wikipedia\.org\/wiki\//)) {
          throw new Error("Not a valid Wikipedia URL");
        }

        title = extractTitleFromUrl(url);

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Page not found"
              : `Fetch failed: ${response.status}`,
          );
        }

        const html = await response.text();
        const links = extractWikiLinks(new URL(url), html);

        const result = { page: { url, title }, links, error: null };
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        const result = { page: { url, title }, links: [], error };
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );

      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await createServer().connect(new StdioServerTransport());
  } else {
    const port = parseInt(process.env.PORT ?? "3109", 10);
    await startServer(createServer, { port, name: "Wiki Explorer" });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
