import type { ReadonlyJSONValue } from "../../utils";
import { GorpStreamAccumulator } from "./GorpStreamAccumulator";
import type { GorpStreamOperation } from "./types";
import {
  type ChangeNode,
  createChangeNode,
  diffKeys,
  lookupChange,
  lookupValue,
  markChanged,
} from "./changeTree";

export class GorpStreamDeltaTracker {
  private readonly accumulator: GorpStreamAccumulator;
  private previousState: ReadonlyJSONValue;
  private changes: ChangeNode = createChangeNode();

  constructor(initialValue: ReadonlyJSONValue = null) {
    this.accumulator = new GorpStreamAccumulator(initialValue);
    this.previousState = this.accumulator.state;
  }

  get state(): ReadonlyJSONValue {
    return this.accumulator.state;
  }

  append(operations: readonly GorpStreamOperation[]): void {
    const previousState = this.accumulator.state;
    let changes: ChangeNode = createChangeNode();
    for (const op of operations) {
      changes = markChanged(changes, op.path);
    }
    this.accumulator.append(operations);
    this.previousState = previousState;
    this.changes = changes;
  }

  isChangedAt(path: readonly string[]): boolean {
    const node = lookupChange(this.changes, path);
    if (node === true) return true;
    return node !== false && Object.keys(node).length > 0;
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
