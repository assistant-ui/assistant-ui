import type { MCPServerConfig, GeneratedFile } from "./types";

export function generatePackageJson(config: MCPServerConfig): string {
  const pkg = {
    name: `${slugify(config.name)}-mcp-server`,
    version: config.version,
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
      "@types/node": "^22.0.0",
      tsx: "^4.21.0",
      typescript: "^5.8.0",
    },
  };

  return JSON.stringify(pkg, null, 2);
}

export function generateTsConfig(): string {
  const config = {
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
  };

  return JSON.stringify(config, null, 2);
}

export function generateVercelConfig(): string {
  const config = {
    builds: [
      {
        src: "src/index.ts",
        use: "@vercel/node",
      },
    ],
    routes: [
      {
        src: "/(.*)",
        dest: "src/index.ts",
      },
    ],
  };

  return JSON.stringify(config, null, 2);
}

export function generateEnvExample(): string {
  return `# Server Configuration
PORT=3001

# Add your API keys and secrets here
# DATABASE_URL=
# API_KEY=
`;
}

export function generateGitignore(): string {
  return `node_modules/
dist/
.env
.env.local
*.log
`;
}

export function generateServerReadme(config: MCPServerConfig): string {
  return `# ${config.name} MCP Server

MCP server for ${config.name} ChatGPT App.

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

${config.tools.map((t) => `- **${t.name}**: ${t.description || "No description"}`).join("\n")}

## Environment Variables

Copy \`.env.example\` to \`.env\` and configure:

\`\`\`bash
cp .env.example .env
\`\`\`

---

Generated with [ChatGPT App Studio](https://github.com/assistant-ui/chatgpt-app-studio)
`;
}

export function generateConfigFiles(config: MCPServerConfig): GeneratedFile[] {
  return [
    { path: "package.json", content: generatePackageJson(config) },
    { path: "tsconfig.json", content: generateTsConfig() },
    { path: "vercel.json", content: generateVercelConfig() },
    { path: ".env.example", content: generateEnvExample() },
    { path: ".gitignore", content: generateGitignore() },
    { path: "README.md", content: generateServerReadme(config) },
  ];
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
