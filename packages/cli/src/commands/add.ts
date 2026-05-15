import { Command } from "commander";
import { spawn } from "cross-spawn";
import { logger } from "../lib/utils/logger";
import { hasConfig } from "../lib/utils/config";
import {
  dlxCommand,
  resolvePackageManager,
  resolvePackageManagerForCwd,
  type PackageManagerName,
} from "../lib/create-project";

const REGISTRY_BASE_URL = "https://r.assistant-ui.com";

export interface AddComponentsPlan {
  command: string;
  args: string[];
}

export function createAddComponentsPlan(params: {
  components: string[];
  packageManager: PackageManagerName;
  yes?: boolean;
  overwrite?: boolean;
  cwd?: string;
  path?: string;
}): AddComponentsPlan {
  const componentsToAdd = params.components.map((c) => {
    if (!/^[a-zA-Z0-9-/]+$/.test(c)) {
      throw new Error(`Invalid component name: ${c}`);
    }
    return `${REGISTRY_BASE_URL}/${encodeURIComponent(c)}.json`;
  });

  const [command, dlxArgs] = dlxCommand(params.packageManager);
  const args = [...dlxArgs, "shadcn@latest", "add", ...componentsToAdd];

  // For npm, dlxArgs may already include `--yes` for npx auto-install.
  // This flag is for shadcn's own confirmation prompt.
  if (params.yes) args.push("--yes");
  if (params.overwrite) args.push("--overwrite");
  if (params.cwd) args.push("--cwd", params.cwd);
  if (params.path) args.push("--path", params.path);

  return { command, args };
}

export const add = new Command()
  .name("add")
  .description("add a component to your project")
  .argument("<components...>", "the components to add")
  .option("-y, --yes", "skip confirmation prompt.", true)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-p, --path <path>", "the path to add the component to.")
  .option("--use-npm", "explicitly use npm")
  .option("--use-pnpm", "explicitly use pnpm")
  .option("--use-yarn", "explicitly use yarn")
  .option("--use-bun", "explicitly use bun")
  .action(async (components: string[], opts) => {
    // Check if project is initialized
    if (!hasConfig(opts.cwd)) {
      logger.warn(
        "It looks like you haven't initialized your project yet. Run 'assistant-ui init' first.",
      );
      logger.break();
    }

    logger.step(`Adding ${components.length} component(s)...`);

    const packageManager = await resolvePackageManagerForCwd(
      opts.cwd,
      resolvePackageManager(opts),
    );
    const { command, args } = createAddComponentsPlan({
      components,
      packageManager,
      yes: opts.yes,
      overwrite: opts.overwrite,
      cwd: opts.cwd,
      path: opts.path,
    });

    const child = spawn(command, args, {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      logger.error(`Failed to add components: ${error.message}`);
      process.exit(1);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        logger.error(`Process exited with code ${code}`);
        process.exit(code || 1);
      } else {
        logger.success("Components added successfully!");
      }
    });
  });
