import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { createProject, type CreateProjectOptions } from "../lib/template-composer.js";

// Constants
const DEFAULT_PROJECT_NAME = "my-assistant-app";

// Map legacy template names to providers for backward compatibility
function mapTemplateToProvider(template: string | undefined): string {
  const mapping: Record<string, string> = {
    default: "assistant-cloud",
    langgraph: "langgraph",
    mcp: "mcp",
    "": "assistant-cloud",
  };
  return mapping[template || ""] || "assistant-cloud";
}

export const create = new Command()
  .name("create")
  .description("create a new project")
  .argument("[project-directory]")
  .usage(`${chalk.green("[project-directory]")} [options]`)
  .option(
    "-t, --template <template>",
    `

  The template to use for the project, e.g. default, langgraph, mcp
`,
  )
  .option(
    "--provider <provider>",
    `

  The AI provider to use: assistant-cloud, vercel-ai-sdk, langgraph, mcp
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
  .action(async (projectDirectory, opts) => {
    try {
      const projectName = projectDirectory || DEFAULT_PROJECT_NAME;
      
      // Handle absolute vs relative paths
      const projectPath = path.isAbsolute(projectName)
        ? projectName
        : path.join(process.cwd(), projectName);
      
      const provider = opts.provider || mapTemplateToProvider(opts.template);
      
      const options: CreateProjectOptions = {
        provider: opts.provider,
        template: opts.template,
        useNpm: opts.useNpm,
        usePnpm: opts.usePnpm,
        useYarn: opts.useYarn,
        useBun: opts.useBun,
        skipInstall: opts.skipInstall,
      };
      
      await createProject(projectName, projectPath, provider, options);
    } catch (error) {
      console.error(chalk.red("Error creating project:"), error);
      process.exit(1);
    }
  });
