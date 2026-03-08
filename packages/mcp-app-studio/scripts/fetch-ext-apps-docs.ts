#!/usr/bin/env npx tsx
/**
 * Fetches documentation from @modelcontextprotocol/ext-apps
 *
 * Sources:
 * - GitHub raw markdown files (docs/, specification/)
 * - TypeDoc API documentation (converted to markdown)
 *
 * Output: ./docs/@modelcontextprotocol-ext-apps/
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DOCS_DIR = join(process.cwd(), "docs/@modelcontextprotocol-ext-apps");

const GITHUB_RAW =
  "https://raw.githubusercontent.com/modelcontextprotocol/ext-apps/main";

const TYPEDOC_BASE = "https://modelcontextprotocol.github.io/ext-apps/api";

// Markdown docs available in the GitHub repo
const GITHUB_DOCS = [
  { path: "README.md", output: "readme.md" },
  { path: "CONTRIBUTING.md", output: "contributing.md" },
  { path: "AGENTS.md", output: "agents.md" },
  { path: "RELEASES.md", output: "releases.md" },
  { path: "docs/overview.md", output: "guides/overview.md" },
  { path: "docs/quickstart.md", output: "guides/quickstart.md" },
  { path: "docs/agent-skills.md", output: "guides/agent-skills.md" },
  { path: "docs/patterns.md", output: "guides/patterns.md" },
  { path: "docs/testing-mcp-apps.md", output: "guides/testing-mcp-apps.md" },
  {
    path: "docs/migrate_from_openai_apps.md",
    output: "guides/migrate-from-openai-apps.md",
  },
  {
    path: "specification/2026-01-26/apps.mdx",
    output: "specification/2026-01-26.mdx",
  },
  { path: "specification/draft/apps.mdx", output: "specification/draft.mdx" },
];

// TypeDoc pages to fetch and convert
const TYPEDOC_PAGES = [
  // Main pages
  { path: "index.html", output: "api/index.md" },
  { path: "modules.html", output: "api/modules.md" },

  // Module documentation
  { path: "modules/app.html", output: "api/modules/app.md" },
  {
    path: "modules/_modelcontextprotocol_ext-apps_react.html",
    output: "api/modules/react.md",
  },
  { path: "modules/app-bridge.html", output: "api/modules/app-bridge.md" },
  {
    path: "modules/message-transport.html",
    output: "api/modules/message-transport.md",
  },
  {
    path: "modules/server-helpers.html",
    output: "api/modules/server-helpers.md",
  },
  { path: "modules/types.html", output: "api/modules/types.md" },

  // Document guides
  { path: "documents/Quickstart.html", output: "api/documents/quickstart.md" },
  {
    path: "documents/Agent_Skills.html",
    output: "api/documents/agent-skills.md",
  },
  {
    path: "documents/Testing_MCP_Apps.html",
    output: "api/documents/testing-mcp-apps.md",
  },
  { path: "documents/Patterns.html", output: "api/documents/patterns.md" },
  {
    path: "documents/Migrate_OpenAI_App.html",
    output: "api/documents/migrate-openai-app.md",
  },

  // Classes
  { path: "classes/app.App.html", output: "api/classes/app.md" },
  {
    path: "classes/app-bridge.AppBridge.html",
    output: "api/classes/app-bridge.md",
  },
  {
    path: "classes/message-transport.PostMessageTransport.html",
    output: "api/classes/post-message-transport.md",
  },

  // Key interfaces
  {
    path: "interfaces/app.McpUiInitializeRequest.html",
    output: "api/interfaces/mcp-ui-initialize-request.md",
  },
  {
    path: "interfaces/app.McpUiInitializeResult.html",
    output: "api/interfaces/mcp-ui-initialize-result.md",
  },
  {
    path: "interfaces/app.McpUiHostCapabilities.html",
    output: "api/interfaces/mcp-ui-host-capabilities.md",
  },
  {
    path: "interfaces/app.McpUiHostContext.html",
    output: "api/interfaces/mcp-ui-host-context.md",
  },
  {
    path: "interfaces/app.McpUiToolMeta.html",
    output: "api/interfaces/mcp-ui-tool-meta.md",
  },
  {
    path: "interfaces/app.McpUiResourceMeta.html",
    output: "api/interfaces/mcp-ui-resource-meta.md",
  },
  {
    path: "interfaces/app.McpUiResourceCsp.html",
    output: "api/interfaces/mcp-ui-resource-csp.md",
  },
  {
    path: "interfaces/app.McpUiToolResultNotification.html",
    output: "api/interfaces/mcp-ui-tool-result-notification.md",
  },
  {
    path: "interfaces/app.McpUiToolInputNotification.html",
    output: "api/interfaces/mcp-ui-tool-input-notification.md",
  },
  {
    path: "interfaces/app.McpUiUpdateModelContextRequest.html",
    output: "api/interfaces/mcp-ui-update-model-context-request.md",
  },

  // Types
  {
    path: "types/app.McpUiDisplayMode.html",
    output: "api/types/mcp-ui-display-mode.md",
  },
  { path: "types/app.McpUiTheme.html", output: "api/types/mcp-ui-theme.md" },
  {
    path: "types/app.McpUiToolVisibility.html",
    output: "api/types/mcp-ui-tool-visibility.md",
  },

  // Functions
  {
    path: "functions/app.applyDocumentTheme.html",
    output: "api/functions/apply-document-theme.md",
  },
  {
    path: "functions/app.applyHostStyleVariables.html",
    output: "api/functions/apply-host-style-variables.md",
  },
  {
    path: "functions/server-helpers.registerAppResource.html",
    output: "api/functions/register-app-resource.md",
  },
  {
    path: "functions/server-helpers.registerAppTool.html",
    output: "api/functions/register-app-tool.md",
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  retries = 3,
): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`  ⚠ Not found: ${url}`);
          return null;
        }
        console.warn(`  HTTP ${response.status} for ${url}`);
        if (i < retries - 1) await sleep(1000 * (i + 1));
        continue;
      }
      return await response.text();
    } catch (err) {
      console.warn(`  Attempt ${i + 1} failed for ${url}:`, err);
      if (i < retries - 1) await sleep(1000 * (i + 1));
    }
  }
  return null;
}

function ensureDir(filePath: string): void {
  const dir = join(filePath, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Convert TypeDoc HTML to Markdown
 * This is a simple conversion that extracts the main content
 */
function htmlToMarkdown(html: string, title: string): string {
  let md = `# ${title}\n\n`;
  md += `> Auto-generated from TypeDoc. See [original](${TYPEDOC_BASE}) for the latest version.\n\n`;

  // Extract the main content area
  const mainMatch = html.match(
    /<div class="col-content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<footer/,
  );
  const contentMatch = html.match(
    /<section class="tsd-panel[^"]*">([\s\S]*?)<\/section>/g,
  );

  if (!mainMatch && !contentMatch) {
    // Fallback: extract body content
    const bodyMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    if (bodyMatch) {
      md += convertHtmlContent(bodyMatch[1]);
    } else {
      md +=
        "_Content could not be extracted. Please visit the original documentation._\n";
    }
    return md;
  }

  if (contentMatch) {
    for (const section of contentMatch) {
      md += `${convertHtmlContent(section)}\n\n`;
    }
  } else if (mainMatch) {
    md += convertHtmlContent(mainMatch[1]);
  }

  return md;
}

function convertHtmlContent(html: string): string {
  let text = html;

  // Remove script tags
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove style tags
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Convert headers
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n");
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n");
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n");
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "#### $1\n\n");
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "##### $1\n\n");

  // Convert code blocks
  text = text.replace(
    /<pre><code[^>]*class="[^"]*language-(\w+)[^"]*"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    "```$1\n$2\n```\n\n",
  );
  text = text.replace(
    /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    "```\n$1\n```\n\n",
  );
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```\n\n");

  // Convert inline code
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

  // Convert links
  text = text.replace(
    /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)",
  );

  // Convert lists
  text = text.replace(/<ul[^>]*>/gi, "\n");
  text = text.replace(/<\/ul>/gi, "\n");
  text = text.replace(/<ol[^>]*>/gi, "\n");
  text = text.replace(/<\/ol>/gi, "\n");
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");

  // Convert paragraphs
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n");

  // Convert bold/italic
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");

  // Convert blockquotes
  text = text.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    "> $1\n\n",
  );

  // Convert breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<hr\s*\/?>/gi, "\n---\n\n");

  // Convert divs and spans (just extract content)
  text = text.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, "$1\n");
  text = text.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, "$1");

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

function extractTitle(html: string, fallback: string): string {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    // Remove the package name suffix if present
    return titleMatch[1]
      .replace(/ \| @modelcontextprotocol\/ext-apps.*$/, "")
      .trim();
  }
  return fallback;
}

async function fetchGitHubDocs(): Promise<void> {
  console.log("\n📚 Fetching GitHub documentation...");

  for (const doc of GITHUB_DOCS) {
    const url = `${GITHUB_RAW}/${doc.path}`;
    console.log(`  Fetching ${doc.path}...`);

    const content = await fetchWithRetry(url);
    if (content) {
      const outputPath = join(DOCS_DIR, doc.output);
      ensureDir(outputPath);
      writeFileSync(outputPath, content);
      console.log(`  ✓ Saved ${doc.output}`);
    } else {
      console.warn(`  ✗ Failed to fetch ${doc.path}`);
    }

    await sleep(100);
  }
}

async function fetchTypeDocPages(): Promise<void> {
  console.log("\n📖 Fetching TypeDoc API documentation...");

  let successCount = 0;
  let failCount = 0;

  for (const page of TYPEDOC_PAGES) {
    const url = `${TYPEDOC_BASE}/${page.path}`;
    console.log(`  Fetching ${page.path}...`);

    const html = await fetchWithRetry(url);
    if (html) {
      const title = extractTitle(html, page.path.replace(".html", ""));
      const markdown = htmlToMarkdown(html, title);

      const outputPath = join(DOCS_DIR, page.output);
      ensureDir(outputPath);
      writeFileSync(outputPath, markdown);
      console.log(`  ✓ Saved ${page.output}`);
      successCount++;
    } else {
      console.warn(`  ✗ Failed to fetch ${page.path}`);
      failCount++;
    }

    await sleep(150); // Slightly longer delay for the web server
  }

  console.log(`\n  API docs: ${successCount} succeeded, ${failCount} failed`);
}

async function createIndexFile(): Promise<void> {
  console.log("\n📝 Creating index file...");

  const index = `# @modelcontextprotocol/ext-apps Documentation

> Fetched on ${new Date().toISOString()}

This directory contains documentation for the MCP Apps extension SDK.

## Contents

### Guides
- [Overview](guides/overview.md)
- [Quickstart](guides/quickstart.md)
- [Agent Skills](guides/agent-skills.md)
- [Patterns](guides/patterns.md)
- [Testing MCP Apps](guides/testing-mcp-apps.md)
- [Migrate from OpenAI Apps](guides/migrate-from-openai-apps.md)

### Specification
- [Current (2026-01-26)](specification/2026-01-26.mdx)
- [Draft](specification/draft.mdx)

### API Reference
- [Index](api/index.md)
- [Modules](api/modules.md)

#### Modules
- [app](api/modules/app.md) - Main SDK for apps
- [react](api/modules/react.md) - React hooks
- [app-bridge](api/modules/app-bridge.md) - SDK for hosts
- [server-helpers](api/modules/server-helpers.md) - Server-side utilities
- [message-transport](api/modules/message-transport.md) - Transport layer
- [types](api/modules/types.md) - Type definitions

#### Classes
- [App](api/classes/app.md) - Main app class
- [AppBridge](api/classes/app-bridge.md) - Host-side bridge
- [PostMessageTransport](api/classes/post-message-transport.md) - Transport implementation

### Source
- [README](readme.md)
- [Contributing](contributing.md)
- [Releases](releases.md)

## External Links
- [GitHub Repository](https://github.com/modelcontextprotocol/ext-apps)
- [API Documentation](https://modelcontextprotocol.github.io/ext-apps/api/)
- [MCP Specification](https://modelcontextprotocol.io/)
`;

  const outputPath = join(DOCS_DIR, "index.md");
  writeFileSync(outputPath, index);
  console.log("  ✓ Created index.md");
}

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  @modelcontextprotocol/ext-apps Documentation Fetcher");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Output directory: ${DOCS_DIR}`);
  console.log("");
  console.log("Sources:");
  console.log("  - GitHub: github.com/modelcontextprotocol/ext-apps");
  console.log("  - TypeDoc: modelcontextprotocol.github.io/ext-apps/api/");

  if (!existsSync(DOCS_DIR)) {
    mkdirSync(DOCS_DIR, { recursive: true });
  }

  await fetchGitHubDocs();
  await fetchTypeDocPages();
  await createIndexFile();

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`✅ Done! Documentation saved to ${DOCS_DIR}`);
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
