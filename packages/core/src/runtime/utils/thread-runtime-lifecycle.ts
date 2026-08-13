import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";

// Invalidation must stay re-entrant: StrictMode's simulated unmount runs the
// effect cleanup while the runtime object survives into the next mount, so a
// permanent disposed mark would swallow every later append.
const generations = new WeakMap<ThreadRuntimeCore, number>();

export const captureThreadRuntimeGeneration = (runtime: ThreadRuntimeCore) =>
  generations.get(runtime) ?? 0;

export const isThreadRuntimeGenerationCurrent = (
  runtime: ThreadRuntimeCore,
  generation: number,
) => captureThreadRuntimeGeneration(runtime) === generation;

export const invalidateThreadRuntime = (runtime: ThreadRuntimeCore) => {
  generations.set(runtime, captureThreadRuntimeGeneration(runtime) + 1);
};
