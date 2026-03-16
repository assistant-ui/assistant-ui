# Integrate tool-ui-server into chatgpt-app-studio

## Overview

Update `chatgpt-app-studio` to use `@assistant-ui/tool-ui-server` for MCP server generation instead of generating raw boilerplate. This will:
1. Reduce generated code from ~120 lines to ~30 lines
2. Provide consistent tool registration API (`toolWithUI`)
3. Enable OAuth, manifest generation, and registry integration out of the box
4. Keep widget/server development aligned

## Current State Analysis

### `tool-ui-server` provides:
- `createToolUIServer()` - Creates MCP server with `toolWithUI()` helper
- **Only supports stdio transport** (line 174-177 in create-tool-ui-server.ts)
- OAuth metadata handler (works with HTTP)
- Manifest generation for registry
- Protocol types (`OpenAIGlobals`, etc.)

### `chatgpt-app-studio` generates:
- ~120 lines of HTTP server boilerplate in `server/src/index.ts`
- Manual `McpServer` instantiation
- Manual tool registration with `server.registerTool()`
- Manual resource registration with `server.registerResource()`
- CORS handling, error handling, etc.

### The Gap:
`createToolUIServer()` only supports stdio, but chatgpt-app-studio needs HTTP transport for local dev and deployment.

## Desired End State

Generated `server/src/index.ts` should look like:

```typescript
import { createToolUIServer } from "@assistant-ui/tool-ui-server";
import { z } from "zod";

const { toolWithUI, startHttp } = createToolUIServer({
  name: "My ChatGPT App",
  version: "1.0.0",
});

toolWithUI({
  name: "example_tool",
  description: "An example tool",
  parameters: z.object({ query: z.string() }),
  component: "ExampleWidget",
  execute: async ({ query }) => ({
    query,
    results: [
      { id: "1", title: "Example Result 1" },
      { id: "2", title: "Example Result 2" },
    ],
  }),
});

startHttp({ port: 3001 });
```

**Verification:**
- Generated server starts with `npm run dev`
- MCP Inspector can connect to `http://localhost:3001/mcp`
- Tool execution returns expected results
- Widget HTML resource is served (if configured)

## What We're NOT Doing

- NOT changing the Next.js workbench (it already uses tool-ui-server types)
- NOT adding registry publishing to the CLI (future work)
- NOT requiring OAuth for scaffolded projects (optional)
- NOT changing the widget export flow

## Implementation Approach

Add HTTP transport support to `tool-ui-server`, then update the generator.

## Phase 1: Add HTTP Transport to tool-ui-server

### Overview
Extend `createToolUIServer()` to support HTTP transport alongside stdio.

### Changes Required:

#### 1. Update `create-tool-ui-server.ts`

**File**: `packages/tool-ui-server/src/create-tool-ui-server.ts`

Add HTTP server creation and `startHttp()` method:

```typescript
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// In createToolUIServer return object, add:

/**
 * Start the server with HTTP transport.
 */
async function startHttp(options: {
  port?: number;
  host?: string;
  corsOrigin?: string;
} = {}) {
  const {
    port = 3001,
    host = "localhost",
    corsOrigin = "*",
  } = options;

  const MCP_PATH = "/mcp";

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    // Handle CORS preflight
    if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, mcp-session-id",
        "Access-Control-Expose-Headers": "Mcp-Session-Id",
      });
      res.end();
      return;
    }

    // Handle OAuth metadata (if configured)
    if (metadataHandler && isProtectedResourceMetadataRequest(url.pathname)) {
      metadataHandler(req, res);
      return;
    }

    // Health check
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(`${name} MCP server`);
      return;
    }

    // MCP endpoint
    const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
    if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
      res.setHeader("Access-Control-Allow-Origin", corsOrigin);
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on("close", () => {
        transport.close();
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

  return new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => {
      console.log(`${name} MCP server listening on http://${host}:${port}${MCP_PATH}`);
      resolve();
    });
  });
}

// Return both start methods:
return {
  server,
  toolWithUI,
  getUICapability,
  generateManifest,
  start,      // stdio (existing)
  startHttp,  // HTTP (new)
  handleOAuthMetadata: metadataHandler,
  isOAuthMetadataRequest: isProtectedResourceMetadataRequest,
  oauthConfig,
};
```

#### 2. Update types

**File**: `packages/tool-ui-server/src/types.ts`

Add HTTP options type:

```typescript
export interface HttpServerOptions {
  /** Port to listen on (default: 3001) */
  port?: number;
  /** Host to bind to (default: "localhost") */
  host?: string;
  /** CORS origin (default: "*") */
  corsOrigin?: string;
}
```

#### 3. Make bundleHash optional

**File**: `packages/tool-ui-server/src/types.ts`

For local dev, bundleHash isn't needed:

```typescript
export interface ToolUIServerOptions {
  // ... existing fields
  /** Bundle hash for integrity verification (optional for local dev) */
  bundleHash?: string;
}
```

#### 4. Make serverId optional

For simple local dev, serverId shouldn't be required:

```typescript
export interface ToolUIServerOptions {
  /** Unique server identifier (optional, defaults to sanitized name) */
  serverId?: string;
  // ...
}
```

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `pnpm --filter @assistant-ui/tool-ui-server build`
- [x] Tests pass: `pnpm --filter @assistant-ui/tool-ui-server test`
- [x] Lint passes: `pnpm lint`
- [x] Types export correctly (check dist/index.d.ts)

#### Manual Verification:
- [x] Can create server with `createToolUIServer()` and call `startHttp()`
- [x] MCP Inspector connects to `http://localhost:3001/mcp`

---

## Phase 2: Add HTTP Tests

### Overview
Add tests for the new HTTP transport functionality.

### Changes Required:

#### 1. Create HTTP transport test file

**File**: `packages/tool-ui-server/src/__tests__/http-transport.test.ts`

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createToolUIServer } from "../create-tool-ui-server";
import { z } from "zod";

describe("createToolUIServer HTTP transport", () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("starts HTTP server on specified port", async () => {
    const { toolWithUI, startHttp } = createToolUIServer({
      name: "Test Server",
      version: "1.0.0",
    });

    toolWithUI({
      name: "test_tool",
      description: "A test tool",
      parameters: z.object({ input: z.string() }),
      component: "TestComponent",
      execute: async ({ input }) => ({ result: input }),
    });

    // Start server
    const server = await startHttp({ port: 3099 });
    cleanup = () => server.close();

    // Test health endpoint
    const res = await fetch("http://localhost:3099/");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Test Server");
  });

  it("handles CORS preflight", async () => {
    const { startHttp } = createToolUIServer({
      name: "CORS Test",
      version: "1.0.0",
    });

    const server = await startHttp({ port: 3098 });
    cleanup = () => server.close();

    const res = await fetch("http://localhost:3098/mcp", {
      method: "OPTIONS",
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] New tests pass: `pnpm --filter @assistant-ui/tool-ui-server test`

---

## Phase 3: Update chatgpt-app-studio Generator

### Overview
Update `generateMcpServer()` in utils.ts to generate simpler code using tool-ui-server.

### Changes Required:

#### 1. Update generated package.json

**File**: `packages/chatgpt-app-studio/src/utils.ts`

In `generateMcpServer()`, update dependencies:

```typescript
dependencies: {
  "@assistant-ui/tool-ui-server": "^0.0.1",
  zod: "^3.25.76",
},
```

Remove `@modelcontextprotocol/sdk` - it's now a transitive dependency.

#### 2. Update generated index.ts

**File**: `packages/chatgpt-app-studio/src/utils.ts`

Replace the long `fs.writeFileSync(path.join(srcDir, "index.ts"), ...)` with:

```typescript
fs.writeFileSync(
  path.join(srcDir, "index.ts"),
  `import { createToolUIServer } from "@assistant-ui/tool-ui-server";
import { z } from "zod";
import { exampleToolHandler } from "./tools/example-tool.js";

const { toolWithUI, startHttp } = createToolUIServer({
  name: ${JSON.stringify(appName)},
  version: "1.0.0",
});

toolWithUI({
  name: "example_tool",
  description: ${JSON.stringify(config.description || "An example tool for your ChatGPT app")},
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  component: "ExampleWidget",
  execute: exampleToolHandler,
});

const port = Number(process.env.PORT ?? 3001);
startHttp({ port }).then(() => {
  console.log(\`Server ready at http://localhost:\${port}/mcp\`);
});
`,
);
```

#### 3. Update example-tool.ts return type

**File**: `packages/chatgpt-app-studio/src/utils.ts`

Simplify the tool handler (remove MCP-specific types):

```typescript
fs.writeFileSync(
  path.join(toolsDir, "example-tool.ts"),
  `export async function exampleToolHandler({ query }: { query: string }) {
  // TODO: Implement your tool logic here
  // This is where you'd call your API, database, etc.

  return {
    query,
    results: [
      { id: "1", title: "Example Result 1" },
      { id: "2", title: "Example Result 2" },
    ],
  };
}
`,
);
```

#### 4. Remove types.ts from generated server

The types come from tool-ui-server now:

```typescript
// Remove this file generation:
// fs.writeFileSync(path.join(toolsDir, "types.ts"), ...);
```

#### 5. Update tools/index.ts

```typescript
fs.writeFileSync(
  path.join(toolsDir, "index.ts"),
  `export { exampleToolHandler } from "./example-tool.js";
`,
);
```

### Success Criteria:

#### Automated Verification:
- [x] chatgpt-app-studio builds: `pnpm --filter chatgpt-app-studio build`
- [x] Full monorepo build: `pnpm build`
- [x] Lint passes: `pnpm lint`

#### Manual Verification:
- [x] Scaffold new project: `npx chatgpt-app-studio test-project`
- [x] Install deps in scaffolded project: `cd test-project/server && npm install`
- [x] Server starts: `npm run dev`
- [x] MCP Inspector connects and can call `example_tool`

---

## Phase 4: Update Documentation

### Overview
Update README and generated comments to reflect new API.

### Changes Required:

#### 1. Update generated README.md

**File**: `packages/chatgpt-app-studio/src/utils.ts`

Update the README generation to document the new pattern:

```typescript
fs.writeFileSync(
  path.join(serverDir, "README.md"),
  `# ${appName} MCP Server

MCP server powered by [@assistant-ui/tool-ui-server](https://github.com/assistant-ui/assistant-ui/tree/main/packages/tool-ui-server).

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Server runs at \`http://localhost:3001/mcp\`

## Test with MCP Inspector

\`\`\`bash
npm run inspect
\`\`\`

## Adding New Tools

\`\`\`typescript
import { z } from "zod";

// In src/index.ts, add:
toolWithUI({
  name: "my_new_tool",
  description: "What this tool does",
  parameters: z.object({
    param1: z.string().describe("Parameter description"),
  }),
  component: "MyComponent",  // Widget component name
  execute: async ({ param1 }) => {
    // Your logic here
    return { result: param1 };
  },
});
\`\`\`

## Deploy

Build and deploy the server. The widget bundle is deployed separately via the workbench export.

---

Generated with [ChatGPT App Studio](https://github.com/assistant-ui/assistant-ui/tree/main/packages/chatgpt-app-studio)
`,
);
```

### Success Criteria:

#### Automated Verification:
- [x] Build passes: `pnpm build`

#### Manual Verification:
- [x] Generated README is accurate and helpful

---

## Testing Strategy

### Unit Tests:
- HTTP transport starts and responds
- CORS headers set correctly
- Health endpoint returns server name
- 404 for unknown routes

### Integration Tests:
- Scaffold new project with MCP server option
- Generated server compiles
- Generated server runs and accepts MCP connections

### Manual Testing Steps:
1. Run `npx chatgpt-app-studio test-integration` (create temp project)
2. `cd test-integration/server && npm install && npm run dev`
3. Open MCP Inspector: `npm run inspect`
4. Call `example_tool` with `{ "query": "test" }`
5. Verify response contains expected results

## Migration Notes

- Existing scaffolded projects won't be affected (they have their own code)
- Only new scaffolds will use the updated template
- No breaking changes to tool-ui-server public API (only additions)

## References

- `packages/tool-ui-server/src/create-tool-ui-server.ts` - Current stdio-only implementation
- `packages/chatgpt-app-studio/src/utils.ts` - Current generator (~170 lines of generated code)
- `@modelcontextprotocol/sdk` - MCP SDK with StreamableHTTPServerTransport
