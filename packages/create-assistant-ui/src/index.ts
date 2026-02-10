#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "cross-spawn";
import path from "node:path";
import * as p from "@clack/prompts";

// Keep in sync with packages/cli/src/commands/create.ts
const templates = {
  default: {
    url: "https://github.com/assistant-ui/assistant-ui-starter",
    label: "Default",
    hint: "Default template with Vercel AI SDK",
  },
  minimal: {
    url: "https://github.com/assistant-ui/assistant-ui-starter-minimal",
    label: "Minimal",
    hint: "Bare-bones starting point",
  },
  cloud: {
    url: "https://github.com/assistant-ui/assistant-cloud-starter",
    label: "Cloud",
    hint: "Cloud-backed persistence starter",
  },
  "cloud-clerk": {
    url: "https://github.com/assistant-ui/assistant-ui-starter-cloud-clerk",
    label: "Cloud + Clerk",
    hint: "Cloud-backed starter with Clerk auth",
  },
  langgraph: {
    url: "https://github.com/assistant-ui/assistant-ui-starter-langgraph",
    label: "LangGraph",
    hint: "LangGraph starter template",
  },
  mcp: {
    url: "https://github.com/assistant-ui/assistant-ui-starter-mcp",
    label: "MCP",
    hint: "MCP starter template",
  },
} as const;

type TemplateName = keyof typeof templates;
const templateNames = Object.keys(templates) as TemplateName[];

class SpawnExitError extends Error {
  code: number;

  constructor(code: number) {
    super(`Process exited with code ${code}`);
    this.code = code;
  }
}

async function runSpawn(command: string, args: string[], cwd?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      cwd,
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new SpawnExitError(code || 1));
      } else {
        resolve();
      }
    });
  });
}

function buildCreateNextAppArgs(
  commandArgs: string[],
  templateUrl: string,
): string[] {
  const filteredArgs = commandArgs.filter((arg, index, arr) => {
    const previousArg = arr[index - 1];
    return !(
      arg === "-t" ||
      arg === "--template" ||
      arg.startsWith("--template=") ||
      previousArg === "-t" ||
      previousArg === "--template" ||
      arg === "-p" ||
      arg === "--preset" ||
      arg.startsWith("--preset=") ||
      previousArg === "-p" ||
      previousArg === "--preset"
    );
  });

  return ["create-next-app@latest", ...filteredArgs, "-e", templateUrl];
}

const create = new Command()
  .name("create-assistant-ui")
  .description("create a new assistant-ui project")
  .argument("[project-directory]")
  .usage(`${chalk.green("[project-directory]")} [options]`)
  .option(
    "-t, --template <template>",
    `
  The template to use (${templateNames.join(", ")})
`,
  )
  .option(
    "--use-npm",
    `

  Explicitly tell the CLI to bootstrap the application using npm
`,
  )
  .option(
    "--use-pnpm",
    `

  Explicitly tell the CLI to bootstrap the application using pnpm
`,
  )
  .option(
    "--use-yarn",
    `

  Explicitly tell the CLI to bootstrap the application using Yarn
`,
  )
  .option(
    "--use-bun",
    `

  Explicitly tell the CLI to bootstrap the application using Bun
`,
  )
  .option(
    "--skip-install",
    `

  Explicitly tell the CLI to skip installing packages
`,
  )
  .option(
    "-p, --preset <url>",
    `

  Preset URL from playground (e.g., https://www.assistant-ui.com/playground/init?preset=chatgpt)
`,
  )
  .action(async (projectDirectory, opts) => {
    if (opts.preset && !projectDirectory) {
      console.error("Project directory is required when using --preset.");
      process.exit(1);
    }

    let templateName: TemplateName;
    if (opts.template) {
      templateName = opts.template as TemplateName;
    } else if (process.stdin.isTTY) {
      const selected = await p.select({
        message: "Select a template:",
        options: templateNames.map((name) => ({
          value: name,
          label: templates[name].label,
          hint: templates[name].hint,
        })),
      });
      if (p.isCancel(selected)) {
        p.cancel("Project creation cancelled.");
        process.exit(0);
      }
      templateName = selected as TemplateName;
    } else {
      templateName = "default";
    }

    const templateUrl = templates[templateName]?.url;
    if (!templateUrl) {
      console.error(
        `Unknown template: ${opts.template}\nAvailable templates: ${templateNames.join(", ")}`,
      );
      process.exit(1);
    }

    try {
      await runSpawn(
        "npx",
        buildCreateNextAppArgs(process.argv.slice(2), templateUrl),
      );

      if (opts.preset) {
        await runSpawn(
          "npx",
          ["shadcn@latest", "add", "--yes", opts.preset],
          path.resolve(process.cwd(), projectDirectory),
        );
      }
    } catch (error) {
      if (error instanceof SpawnExitError) {
        console.error(`create-next-app process exited with code ${error.code}`);
        process.exit(error.code);
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  });

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

function main() {
  create.parse();
}

main();
