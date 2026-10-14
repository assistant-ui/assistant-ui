import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { convertSurfaceToUISpec } from "./convert";
import { surfaceToOperations } from "./snapshot";
import type { A2uiSurfaceSnapshotOperation, A2uiSurfaceState } from "./types";

export type A2uiPresentToolCall = {
  toolCallId: string;
  toolName: "present";
  args: ReadonlyJSONObject;
  argsText: string;
  result: Record<string, never>;
  artifact: { a2ui: readonly A2uiSurfaceSnapshotOperation[] };
};

export function surfaceToPresentToolCall(
  surfaceId: string,
  surface: A2uiSurfaceState,
): {
  toolCall: A2uiPresentToolCall | undefined;
  warnings: ReturnType<typeof convertSurfaceToUISpec>["warnings"];
} {
  const { spec, warnings } = convertSurfaceToUISpec(surface);
  if (!spec) return { toolCall: undefined, warnings };

  return {
    toolCall: {
      toolCallId: `a2ui:${surfaceId}`,
      toolName: "present",
      args: spec as unknown as ReadonlyJSONObject,
      argsText: JSON.stringify(spec),
      result: {},
      artifact: { a2ui: surfaceToOperations(surface, surfaceId) },
    },
    warnings,
  };
}
