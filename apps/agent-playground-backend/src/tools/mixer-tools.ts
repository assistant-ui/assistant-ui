/**
 * Mixer catalog tools — always available, no workspace required.
 *
 * These wrap the mixer catalog library as Mastra tools so the agent can
 * discover, inspect, and preview assistant-ui recipes without needing
 * a provisioned workspace.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { tmpdir } from "node:os";
import { listRecipes, getRecipe } from "../mixer/catalog/index.js";
import type { PreviewMetadata } from "../mixer/catalog/types.js";
import type { ExamplePreviewStatus } from "../preview/types.js";
import {
  DEFAULT_SANDBOX_WORKSPACE_ROOT,
  getReservedWorkspaceEntries,
} from "../sandbox-templates/index.js";
import { scaffold } from "../mixer/scaffold.js";
import { sessionWorkspaceRegistry } from "../workspace-provider.js";
import type { ProvisionedWorkspace } from "../workspace-provider.js";

const SANDBOX_WORKSPACE_ROOT = DEFAULT_SANDBOX_WORKSPACE_ROOT;

// Resolve product once at module load so tool descriptions can be plain strings.
// Mastra forwards `description` verbatim to the AI SDK; function values get dropped
// during JSON.stringify, so the LLM ends up with no description for these tools.
const PRODUCT_NAME = "assistant-ui";

function getSessionWorkspace(context: any) {
  const trace = context?.requestContext?.get?.("augmentTrace") as
    | { sessionId?: string }
    | undefined;
  const sessionId = trace?.sessionId;
  if (!sessionId) return null;
  return sessionWorkspaceRegistry.get(sessionId) ?? null;
}

function getWorkspaceRoot(provisioned: {
  workspacePath?: string;
  providerKind?: "local" | "sandbox";
}) {
  return (
    provisioned.workspacePath ??
    (provisioned.providerKind === "sandbox"
      ? SANDBOX_WORKSPACE_ROOT
      : undefined)
  );
}

async function listRelativeFiles(
  rootDir: string,
  currentDir = rootDir,
): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRelativeFiles(rootDir, fullPath)));
      continue;
    }
    files.push(relative(rootDir, fullPath).split(sep).join("/"));
  }
  return files;
}

async function validateWorkspaceRootEmpty(
  workspaceFs: any,
  workspaceRoot: string,
): Promise<string[]> {
  const reservedEntries = new Set(getReservedWorkspaceEntries());
  const entries = await workspaceFs.readdir(workspaceRoot);
  const blocking = entries
    .map((entry: { name: string }) => entry.name)
    .filter((name: string) => !reservedEntries.has(name));

  if (blocking.length > 0) {
    throw new Error(
      `Workspace root is not empty: ${blocking.join(", ")}. ` +
        "Materialization requires an empty workspace root except for reserved support directories.",
    );
  }

  return blocking;
}

async function ensureWorkspaceDirs(
  workspaceFs: any,
  relativePath: string,
  workspaceRoot: string,
): Promise<void> {
  const normalized = relativePath.split("/").slice(0, -1);
  if (normalized.length === 0) return;

  let currentPath = workspaceRoot;
  for (const segment of normalized) {
    currentPath = currentPath.endsWith("/")
      ? `${currentPath}${segment}`
      : `${currentPath}/${segment}`;
    await workspaceFs.mkdir(currentPath, { recursive: true });
  }
}

async function copyScaffoldIntoWorkspace(options: {
  tempDir: string;
  workspaceFs: any;
  workspaceRoot: string;
}): Promise<number> {
  const files = await listRelativeFiles(options.tempDir);

  for (const relativePath of files) {
    await ensureWorkspaceDirs(
      options.workspaceFs,
      relativePath,
      options.workspaceRoot,
    );
    const content = await readFile(join(options.tempDir, relativePath));
    const targetPath = options.workspaceRoot.endsWith("/")
      ? `${options.workspaceRoot}${relativePath}`
      : `${options.workspaceRoot}/${relativePath}`;
    await options.workspaceFs.writeFile(targetPath, content, {
      recursive: true,
    });
  }

  return files.length;
}

type DependencySeedStatus = "not_applicable" | "seeded" | "skipped" | "failed";

interface DependencySeedResult {
  attempted: boolean;
  status: DependencySeedStatus;
  message: string;
  durationMs?: number;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function seedPreinstalledNodeModules(options: {
  provisioned: ProvisionedWorkspace;
  workspaceRoot: string;
  scaffoldedFiles: string[];
}): Promise<DependencySeedResult> {
  if (
    options.provisioned.providerKind !== "sandbox" ||
    !options.provisioned.sandboxInstance
  ) {
    return {
      attempted: false,
      status: "not_applicable",
      message:
        "Preinstalled dependency seeding is only available for sandbox workspaces.",
    };
  }

  if (!options.scaffoldedFiles.includes("package.json")) {
    return {
      attempted: false,
      status: "not_applicable",
      message: "No package.json was scaffolded.",
    };
  }

  const workspaceRoot = options.workspaceRoot.replace(/\/+$/, "") || "/";
  const target = `${workspaceRoot}/node_modules`;
  const start = Date.now();
  const command = [
    `PREINSTALLED=/opt/augment/preinstalled/node_modules`,
    `TARGET=${shellQuote(target)}`,
    `if [ ! -d "$PREINSTALLED" ]; then echo "missing preinstalled node_modules"; exit 2; fi`,
    `if [ -e "$TARGET" ]; then echo "node_modules already exists"; exit 3; fi`,
    `cp -al "$PREINSTALLED" "$TARGET" 2>/tmp/augment-node-modules-seed.err || cp -a "$PREINSTALLED" "$TARGET"`,
    `echo "seeded node_modules from $PREINSTALLED"`,
  ].join("; ");

  try {
    const result = await options.provisioned.sandboxInstance.process.exec({
      command,
      waitForCompletion: true,
      workingDir: "/",
    });
    const exitCode = result?.exitCode ?? 0;
    const output = String(result?.stdout ?? result?.stderr ?? "").trim();
    const durationMs = Date.now() - start;

    if (exitCode === 0) {
      return {
        attempted: true,
        status: "seeded",
        message:
          output ||
          "Seeded node_modules from the preinstalled sandbox image directory.",
        durationMs,
      };
    }

    if (exitCode === 2 || exitCode === 3) {
      return {
        attempted: true,
        status: "skipped",
        message:
          output || `Dependency seed skipped with exit code ${exitCode}.`,
        durationMs,
      };
    }

    return {
      attempted: true,
      status: "failed",
      message: output || `Dependency seed failed with exit code ${exitCode}.`,
      durationMs,
    };
  } catch (error) {
    return {
      attempted: true,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - start,
    };
  }
}

function toWorkspacePath(workspaceRoot: string, relativePath: string): string {
  return workspaceRoot.endsWith("/")
    ? `${workspaceRoot}${relativePath}`
    : `${workspaceRoot}/${relativePath}`;
}

function summarizeScaffoldedFiles(files: string[]) {
  const topLevelEntries = [
    ...new Set(files.map((file) => file.split("/")[0]).filter(Boolean)),
  ].sort();
  const markdownFiles = files
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .map((file) => file.replaceAll("\\", "/"));
  const preferredGuide =
    markdownFiles.find((file) => file.toLowerCase().endsWith("/readme.md")) ??
    markdownFiles.find((file) => file.toLowerCase() === "readme.md") ??
    markdownFiles[0];

  return {
    topLevelEntries,
    markdownFiles,
    preferredGuide,
    scaffoldedFilesPreview: files.slice(0, 20),
  };
}

function normalizeExamplePreviewStatus(
  status: PreviewMetadata["status"] | ExamplePreviewStatus,
): ExamplePreviewStatus {
  switch (status) {
    case "live":
      return "ready";
    case "stale":
      return "missing";
    case "ready":
    case "missing":
      return status;
  }
}

export const listExamples = createTool({
  id: "list_examples",
  description:
    `Returns a compact list of available ${PRODUCT_NAME} examples and templates. ` +
    `Call this first when the user requests an app or capability that might map to an existing ${PRODUCT_NAME} example. ` +
    "Use the capability filter to narrow results: basic-chat, artifact-preview, form-copilot, " +
    "persistent-threads, custom-backend, reasoning-display, mcp-tools, cloud-auth, external-store. " +
    "Returns id, label, capabilities[], and preview.status only. " +
    "Do not guess recipe IDs or source paths. " +
    "After selecting a recipe, decide whether that example already satisfies the request as-is or is only a starting point. " +
    "Call get_example for full details if you need to scaffold, verify, inspect env requirements, or edit from that recipe.",
  inputSchema: z.object({
    capability: z
      .string()
      .optional()
      .describe('Filter by user-facing capability, e.g. "artifact-preview"'),
    tag: z
      .string()
      .optional()
      .describe('Filter by technical tag, e.g. "next", "react-router"'),
  }),
  execute: async (input) => {
    return listRecipes({ capability: input.capability, tag: input.tag });
  },
});

export const getExample = createTool({
  id: "get_example",
  description:
    `Returns full details for one ${PRODUCT_NAME} recipe. ` +
    "Call this after selecting a recipe from list_examples. " +
    "This is required before editable example flows because it provides env vars, key files to edit, agent guidance, scaffold source path, and verification profile.",
  inputSchema: z.object({
    id: z.string().describe("Recipe ID from list_examples"),
  }),
  execute: async (input) => {
    return getRecipe(input.id);
  },
});

export const scaffoldExampleTemplate = createTool({
  id: "scaffold_example_template",
  description:
    `Scaffold the selected ${PRODUCT_NAME} example or template into the current workspace. ` +
    "Use this only after request_workspace and after get_example confirms which recipe you want. " +
    "This copies the example files into the workspace root, returns a high-level summary of what was scaffolded, and points to the key files and markdown guide from the selected recipe. " +
    "This tool does not run verify for you.",
  inputSchema: z.object({
    recipeId: z.string().describe("Recipe ID chosen from get_example"),
  }),
  execute: async (input, context) => {
    const provisioned = getSessionWorkspace(context);
    if (!provisioned) {
      return {
        ok: false,
        status: "failed" as const,
        error:
          "No workspace is provisioned for this session. Call request_workspace first.",
      };
    }

    const workspaceRoot = getWorkspaceRoot(provisioned);
    if (!workspaceRoot) {
      return {
        ok: false,
        status: "failed" as const,
        error: "Cannot determine the current workspace root for this session.",
      };
    }

    const workspaceFs = provisioned.workspace?.filesystem;
    if (!workspaceFs) {
      return {
        ok: false,
        status: "failed" as const,
        error: "Current workspace has no filesystem provider.",
      };
    }

    try {
      const recipe = getRecipe(input.recipeId);
      await validateWorkspaceRootEmpty(workspaceFs, workspaceRoot);

      const tempDir = await mkdtemp(join(tmpdir(), "augment-materialize-"));
      try {
        const scaffoldResult = await scaffold({
          recipeId: recipe.id,
          outputDir: tempDir,
        });
        const scaffoldedFiles = await listRelativeFiles(tempDir);
        const filesWritten = await copyScaffoldIntoWorkspace({
          tempDir,
          workspaceFs,
          workspaceRoot,
        });
        const dependencySeed = await seedPreinstalledNodeModules({
          provisioned,
          workspaceRoot,
          scaffoldedFiles,
        });
        const summary = summarizeScaffoldedFiles(scaffoldedFiles);
        const warnings = [...scaffoldResult.warnings];
        if (dependencySeed.status === "failed") {
          warnings.push(
            `Preinstalled node_modules seed failed: ${dependencySeed.message}. Run npm install before starting the app.`,
          );
        }

        return {
          ok: true,
          status: "scaffolded" as const,
          recipeId: recipe.id,
          recipeLabel: recipe.label,
          recipeKind: recipe.kind,
          workspaceRoot,
          filesWritten,
          sourcePath: recipe.sourcePath,
          verifyProfile: recipe.verifyProfile,
          topLevelEntries: summary.topLevelEntries,
          scaffoldedFilesPreview: summary.scaffoldedFilesPreview,
          markdownFiles: summary.markdownFiles.map((file) =>
            toWorkspacePath(workspaceRoot, file),
          ),
          guideFile: summary.preferredGuide
            ? toWorkspacePath(workspaceRoot, summary.preferredGuide)
            : undefined,
          keyFiles: recipe.agent.keyFiles,
          envVarsWritten: scaffoldResult.envVarsWritten,
          env: recipe.env,
          dependencySeed,
          nextSteps: scaffoldResult.nextSteps,
          warnings,
        };
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      return {
        ok: false,
        status: "failed" as const,
        recipeId: input.recipeId,
        workspaceRoot,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const showUiPreview = createTool({
  id: "show_ui_preview",
  description:
    `Signals the frontend to display a hosted preview of a ${PRODUCT_NAME} example. ` +
    "Call this when the selected example already satisfies the request without code changes. " +
    "This does not create a workspace or make any changes. " +
    "Do not use this as the final success path when the example is only a starting point; that path should use the editable workspace flow and workspace preview instead. " +
    "This tool accepts either catalog preview states (live, stale, missing) or normalized runtime states (ready, missing). " +
    "Catalog states are normalized before being returned to the frontend. " +
    'If status is "missing", the frontend renders "preview unavailable" and offers the editable sandbox path. ' +
    'If status is "ready", the frontend renders the previewUrl in a canvas/preview tab.',
  inputSchema: z.object({
    recipeId: z.string(),
    status: z
      .enum(["live", "stale", "ready", "missing"])
      .describe(
        "Preview availability from the catalog preview registry or normalized runtime state",
      ),
    previewUrl: z
      .string()
      .optional()
      .describe(
        'Hosted preview URL — required when status is "ready", omit when "missing"',
      ),
    screenshotUrl: z.string().optional(),
    builtFromRef: z.string().optional(),
    reason: z
      .string()
      .describe(
        "Short explanation of why this preview matches the user request",
      ),
  }),
  execute: async (input) => {
    const status = normalizeExamplePreviewStatus(input.status);
    return {
      type: "show_ui_preview" as const,
      recipeId: input.recipeId,
      status,
      previewUrl: status === "ready" ? input.previewUrl : undefined,
      screenshotUrl: input.screenshotUrl,
      builtFromRef: input.builtFromRef,
      reason: input.reason,
    };
  },
});

export const listAssistantUiExamples = listExamples;
export const getAssistantUiExample = getExample;

export const MIXER_TOOLS = {
  list_examples: listExamples,
  get_example: getExample,
  scaffold_example_template: scaffoldExampleTemplate,
  show_ui_preview: showUiPreview,
};
