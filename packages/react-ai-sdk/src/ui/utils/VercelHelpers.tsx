import type { UseAssistantHelpers, useChat } from "@ai-sdk/react";

export type VercelHelpers = ReturnType<typeof useChat> | UseAssistantHelpers;
