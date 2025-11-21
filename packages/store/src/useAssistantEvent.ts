import { useEffect, useEffectEvent } from "react";
import { useAssistantClient } from "./useAssistantClient";
import type {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./EventContext";
import { normalizeEventSelector } from "./EventContext";

export const useAssistantEvent = <TEvent extends AssistantEvent>(
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
