import { useCallback } from "react";
import { useMessageRuntime } from "../hooks/useMessageRuntime";
import { useThreadContext } from "../context/ThreadContext";

export const useMessageReload = () => {
  const messageRuntime = useMessageRuntime();
  const threadRuntime = useThreadContext();
  const canReload = threadRuntime.getState().capabilities.reload;

  const reload = useCallback(() => {
    if (!canReload) return;
    messageRuntime.reload();
  }, [messageRuntime, canReload]);

  return { reload, canReload };
};
