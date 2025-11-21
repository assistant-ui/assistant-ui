import { Command } from "commander";
import { spawn } from "cross-spawn";
import { logger } from "../lib/utils/logger";
import { hasConfig } from "../lib/utils/config";

const REGISTRY_BASE_URL = "https://r.assistant-ui.com";

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
  .action((components: string[], opts) => {
    // Check if project is initialized
    if (!hasConfig(opts.cwd)) {
      logger.warn(
        "It looks like you haven't initialized your project yet. Run 'assistant-ui init' first.",
      );
      logger.break();
    }

    const componentsToAdd = components.map((c) => {
      if (!/^[a-zA-Z0-9-/]+$/.test(c)) {
        throw new Error(`Invalid component name: ${c}`);
      }
      return `${REGISTRY_BASE_URL}/${encodeURIComponent(c)}`;
    });

    logger.step(`Adding ${components.length} component(s)...`);

    const args = [`shadcn@latest`, "add", ...componentsToAdd];

    if (opts.yes) args.push("--yes");
    if (opts.overwrite) args.push("--overwrite");
    if (opts.cwd) args.push("--cwd", opts.cwd);
    if (opts.path) args.push("--path", opts.path);

    const child = spawn("npx", args, {
      stdio: "inherit",
      shell: true,
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
