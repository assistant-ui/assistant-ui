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
  const disabled = useAuiState(
    (s) => !s.thread.hasEarlier || s.thread.isLoadingEarlier,
  );
  const loadEarlier = useCallback(() => {
    void aui.thread.loadEarlier();
  }, [aui]);
  if (disabled) return null;
  return loadEarlier;
};

export namespace ThreadPrimitiveLoadEarlier {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadLoadEarlier>;
}

/**
 * A button that loads the page before the first loaded message. Disabled
 * while the runtime reports no earlier messages or a load is in flight.
 */
export const ThreadPrimitiveLoadEarlier = createActionButton(
  "ThreadPrimitive.LoadEarlier",
  useThreadLoadEarlier,
);
