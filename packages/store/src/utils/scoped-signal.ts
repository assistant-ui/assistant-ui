import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Unsubscribe } from "../types/client";
import { useIsTapHosted } from "./tap-assistant-context";

/**
 * The readers a client wakes when it renders. Its host collects the signals
 * a commit changed and wakes their readers in its next notification, after
 * every client of that commit has published.
 */
export type ScopedSignal = {
  readonly readers: Set<() => void>;
  version: number;
};

/** The signals one read tracked, with the version each had when read. */
type Reads = { signals: ScopedSignal[]; versions: number[] };

type Collector = Reads & { untracked: boolean };

// Reads nest only when a read runs another tracked read, so one buffer per
// depth keeps collection allocation-free while the tracked set is unchanged
const collectors: Collector[] = [];
let depth = -1;
let active: Collector | null = null;

/**
 * Records that the running read depends on `signal`. A missing signal marks
 * the read untracked, which keeps its reader on every notification.
 */
export const trackSignal = (signal: ScopedSignal | undefined) => {
  if (!active) return;
  if (!signal) active.untracked = true;
  else if (!active.signals.includes(signal)) {
    active.signals.push(signal);
    active.versions.push(signal.version);
  }
};

/**
 * Runs `read` and returns the signals it tracked, which the running read
 * tracks as well, so a cached result can replay them.
 */
export const trackedBy = <T>(read: () => T) => {
  depth++;
  const collector = (collectors[depth] ??= {
    signals: [],
    versions: [],
    untracked: false,
  });
  collector.signals.length = 0;
  collector.versions.length = 0;
  collector.untracked = false;
  const outer = active;
  active = collector;
  try {
    const value = read();
    return {
      value,
      signals: [...collector.signals],
      untracked: collector.untracked,
    };
  } finally {
    active = outer;
    depth--;
    if (outer) {
      outer.untracked ||= collector.untracked;
      collector.signals.forEach(trackSignal);
    }
  }
};

const sameSignals = (a: readonly ScopedSignal[], b: readonly ScopedSignal[]) =>
  a.length === b.length && a.every((signal) => b.includes(signal));

const collectReads = <T>(
  read: () => T,
  readsRef: { current: Reads | null },
): T => {
  depth++;
  const collector = (collectors[depth] ??= {
    signals: [],
    versions: [],
    untracked: false,
  });
  collector.signals.length = 0;
  collector.versions.length = 0;
  collector.untracked = false;
  const outer = active;
  active = collector;
  try {
    const value = read();
    const previous = readsRef.current;
    // A read of nothing trackable may still read outside the store
    if (collector.untracked || collector.signals.length === 0) {
      readsRef.current = null;
    } else if (previous && sameSignals(previous.signals, collector.signals)) {
      for (let i = 0; i < previous.signals.length; i++) {
        previous.versions[i] = previous.signals[i]!.version;
      }
    } else {
      readsRef.current = {
        signals: [...collector.signals],
        versions: [...collector.versions],
      };
    }
    return value;
  } finally {
    active = outer;
    depth--;
    if (outer) {
      outer.untracked ||= collector.untracked;
      collector.signals.forEach(trackSignal);
    }
  }
};

/**
 * `useSyncExternalStore` whose subscription follows the snapshot's reads: it
 * listens to the signals the latest read tracked, or to `subscribe` when that
 * read tracked none, touched an untracked client, or runs inside a tap host.
 */
export const useTrackedSyncExternalStore = <T>(
  subscribe: (callback: () => void) => Unsubscribe,
  read: () => T,
): T => {
  const readsRef = useRef<Reads | null>(null);
  const resyncRef = useRef<(() => void) | null>(null);
  const tapHosted = useIsTapHosted();

  const subscribeToReads = useMemo(
    () => (callback: () => void) => {
      let followed: ScopedSignal[] | null | undefined;
      let unsubscribeBroad: Unsubscribe | undefined;
      let disposed = false;

      // Returns whether a newly followed signal changed after the read
      const retarget = () => {
        const reads = readsRef.current;
        const next = reads?.signals ?? null;
        if (
          followed !== undefined &&
          (followed === null || next === null
            ? followed === next
            : sameSignals(followed, next))
        ) {
          return false;
        }
        let missed = false;
        if (followed) {
          for (const signal of followed) {
            if (!next?.includes(signal)) signal.readers.delete(wake);
          }
        }
        if (reads === null) {
          unsubscribeBroad ??= subscribe(wake);
        } else {
          unsubscribeBroad?.();
          unsubscribeBroad = undefined;
          reads.signals.forEach((signal, index) => {
            if (!followed?.includes(signal)) {
              missed ||= signal.version !== reads.versions[index];
              signal.readers.add(wake);
            }
          });
        }
        followed = next && [...next];
        return missed;
      };

      // React reads the snapshot inside the callback, which refreshes the
      // reads before the subscription follows them
      function wake() {
        if (disposed) return;
        callback();
        retarget();
      }

      retarget();
      const resync = () => {
        if (retarget()) callback();
      };
      resyncRef.current = resync;

      return () => {
        disposed = true;
        unsubscribeBroad?.();
        if (followed)
          for (const signal of followed) signal.readers.delete(wake);
        if (resyncRef.current === resync) resyncRef.current = null;
      };
    },
    [subscribe],
  );

  const getSnapshot = tapHosted ? read : () => collectReads(read, readsRef);

  const value = useSyncExternalStore(
    subscribeToReads,
    getSnapshot,
    getSnapshot,
  );

  // A render can change what the snapshot reads without any notification
  useEffect(() => {
    resyncRef.current?.();
  });

  return value;
};
