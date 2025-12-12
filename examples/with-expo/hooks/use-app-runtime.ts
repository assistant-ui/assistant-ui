import { useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch as expoFetch } from "expo/fetch";
import {
  useLocalRuntime,
  createAsyncStorageAdapter,
} from "@assistant-ui/react-native";
import { createOpenAIChatModelAdapter } from "@/adapters/openai-chat-adapter";
import { createOpenAITitleGenerator } from "@/adapters/openai-title-adapter";

export function useAppRuntime() {
  const storage = useMemo(
    () =>
      createAsyncStorageAdapter({
        getItem: AsyncStorage.getItem,
        setItem: AsyncStorage.setItem,
        removeItem: AsyncStorage.removeItem,
      }),
    [],
  );

  const chatModel = useMemo(
    () =>
      createOpenAIChatModelAdapter({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
        model: "gpt-4o-mini",
        fetch: expoFetch as unknown as typeof globalThis.fetch,
      }),
    [],
  );

  const generateTitle = useMemo(
    () =>
      createOpenAITitleGenerator({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
        fetch: expoFetch as unknown as typeof globalThis.fetch,
      }),
    [],
  );

  const runtime = useLocalRuntime({
    chatModel,
    storage,
    generateTitle,
  });

  return runtime;
}
