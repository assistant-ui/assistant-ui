"use client";

import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

type StateUpdater<TState> = TState | ((prev: TState) => TState);

/**
 * Reads and writes the state of an interactable registered elsewhere, by id.
 *
 * Use this from secondary readers (children, siblings); the owning component
 * registers with `unstable_useInteractable`, which returns state directly. Returns
 * `undefined` until the owning interactable is registered.
 *
 * @deprecated Unstable / Experimental (not actually removed).
 */
export const useInteractableState = <TState>(
  id: string,
): [
  TState | undefined,
  {
    setState: (updater: StateUpdater<TState>) => void;
    isPending: boolean;
    error: unknown;
    flush: () => Promise<void>;
  },
] => {
  const aui = useAui();

  const state = useAuiState(
    (s) => s.unstable_interactables.definitions[id]?.state,
  ) as TState | undefined;

  const persistenceStatus = useAuiState(
    (s) => s.unstable_interactables.persistence[id],
  );

  const setState = useCallback(
    (updater: StateUpdater<TState>) => {
      aui.unstable_interactables().setState(id, (prev) => {
        if (typeof updater === "function") {
          return (updater as (prev: TState) => TState)(prev as TState);
        }
        return updater;
      });
    },
    [aui, id],
  );

  const flush = useCallback(() => aui.unstable_interactables().flush(), [aui]);

  return [
    state,
    {
      setState,
      isPending: persistenceStatus?.isPending ?? false,
      error: persistenceStatus?.error,
      flush,
    },
  ];
};
