"use client";

import {
  AssistantCloud,
  AssistantRuntimeProvider,
  createLocalStorageAdapter,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useMemo } from "react";

const baseUrl = process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL;

const cloud = baseUrl
  ? new AssistantCloud({
      baseUrl,
      anonymous: true,
    })
  : undefined;

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localThreadListAdapter = useMemo(() => {
    if (cloud) return undefined;
    if (typeof window === "undefined") return undefined;
    return createLocalStorageAdapter({
      storage: {
        getItem: async (key) => window.localStorage.getItem(key),
        setItem: async (key, value) => window.localStorage.setItem(key, value),
        removeItem: async (key) => window.localStorage.removeItem(key),
      },
    });
  }, []);

  const runtime = useChatRuntime({
    cloud,
    adapters: {
      threadList: localThreadListAdapter,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
