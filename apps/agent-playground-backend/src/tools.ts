import type { HarnessRequestContext } from "@mastra/core/harness";
import type { HarnessState } from "./schema.js";
import { MIXER_TOOLS } from "./tools/mixer-tools.js";
import { PREVIEW_TOOLS } from "./tools/preview-tools.js";
import { requestWorkspaceTool } from "./tools/request-workspace.js";
import { WORKSPACE_ENV_TOOLS } from "./tools/workspace-env-tools.js";

type WorkspacePolicy = "auto" | "none" | "required";

export function createDynamicTools(
  extraTools?: Record<string, any>,
  disabledTools?: string[],
  workspacePolicy: WorkspacePolicy = "auto",
) {
  return function getDynamicTools({
    requestContext,
  }: {
    requestContext: { get(key: string): unknown };
  }) {
    const ctx = requestContext?.get?.("harness") as
      | HarnessRequestContext<HarnessState>
      | undefined;
    const state = ctx?.getState?.();
    const policy = state?.workspacePolicy ?? workspacePolicy;
    const tools: Record<string, any> = {};

    Object.assign(tools, MIXER_TOOLS);
    Object.assign(tools, PREVIEW_TOOLS);
    Object.assign(tools, WORKSPACE_ENV_TOOLS);

    if (policy === "auto" && !state?.workspaceProvisioned) {
      tools.request_workspace = requestWorkspaceTool;
    }

    if (extraTools) Object.assign(tools, extraTools);
    if (disabledTools?.length) {
      for (const name of disabledTools) delete tools[name];
    }

    const rules = state?.permissionRules;
    if (rules?.tools) {
      for (const [name, policy] of Object.entries(rules.tools)) {
        if (policy === "deny") delete tools[name];
      }
    }

    return tools;
  };
}
