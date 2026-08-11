import { nextTick } from "vue";

/**
 * Guards a by-index scope resolution across a collection shrink. The scope
 * re-resolves inside the store notification, before Vue's queued render can
 * unmount it, so a shrink briefly reads out of bounds; `resolve` serves the
 * last valid item for exactly that window. Every stale serve schedules an
 * expiry on the next tick carrying the generation it observed: a valid
 * resolution in between advances the generation and voids the pending expiry,
 * while a provider still mounted out of bounds after the flush has its cache
 * dropped and `reportStale` run once (its next resolution then throws, like a
 * never-valid index does immediately). The expiry only drops the cache;
 * descendants keep the last committed state until the next store notification
 * re-resolves the scope. Pass `reportStale: null` when a sibling cache over
 * the same validity predicate already reports.
 */
export const createLastValidCache = <T>(reportStale: (() => void) | null) => {
  let last: T | undefined;
  let generation = 0;
  const scheduleExpiry = () => {
    const scheduledAt = generation;
    void nextTick(() => {
      if (generation !== scheduledAt) return;
      if (last === undefined) return;
      last = undefined;
      reportStale?.();
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

/**
 * The standard `reportStale` callback for a by-index provider: skipped when
 * the provider is disposed or its props moved on, re-checked against the live
 * collection (an unavailable parent scope counts as still stale), and logged
 * through `console.error` so the misuse is visible where the subsequent
 * throw may not be.
 */
export const createStaleReporter =
  (options: {
    name: string;
    index: number;
    isCurrent: () => boolean;
    isValid: () => boolean;
  }) =>
  () => {
    if (!options.isCurrent()) return;
    try {
      if (options.isValid()) return;
    } catch {
      // the parent scope itself is unavailable; report either way
    }
    console.error(
      `${options.name}: index ${options.index} is still out of bounds after the update settled; the scope throws on its next resolution.`,
    );
  };
