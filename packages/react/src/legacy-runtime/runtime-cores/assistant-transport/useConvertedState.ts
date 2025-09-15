import { useMemo } from "react";
import type {
  AssistantTransportCommand,
  AssistantTransportState,
  AssistantTransportStateConverter,
} from "./types";

export function useConvertedState<T>(
  converter: AssistantTransportStateConverter<T>,
  agentState: T,
  pendingCommands: AssistantTransportCommand[],
  isSending: boolean,
): AssistantTransportState {
  return useMemo(
    () => converter(agentState, { pendingCommands, isSending }),
    [converter, agentState, pendingCommands, isSending],
  );
}
