import { useEffect, useEffectEvent } from "react";
import { useAssistantClient } from "./useAssistantClient";
import type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./types/events";

export const useAssistantEvent = <TEvent extends AssistantEventName>(
  selector: AssistantEventSelector<TEvent>,
  callback: AssistantEventCallback<TEvent>,
) => {
  const client = useAssistantClient();
  const callbackRef = useEffectEvent(callback);

  useEffect(
    () => client.on(selector, callbackRef),
    [client, JSON.stringify(selector)],
  );
};
