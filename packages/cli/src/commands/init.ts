import { Command } from "commander";
import { spawn } from "cross-spawn";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { create } from "./create";

export const init = new Command()
  .name("init")
  .description("initialize assistant-ui in a new or existing project")
  .action(async () => {
    // Check if package.json exists in the current directory
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJsonExists = fs.existsSync(packageJsonPath);

    if (packageJsonExists) {
      // If package.json exists, run shadcn add command
      console.log(
        chalk.blue("Initializing assistant-ui in existing project..."),
      );

      const child = spawn(
        "npx",
        [
          `shadcn@latest`,
          "add",
          "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json",
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
          console.log(`shadcn process exited with code ${code}`);
        }
      });
    } else {
      // If package.json doesn't exist, use the create command
      console.log(chalk.blue("Creating a new assistant-ui project..."));

      // Execute the create command with default template
      await create.parseAsync([]);
    }
  });
