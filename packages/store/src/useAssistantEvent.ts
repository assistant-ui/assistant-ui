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
  const client = useAssistantClient();
  const callbackRef = useEffectEvent(callback);

  const { scope, event } = normalizeEventSelector(selector);
  useEffect(
    () => client.on({ scope, event }, callbackRef),
    [client, scope, event],
  );
};
