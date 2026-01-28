#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "cross-spawn";

// Keep in sync with packages/cli/src/lib/constants.ts
const templates = {
  default: "https://github.com/assistant-ui/assistant-ui-starter",
  minimal: "https://github.com/assistant-ui/assistant-ui-starter-minimal",
  cloud: "https://github.com/assistant-ui/assistant-ui-starter-cloud",
  langgraph: "https://github.com/assistant-ui/assistant-ui-starter-langgraph",
  mcp: "https://github.com/assistant-ui/assistant-ui-starter-mcp",
};

const create = new Command()
  .name("create-assistant-ui")
  .description("create a new assistant-ui project")
  .argument("[project-directory]")
  .usage(`${chalk.green("[project-directory]")} [options]`)
  .option(
    "-t, --template <template>",
    `
  The template to use (${Object.keys(templates).join(", ")})
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
    const templateUrl =
      templates[(opts.template as keyof typeof templates) ?? "default"];
    if (!templateUrl) {
      console.error(
        `Unknown template: ${opts.template}\nAvailable templates: ${Object.keys(templates).join(", ")}`,
      );
      process.exit(1);
    }

    const filteredArgs = process.argv.slice(2).filter((arg, index, arr) => {
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
      process.exit(1);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`create-next-app process exited with code ${code}`);
        process.exit(code || 1);
      }
    });
  });

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

function main() {
  create.parse();
}

main();
