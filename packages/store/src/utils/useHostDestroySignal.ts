"use client";

import { useInsertionEffect, useState } from "react";

/**
 * Permanent teardown signal for a React-hosted assistant client. Insertion
 * effects are cleaned up only when React deletes the fiber: a Strict Mode
 * replay, a hidden `<Activity>`, or a re-suspended boundary disconnects
 * layout and passive effects but leaves this one in place, so the signal
 * aborts on a real unmount and nothing else. The abort runs in a microtask
 * because React forbids scheduling updates from inside an insertion effect
 * and abort listeners may update surviving components. React-land only:
 * under tap's dispatcher this is a plain effect and would abort on every
 * soft unmount.
 */
export const useHostDestroySignal = (): AbortSignal => {
  const [controller] = useState(() => new AbortController());
  useInsertionEffect(
    () => () => queueMicrotask(() => controller.abort()),
    [controller],
  );
  return controller.signal;
};
