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

const endMediaSession = (end: () => void, what: string) => {
  try {
    end();
  } catch (error) {
    console.error(
      `[assistant-ui] ${what} cleanup threw while discarding a thread runtime`,
      error,
    );
  }
};

// Nothing reaches a discarded runtime's controls, so its microphone and
// playback end with it.
const endMediaSessions = (runtime: ThreadRuntimeCore) => {
  if (runtime.voice) endMediaSession(() => runtime.disconnectVoice(), "Voice");
  if (runtime.composer.dictation)
    endMediaSession(() => runtime.composer.stopDictation(), "Dictation");
  if (runtime.speech) endMediaSession(() => runtime.stopSpeaking(), "Speech");
};

// A successor keeps the same thread: the call ends as if hung up, in-flight work
// (a commit waiting on a load included) is fenced, and later sends still land.
export const supersedeThreadRuntime = (runtime: ThreadRuntimeCore) => {
  endMediaSessions(runtime);
  invalidateThreadRuntime(runtime);
};

// Disposal is that permanent mark, so only an owner that drops the runtime for
// good may call it; tap runs every effect cleanup on a soft unmount as well.
export const disposeThreadRuntime = (runtime: ThreadRuntimeCore) => {
  const generation = generations.get(runtime) ?? new AbortController();
  generations.set(runtime, generation);
  generation.abort();
  endMediaSessions(runtime);
};
