import type { ComputedRef } from "vue";
import type {} from "@assistant-ui/core/store";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

export const useComposerSendState = (): {
  disabled: ComputedRef<boolean>;
  send: () => void;
} => {
  const aui = useAui();
  const disabled = useAuiState(
    (s) =>
      !s.composer.canSend ||
      (s.thread.isRunning && !s.thread.capabilities.queue),
  );
  return { disabled, send: () => aui.composer.send() };
};
