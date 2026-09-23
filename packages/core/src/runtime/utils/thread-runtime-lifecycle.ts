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
  if (generation?.signal.aborted) return;
  generations.delete(runtime);
  generation?.abort();
};

const endVoiceSession = (runtime: ThreadRuntimeCore) => {
  if (!runtime.voice) return;
  try {
    runtime.disconnectVoice();
  } catch (error) {
    console.error(
      "[assistant-ui] Voice cleanup threw while discarding a thread runtime",
      error,
    );
  }
};

// A successor keeps the same thread, so the call ends as if hung up and only
// in-flight work is fenced; a send made before the successor publishes lands.
export const supersedeThreadRuntime = (runtime: ThreadRuntimeCore) => {
  endVoiceSession(runtime);
  invalidateThreadRuntime(runtime);
};

// Disposal is that permanent mark, so only an owner that drops the runtime for
// good may call it; tap runs every effect cleanup on a soft unmount as well.
export const disposeThreadRuntime = (runtime: ThreadRuntimeCore) => {
  const generation = generations.get(runtime) ?? new AbortController();
  generations.set(runtime, generation);
  generation.abort();
  endVoiceSession(runtime);
};
