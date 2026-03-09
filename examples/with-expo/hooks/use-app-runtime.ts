import { useMemo } from "react";
import { fetch } from "expo/fetch";
import { useLocalRuntime } from "@assistant-ui/react-native";
import { createChatEndpointAdapter } from "@/adapters/chat-endpoint-adapter";

const CHAT_ENDPOINT = process.env.EXPO_PUBLIC_CHAT_ENDPOINT_URL ?? "/api/chat";

export function useAppRuntime() {
  const chatModel = useMemo(
    () =>
      createChatEndpointAdapter({
        endpoint: CHAT_ENDPOINT,
        fetch,
      }),
    [],
  );

  return useLocalRuntime(chatModel);
}
