import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";

// Invalidation must stay re-entrant: StrictMode's simulated unmount runs the
// effect cleanup while the runtime object survives into the next mount, so a
// permanent disposed mark would swallow every later append.
const generations = new WeakMap<ThreadRuntimeCore, AbortController>();

export const captureThreadRuntimeGeneration = (
  runtime: ThreadRuntimeCore,
): AbortSignal => {
  let generation = generations.get(runtime);
  if (!generation) {
    generation = new AbortController();
    generations.set(runtime, generation);
  }
  return generation.signal;
};

export const invalidateThreadRuntime = (runtime: ThreadRuntimeCore) => {
  const generation = generations.get(runtime);
  generations.delete(runtime);
  generation?.abort();
};
