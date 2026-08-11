import type { ReadonlyJSONValue, ReadonlyJSONObject } from "../../utils";
import { assertSafePathSegment } from "./changeTree";
import type { GorpStreamOperation } from "./types";

export class GorpStreamAccumulator {
  private _state: ReadonlyJSONValue;
  private readonly _strict: boolean;
  private readonly _logged = new Set<string>();
  private _warnedClamp = false;

  constructor(
    initialValue: ReadonlyJSONValue = null,
    options: { strict?: boolean } = {},
  ) {
    this._state = initialValue;
    this._strict = options.strict ?? true;
  }

  get state() {
    return this._state;
  }

  private logOnce(key: string, log: () => void) {
    if (this._logged.has(key) || this._logged.size >= 20) return;
    this._logged.add(key);
    log();
  }

  append(ops: readonly GorpStreamOperation[]) {
    this._state = ops.reduce((state, op) => {
      if (this._strict) return this.apply(state, op);
      try {
        return this.apply(state, op);
      } catch (error) {
        this.logOnce(`skip:${String(error)}`, () =>
          console.error(
            `Skipped unappliable gorp operation: ${String(error)}`,
            op,
          ),
        );
        return state;
      }
    }, this._state);
  }

  private apply(state: ReadonlyJSONValue, op: GorpStreamOperation) {
    const type = op.type;
    switch (type) {
      case "set":
        return this.updatePath(state, op.path, () => op.value);
      case "append-text":
        return this.updatePath(state, op.path, (current) => {
          if (typeof current !== "string")
            throw new Error(`Expected string at path [${op.path.join(", ")}]`);
          return current + op.value;
        });

      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Invalid operation type: ${_exhaustiveCheck}`);
      }
    }
  }

  private updatePath(
    state: ReadonlyJSONValue | undefined,
    path: readonly string[],
    updater: (current: ReadonlyJSONValue | undefined) => ReadonlyJSONValue,
  ): ReadonlyJSONValue {
    if (path.length === 0) return updater(state);

    // Initialize state as empty object if it's null and we're trying to set a property
    state ??= {};

    if (typeof state !== "object") {
      throw new Error(`Invalid path: [${path.join(", ")}]`);
    }

    const [key, ...rest] = path as [string, ...(readonly string[])];
    assertSafePathSegment(key);
    if (Array.isArray(state)) {
      let idx = Number(key);
      if (Number.isNaN(idx))
        throw new Error(`Expected array index at [${path.join(", ")}]`);
      if (idx < 0) throw new Error(`Insert array index out of bounds`);
      if (idx > state.length) {
        if (this._strict) throw new Error(`Insert array index out of bounds`);
        if (!this._warnedClamp) {
          this._warnedClamp = true;
          console.warn(
            `Clamped out-of-bounds gorp array index ${idx} to ${state.length}`,
          );
        }
        idx = Math.min(idx, state.length);
      }

      const nextState = [...state];
      nextState[idx] = this.updatePath(
        Object.hasOwn(nextState, idx) ? nextState[idx] : undefined,
        rest,
        updater,
      );

      return nextState;
    }

    const nextState = { ...(state as ReadonlyJSONObject) };
    nextState[key] = this.updatePath(
      Object.hasOwn(nextState, key) ? nextState[key] : undefined,
      rest,
      updater,
    );

    return nextState;
  }
}
