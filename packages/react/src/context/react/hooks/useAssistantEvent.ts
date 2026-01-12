import { useEffect, useRef } from "react";
import { useAssistantApi } from "../../react/AssistantApiContext";
import type {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
} from "@assistant-ui/core";
import { normalizeEventSelector } from "@assistant-ui/core";

export const useAssistantEvent = <TEvent extends AssistantEvent>(
  selector: AssistantEventSelector<TEvent>,
  callback: AssistantEventCallback<TEvent>,
) => {
  const api = useAssistantApi();
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  const { scope, event } = normalizeEventSelector(selector);
  useEffect(
    () => api.on({ scope, event }, (e) => callbackRef.current(e)),
    [api, scope, event],
  );
};
