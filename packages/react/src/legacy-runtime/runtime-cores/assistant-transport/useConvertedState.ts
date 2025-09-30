import { useMemo } from "react";
import type {
  AssistantTransportCommand,
  AssistantTransportState,
  AssistantTransportStateConverter,
} from "./types";
import type { ToolExecutionStatus } from "./useToolInvocations";

export function useConvertedState<T>(
  converter: AssistantTransportStateConverter<T>,
  agentState: T,
  pendingCommands: AssistantTransportCommand[],
  isSending: boolean,
  toolStatuses: Record<string, ToolExecutionStatus>,
): AssistantTransportState {
  return useMemo(
    () => converter(agentState, { pendingCommands, isSending, toolStatuses }),
    [converter, agentState, pendingCommands, isSending, toolStatuses],
  );
}
