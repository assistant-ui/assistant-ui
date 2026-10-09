import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { composerSendDisabled } from "../../store/primitive-predicates";
import type { ComposerSendOptions } from "../../store/scopes/composer";

export const useComposerSend = () => {
  const aui = useAui();
  const disabled = useAuiState(composerSendDisabled);

  const send = useCallback(
    (opts?: ComposerSendOptions) => {
      aui.composer.send(opts);
    },
    [aui],
  );

  return { send, disabled };
};
