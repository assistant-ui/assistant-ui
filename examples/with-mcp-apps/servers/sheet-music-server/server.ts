import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import ABCJS from "abcjs";
import {
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startServer } from "./server-utils.js";

const DIST_DIR = path.join(import.meta.dirname, "dist");

const DEFAULT_ABC_NOTATION_INPUT = `X:1
T:Twinkle, Twinkle Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
G G F F | E E D2 | G G F F | E E D2 |
C C G G | A A G2 | F F E E | D D C2 |`;

/**
 * Creates a new MCP server instance with the sheet music tool and resource.
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: "Sheet Music Server",
    version: "1.0.0",
  });

  const resourceUri = "ui://sheet-music/mcp-app.html";

  // Register the play-sheet-music tool.
  // Validates ABC notation server-side, then the client renders via ontoolinput.
  registerAppTool(
    server,
    "play-sheet-music",
    {
      title: "Play Sheet Music",
      description:
        "Plays music from ABC notation with audio playback and visual sheet music. " +
        "Use this to compose original songs (for birthdays, holidays, or any occasion) " +
        "or perform well-known tunes (folk songs, nursery rhymes, hymns, classical melodies). " +
        "For accurate renditions of well-known tunes, look up the ABC notation from " +
        "abcnotation.com or thesession.org rather than recalling from memory.",
      inputSchema: z.object({
        abcNotation: z
          .string()
          .default(DEFAULT_ABC_NOTATION_INPUT)
          .describe(
            "ABC notation string to render as sheet music with audio playback",
          ),
      }),
      _meta: { [RESOURCE_URI_META_KEY]: resourceUri },
    },
    async ({ abcNotation }): Promise<CallToolResult> => {
      // Validate ABC notation using abcjs parser
      const [{ warnings }] = ABCJS.parseOnly(abcNotation);

      // Check for parse warnings (abcjs reports errors as warnings)
      if (warnings && warnings.length > 0) {
        // Strip HTML markup from warning messages
        const messages = warnings.map((w) => w.replace(/<[^>]*>/g, ""));
        const error = `Invalid ABC notation:\n${messages.join("\n")}`;
        return {
          isError: true,
          content: [{ type: "text", text: error }],
        };
      }

      return {
        content: [{ type: "text", text: "Input parsed successfully." }],
      };
    },
  );

  // Register the UI resource that serves the bundled HTML/JS/CSS.
  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE, description: "Sheet Music Viewer UI" },
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
            _meta: {
              ui: {
                csp: {
                  // Allow loading soundfonts for audio playback
                  connectDomains: ["https://paulrosen.github.io"],
                },
              },
            },
          },
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
    const port = parseInt(process.env.PORT ?? "3001", 10);
    await startServer(createServer, { port, name: "Sheet Music Server" });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
