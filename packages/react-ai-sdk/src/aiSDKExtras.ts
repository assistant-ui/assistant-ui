import { createRuntimeExtras } from "@assistant-ui/core/internal";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatStatus, UIMessage } from "ai";

export type AISDKRuntimeExtras = {
  chat: UseChatHelpers<UIMessage>;
  status: ChatStatus;
  error: Error | undefined;
};

export const aiSDKExtras =
  createRuntimeExtras<AISDKRuntimeExtras>("useAISDKRuntime");
