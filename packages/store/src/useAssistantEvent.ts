import { useEffect, useEffectEvent } from "react";
import { useAssistantClient } from "./useAssistantClient";
import type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./types/events";
import { normalizeEventSelector } from "./types/events";

export const useAssistantEvent = <TEvent extends AssistantEventName>(
  selector: AssistantEventSelector<TEvent>,
  callback: AssistantEventCallback<TEvent>,
) => {
  const aui = useAssistantClient();
  const callbackRef = useEffectEvent(callback);

  const { scope, event } = normalizeEventSelector(selector);
  useEffect(() => aui.on({ scope, event }, callbackRef), [aui, scope, event]);
};
