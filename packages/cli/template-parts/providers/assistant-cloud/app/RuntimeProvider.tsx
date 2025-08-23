"use client";

import { AssistantCloud } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";

const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  anonymous: true,
});

export function useRuntime() {
  return useChatRuntime({
    cloud,
    transport: new AssistantChatTransport({
      api: "/my-custom-api/chat",
    }),
  });
}