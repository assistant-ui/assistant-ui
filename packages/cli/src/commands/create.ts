import { Command, Option } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import { logger } from "../lib/utils/logger";
import {
  dlxCommand,
  downloadProject,
  resolveLatestReleaseRef,
  resolvePackageManager,
  resolvePackageManagerForCwd,
  scaffoldProject,
  transformProject,
  type TransformResult,
} from "../lib/create-project";
import { runSpawn, SpawnExitError } from "../lib/run-spawn";
import {
  buildSkillsAddCommand,
  resolveSkillsInstall,
} from "../lib/agent-skill";

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
    hasLocalComponents: false,
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
    hasLocalComponents: false,
  },
  {
    name: "cloud-clerk",
    label: "Cloud + Clerk",
    description: "Cloud-backed starter with Clerk auth",
    category: "template",
    path: "templates/cloud-clerk",
    hasLocalComponents: false,
  },
  {
    name: "langchain",
    label: "LangChain",
    description: "LangGraph starter with the react-langchain adapter",
    category: "template",
    path: "templates/langchain",
    hasLocalComponents: false,
  },
  {
    name: "mcp",
    label: "MCP",
    description: "MCP tools + MCP Apps renderer starter",
    category: "template",
    path: "templates/mcp",
    hasLocalComponents: false,
  },
  {
    name: "eve",
    label: "Eve",
    description: "Eve agent + Next.js starter",
    category: "template",
    path: "templates/eve",
    hasLocalComponents: false,
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
    name: "with-ai-sdk-v7",
    label: "AI SDK v7",
    description: "Vercel AI SDK v7",
    category: "example",
    path: "examples/with-ai-sdk-v7",
    hasLocalComponents: false,
  },
  {
    name: "with-eve",
    label: "Eve",
    description: "Eve agent integration",
    category: "example",
    path: "examples/with-eve",
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
    description: "Chain-of-thought, tool calls, and source citations",
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
    name: "with-elevenlabs-conversational",
    label: "ElevenLabs Conversational",
    description: "Realtime voice with ElevenLabs",
    category: "example",
    path: "examples/with-elevenlabs-conversational",
    hasLocalComponents: true,
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
    name: "with-livekit",
    label: "LiveKit Voice",
    description: "Realtime voice with LiveKit",
    category: "example",
    path: "examples/with-livekit",
    hasLocalComponents: true,
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
  {
    name: "with-resumable-stream",
    label: "Resumable Stream",
    description: "Resumable LLM stream that survives reload mid-response",
    category: "example",
    path: "examples/with-resumable-stream",
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

  if (template !== undefined) {
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

  if (example !== undefined) {
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

export function resolveCreateProjectDirectory(params: {
  projectDirectory?: string;
  stdinIsTTY?: boolean;
}): string | undefined {
  const { projectDirectory, stdinIsTTY = process.stdin.isTTY } = params;

  if (projectDirectory) return projectDirectory;
  if (!stdinIsTTY) return "my-aui-app";
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

export interface ScaffoldSelectorOptions {
  template?: string;
  example?: string;
  preset?: string;
  native?: boolean;
  ink?: boolean;
}

export interface ResolvedScaffoldSelector {
  template?: string;
  example?: string;
  preset?: string;
}

const scaffoldSelectorHelp =
  "Choose one scaffold selector: --template <name>, --example <name>, --native, or --ink. --preset <name-or-url> can be used with --template or by itself.";

function getPresetConflict(opts: ScaffoldSelectorOptions): string | undefined {
  if (opts.example !== undefined) return "--example";
  if (opts.native) return "--native";
  if (opts.ink) return "--ink";
  return undefined;
}

export function resolveScaffoldSelector(
  opts: ScaffoldSelectorOptions,
): ResolvedScaffoldSelector {
  const hasPreset = opts.preset !== undefined;
  const presetConflict = getPresetConflict(opts);
  const selectors = [
    opts.template !== undefined ? "--template" : undefined,
    opts.example !== undefined ? "--example" : undefined,
    opts.native ? "--native" : undefined,
    opts.ink ? "--ink" : undefined,
  ].filter((selector): selector is string => selector !== undefined);

  if (selectors.length > 1) {
    throw new Error(
      `Only one scaffold selector can be provided (${selectors.join(", ")}). ${scaffoldSelectorHelp}`,
    );
  }

  if (hasPreset && presetConflict) {
    throw new Error(
      `Cannot use --preset with ${presetConflict}. ${scaffoldSelectorHelp}`,
    );
  }

  if (opts.native) return { example: "with-expo" };
  if (opts.ink) return { example: "with-react-ink" };

  if (opts.preset !== undefined && opts.template === undefined) {
    return { template: "default", preset: opts.preset };
  }

  return {
    ...(opts.template !== undefined && { template: opts.template }),
    ...(opts.example !== undefined && { example: opts.example }),
    ...(hasPreset && { preset: opts.preset }),
  };
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
  .option("--skills", "add assistant-ui agent skills for AI coding assistants")
  .option("--no-skills", "skip adding assistant-ui agent skills")
  .addOption(
    new Option(
      "--debug-source-root <path>",
      "copy templates/examples from a local assistant-ui repo root",
    ).hideHelp(),
  )
  .action(async (projectDirectory, opts) => {
    let scaffoldSelector: ResolvedScaffoldSelector;
    try {
      scaffoldSelector = resolveScaffoldSelector(opts);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(message);
      process.exit(1);
    }

    const localSourceRoot = opts.debugSourceRoot
      ? path.resolve(opts.debugSourceRoot)
      : undefined;

    // Start release ref resolution early (runs during user prompts)
    const refPromise = localSourceRoot
      ? Promise.resolve(undefined)
      : resolveLatestReleaseRef();

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
    const project = await resolveProject(scaffoldSelector);
    if (!project) {
      p.cancel("Project creation cancelled.");
      process.exit(0);
    }

    const stdinIsTTY = process.stdin.isTTY;
    let installSkills = resolveSkillsInstall({
      skills: opts.skills,
      stdinIsTTY,
    });
    if (installSkills === undefined) {
      const result = await p.confirm({
        message: "Add assistant-ui agent skills for AI coding assistants?",
        initialValue: true,
      });

      if (p.isCancel(result)) {
        p.cancel("Project creation cancelled.");
        process.exit(0);
      }

      installSkills = result;
    }

    logger.info(`Creating project from ${project.category}: ${project.label}`);
    logger.break();

    const pm = await resolvePackageManagerForCwd(
      path.dirname(absoluteProjectDir),
      resolvePackageManager(opts),
    );

    // Clean up partial project directory on unexpected exit (e.g. Ctrl+C)
    const cleanupOnExit = () => {
      fs.rmSync(absoluteProjectDir, { recursive: true, force: true });
    };
    process.once("exit", cleanupOnExit);

    try {
      // 3. Resolve latest release ref (started before prompts)
      if (!localSourceRoot) {
        logger.step("Resolving latest release...");
      }
      const ref = await refPromise;
      if (!localSourceRoot && !ref) {
        logger.warn("Could not resolve latest release, downloading from HEAD");
      }

      // 4. Scaffold project
      logger.step(
        localSourceRoot
          ? `Copying project from local source: ${localSourceRoot}`
          : "Downloading project...",
      );
      let transformResult: TransformResult;
      try {
        const source = localSourceRoot
          ? { kind: "local" as const, rootDir: localSourceRoot }
          : {
              kind: "github" as const,
              ref,
            };
        await scaffoldProject(project.path, absoluteProjectDir, source);

        // If the template didn't exist at the release tag, retry from HEAD
        if (
          !localSourceRoot &&
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
        transformResult = await transformProject(absoluteProjectDir, {
          hasLocalComponents: project.hasLocalComponents,
          skipInstall: opts.skipInstall,
          packageManager: pm,
        });

        if (installSkills) {
          logger.step("Adding assistant-ui agent skills...");
          const [skillsCmd, skillsArgs] = buildSkillsAddCommand(pm, {
            stdinIsTTY,
          });
          try {
            await runSpawn(skillsCmd, skillsArgs, absoluteProjectDir);
          } catch {
            logger.warn(
              `Could not add assistant-ui agent skills. You can add them later with:\n  ${skillsCmd} ${skillsArgs.join(" ")}`,
            );
          }
        }
      } catch (err) {
        // Clean up partially created project directory
        fs.rmSync(absoluteProjectDir, { recursive: true, force: true });
        throw err;
      }

      if (transformResult.registryInstallFailure) {
        process.removeListener("exit", cleanupOnExit);
        logger.break();
        logger.error("Project created with missing components.");
        logger.info("Retry the component install with:");
        logger.info(`  cd ${resolvedProjectDirectory}`);
        logger.info(`  ${transformResult.registryInstallFailure.retryCommand}`);
        process.exit(1);
      }

      // 6. Apply preset if provided
      if (scaffoldSelector.preset) {
        const presetUrl = resolvePresetUrl(scaffoldSelector.preset);
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
