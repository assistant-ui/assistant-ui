import type { ReadonlyJSONValue } from "../../utils";

export type GorpStreamOperation =
  | {
      readonly type: "set";
      readonly path: readonly string[];
      readonly value: ReadonlyJSONValue;
    }
  | {
      readonly type: "append-text";
      readonly path: readonly string[];
      readonly value: string;
    };

export type GorpStreamChunk = {
  readonly snapshot: ReadonlyJSONValue;
  readonly operations: readonly GorpStreamOperation[];
};
