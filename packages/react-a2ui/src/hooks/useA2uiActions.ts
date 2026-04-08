import { useA2uiContext } from "../react/A2uiContext";
import type { A2uiAction } from "../types";

export function useA2uiActions(): { dispatch: (action: A2uiAction) => void } {
  const { onAction } = useA2uiContext();
  return { dispatch: onAction };
}
