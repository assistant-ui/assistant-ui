import { useMemo } from "react";
import { useA2uiContext } from "../react/A2uiContext";
import type { A2uiAction, A2uiServerMessage } from "../types";

export type A2uiRuntime = {
  processMessage: (msg: A2uiServerMessage) => void;
  dispatch: (action: A2uiAction) => void;
};

export function useA2uiRuntime(): A2uiRuntime {
  const { processMessage, onAction } = useA2uiContext();
  return useMemo(
    () => ({ processMessage, dispatch: onAction }),
    [processMessage, onAction],
  );
}
