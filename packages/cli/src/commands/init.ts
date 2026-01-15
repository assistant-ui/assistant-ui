import { Command } from "commander";
import { spawn } from "cross-spawn";
import fs from "node:fs";
import path from "node:path";
import { create } from "./create";
import { logger } from "../lib/utils/logger";
import { hasConfig } from "../lib/utils/config";

const DEFAULT_REGISTRY_URL =
  "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json";

export const init = new Command()
  .name("init")
  .description("initialize assistant-ui in a new or existing project")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option(
    "-p, --preset <url>",
    "preset URL from playground (e.g., https://www.assistant-ui.com/playground/init?preset=chatgpt)",
  )
  .action(async (opts) => {
    const cwd = opts.cwd;
    const presetUrl = opts.preset;

    if (hasConfig(cwd)) {
      logger.warn("Project is already initialized.");
      logger.info("Use 'assistant-ui add' to add more components.");
      return;
    }

    const packageJsonPath = path.join(cwd, "package.json");
    const packageJsonExists = fs.existsSync(packageJsonPath);

    if (packageJsonExists) {
      const registryUrl = presetUrl ?? DEFAULT_REGISTRY_URL;

      if (presetUrl) {
        logger.info("Initializing assistant-ui with preset configuration...");
      } else {
        logger.info("Initializing assistant-ui in existing project...");
      }
      logger.break();

      const child = spawn("npx", [`shadcn@latest`, "add", registryUrl], {
        stdio: "inherit",
        cwd,
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
      logger.info("Creating a new assistant-ui project...");
      logger.break();
      await create.parseAsync([]);
    }
  });
