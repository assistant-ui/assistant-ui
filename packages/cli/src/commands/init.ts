import { Command } from "commander";
import { spawn } from "cross-spawn";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { sync as globSync } from "glob";
import * as readline from "readline";
import { generateMastraTemplate } from "../templates/mastra-template";

function detectProjectType(): string | null {
  const pkgJsonPath = path.join(process.cwd(), "package.json");

  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

    // Check for Mastra packages
    if (
      deps["@mastra/core"] ||
      deps["@mastra/memory"] ||
      deps["@assistant-ui/react-mastra"]
    ) {
      return "mastra";
    }

    // Check for Mastra import patterns
    const files = globSync("**/*.{js,jsx,ts,tsx}", {
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    });

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      if (
        content.includes("new Mastra(") ||
        content.includes("mastra.getAgent") ||
        content.includes("@mastra/core") ||
        content.includes("@mastra/memory") ||
        content.includes("@assistant-ui/react-mastra")
      ) {
        return "mastra";
      }
    }
  } catch {
    // Silent fallback
  }

  return null;
}

export const init = new Command()
  .name("init")
  .description("initialize assistant-ui in a new or existing project")
  .option(
    "--framework <framework>",
    "framework to use (next, vite, or mastra)",
    "next",
  )
  .action(async (options) => {
    // Check if package.json exists in the current directory
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJsonExists = fs.existsSync(packageJsonPath);

    // Auto-detect Mastra projects if framework not explicitly set
    if (options.framework === "next" && packageJsonExists) {
      const detectedType = detectProjectType();
      if (detectedType === "mastra") {
        console.log(chalk.yellow("🔍 Mastra project detected automatically"));

        // Only prompt if stdin is a TTY (interactive terminal)
        if (process.stdin.isTTY) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question(
              "Would you like to use Mastra-specific setup? (Y/n) ",
              (answer: string) => {
                rl.close();
                resolve(answer);
              },
            );
          });

          if (answer === "" || answer.toLowerCase().startsWith("y")) {
            options.framework = "mastra";
          }
        } else {
          // Non-interactive mode: default to Mastra setup
          console.log(
            chalk.blue("Using Mastra-specific setup (non-interactive mode)"),
          );
          options.framework = "mastra";
        }
      }
    }

    // Handle Mastra framework specially
    if (options.framework === "mastra") {
      if (packageJsonExists) {
        console.log(
          chalk.yellow(
            "Package.json already exists. Cannot initialize Mastra project in existing directory.",
          ),
        );
        console.log(
          chalk.blue(
            "Use 'npx assistant-ui create --template mastra <project-name>' instead.",
          ),
        );
        return;
      }

      console.log(chalk.blue("Creating new Mastra project..."));

      const projectName = path.basename(process.cwd()) || "mastra-app";
      generateMastraTemplate({
        projectName,
        targetDir: process.cwd(),
        agentId: "chef-agent",
        enableMemory: true,
        enableWorkflows: false,
      });

      console.log(chalk.green("✅ Mastra project created successfully!"));
      console.log(chalk.blue("\nNext steps:"));
      console.log("   pnpm install");
      console.log("   cp .env.local.example .env.local");
      console.log("   # Add your OPENAI_API_KEY to .env.local");
      console.log("   pnpm run dev");
      return;
    }

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

      // For other frameworks, use the create command with default template
      const template =
        options.framework === "vite"
          ? "https://github.com/assistant-ui/assistant-ui-starter-vite"
          : "https://github.com/assistant-ui/assistant-ui-starter";

      const child = spawn(
        "npx",
        [`create-next-app@latest`, ".", "-e", template],
        {
          stdio: "inherit",
        },
      );

      child.on("error", (error) => {
        console.error(`Error: ${error.message}`);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          console.log(`create-next-app process exited with code ${code}`);
        }
      });
    }
  });
