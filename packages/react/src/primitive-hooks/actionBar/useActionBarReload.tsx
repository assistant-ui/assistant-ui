import { useCallback } from "react";
import { useMessageRuntime } from "../../context/react/MessageContext";
import { useThreadRuntime } from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useActionBarReload = () => {
  const messageRuntime = useMessageRuntime();
  const threadRuntime = useThreadRuntime();

  const disabled = useCombinedStore(
    [threadRuntime, messageRuntime],
    (t, m) => t.isRunning || t.isDisabled || m.role !== "assistant",
  );

  const callback = useCallback(() => {
    messageRuntime.reload();
  }, [messageRuntime]);

  if (disabled) return null;
  return callback;
};
