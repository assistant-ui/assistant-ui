import { nextTick } from "vue";

/**
 * Guards a by-index scope resolution across a collection shrink. The scope
 * re-resolves inside the store notification, before Vue's queued render can
 * unmount it, so a shrink briefly reads out of bounds; `resolve` serves the
 * last valid item for exactly that window. A stale serve schedules an expiry
 * on the next tick: if no valid resolution arrived in between, the cache is
 * dropped and `reportStale` runs for a provider that is still mounted out of
 * bounds (its next resolution then throws, like a never-valid index does
 * immediately). The expiry only drops the cache; descendants keep the last
 * committed state until the next store notification re-resolves the scope.
 */
export const createLastValidCache = <T>(reportStale: () => void) => {
  let last: T | undefined;
  let generation = 0;
  let expiryScheduled = false;
  const scheduleExpiry = () => {
    if (expiryScheduled) return;
    expiryScheduled = true;
    const scheduledAt = generation;
    void nextTick(() => {
      expiryScheduled = false;
      if (generation !== scheduledAt) return;
      last = undefined;
      reportStale();
    });
  };
  return {
    resolve: (valid: boolean, resolveItem: () => T): T => {
      if (valid) {
        generation++;
        last = resolveItem();
        return last;
      }
      if (last) scheduleExpiry();
      return last ?? resolveItem();
    },
  };
};
