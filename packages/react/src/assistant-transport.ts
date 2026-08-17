"use client";

import type { UserCommands as CoreUserCommands } from "@assistant-ui/core";
import type { UserExternalState as CoreUserExternalState } from "@assistant-ui/core";
import {
  useAssistantTransportSendCommand as useCoreAssistantTransportSendCommand,
  useAssistantTransportState as useCoreAssistantTransportState,
} from "@assistant-ui/core/react";
import type {
  AssistantTransportCommand as CoreAssistantTransportCommand,
  AssistantTransportConnectionMetadata as CoreAssistantTransportConnectionMetadata,
  AssistantTransportProtocol,
  SendCommandsRequestBody,
} from "@assistant-ui/core/react";
import type { UserCommands, UserExternalState } from "./augmentations";

export type { AssistantTransportProtocol, SendCommandsRequestBody };

export type AssistantTransportCommand =
  | Exclude<CoreAssistantTransportCommand, CoreUserCommands>
  | UserCommands;

export type AssistantTransportConnectionMetadata = Omit<
  CoreAssistantTransportConnectionMetadata,
  "pendingCommands"
> & {
  pendingCommands: AssistantTransportCommand[];
};

export const useAssistantTransportSendCommand = () => {
  const send = useCoreAssistantTransportSendCommand();
  return (command: AssistantTransportCommand) => {
    send(command as CoreAssistantTransportCommand);
  };
};

export function useAssistantTransportState(): UserExternalState;
export function useAssistantTransportState<T>(
  selector: (state: UserExternalState) => T,
): T;
export function useAssistantTransportState<T>(
  selector: (state: UserExternalState) => T = (state) => state as T,
): T | UserExternalState {
  return useCoreAssistantTransportState(
    selector as (state: CoreUserExternalState) => T,
  );
}
