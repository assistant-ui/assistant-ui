import { useMemo } from "react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";

const CHAT_API = process.env.EXPO_PUBLIC_CHAT_ENDPOINT_URL ?? "/api/chat";

export function useAppRuntime() {
  const transport = useMemo(
    () => new AssistantChatTransport({ api: CHAT_API }),
    [],
  );
  return useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
}
