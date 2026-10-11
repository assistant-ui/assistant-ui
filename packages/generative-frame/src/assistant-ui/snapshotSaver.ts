const SAVE_DELAY_MS = 500;

export type SnapshotSaver<T> = {
  /** Saves `read()` once changes settle, if it differs from the newest entry recorded. */
  schedule(read: () => T): void;
  /** Saves a change that is still waiting now rather than after the delay. */
  flush(): void;
};

/**
 * Saves snapshots of a tool call's UI state through `record`, 500 ms after the last change and when flushed, whenever the snapshot differs from the newest entry recorded; `initial` is that entry when saving starts. One record is in flight at a time, so entries land in the order they are sent, and a change made meanwhile is saved once it settles. When the current snapshot cannot be recorded, `record(null)` marks it, so the call starts fresh on its next mount rather than from an older snapshot; a marker that fails is sent again only after a newer snapshot is tried.
 */
export function createSnapshotSaver<T>(
  initial: T,
  record: (snapshot: T | null) => unknown,
): SnapshotSaver<T> {
  let recorded = JSON.stringify(initial);
  let failed: string | undefined;
  let markerFailed = false;
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let read: (() => T) | undefined;

  const send = (snapshot: T | null, json: string, marker: boolean) => {
    busy = true;
    let result: Promise<unknown>;
    try {
      result = Promise.resolve(record(snapshot));
    } catch (error) {
      result = Promise.reject(error);
    }
    void result
      .then(
        () => {
          recorded = json;
          if (!marker) failed = undefined;
        },
        () => {
          if (marker) markerFailed = true;
          else failed = json;
        },
      )
      .finally(() => {
        busy = false;
        if (timer === undefined) save();
      });
  };

  const save = () => {
    if (busy || !read) return;
    let snapshot: T | undefined;
    let json: string | undefined;
    try {
      snapshot = read();
      json = JSON.stringify(snapshot);
    } catch {}
    if (json === recorded) return;
    if (json !== undefined && json !== failed) {
      markerFailed = false;
      send(snapshot as T, json, false);
      return;
    }
    if (recorded !== "null" && !markerFailed) send(null, "null", true);
  };

  return {
    schedule(next) {
      read = next;
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        save();
      }, SAVE_DELAY_MS);
    },
    flush() {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      save();
    },
  };
}
