import type { useChat } from "ai/react";
import { useEffect, useInsertionEffect, useState } from "react";
import { VercelUseChatRuntime } from "./VercelUseChatRuntime";

export const useVercelUseChatRuntime = (
  chatHelpers: ReturnType<typeof useChat>,
) => {
  const [runtime] = useState(() => new VercelUseChatRuntime(chatHelpers));

  useInsertionEffect(() => {
    runtime.vercel = chatHelpers;
  });
  useEffect(() => {
    runtime.onVercelUpdated();
  });

  return runtime;
};
