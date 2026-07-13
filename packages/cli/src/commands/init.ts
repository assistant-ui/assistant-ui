import { Command, Option } from "commander";
import fs from "node:fs";
import path from "node:path";
import {
  dlxCommand,
  resolvePackageManager,
  resolvePackageManagerForCwd,
} from "../lib/create-project";
import { runSpawn, SpawnExitError } from "../lib/run-spawn";
import { logger } from "../lib/utils/logger";
import {
  getComponentsJsonStyle,
  resolveQuickStartRegistryUrl,
} from "../lib/utils/registry";
import { create } from "./create";

interface ExistingProjectInitPlan {
  initArgs: string[];
  addArgs: string[];
}

export function createExistingProjectInitPlan(params: {
  yes: boolean;
  overwrite: boolean;
}): ExistingProjectInitPlan {
  const { yes, overwrite } = params;
  const initArgs = yes
    ? [`shadcn@latest`, "init", "--defaults", "--yes"]
    : [`shadcn@latest`, "init"];
  const addArgs = [`shadcn@latest`, "add"];
  if (yes) addArgs.push("--yes");
  if (overwrite) addArgs.push("--overwrite");

  return { initArgs, addArgs };
}

export function isNonInteractiveShell(
  stdinIsTTY = process.stdin.isTTY,
): boolean {
  return !stdinIsTTY;
}

export const init = new Command()
  .name("init")
  .description("initialize assistant-ui in an existing project")
  .argument("[project-directory]", "directory for the new project")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .addOption(
    new Option(
      "-p, --preset <name-or-url>",
      "preset name or URL (forwarded to 'assistant-ui create')",
    ).hideHelp(),
  )
  .option("--use-npm", "explicitly use npm")
  .option("--use-pnpm", "explicitly use pnpm")
  .option("--use-yarn", "explicitly use yarn")
  .option("--use-bun", "explicitly use bun")
  .option("--skip-install", "skip installing packages")
  .action(async (projectDirectory, opts) => {
    const cwd = opts.cwd;
    const presetUrl = opts.preset as string | undefined;
    const targetDir = projectDirectory
      ? path.resolve(cwd, projectDirectory)
      : cwd;

    const componentsConfigPath = path.join(targetDir, "components.json");

    if (!presetUrl && fs.existsSync(componentsConfigPath)) {
      logger.warn("Project is already initialized.");
      logger.info("Use 'assistant-ui add' to add more components.");
      return;
    }

    const packageJsonPath = path.join(targetDir, "package.json");
    const packageJsonExists = fs.existsSync(packageJsonPath);

    if (presetUrl || !packageJsonExists) {
      if (!presetUrl) {
        logger.info("No existing project found. Running 'create' instead...");
        logger.break();
      }

      const createArgs: string[] = [];
      if (projectDirectory) createArgs.push(projectDirectory);
      if (presetUrl) createArgs.push("--preset", presetUrl);
      if (opts.useNpm) createArgs.push("--use-npm");
      if (opts.usePnpm) createArgs.push("--use-pnpm");
      if (opts.useYarn) createArgs.push("--use-yarn");
      if (opts.useBun) createArgs.push("--use-bun");
      if (opts.skipInstall) createArgs.push("--skip-install");

      await create.parseAsync(createArgs, { from: "user" });
      return;
    }

    logger.info("Initializing assistant-ui in existing project...");
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
      const pm = await resolvePackageManagerForCwd(
        targetDir,
        resolvePackageManager(opts),
      );
      const [dlxCmd, dlxArgs] = dlxCommand(pm);

      const { initArgs, addArgs } = createExistingProjectInitPlan({
        yes: opts.yes,
        overwrite: opts.overwrite,
      });

      await runSpawn(dlxCmd, [...dlxArgs, ...initArgs], targetDir);
      const registryUrl = resolveQuickStartRegistryUrl(
        getComponentsJsonStyle(targetDir),
      );
      await runSpawn(dlxCmd, [...dlxArgs, ...addArgs, registryUrl], targetDir);

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
  });
