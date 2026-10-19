import { useSyncExternalStore } from "react";
import { unstable_useClientSource } from "@assistant-ui/store/client";
import type { SubscribableWithState } from "../../subscribable/subscribable";

export const useSubscribable = <T>(
  subscribable: Omit<SubscribableWithState<T, any>, "path"> & {
    getServerSnapshot?: () => T;
  },
  options?: { live?: boolean },
) => {
  unstable_useClientSource(options?.live ? subscribable.subscribe : undefined);
  return useSyncExternalStore(
    subscribable.subscribe,
    subscribable.getState,
    subscribable.getServerSnapshot,
  );
};
