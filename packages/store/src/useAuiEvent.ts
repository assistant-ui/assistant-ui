import { useEffect } from "react";
import { useEffectEvent } from "use-effect-event";
import { useAui } from "./useAui";
import type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./types/events";
import { normalizeEventSelector } from "./types/events";

export const useAuiEvent = <TEvent extends AssistantEventName>(
  selector: AssistantEventSelector<TEvent>,
  callback: AssistantEventCallback<TEvent>,
) => {
  const aui = useAui();
  const callbackRef = useEffectEvent(callback);

  const { scope, event } = normalizeEventSelector(selector);
  useEffect(
    () => aui.on({ scope, event }, callbackRef),
    [aui, scope, event, callbackRef],
  );
};
