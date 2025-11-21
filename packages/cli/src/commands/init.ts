import { Command } from "commander";
import { spawn } from "cross-spawn";
import fs from "node:fs";
import path from "node:path";
import { create } from "./create";
import { logger } from "../lib/utils/logger";
import { hasConfig } from "../lib/utils/config";

export const init = new Command()
  .name("init")
  .description("initialize assistant-ui in a new or existing project")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .action(async (opts) => {
    const cwd = opts.cwd;

    // Check if already initialized
    if (hasConfig(cwd)) {
      logger.warn("Project is already initialized.");
      logger.info("Use 'assistant-ui add' to add more components.");
      return;
    }

    // Check if package.json exists in the current directory
    const packageJsonPath = path.join(cwd, "package.json");
    const packageJsonExists = fs.existsSync(packageJsonPath);

    if (packageJsonExists) {
      // If package.json exists, run shadcn add command
      logger.info("Initializing assistant-ui in existing project...");
      logger.break();

      const child = spawn(
        "npx",
        [
          `shadcn@latest`,
          "add",
          "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json",
        ],
        {
          stdio: "inherit",
          cwd,
        },
      );

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
      // If package.json doesn't exist, use the create command
      logger.info("Creating a new assistant-ui project...");
      logger.break();

      // Execute the create command with default template
      await create.parseAsync([]);
    }
  });
