import { useEffect, useRef } from "react";
import { useAssistantApi } from "../../react/AssistantApiContext";
import {
  AssistantEventSelector,
  AssistantEvents,
  normalizeEventSelector,
} from "../../../types/EventTypes";

export const useAssistantEvent = <TEvent extends keyof AssistantEvents>(
  selector: AssistantEventSelector<TEvent>,
  callback: (e: AssistantEvents[TEvent]) => void,
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
