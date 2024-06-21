import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "child_process";

export const create = new Command()
  .name("create")
  .description("create a new project")
  .argument("[project-directory]")
  .usage(`${chalk.green("[project-directory]")} [options]`)
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
  .action(() => {
    const child = spawn(
      "npx",
      [
        `create-next-app@latest`,
        ...process.argv.slice(3),
        "-e",
        "https://github.com/Yonom/assistant-ui-starter",
      ],
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
