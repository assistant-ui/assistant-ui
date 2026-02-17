import { tapState, tapEffect } from "@assistant-ui/tap";
import type { SubscribableWithState } from "../../subscribable";

export const tapSubscribable = <T>(
  subscribable: Omit<SubscribableWithState<T, any>, "path">,
) => {
  const [, setState] = tapState(subscribable.getState);
  tapEffect(() => {
    setState(subscribable.getState());
    return subscribable.subscribe(() => {
      setState(subscribable.getState());
    });
  }, [subscribable]);

  return subscribable.getState();
};
