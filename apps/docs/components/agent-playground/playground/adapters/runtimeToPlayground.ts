import { getProductConfig } from "@/components/agent-playground/contexts/ProductContext";
import type { AssistantThreadMessageLike } from "@/components/agent-playground/runtime/assistantTypes";
import type { useAugmentAssistantRuntime } from "@/components/agent-playground/runtime/useAugmentAssistantRuntime";
import type { PlaygroundHeaderState } from "../types";

export type PlaygroundRuntimeState = ReturnType<
  typeof useAugmentAssistantRuntime
>;

export function createPlaygroundHeaderState(
  runtimeState: PlaygroundRuntimeState,
): PlaygroundHeaderState {
  const product = getProductConfig();

  return {
    title: product.branding.name,
    subtitle: product.branding.tagline,
    sessionId: runtimeState.session?.id ?? null,
    hasWorkspace:
      Boolean(runtimeState.session?.workspace) ||
      hasProvisionedWorkspace(runtimeState.messages),
    connectionState: runtimeState.connectionState,
    isRunning: runtimeState.isRunning,
  };
}

// Workspaces provisioned mid-session via the request_workspace tool aren't
// reflected on session.workspace, so fall back to scanning tool results.
function hasProvisionedWorkspace(
  messages: AssistantThreadMessageLike[],
): boolean {
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.content) {
      if (
        part.type === "tool-call" &&
        part.toolName === "request_workspace" &&
        part.status?.type === "complete" &&
        !part.isError &&
        part.result !== undefined
      ) {
        return true;
      }
    }
  }
  return false;
}
