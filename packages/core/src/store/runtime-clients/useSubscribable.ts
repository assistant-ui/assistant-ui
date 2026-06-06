import { useState, useEffect } from "react";
import type { SubscribableWithState } from "../../subscribable/subscribable";

export const useSubscribable = <T>(
  subscribable: Omit<SubscribableWithState<T, any>, "path">,
) => {
  const [, setState] = useState(subscribable.getState);
  useEffect(() => {
    setState(subscribable.getState());
    return subscribable.subscribe(() => {
      setState(subscribable.getState());
    });
  }, [subscribable]);

  return subscribable.getState();
};
