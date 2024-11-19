import { Command } from "commander";
import { spawn } from "cross-spawn";

export const shadcnAdd = new Command()
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
  .action(async (components: string[], opts) => {
    const componentsToAdd = components.map(
      (c) => `"https://r.assistant-ui.com/shadcn/${c}"`,
    );

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
      console.error(`Error: ${error.message}`);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.log(`other-package-script process exited with code ${code}`);
      }
    });
  });
