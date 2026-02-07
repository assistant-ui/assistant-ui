import { Command } from "commander";
import { spawn } from "cross-spawn";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/utils/logger";

const DEFAULT_REGISTRY_URL =
  "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json";

// Keep in sync with packages/create-assistant-ui/src/index.ts
const templates = {
  default: "https://github.com/assistant-ui/assistant-ui-starter",
  minimal: "https://github.com/assistant-ui/assistant-ui-starter-minimal",
  cloud: "https://github.com/assistant-ui/assistant-ui-starter-cloud",
  langgraph: "https://github.com/assistant-ui/assistant-ui-starter-langgraph",
  mcp: "https://github.com/assistant-ui/assistant-ui-starter-mcp",
};

const templateNames = Object.keys(templates);

class SpawnExitError extends Error {
  code: number;

  constructor(code: number) {
    super(`Process exited with code ${code}`);
    this.code = code;
  }
}

interface ExistingProjectInitPlan {
  initArgs: string[] | null;
  addArgs: string[];
}

export function createExistingProjectInitPlan(params: {
  yes: boolean;
  overwrite: boolean;
  registryUrl: string;
}): ExistingProjectInitPlan {
  const { yes, overwrite, registryUrl } = params;

  if (!yes) {
    const addArgs = [`shadcn@latest`, "add"];
    if (overwrite) addArgs.push("--overwrite");
    addArgs.push(registryUrl);
    return { initArgs: null, addArgs };
  }

  const initArgs = [`shadcn@latest`, "init", "--defaults", "--yes"];

  const addArgs = [`shadcn@latest`, "add", "--yes"];
  if (overwrite) addArgs.push("--overwrite");
  addArgs.push(registryUrl);

  return { initArgs, addArgs };
}

export function isNonInteractiveShell(stdinIsTTY = process.stdin.isTTY): boolean {
  return !stdinIsTTY;
}

async function runSpawn(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      cwd,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new SpawnExitError(code || 1));
      } else {
        resolve();
      }
    });
  });
}

export const init = new Command()
  .name("init")
  .description("initialize assistant-ui in a new or existing project")
  .argument("[project-directory]", "directory for the new project")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option(
    "-p, --preset <url>",
    "preset URL from playground (e.g., https://www.assistant-ui.com/playground/init?preset=chatgpt)",
  )
  .option(
    "-t, --template <template>",
    `template to use (${templateNames.join(", ")})`,
    "minimal",
  )
  .option("--use-npm", "explicitly use npm")
  .option("--use-pnpm", "explicitly use pnpm")
  .option("--use-yarn", "explicitly use yarn")
  .option("--use-bun", "explicitly use bun")
  .option("--skip-install", "skip installing packages")
  .action(async (projectDirectory, opts) => {
    const cwd = opts.cwd;
    const targetDir = projectDirectory
      ? path.resolve(cwd, projectDirectory)
      : cwd;
    const presetUrl = opts.preset;

    const componentsConfigPath = path.join(targetDir, "components.json");

    if (fs.existsSync(componentsConfigPath)) {
      logger.warn("Project is already initialized.");
      logger.info("Use 'assistant-ui add' to add more components.");
      return;
    }

    const packageJsonPath = path.join(targetDir, "package.json");
    const packageJsonExists = fs.existsSync(packageJsonPath);

    if (packageJsonExists) {
      const registryUrl = presetUrl ?? DEFAULT_REGISTRY_URL;

      if (presetUrl) {
        logger.info("Initializing assistant-ui with preset configuration...");
      } else {
        logger.info("Initializing assistant-ui in existing project...");
      }
      logger.break();

      if (!opts.yes && isNonInteractiveShell()) {
        logger.error(
          [
            "Detected a non-interactive shell, but 'assistant-ui init' needs interactive prompts by default.",
            "To run this in CI/agent mode, re-run with '--yes' so shadcn initialization and component install run non-interactively.",
            "Example: assistant-ui init --yes",
          ].join("\n"),
        );
        process.exit(1);
      }

      try {
        const { initArgs, addArgs } = createExistingProjectInitPlan({
          yes: opts.yes,
          overwrite: opts.overwrite,
          registryUrl,
        });

        if (initArgs) {
          await runSpawn("npx", initArgs, targetDir);
        }
        await runSpawn("npx", addArgs, targetDir);

        logger.break();
        logger.success("Project initialized successfully!");
        logger.info("You can now add more components with 'assistant-ui add'");
      } catch (error) {
        if (error instanceof SpawnExitError) {
          logger.error(`Initialization failed with code ${error.code}`);
          process.exit(error.code);
        }
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to initialize: ${message}`);
        process.exit(1);
      }
    } else {
      const templateName = opts.template as keyof typeof templates;
      const templateUrl = templates[templateName];

      if (!templateUrl) {
        logger.error(`Unknown template: ${opts.template}`);
        logger.info(`Available templates: ${templateNames.join(", ")}`);
        process.exit(1);
      }

      logger.info(
        `Creating a new assistant-ui project (template: ${templateName})...`,
      );
      logger.break();

      const cnaArgs: string[] = ["create-next-app@latest"];
      cnaArgs.push(projectDirectory || ".");
      cnaArgs.push("-e", templateUrl);

      if (opts.useNpm) cnaArgs.push("--use-npm");
      if (opts.usePnpm) cnaArgs.push("--use-pnpm");
      if (opts.useYarn) cnaArgs.push("--use-yarn");
      if (opts.useBun) cnaArgs.push("--use-bun");
      if (opts.skipInstall) cnaArgs.push("--skip-install");

      try {
        await runSpawn("npx", cnaArgs, cwd);
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
    }
  });
