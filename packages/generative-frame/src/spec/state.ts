import { getAtPointer, parsePointer, writeAtPointer } from "./pointer";

export type StateListener = (state: Record<string, unknown>) => void;

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

export function createStateStore(
  initial: Record<string, unknown> = {},
): SpecStateStore {
  let base = initial;
  let state = initial;
  const writes = new Map<string, unknown>();
  const listeners = new Set<StateListener>();

  const write = (
    target: Record<string, unknown>,
    path: string,
    value: unknown,
  ) =>
    writeAtPointer(target, parsePointer(path), "add", value, {
      createMissing: true,
    }) as Record<string, unknown>;

  const emit = () => {
    for (const listener of [...listeners]) listener(state);
  };

  return {
    getState: () => state,
    get: (path) => getAtPointer(state, normalize(path)),
    set(rawPath, value) {
      const path = normalize(rawPath);
      const next = write(state, path, value);
      writes.delete(path);
      writes.set(path, value);
      state = next;
      emit();
    },
    seed(next) {
      if (next === base) return;
      base = next;
      let merged = next;
      for (const [path, value] of writes) {
        try {
          merged = write(merged, path, value);
        } catch {
          writes.delete(path);
        }
      }
      state = merged;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
