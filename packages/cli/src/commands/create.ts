import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "cross-spawn";
import path from "node:path";
import * as p from "@clack/prompts";
import { logger } from "../lib/utils/logger";
import { createFromExample } from "../lib/create-from-example";

// Keep in sync with packages/create-assistant-ui/src/index.ts
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

const templatePickerOptions: Array<{
  value: TemplateName;
  label: string;
  hint: string;
}> = templateNames.map((name) => ({
  value: name,
  label: templates[name].label,
  hint: templates[name].hint,
}));

export async function resolveCreateTemplateName(params: {
  template?: string;
  stdinIsTTY?: boolean;
  select?: typeof p.select;
  isCancel?: typeof p.isCancel;
}): Promise<TemplateName | null> {
  const {
    template,
    stdinIsTTY = process.stdin.isTTY,
    select = p.select,
    isCancel = p.isCancel,
  } = params;

  if (template) {
    return template as TemplateName;
  }

  if (!stdinIsTTY) {
    return "default";
  }

  const selected = await select({
    message: "Select a template:",
    options: templatePickerOptions,
  });

  if (isCancel(selected)) {
    return null;
  }

  return selected as TemplateName;
}

class SpawnExitError extends Error {
  code: number;

  constructor(code: number) {
    super(`Process exited with code ${code}`);
    this.code = code;
  }
}

async function runSpawn(
  command: string,
  args: string[],
  cwd?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
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

export function buildCreateNextAppArgs(params: {
  commandArgs: string[];
  templateUrl: string;
}): string[] {
  const { commandArgs, templateUrl } = params;

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

function buildPresetAddArgs(presetUrl: string): string[] {
  return ["shadcn@latest", "add", "--yes", presetUrl];
}

export const create = new Command()
  .name("create")
  .description("create a new project")
  .argument("[project-directory]")
  .usage(`${chalk.green("[project-directory]")} [options]`)
  .option(
    "-t, --template <template>",
    `template to use (${templateNames.join(", ")})`,
  )
  .option(
    "-e, --example <example>",
    "create from an example (e.g., with-langgraph, with-ai-sdk-v6)",
  )
  .option(
    "-p, --preset <url>",
    "preset URL from playground (e.g., https://www.assistant-ui.com/playground/init?preset=chatgpt)",
  )
  .option("--use-npm", "explicitly use npm")
  .option("--use-pnpm", "explicitly use pnpm")
  .option("--use-yarn", "explicitly use yarn")
  .option("--use-bun", "explicitly use bun")
  .option("--skip-install", "skip installing packages")
  .action(async (projectDirectory, opts) => {
    if (opts.example && opts.preset) {
      logger.error("Cannot use --preset with --example.");
      process.exit(1);
    }

    if (opts.preset && !projectDirectory) {
      logger.error("Project directory is required when using --preset.");
      process.exit(1);
    }

    // Handle --example option
    if (opts.example) {
      if (!projectDirectory) {
        logger.error("Project directory is required when using --example");
        process.exit(1);
      }

      await createFromExample(projectDirectory, opts.example, {
        skipInstall: opts.skipInstall,
        useNpm: opts.useNpm,
        usePnpm: opts.usePnpm,
        useYarn: opts.useYarn,
        useBun: opts.useBun,
      });
      return;
    }

    // Handle --template option
    const templateName = await resolveCreateTemplateName({
      template: opts.template,
    });
    if (!templateName) {
      p.cancel("Project creation cancelled.");
      process.exit(0);
    }

    const templateUrl = templates[templateName]?.url;

    if (!templateUrl) {
      logger.error(`Unknown template: ${opts.template}`);
      logger.info(`Available templates: ${templateNames.join(", ")}`);
      process.exit(1);
    }

    logger.info(`Creating project with template: ${templateName}`);
    logger.break();

    const createNextAppArgs = buildCreateNextAppArgs({
      commandArgs: process.argv.slice(3),
      templateUrl,
    });

    try {
      await runSpawn("npx", createNextAppArgs);

      if (opts.preset) {
        logger.info("Applying preset configuration...");
        logger.break();
        await runSpawn(
          "npx",
          buildPresetAddArgs(opts.preset),
          path.resolve(process.cwd(), projectDirectory),
        );
      }

      logger.break();
      logger.success("Project created successfully!");
    } catch (error) {
      if (error instanceof SpawnExitError) {
        logger.error(`Project creation failed with code ${error.code}`);
        process.exit(error.code);
      }
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create project: ${message}`);
      process.exit(1);
    }
  });
