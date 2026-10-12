import {
  getAtPointer,
  joinPointer,
  parsePointer,
  writeAtPointer,
} from "./pointer";

export type StateListener = (state: Record<string, unknown>) => void;

export type SpecStateWrite = readonly [
  path: string,
  value: unknown,
  mode?: "add" | "replace",
  arrayParents?: readonly string[],
];

/** A small state container for spec expressions and `setState` actions. */
export type SpecStateStore = {
  getState(): Record<string, unknown>;
  /** The value at a JSON Pointer, or undefined. */
  get(path: string): unknown;
  /** Writes a value at a JSON Pointer, creating missing parent objects. */
  set(path: string, value: unknown): void;
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
   * The writes `seed` re-applies, oldest first, as `[path, value]` entries. An optional mode marks replacements, and optional array-parent paths preserve array shape when saved writes are restored without a model base. A write that replaces a value drops earlier writes at its path and below it, except those made before an insert at an index of an array on its path, which may have moved them to another item; one that inserts into an array, at an index or at `-`, keeps them, so replaying the list in order gives the same state. The array is replaced, never mutated, when it changes.
   */
  writes(): readonly SpecStateWrite[];
} {
  let base = initial;
  let state = initial;
  let writes: readonly SpecStateWrite[] = [];
  const shifting = new WeakSet<SpecStateWrite>();
  const listeners = new Set<StateListener>();

  const arrayParentsAt = (target: Record<string, unknown>, path: string) => {
    const tokens = parsePointer(path);
    return tokens.flatMap((_, index) => {
      const parent = joinPointer(tokens.slice(0, index));
      return Array.isArray(getAtPointer(target, parent)) ? [parent] : [];
    });
  };

  const parentOf = (path: string) => path.slice(0, path.lastIndexOf("/"));

  const apply = (
    target: Record<string, unknown>,
    path: string,
    value: unknown,
    mode: "add" | "replace",
    savedArrayParents: readonly string[] = [],
  ) => {
    const arrayParents = [
      ...new Set([...savedArrayParents, ...arrayParentsAt(target, path)]),
    ];
    const parent =
      path === "" ? undefined : getAtPointer(target, parentOf(path));
    const inserted =
      mode === "add" &&
      path !== "" &&
      (Array.isArray(parent) ||
        (parent === undefined && arrayParents.includes(parentOf(path))));
    const next = writeAtPointer(
      target,
      parsePointer(path),
      mode,
      value,
      { createMissing: true },
      arrayParents,
    ) as Record<string, unknown>;
    return { next, inserted, arrayParents };
  };

  const entryFor = (
    path: string,
    value: unknown,
    mode: "add" | "replace",
    arrayParents: readonly string[],
  ): SpecStateWrite => {
    if (arrayParents.length > 0) {
      return [path, value, mode, arrayParents];
    }
    return mode === "replace" ? [path, value, mode] : [path, value];
  };

  const record = (
    path: string,
    value: unknown,
    mode: "add" | "replace",
    inserted: boolean,
    arrayParents: readonly string[],
  ) => {
    const entry = entryFor(path, value, mode, arrayParents);
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

  for (const [rawPath, value, savedMode, savedArrayParents] of options.writes ??
    []) {
    const path = normalize(rawPath);
    const mode = savedMode === "replace" ? "replace" : "add";
    try {
      const result = apply(
        state,
        path,
        value,
        mode,
        savedArrayParents?.map(normalize),
      );
      state = result.next;
      record(path, value, mode, result.inserted, result.arrayParents);
    } catch {}
  }

  return {
    getState: () => state,
    get: (path) => getAtPointer(state, normalize(path)),
    set(rawPath, value) {
      const path = normalize(rawPath);
      const result = apply(state, path, value, "add");
      record(path, value, "add", result.inserted, result.arrayParents);
      state = result.next;
      emit();
    },
    writes: () => writes,
    seed(next) {
      if (next === base) return;
      base = next;
      let merged = next;
      const applied: SpecStateWrite[] = [];
      for (const write of writes) {
        const [path, value, savedMode, savedArrayParents] = write;
        const mode = savedMode === "replace" ? "replace" : "add";
        try {
          const result = apply(
            merged,
            path,
            value,
            mode,
            savedArrayParents?.map(normalize),
          );
          merged = result.next;
          const entry = entryFor(path, value, mode, result.arrayParents);
          if (shifting.has(write)) shifting.add(entry);
          applied.push(entry);
        } catch {
          continue;
        }
      }
      writes = applied;
      state = merged;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
