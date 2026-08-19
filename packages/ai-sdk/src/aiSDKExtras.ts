import { createRuntimeExtras } from "@assistant-ui/core/react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";

export type AISDKRuntimeExtras = {
  chat: UseChatHelpers<UIMessage>;
  error: Error | undefined;
};

export const aiSDKExtras =
  createRuntimeExtras<AISDKRuntimeExtras>("useAISDKRuntime");
