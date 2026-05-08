import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { ComposerSendOptions } from "../../store/scopes/composer";

export const useComposerSend = () => {
  const aui = useAui();
  const disabled = useAuiState(
    (s) =>
      !s.composer.canSend ||
      (s.thread.isRunning && !s.thread.capabilities.queue),
  );

  const send = useCallback(
    (opts?: ComposerSendOptions) => {
      aui.composer().send(opts);
    },
    [aui],
  );

  return { send, disabled };
};
