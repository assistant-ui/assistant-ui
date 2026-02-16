import { useMemo } from "react";
import { useLocalRuntime } from "@assistant-ui/react-native";
import { createOpenAIChatModelAdapter } from "@/adapters/openai-chat-adapter";

export function useAppRuntime() {
  const chatModel = useMemo(
    () =>
      createOpenAIChatModelAdapter({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
        model: "gpt-4o-mini",
      }),
    [],
  );

  return useLocalRuntime(chatModel);
}
