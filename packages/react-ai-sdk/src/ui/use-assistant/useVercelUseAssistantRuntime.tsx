import type { UseAssistantHelpers } from "@ai-sdk/react";
import { useEffect, useInsertionEffect, useState } from "react";
import { VercelUseAssistantRuntime } from "./VercelUseAssistantRuntime";

export const useVercelUseAssistantRuntime = (
  assistantHelpers: UseAssistantHelpers,
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
