import { Command } from "commander";
import { spawn } from "node:child_process";
import { type Config, getConfig } from "../utils/get-config";
import path from "node:path";
import { getComponentTargetPath } from "../utils/get-component-target-path";
import chalk from "chalk";

const getTargetPath = async (config: Config) => {
  const baseConfig = await getComponentTargetPath(config);
  return baseConfig ? path.join(baseConfig, "assistant-ui") : null;
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
    const targetPath = opts.path || (await getTargetPath(config));

    const child = spawn(
      "npx",
      ["shadcn-ui", ...process.argv.slice(2), "--path", targetPath],
      {
        stdio: "inherit",
        env: {
          COMPONENTS_REGISTRY_URL: "https://assistant-ui.com",
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
