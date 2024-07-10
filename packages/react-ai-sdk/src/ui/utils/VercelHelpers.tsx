import type { useAssistant, useChat } from "ai/react";

export type VercelHelpers =
  | ReturnType<typeof useChat>
  | ReturnType<typeof useAssistant>;
