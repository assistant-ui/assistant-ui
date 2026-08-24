import { useMemo } from "react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Platform } from "react-native";
import {
  createAnonymousSessionFetch,
  shouldUseAnonymousSessionFetch,
} from "./anonymous-session-fetch";

const CHAT_API = process.env.EXPO_PUBLIC_CHAT_ENDPOINT_URL ?? "/api/chat";

export function useAppRuntime() {
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: CHAT_API,
        ...(shouldUseAnonymousSessionFetch(CHAT_API, Platform.OS)
          ? { fetch: createAnonymousSessionFetch(CHAT_API) }
          : {}),
      }),
    [],
  );
  return useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
}
