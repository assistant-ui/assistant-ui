import { Unsubscribe } from "../../types";
import { ThreadRuntimeWithSubscribe } from "./AssistantRuntime";

export const subscribeToMainThread = (
  runtime: ThreadRuntimeWithSubscribe,
  callback: () => void,
) => {
  let first = true;
  let cleanup: Unsubscribe | undefined;
  const inner = () => {
    cleanup?.();
    cleanup = runtime.thread.subscribe(callback);

    if (!first) {
      callback();
    }
    first = false;
  };

  const unsubscribe = runtime.subscribe(inner);
  inner();

  return () => {
    unsubscribe();
    cleanup?.();
  };
};
