import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { exampleToolHandler } from "./tools/example-tool.js";

const WIDGET_HTML = `<!DOCTYPE html>
<html>
<head><title>My App</title></head>
<body>
  <div id="root"></div>
  <script src="widget.js"></script>
</body>
</html>`;

function createAppServer() {
  const server = new McpServer({
    name: "My App",
    version: "1.0.0",
  });

  server.registerResource(
    "widget",
    "ui://widget/main.html",
    {},
    async () => ({
      contents: [
        {
          uri: "ui://widget/main.html",
          mimeType: "text/html+skybridge",
          text: WIDGET_HTML,
          _meta: {
            "openai/widgetPrefersBorder": true,
          },
        },
      ],
    })
  );

  server.registerTool(
    "example_tool",
    {
      title: "Example Tool",
      description: "An example tool for your ChatGPT app",
      inputSchema: {
        query: z.string().describe("The search query"),
      },
      _meta: {
        "openai/outputTemplate": "ui://widget/main.html",
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Processing...",
        "openai/toolInvocation/invoked": "Done",
      },
    },
    exampleToolHandler
  );

  return server;
}

const port = Number(process.env.PORT ?? 3001);
const MCP_PATH = "/mcp";
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "*";

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(`My App MCP server`);
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createAppServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`My App MCP server listening on http://localhost:${port}${MCP_PATH}`);
});
