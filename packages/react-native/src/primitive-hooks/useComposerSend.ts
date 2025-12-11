import { useCallback } from "react";
import { useComposerRuntime } from "../hooks/useComposerRuntime";
import { useComposer } from "../hooks/useComposer";

export const useComposerSend = () => {
  const runtime = useComposerRuntime();
  const canSend = useComposer((state) => state.canSend);

  const send = useCallback(() => {
    if (!canSend) return;
    runtime.send();
  }, [runtime, canSend]);

  return { send, canSend };
};
