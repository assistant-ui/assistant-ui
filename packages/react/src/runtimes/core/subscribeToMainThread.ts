import { Unsubscribe } from "../../types";
import { AssistantRuntimeCore } from "./AssistantRuntimeCore";

/**
 * @deprecated Use `runtime.thread.subscribe` instead. This will be removed in 0.6.0.
 */
export const subscribeToMainThread = (
  runtime: AssistantRuntimeCore,
  callback: () => void,
) => {
  let first = true;
  let cleanup: Unsubscribe | undefined;
  const inner = () => {
    cleanup?.();
    cleanup = runtime.threadList.mainThread.subscribe(callback);

    if (!first) {
      callback();
    }
    first = false;
  };

  const unsubscribe = runtime.threadList.mainThread.subscribe(inner);
  inner();

  return () => {
    unsubscribe();
    cleanup?.();
  };
};
