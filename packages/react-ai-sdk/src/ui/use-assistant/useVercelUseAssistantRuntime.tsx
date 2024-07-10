import type { useAssistant } from "ai/react";
import { useEffect, useInsertionEffect, useState } from "react";
import { VercelUseAssistantRuntime } from "./VercelUseAssistantRuntime";

export const useVercelUseAssistantRuntime = (
  assistantHelpers: ReturnType<typeof useAssistant>,
) => {
  const [runtime] = useState(
    () => new VercelUseAssistantRuntime(assistantHelpers),
  );

  useInsertionEffect(() => {
    runtime.vercel = assistantHelpers;
  });
  useEffect(() => {
    runtime.onVercelUpdated();
  });

  return runtime;
};
