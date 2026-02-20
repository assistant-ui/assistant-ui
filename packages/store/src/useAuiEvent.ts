import { useEffect } from "react";
import { useEffectEvent } from "use-effect-event";
import { useAui } from "./useAui";
import type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventSelector,
} from "@assistant-ui/core/store";
import { normalizeEventSelector } from "@assistant-ui/core/store";

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
