import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "cross-spawn";

export const create = new Command()
  .name("create")
  .description("create a new project")
  .argument("[project-directory]")
  .usage(`${chalk.green("[project-directory]")} [options]`)
  .option(
    "-t, --template <template>",
    `

  The template to use for the project, e.g. default, langgraph
`,
  )
  .option(
    "--use-npm",
    `

  Explicitly tell the CLI to bootstrap the application using npm
`,
  )
  .option(
    "--use-pnpm",
    `

  Explicitly tell the CLI to bootstrap the application using pnpm
`,
  )
  .option(
    "--use-yarn",
    `

  Explicitly tell the CLI to bootstrap the application using Yarn
`,
  )
  .option(
    "--use-bun",
    `

  Explicitly tell the CLI to bootstrap the application using Bun
`,
  )
  .option(
    "--skip-install",
    `

  Explicitly tell the CLI to skip installing packages
`,
  )
  .action((_, opts) => {
    const templates = {
      default: "https://github.com/assistant-ui/assistant-ui-starter",
      langgraph:
        "https://github.com/assistant-ui/assistant-ui-starter-langgraph",
      mcp: "https://github.com/assistant-ui/assistant-ui-starter-mcp",
    };

    const templateUrl =
      templates[(opts.template as keyof typeof templates) ?? "default"];
    if (!templateUrl) {
      console.error(`Unknown template: ${opts.template}`);
      process.exit(1);
    }

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
      console.error(`Error: ${error.message}`);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.log(`other-package-script process exited with code ${code}`);
      }
    });
  });
