import { useCallback } from "react";
import { useComposerRuntime } from "../context";
import { useComposer } from "../hooks/useComposer";

export const useComposerSend = () => {
  const runtime = useComposerRuntime();
  const canSend = useComposer((s) => !s.isEmpty);

  const send = useCallback(() => {
    runtime.send();
  }, [runtime]);

  return { send, canSend };
};
