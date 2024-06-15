import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { spawn } from "cross-spawn";
import { getComponentTargetPath } from "../utils/get-component-target-path";
import { type Config, getConfig } from "../utils/get-config";

const SHADCN_CLI_VERSION = "0.8.0";

const getTargetPath = (config: Config, pathOverride: string) => {
  const baseConfig = pathOverride ?? getComponentTargetPath(config);
  if (!baseConfig) {
    console.warn(
      `Unable to determine the base path. Please run ${chalk.green(
        "npx shadcn-ui init",
      )} to create a components.json file.`,
    );
    process.exit(1);
  }

  return [baseConfig, path.join(baseConfig, "assistant-ui")] as const;
};

export const add = new Command()
  .name("add")
  .description("add a component to your project")
  .argument("[components...]", "the components to add")
  .option("-y, --yes", "skip confirmation prompt.", true)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-a, --all", "add all available components", false)
  .option("-p, --path <path>", "the path to add the component to.")
  .action(async (_, opts) => {
    const cwd = path.resolve(opts.cwd);
    const config = await getConfig(cwd);

    if (!config) {
      console.warn(
        `Configuration is missing. Please run ${chalk.green(
          "npx shadcn-ui init",
        )} to create a components.json file.`,
      );
      process.exit(1);
    }

    const [basePath, targetPath] = getTargetPath(config, opts.path);

    // create target path directory if it doesnt exist
    if (targetPath && !existsSync(targetPath)) {
      mkdirSync(targetPath, { recursive: true });
    }

    const child = spawn(
      "npx",
      [
        `shadcn-ui@${SHADCN_CLI_VERSION}`,
        ...process.argv.slice(2),
        "--path",
        basePath,
      ],
      {
        stdio: "inherit",
        env: {
          COMPONENTS_REGISTRY_URL: "https://www.assistant-ui.com",
          ...process.env,
        },
      },
    );

    child.on("error", (error) => {
      console.error(`Error: ${error.message}`);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.log(`other-package-script process exited with code ${code}`);
      }
    });
  });
