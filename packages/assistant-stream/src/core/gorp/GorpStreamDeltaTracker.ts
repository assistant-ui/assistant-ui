import type { ReadonlyJSONValue } from "../../utils";
import { GorpStreamAccumulator } from "./GorpStreamAccumulator";
import type { GorpStreamOperation } from "./types";
import {
  type ChangeNode,
  diffKeys,
  lookupChange,
  lookupValue,
  markChanged,
} from "./changeTree";

export class GorpStreamDeltaTracker {
  private readonly accumulator: GorpStreamAccumulator;
  private previousState: ReadonlyJSONValue;
  private changes: ChangeNode = {};

  constructor(initialValue: ReadonlyJSONValue = null) {
    this.accumulator = new GorpStreamAccumulator(initialValue);
    this.previousState = this.accumulator.state;
  }

  get state(): ReadonlyJSONValue {
    return this.accumulator.state;
  }

  append(operations: readonly GorpStreamOperation[]): void {
    this.previousState = this.accumulator.state;
    this.changes = {};
    for (const op of operations) {
      this.changes = markChanged(this.changes, op.path);
    }
    this.accumulator.append(operations);
  }

  isChangedAt(path: readonly string[]): boolean {
    return !!lookupChange(this.changes, path);
  }

  getChangedKeys(path: readonly string[]): string[] {
    const node = lookupChange(this.changes, path);
    if (node === false) return [];
    if (node === true) {
      return diffKeys(
        lookupValue(this.accumulator.state, path),
        lookupValue(this.previousState, path),
      );
    }
    return Object.keys(node);
  }
}
