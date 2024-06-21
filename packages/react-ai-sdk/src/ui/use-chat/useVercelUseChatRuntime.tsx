import type { useChat } from "@ai-sdk/react";
import { useEffect, useInsertionEffect, useState } from "react";
import { VercelAIRuntime } from "../VercelAIRuntime";

export const useVercelUseChatRuntime = (
  chatHelpers: ReturnType<typeof useChat>,
) => {
  const [runtime] = useState(() => new VercelAIRuntime(chatHelpers));

  useInsertionEffect(() => {
    runtime.vercel = chatHelpers;
  });
  useEffect(() => {
    runtime.onVercelUpdated();
  });

  return runtime;
};
