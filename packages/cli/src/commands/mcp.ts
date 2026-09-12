import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  applyEdits,
  format,
  modify,
  parse as parseJsonc,
  parseTree,
  type Node,
  type ParseError,
} from "jsonc-parser";
import { logger } from "../lib/utils/logger";
import { runSpawn, SpawnExitError, SpawnSignalError } from "../lib/run-spawn";
import * as p from "@clack/prompts";

type MCPTarget =
  | "cursor"
  | "windsurf"
  | "vscode"
  | "zed"
  | "claude-code"
  | "claude-desktop";

const HOSTED_MCP_URL = "https://www.assistant-ui.com/mcp";

const MCP_CONFIGS: Record<
  Exclude<MCPTarget, "claude-code">,
  {
    name: string;
    getPath: () => string;
    config: object;
    replaceServerKey?: string;
    postInstall?: string;
  }
> = {
  cursor: {
    name: "Cursor",
    getPath: () => path.join(process.cwd(), ".cursor", "mcp.json"),
    config: {
      mcpServers: {
        "assistant-ui": {
          url: HOSTED_MCP_URL,
        },
      },
    },
    replaceServerKey: "mcpServers",
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
          serverUrl: HOSTED_MCP_URL,
        },
      },
    },
    replaceServerKey: "mcpServers",
    postInstall: "Fully quit and re-open Windsurf to activate.",
  },
  vscode: {
    name: "VSCode",
    getPath: () => path.join(process.cwd(), ".vscode", "mcp.json"),
    config: {
      servers: {
        "assistant-ui": {
          type: "http",
          url: HOSTED_MCP_URL,
        },
      },
    },
    replaceServerKey: "servers",
    postInstall:
      "Enable MCP in Settings → search 'MCP' → enable 'Chat > MCP'. Use Copilot Chat in Agent mode.",
  },
  zed: {
    name: "Zed",
    getPath: () => {
      if (process.platform === "win32") {
        return path.join(process.env.APPDATA || "", "Zed", "settings.json");
      }
      if (process.platform === "darwin") {
        return path.join(os.homedir(), ".zed", "settings.json");
      }
      return path.join(os.homedir(), ".config", "zed", "settings.json");
    },
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
          process.env.APPDATA || "",
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

class McpConfigParseError extends Error {
  constructor(targetName: string, configPath: string, flag: string) {
    super(
      `Invalid ${targetName} MCP config JSON at ${configPath}. Fix the JSON syntax, then run: assistant-ui mcp ${flag}`,
    );
    this.name = "McpConfigParseError";
  }
}

const getTargetFlag = (target: Exclude<MCPTarget, "claude-code">) =>
  `--${target}`;

const lastPropertyValue = (node: Node, key: string) =>
  node.children?.findLast((property) => property.children?.[0]?.value === key)
    ?.children?.[1];

function updateVscodeConfig(content: string, server: object): string {
  const formattingOptions = {
    insertSpaces: true,
    tabSize: 2,
    eol: content.includes("\r\n") ? "\r\n" : "\n",
    keepLines: false,
  };
  const root = parseTree(content);
  // JSONC parsing uses the last duplicate key, but modify() targets the first.
  const servers = root && lastPropertyValue(root, "servers");
  if (!servers) {
    return applyEdits(
      content,
      modify(
        content,
        ["servers"],
        { "assistant-ui": server },
        { formattingOptions },
      ),
    );
  }

  const existing =
    servers.type === "object"
      ? lastPropertyValue(servers, "assistant-ui")
      : servers;
  const edit = existing
    ? {
        offset: existing.offset,
        length: existing.length,
        content: JSON.stringify(
          servers.type === "object" ? server : { "assistant-ui": server },
        ),
      }
    : modify(
        content.slice(servers.offset, servers.offset + servers.length),
        ["assistant-ui"],
        server,
        {},
      ).map((edit) => ({ ...edit, offset: edit.offset + servers.offset }))[0]!;
  const updated = applyEdits(content, [edit]);
  return applyEdits(
    updated,
    format(
      updated,
      { offset: edit.offset, length: edit.content.length },
      formattingOptions,
    ),
  );
}

async function installForTarget(target: MCPTarget): Promise<void> {
  if (target === "claude-code") {
    logger.info("Installing MCP server for Claude Code...");
    logger.break();

    try {
      await runSpawn("claude", ["mcp", "remove", "assistant-ui"]).catch(
        (error: unknown) => {
          if (error instanceof SpawnSignalError) throw error;
        },
      );
      await runSpawn("claude", [
        "mcp",
        "add",
        "--transport",
        "http",
        "assistant-ui",
        HOSTED_MCP_URL,
      ]);
    } catch (error) {
      if (error instanceof SpawnSignalError) throw error;
      if (error instanceof SpawnExitError) {
        logger.error(`Installation failed with code ${error.code}`);
      } else if (error instanceof Error) {
        logger.error(`Failed to install: ${error.message}`);
        logger.info(
          "Make sure Claude Code CLI is installed: https://docs.anthropic.com/en/docs/claude-code",
        );
      }
      throw error;
    }

    logger.break();
    logger.success("MCP server installed for Claude Code!");
    logger.info(
      `Connects to the hosted assistant-ui MCP server at ${HOSTED_MCP_URL}.`,
    );
    logger.info(
      "The server starts automatically. Try asking about assistant-ui!",
    );
    return;
  }

  if (target === "claude-desktop" && process.platform === "linux") {
    logger.error("Claude Desktop is not available on Linux.");
    logger.info(
      "See: https://claude.ai/download for supported operating systems.",
    );
    throw new Error("Unsupported platform for Claude Desktop");
  }

  const targetConfig = MCP_CONFIGS[target];
  const configPath = targetConfig.getPath();
  const configDir = path.dirname(configPath);

  logger.info(`Installing MCP server for ${targetConfig.name}...`);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let existingConfig: any = {};
  let content = "{}\n";
  if (fs.existsSync(configPath)) {
    content = fs.readFileSync(configPath, "utf-8");
    try {
      if (target === "vscode") {
        const errors: ParseError[] = [];
        existingConfig = parseJsonc(content, errors, {
          allowTrailingComma: true,
          allowEmptyContent: true,
        });
        if (existingConfig === undefined) existingConfig = {};
        if (
          errors.length > 0 ||
          existingConfig === null ||
          typeof existingConfig !== "object" ||
          Array.isArray(existingConfig)
        ) {
          throw new SyntaxError("Invalid MCP configuration");
        }
      } else {
        existingConfig = JSON.parse(content);
      }
    } catch {
      const flag = getTargetFlag(target);
      logger.error(`Could not parse ${targetConfig.name} MCP config.`);
      logger.info(`Config path: ${configPath}`);
      logger.info(
        `Fix the JSON syntax in that file, then run: assistant-ui mcp ${flag}`,
      );
      logger.info("No changes were written.");
      throw new McpConfigParseError(targetConfig.name, configPath, flag);
    }
  }

  const newConfig = deepMerge(existingConfig, targetConfig.config);

  if (targetConfig.replaceServerKey) {
    const key = targetConfig.replaceServerKey;
    newConfig[key] = {
      ...newConfig[key],
      "assistant-ui": (targetConfig.config as any)[key]["assistant-ui"],
    };
  }

  const updatedContent =
    target === "vscode"
      ? updateVscodeConfig(content, newConfig.servers["assistant-ui"])
      : `${JSON.stringify(newConfig, null, 2)}\n`;
  fs.writeFileSync(configPath, updatedContent);

  logger.break();
  logger.success(`MCP server installed for ${targetConfig.name}!`);
  logger.info(`Config written to: ${configPath}`);

  if (targetConfig.replaceServerKey) {
    logger.break();
    logger.info(
      `Connects to the hosted assistant-ui MCP server at ${HOSTED_MCP_URL}.`,
    );
  }

  if (targetConfig.postInstall) {
    logger.break();
    logger.info(targetConfig.postInstall);
  }
}

export const mcp = new Command()
  .name("mcp")
  .description("connect your IDE to the assistant-ui MCP server")
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
      } catch (error) {
        if (error instanceof SpawnSignalError) throw error;
        process.exit(1);
      }
    }
  });
