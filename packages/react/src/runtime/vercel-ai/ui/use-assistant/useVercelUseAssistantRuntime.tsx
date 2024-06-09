import type { UseAssistantHelpers } from "ai/react";
import { useEffect, useInsertionEffect, useState } from "react";
import { VercelAIRuntime } from "../VercelAIRuntime";

export const useVercelUseAssistantRuntime = (assistantHelpers: UseAssistantHelpers) => {
  const [runtime] = useState(() => new VercelAIRuntime(assistantHelpers));

  useInsertionEffect(() => {
    runtime.vercel = assistantHelpers;
  });
  useEffect(() => {
    runtime.onVercelUpdated();
  });

  return runtime;
};
