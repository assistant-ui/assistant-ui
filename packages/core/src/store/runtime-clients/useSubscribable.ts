import { useSyncExternalStore } from "react";
import type { SubscribableWithState } from "../../subscribable/subscribable";

export const useSubscribable = <T>(
  subscribable: Omit<SubscribableWithState<T, any>, "path">,
) => {
  return useSyncExternalStore(subscribable.subscribe, subscribable.getState);
};
