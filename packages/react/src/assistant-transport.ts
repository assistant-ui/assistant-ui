"use client";

import type {
  AssistantRuntime,
  UserCommands as CoreUserCommands,
  UserExternalState as CoreUserExternalState,
} from "@assistant-ui/core";
import {
  useAssistantTransportRuntime as useCoreAssistantTransportRuntime,
  useAssistantTransportSendCommand as useCoreAssistantTransportSendCommand,
  useAssistantTransportState as useCoreAssistantTransportState,
} from "@assistant-ui/core/react";
import type {
  AssistantTransportCommand as CoreAssistantTransportCommand,
  AssistantTransportConnectionMetadata as CoreAssistantTransportConnectionMetadata,
  AssistantTransportOptions as CoreAssistantTransportOptions,
  AssistantTransportProtocol,
  SendCommandsRequestBody as CoreSendCommandsRequestBody,
} from "@assistant-ui/core/react";
import type { UserCommands, UserExternalState } from "./augmentations";

export type { AssistantTransportProtocol };

export type SendCommandsRequestBody = Omit<
  CoreSendCommandsRequestBody,
  "commands"
> & {
  commands: AssistantTransportCommand[];
};

export type AssistantTransportCommand =
  | Exclude<CoreAssistantTransportCommand, CoreUserCommands>
  | UserCommands;

export type AssistantTransportConnectionMetadata = Omit<
  CoreAssistantTransportConnectionMetadata,
  "pendingCommands"
> & {
  pendingCommands: AssistantTransportCommand[];
};

export type AssistantTransportStateConverter<T> = (
  state: T,
  connectionMetadata: AssistantTransportConnectionMetadata,
) => ReturnType<CoreAssistantTransportOptions<T>["converter"]>;

export type AssistantTransportOptions<T> = Omit<
  CoreAssistantTransportOptions<T>,
  "converter" | "prepareSendCommandsRequest" | "onError" | "onCancel"
> & {
  converter: AssistantTransportStateConverter<T>;
  prepareSendCommandsRequest?: (
    body: SendCommandsRequestBody,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  onError?: (
    error: Error,
    params: {
      commands: AssistantTransportCommand[];
      updateState: (updater: (state: T) => T) => void;
    },
  ) => void | Promise<void>;
  onCancel?: (params: {
    commands: AssistantTransportCommand[];
    updateState: (updater: (state: T) => T) => void;
    error?: Error;
  }) => void;
};

export const useAssistantTransportRuntime = <T>(
  options: AssistantTransportOptions<T>,
): AssistantRuntime => {
  return useCoreAssistantTransportRuntime(
    options as CoreAssistantTransportOptions<T>,
  );
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
