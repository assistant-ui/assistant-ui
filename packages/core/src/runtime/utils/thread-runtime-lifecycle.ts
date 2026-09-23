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

// A successor keeps the same thread: the call ends as if hung up, in-flight work
// (a commit waiting on a load included) is fenced, and later sends still land.
export const supersedeThreadRuntime = (runtime: ThreadRuntimeCore) => {
  endVoiceSession(runtime);
  invalidateThreadRuntime(runtime);
};

// Disposal is that permanent mark, so only an owner that drops the runtime for
// good may call it: a thread list stopping the thread or an insertion-effect
// cleanup, which runs only when the hook's host is deleted.
export const disposeThreadRuntime = (runtime: ThreadRuntimeCore) => {
  const generation = generations.get(runtime) ?? new AbortController();
  generations.set(runtime, generation);
  generation.abort();
  endVoiceSession(runtime);
};
