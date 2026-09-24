"use client";

import { useInsertionEffect, useState } from "react";

/**
 * Permanent teardown signal for a React-hosted assistant client. Insertion
 * effects are cleaned up only when React deletes the fiber: a Strict Mode
 * replay, a hidden `<Activity>`, or a re-suspended boundary disconnects
 * layout and passive effects but leaves this one in place, so the signal
 * aborts on a real unmount and nothing else. The abort runs in a microtask
 * because React forbids scheduling updates from inside an insertion effect
 * and abort listeners may update surviving components. Fast Refresh re-runs
 * the effect of an edited host, cleanup then setup in the same commit, so a
 * setup cancels the abort its preceding cleanup queued. React-land only:
 * under tap's dispatcher this is a plain effect and would abort on every
 * soft unmount.
 */
export const useHostDestroySignal = (): AbortSignal => {
  const [host] = useState(() => ({
    controller: new AbortController(),
    generation: 0,
  }));
  useInsertionEffect(() => {
    const generation = ++host.generation;
    return () =>
      queueMicrotask(() => {
        if (host.generation === generation) host.controller.abort();
      });
  }, [host]);
  return host.controller.signal;
};
