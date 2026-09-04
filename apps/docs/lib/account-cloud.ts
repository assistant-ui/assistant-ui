import "server-only";

import { AssistantCloud } from "@assistant-ui/react";

export function accountCloud(userId: string): AssistantCloud | null {
  const apiKey = process.env.ASSISTANT_API_KEY;
  if (!apiKey) return null;

  return new AssistantCloud({
    baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
    apiKey,
    userId,
    workspaceId: userId,
  });
}
