import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

type StateUpdater<TState> = TState | ((prev: TState) => TState);

/**
 * Reads and writes the state of a registered interactable.
 *
 * Pair with {@link useAssistantInteractable} which handles registration.
 */
export const useInteractableState = <TState>(
  id: string,
  fallback: TState,
): [
  TState,
  {
    setState: (updater: StateUpdater<TState>) => void;
    setSelected: (selected: boolean) => void;
  },
] => {
  const aui = useAui();

  const state =
    (useAuiState((s) => s.interactables.definitions[id]?.state) as TState) ??
    (fallback as TState);

  const setState = useCallback(
    (updater: StateUpdater<TState>) => {
      aui.interactables().setState(id, (prev) => {
        if (typeof updater === "function") {
          return (updater as (prev: TState) => TState)(prev as TState);
        }
        return updater;
      });
    },
    [aui, id],
  );

  const setSelected = useCallback(
    (selected: boolean) => {
      aui.interactables().setSelected(id, selected);
    },
    [aui, id],
  );

  return [state, { setState, setSelected }];
};
