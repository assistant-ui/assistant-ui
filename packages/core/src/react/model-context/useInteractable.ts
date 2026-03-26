import { useEffect, useCallback, useId, useRef } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { InteractableStateSchema } from "../types/scopes/interactables";

export type UseInteractableConfig<TState> = {
  description: string;
  stateSchema: InteractableStateSchema;
  initialState: TState;
  id?: string;
  selected?: boolean;
};

type StateUpdater<TState> = TState | ((prev: TState) => TState);

export type UseInteractableMetadata = {
  id: string;
  setSelected: (selected: boolean) => void;
};

export const useInteractable = <TState>(
  name: string,
  config: UseInteractableConfig<TState>,
): [
  TState,
  (updater: StateUpdater<TState>) => void,
  UseInteractableMetadata,
] => {
  const aui = useAui();

  const autoId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = config.id ?? autoId;

  const stateSchemaRef = useRef(config.stateSchema);
  stateSchemaRef.current = config.stateSchema;
  const initialStateRef = useRef(config.initialState);
  initialStateRef.current = config.initialState;

  useEffect(() => {
    return aui.interactables().register({
      id,
      name,
      description: config.description,
      stateSchema: stateSchemaRef.current,
      initialState: initialStateRef.current,
      selected: config.selected,
    });
  }, [aui, id, name, config.description, config.selected]);

  const state =
    (useAuiState((s) => s.interactables.definitions[id]?.state) as TState) ??
    config.initialState;

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

  return [state, setState, { id, setSelected }];
};
