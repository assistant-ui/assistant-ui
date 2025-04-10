/** Core Message Types (without UI content parts) */

import {
  FileContentPart,
  ImageContentPart,
  TextContentPart,
  Unstable_AudioContentPart,
} from "@assistant-ui/react";

export type CoreToolCallContentPart<
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

export type CoreUserContentPart =
  | TextContentPart
  | ImageContentPart
  | FileContentPart
  | Unstable_AudioContentPart;
export type CoreAssistantContentPart =
  | TextContentPart
  | CoreToolCallContentPart;

export type CoreSystemMessage = {
  role: "system";
  content: readonly [TextContentPart];
};

export type CoreUserMessage = {
  role: "user";
  content: readonly CoreUserContentPart[];
};

export type CoreAssistantMessage = {
  role: "assistant";
  content: readonly CoreAssistantContentPart[];
};

export type CoreMessage =
  | CoreSystemMessage
  | CoreUserMessage
  | CoreAssistantMessage;
