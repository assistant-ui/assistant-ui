import fs from "node:fs";
import path from "node:path";

export function isValidProjectPath(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim() === "") {
    return { valid: false, error: "Project name is required" };
  }

  const trimmed = name.trim();

  if (path.isAbsolute(trimmed)) {
    return {
      valid: false,
      error:
        "Absolute paths are not allowed. Use a relative path or project name.",
    };
  }

  if (trimmed.includes("..")) {
    return {
      valid: false,
      error: "Path traversal (..) is not allowed. Use a simple project name.",
    };
  }

  const cwd = process.cwd();
  const resolved = path.resolve(cwd, trimmed);
  const relative = path.relative(cwd, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return {
      valid: false,
      error: "Project must be created within current directory.",
    };
  }

  return { valid: true };
}

export function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
    name,
  );
}

export function toValidPackageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z0-9-~]+/g, "-");
}

export function isEmpty(dir: string): boolean {
  if (!fs.existsSync(dir)) return true;
  const files = fs.readdirSync(dir);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

export function emptyDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    // Preserve git history when scaffolding into an existing repo.
    if (file === ".git") continue;
    fs.rmSync(path.join(dir, file), { recursive: true, force: true });
  }
}

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".pnp",
  ".yarn",
  "coverage",
  "out",
  "build",
  "dist",
  "export",
  ".export-temp",
  ".vercel",
  ".turbo",
  ".git",
]);

const EXCLUDED_FILES = new Set([
  ".DS_Store",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "next-env.d.ts",
  "tsconfig.tsbuildinfo",
]);

export function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    if (EXCLUDED_DIRS.has(file) || EXCLUDED_FILES.has(file)) {
      continue;
    }
    if (file.endsWith(".tsbuildinfo")) {
      continue;
    }
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function renameFiles(dir: string): void {
  const renameMap: Record<string, string> = {
    _gitignore: ".gitignore",
    "_env.local": ".env.local",
  };

  for (const [from, to] of Object.entries(renameMap)) {
    const fromPath = path.join(dir, from);
    const toPath = path.join(dir, to);
    if (fs.existsSync(fromPath)) {
      fs.renameSync(fromPath, toPath);
    }
  }
}

export function updatePackageJson(
  dir: string,
  name: string,
  description?: string,
): void {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return;

  try {
    const content = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as Record<string, unknown>;
    pkg["name"] = name;
    pkg["version"] = "0.1.0";
    pkg["private"] = true;
    if (description) {
      pkg["description"] = description;
    }
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  } catch (error) {
    throw new Error(
      `Failed to update package.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function detectPackageManager(): "npm" | "pnpm" | "yarn" | "bun" {
  const ua = process.env["npm_config_user_agent"] ?? "";
  if (ua.includes("pnpm")) return "pnpm";
  if (ua.includes("yarn")) return "yarn";
  if (ua.includes("bun")) return "bun";
  return "npm";
}

interface ProjectConfig {
  name: string;
  packageName: string;
  description: string;
}

export async function generateMcpServer(
  projectDir: string,
  config: ProjectConfig,
): Promise<void> {
  const serverDir = path.join(projectDir, "server");
  const srcDir = path.join(serverDir, "src");
  const toolsDir = path.join(srcDir, "tools");

  fs.mkdirSync(toolsDir, { recursive: true });

  const baseName =
    config.name === "." ? path.basename(projectDir) : config.name;
  const appName = baseName
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const serverName = `${config.packageName}-mcp-server`;

  fs.writeFileSync(
    path.join(serverDir, "package.json"),
    JSON.stringify(
      {
        name: serverName,
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "tsx watch src/index.ts",
          build: "tsc",
          start: "node dist/index.js",
          inspect:
            "npx @modelcontextprotocol/inspector@latest http://localhost:3001/mcp",
        },
        dependencies: {
          "@modelcontextprotocol/sdk": "^1.20.2",
          zod: "^3.25.76",
        },
        devDependencies: {
          "@eslint/js": "^9.39.0",
          "@types/node": "^22.0.0",
          eslint: "^9.39.0",
          tsx: "^4.21.0",
          typescript: "^5.8.0",
        },
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(serverDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: "./dist",
          rootDir: "./src",
          declaration: true,
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(srcDir, "index.ts"),
    `import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { exampleToolHandler } from "./tools/example-tool.js";

const WIDGET_HTML = \`<!DOCTYPE html>
<html>
<head><title>${appName}</title></head>
<body>
  <div id="root"></div>
  <script src="widget.js"></script>
</body>
</html>\`;

function createAppServer() {
  const server = new McpServer({
    name: ${JSON.stringify(appName)},
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
      description: ${JSON.stringify(config.description || "An example tool for your ChatGPT app")},
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

  const url = new URL(req.url, \`http://\${req.headers.host ?? "localhost"}\`);

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
    res.end(\`${appName} MCP server\`);
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
  console.log(\`${appName} MCP server listening on http://localhost:\${port}\${MCP_PATH}\`);
});
`,
  );

  fs.writeFileSync(
    path.join(toolsDir, "types.ts"),
    `export interface ToolResult {
  [key: string]: unknown;
  structuredContent?: Record<string, unknown>;
  content: Array<{ type: "text"; text: string }>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  extra?: unknown
) => Promise<ToolResult>;
`,
  );

  fs.writeFileSync(
    path.join(toolsDir, "example-tool.ts"),
    `import type { ToolHandler } from "./types.js";

export const exampleToolHandler: ToolHandler = async (args) => {
  const query = (args.query as string) || "";

  // TODO: Implement your tool logic here
  // This is where you'd call your API, database, etc.

  return {
    structuredContent: {
      query,
      results: [
        { id: "1", title: "Example Result 1" },
        { id: "2", title: "Example Result 2" },
      ],
    },
    content: [
      {
        type: "text" as const,
        text: \`Found 2 results for "\${query}"\`,
      },
    ],
  };
};
`,
  );

  fs.writeFileSync(
    path.join(toolsDir, "index.ts"),
    `export { exampleToolHandler } from "./example-tool.js";
`,
  );

  fs.writeFileSync(
    path.join(serverDir, ".gitignore"),
    `node_modules/
dist/
.env
.env.local
*.log
`,
  );

  fs.writeFileSync(
    path.join(serverDir, "eslint.config.mjs"),
    `import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
];
`,
  );

  fs.writeFileSync(
    path.join(serverDir, ".env.example"),
    `# Server Configuration
PORT=3001

# CORS Configuration (restrict in production)
# CORS_ORIGIN=https://your-widget-domain.com

# Add your API keys and secrets here
# DATABASE_URL=
# API_KEY=
`,
  );

  fs.writeFileSync(
    path.join(serverDir, "README.md"),
    `# ${appName} MCP Server

MCP server for your ChatGPT app.

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

## Deploy

### Vercel

\`\`\`bash
vercel deploy
\`\`\`

### Manual

1. Build: \`npm run build\`
2. Start: \`npm start\`

## Tools

- **example_tool**: ${config.description || "An example tool for your ChatGPT app"}

## Adding New Tools

1. Create a new handler in \`src/tools/\`
2. Register it in \`src/index.ts\`
3. Update your widget to call the tool

## Security

### CORS Configuration

By default, this server allows requests from any origin (\`Access-Control-Allow-Origin: *\`).

**For production**, restrict CORS to your widget's domain:

\`\`\`typescript
// In src/index.ts, replace:
res.setHeader("Access-Control-Allow-Origin", "*");

// With your specific origin:
res.setHeader("Access-Control-Allow-Origin", "https://your-widget-domain.com");
\`\`\`

Or use an environment variable:

\`\`\`typescript
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "*";
res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
\`\`\`

---

Generated with [ChatGPT App Studio](https://github.com/assistant-ui/assistant-ui/tree/main/packages/chatgpt-app-studio)
`,
  );
}
