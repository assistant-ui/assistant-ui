import { useCallback } from "react";
import { useAui, useAuiState, type AssistantState } from "@assistant-ui/store";
import { composerSendDisabled } from "../../store/primitive-predicates";
import type { ComposerSendOptions } from "../../store/scopes/composer";

export const useComposerSend = () => {
  const aui = useAui();
  const thread = useAuiState("thread");
  const composer = useAuiState("composer");
  const disabled = composerSendDisabled({ thread, composer } as AssistantState);

  const send = useCallback(
    (opts?: ComposerSendOptions) => {
      aui.composer.send(opts);
    },
    [aui],
  );

  return { send, disabled };
};
