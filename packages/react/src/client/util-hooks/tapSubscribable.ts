import { tapState, tapEffect } from "@assistant-ui/tap";
import { SubscribableWithState } from "../../api/subscribable/Subscribable";

export const tapSubscribable = <T>(
  subscribable: Omit<SubscribableWithState<T, any>, "path">,
) => {
  const [state, setState] = tapState(subscribable.getState);

  tapEffect(() => {
    setState(subscribable.getState());
    return subscribable.subscribe(() => {
      setState(subscribable.getState());
    });
  }, [subscribable]);

  return state;
};
