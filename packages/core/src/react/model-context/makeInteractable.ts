import { FC } from "react";
import { useInteractable, type UseInteractableConfig } from "./useInteractable";

export type InteractableConfig<TState> = UseInteractableConfig<TState> & {
  name: string;
};

export type AssistantInteractable = FC & {
  unstable_interactable: InteractableConfig<any>;
};

export const makeInteractable = <TState>(
  config: InteractableConfig<TState>,
) => {
  const Interactable: AssistantInteractable = () => {
    useInteractable(config.name, config);
    return null;
  };
  Interactable.unstable_interactable = config;
  return Interactable;
};
