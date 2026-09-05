import "server-only";

import { AssistantCloud } from "@assistant-ui/react";

export function accountCloud(userId: string): AssistantCloud | null {
  const apiKey = process.env.ASSISTANT_API_KEY;
  if (!apiKey) return null;

  return new AssistantCloud({
    apiKey,
    userId,
    workspaceId: userId,
  });
}
