import { getAtPointer, parsePointer, writeAtPointer } from "./pointer";

export type StateListener = (state: Record<string, unknown>) => void;

/** A value written at a JSON Pointer with `set`. */
export type SpecStateWrite = readonly [
  path: string,
  value: unknown,
  mode?: "replace",
];

/** A small state container for spec expressions and `setState` actions. */
export type SpecStateStore = {
  getState(): Record<string, unknown>;
  /** The value at a JSON Pointer, or undefined. */
  get(path: string): unknown;
  /** Writes at a JSON Pointer, creating missing parent objects. Defaults to add (inserting at array indices); replace updates an existing array item. */
  set(path: string, value: unknown, mode?: "add" | "replace"): void;
  /**
   * Replaces the base state, typically the spec's `state` as it streams in,
   * and re-applies every `set` made so far on top of it, so model updates
   * never discard what the user already changed.
   */
  seed(state: Record<string, unknown>): void;
  subscribe(listener: StateListener): () => void;
};

const normalize = (path: string) =>
  path === "" || path.startsWith("/") ? path : `/${path}`;

export type StateStoreOptions = {
  /** Writes to apply over the initial state and keep, such as changes saved from an earlier session. One that no longer applies is dropped. */
  writes?: readonly SpecStateWrite[];
};

export function createStateStore(
  initial: Record<string, unknown> = {},
  options: StateStoreOptions = {},
): SpecStateStore & {
  /**
   * The writes `seed` re-applies, oldest first, as `[path, value]` or `[path, value, "replace"]`: what to save to restore the user's changes later. A write that replaces a value drops earlier writes at its path and below it, except those made before an insert at an index of an array on its path, which may have moved them to another item; one that inserts into an array, at an index or at `-`, keeps them, so replaying the list in order gives the same state. The array is replaced, never mutated, when it changes.
   */
  writes(): readonly SpecStateWrite[];
} {
  let base = initial;
  let state = initial;
  let writes: readonly SpecStateWrite[] = [];
  const shifting = new WeakSet<SpecStateWrite>();
  const listeners = new Set<StateListener>();

  const write = (
    target: Record<string, unknown>,
    path: string,
    value: unknown,
    mode: "add" | "replace",
  ) =>
    writeAtPointer(target, parsePointer(path), mode, value, {
      createMissing: true,
    }) as Record<string, unknown>;

  const parentOf = (path: string) => path.slice(0, path.lastIndexOf("/"));

  const inserts = (target: Record<string, unknown>, path: string) =>
    path !== "" && Array.isArray(getAtPointer(target, parentOf(path)));

  const record = (
    path: string,
    value: unknown,
    inserted: boolean,
    mode: "add" | "replace",
  ) => {
    const entry: SpecStateWrite =
      mode === "replace" ? [path, value, mode] : [path, value];
    if (inserted) {
      if (!path.endsWith("/-")) shifting.add(entry);
      writes = [...writes, entry];
      return;
    }
    const moved = writes.findLastIndex(
      (write) =>
        shifting.has(write) && path.startsWith(`${parentOf(write[0])}/`),
    );
    writes = [
      ...writes.filter(
        ([written], index) =>
          index <= moved ||
          (written !== path && !written.startsWith(`${path}/`)),
      ),
      entry,
    ];
  };

  const emit = () => {
    for (const listener of [...listeners]) listener(state);
  };

  for (const [rawPath, value, saved] of options.writes ?? []) {
    const mode = saved === "replace" ? "replace" : "add";
    const path = normalize(rawPath);
    try {
      const inserted = mode === "add" && inserts(state, path);
      state = write(state, path, value, mode);
      record(path, value, inserted, mode);
    } catch {}
  }

  return {
    getState: () => state,
    get: (path) => getAtPointer(state, normalize(path)),
    set(rawPath, value, mode = "add") {
      const path = normalize(rawPath);
      const inserted = mode === "add" && inserts(state, path);
      const next = write(state, path, value, mode);
      record(path, value, inserted, mode);
      state = next;
      emit();
    },
    writes: () => writes,
    seed(next) {
      if (next === base) return;
      base = next;
      let merged = next;
      const applied = writes.filter(([path, value, mode = "add" as const]) => {
        try {
          merged = write(merged, path, value, mode);
          return true;
        } catch {
          return false;
        }
      });
      if (applied.length !== writes.length) writes = applied;
      state = merged;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
