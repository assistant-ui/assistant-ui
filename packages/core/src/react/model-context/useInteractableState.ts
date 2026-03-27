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
    isPending: boolean;
    error: unknown;
    flush: () => Promise<void>;
  },
] => {
  const aui = useAui();

  const state =
    (useAuiState((s) => s.interactables.definitions[id]?.state) as TState) ??
    (fallback as TState);

  const persistenceStatus = useAuiState((s) => s.interactables.persistence[id]);

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

  const flush = useCallback(() => aui.interactables().flush(), [aui]);

  return [
    state,
    {
      setState,
      setSelected,
      isPending: persistenceStatus?.isPending ?? false,
      error: persistenceStatus?.error,
      flush,
    },
  ];
};
