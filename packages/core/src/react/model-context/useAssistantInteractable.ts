import { useEffect, useId, useRef } from "react";
import { useAui } from "@assistant-ui/store";
import type { InteractableStateSchema } from "../types/scopes/interactables";

export type AssistantInteractableProps = {
  description: string;
  stateSchema: InteractableStateSchema;
  initialState: unknown;
  id?: string;
  selected?: boolean;
};

/**
 * Registers an interactable with the AI assistant.
 *
 * This hook handles registration only. To read and write the interactable's
 * state, use {@link useInteractableState} with the returned id.
 *
 * @returns The interactable instance id.
 */
export const useAssistantInteractable = (
  name: string,
  config: AssistantInteractableProps,
): string => {
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

  return id;
};
