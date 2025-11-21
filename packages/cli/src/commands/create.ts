import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "cross-spawn";
import { logger } from "../lib/utils/logger";

export const create = new Command()
  .name("create")
  .description("create a new project")
  .argument("[project-directory]")
  .usage(`${chalk.green("[project-directory]")} [options]`)
  .option(
    "-t, --template <template>",
    "template to use (default, cloud, langgraph, mcp)",
  )
  .option("--use-npm", "explicitly use npm")
  .option("--use-pnpm", "explicitly use pnpm")
  .option("--use-yarn", "explicitly use yarn")
  .option("--use-bun", "explicitly use bun")
  .option("--skip-install", "skip installing packages")
  .action((_, opts) => {
    const templates = {
      default: "https://github.com/assistant-ui/assistant-ui-starter",
      cloud: "https://github.com/assistant-ui/assistant-ui-starter-cloud",
      langgraph:
        "https://github.com/assistant-ui/assistant-ui-starter-langgraph",
      mcp: "https://github.com/assistant-ui/assistant-ui-starter-mcp",
    };

    const templateName = (opts.template as keyof typeof templates) ?? "default";
    const templateUrl = templates[templateName];

    if (!templateUrl) {
      logger.error(`Unknown template: ${opts.template}`);
      logger.info(`Available templates: ${Object.keys(templates).join(", ")}`);
      process.exit(1);
    }

    logger.info(`Creating project with template: ${templateName}`);
    logger.break();

    const filteredArgs = process.argv.slice(3).filter((arg, index, arr) => {
      return !(
        arg === "-t" ||
        arg === "--template" ||
        arr[index - 1] === "-t" ||
        arr[index - 1] === "--template"
      );
    });

    const child = spawn(
      "npx",
      [`create-next-app@latest`, ...filteredArgs, "-e", templateUrl],
      {
        stdio: "inherit",
      },
    );

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
  });
