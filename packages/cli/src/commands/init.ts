import { Command, Option } from "commander";
import { spawn } from "cross-spawn";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../lib/utils/logger";

const DEFAULT_REGISTRY_URL =
  "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json";

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

export function isNonInteractiveShell(
  stdinIsTTY = process.stdin.isTTY,
): boolean {
  return !stdinIsTTY;
}

export function buildCreateArgsForInitFallback(params: {
  projectDirectory?: string;
  preset?: string;
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  useBun?: boolean;
  skipInstall?: boolean;
}): string[] {
  const {
    projectDirectory,
    preset,
    useNpm,
    usePnpm,
    useYarn,
    useBun,
    skipInstall,
  } = params;
  const createArgs = ["assistant-ui@latest", "create"];
  const forwardedProjectDirectory =
    projectDirectory ?? (preset ? "." : undefined);
  if (forwardedProjectDirectory) createArgs.push(forwardedProjectDirectory);
  if (useNpm) createArgs.push("--use-npm");
  if (usePnpm) createArgs.push("--use-pnpm");
  if (useYarn) createArgs.push("--use-yarn");
  if (useBun) createArgs.push("--use-bun");
  if (skipInstall) createArgs.push("--skip-install");
  if (preset) createArgs.push("--preset", preset);
  return createArgs;
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
      "-p, --preset <url>",
      "preset URL from playground (forwarded to 'assistant-ui create')",
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
      if (presetUrl) {
        logger.info(
          "Detected '--preset' on 'assistant-ui init'. Forwarding to 'assistant-ui create'...",
        );
      } else {
        logger.info(
          "No existing project found. Running 'assistant-ui create' instead...",
        );
      }
      logger.break();

      const createArgs = buildCreateArgsForInitFallback({
        projectDirectory,
        ...(presetUrl ? { preset: presetUrl } : {}),
        useNpm: opts.useNpm,
        usePnpm: opts.usePnpm,
        useYarn: opts.useYarn,
        useBun: opts.useBun,
        skipInstall: opts.skipInstall,
      });

      await runSpawn("npx", createArgs, cwd);
      return;
    }

    const registryUrl = DEFAULT_REGISTRY_URL;
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
  });
