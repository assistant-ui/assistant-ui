import { useEffect, useRef } from "react";
import { useAssistantApi } from "../../react/AssistantApiContext";
import {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
  normalizeEventSelector,
} from "../../../types/EventTypes";

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
