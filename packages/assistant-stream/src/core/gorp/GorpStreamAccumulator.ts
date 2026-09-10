import type {
  ReadonlyJSONArray,
  ReadonlyJSONValue,
  ReadonlyJSONObject,
} from "../../utils";
import { assertSafePathSegment } from "./changeTree";
import type { GorpStreamOperation } from "./types";

type PathFrame =
  | { kind: "array"; state: ReadonlyJSONArray; key: number }
  | { kind: "object"; state: ReadonlyJSONObject; key: string };

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

    const frames: PathFrame[] = [];
    let current = state;

    for (let depth = 0; depth < path.length; depth++) {
      current ??= {};
      if (typeof current !== "object") {
        throw new Error(`Invalid path: [${path.slice(depth).join(", ")}]`);
      }

      const key = path[depth]!;
      assertSafePathSegment(key);
      if (Array.isArray(current)) {
        let index = Number(key);
        // Numeric wire segments are tolerated, but string indices must be canonical.
        if (!Number.isInteger(index) || String(index) !== String(key)) {
          throw new Error(
            `Expected array index at [${path.slice(depth).join(", ")}]`,
          );
        }
        if (index < 0) throw new Error(`Insert array index out of bounds`);
        if (index > current.length) {
          if (this._strict) throw new Error(`Insert array index out of bounds`);
          if (!this._warnedClamp) {
            this._warnedClamp = true;
            console.warn(
              `Clamped out-of-bounds gorp array index ${index} to ${current.length}`,
            );
          }
          index = current.length;
        }

        frames.push({ kind: "array", state: current, key: index });
        current = Object.hasOwn(current, index) ? current[index] : undefined;
      } else {
        frames.push({ kind: "object", state: current, key });
        current = Object.hasOwn(current, key) ? current[key] : undefined;
      }
    }

    let updated = updater(current);
    for (let index = frames.length - 1; index >= 0; index--) {
      const frame = frames[index]!;
      if (frame.kind === "array") {
        const next = [...frame.state];
        next[frame.key] = updated;
        updated = next;
      } else {
        const next = { ...frame.state };
        next[frame.key] = updated;
        updated = next;
      }
    }
    return updated;
  }
}
