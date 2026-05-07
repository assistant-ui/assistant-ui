import type { HarnessRequestContext } from "@mastra/core/harness";
import type { Workspace } from "@mastra/core/workspace";
import type { HarnessState } from "./schema.js";
import { sessionWorkspaceRegistry } from "./workspace-provider.js";

export function getDynamicWorkspace({
  requestContext,
}: {
  requestContext: { get(key: string): unknown };
}): Workspace | null {
  const ctx = requestContext?.get?.("harness") as HarnessRequestContext<HarnessState> | undefined;
  const state = ctx?.getState?.() ?? ctx?.state;
  if (state?.workspacePolicy === "none") return null;

  const trace = requestContext?.get?.("augmentTrace") as { sessionId?: string } | undefined;
  const sessionId = trace?.sessionId;
  if (!sessionId) return null;

  return sessionWorkspaceRegistry.get(sessionId)?.workspace ?? null;
}
