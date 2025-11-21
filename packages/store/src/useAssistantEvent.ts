import { useEffect, useEffectEvent, useRef } from "react";
import { useAssistantClient } from "./useAssistantClient";
import type { AssistantEvent, AssistantEventCallback } from "./EventContext";

export const useAssistantEvent = <TEvent extends AssistantEvent>(
  event: TEvent,
  callback: AssistantEventCallback<TEvent>,
) => {
  const client = useAssistantClient();
  const callbackRef = useEffectEvent(callback);
  useEffect(() => client.on(event, callbackRef), [client, event]);
};
