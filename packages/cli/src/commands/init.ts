import { Command } from "commander";
import { spawn } from "cross-spawn";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/utils/logger";
import { hasConfig } from "../lib/utils/config";

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

export const init = new Command()
  .name("init")
  .description("initialize assistant-ui in a new or existing project")
  .argument("[project-directory]", "directory for the new project")
  .option("-y, --yes", "skip confirmation prompt.", true)
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

    if (hasConfig(targetDir)) {
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

      const args = [`shadcn@latest`, "init", "--defaults"];
      if (opts.yes) args.push("--yes");
      if (opts.overwrite) args.push("--overwrite");
      args.push(registryUrl);

      const child = spawn("npx", args, {
        stdio: "inherit",
        cwd: targetDir,
      });

      child.on("error", (error) => {
        logger.error(`Failed to initialize: ${error.message}`);
        process.exit(1);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          logger.error(`Initialization failed with code ${code}`);
          process.exit(code || 1);
        } else {
          logger.break();
          logger.success("Project initialized successfully!");
          logger.info(
            "You can now add more components with 'assistant-ui add'",
          );
        }
      });
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

      const child = spawn("npx", cnaArgs, { stdio: "inherit", cwd });

      child.on("error", (error) => {
        logger.error(`Failed to create project: ${error.message}`);
        process.exit(1);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          logger.error(`Project creation failed with code ${code}`);
          process.exit(code || 1);
        } else {
          logger.break();
          logger.success("Project created successfully!");
        }
      });
    }
  });
