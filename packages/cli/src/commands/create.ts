import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "cross-spawn";
import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import { logger } from "../lib/utils/logger";
import {
  dlxCommand,
  downloadProject,
  resolveLatestReleaseRef,
  resolvePackageManagerName,
  transformProject,
  type PackageManagerName,
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
    name: "with-google-adk",
    label: "Google ADK",
    description: "Google ADK agent integration",
    category: "example",
    path: "examples/with-google-adk",
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
    name: "with-expo",
    label: "Expo",
    description: "Expo / React Native",
    category: "example",
    path: "examples/with-expo",
    hasLocalComponents: true,
  },
  {
    name: "with-interactables",
    label: "Interactables",
    description: "AI-driven interactive UI components",
    category: "example",
    path: "examples/with-interactables",
    hasLocalComponents: true,
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
    name: "with-react-ink",
    label: "React Ink",
    description: "Terminal UI chat",
    category: "example",
    path: "examples/with-react-ink",
    hasLocalComponents: true,
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

// Examples that exist in the monorepo but are intentionally excluded from the CLI:
//
// - waterfall: Still in development, not ready for production.
// - with-cloud-standalone: For cloud without assistant-ui — not for the
//     assistant-ui CLI.
// - with-store: In development, not ready for public use of the tap store.
// - with-tap-runtime: In development, not ready for public use of the tap
//     store.

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
      {
        value: "_separator",
        label: "────── Starter Templates ──────",
        disabled: true,
      },
      ...PROJECT_METADATA.filter((m) => m.category === "template").map((m) => ({
        value: m.name,
        label: m.label,
        ...(m.description ? { hint: m.description } : {}),
      })),
      {
        value: "_separator",
        label: "────── Feature Examples ──────",
        disabled: true,
      },
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
}): PackageManagerName | undefined {
  if (opts.useNpm) return "npm";
  if (opts.usePnpm) return "pnpm";
  if (opts.useYarn) return "yarn";
  if (opts.useBun) return "bun";
  return undefined;
}

const PLAYGROUND_PRESET_BASE_URL =
  "https://www.assistant-ui.com/playground/init";

export function resolvePresetUrl(preset: string): string {
  if (preset.startsWith("http://") || preset.startsWith("https://")) {
    return preset;
  }
  return `${PLAYGROUND_PRESET_BASE_URL}?preset=${encodeURIComponent(preset)}`;
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
    "-p, --preset <name-or-url>",
    "preset name or URL (e.g., chatgpt or https://www.assistant-ui.com/playground/init?preset=chatgpt)",
  )
  .option("--use-npm", "explicitly use npm")
  .option("--use-pnpm", "explicitly use pnpm")
  .option("--use-yarn", "explicitly use yarn")
  .option("--use-bun", "explicitly use bun")
  .option("--native", "create an Expo / React Native project")
  .option("--ink", "create a React Ink terminal project")
  .option("--skip-install", "skip installing packages")
  .action(async (projectDirectory, opts) => {
    if (opts.native) {
      opts.example = "with-expo";
    }

    if (opts.ink) {
      opts.example = "with-react-ink";
    }

    if (opts.example && opts.preset) {
      logger.error("Cannot use --preset with --example.");
      process.exit(1);
    }

    if (opts.template && opts.example) {
      logger.error("Cannot use both --template and --example.");
      process.exit(1);
    }

    // Start release ref resolution early (runs during user prompts)
    const refPromise = resolveLatestReleaseRef();

    // 1. Resolve project directory
    let resolvedProjectDirectory = resolveCreateProjectDirectory({
      projectDirectory,
    });

    if (!resolvedProjectDirectory) {
      const result = await p.text({
        message: "Project name:",
        placeholder: "my-aui-app",
        defaultValue: "my-aui-app",
        validate: (value?: string) => {
          const name = (value ?? "").trim();
          if (!name) return "Project name cannot be empty";
          if (name === "." || name === "..")
            return "Project name cannot be . or ..";
          if (name.includes("/") || name.includes("\\"))
            return "Project name cannot contain path separators";
          return undefined;
        },
      });

      if (p.isCancel(result)) {
        p.cancel("Project creation cancelled.");
        process.exit(0);
      }

      resolvedProjectDirectory = result;
    }

    // Check directory
    const absoluteProjectDir = path.resolve(resolvedProjectDirectory);
    try {
      const files = fs.readdirSync(absoluteProjectDir);
      if (files.length > 0) {
        logger.error(
          `Directory ${resolvedProjectDirectory} already exists and is not empty`,
        );
        process.exit(1);
      }
    } catch (err: unknown) {
      const code =
        err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
      if (code === "ENOENT") {
        // Directory doesn't exist — good, proceed
      } else if (code === "ENOTDIR") {
        logger.error(
          `${resolvedProjectDirectory} already exists and is not a directory`,
        );
        process.exit(1);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Cannot access ${resolvedProjectDirectory}: ${message}`);
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

    const pm = await resolvePackageManagerName(
      absoluteProjectDir,
      resolvePackageManager(opts),
    );

    // Clean up partial project directory on unexpected exit (e.g. Ctrl+C)
    const cleanupOnExit = () => {
      fs.rmSync(absoluteProjectDir, { recursive: true, force: true });
    };
    process.once("exit", cleanupOnExit);

    try {
      // 3. Resolve latest release ref (started before prompts)
      logger.step("Resolving latest release...");
      const ref = await refPromise;
      if (!ref) {
        logger.warn("Could not resolve latest release, downloading from HEAD");
      }

      // 4. Download project
      logger.step("Downloading project...");
      try {
        await downloadProject(project.path, absoluteProjectDir, ref);

        // If the template didn't exist at the release tag, retry from HEAD
        if (
          ref &&
          !fs.existsSync(path.join(absoluteProjectDir, "package.json"))
        ) {
          fs.rmSync(absoluteProjectDir, { recursive: true, force: true });
          logger.warn(
            "Template not found at release tag, downloading from HEAD",
          );
          await downloadProject(project.path, absoluteProjectDir);
        }

        // 5. Run transform pipeline
        await transformProject(absoluteProjectDir, {
          hasLocalComponents: project.hasLocalComponents,
          skipInstall: opts.skipInstall,
          packageManager: pm,
        });
      } catch (err) {
        // Clean up partially created project directory
        fs.rmSync(absoluteProjectDir, { recursive: true, force: true });
        throw err;
      }

      // 6. Apply preset if provided
      if (opts.preset) {
        const presetUrl = resolvePresetUrl(opts.preset);
        logger.info("Applying preset configuration...");
        logger.break();
        const [dlxCmd, dlxArgs] = dlxCommand(pm);
        try {
          await runSpawn(
            dlxCmd,
            [
              ...dlxArgs,
              "shadcn@latest",
              "add",
              "--yes",
              "--overwrite",
              presetUrl,
            ],
            absoluteProjectDir,
          );
        } catch {
          logger.warn(
            `Preset application failed. You can retry manually with:\n  ${dlxCmd} ${[...dlxArgs, "shadcn@latest", "add", presetUrl].join(" ")}`,
          );
        }
      }

      process.removeListener("exit", cleanupOnExit);

      logger.break();
      logger.success("Project created successfully!");
      logger.break();
      const runCmd = pm === "npm" ? "npm run" : pm;
      let devScript = "dev";
      let envFile = ".env.local";
      try {
        const scaffoldedPkg = JSON.parse(
          fs.readFileSync(
            path.join(absoluteProjectDir, "package.json"),
            "utf-8",
          ),
        );
        devScript = scaffoldedPkg.scripts?.dev
          ? "dev"
          : scaffoldedPkg.scripts?.start
            ? "start"
            : "dev";
        envFile = scaffoldedPkg.dependencies?.next ? ".env.local" : ".env";
      } catch {
        // Fall back to defaults if package.json cannot be read
      }

      logger.info("Next steps:");
      logger.info(`  cd ${resolvedProjectDirectory}`);
      if (opts.skipInstall) {
        logger.info(`  ${pm} install`);
      }
      logger.info(`  # Set up your environment variables in ${envFile}`);
      logger.info(`  ${runCmd} ${devScript}`);
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
