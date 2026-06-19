import { Command } from "commander";
import chalk from "chalk";
import * as path from "node:path";
import { logger } from "../lib/utils/logger";
import {
  buildEve,
  detectProject,
  type BuildEveOptions,
} from "../build/build-eve";

export const deploy = new Command()
  .name("deploy")
  .description("Detect the project and run a production build.")
  .option("-c, --cwd <cwd>", "working directory", process.cwd())
  .option("--preset <preset>", "nitro preset to build with")
  .option("--out <dir>", "output directory for the build")
  .action(async (opts: { cwd: string; preset?: string; out?: string }) => {
    const cwd = path.resolve(opts.cwd);
    logger.break();
    logger.info("assistant-ui deploy");
    logger.break();
    logger.step("Scanning for a deployable project...");
    const project = detectProject(cwd);

    switch (project.type) {
      case "vercel": {
        const { info } = project;
        logger.success(
          `Detected ${chalk.bold.green("eve")} project${
            info.eveVersion ? chalk.dim(` (eve ${info.eveVersion})`) : ""
          }`,
        );
        for (const reason of info.reasons) {
          logger.info(`  ${chalk.dim("•")} ${reason}`);
        }

        try {
          const buildOptions: BuildEveOptions = { cwd };
          if (opts.preset !== undefined) buildOptions.preset = opts.preset;
          if (opts.out !== undefined) buildOptions.outputDir = opts.out;
          const result = await buildEve(buildOptions);
          process.exitCode = result.ok ? 0 : 1;
        } catch {
          process.exitCode = 1;
        }
        break;
      }
      default: {
        logger.error(`No supported project detected in ${chalk.bold(cwd)}.`);
        logger.info(
          `Supported: ${chalk.cyan("eve")} (an "eve" dependency or agent/ imports from "eve").`,
        );
        process.exitCode = 1;
      }
    }
  });
