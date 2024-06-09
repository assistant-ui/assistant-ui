import { useEffect, useInsertionEffect, useState } from "react";
import { VercelUseChatRuntime } from "./VercelAIUIRuntime";
import type { VercelHelpers } from "./utils/VercelHelpers";

export const useVercelUseChatRuntime = (vercel: VercelHelpers) => {
  const [runtime] = useState(() => new VercelUseChatRuntime(vercel));

  useInsertionEffect(() => {
    runtime.vercel = vercel;
  });
  useEffect(() => {
    runtime.onVercelUpdated();
  });

  return runtime;
};
