import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "cross-spawn";
import { logger } from "../lib/utils/logger";
import * as p from "@clack/prompts";

type MCPTarget =
  | "cursor"
  | "windsurf"
  | "vscode"
  | "zed"
  | "claude-code"
  | "claude-desktop";

const MCP_CONFIGS: Record<
  Exclude<MCPTarget, "claude-code">,
  {
    name: string;
    getPath: () => string;
    config: object;
    postInstall?: string;
  }
> = {
  cursor: {
    name: "Cursor",
    getPath: () => path.join(process.cwd(), ".cursor", "mcp.json"),
    config: {
      mcpServers: {
        "assistant-ui": {
          command: "npx",
          args: ["-y", "@assistant-ui/mcp-docs-server"],
        },
      },
    },
    postInstall:
      "Open Cursor Settings → MCP → find 'assistant-ui' and click enable.",
  },
  windsurf: {
    name: "Windsurf",
    getPath: () =>
      path.join(os.homedir(), ".codeium", "windsurf", "mcp_config.json"),
    config: {
      mcpServers: {
        "assistant-ui": {
          command: "npx",
          args: ["-y", "@assistant-ui/mcp-docs-server"],
        },
      },
    },
    postInstall: "Fully quit and re-open Windsurf to activate.",
  },
  vscode: {
    name: "VSCode",
    getPath: () => path.join(process.cwd(), ".vscode", "mcp.json"),
    config: {
      servers: {
        "assistant-ui": {
          command: "npx",
          args: ["-y", "@assistant-ui/mcp-docs-server"],
          type: "stdio",
        },
      },
    },
    postInstall:
      "Enable MCP in Settings → search 'MCP' → enable 'Chat > MCP'. Use Copilot Chat in Agent mode.",
  },
  zed: {
    name: "Zed",
    getPath: () => path.join(os.homedir(), ".config", "zed", "settings.json"),
    config: {
      context_servers: {
        "assistant-ui": {
          command: {
            path: "npx",
            args: ["-y", "@assistant-ui/mcp-docs-server"],
          },
        },
      },
    },
    postInstall: "The server starts automatically with the Assistant Panel.",
  },
  "claude-desktop": {
    name: "Claude Desktop",
    getPath: () => {
      if (process.platform === "win32") {
        return path.join(
          process.env["APPDATA"] || "",
          "Claude",
          "claude_desktop_config.json",
        );
      }
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );
    },
    config: {
      mcpServers: {
        "assistant-ui": {
          command: "npx",
          args: ["-y", "@assistant-ui/mcp-docs-server"],
        },
      },
    },
    postInstall: "Restart Claude Desktop to activate.",
  },
};

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

async function installForTarget(target: MCPTarget): Promise<void> {
  if (target === "claude-code") {
    logger.info("Installing MCP server for Claude Code...");
    logger.break();

    const child = spawn(
      "claude",
      [
        "mcp",
        "add",
        "assistant-ui",
        "--",
        "npx",
        "-y",
        "@assistant-ui/mcp-docs-server",
      ],
      {
        stdio: "inherit",
      },
    );

    return new Promise((resolve, reject) => {
      child.on("error", (error) => {
        logger.error(`Failed to install: ${error.message}`);
        logger.info(
          "Make sure Claude Code CLI is installed: https://docs.anthropic.com/en/docs/claude-code",
        );
        reject(error);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          logger.error(`Installation failed with code ${code}`);
          reject(new Error(`Exit code ${code}`));
        } else {
          logger.break();
          logger.success("MCP server installed for Claude Code!");
          logger.info(
            "The server starts automatically. Try asking about assistant-ui!",
          );
          resolve();
        }
      });
    });
  }

  const targetConfig = MCP_CONFIGS[target];
  const configPath = targetConfig.getPath();
  const configDir = path.dirname(configPath);

  logger.info(`Installing MCP server for ${targetConfig.name}...`);

  // Create directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Read existing config or create new one
  let existingConfig: any = {};
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      existingConfig = JSON.parse(content);
    } catch {
      logger.warn(`Could not parse existing config at ${configPath}`);
    }
  }

  // Merge configs
  const newConfig = deepMerge(existingConfig, targetConfig.config);

  // Write config
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2) + "\n");

  logger.break();
  logger.success(`MCP server installed for ${targetConfig.name}!`);
  logger.info(`Config written to: ${configPath}`);

  if (targetConfig.postInstall) {
    logger.break();
    logger.info(targetConfig.postInstall);
  }
}

export const mcp = new Command()
  .name("mcp")
  .description("install assistant-ui MCP docs server for your IDE")
  .option("--cursor", "install for Cursor")
  .option("--windsurf", "install for Windsurf")
  .option("--vscode", "install for VSCode")
  .option("--zed", "install for Zed")
  .option("--claude-code", "install for Claude Code")
  .option("--claude-desktop", "install for Claude Desktop")
  .action(async (opts) => {
    const targets: MCPTarget[] = [];

    if (opts.cursor) targets.push("cursor");
    if (opts.windsurf) targets.push("windsurf");
    if (opts.vscode) targets.push("vscode");
    if (opts.zed) targets.push("zed");
    if (opts.claudeCode) targets.push("claude-code");
    if (opts.claudeDesktop) targets.push("claude-desktop");

    // If no target specified, prompt user
    if (targets.length === 0) {
      p.intro("assistant-ui MCP Server Installation");

      const selected = await p.select({
        message: "Select your IDE or tool:",
        options: [
          { value: "cursor", label: "Cursor" },
          { value: "windsurf", label: "Windsurf" },
          { value: "vscode", label: "VSCode" },
          { value: "zed", label: "Zed" },
          { value: "claude-code", label: "Claude Code" },
          { value: "claude-desktop", label: "Claude Desktop" },
        ],
      });

      if (p.isCancel(selected)) {
        p.cancel("Installation cancelled.");
        process.exit(0);
      }

      targets.push(selected as MCPTarget);
    }

    for (const target of targets) {
      try {
        await installForTarget(target);
      } catch {
        process.exit(1);
      }
    }
  });
