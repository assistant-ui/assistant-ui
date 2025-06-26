/** Core Message Types (without UI message parts) */

import {
  FileMessagePart,
  ImageMessagePart,
  TextMessagePart,
  Unstable_AudioMessagePart,
} from "@assistant-ui/react";

export type CoreToolCallMessagePart<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: TArgs;
  readonly result?: TResult | undefined;
  readonly isError?: boolean | undefined;
};

export type CoreUserMessagePart =
  | TextMessagePart
  | ImageMessagePart
  | FileMessagePart
  | Unstable_AudioMessagePart;
export type CoreAssistantMessagePart =
  | TextMessagePart
  | CoreToolCallMessagePart;

export type CoreSystemMessage = {
  role: "system";
  content: readonly [TextMessagePart];
};

export type CoreUserMessage = {
  role: "user";
  content: readonly CoreUserMessagePart[];
};

export type CoreAssistantMessage = {
  role: "assistant";
  content: readonly CoreAssistantMessagePart[];
};

export type CoreMessage =
  | CoreSystemMessage
  | CoreUserMessage
  | CoreAssistantMessage;
