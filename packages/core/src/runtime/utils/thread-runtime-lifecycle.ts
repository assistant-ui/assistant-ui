import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";

// Invalidation must stay re-entrant: StrictMode's simulated unmount runs the
// effect cleanup while the runtime object survives into the next mount, so a
// permanent disposed mark would swallow every later append.
const generations = new WeakMap<ThreadRuntimeCore, number>();
const invalidationSubscribers = new WeakMap<
  ThreadRuntimeCore,
  Set<() => void>
>();

export const captureThreadRuntimeGeneration = (runtime: ThreadRuntimeCore) =>
  generations.get(runtime) ?? 0;

export const isThreadRuntimeGenerationCurrent = (
  runtime: ThreadRuntimeCore,
  generation: number,
) => captureThreadRuntimeGeneration(runtime) === generation;

export const subscribeThreadRuntimeInvalidation = (
  runtime: ThreadRuntimeCore,
  callback: () => void,
) => {
  let subscribers = invalidationSubscribers.get(runtime);
  if (!subscribers) {
    subscribers = new Set();
    invalidationSubscribers.set(runtime, subscribers);
  }
  subscribers.add(callback);
  return () => {
    if (!subscribers.delete(callback)) return;
    if (subscribers.size === 0) invalidationSubscribers.delete(runtime);
  };
};

export const invalidateThreadRuntime = (runtime: ThreadRuntimeCore) => {
  generations.set(runtime, captureThreadRuntimeGeneration(runtime) + 1);
  for (const callback of invalidationSubscribers.get(runtime) ?? []) callback();
};
