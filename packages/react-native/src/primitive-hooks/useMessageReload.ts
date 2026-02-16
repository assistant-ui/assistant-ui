import { useCallback } from "react";
import { useMessageRuntime } from "../context";
import { useMessage } from "../hooks/useMessage";

export const useMessageReload = () => {
  const runtime = useMessageRuntime();
  const canReload = useMessage((s) => s.role === "assistant");

  const reload = useCallback(() => {
    runtime.reload();
  }, [runtime]);

  return { reload, canReload };
};
