import { mkdirSync } from "node:fs";
import { Agent } from "@mastra/core/agent";
import { Harness } from "@mastra/core/harness";
import type { HarnessMode } from "@mastra/core/harness";
import { MockMemory } from "@mastra/core/memory";
import { LibSQLStore } from "@mastra/libsql";
import { getDynamicInstructions } from "./instructions.js";
import { getDynamicModel, resolveModel } from "./model.js";
import {
  createHarnessInitialPermissionRules,
  getToolCategory,
} from "./permissions.js";
import { stateSchema, type HarnessState } from "./schema.js";
import {
  executeSubagent,
  exploreSubagent,
  planSubagent,
} from "./subagents/index.js";
import { createDynamicTools } from "./tools.js";
import { createTracedSubagentTool } from "./tools/traced-subagent.js";
import { getDynamicWorkspace } from "./workspace.js";
import { provisionWorkspace } from "./workspace-provider.js";

export interface CreateHarnessOptions {
  sessionId: string;
  cwd?: string;
  projectName?: string;
  initialYolo?: boolean;
  workspacePolicy?: "auto" | "none" | "required";
  defaultModelId?: string;
  cleanupWorkspaceOnDestroy?: boolean;
}

export async function createHarness(options: CreateHarnessOptions) {
  const cwd = options.cwd ?? process.cwd();
  const projectName =
    options.projectName ?? cwd.split(/[\\/]/).pop() ?? "assistant-ui";
  const workspacePolicy = options.workspacePolicy ?? "auto";
  const defaultModelId =
    options.defaultModelId ?? process.env.MODEL_ID ?? "openai/gpt-5.4";

  const provisioned =
    workspacePolicy === "required"
      ? await provisionWorkspace({
          sessionId: options.sessionId,
          workspaceProvider: "sandbox",
          sandboxProvider: "blaxel",
          cleanupOnDestroy: options.cleanupWorkspaceOnDestroy ?? true,
        })
      : undefined;

  const storageUrl =
    process.env.AGENT_STORAGE_URL ?? "file:.agent-playground/data.db";
  if (storageUrl === "file:.agent-playground/data.db") {
    mkdirSync(".agent-playground", { recursive: true });
  }

  const storage = new LibSQLStore({
    id: `assistant-ui-agent-playground-${options.sessionId}`,
    url: storageUrl,
  });

  const subagentDefs = [exploreSubagent, planSubagent, executeSubagent];
  const tracedSubagentTool = createTracedSubagentTool({
    subagents: subagentDefs,
    resolveModel: (modelId) => resolveModel(modelId) as any,
    fallbackModelId: defaultModelId,
  });

  const codeAgent = new Agent({
    id: "assistant-ui-agent",
    name: "assistant-ui Agent",
    instructions: getDynamicInstructions,
    model: getDynamicModel,
    tools: createDynamicTools(undefined, undefined, workspacePolicy),
  });

  const modes: HarnessMode<HarnessState>[] = [
    {
      id: "build",
      name: "Build",
      default: true,
      defaultModelId,
      agent: codeAgent,
    },
    { id: "plan", name: "Plan", defaultModelId, agent: codeAgent },
    { id: "fast", name: "Fast", defaultModelId, agent: codeAgent },
  ];

  const memory = new MockMemory({
    storage: storage as any,
    enableMessageHistory: true,
    options: { lastMessages: 50 },
  });

  const harness = new Harness<HarnessState>({
    id: `assistant-ui-agent-${options.sessionId}`,
    storage,
    memory,
    stateSchema,
    subagents: subagentDefs,
    tools: { subagent: tracedSubagentTool },
    disableBuiltinTools: ["subagent"],
    resolveModel: (modelId) => resolveModel(modelId) as any,
    toolCategoryResolver: getToolCategory,
    initialState: {
      sessionId: options.sessionId,
      projectPath: cwd,
      projectName,
      currentModelId: defaultModelId,
      yolo: options.initialYolo ?? true,
      workspacePolicy,
      workspaceProvisioned: workspacePolicy === "required",
      workspaceProvider: "sandbox",
      workspacePath: provisioned?.workspacePath,
      workspaceProvisionMode: "empty",
      sandboxProvider: "blaxel",
      thinkingLevel: "medium",
      permissionRules: createHarnessInitialPermissionRules(),
      tasks: [],
      sandboxAllowedPaths: [],
      activePlan: null,
    },
    workspace: getDynamicWorkspace as any,
    modes,
  });

  return { harness, storage };
}
