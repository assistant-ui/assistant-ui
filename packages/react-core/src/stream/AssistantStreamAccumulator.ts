import { ReadonlyJSONValue, ReadonlyJSONObject } from "../utils/json-types";
import { AssistantStreamOperation } from "./types";

export class AssistantStreamAccumulator {
  private _state: ReadonlyJSONValue;

  constructor(initialValue: ReadonlyJSONValue = {}) {
    this._state = initialValue;
  }

  get state() {
    return this._state;
  }

  append(ops: readonly AssistantStreamOperation[]) {
    this._state = ops.reduce(
      (state, op) => AssistantStreamAccumulator.apply(state, op),
      this._state
    );
  }

  private static apply(state: ReadonlyJSONValue, op: AssistantStreamOperation) {
    const type = op.type;
    switch (type) {
      case "set":
        return AssistantStreamAccumulator.updatePath(
          state,
          op.path,
          () => op.value
        );
      case "append-text":
        return AssistantStreamAccumulator.updatePath(
          state,
          op.path,
          (current) => {
            if (typeof current !== "string")
              throw new Error(
                `Cannot append text to non-string value at path [${op.path.join(", ")}]. Current value type: ${typeof current}`
              );
            return current + op.value;
          }
        );

      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Invalid operation type: ${_exhaustiveCheck}`);
      }
    }
  }

  private static updatePath(
    state: ReadonlyJSONValue | undefined,
    path: readonly string[],
    updater: (current: ReadonlyJSONValue | undefined) => ReadonlyJSONValue
  ): ReadonlyJSONValue {
    if (path.length === 0) return updater(state);

    // Initialize state as empty object if it's null and we're trying to set a property
    state ??= {};

    if (typeof state !== "object") {
      throw new Error(`Cannot navigate path [${path.join(", ")}] through non-object value. Current value type: ${typeof state}`);
    }

    const [key, ...rest] = path as [string, ...(readonly string[])];
    if (Array.isArray(state)) {
      const idx = Number(key);
      if (isNaN(idx))
        throw new Error(
          `Expected array index at path [${path.join(", ")}], got "${key}"`
        );
      if (idx < 0 || idx > state.length)
        throw new Error(
          `Array index ${idx} out of bounds at path [${path.join(
            ", "
          )}] (array length: ${state.length})`
        );

      const nextState = [...state];
      nextState[idx] = this.updatePath(nextState[idx], rest, updater);

      return nextState;
    }

    const nextState = { ...(state as ReadonlyJSONObject) };
    nextState[key] = this.updatePath(nextState[key], rest, updater);

    return nextState;
  }
}
