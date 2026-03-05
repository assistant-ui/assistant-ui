import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "cross-spawn";
import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import { logger } from "../lib/utils/logger";
import {
  downloadProject,
  resolveLatestReleaseSha,
  transformProject,
} from "../lib/create-project";

export interface ProjectMetadata {
  name: string;
  label: string;
  description?: string;
  category: "template" | "example";
  path: string;
  hasLocalComponents: boolean;
}

export const PROJECT_METADATA: ProjectMetadata[] = [
  // Templates
  {
    name: "default",
    label: "Default",
    description: "Default template with Vercel AI SDK",
    category: "template",
    path: "templates/default",
    hasLocalComponents: true,
  },
  {
    name: "minimal",
    label: "Minimal",
    description: "Bare-bones starting point",
    category: "template",
    path: "templates/minimal",
    hasLocalComponents: true,
  },
  {
    name: "cloud",
    label: "Cloud",
    description: "Cloud-backed persistence starter",
    category: "template",
    path: "templates/cloud",
    hasLocalComponents: true,
  },
  {
    name: "cloud-clerk",
    label: "Cloud + Clerk",
    description: "Cloud-backed starter with Clerk auth",
    category: "template",
    path: "templates/cloud-clerk",
    hasLocalComponents: true,
  },
  {
    name: "langgraph",
    label: "LangGraph",
    description: "LangGraph starter template",
    category: "template",
    path: "templates/langgraph",
    hasLocalComponents: true,
  },
  {
    name: "mcp",
    label: "MCP",
    description: "MCP starter template",
    category: "template",
    path: "templates/mcp",
    hasLocalComponents: true,
  },
  // Examples
  {
    name: "with-ag-ui",
    label: "AG-UI",
    description: "AG-UI protocol integration",
    category: "example",
    path: "examples/with-ag-ui",
    hasLocalComponents: false,
  },
  {
    name: "with-ai-sdk-v6",
    label: "AI SDK v6",
    description: "Vercel AI SDK v6",
    category: "example",
    path: "examples/with-ai-sdk-v6",
    hasLocalComponents: false,
  },
  {
    name: "with-artifacts",
    label: "Artifacts",
    description: "Artifact rendering",
    category: "example",
    path: "examples/with-artifacts",
    hasLocalComponents: false,
  },
  {
    name: "with-assistant-transport",
    label: "Assistant Transport",
    description: "Assistant transport protocol",
    category: "example",
    path: "examples/with-assistant-transport",
    hasLocalComponents: false,
  },
  {
    name: "with-chain-of-thought",
    label: "Chain of Thought",
    description: "Chain-of-thought rendering",
    category: "example",
    path: "examples/with-chain-of-thought",
    hasLocalComponents: false,
  },
  {
    name: "with-cloud",
    label: "Cloud Example",
    description: "Cloud integration example",
    category: "example",
    path: "examples/with-cloud",
    hasLocalComponents: false,
  },
  {
    name: "with-custom-thread-list",
    label: "Custom Thread List",
    description: "Custom thread list UI",
    category: "example",
    path: "examples/with-custom-thread-list",
    hasLocalComponents: false,
  },
  {
    name: "with-elevenlabs-scribe",
    label: "ElevenLabs Scribe",
    description: "Audio/speech integration",
    category: "example",
    path: "examples/with-elevenlabs-scribe",
    hasLocalComponents: false,
  },
  {
    name: "with-external-store",
    label: "External Store",
    description: "Custom message store",
    category: "example",
    path: "examples/with-external-store",
    hasLocalComponents: false,
  },
  {
    name: "with-ffmpeg",
    label: "FFmpeg",
    description: "File processing",
    category: "example",
    path: "examples/with-ffmpeg",
    hasLocalComponents: false,
  },
  {
    name: "with-langgraph",
    label: "LangGraph Example",
    description: "LangGraph integration",
    category: "example",
    path: "examples/with-langgraph",
    hasLocalComponents: false,
  },
  {
    name: "with-parent-id-grouping",
    label: "Parent ID Grouping",
    description: "Message grouping strategy",
    category: "example",
    path: "examples/with-parent-id-grouping",
    hasLocalComponents: false,
  },
  {
    name: "with-react-hook-form",
    label: "React Hook Form",
    description: "Form integration",
    category: "example",
    path: "examples/with-react-hook-form",
    hasLocalComponents: false,
  },
  {
    name: "with-react-router",
    label: "React Router",
    description: "React Router v7 + Vite",
    category: "example",
    path: "examples/with-react-router",
    hasLocalComponents: false,
  },
  {
    name: "with-tanstack",
    label: "TanStack",
    description: "TanStack/React Router + Vite",
    category: "example",
    path: "examples/with-tanstack",
    hasLocalComponents: false,
  },
];

const templateNames = PROJECT_METADATA.filter(
  (m) => m.category === "template",
).map((m) => m.name);

const exampleNames = PROJECT_METADATA.filter(
  (m) => m.category === "example",
).map((m) => m.name);

export async function resolveProject(params: {
  template?: string;
  example?: string;
  stdinIsTTY?: boolean;
  select?: typeof p.select;
  isCancel?: typeof p.isCancel;
}): Promise<ProjectMetadata | null> {
  const {
    template,
    example,
    stdinIsTTY = process.stdin.isTTY,
    select = p.select,
    isCancel = p.isCancel,
  } = params;

  if (template) {
    const meta = PROJECT_METADATA.find(
      (m) => m.name === template && m.category === "template",
    );
    if (!meta) {
      logger.error(`Unknown template: ${template}`);
      logger.info(`Available templates: ${templateNames.join(", ")}`);
      process.exit(1);
    }
    return meta;
  }

  if (example) {
    const meta = PROJECT_METADATA.find(
      (m) => m.name === example && m.category === "example",
    );
    if (!meta) {
      logger.error(`Unknown example: ${example}`);
      logger.info(`Available examples: ${exampleNames.join(", ")}`);
      process.exit(1);
    }
    return meta;
  }

  if (!stdinIsTTY) {
    return PROJECT_METADATA.find((m) => m.name === "default")!;
  }

  const selected = await select({
    message: "Select a project to scaffold:",
    options: [
      ...PROJECT_METADATA.filter((m) => m.category === "template").map((m) => ({
        value: m.name,
        label: m.label,
        ...(m.description ? { hint: m.description } : {}),
      })),
      { value: "_separator", label: "─── Examples ───" },
      ...PROJECT_METADATA.filter((m) => m.category === "example").map((m) => ({
        value: m.name,
        label: m.label,
        ...(m.description ? { hint: m.description } : {}),
      })),
    ],
  });

  if (isCancel(selected)) {
    return null;
  }

  const meta = PROJECT_METADATA.find((m) => m.name === selected);
  if (!meta) {
    logger.error(`Unknown selection: ${String(selected)}`);
    process.exit(1);
  }
  return meta;
}

class SpawnExitError extends Error {
  code: number;

  constructor(code: number) {
    super(`Process exited with code ${code}`);
    this.code = code;
  }
}

async function runSpawn(
  command: string,
  args: string[],
  cwd?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      cwd,
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new SpawnExitError(code || 1));
      } else {
        resolve();
      }
    });
  });
}

export function resolveCreateProjectDirectory(params: {
  projectDirectory?: string;
  stdinIsTTY?: boolean;
}): string | undefined {
  const { projectDirectory, stdinIsTTY = process.stdin.isTTY } = params;

  if (projectDirectory) return projectDirectory;
  if (!stdinIsTTY) return "my-aui-app";
  return undefined;
}

function resolvePackageManager(opts: {
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  useBun?: boolean;
}): "npm" | "pnpm" | "yarn" | "bun" | undefined {
  if (opts.useNpm) return "npm";
  if (opts.usePnpm) return "pnpm";
  if (opts.useYarn) return "yarn";
  if (opts.useBun) return "bun";
  return undefined;
}

export const create = new Command()
  .name("create")
  .description("create a new project")
  .argument("[project-directory]")
  .usage(`${chalk.green("[project-directory]")} [options]`)
  .option(
    "-t, --template <template>",
    `template to use (${templateNames.join(", ")})`,
  )
  .option(
    "-e, --example <example>",
    `create from an example (${exampleNames.join(", ")})`,
  )
  .option(
    "-p, --preset <url>",
    "preset URL from playground (e.g., https://www.assistant-ui.com/playground/init?preset=chatgpt)",
  )
  .option("--use-npm", "explicitly use npm")
  .option("--use-pnpm", "explicitly use pnpm")
  .option("--use-yarn", "explicitly use yarn")
  .option("--use-bun", "explicitly use bun")
  .option("--skip-install", "skip installing packages")
  .action(async (projectDirectory, opts) => {
    if (opts.example && opts.preset) {
      logger.error("Cannot use --preset with --example.");
      process.exit(1);
    }

    if (opts.template && opts.example) {
      logger.error("Cannot use both --template and --example.");
      process.exit(1);
    }

    // 1. Resolve project directory
    let resolvedProjectDirectory = resolveCreateProjectDirectory({
      projectDirectory,
    });

    if (!resolvedProjectDirectory) {
      const result = await p.text({
        message: "Project name:",
        placeholder: "my-aui-app",
        defaultValue: "my-aui-app",
      });

      if (p.isCancel(result)) {
        p.cancel("Project creation cancelled.");
        process.exit(0);
      }

      resolvedProjectDirectory = result;
    }

    if (opts.preset && !resolvedProjectDirectory) {
      logger.error("Project directory is required when using --preset.");
      process.exit(1);
    }

    // Check directory
    const absoluteProjectDir = path.resolve(resolvedProjectDirectory);
    if (fs.existsSync(absoluteProjectDir)) {
      const files = fs.readdirSync(absoluteProjectDir);
      if (files.length > 0) {
        logger.error(
          `Directory ${resolvedProjectDirectory} already exists and is not empty`,
        );
        process.exit(1);
      }
    }

    // 2. Resolve scaffold target
    const project = await resolveProject({
      template: opts.template,
      example: opts.example,
    });
    if (!project) {
      p.cancel("Project creation cancelled.");
      process.exit(0);
    }

    logger.info(`Creating project from ${project.category}: ${project.label}`);
    logger.break();

    try {
      // 3. Resolve latest release SHA
      logger.step("Resolving latest release...");
      const sha = await resolveLatestReleaseSha();

      // 4. Download via degit
      logger.step("Downloading project...");
      await downloadProject(project.path, absoluteProjectDir, sha);

      // 5. Run transform pipeline
      await transformProject(absoluteProjectDir, {
        hasLocalComponents: project.hasLocalComponents,
        skipInstall: opts.skipInstall,
        packageManager: resolvePackageManager(opts),
      });

      // 6. Apply preset if provided
      if (opts.preset) {
        logger.info("Applying preset configuration...");
        logger.break();
        await runSpawn(
          "npx",
          ["--yes", "shadcn@latest", "add", "--yes", opts.preset],
          absoluteProjectDir,
        );
      }

      logger.break();
      logger.success("Project created successfully!");
      logger.break();
      logger.info("Next steps:");
      logger.info(`  cd ${resolvedProjectDirectory}`);
      if (opts.skipInstall) {
        logger.info("  npm install");
      }
      logger.info("  # Set up your environment variables in .env.local");
      logger.info("  npm run dev");
    } catch (error) {
      if (error instanceof SpawnExitError) {
        logger.error(`Project creation failed with code ${error.code}`);
        process.exit(error.code);
      }
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create project: ${message}`);
      process.exit(1);
    }
  });
