"use client";

import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

const useThreadLoadEarlier = () => {
  const aui = useAui();
  const hasEarlier = useAuiState((s) => s.thread.hasEarlier);
  const loadEarlier = useCallback(() => {
    void aui.thread.loadEarlier();
  }, [aui]);
  if (!hasEarlier) return null;
  return loadEarlier;
};

export namespace ThreadPrimitiveLoadEarlier {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadLoadEarlier>;
}

/**
 * A button that loads the page before the first loaded message. Disabled
 * while the runtime reports no earlier messages. A press while a page is
 * loading joins that load, so the button stays enabled and keeps keyboard
 * focus until the page lands; read `thread.isLoadingEarlier` to show progress.
 */
export const ThreadPrimitiveLoadEarlier = createActionButton(
  "ThreadPrimitive.LoadEarlier",
  useThreadLoadEarlier,
);
